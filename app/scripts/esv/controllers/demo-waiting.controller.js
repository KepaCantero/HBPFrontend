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
  class DemoAutorunExperimentController {
    constructor(
      scope,
      $timeout,
      $window,
      $location,
      experimentsFactory,
      environmentService,
      STATE
    ) {
      scope.environmentService = environmentService;
      scope.experimentsFactory = experimentsFactory;
      var nextTimeToCheck = 10000;

      scope.process = () => {
        nextTimeToCheck = 500;
        if (!scope.experimentsService) {
          scope.experimentsService = scope.experimentsFactory.createExperimentsService();
          scope.experimentsService.initialize();
          scope.experimentsService.experiments.then(
            experiments => (scope.experiments = experiments)
          );
        }
        if (scope.experiments) {
          for (let i = 0; i < scope.experiments.length; i++) {
            let exp = scope.experiments[i];
            if (exp.joinableServers.length > 0) {
              // One experiment is joinable
              let simul = exp.joinableServers[0];
              if (
                simul.runningSimulation.state === STATE.STARTED ||
                simul.runningSimulation.state === STATE.PAUSED
              ) {
                let path =
                  '#/esv-web/experiment-view/' +
                  simul.server +
                  '/' +
                  exp.id +
                  '/' +
                  scope.environmentService.isPrivateExperiment() +
                  '/' +
                  simul.runningSimulation.simulationID;
                if (scope.experimentsService) {
                  scope.experimentsService.destroy();
                  scope.experimentsService = undefined;
                }
                $window.location.href = path;
                $window.location.reload();
                return;
              }
            }
          }
        }
        $timeout(scope.process, nextTimeToCheck);
      };
      $timeout(scope.process, nextTimeToCheck);
    }
  }

  DemoAutorunExperimentController.$$ngIsClass = true;
  DemoAutorunExperimentController.$inject = [
    '$scope',
    '$timeout',
    '$window',
    '$location',
    'experimentsFactory',
    'environmentService',
    'STATE'
  ];

  angular
    .module('exdFrontendApp')
    .controller(
      'DemoAutorunExperimentController',
      DemoAutorunExperimentController
    );
})();
