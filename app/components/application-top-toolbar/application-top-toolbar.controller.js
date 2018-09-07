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
      applicationTopToolbarService,
      bbpConfig,
      nrpAnalytics,
      storageServerTokenManager,
      userContextService,
      updateChecker
    ) {
      this.$injector = $injector;
      this.$scope = $scope;
      this.$window = $window;

      this.STATE = STATE;

      this.bbpConfig = bbpConfig;
      this.nrpAnalytics = nrpAnalytics;
      this.storageServerTokenManager = storageServerTokenManager;
      this.updateChecker = updateChecker;
      this.userContextService = userContextService;

      this.show = true;

      if (applicationTopToolbarService.isInSimulationView()) {
        // dynamically get the services that only apply during running experiment
        this.editorToolbarService = this.$injector.get('editorToolbarService');
        this.environmentRenderingService = this.$injector.get(
          'environmentRenderingService'
        );
        this.experimentViewService = this.$injector.get(
          'experimentViewService'
        );
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
        this.experimentViewService.exitSimulation();
      } else {
        this.experimentViewService.openExitDialog();
      }
    }

    onButtonEnvironmentSettings() {
      if (this.environmentRenderingService.loadingEnvironmentSettingsPanel) {
        return;
      } else {
        this.editorToolbarService.showEnvironmentSettingsPanel = !this
          .editorToolbarService.showEnvironmentSettingsPanel;
        this.nrpAnalytics.eventTrack('Toggle-environment-settings-panel', {
          category: 'Simulation-GUI',
          value: this.editorToolbarService.showEnvironmentSettingsPanel
        });
      }
    }

    allowPlayPause() {
      return this.userContextService.isOwner();
    }

    toggleSimulationToolsSidebar() {
      this.simToolsSidebarService.toggleSidebar();
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
      'applicationTopToolbarService',
      'bbpConfig',
      'nrpAnalytics',
      'storageServerTokenManager',
      'userContextService',
      'updateChecker',
      function(...args) {
        return new ApplicationTopToolbarController(...args);
      }
    ]);
})();
