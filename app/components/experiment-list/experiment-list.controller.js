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
  angular.module('experimentList', []).controller('ExperimentListController', [
    '$scope',
    '$location',
    '$stateParams',
    'experimentsFactory',
    'collabConfigService',
    '$window',
    'nrpUser',
    'environmentService',
    'clbErrorDialog',
    function(
      $scope,
      $location,
      $stateParams,
      experimentsFactory,
      collabConfigService,
      $window,
      nrpUser,
      environmentService,
      clbErrorDialog
    ) {
      $scope.pageState = {};
      $scope.isPrivateExperiment = environmentService.isPrivateExperiment();
      $scope.devMode = environmentService.isDevMode();

      $scope.config = {
        loadingMessage: 'Loading list of experiments...'
      };

      $scope.config.canCloneExperiments = !($scope.config.canLaunchExperiments =
        !$scope.isPrivateExperiment || $scope.private);

      $scope.cloneExperiment = function(experiment) {
        $scope.isCloneRequested = true;
        collabConfigService
          .clone(
            null,
            {
              /* eslint-disable camelcase */
              exp_configuration_path:
                experiment.configuration.experimentConfiguration,
              context_id: $stateParams.ctx
              /* eslint-enable camelcase */
            },
            function() {
              try {
                $window.document
                  .getElementById('clb-iframe-workspace')
                  .contentWindow.parent.postMessage(
                    {
                      eventName: 'location',
                      data: { url: window.location.href.split('?')[0] }
                    },
                    '*'
                  );
              } catch (err) {
                //not in using collab website, do nothing
              }
            }
          )
          .$promise.then(() => {
            $scope.loadPrivateExperiments();
          })
          .catch(err => {
            err = {
              type: 'Error while cloning',
              data: err.data,
              message:
                'Cloning operation failed. The cloning server might be unavailable',
              code: err.statusText + ' ' + err.status
            };
            clbErrorDialog.open(err).then(() => {});
          })
          .finally(() => {
            $scope.isCloneRequested = false;
          });
      };

      $scope.canStopSimulation = function(simul) {
        return (
          $scope.userinfo &&
          $scope.userinfo.hasEditRights &&
          $scope.userinfo.userID === simul.runningSimulation.owner
        );
      };

      var loadExperiments = function(loadPrivateExperiments = false) {
        var experimentsService = ($scope.experimentsService = experimentsFactory.createExperimentsService(
          loadPrivateExperiments
        ));
        experimentsService.initialize();
        experimentsService.experiments.then(function(experiments) {
          $scope.experiments = experiments;
          if (experiments.length === 1) {
            $scope.pageState.selected = experiments[0].id;
          }
        });

        nrpUser.getCurrentUserInfo().then(function(userinfo) {
          $scope.userinfo = userinfo;
        });

        $scope.selectExperiment = function(experiment) {
          if ($scope.pageState.startingExperiment) {
            return;
          }
          if (experiment.id !== $scope.pageState.selected) {
            $scope.pageState.selected = experiment.id;
            $scope.pageState.showJoin = false;
          }
        };

        $scope.startNewExperiment = function(experiment, launchSingleMode) {
          $scope.pageState.startingExperiment = experiment.id;
          experimentsService
            .startExperiment(
              experiment,
              launchSingleMode,
              nrpUser.getReservation()
            )
            .then(
              function(path) {
                $location.path(path);
              }, // succeeded
              function() {
                $scope.pageState.startingExperiment = null;
              }, // failed
              function(msg) {
                $scope.progressMessage = msg;
              }
            ); //in progress
        };

        $scope.deleteExperiment = function(expName) {
          $scope.pageState.deletingExperiment = true;
          experimentsService.deleteExperiment(expName).then(() => {
            $scope.pageState.deletingExperiment = false;
            return $scope.reinit();
          });
        };

        // Stop an already initialized or running experiment
        $scope.stopSimulation = function(simulation, experiment) {
          experimentsService.stopExperiment(simulation, experiment);
        };

        $scope.joinExperiment = function(simul, exp) {
          var path =
            'esv-web/experiment-view/' +
            simul.server +
            '/' +
            exp.id +
            '/' +
            environmentService.isPrivateExperiment() +
            '/' +
            simul.runningSimulation.simulationID;
          $location.path(path);
        };

        $scope.$on('$destroy', function() {
          experimentsService.destroy();
        });
      };

      loadExperiments($scope.private);
    }
  ]);
})();
