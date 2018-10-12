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
    .module('userContextModule', [
      'experimentModule',
      'userNavigationModule',
      'collabExperimentLockModule'
    ])
    .factory('userContextService', [
      '$q',
      '$window',
      'experimentService',
      'userNavigationService',
      'collabExperimentLockService',
      'simulationInfo',
      'bbpConfig',
      'storageServer',
      'environmentService',
      function(
        $q,
        $window,
        experimentService,
        userNavigationService,
        collabExperimentLockService,
        simulationInfo,
        bbpConfig,
        storageServer,
        environmentService
      ) {
        function UserContextService() {
          var that = this;

          this.editIsDisabled = false;
          let _ownerId;

          Object.defineProperty(this, 'ownerID', { get: () => _ownerId });
          this.userEditingID = '';
          this.userEditing = '';
          this.timeEditStarted = '';
          this.demoMode = bbpConfig.get('demomode.demoCarousel', false);

          let getUserId = () => {
            return storageServer.getCurrentUser().then(profile => profile.id);
          };

          this.init = () => {
            return $q
              .all([getUserId(), experimentService.experiment])
              .then(([userid, { ownerID }]) => {
                this.userID = userid;
                _ownerId = ownerID;
                if (
                  environmentService.isPrivateExperiment() &&
                  this.isOwner()
                ) {
                  // only use locks if we are in a collab
                  this.lockService = collabExperimentLockService.createLockServiceForExperimentId(
                    simulationInfo.experimentID
                  );
                  this.cancelLockSubscription = this.lockService.onLockChanged(
                    this.onLockChangedCallback
                  );
                }
              });
          };

          this.deinit = function() {
            if (!environmentService.isPrivateExperiment()) return;
            this.cancelLockSubscription && this.cancelLockSubscription();
            this.removeEditLock(true);
          };

          this.onLockChangedCallback = function(result) {
            if (result.locked && result.lockInfo.user.id === that.userID) {
              // don't lock edit button if the current user is the owner of the lock.
              that.setEditDisabled(false);
            } else {
              if (result.locked) {
                that.setLockDateAndUser(result.lockInfo);
              }
              that.setEditDisabled(result.locked);
            }
          };

          this.isOwner = function() {
            return this.userID === this.ownerID && !this.demoMode;
          };

          this.hasEditRights = function(entity) {
            return that.isOwner() || userNavigationService.isUserAvatar(entity);
          };

          this.setLockDateAndUser = function(lockInfo) {
            this.userEditing = lockInfo.user.displayName;
            this.userEditingID = lockInfo.user.id;
            this.timeEditStarted = moment(new Date(lockInfo.date)).fromNow();
          };

          // set edit mode
          this.setEditDisabled = function(state) {
            this.editIsDisabled = state;
          };

          this.removeEditLock = function(skipResponse) {
            return (
              this.lockService &&
              this.lockService.releaseLock().catch(function() {
                if (!skipResponse) {
                  $window.alert(
                    'I could not release the edit lock. Please remove it manually from the Storage area.'
                  );
                }
              })
            );
          };
        }

        var service = new UserContextService();
        service.initialized = service.init();

        return service;
      }
    ]);
})();
