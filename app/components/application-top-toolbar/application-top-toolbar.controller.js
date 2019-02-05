/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file isLeaf = part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
 * https://www.humanbrainproject.eu
 *
 * The Human Brain Project isLeaf = a European Commission funded project
 * in the frame of the Horizon2020 FET Flagship plan.
 * http://ec.europa.eu/programmes/horizon2020/en/h2020-section/fet-flagships
 *
 * This program isLeaf = free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program isLeaf = distributed in the hope that it will be useful,
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

  class ApplicationTopToolbarController {
    constructor(
      $injector,
      $rootScope,
      $scope,
      $window,
      STATE,
      TOOL_CONFIGS,
      applicationTopToolbarService,
      bbpConfig,
      goldenLayoutService,
      nrpAnalytics,
      storageServerTokenManager,
      userContextService,
      updateChecker,
      workspaceService,
      recorderPanelService
    ) {
      this.$injector = $injector;
      this.$scope = $scope;
      this.$window = $window;

      this.STATE = STATE;
      this.TOOL_CONFIGS = TOOL_CONFIGS;

      this.bbpConfig = bbpConfig;
      this.goldenLayoutService = goldenLayoutService;
      this.nrpAnalytics = nrpAnalytics;
      this.storageServerTokenManager = storageServerTokenManager;
      this.updateChecker = updateChecker;
      this.userContextService = userContextService;
      this.workspaceService = workspaceService;
      this.recorderPanelService = recorderPanelService;

      this.show = true;

      if (applicationTopToolbarService.isInSimulationView()) {
        // dynamically get the services that only apply during running experiment
        this.environmentRenderingService = this.$injector.get(
          'environmentRenderingService'
        );
        this.experimentViewService = this.$injector.get(
          'experimentViewService'
        );
        this.goldenLayoutService = this.$injector.get('goldenLayoutService');
        this.simToolsSidebarService = this.$injector.get(
          'simToolsSidebarService'
        );
        this.simulationInfo = this.$injector.get('simulationInfo');
        this.stateService = this.$injector.get('stateService');

        this.show = false;
        $rootScope.$on('ASSETS_LOADED', () => {
          this.show = true;
        });
      }

      if (updateChecker.CHECK_UPDATE_ENABLED)
        updateChecker
          .checkForNewVersion()
          .then(newVersion => (this.newVersion = newVersion));
    }

    openMenu($mdMenu, event) {
      $mdMenu.open(event);
    }

    onButtonLogout() {
      this.storageServerTokenManager.clearStoredToken();
      this.$window.location.reload();
    }

    onButtonSetSimulationState(newState) {
      this.experimentViewService.setSimulationState(newState);
    }

    onButtonReset() {
      this.experimentViewService.resetSimulation();
    }

    onButtonExit() {
      let isDemoMode = this.bbpConfig.get('demomode.demoCarousel', false);
      if (isDemoMode) {
        this.experimentViewService.exitDemo();
      } else {
        this.experimentViewService.openExitDialog();
      }
    }

    onButtonEnvironmentSettings() {
      this.nrpAnalytics.eventTrack('Toggle-environment-settings-panel', {
        category: 'Simulation-GUI',
        value: true
      });
    }

    isRecording() {
      return this.recorderPanelService.isRecording();
    }

    isRecordingPaused() {
      return this.recorderPanelService.isPaused();
    }

    onButtonRecord() {
      this.recorderPanelService.toggleShow();
    }

    allowRecording() {
      return this.userContextService.isOwner();
    }

    allowPlayPause() {
      return this.userContextService.isOwner();
    }

    toggleSimulationToolsSidebar() {
      this.simToolsSidebarService
        .toggleSidebar()
        .then(() => this.onSidemenuToggled());
    }
  }

  angular
    .module('applicationTopToolbarModule')
    .controller('ApplicationTopToolbarController', [
      '$injector',
      '$rootScope',
      '$scope',
      '$window',
      'STATE',
      'TOOL_CONFIGS',
      'applicationTopToolbarService',
      'bbpConfig',
      'goldenLayoutService',
      'nrpAnalytics',
      'storageServerTokenManager',
      'userContextService',
      'updateChecker',
      'workspaceService',
      'recorderPanelService',
      function(...args) {
        return new ApplicationTopToolbarController(...args);
      }
    ]);
})();
