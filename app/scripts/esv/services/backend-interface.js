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
    .module('exdFrontendApp.Constants')
    // constants for Reset type.
    // WARNING: these values must match the ones in
    // GazeboRosPackages/src/cle_ros_msgs/srv/ResetSimulation.srv
    .constant('RESET_TYPE', {
      NO_RESET: -1,
      RESET_ROBOT_POSE: 0,
      RESET_FULL: 1,
      RESET_WORLD: 2,
      RESET_BRAIN: 3,
      RESET_OLD: 255,
      RESET_CAMERA_VIEW: 1000
    });

  angular.module('exdFrontendApp').factory('backendInterfaceService', [
    '$resource',
    '$stateParams',
    'bbpConfig',
    'serverError',
    'simulationInfo',
    function($resource, $stateParams, bbpConfig, serverError, simulationInfo) {
      var resourceStateMachineSimulation = function(backendBaseUrl) {
        return $resource(
          backendBaseUrl + '/simulation/:sim_id/state-machines',
          {},
          {
            get: {
              method: 'GET',
              interceptor: { responseError: serverError.displayHTTPError }
            },
            put: {
              method: 'PUT',
              url:
                backendBaseUrl +
                '/simulation/:sim_id/state-machines/:state_machine_name',
              interceptor: { responseError: serverError.displayHTTPError }
            },
            delete: {
              method: 'DELETE',
              url:
                backendBaseUrl +
                '/simulation/:sim_id/state-machines/:state_machine_name',
              interceptor: { responseError: serverError.displayHTTPError }
            }
          }
        );
      };

      var resourceExtendSimulationSimulation = function(
        backendBaseUrl,
        options
      ) {
        return $resource(
          backendBaseUrl + '/simulation/:sim_id/extend_timeout',
          options,
          {
            extendTimeout: {
              method: 'POST'
            }
          }
        );
      };
      var resourcesCloneFiles = function(backendBaseUrl) {
        return $resource(
          backendBaseUrl + '/simulation/clone-resources-files',
          {},
          {
            clone: {
              method: 'POST'
            }
          }
        );
      };
      var resourceTransferFunctionSimulation = function(backendBaseUrl) {
        return $resource(
          backendBaseUrl + '/simulation/:sim_id/transfer-functions',
          {},
          {
            transferFunctions: {
              method: 'GET',
              interceptor: { responseError: serverError.displayHTTPError }
            },
            activate: {
              method: 'PUT',
              url:
                backendBaseUrl +
                '/simulation/:sim_id/transfer-functions/:transfer_function_name/activation/:activate'
            },
            edit: {
              method: 'PUT',
              url:
                backendBaseUrl +
                '/simulation/:sim_id/transfer-functions/:transfer_function_name'
            },
            add: {
              method: 'POST',
              url: backendBaseUrl + '/simulation/:sim_id/transfer-functions'
            },
            delete: {
              method: 'DELETE',
              url:
                backendBaseUrl +
                '/simulation/:sim_id/transfer-functions/:transfer_function_name',
              interceptor: { responseError: serverError.displayHTTPError }
            }
          }
        );
      };

      var resourceTopics = function(backendBaseUrl) {
        return $resource(
          backendBaseUrl + '/simulation/topics',
          {},
          {
            get: {
              method: 'GET',
              interceptor: { responseError: serverError.displayHTTPError }
            }
          }
        );
      };

      var resourceBrainSimulation = function(backendBaseUrl) {
        return $resource(
          backendBaseUrl + '/simulation/:sim_id/brain',
          {},
          {
            get: {
              method: 'GET',
              interceptor: { responseError: serverError.displayHTTPError }
            },
            put: {
              method: 'PUT'
            }
          }
        );
      };

      var resourceBrainPopulations = function(backendBaseUrl) {
        return $resource(
          backendBaseUrl + '/simulation/:sim_id/populations',
          {},
          {
            get: {
              method: 'GET',
              interceptor: { responseError: serverError.displayHTTPError }
            }
          }
        );
      };

      var resourceReset = function(backendBaseUrl) {
        return $resource(
          backendBaseUrl + '/simulation/:sim_id/reset',
          {},
          {
            reset: {
              method: 'PUT',
              interceptor: {
                responseError: _.curry(serverError.displayHTTPError)(_, true)
              }
            }
          }
        );
      };

      var resourceResetCollab = function(backendBaseUrl) {
        return $resource(
          backendBaseUrl + '/simulation/:sim_id/:experimentId/reset',
          {},
          {
            reset: {
              method: 'PUT',
              interceptor: {
                responseError: _.curry(serverError.displayHTTPError)(_, true)
              }
            }
          }
        );
      };

      var resourceCSVRecordesFiles = function(backendBaseUrl) {
        return $resource(
          backendBaseUrl + '/simulation/:sim_id/:experimentId/csv-recorders',
          {},
          {
            dump: {
              method: 'PUT',
              interceptor: { responseError: serverError.displayHTTPError },
              url:
                backendBaseUrl +
                '/simulation/:sim_id/:experimentId/csv-recorders'
            }
          }
        );
      };

      /* eslint-disable camelcase*/

      return {
        getBrain: function(callback) {
          resourceBrainSimulation(simulationInfo.serverBaseUrl).get(
            { sim_id: simulationInfo.simulationID },
            function(response) {
              callback(response);
            }
          );
        },
        setBrain: function(
          data,
          brainPopulations,
          brainType,
          dataType,
          changePopulation,
          successCallback,
          failureCallback
        ) {
          resourceBrainSimulation(simulationInfo.serverBaseUrl).put(
            {
              sim_id: simulationInfo.simulationID
            },
            {
              data: data,
              brain_type: brainType,
              data_type: dataType,
              additional_populations: brainPopulations,
              change_population: changePopulation
            },
            successCallback,
            failureCallback
          );
        },

        getPopulations: function(callback) {
          return resourceBrainPopulations(simulationInfo.serverBaseUrl).get(
            { sim_id: simulationInfo.simulationID },
            callback
          ).$promise;
        },

        getTopics: function(callback) {
          resourceTopics(simulationInfo.serverBaseUrl).get({}, function(data) {
            callback(data);
          });
        },

        getStateMachines: function(callback) {
          return resourceStateMachineSimulation(
            simulationInfo.serverBaseUrl
          ).get({ sim_id: simulationInfo.simulationID }, function(response) {
            callback(response);
          }).$promise;
        },

        deleteTransferFunction: function(name, callback) {
          resourceTransferFunctionSimulation(
            simulationInfo.serverBaseUrl
          ).delete(
            {
              sim_id: simulationInfo.simulationID,
              transfer_function_name: name
            },
            callback
          );
        },
        saveCSVRecordersFiles: function(successCallback, errorCallback) {
          resourceCSVRecordesFiles(simulationInfo.serverBaseUrl).dump(
            {
              sim_id: simulationInfo.simulationID
            },
            {},
            successCallback,
            errorCallback
          );
        },
        getServerBaseUrl: function() {
          return simulationInfo.serverBaseUrl;
        },
        reset: function(resetData, successCallback, errorCallback) {
          return resourceReset(simulationInfo.serverBaseUrl).reset(
            { sim_id: simulationInfo.simulationID },
            resetData,
            successCallback,
            errorCallback
          );
        },
        setStateMachine: function(name, data, successCallback, errorCallback) {
          return resourceStateMachineSimulation(
            simulationInfo.serverBaseUrl
          ).put(
            {
              sim_id: simulationInfo.simulationID,
              state_machine_name: name
            },
            data,
            successCallback,
            errorCallback
          ).$promise;
        },
        deleteStateMachine: function(name, callback) {
          return resourceStateMachineSimulation(
            simulationInfo.serverBaseUrl
          ).delete(
            {
              sim_id: simulationInfo.simulationID,
              state_machine_name: name
            },
            callback
          ).$promise;
        },

        getTransferFunctions: function(callback) {
          return resourceTransferFunctionSimulation(
            simulationInfo.serverBaseUrl
          ).transferFunctions(
            {
              sim_id: simulationInfo.simulationID
            },
            callback
          ).$promise;
        },
        setActivateTransferFunction: function(
          name,
          data,
          activate,
          successCallback,
          errorCallback
        ) {
          resourceTransferFunctionSimulation(
            simulationInfo.serverBaseUrl
          ).activate(
            {
              sim_id: simulationInfo.simulationID,
              transfer_function_name: name,
              activate: activate
            },
            data,
            successCallback,
            errorCallback
          );
        },
        editTransferFunction: function(
          name,
          data,
          successCallback,
          errorCallback
        ) {
          return resourceTransferFunctionSimulation(
            simulationInfo.serverBaseUrl
          ).edit(
            {
              sim_id: simulationInfo.simulationID,
              transfer_function_name: name
            },
            data,
            successCallback,
            errorCallback
          ).$promise;
        },
        addTransferFunction: function(data, successCallback, errorCallback) {
          resourceTransferFunctionSimulation(simulationInfo.serverBaseUrl).add(
            {
              sim_id: simulationInfo.simulationID
            },
            data,
            successCallback,
            errorCallback
          );
        },
        resetCollab: function(resetData, successCallback, errorCallback) {
          return resourceResetCollab(simulationInfo.serverBaseUrl).reset(
            {
              sim_id: simulationInfo.simulationID,
              experimentId: simulationInfo.experimentID
            },
            resetData,
            successCallback,
            errorCallback
          );
        },
        extendTimeout: function() {
          return resourceExtendSimulationSimulation(
            simulationInfo.serverBaseUrl,
            { sim_id: simulationInfo.simulationID }
          ).extendTimeout().$promise;
        },
        cloneFileResources: function() {
          return resourcesCloneFiles(simulationInfo.serverBaseUrl).clone({
            exp_id: simulationInfo.experimentID
          });
        }
      };
    }
  ]);
})();
