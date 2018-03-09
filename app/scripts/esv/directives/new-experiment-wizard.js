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
    '$window',
    'storageServer',
    'nrpModalService',
    'clbErrorDialog',
    '$http',
    'newExperimentProxyService',
    '$stateParams',
    '$timeout',
    function(
      $q,
      $window,
      storageServer,
      nrpModalService,
      clbErrorDialog,
      $http,
      newExperimentProxyService,
      $stateParams,
      $timeout
    ) {
      return {
        templateUrl: 'views/esv/new-experiment-wizard.html',
        restrict: 'E',
        replace: false,
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
          $scope.newExperimentPath = '.templateEmpty/TemplateEmpty.exc';

          var RobotUploader = {
            name: 'Robot',
            uploadFromTemplates: function() {
              delete $scope.entities;
              newExperimentProxyService
                .getTemplateModels('robots')
                .then(robots => {
                  $scope.entities = $scope.parseEntityList(robots.data);
                });
              $scope.createUploadModal('PrivateStorage');
            },
            uploadFromPrivateStorage: () => {
              delete $scope.entities;
              storageServer
                .getCustomModels('robots')
                .then(robots => {
                  robots.map(
                    robot => (robot.path = decodeURIComponent(robot.path))
                  );
                  $scope.entities = $scope.parseEntityList(robots);
                })
                .catch(err => {
                  $scope.createErrorPopup(err);
                  nrpModalService.destroyModal();
                });
              $scope.createUploadModal('PrivateStorage');
            }
          };

          var EnvUploader = {
            name: 'Environment',
            uploadFromTemplates: function() {
              delete $scope.entities;
              newExperimentProxyService
                .getTemplateModels('environments')
                .then(envs => {
                  $scope.entities = $scope.parseEntityList(envs.data);
                });
              $scope.createUploadModal('PrivateStorage');
            },
            uploadFromPrivateStorage: function(customModel = undefined) {
              delete $scope.entities;
              storageServer
                .getCustomModels('environments')
                .then(environments => {
                  environments.map(env => {
                    env.path = decodeURIComponent(env.path);
                    env.custom = true;
                  });
                  $scope.entities = $scope.parseEntityList(environments);
                  if (customModel) {
                    let selectedModel = {};
                    selectedModel.id = environments.filter(item =>
                      item.path.includes(customModel)
                    )[0];
                    $scope.selectEntity(selectedModel);
                  }
                })
                .catch(error => {
                  $scope.createErrorPopup(error);
                  nrpModalService.destroyModal();
                });
              $scope.createUploadModal('PrivateStorage');
            }
          };

          var BrainUploader = {
            name: 'Brain',
            uploadFromTemplates: () => {
              delete $scope.entities;
              newExperimentProxyService
                .getTemplateModels('brains')
                .then(brains => {
                  $scope.entities = $scope.parseEntityList(brains.data);
                });
              $scope.createUploadModal('PrivateStorage');
            },
            uploadFromPrivateStorage: () => {
              delete $scope.entities;
              storageServer
                .getCustomModels('brains')
                .then(brains => {
                  brains.map(
                    brain => (brain.path = decodeURIComponent(brain.path))
                  );
                  $scope.entities = $scope.parseEntityList(brains);
                })
                .catch(err => {
                  $scope.createErrorPopup(err);
                  nrpModalService.destroyModal();
                });
              $scope.createUploadModal('PrivateStorage');
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
            PrivateStorage: 'uploadFromPrivateStorage'
          };

          $scope.uploadEntity = function(environment) {
            $scope.entityUploader[dict[environment]]();
          };

          $scope.completeUploadEntity = function(selectedEntity) {
            if ($scope.entityName.startsWith('Environment')) {
              $scope.paths.environmentPath = {
                path: selectedEntity.path,
                custom: selectedEntity.custom ? selectedEntity.custom : false
              };
              $scope.environmentUploaded = true;
            }
            if ($scope.entityName.startsWith('Robot')) {
              $scope.paths.robotPath = {
                path: selectedEntity.path,
                custom: selectedEntity.custom ? selectedEntity.custom : false
              };
              $scope.robotUploaded = true;
            }
            if ($scope.entityName.startsWith('Brain')) {
              $scope.paths.brainPath = {
                path: selectedEntity.path,
                custom: selectedEntity.custom ? selectedEntity.custom : false
              };
              $scope.brainUploaded = true;
            }
            $scope.destroyDialog();
          };

          $scope.uploadFileClick = function(entityType) {
            var input = $(
              '<input type="file" style="display:none;" accept:".zip">'
            );
            document.body.appendChild(input[0]);
            input.on('change', e =>
              $scope.uploadModelZip(e.target.files[0], entityType)
            );
            input.click();
            $(window).one('focus', () => {
              if (input[0].files.length) $scope.uploadingModel = true;
            });
            document.body.removeChild(input[0]);
          };

          $scope.uploadModelZip = function(zip, entityType) {
            $scope.destroyDialog();
            return $timeout(() => {
              if (zip.type !== 'application/zip') {
                $scope.createErrorPopup(
                  'The file you uploaded is not a zip. Please provide a zipped model'
                );
                return $q.reject();
              }
              return $q(resolve => {
                let textReader = new FileReader();
                textReader.onload = e => resolve([zip.name, e.target.result]);
                textReader.readAsArrayBuffer(zip);
              })
                .then(([filename, filecontent]) => {
                  return storageServer
                    .setCustomModel(
                      filename,
                      (entityType += 's').toLowerCase(),
                      filecontent
                    )
                    .catch(err => {
                      $scope.destroyDialog();
                      $scope.createErrorPopup(err.data);
                      return $q.reject(err);
                    })
                    .then(() => {
                      $scope.entityName = entityType;
                      return $scope.entityUploader.uploadFromPrivateStorage(
                        filename
                      );
                    })
                    .finally(() => ($scope.uploadingModel = false));
                })
                .catch(() => {
                  $scope.uploadingModel = false;
                  $scope.destroyDialog();
                })
                .finally(() => ($scope.uploadingModel = false));
            }, 1000);
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

          $scope.createUploadModal = function() {
            nrpModalService.createModal({
              templateUrl: 'views/esv/entities-list.html',
              closable: true,
              scope: $scope,
              size: 'lg',
              windowClass: 'modal-window'
            });
          };

          $scope.createEntitiesListFromBrainFiles = brainFiles =>
            $q.all(
              brainFiles.map(brain =>
                storageServer.getFileContent(brain.uuid).then(
                  resp =>
                    resp && {
                      name: brain.name.split('.')[0],
                      id: brain.name.split('.')[0],
                      description:
                        resp.data.match(/^"""([^"]*)"""/m)[1].trim() ||
                        'Brain description'
                    }
                )
              )
            );

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

          $scope.parseEntityList = entityArray =>
            entityArray.map(entity => {
              return {
                path: entity.path ? entity.path : undefined,
                name: entity.name,
                custom: entity.custom ? entity.custom : false,
                description: entity.description,
                id: entity,
                thumbnail: entity.thumbnail
              };
            });

          $scope.cloneNewExperiment = function() {
            $scope.isCloneRequested = true;
            storageServer
              .cloneNew($scope.paths, $stateParams.ctx)
              .then(() => $window.location.reload())
              .catch(err => $scope.createErrorPopup(err.data))
              .finally(() => ($scope.isCloneRequested = false));
          };
        }
      };
    }
  ]);
})();
