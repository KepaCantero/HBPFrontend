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
    .module('exdFrontendApp')
    .constant('SAVE_FILE', 'editor_errors.saved')
    .service('saveErrorsService', [
      '$stateParams',
      '$q',
      'SAVE_FILE',
      'tempFileService',
      'environmentService',
      'storageServer',
      'simulationInfo',
      function(
        $stateParams,
        $q,
        SAVE_FILE,
        tempFileService,
        environmentService,
        storageServer,
        simulationInfo
      ) {
        /*
        This service can be used to save data (which contains Python errors) to an error file. e.g. TFs, SMs, Brain Editor.
        It's needed as if they are saved to the normal file, further simulations are not possible.
        */
        var loaded = false,
          foundCallbacks = {};

        return {
          saveDirtyData: saveDirtyData,
          getErrorSavedWork: getErrorSavedWork,
          clearDirty: clearDirty,
          registerCallback: registerCallback
        };
        function saveDirtyData(dirtyType, data) {
          var dataObj = {};
          dataObj[dirtyType] = data;
          return tempFileService.saveDirtyData(
            SAVE_FILE,
            false,
            dataObj,
            dirtyType
          );
        }
        function clearDirty(dirtyType) {
          if (!environmentService.isPrivateExperiment()) return $q.reject();

          return storageServer
            .getFileContent(simulationInfo.experimentID, SAVE_FILE, true)
            .then(file => {
              if (!file.uuid) return $q.resolve();

              var content = angular.fromJson(file.data);
              delete content[dirtyType];
              if (Object.keys(content).length === 0)
                return removeTempErrorSave();
              else
                return storageServer.setFileContent(
                  simulationInfo.experimentID,
                  SAVE_FILE,
                  angular.toJson(content),
                  true
                );
            });
        }

        function removeTempErrorSave() {
          return tempFileService.removeSavedWork(SAVE_FILE);
        }

        function getErrorSavedWork() {
          if (loaded) return $q.reject();
          return tempFileService
            .checkSavedWork(SAVE_FILE, foundCallbacks)
            .finally(function() {
              loaded = true;
            });
        }

        function registerCallback(dirtyType, cb) {
          foundCallbacks[dirtyType] = cb;
        }
      }
    ]);
})();
