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

  /* global console: false */

  angular
    .module('exdFrontendApp.Constants')
    .constant('DEFAULT_RESOURCE_GET_TIMEOUT', 10000) // ms = 10sec
    .constant('EXPERIMENTS_GET_TIMEOUT', 30000); // ms = 30sec

  var module = angular.module('simulationControlServices', [
    'ngResource',
    'exdFrontendApp.Constants',
    'simulationConfigModule',
    'exdFrontendFilters',
    'nrpErrorHandlers',
    'nrpAngulartics',
    'bbpConfig',
    'ui.router'
  ]);

  module.factory('simulationControl', [
    '$resource',
    'serverError',
    function($resource, serverError) {
      return function(baseUrl) {
        return $resource(
          baseUrl + '/simulation/:sim_id',
          {},
          {
            simulation: {
              method: 'GET',
              interceptor: { responseError: serverError.displayHTTPError }
            }
          }
        );
      };
    }
  ]);

  module.factory('simulationCreationInterceptor', [
    '$q',
    '$log',
    '$window',
    'serverError',
    function($q, $log, $window, serverError) {
      // white list of non-fatal error regexps
      var NON_FATAL_ERRORS_WHITELIST = [
        'Another',
        'timeout',
        /previous one.*terminated/
      ];

      //returns true if the error is unlisted as blocking or is a cluster error
      var isFatalError = function(error) {
        if (!error.data) {
          return true;
        }
        var errorMsg = error.data.message || error.data;
        if (
          !angular.isString(errorMsg) ||
          errorMsg.indexOf('cluster') >= 0 ||
          errorMsg.indexOf('Internal') >= 0
        ) {
          return true;
        }
        return !_.some(NON_FATAL_ERRORS_WHITELIST, function(nonFatalErrMsg) {
          return errorMsg.match(nonFatalErrMsg);
        });
      };
      return function(error) {
        if (error.status === 504) {
          // The initialization of a large brain in the backend might cause a timeout (504) for this REST call.
          // Since we don't need the result, we don't consider this timeout as an error.
          return $q.resolve();
        } else {
          var isFatal = isFatalError(error);
          if (isFatal) {
            // If it is a fatal error, then we go through the normal error handling
            // reload the page after the modal has been closed
            var reloadPage = () => $window.location.reload();
            serverError.displayHTTPError(error, true, reloadPage);
          } else {
            // Log error on console
            $log.debug(error);
          }
          return $q.reject({ error: error, isFatal: isFatal });
        }
      };
    }
  ]);

  module.factory('simulationState', [
    '$resource',
    'simulationCreationInterceptor',
    'serverError',
    function($resource, simulationCreationInterceptor, serverError) {
      return function(baseUrl) {
        return $resource(
          baseUrl + '/simulation/:sim_id/state',
          {},
          {
            state: {
              method: 'GET',
              interceptor: { responseError: serverError.displayHTTPError }
            },
            update: {
              // this method initializes, starts, stops, or pauses the simulation
              method: 'PUT',
              interceptor: {
                responseError: simulationCreationInterceptor
              }
            }
          }
        );
      };
    }
  ]);

  module.factory('simulationGenerator', [
    '$resource',
    '$timeout',
    '$q',
    'simulationCreationInterceptor',
    'serverError',
    'STATE',
    function(
      $resource,
      $timeout,
      $q,
      simulationCreationInterceptor,
      serverError,
      STATE
    ) {
      return function(baseUrl) {
        var rsc = $resource(
          baseUrl + '/simulation',
          {},
          {
            create: {
              method: 'POST',
              interceptor: {
                responseError: simulationCreationInterceptor
              }
            },
            simulationReady: {
              method: 'GET',
              isArray: true,
              interceptor: { responseError: serverError.displayHTTPError }
            }
          }
        );

        // Since it is possible to have two (or more) front-ends trying to start a simulation at the same time,
        // the creationUniqueID is used to be sure that we are the owner of the launched simulation.
        // This ID is passed at the creation of the simulation and caught later here. If the
        // simulationReady function does not have the correct ID as an argument, we don't join the simulation and show
        // an error to the user.

        var simulationReady = function(creationUniqueID) {
          var deferred = $q.defer();

          var verifySimulation = function() {
            $timeout(function() {
              rsc
                .simulationReady()
                .$promise.then(function(simulations) {
                  var continueVerify = true;

                  if (simulations.length > 0) {
                    var last = simulations.length - 1;
                    var state = simulations[last].state;

                    if (state === STATE.PAUSED || state === STATE.INITIALIZED) {
                      if (
                        simulations[last].creationUniqueID === creationUniqueID
                      ) {
                        continueVerify = false;
                        deferred.resolve(simulations[last]);
                      } else {
                        deferred.reject();
                      }
                    } else if (
                      state === STATE.HALTED ||
                      state === STATE.FAILED
                    ) {
                      continueVerify = false;
                      deferred.reject();
                    }
                  }

                  if (continueVerify) {
                    verifySimulation();
                  }
                })
                .catch(deferred.reject);
            }, 1000);
          };

          verifySimulation();

          return deferred.promise;
        };

        return {
          create: rsc.create,
          simulationReady: simulationReady
        };
      };
    }
  ]);

  module.factory('simulationSDFWorld', [
    '$resource',
    'serverError',
    function($resource, serverError) {
      return function(baseUrl) {
        return $resource(
          baseUrl + '/simulation/:simId/sdf_world',
          {},
          {
            export: {
              method: 'GET',
              interceptor: { responseError: serverError.displayHTTPError }
            },
            save: {
              method: 'POST',
              interceptor: { responseError: serverError.displayHTTPError }
            }
          }
        );
      };
    }
  ]);

  module.factory('objectControl', [
    '$resource',
    'serverError',
    function($resource, serverError) {
      return function(baseUrl) {
        return $resource(
          baseUrl + '/simulation/:sim_id/interaction/material_change',
          {},
          {
            updateMaterial: {
              method: 'PUT',
              interceptor: { responseError: serverError.displayHTTPError }
            }
          }
        );
      };
    }
  ]);

  module.factory('experimentSimulationService', [
    '$q',
    '$http',
    '$log',
    '$timeout',
    '$stateParams',
    'nrpAnalytics',
    'simulationState',
    'simulationGenerator',
    'roslib',
    'STATE',
    'experimentProxyService',
    'bbpConfig',
    'simulationConfigService',
    'environmentService',
    function(
      $q,
      $http,
      $log,
      $timeout,
      $stateParams,
      nrpAnalytics,
      simulationState,
      simulationGenerator,
      roslib,
      STATE,
      experimentProxyService,
      bbpConfig,
      simulationConfigService,
      environmentService
    ) {
      var rosConnection, statusListener;

      var registerForStatusInformation = function(
        rosbridgeConfiguration,
        setProgressMessage
      ) {
        function destroyCurrentConnection() {
          if (statusListener) {
            // remove the progress bar callback only, unsubscribe terminates the rosbridge
            // connection for any other subscribers on the status topic
            statusListener.removeAllListeners();
            statusListener = undefined;
          }
          rosConnection = undefined;
        }

        destroyCurrentConnection();

        rosConnection = roslib.getOrCreateConnectionTo(
          rosbridgeConfiguration.websocket
        );
        statusListener = roslib.createStringTopic(
          rosConnection,
          bbpConfig.get('ros-topics').status
        );

        statusListener.subscribe(function(data) {
          var message = JSON.parse(data.data);
          if (message && message.progress) {
            if (message.progress.done) {
              destroyCurrentConnection();
              setProgressMessage({ main: 'Simulation initialized.' });
            } else {
              setProgressMessage({
                main: message.progress.task,
                sub: message.progress.subtask
              });
            }
          }
        });
      };

      var launchExperimentInPossibleServers = function(
        experiment,
        launchSingleMode,
        reservation
      ) {
        var fatalErrorOccurred = false,
          serversToTry = experiment.devServer
            ? [experiment.devServer]
            : _.clone(experiment.availableServers.map(s => s.id));

        var brainProcesses = launchSingleMode
          ? 1
          : experiment.configuration.brainProcesses;

        var oneSimulationFailed = function(failure) {
          if (!failure) {
            return $q.reject();
          }

          if (failure.error && failure.error.data) {
            $log.error(
              'Failed to start simulation: ' +
                angular.toJson(failure.error.data)
            );
          }
          fatalErrorOccurred = fatalErrorOccurred || failure.isFatal;
          return $q.reject(failure);
        };

        function launchInServer(server) {
          return experimentProxyService
            .getServerConfig(server)
            .then(function(serverConfig) {
              function launch(environmentConfiguration) {
                return launchExperimentOnServer(
                  experiment.id,
                  experiment.private,
                  experiment.configuration.experimentConfiguration,
                  environmentConfiguration,
                  brainProcesses,
                  server,
                  serverConfig,
                  reservation
                ).catch(oneSimulationFailed);
              }

              return launch();
            });
        }

        function launchInNextServer() {
          var nextServer = serversToTry.splice(0, 1);
          if (fatalErrorOccurred || !nextServer.length) {
            //no more servers to retry, we have failed to start experiment
            return $q.reject(fatalErrorOccurred);
          }

          return launchInServer(nextServer[0]).catch(launchInNextServer); //try with nextServer, catch => launchInNextServer
        }

        return launchInNextServer();
      };

      var launchExperimentOnServer = function(
        experimentID,
        privateExperiment,
        experimentConfiguration,
        environmentConfiguration,
        brainProcesses,
        server,
        serverConfiguration,
        reservation
      ) {
        var deferred = $q.defer();

        _.defer(function() {
          deferred.notify({ main: 'Create new Simulation...' });
        }); //called once caller has the promise

        var serverURL = serverConfiguration.gzweb['nrp-services'];
        var serverJobLocation =
          serverConfiguration.serverJobLocation || 'local';

        var simInitData = {
          experimentConfiguration: experimentConfiguration,
          gzserverHost: serverJobLocation,
          private: privateExperiment,
          experimentID: experimentID,
          brainProcesses: brainProcesses,
          reservation: reservation,
          creationUniqueID: (Date.now() + Math.random()).toString(),
          ctxId: $stateParams.ctx
        };

        if (environmentConfiguration) {
          simInitData.environmentConfiguration = environmentConfiguration.path;
        }

        // Create a new simulation.
        simulationGenerator(serverURL).create(simInitData);

        deferred.notify({ main: 'Initialize Simulation...' });
        // register for messages during initialization
        registerForStatusInformation(
          serverConfiguration.rosbridge,
          deferred.notify
        );

        simulationGenerator(serverURL)
          .simulationReady(simInitData.creationUniqueID)
          .then(function(simulation) {
            simulationConfigService
              .initConfigFiles(serverURL, simulation.simulationID)
              .then(function() {
                deferred.resolve(
                  'esv-private/experiment-view/' +
                    server +
                    '/' +
                    experimentID +
                    '/' +
                    environmentService.isPrivateExperiment() +
                    '/' +
                    simulation.simulationID
                );
              })
              .catch(function(err) {
                deferred.reject(err);
              });
          })
          .catch(function(err) {
            deferred.reject(err);
          });

        return deferred.promise;
      };

      var stopExperimentOnServer = function(simulation) {
        var deferred = $q.defer();

        experimentProxyService
          .getServerConfig(simulation.server)
          .then(function(serverConfig) {
            var simStateInstance = simulationState(
              serverConfig.gzweb['nrp-services']
            );

            function updateSimulationState(state) {
              /*eslint-disable camelcase*/
              return simStateInstance.update(
                { sim_id: simulation.runningSimulation.simulationID },
                { state: state }
              ).$promise;
            }

            return simStateInstance
              .state({ sim_id: simulation.runningSimulation.simulationID })
              .$promise.then(function(data) {
                if (!data || !data.state) {
                  return $q.reject();
                }
                switch (data.state) {
                  case STATE.CREATED: //CREATED --(initialize)--> PAUSED --(stop)--> STOPPED
                    return updateSimulationState(STATE.INITIALIZED).then(
                      _.partial(updateSimulationState, STATE.STOPPED)
                    );
                  case STATE.STARTED: //STARTED --(stop)--> STOPPED
                  case STATE.PAUSED: //PAUSED  --(stop)--> STOPPED
                  case STATE.HALTED: //HALTED  --(stop)--> FAILED
                    return updateSimulationState(STATE.STOPPED);
                }
              });
            /*eslint-enable camelcase*/
          })
          .then(deferred.resolve)
          .catch(deferred.reject);
        return deferred.promise;
      };

      var startNewExperiment = function(
        experiment,
        launchSingleMode,
        reservation
      ) {
        nrpAnalytics.eventTrack('Start', { category: 'Experiment' });
        nrpAnalytics.tickDurationEvent('Server-initialization');

        return launchExperimentInPossibleServers(
          experiment,
          launchSingleMode,
          reservation
        );
      };

      // Public methods of the service
      var experimentSimulationService = {
        stopExperimentOnServer: stopExperimentOnServer,
        startNewExperiment: startNewExperiment
      };

      return experimentSimulationService;
    }
  ]);
})();
