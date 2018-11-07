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
/* This module is thought to centralize the back-end server settings used for the current simulation.*/

(function() {
  'use strict';

  angular
    .module('simulationInfoService', [
      'experimentServices',
      'simulationControlServices'
    ])
    .factory('simulationInfo', [
      '$q',
      'experimentProxyService',
      'storageServer',
      'environmentService',
      function($q, experimentProxyService, storageServer, environmentService) {
        let initialized = $q.defer();
        var thisService = {
          initialize: initialize,
          initialized: initialized.promise
        };
        return thisService;

        // This function loads the server specific configuration and sets the simulation specific values
        function initialize(serverID, experimentID, simulationID, contextID) {
          if (!serverID || !simulationID) {
            throw 'No serverID or simulationID given.';
          }
          thisService.serverID = serverID;
          thisService.simulationID = simulationID;
          thisService.contextID = contextID;
          thisService.experimentID = experimentID;
          thisService.experimentDetails = null;
          thisService.simMaxTimeOutText = 300;
          thisService.simMaxAutoTimeOutText = 360;
          storageServer
            .getBrain(experimentID)
            .then(res => (thisService.brain = res));

          return experimentProxyService
            .getServerConfig(thisService.serverID)
            .then(function(serverConfig) {
              thisService.serverConfig = serverConfig;
              thisService.serverBaseUrl = serverConfig.gzweb['nrp-services'];
              thisService.animatedModel = null;
              var setExperimentDetails = function(configuration) {
                // Test whether the robot model has an animated visual that needs to be instantied by gz3d's Collada loader
                if (configuration && configuration.visualModel) {
                  thisService.animatedModel = configuration;
                  thisService.animatedModel.assetsPath =
                    thisService.serverConfig.gzweb.assets +
                    '/' +
                    configuration.visualModel;
                }
                thisService.experimentDetails = configuration;
              };

              if (environmentService.isPrivateExperiment()) {
                return storageServer
                  .getExperimentConfig(experimentID)
                  .then(config => setExperimentDetails(config));
              }

              return experimentProxyService
                .getExperiments()
                .then(function(data) {
                  var configuration =
                    data[thisService.experimentID] &&
                    data[thisService.experimentID].configuration;

                  // update simulation specific data that user can override from the default configuration
                  if (
                    data[thisService.experimentID] &&
                    data[thisService.experimentID].joinableServers
                  ) {
                    // find the currently running experiment on the server with same simulation id (unique)
                    for (
                      var i = 0;
                      i < data[thisService.experimentID].joinableServers.length;
                      i++
                    ) {
                      var joinable =
                        data[thisService.experimentID].joinableServers[i];
                      if (
                        joinable.server === thisService.serverID &&
                        String(joinable.runningSimulation.simulationID) ===
                          thisService.simulationID
                      ) {
                        configuration.brainProcesses =
                          joinable.runningSimulation.brainProcesses;
                        break;
                      }
                    }
                  }

                  setExperimentDetails(configuration);
                });
            })
            .then(() => initialized.resolve());
        }
      }
    ]);
})();
