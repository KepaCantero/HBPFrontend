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
    .module('experimentList', [])
    .service('selectedSharedExperiment', function() {
      this.experiment = {};
      this.getExperiment = function() {
        return this.experiment;
      };
      this.setExperiment = function(expId) {
        this.experiment.id = expId;
      };
      this.resetExperiment = function() {
        this.experiment = {};
      };
      this.isEmpty = function() {
        return Object.keys(this.experiment).length == 0;
      };
    })
    .controller('ExperimentListController', [
      '$scope',
      '$location',
      '$stateParams',
      'experimentsFactory',
      'storageServer',
      '$window',
      'nrpUser',
      'environmentService',
      'clbErrorDialog',
      'clbConfirm',
      'tipTooltipService',
      '$rootScope',
      'selectedSharedExperiment',
      '$http',
      'nrpModalService',
      'bbpConfig',
      '$interval',
      function(
        $scope,
        $location,
        $stateParams,
        experimentsFactory,
        storageServer,
        $window,
        nrpUser,
        environmentService,
        clbErrorDialog,
        clbConfirm,
        tipTooltipService,
        $rootScope,
        selectedSharedExperiment,
        $http,
        nrpModalService,
        bbpConfig,
        $interval
      ) {
        const ExperimentModeSharedOption = 'Shared';
        $scope.allUsers = [];
        $scope.sharedUsers = [];
        $scope.search = { searchUser: '' };
        $scope.throttle = 150;
        var experimentSelected = '';
        $scope.model = {};
        $scope.model.experimentSharedMode = 'Private';
        $scope.pageState = {};
        $scope.isPrivateExperiment = environmentService.isPrivateExperiment();
        $scope.devMode = environmentService.isDevMode();
        $scope.tipTooltipService = tipTooltipService;
        var experimentsService;
        $scope.config = {
          loadingMessage: 'Loading list of experiments...'
        };

        $scope.config.canLaunchExperiments =
          ($scope.isPrivateExperiment && $scope.private) ||
          !$scope.isPrivateExperiment;

        $scope.config.canCloneExperiments = $scope.isPrivateExperiment;
        function excludeExperimentOwner(user) {
          return user != $scope.currentUserName;
        }

        storageServer.getAllUsers().then(users =>
          // a list of possible users to share the experiment
          nrpUser.getCurrentUser().then(currentuser => {
            $scope.currentUserName = currentuser.displayName;
            //we exclude the owner of the experiment
            $scope.allUsers = users.filter(excludeExperimentOwner);
          })
        );

        $scope.changeExpName = (newExpId, oldExpId) => {
          return storageServer
            .getFileContent(oldExpId, 'experiment_configuration.exc', true)
            .then(file => {
              if (!file.uuid) {
                return $scope.throwCloningError({
                  data:
                    'It seems like the experiment_configuration file is missing or is corrupted',
                  statusText: 504,
                  status: 504
                });
              }
              function pad(n) {
                return n < 10 ? '0' + n : n;
              }
              let xml = $.parseXML(file.data);
              var name = xml.getElementsByTagNameNS('*', 'name')[0].textContent;
              var currentDate = new Date();
              var date = currentDate.getDate();
              var month = currentDate.getMonth();
              var year = currentDate.getFullYear();
              var dateString = pad(date) + '-' + pad(month + 1) + '-' + year;
              name +=
                ' cloned ' +
                dateString +
                ' ' +
                currentDate.getHours() +
                ':' +
                pad(currentDate.getMinutes()) +
                ':' +
                pad(currentDate.getSeconds());
              xml.getElementsByTagNameNS('*', 'name')[0].textContent = name;

              var xmlText = new XMLSerializer().serializeToString(xml);
              return storageServer.setFileContent(
                newExpId,
                'experiment_configuration.exc',
                xmlText,
                true
              );
            });
        };

        $scope.clone = function(experiment) {
          storageServer.logActivity('clone_experiment', {
            experimentId: experiment.id
          });

          if (
            $scope.config.canLaunchExperiments ||
            experiment.configuration.isShared
            /* means we are cloning a cloned experiment*/
          ) {
            $scope.cloneClonedExperiment(
              experiment.id,
              experiment.configuration.isShared
            );
          } else {
            $scope.cloneExperiment(experiment);
          }
        };

        $scope.atLeastOneExperimentRunning = function() {
          for (var exp in $scope.filteredExperiments) {
            if ($scope.filteredExperiments[exp].joinableServers.length > 0) {
              return true;
            }
          }

          return false;
        };

        $scope.selectExperiment = function(experiment) {
          if ($scope.pageState.startingExperiment) {
            return;
          }
          if (experiment.id !== $scope.pageState.selected) {
            $scope.pageState.selected = experiment.id;
            $scope.pageState.showJoin = false;
            $scope.pageState.showRecords = false;
          }
        };

        $scope.startPizDaintExperiment = function(experiment) {
          $scope.startingJob = true;
          $scope.pageState.startingExperiment = experiment.id;
          $scope.progressMessage = { main: 'Submitting job request' };
          let jobUrl;
          let errorCode = function(err) {
            $scope.startingJob = false;
            $scope.pageState.startingExperiment = null;
            experimentsService
              .getPizDaintJobOutcome(jobUrl)
              .then(function(response) {
                console.log('stdout:');
                console.log(response[0]);
                console.log('stderr:');
                console.log(response[1]);
              });
            err = {
              type: 'Error while starting job',
              data: err,
              message:
                'There was an error when trying to start the job. Please check the logs',
              code: err
            };
            clbErrorDialog.open(err).then(() => {});
          };

          experimentsService.startPizDaintExperiment(experiment).then(
            function(response) {
              jobUrl = response;
              $scope.progressMessage.main =
                'Job Sucessfully started. Job url: ' + jobUrl;
              experiment.devServer = experiment.pizServer;
              const checkServer = () => {
                //get job status
                return experimentsService
                  .getPizDaintJobStatus(jobUrl)
                  .then(function(status) {
                    if (status !== 'RUNNING') {
                      $interval.cancel(intervalStatus);
                      errorCode(
                        'Job finished before we could start the simulation. Check console logs.'
                      );
                    } else {
                      let found = false;
                      experiment.availableServers.forEach(server => {
                        if (server.id === experiment.pizServer) {
                          found = true;
                        }
                      });
                      if (found) {
                        $interval.cancel(intervalStatus);
                        $scope.startNewExperiment(
                          experiment,
                          undefined,
                          true,
                          jobUrl
                        );
                      }
                    }
                  });
              };
              let intervalStatus = $interval(checkServer, 1000);
            }, // succeeded
            function(err) {
              errorCode(err);
            }, // failed
            function(msg) {
              $scope.progressMessage.main =
                'Job submitted. Waiting for job to start (this may take some time). Current job status: ' +
                msg;
            } //in progress
          );
        };
        $scope.getPizDaintJobs = function() {
          $scope.loadingJobs = true;
          $scope.config.loadingMessage = 'Retrieving job information..';
          experimentsService.getPizDaintJobs().then(function(jobs) {
            $scope.pizdaintJobs = jobs;
            $scope.loadingJobs = false;
          });
        };

        $scope.cloneClonedExperiment = function(experimentId, isShared) {
          $scope.isCloneRequested = true;
          storageServer
            .cloneClonedExperiment(experimentId)
            .then(newExp =>
              $scope.changeExpName(newExp.clonedExp, newExp.originalExp)
            )
            .then(
              () =>
                isShared ? $scope.loadPrivateExperiments() : $scope.reinit()
            )
            .catch(err => $scope.throwCloningError(err))
            .finally(() => ($scope.isCloneRequested = false));
        };

        $scope.cloneExperiment = function(experiment) {
          $scope.isCloneRequested = true;
          storageServer
            .cloneTemplate(
              experiment.configuration.experimentConfiguration,
              $stateParams.ctx
            )
            .then(() => {
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
            })
            .then(() => $scope.loadPrivateExperiments())
            .catch(err => $scope.throwCloningError(err))
            .finally(() => ($scope.isCloneRequested = false));
        };

        $scope.throwCloningError = function(err) {
          err = {
            type: 'Error while cloning',
            data: err.data,
            message:
              'Cloning operation failed. The cloning server might be unavailable',
            code: err.statusText + ' ' + err.status
          };
          clbErrorDialog.open(err).then(() => {});
        };

        $scope.canStopSimulation = function(simul) {
          return (
            $scope.userinfo &&
            $scope.userinfo.userID === simul.runningSimulation.owner
          );
        };

        $scope.selectExpFromFileExplorer = function() {
          if (!selectedSharedExperiment.isEmpty()) {
            $scope.selectExperiment(selectedSharedExperiment.getExperiment());
          }
        };

        let filterExperiments = () => {
          if (!$scope.experiments) return;

          $scope.filteredExperiments = $scope.experiments.filter(exp => {
            //filter out experiments whose query doesn't match the name nor any of the tags
            if ($scope.query) {
              let lowerQuery = $scope.query.toLowerCase();
              if (
                !~exp.configuration.name.toLowerCase().indexOf(lowerQuery) &&
                (!exp.configuration.tags ||
                  !exp.configuration.tags.some(
                    t => t.toLowerCase().indexOf(lowerQuery) == 0
                  ))
              )
                return false;
            }
            //filter out experiments that are not mature
            return (
              $scope.devMode ||
              $scope.showDev ||
              exp.configuration.maturity === 'production'
            );
          });
        };

        $scope.$watch('query', () => filterExperiments());

        const visibleExperiment = exp => {
          return (
            !$scope.private || // see all template experiments (!private)
            $scope.running || // see all running experiment
            exp.owned
          ); // skip shared expriments if seeing private experiments
        };

        var loadExperiments = function(loadPrivateExperiments = false) {
          experimentsService = $scope.experimentsService = experimentsFactory.createExperimentsService(
            loadPrivateExperiments
          );
          experimentsService.initialize();
          experimentsService.experiments.then(null, null, function(
            experiments
          ) {
            $scope.experiments = experiments
              .filter(exp => exp.id != 'TemplateNew')
              .filter(visibleExperiment);

            if (experiments.length === 1) {
              $scope.pageState.selected = experiments[0].id;
            } else {
              if ($scope.running) {
                var total = 0;
                var firstExp = null;
                for (var exp in $scope.experiments) {
                  if ($scope.experiments[exp].joinableServers.length > 0) {
                    firstExp = $scope.experiments[exp];
                    total++;
                  }
                }
                if (total === 1) {
                  $scope.pageState.selected = firstExp.id;
                }
              }
            }
            if (experiments.length === 0) {
              $scope.experimentEmpty();
            }

            filterExperiments();
          });

          nrpUser.getCurrentUserInfo().then(function(userinfo) {
            $scope.userinfo = userinfo;
          });

          $scope.exploreExpFiles = function(experiment) {
            selectedSharedExperiment.setExperiment(experiment.id);
            $rootScope.$broadcast('explorer');
          };

          $scope.startNewExperiment = function(
            experiment,
            launchSingleMode,
            pizDaintJob,
            jobUrl,
            playbackRecording
          ) {
            storageServer.logActivity('simulation_start', {
              experiment: experiment.id
            });
            $scope.pageState.startingExperiment = experiment.id;
            experimentsService
              .startExperiment(
                experiment,
                launchSingleMode,
                nrpUser.getReservation(),
                playbackRecording
              )
              .then(
                function(path) {
                  $scope.tipTooltipService.hidden = true;
                  $location.path(path);
                }, // succeeded
                function() {
                  $scope.pageState.startingExperiment = null;
                  if (pizDaintJob) {
                    experimentsService
                      .getPizDaintJobOutcome(jobUrl)
                      .then(function(response) {
                        console.log('stdout:');
                        console.log(response[0]);
                        console.log('stderr:');
                        console.log(response[1]);
                      });
                  }
                }, // failed
                function(msg) {
                  $scope.progressMessage = msg;
                }
              ); //in progress
          };

          $scope.deleteExperiment = function(expName) {
            clbConfirm
              .open({
                title: 'Delete experiment?',
                confirmLabel: 'Yes',
                cancelLabel: 'No',
                template:
                  'Are you sure you would like to delete this experiment?',
                closable: true
              })
              .then(() => {
                $scope.pageState.deletingExperiment = true;
                experimentsService
                  .deleteExperiment(expName)
                  .then(() => {
                    return $scope.reinit();
                  })
                  .catch(err => {
                    err = {
                      type: 'Error while deleting experiment',
                      data: err.data,
                      message:
                        'Deleting experiment failed. The storage server might be unavailable',
                      code: err.statusText + ' ' + err.status
                    };
                    clbErrorDialog.open(err).then(() => {});
                  })
                  .finally(() => {
                    $scope.pageState.deletingExperiment = false;
                  });
              });
          };

          // Stop an already initialized or running experiment
          $scope.stopSimulation = function(simulation, experiment) {
            experimentsService.stopExperiment(simulation, experiment);
          };

          $scope.launchSharedExperimentWindow = function(expId) {
            experimentSelected = expId;
            nrpModalService.createModal({
              templateUrl:
                'components/experiment-sharing/experiment-sharing.template.html',
              closable: true,
              scope: $scope,
              size: 'lg',
              windowClass: 'modal-window'
            });
          };

          $scope.updateSharedExperimentMode = function() {
            storageServer
              .updateSharedExperimentMode(
                experimentSelected,
                $scope.model.experimentSharedMode
              )
              .catch(err =>
                console.error(
                  `Failed the updating of the shared-mode in the experiment :\n${err}`
                )
              );
          };

          $scope.selectedUserChange = function(search) {
            if ($scope.allUsers.includes(search.searchUser)) {
              storageServer
                .addSharedUsers(experimentSelected, search.searchUser)
                .then(() => {
                  search.searchUser = '';
                  return $scope.getSharedUsers();
                })
                .catch(err =>
                  console.error(
                    `Failed to add a shared user into the experiment :\n${err}`
                  )
                );
            }
          };

          $scope.searchUserChange = function(user) {
            return $scope.allUsers.filter(person =>
              String(person).startsWith(user)
            );
          };

          $scope.getSharedExperimentMode = function() {
            var url =
              bbpConfig.get('api.proxy.url') +
              '/storage/sharedvalue/' +
              experimentSelected;
            return $http
              .get(url)
              .then(
                response => ($scope.model.experimentSharedMode = response.data)
              )
              .catch(err =>
                console.error(
                  `Failed getting the shared-mode of the experiment:\n${err}`
                )
              );
          };

          $scope.getSharedUsers = function() {
            storageServer
              .getSharedUsers(experimentSelected)
              .then(users => {
                $scope.sharedUsers = [];
                users.forEach(user => $scope.sharedUsers.push({ name: user }));
              })
              .catch(err =>
                console.error(
                  `Failed getting the shared users of the experiment:\n${err}`
                )
              );
          };

          $scope.deleteSharedUser = function(user) {
            if ($scope.model.experimentSharedMode != ExperimentModeSharedOption)
              return;
            storageServer
              .deleteSharedUser(experimentSelected, user)
              .then(() => $scope.getSharedUsers())
              .catch(err =>
                console.error(`Failed deleting a shared user:\n${err}`)
              );
          };

          $scope.startReplay = function() {
            // Will be implemented in another story
          };

          $scope.deleteRecordFiles = function(record) {
            if (record.descriptionPath) {
              return Promise.all([
                storageServer.deleteFile(
                  record.expID,
                  record.descriptionPath,
                  true
                ),
                storageServer.deleteFile(record.expID, record.uuid)
              ]);
            } else return storageServer.deleteFile(record.uuid);
          };

          $scope.deleteRecord = function(record) {
            clbConfirm
              .open({
                title: 'Delete recording?',
                confirmLabel: 'Yes',
                cancelLabel: 'No',
                template:
                  'Are you sure you would like to delete this recording?',
                closable: true
              })
              .then(() => {
                $scope.pageState.deletingRecord = true;

                $scope
                  .deleteRecordFiles(record)
                  .then(() => {
                    $scope.updateRecordList(record.experiment);
                  })
                  .catch(err => {
                    err = {
                      type: 'Error while deleting recording',
                      data: err.data,
                      message:
                        'Deleting recording failed. The storage server might be unavailable',
                      code: err.statusText + ' ' + err.status
                    };
                    clbErrorDialog.open(err).then(() => {});
                  })
                  .finally(() => {
                    if (!record.descriptionPath)
                      $scope.pageState.deletingRecord = false;
                  });
              });
          };

          $scope.updateRecordList = function(exp) {
            $scope.pageState.loadingRecords = true;
            $scope.recordsList = [];

            storageServer
              .getExperimentFiles(exp.id)
              .then(files => {
                files.forEach(f => {
                  if (f.name == 'recordings') {
                    storageServer
                      .getExperimentFiles(f.uuid)
                      .then(records => {
                        records.forEach(f => {
                          if (f.name.split('.').pop() == 'zip') {
                            f.name = f.name.slice(0, -4);
                            f.experiment = exp;
                            f.description = 'Loading...';
                            f.showShortDescription = true;
                            f.expID = exp.id;
                            f.recordPath = 'recordings/' + f.name + '.zip';
                            $scope.recordsList.push(f);

                            let descriptionPath =
                              'recordings/' + f.name + '.txt';

                            storageServer
                              .getFileContent(exp.id, descriptionPath, true)
                              .then(result => {
                                f.description = result.data;
                                f.descriptionPath = descriptionPath;
                                if (result.data && result.data.length > 30)
                                  f.shortDescription =
                                    result.data.substring(0, 30) + '...';
                                else f.shortDescription = f.description;
                              })
                              .catch(() => {
                                f.description = 'Cannot load description...';
                              });
                          }
                        });
                      })
                      .finally(() => ($scope.pageState.loadingRecords = false));
                  }
                });
              })
              .catch(() => ($scope.pageState.loadingRecords = false));
          };

          $scope.toggleShowRecord = function(exp) {
            $scope.pageState.showRecords = !$scope.pageState.showRecords;
            $scope.pageState.showJoin = false;
            if ($scope.pageState.showRecords) {
              $scope.updateRecordList(exp);
            }
          };

          $scope.joinExperiment = function(simul, exp) {
            var path =
              'esv-private/experiment-view/' +
              simul.server +
              '/' +
              exp.id +
              '/' +
              environmentService.isPrivateExperiment() +
              '/' +
              simul.runningSimulation.simulationID;
            $scope.tipTooltipService.hidden = true;
            $location.path(path);
          };

          $scope.$on('$destroy', function() {
            experimentsService.destroy();
          });
        };
        loadExperiments($scope.private);
        $scope.selectExpFromFileExplorer();
      }
    ]);
})();
