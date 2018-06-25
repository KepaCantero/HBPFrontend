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
      $scope,
      $window,
      EDIT_MODE,
      STATE,
      bbpConfig,
      gz3d,
      objectInspectorService,
      simulationInfo,
      experimentViewService,
      stateService,
      storageServerTokenManager,
      userContextService
    ) {
      this.$scope = $scope;
      this.$window = $window;

      this.EDIT_MODE = EDIT_MODE;
      this.STATE = STATE;

      this.bbpConfig = bbpConfig;
      this.gz3d = gz3d;
      this.objectInspectorService = objectInspectorService;
      this.storageServerTokenManager = storageServerTokenManager;
      this.simulationInfo = simulationInfo;
      this.experimentViewService = experimentViewService;
      this.stateService = stateService;
      this.userContextService = userContextService;

      this.titleDOM = document.getElementById('application-top-toolbar-title');

      if (this.experimentViewService.isInSimulationView()) {
        this.setTitle(this.simulationInfo.experimentDetails.name);
      } else {
        this.setTitle('Experiment Overview');
      }
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

    setTitle(title) {
      this.titleDOM.innerHTML = title;
    }

    allowPlayPause() {
      return this.userContextService.isOwner();
    }
  }

  angular
    .module('applicationTopToolbarModule')
    .controller('ApplicationTopToolbarController', [
      '$scope',
      '$window',
      'EDIT_MODE',
      'STATE',
      'bbpConfig',
      'gz3d',
      'objectInspectorService',
      'simulationInfo',
      'experimentViewService',
      'stateService',
      'storageServerTokenManager',
      'userContextService',
      function(...args) {
        return new ApplicationTopToolbarController(...args);
      }
    ]);
})();
