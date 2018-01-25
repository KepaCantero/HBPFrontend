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

  angular.module('exdFrontendApp').directive('newExperimentWizard', [
    '$q',
    'storageServer',
    'nrpModalService',
    'clbErrorDialog',
    '$http',
    'newExperimentProxyService',
    '$window',
    '$stateParams',
    function(
      $q,
      storageServer,
      nrpModalService,
      clbErrorDialog,
      $http,
      newExperimentProxyService,
      $window
    ) {
      return {
        templateUrl: 'views/esv/new-experiment-wizard.html',
        restrict: 'E',
        replace: true,
        scope: true, // create a child scope for the directive and inherits the parent scope properties
        link: function($scope) {
          $scope.query = '';
          $scope.entities = null;
          $scope.entityPageState = {};
          $scope.brainUploaded = false;
          $scope.robotUploaded = false;
          $scope.environmentUploaded = false;
          $scope.newExperiment = 'newExperiment';
          $scope.experimentCloned = false;
          //object containing the path to the robot,env, brain
          //looks like : {
          // robotPath: 'icub_model/icub.sdf'
          // environmentPath: 'virtual_room/vitual_room.sdf'
          // brainPath: 'brain_models/braitenberg.py'
          //}
          $scope.paths = {};

          var RobotUploader = {
            name: 'Robot',
            uploadFromTemplates: function() {
              delete $scope.entities;
              newExperimentProxyService
                .getTemplateModels('robots')
                .then(function(robotsArray) {
                  $scope.entities = $scope.parseEntityList(robotsArray);
                });
              $scope.createUploadModal('PrivateStorage');
            },
            uploadFromPrivateStorage: function() {
              delete $scope.entities;
              storageServer.getCustomModels('robots').then(
                function(robots) {
                  robots.map(function(robot) {
                    robot.id = robot.name;
                  });
                  $scope.entities = robots;
                },
                function(error) {
                  $scope.createErrorPopup(error);
                  nrpModalService.destroyModal();
                }
              );

              $scope.createUploadModal('PrivateStorage');
            },
            uploadFromLocalEnv: function() {
              $scope.entityName = $scope.entityUploader.name;
              $scope.createUploadModal('LocalEnv');
            }
          };

          var EnvUploader = {
            name: 'Environment',
            uploadFromTemplates: function() {
              delete $scope.entities;
              newExperimentProxyService
                .getTemplateModels('environments')
                .then(function(envsArray) {
                  $scope.entities = $scope.parseEntityList(envsArray);
                });
              $scope.createUploadModal('PrivateStorage');
            },
            uploadFromPrivateStorage: function() {
              delete $scope.entities;
              storageServer.getCustomModels('environments').then(
                function(environments) {
                  environments.map(function(env) {
                    env.id = env.name;
                  });
                  $scope.entities = environments;
                },
                function(error) {
                  $scope.createErrorPopup(error);
                  nrpModalService.destroyModal();
                }
              );
              $scope.createUploadModal('PrivateStorage');
            },
            uploadFromLocalEnv: function() {
              $scope.entityName = $scope.entityUploader.name;
              $scope.createUploadModal('LocalEnv');
            }
          };

          var BrainUploader = {
            name: 'Brain',
            uploadFromTemplates: function() {
              delete $scope.entities;
              newExperimentProxyService
                .getTemplateModels('brains')
                .then(function(brainsArray) {
                  $scope.entities = $scope.parseEntityList(brainsArray);
                });
              $scope.createUploadModal('PrivateStorage');
            },
            uploadFromPrivateStorage: function() {
              delete $scope.entities;
              storageServer.getCustomModels('brains').then(
                function(brains) {
                  brains.map(function(brain) {
                    brain.id = brain.name;
                  });
                  $scope.entities = brains;
                },
                function(error) {
                  $scope.createErrorPopup(error);
                  nrpModalService.destroyModal();
                }
              );
              $scope.createUploadModal('PrivateStorage');
            },
            uploadFromLocalEnv: function() {
              $scope.entityName = $scope.entityUploader.name;
              $scope.createUploadModal('LocalEnv');
            }
          };

          $scope.selectNewExperiment = function() {
            $scope.pageState.selected = $scope.newExperiment;
          };

          $scope.uploadEntityDialog = function(entityUploader) {
            $scope.entityUploader = entityUploader;
            $scope.entityName = entityUploader.name;
            var templateUrl = {
              templateUrl: 'views/esv/entity-upload-dialog.html',
              closable: true,
              scope: $scope
            };
            nrpModalService.createModal(templateUrl);
          };

          $scope.uploadRobotDialog = function() {
            $scope.uploadEntityDialog(RobotUploader);
          };

          $scope.uploadEnvironmentDialog = function() {
            $scope.uploadEntityDialog(EnvUploader);
          };

          $scope.uploadBrainDialog = function() {
            $scope.uploadEntityDialog(BrainUploader);
          };

          var dict = {
            PublicEnv: 'uploadFromTemplates',
            PrivateStorage: 'uploadFromPrivateStorage',
            LocalEnv: 'uploadFromLocalEnv'
          };

          $scope.uploadEntity = function(environment) {
            $scope.entityUploader[dict[environment]]();
          };

          $scope.completeUploadEntity = function(selectedEntity) {
            if (selectedEntity.path.match('/')) {
              var entityType = selectedEntity.path.split('/')[0];
              if (entityType === 'environments') {
                $scope.paths.environmentPath = _.join(
                  _.drop(selectedEntity.path.split('/')),
                  '/'
                );
                $scope.environmentUploaded = true;
              }
              if (entityType === 'robots') {
                $scope.paths.robotPath = _.join(
                  _.drop(selectedEntity.path.split('/')),
                  '/'
                );
                $scope.robotUploaded = true;
              }
              if (entityType === 'brains') {
                $scope.paths.brainPath = _.join(
                  _.drop(selectedEntity.path.split('/')),
                  '/'
                );
                $scope.brainUploaded = true;
              }
            } else {
              //code to handle other OS. For now create an error createErrorPopup
              $scope.createErrorPopup(
                'The provided path cannot be handled by the operating system'
              );
            }
            $scope.destroyDialog();
          };

          $scope.destroyDialog = function() {
            $scope.entityPageState = {};
            $scope.entityName = '';
            delete $scope.entities;
            nrpModalService.destroyModal();
          };

          $scope.selectEntity = function(entity) {
            $scope.entityPageState.selected = entity.id;
          };

          $scope.createUploadModal = function(mode) {
            if (mode === 'LocalEnv') {
              var templateUrl = {
                templateUrl: 'views/esv/entity-local-environment-upload.html',
                closable: true,
                scope: $scope
              };
              nrpModalService.createModal(templateUrl);
            } else if (mode === 'PrivateStorage') {
              nrpModalService.createModal({
                templateUrl: 'views/esv/entities-list.html',
                closable: true,
                scope: $scope,
                size: 'lg',
                windowClass: 'modal-window'
              });
            }
          };

          $scope.createEntitiesListFromBrainFiles = function(brainFiles) {
            return $q.all(
              brainFiles.map(function(brain) {
                return storageServer
                  .getFileContent(brain.uuid)
                  .then(function(resp) {
                    return {
                      name: brain.name.split('.')[0],
                      id: brain.name.split('.')[0],
                      description:
                        resp.data.match(/^"""([^"]*)"""/m)[1].trim() ||
                        'Brain description'
                    };
                  });
              })
            );
          };

          $scope.createErrorPopup = function(errorMessage) {
            clbErrorDialog.open({
              type: 'Error.',
              message: errorMessage
            });
          };

          $scope.retrieveImageFileContent = function(fileid) {
            return storageServer
              .getBase64Content(fileid)
              .then(file => file.data);
          };

          $scope.retrieveConfigFileContent = function(fileid) {
            return storageServer.getFileContent(fileid).then(function(file) {
              var xml = $.parseXML(file.data);
              return $q.resolve({
                name: xml.getElementsByTagNameNS('*', 'name')[0].textContent,
                desc: xml.getElementsByTagNameNS('*', 'description')[0]
                  .textContent
              });
            });
          };

          $scope.parseEntityList = function(entityArray) {
            var entities = [];
            entityArray.data.forEach(function(entity) {
              entities.push({
                name: entity.name,
                description: entity.description,
                id: entity,
                thumbnail: entity.thumbnail
              });
            });
            return entities;
          };

          $scope.cloneNewExperiment = function(experimentID) {
            //prevent warning: to remove once code commented has been merged
            $window, experimentID;
            $scope.isCloneRequested = true;
            // collabConfigService.clone(
            //   { experimentId: experimentID },
            //   {
            //     experimentID: experimentID,
            //     brainPath: $scope.paths.brainPath,
            //     robotPath: $scope.paths.robotPath,
            //     envPath: $scope.paths.environmentPath
            //   },
            //  function() {
            //    $window.location.reload();
            //    $window.parent.postMessage(
            //      {
            //        eventName: 'navigation.reload'
            //      },
            //      '*'
            //    );
            //  }
            // );
          };
        }
      };
    }
  ]);
})();
