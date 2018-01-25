/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file is part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
 * https://www.humanbrainproject.eu
 *
 * The Human Brain Project is a European Commission funded project
 * in the frame of the Horizon2020 FET Flagship plan.
 * http://ec.europa.eu/programmes/horizon2020/en/h2020-section/fet-flagships
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 * ---LICENSE-END**/
(function() {
  'use strict';

  angular
    .module('collabExperimentLockModule', [])
    .value('LOCK_FILE_VALIDITY_MAX_AGE_HOURS', 24) //after x hours, lock file is ignored
    .provider('collabExperimentLockService', function() {
      //The edition lock file name that will be created within the experiment folder
      var LOCK_FILE_NAME = 'edit.lock';
      var LOCK_FILE_POLL_RATE = 10 * 1000; //each 10s

      return {
        $get: [
          '$q',
          '$interval',
          'nrpUser',
          'storageServer',
          'LOCK_FILE_VALIDITY_MAX_AGE_HOURS',
          function(
            $q,
            $interval,
            nrpUser,
            storageServer,
            LOCK_FILE_VALIDITY_MAX_AGE_HOURS
          ) {
            //checks whether a file exists within a folder
            var getFolderFileMetaData = function(folderId, fileName) {
              return storageServer
                .getFileContent(folderId, fileName, true)
                .then(function(file) {
                  var lockResponse = {
                    locked: !!file.uuid
                  };
                  if (!lockResponse.locked) return $q.when(lockResponse);

                  let fileContent = JSON.parse(file.data);
                  return nrpUser
                    .getOwnerDisplayName(fileContent.userId)
                    .then(function(displayName) {
                      lockResponse.lockInfo = {
                        user: {
                          displayName: displayName,
                          id: fileContent.userId
                        },
                        entity: file.uuid,
                        date: fileContent.date
                      };
                      return $q.when(lockResponse);
                    });
                });
            };

            var isValidLockFile = function(lockInfo) {
              return (
                moment(lockInfo.date).add(
                  LOCK_FILE_VALIDITY_MAX_AGE_HOURS,
                  'hours'
                ) > Date.now()
              );
            };

            //creates a contextfull lock service for a given contextId
            var createLockServiceForExperimentId = function(experimentId) {
              //the folderId for the Collab context
              var folderId = $q.when(experimentId);

              //gets whether the experiment is lock for edition
              var isLocked = function() {
                return folderId
                  .then(function(folderId) {
                    return getFolderFileMetaData(folderId, LOCK_FILE_NAME);
                  })
                  .then(function(lockResponse) {
                    if (!lockResponse.locked) return lockResponse;
                    else if (!isValidLockFile(lockResponse.lockInfo)) {
                      //the lock file is invalid, we set it as such and remove it
                      lockResponse.locked = false;
                      return releaseLock().then(function() {
                        return lockResponse;
                      });
                    }
                    return lockResponse;
                  });
              };

              //releases the edition lock
              var releaseLock = function() {
                return folderId.then(folderId =>
                  storageServer.deleteFile(folderId, LOCK_FILE_NAME, true)
                );
              };

              //tries to lock an experiment for edition
              var tryAddLock = function() {
                return $q.when(folderId).then(function(folderId) {
                  return nrpUser
                    .getCurrentUser()
                    .then(({ id }) =>
                      storageServer.setFileContent(
                        folderId,
                        LOCK_FILE_NAME,
                        JSON.stringify({ userId: id, date: Date.now() }),
                        true
                      )
                    )
                    .then(response => ({ success: !!response.uuid }))
                    .catch(function() {
                      // couldn't create lock, check it actually exists
                      return isLocked().then(function(lockInfo) {
                        var result = {
                          success: !lockInfo.locked,
                          lock: lockInfo
                        };

                        return $q.when(result);
                      });
                    });
                });
              };

              var lockChangedPromise;
              var previousIsLockedStatus;
              //subscribes to lockedStatusChange polling
              //and returns the unsubscribe function
              var onLockChanged = function(callback) {
                lockChangedPromise = $interval(function() {
                  isLocked().then(function(isCurrentlyLocked) {
                    //calls the callback when the isLocked status changed
                    if (isCurrentlyLocked.locked !== previousIsLockedStatus) {
                      previousIsLockedStatus = isCurrentlyLocked.locked;
                      callback(isCurrentlyLocked);
                    }
                  });
                }, LOCK_FILE_POLL_RATE);

                return function() {
                  $interval.cancel(lockChangedPromise);
                };
              };

              return {
                onLockChanged: onLockChanged,
                isLocked: isLocked,
                tryAddLock: tryAddLock,
                releaseLock: releaseLock
              };
            };

            return {
              createLockServiceForExperimentId
            };
          }
        ]
      };
    });
})();
