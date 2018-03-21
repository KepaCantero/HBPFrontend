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

/* global console: false */

(function() {
  'use strict';

  angular.module('editorsPanelModule', []).factory('editorsPanelService', [
    '$window',
    '$timeout',
    '$rootScope',
    '$q',
    'environmentService',
    'simulationInfo',
    'userContextService',
    'nrpAnalytics',
    function(
      $window,
      $timeout,
      $rootScope,
      $q,
      environmentService,
      simulationInfo,
      userContextService,
      nrpAnalytics
    ) {
      function EditorsPanelService() {
        var that = this;

        this.showEditorPanel = false;

        this.init = function() {
          if (userContextService.lockService) {
            // only use locks if we are in a private collab
            this.cancelLockSubscription = userContextService.lockService.onLockChanged(
              that.onLockChanged
            );
          }
        };

        this.deinit = function() {
          this.cancelLockSubscription && this.cancelLockSubscription();
        };

        this.showEditor = (tabIndex, options) => {
          this.activeTabIndex = tabIndex;
          this.showEditorPanel && this.toggleEditors();
          this.openOptions = options;
          this.toggleEditors().then(() =>
            $timeout(() => delete this.openOptions, 100)
          );
        };

        this.toggleEditors = function() {
          if (
            !environmentService.isPrivateExperiment() ||
            !userContextService.lockService
          ) {
            that.toggleEditorsPanel();
          } else {
            if (!that.showEditorPanel) {
              that.loadingEditPanel = true;
              // try and add a lock for editing
              return userContextService.lockService
                .tryAddLock()
                .then(that.onTryAddLock)
                .catch(function() {
                  $window.alert(
                    'There was an error when opening the edit panel, please try again later.'
                  );
                })
                .finally(function() {
                  that.loadingEditPanel = false;
                });
            } else {
              that.toggleEditorsPanel();
              userContextService.removeEditLock();
            }
          }
          return $q.resolve();
        };

        this.toggleEditorsPanel = function() {
          this.showEditorPanel = !this.showEditorPanel;
          nrpAnalytics.eventTrack('Toggle-editor-panel', {
            category: 'Simulation-GUI',
            value: this.showEditorPanel
          });
        };

        this.onLockChanged = function(lockChange) {
          if (
            !lockChange.locked &&
            userContextService.userEditingID === userContextService.userID
          ) {
            if (that.showEditorPanel) {
              // we are the current user editing, but our lock has been released...
              // (this can happen if two users want to edit at the same time)
              $window.alert(
                'You no longer have the lock to edit anymore. Please try again.'
              );
              that.toggleEditors();
            }
          }
        };

        this.onTryAddLock = function(result) {
          if (
            !result.success &&
            result.lock &&
            result.lock.lockInfo.user.id !== userContextService.userID
          ) {
            userContextService.setLockDateAndUser(result.lock.lockInfo);
            $window.alert(
              'Sorry you cannot edit at this time. Only one user can edit at a time and ' +
                userContextService.userEditing +
                ' started editing ' +
                userContextService.timeEditStarted +
                '. Please try again later.'
            );
            userContextService.setEditDisabled(true);
          } else {
            userContextService.userEditingID = userContextService.userID;
            that.toggleEditorsPanel();
          }

          return $q.resolve();
        };
      }

      var service = new EditorsPanelService();
      service.init();

      return service;
    }
  ]);
})();
