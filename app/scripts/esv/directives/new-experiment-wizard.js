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
    'clbConfirm',
    'environmentService',
    'nrpUser',
    function(
      $q,
      $window,
      storageServer,
      nrpModalService,
      clbErrorDialog,
      $http,
      newExperimentProxyService,
      $stateParams,
      $timeout,
      clbConfirm,
      environmentService,
      nrpUser
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
          $scope.paths = {};
          nrpUser
            .getOwnerDisplayName('me')
            .then(owner => ($scope.owner = owner));

          var RobotUploader = {
            name: 'Robot',
            uploadFromTemplates: function() {
              delete $scope.entities;
              newExperimentProxyService
                .getTemplateModels('robots')
                .then(robots => {
                  $scope.entities = $scope
                    .parseEntityList(robots.data)
                    .map(r => {
                      r.configpath = `${newExperimentProxyService.getModelUrl(
                        'robots'
                      )}/${r.id}/config`;
                      return r;
                    });
                });
              $scope.createUploadModal('PrivateStorage');
            },
            uploadFromPrivateStorage: (customModel = undefined) => {
              delete $scope.entities;
              storageServer
                .getCustomModels('robots')
                .then(robots => {
                  robots.map(robot => {
                    robot.path = decodeURIComponent(robot.path);
                    robot.custom = true;
                  });
                  $scope.entities = $scope.parseEntityList(robots).map(r => {
                    r.configpath = window.encodeURIComponent(
                      `${storageServer.STORAGE_BASE_URL}/custommodelconfig/${window.encodeURIComponent(
                        r.path
                      )}`
                    );
                    return r;
                  });

                  if (customModel) {
                    let selectedModel = {};
                    selectedModel = robots.filter(item =>
                      item.fileName.includes(customModel)
                    )[0];
                    $scope.selectEntity(selectedModel);
                  }
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
                    selectedModel = environments.filter(item =>
                      item.fileName.includes(customModel)
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
            uploadFromPrivateStorage: (customModel = undefined) => {
              delete $scope.entities;
              storageServer
                .getCustomModels('brains')
                .then(brains => {
                  brains.map(brain => {
                    brain.path = decodeURIComponent(brain.path);
                    brain.custom = true;
                  });
                  $scope.entities = $scope.parseEntityList(brains);
                  if (customModel) {
                    let selectedModel = {};
                    selectedModel = brains.filter(item =>
                      item.fileName.includes(customModel)
                    )[0];
                    $scope.selectEntity(selectedModel);
                  }
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
                custom: selectedEntity.custom ? selectedEntity.custom : false,
                name: selectedEntity.name
              };
              $scope.environmentUploaded = true;
              $scope.selectedEnvironment = selectedEntity;
            }
            if ($scope.entityName.startsWith('Robot')) {
              $scope.paths.robotPath = {
                path: selectedEntity.path,
                custom: selectedEntity.custom ? selectedEntity.custom : false,
                name: selectedEntity.name
              };
              $scope.robotUploaded = true;
              $scope.selectedRobot = selectedEntity;
            }
            if ($scope.entityName.startsWith('Brain')) {
              $scope.paths.brainPath = {
                path: selectedEntity.path,
                custom: selectedEntity.custom ? selectedEntity.custom : false,
                name: selectedEntity.name
              };
              $scope.brainUploaded = true;
              $scope.selectedBrain = selectedEntity;
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

          $scope.checkIfAppendExistsModelCustom = function(
            customModelFound,
            filename
          ) {
            if (customModelFound[0].userId == $scope.owner) {
              return clbConfirm
                .open({
                  title: `One of your custom models already has the name: ${filename}`,
                  confirmLabel: 'Yes',
                  cancelLabel: 'No',
                  template:
                    'Are you sure you would like to upload the file again?',
                  closable: true
                })
                .catch(() => $q.resolve());
            } else {
              clbErrorDialog.open({
                type: `A Custom Model already exists with the name ${filename}`,
                message: 'The experiment already exists'
              });
              return $q.reject();
            }
          };
          $scope.existsModelCustom = function(customModels, filename) {
            var customModelFound = customModels.filter(customModel =>
              customModel.fileName.includes(filename)
            );
            if (customModelFound.length) {
              return $scope.checkIfAppendExistsModelCustom(
                customModelFound,
                filename
              );
            }
            return $q.resolve();
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
                  storageServer
                    .getAllCustomModels((entityType + 's').toLowerCase())
                    .then(customModels => {
                      return $scope
                        .existsModelCustom(customModels, filename)
                        .then(() => {
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
                                zip.name
                              );
                            })
                            .finally(() => ($scope.uploadingModel = false));
                        });
                    });
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
            $scope.entityPageState.selected = entity;
          };

          $scope.createUploadModal = function() {
            if (
              $scope.entityName == 'Environment' &&
              $scope.selectedEnvironment
            ) {
              $scope.selectEntity($scope.selectedEnvironment);
            }
            if ($scope.entityName == 'Brain' && $scope.selectedBrain) {
              $scope.selectEntity($scope.selectedBrain);
            }
            if ($scope.entityName == 'Robot' && $scope.selectedRobot) {
              $scope.selectEntity($scope.selectedRobot);
            }
            nrpModalService.createModal({
              templateUrl: 'views/esv/entities-list.html',
              closable: true,
              scope: $scope,
              size: 'lg',
              windowClass: 'modal-window'
            });
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

          $scope.parseEntityList = entityArray =>
            entityArray.map(entity => {
              return {
                id: entity.id,
                path: entity.path ? entity.path : undefined,
                name: entity.name,
                custom: entity.custom ? entity.custom : false,
                description: entity.description,
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
