(function () {
  'use strict';

  /**
   * # ESVCollabRunCtrl
   * Controller of the Collab edit and run pages
   * It allows to launch a registered Collab experiment either in edit mode (edit page)
   * or read-only mode (run page)
   */

  angular.module('exdFrontendApp').controller('ESVCollabRunCtrl',
    [
    '$q',
    '$scope',
    '$timeout',
    '$interval',
    '$location',
    'simulationService',
    'slurminfoService',
    'experimentSimulationService',
    'STATE',
    'OPERATION_MODE',
    'bbpConfig',
    'hbpIdentityUserDirectory',
    'simulationSDFWorld',
    '$stateParams',
    'collabConfigService',
    'serverError',
      function (
        $q,
        $scope,
        $timeout,
        $interval,
        $location,
        simulationService,
        slurminfoService,
        experimentSimulationService,
        STATE,
        OPERATION_MODE,
        bbpConfig,
        hbpIdentityUserDirectory,
        simulationSDFWorld,
        $stateParams,
        collabConfigService,
        serverError
      ) {
        $scope.joinSelected = false;
        $scope.startNewExperimentSelected = false;
        $scope.isServerAvailable = {};
        $scope.isQueryingServersFinished = false;
        $scope.isDestroyed = false;
        $scope.isEditingOngoing = false;
        $scope.STATE = STATE;
        $scope.OPERATION_MODE = OPERATION_MODE;
        $scope.updatePromise = undefined;
        $scope.updateUptimePromise = undefined;
        $scope.experiments = {};
        $scope.serverNames = Object.keys(bbpConfig.get('api.neurorobotics'));
        $scope.serversEnabled = experimentSimulationService.getServersEnable();
        $scope.userID = undefined;
        // The experiment may be viewed, after selection and clone, from the Collab Edit page.
        // The edit (resp. launch) button is then enabled (resp. disabled).
        $scope.isCollabEditPage = angular.isDefined($stateParams.experimentID);
        if (!bbpConfig.get('localmode.forceuser', false)) {
          $scope.clusterPartAvailInfo = slurminfoService.get();
        }

        var ESV_UPDATE_RATE = 30 * 1000; //Update ESV-Web page every 30 seconds
        var UPTIME_UPDATE_RATE = 1000; //Update the uptime every second

        $scope.setJoinableVisible = function() {
          $scope.joinSelected = true;
          $scope.startNewExperimentSelected = false;
        };

        $scope.setProgressbarVisible = function() {
          $scope.joinSelected = false;
          $scope.startNewExperimentSelected = true;
        };

        $scope.setProgressbarInvisible = function () {
          $scope.joinSelected = false;
          $scope.startNewExperimentSelected = true;
        };

        $scope.setProgressMessage = function (msg) {
          // $timeout is used to use apply() even if apply is already in progress
          $timeout(function () {
            $scope.$apply(function () {
              $scope.progressMessageMain = msg.main ? msg.main : '';
              $scope.progressMessageSub = msg.sub ? msg.sub : '';
            });
          });
        };

        $scope.toggleServer = function (server) {
          var idx = $scope.serversEnabled.indexOf(server);
          if (idx > -1) {
            $scope.serversEnabled.splice(idx, 1);
          } else {
            $scope.serversEnabled.push(server);
          }

          experimentSimulationService.refreshExperiments(
            $scope.experiments, $scope.serversEnabled, setIsServerAvailable
          );
          localStorage.setItem('server-enabled', angular.toJson($scope.serversEnabled));
        };

        $scope.startNewExperiment = function(configuration, serverPattern) {
          experimentSimulationService.startNewExperiment(
            configuration, null, serverPattern, $scope.setProgressbarInvisible
          );
        };

        $scope.enterEditMode = function(configuration, serverPattern) {
          experimentSimulationService.enterEditMode(
            configuration, null, serverPattern, $scope.setProgressbarInvisible
          );
        };

        $scope.joinExperiment = function(url) {
          var message = 'Joining experiment ' + url;
          $scope.setProgressMessage({main: message});
          $location.path(url); // changing page --> esv-web/gz3d-view/*/*/*?ctx=*
        };

        // Stop an already initialized or running experiment
        $scope.stopSimulation = function(simulation) {
          simulation.stopping = true;
          experimentSimulationService.stopExperimentOnServer($scope.experiments, simulation.serverID, simulation.simulationID).then(function() {
            $scope.updateExperiments();
          });
        };


        experimentSimulationService.setInitializedCallback($scope.joinExperiment);

        var setIsServerAvailable = function(id, isAvailable) {
          $scope.isServerAvailable[id] = isAvailable;
        };

        // We store this promise in the scope in order to be able to cancel the interval later
        $scope.updateUptimePromise = $interval(function () {
          simulationService().updateUptime();
        }, UPTIME_UPDATE_RATE);

        // Update the userID
        $scope.updateUserID = function () {
          if (!bbpConfig.get('localmode.forceuser', false)) {
            return hbpIdentityUserDirectory.getCurrentUser()
              .then(function (profile) {
                $scope.userID = profile.id;
              })
              .then(function() {
                hbpIdentityUserDirectory.isGroupMember('hbp-sp10-user-edit-rights').then(function (result) {
                  $scope.hasEditRights = result;
                });
              });
          } else {
            $scope.userID = bbpConfig.get('localmode.ownerID');
            $scope.hasEditRights = true;
            return $q.when();
          }
        };

        $scope.updateUserID();

        // Function to determine if the current user owns an experiment which is in edit mode
        $scope.isUserAlreadyEditing = function() {
          var userEditsExperiment = false;
          angular.forEach($scope.experiment.simulations, function(simulation) {
            if ((simulation.operationMode === OPERATION_MODE.EDIT) && (simulation.contextID === $stateParams.ctx)) {
              userEditsExperiment = true;
            }
          });
          return userEditsExperiment;
        };

        $scope.updateExperiments = function() {
          _.forEach($scope.experiments, function(experiment, experimentID) {
            if (angular.isDefined(experiment.simulations)) {
              experiment.simulations = _.filter(experiment.simulations, function(simulation) {
                return (simulation.contextID === $stateParams.ctx);
              });
            }
          });
          $scope.owners = simulationService().owners;
          $scope.uptime = simulationService().uptime;

          $scope.isEditingOngoing = $scope.isUserAlreadyEditing();
        };

        // This function is called when all servers responded to the query of running experiments
        $scope.getExperimentsFinishedCallback = function () {
          collabConfigService.get({contextID: $stateParams.ctx},
            function(response) {
              var experimentID = response.experimentID;
              var defaultExperiment = {
                name: 'No experiment selected',
                description: 'Please click on the Edit button'
              };
              $scope.experiment = experimentID !== '' ? $scope.experiments[experimentID] : defaultExperiment;
              $scope.experiment.id = experimentID;
              $scope.isQueryingServersFinished = true;
              // Schedule the update if the esv-web controller was not destroyed in the meantime
              if(!$scope.isDestroyed) {
                $scope.updateExperiments();
                // Start to update the datastructure in regular intervals
                $scope.updatePromise = $timeout(function () {
                  experimentSimulationService.refreshExperiments(
                    $scope.experiments,
                    $scope.serversEnabled,
                    setIsServerAvailable,
                    $scope.updateExperiments
                  );
                }, ESV_UPDATE_RATE);
              }
            },
            function(data) {
              $scope.isQueryingServersFinished = true;
              $scope.experiment = {
                name: 'Internal Error',
                description: 'Database unavailable'
              };
              serverError.display(data);
            }
          );
        };

        // Set the progress message callback function
        experimentSimulationService.setProgressMessageCallback($scope.setProgressMessage);

        // Get the list of experiments from all the servers
        // $scope.experiments is the datastructure where all the templates and running experiments are stored
        experimentSimulationService.getExperiments($scope.experiments).then(function () {
          // After all promises are resolved we know that all requests have been processed.
          // Now we can see if there is a available Server
          experimentSimulationService.refreshExperiments(
            $scope.experiments,
            $scope.serversEnabled,
            setIsServerAvailable,
            $scope.getExperimentsFinishedCallback
          );
        });

        // clean up on leaving
        $scope.$on("$destroy", function () {
          $scope.isDestroyed = true;
          if (angular.isDefined($scope.updatePromise)) {
            $timeout.cancel($scope.updatePromise);
            $scope.updatePromise = undefined;
          }
          if (angular.isDefined($scope.updateUptimePromise)) {
            $interval.cancel($scope.updateUptimePromise);
            $scope.updateUptimePromise = undefined;
          }
          // Deregister the initialized callback
          experimentSimulationService.setInitializedCallback(undefined);
        });

      }]);
}());
