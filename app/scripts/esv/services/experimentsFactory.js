(function (){
  'use strict';

  angular.module('exdFrontendApp.Constants')
    .constant('CLUSTER_THRESHOLDS', {
      UNAVAILABLE: 2,
      AVAILABLE: 4,
  });

  angular.module('experimentServices')
    .constant('SERVER_POLL_INTERVAL', 10 * 1000)
    .constant('FAIL_ON_ALL_SERVERS_ERROR', {
      title: 'No server is currently available',
      template: 'No server can handle your simulation at the moment. Please try again later'
    })
    .constant('FAIL_ON_SELECTED_SERVER_ERROR', {
      title: 'The selected server is currently not available',
      template: 'The selected server cannot handle your simulation at the moment. Please try again later'
    })
    .factory('experimentsFactory',
    ['$q', '$interval', 'experimentProxyService', 'bbpConfig', 'uptimeFilter', 'slurminfoService',
      'hbpIdentityUserDirectory', 'experimentSimulationService', 'hbpDialogFactory', 'SERVER_POLL_INTERVAL', 'collabFolderAPIService',
      'FAIL_ON_SELECTED_SERVER_ERROR', 'FAIL_ON_ALL_SERVERS_ERROR', 'CLUSTER_THRESHOLDS',
      function ($q, $interval, experimentProxyService, bbpConfig, uptimeFilter, slurminfoService,
        hbpIdentityUserDirectory, experimentSimulationService, hbpDialogFactory, SERVER_POLL_INTERVAL, collabFolderAPIService,
        FAIL_ON_SELECTED_SERVER_ERROR, FAIL_ON_ALL_SERVERS_ERROR, CLUSTER_THRESHOLDS) {
        var localmode = {
          forceuser: bbpConfig.get('localmode.forceuser', false),
          ownerID: bbpConfig.get('localmode.ownerID', null)
        };

        var experimentsFactory = {
          createExperimentsService: experimentsService,
          getOwnerDisplayName: _.memoize(getOwnerName),
          getCurrentUserInfo: getCurrentUserInfo
        };

        return experimentsFactory;

        function getOwnerName(owner) {
          if (localmode.forceuser) {
            return $q.when(localmode.ownerID);
          }
          return hbpIdentityUserDirectory.get([owner]).then(function (profile) {
            return (profile[owner] && profile[owner].displayName) || 'Unkwown';
          });
        }

        function getCurrentUserInfo() {
          if (localmode.forceuser) {
            return $q.when({
              userID: bbpConfig.get('localmode.ownerID'),
              hasEditRights: true,
              forceuser: true
            });
          }
          return $q.all([
            hbpIdentityUserDirectory.getCurrentUser(),
            hbpIdentityUserDirectory.isGroupMember('hbp-sp10-user-edit-rights')
          ]).then(function (userInfo) {
            return {
              userID: userInfo[0].id,
              hasEditRights: userInfo[1],
              forceuser: false
            };
          });
        }

        function experimentsService(contextId, experimentId, experimentFolderUUID) {
          var updateUptimeInterval, updateExperimentsInterval, experimentsDict, stoppingDict = {};
          var service = {
            destroy: destroy,
            initialize: initialize,
            startExperiment: startExperiment,
            stopExperiment: stopExperiment,
            getCurrentUserInfo: getCurrentUserInfo,
            experiments: null,
            clusterAvailability: { free: 'N/A', total: 'N/A'} // Default for local mode
          };

          return service;

          function initialize() {
            if (contextId && experimentId) {
              var exp = {};
              exp[experimentId] = {configuration:{"maturity": "production"}};
              service.experiments = experimentProxyService.getJoinableServers(contextId)
                .then(function(joinableServers){
                  exp[experimentId].joinableServers = joinableServers;
                  return experimentProxyService.getAvailableServers(experimentId);
                })
                .then(function(availableServers){
                  exp[experimentId].availableServers = availableServers;
                  return exp;
                })
                .then(function (exp) {return (experimentsDict = exp); })
                .then(updateCollabExperimentDetails)
                .then(transformExperiments)
                .then(_.map);
            }
            else{
              service.experiments = experimentProxyService.getExperiments()
                .then(function (exps) {return (experimentsDict = exps); })
                .then(transformExperiments)
                .then(_.map);
            }
            // TODO(Luc): don't perform GET request on the SlurmMonitor server if localmode is true
            service.clusterAvailability = slurminfoService.get().$promise.then(transformClusterAvailability);
            updateExperimentImages();
            updateUptime();
            updateUptimeInterval = $interval(updateUptime, 1000);
            updateExperimentsInterval = $interval(refreshExperimentsAndCluster, SERVER_POLL_INTERVAL);
          }

          function updateCollabExperimentDetails(experiment){
            return loadExperimentDetails().then(function(experimentDetails){
              experiment[experimentId].configuration.name = experimentDetails.name;
              experiment[experimentId].configuration.description = experimentDetails.desc;
              experiment[experimentId].configuration.timeout = parseInt(experimentDetails.timeout);
              experiment[experimentId].configuration.experimentConfiguration = "";
              return experiment;
            },
            function(error){
              return experiment;
            });
          }
          function transformExperiments(experiments) {
            return _.forEach(experiments, function (exp, expId) {
              exp.id = expId;
              exp.joinableServers.forEach(function (simul) {
                experimentsFactory.getOwnerDisplayName(simul.runningSimulation.owner).then(function (owner) {
                  simul.owner = owner;
                });
              });
            });
          }

          function updateExperimentImages() {
            var getCollabImage = loadCollabImage();
            service.experiments.then(function (experiments) {
              if (contextId && experiments.length === 1){
                getCollabImage.then(function(collabImage){
                  experiments[0].imageData = collabImage;
                }).catch(function(){
                  getBackendExperimentImages(experiments);
                });
              }
              else {
                getBackendExperimentImages(experiments);
              }
            });
          }

          function getBackendExperimentImages(experiments) {
            var experimentIds = experiments.map(function (exp) { return exp.id; });
            experimentProxyService.getImages(experimentIds)
             .then(function (images) {
               experiments.forEach(function (exp) { exp.imageData = images[exp.id]; });
             });
          }

          /*
            Function to get experiment details from the collab storage
            @param {string}   fileName        - the file to retrieve from the storage
            @param {Object}   downloadHeaders - headers to use when requesting the file
            @return {Promise} Promise object
          */
          function getExperimentDetailsFromCollab(fileName, downloadHeaders) {
            var promise = $q.defer();
            if (contextId && experimentId && experimentFolderUUID){
              collabFolderAPIService.getFolderFile(experimentFolderUUID, fileName)
              .then(function(fileData){
                if (!fileData || !fileData._uuid){
                  promise.reject();
                }
                else {
                  collabFolderAPIService.downloadFile(fileData._uuid, downloadHeaders)
                  .then(function(fileContent){
                    if (!fileContent){
                      promise.reject();
                    }
                    else {
                      promise.resolve(fileContent);
                    }
                  });
                }
              });
            }
            else {
              promise.reject();
            }
            return promise.promise;
          }

          function loadCollabImage(){
            return getExperimentDetailsFromCollab(experimentId + ".png", {"responseType": "blob"})
            .then(function(imageContent){
              var reader = new FileReader();
              var promise = $q.defer();
              reader.addEventListener('loadend', function(e) {
                promise.resolve(e.target.result.replace("data:image/png;base64,", ""));
              });
              reader.readAsDataURL(imageContent);
              return promise.promise;
            },
            function(){
              return $q.reject();
            });
          }

          function loadExperimentDetails(){
            return getExperimentDetailsFromCollab("experiment_configuration.xml")
            .then(function(fileContent){
              var xml = $($.parseXML(fileContent));
              return $q.resolve({ name: xml.find("name").text(), desc: xml.find("description").text(), timeout: xml.find("timeout").text()});
            },
            function(){
              return $q.reject();
            });
          }


          function updateUptime() {
            service.experiments.then(function (exps) {
              exps.forEach(function (exp) {
                exp.joinableServers.forEach(function (simul) {
                  simul.uptime = uptimeFilter(simul.runningSimulation.creationDate);
                });
              });
            });
          }

          function startExperiment(experiment, launchSingleMode, envSDFData) {
            return experimentSimulationService.startNewExperiment(experiment, launchSingleMode, envSDFData)
              .catch(function (fatalErrorWasShown) {
                if (!fatalErrorWasShown) {
                  hbpDialogFactory.alert(experiment.devServer ? FAIL_ON_SELECTED_SERVER_ERROR: FAIL_ON_ALL_SERVERS_ERROR);
                }
                return $q.reject(fatalErrorWasShown);
              });
          }

          function stopExperiment(simulation) {
            simulation.stopping = true;
            if (!stoppingDict[simulation.server]){
              stoppingDict[simulation.server] = {};
            }
            stoppingDict[simulation.server][simulation.runningSimulation.simulationID] = true;
            return experimentSimulationService.stopExperimentOnServer(simulation);
          }

          function refreshExperimentsAndCluster() {
            if (contextId && experimentId){
              experimentProxyService.getJoinableServers(contextId)
                .then(function(joinableServers){
                  experimentsDict[experimentId].joinableServers = joinableServers;
                  experimentsDict[experimentId].joinableServers.forEach(function (sim) {
                    sim.stopping = stoppingDict[sim.server] && stoppingDict[sim.server][sim.runningSimulation.simulationID];
                  });
                  return experimentProxyService.getAvailableServers(experimentId);
                })
                .then(function(availableServers){
                  experimentsDict[experimentId].availableServers = availableServers;
                  return experimentsDict;
                })
                .then(transformExperiments)
                .then(updateCollabExperimentDetails)
                .then(updateClusterAvailability);
            }
            else {
              experimentProxyService.getExperiments()
                .then(transformExperiments)
                .then(function (experiments) {
                  _.forOwn(experiments, function (exp, expId) {
                    ['availableServers', 'joinableServers'].forEach(function (prop) {
                      experimentsDict[expId][prop] = exp[prop];
                    });
                    exp.joinableServers.forEach(function (sim) {
                      sim.stopping = stoppingDict[sim.server] && stoppingDict[sim.server][sim.runningSimulation.simulationID];
                    });
                    updateUptime();
                  });
                })
                .then(updateClusterAvailability);
              }
          }

          function updateClusterAvailability(){
            if (!localmode.forceuser) {
              slurminfoService.get().$promise
                .then(transformClusterAvailability)
                .then(function (clusterAvailability) {
                  service.clusterAvailability.then(function (currentClusterAvailability) {
                    _.merge(currentClusterAvailability, clusterAvailability);
                });
              });
            }
            else {
              // localmode, we will not use the cluster
              transformClusterAvailability();
            }
          }

          function transformClusterAvailability(clusterAvailability) {
            return service.experiments.then(function(experiments){
              var result = { free: 'NaN', total: 'NaN'}; // Displayed if there is an issue with the Slurmonitor server
              if (clusterAvailability) {
                result.free = clusterAvailability.free;
                result.total = clusterAvailability.nodes[3];
              }
              for (var i=0; i < experiments.length; i++){
                var exp = experiments[i];
                if (!exp.availableServers || exp.availableServers.length === 0 || (clusterAvailability && result.free < CLUSTER_THRESHOLDS.UNAVAILABLE)){
                  exp.serverStatus = "Unavailable";
                  exp.serverStatusClass = "label-danger";
                }
                else if ((exp.availableServers.length > 0 && !clusterAvailability) || (clusterAvailability && result.free > CLUSTER_THRESHOLDS.AVAILABLE)){
                  exp.serverStatus = "Available";
                  exp.serverStatusClass = "label-success";
                }
                else {
                  exp.serverStatus = "Restricted";
                  exp.serverStatusClass = "label-warning";
                }
              }
              return result;
            });
          }
          function destroy() {
            $interval.cancel(updateUptimeInterval);
            $interval.cancel(updateExperimentsInterval);
          }
        }
      }]);
})();
