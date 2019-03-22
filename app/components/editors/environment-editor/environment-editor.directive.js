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

/* global THREE: false */
/* global GZ3D: false */

(function() {
  'use strict';

  angular.module('exdFrontendApp.Constants').constant('EDIT_MODE', {
    VIEW: 'view',
    NATURAL: 'natural',
    TRANSLATE: 'translate',
    ROTATE: 'rotate',
    SCALE: 'scale'
  });

  angular.module('exdFrontendApp').directive('environmentDesigner', [
    'STATE',
    'EDIT_MODE',
    'TOOL_CONFIGS',
    'panels',
    'simulationSDFWorld',
    'gz3d',
    'stateService',
    'simulationInfo',
    'clbErrorDialog',
    'downloadFileService',
    'environmentService',
    'goldenLayoutService',
    '$http',
    'newExperimentProxyService',
    '$q',
    'storageServer',
    'backendInterfaceService',
    '$rootScope',
    'clbConfirm',
    'nrpModalService',
    'nrpUser',
    function(
      STATE,
      EDIT_MODE,
      TOOL_CONFIGS,
      panels,
      simulationSDFWorld,
      gz3d,
      stateService,
      simulationInfo,
      clbErrorDialog,
      downloadFileService,
      environmentService,
      goldenLayoutService,
      $http,
      newExperimentProxyService,
      $q,
      storageServer,
      backendInterfaceService,
      $rootScope,
      clbConfirm,
      nrpModalService,
      nrpUser
    ) {
      return {
        templateUrl:
          'components/editors/environment-editor/environment-editor.template.html',
        restrict: 'E',
        link: function(scope) {
          scope.stateService = stateService;
          scope.STATE = STATE;

          document.addEventListener('contextmenu', event =>
            event.preventDefault()
          );

          var serverConfig = simulationInfo.serverConfig;
          // Used by the view
          scope.assetsPath = serverConfig.gzweb.assets;
          scope.EDIT_MODE = EDIT_MODE;
          scope.gz3d = gz3d;

          scope.isPrivateExperiment = environmentService.isPrivateExperiment();
          scope.isSavingToCollab = false;
          scope.categories = [];
          scope.physicsEngine = simulationInfo.experimentDetails.physicsEngine;
          nrpUser
            .getOwnerDisplayName('me')
            .then(owner => (scope.owner = owner));

          scope.updateVisibleModels = function() {
            scope.visibleModels = [];

            for (var i = 0; i < scope.categories.length; i++) {
              var cat = scope.categories[i];

              if (cat.visible) {
                for (var j = 0; j < cat.models.length; j++) {
                  cat.models[j].color = cat.color['default'];
                  scope.visibleModels.push(cat.models[j]);
                }
              }
            }
          };

          scope.toggleVisibleCategory = function(category) {
            category.visible = !category.visible;
            scope.updateVisibleModels();
          };

          scope.isCategoryVisible = function(category) {
            const categoryFound = scope.categories.find(
              cat => cat.title === category
            );
            return !!categoryFound && categoryFound.visible;
          };

          scope.checkIfAppendExistsModelCustom = function(
            customModelFound,
            filename
          ) {
            if (customModelFound[0].userId == scope.owner) {
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
                message:
                  'The model you tried to upload already exists in the database. Rename it and try uploading it again.'
              });
              return $q.reject();
            }
          };

          scope.existsModelCustom = function(customModels, filename) {
            var customModelFound = customModels.filter(customModel =>
              customModel.fileName.includes(filename)
            );
            if (customModelFound.length)
              scope.checkIfAppendExistsModelCustom(customModelFound, filename);
            return $q.resolve();
          };

          scope.createErrorPopup = function(errorMessage) {
            clbErrorDialog.open({
              type: 'Error.',
              message: errorMessage
            });
          };

          scope.uploadModelZip = function(zip, entityType) {
            if (zip.type !== 'application/zip') {
              clbErrorDialog.open({
                type: 'Error.',
                message:
                  'The file you uploaded is not a zip. Please provide a zipped model'
              });
              return $q.reject();
            }
            return $q(resolve => {
              let textReader = new FileReader();
              textReader.onload = e => resolve([zip.name, e.target.result]);
              textReader.readAsArrayBuffer(zip);
            }).then(([filename, filecontent]) => {
              storageServer.getAllCustomModels(entityType).then(customModels =>
                scope.existsModelCustom(customModels, filename).then(() =>
                  storageServer
                    .setCustomModel(filename, entityType, filecontent)
                    .catch(err => {
                      nrpModalService.destroyModal();
                      scope.createErrorPopup(err.data);
                      return $q.reject(err);
                    })
                    .then(() => scope.regenerateModels())
                    .finally(() => (scope.uploadingModel = false))
                )
              );
            });
          };

          scope.uploadModel = function(modelType /*i.e. Robot , Brain*/) {
            var input = $(
              '<input type="file" style="display:none;" accept:".zip">'
            );
            document.body.appendChild(input[0]);
            input.on('change', e =>
              scope.uploadModelZip(e.target.files[0], modelType)
            );
            input.click();
            input.on('change', () => {
              if (
                input[0].files.length &&
                input[0].files[0].type === 'application/zip'
              )
                scope.uploadingModel = true;
            });
            document.body.removeChild(input[0]);
          };

          scope.generateModels = function(modelType) {
            return $q.all([
              newExperimentProxyService.getTemplateModels(modelType),
              storageServer.getCustomModels(modelType)
            ]);
          };

          scope.generateModel = function(category) {
            if (category === 'Robots') {
              return scope.generateRobotsModels();
            } else if (category === 'Brains') {
              return scope.generateBrainsModels();
            }
            return $q.reject('Unhandled Category');
          };

          scope.regenerateModels = function() {
            let promises = [];
            ['Robots', 'Brains'].forEach(category => {
              const modelCategory = scope.categories.find(
                cat => cat.title === category
              );
              if (modelCategory) {
                promises.push(
                  scope.generateModel(modelCategory.title).then(res => {
                    modelCategory.models = res;
                    scope.updateVisibleModels();
                  })
                );
              }
            });
            return $q.all(promises);
          };

          scope.generateRobotsModels = function() {
            return scope
              .generateModels('robots')
              .then(([templateRobots, customRobots]) => {
                templateRobots.data.forEach(robot => (robot.public = true));
                customRobots.forEach(robot => (robot.custom = true));
                return [...templateRobots.data, ...customRobots].map(robot => {
                  return {
                    configPath: robot.configPath,
                    modelPath: robot.id,
                    path: robot.path && decodeURIComponent(robot.path),
                    modelSDF: robot.sdf,
                    modelTitle: robot.name,
                    thumbnail: robot.thumbnail,
                    custom: robot.custom,
                    public: robot.public,
                    isRobot: true,
                    description: robot.description
                      ? robot.description
                      : 'Robot has no description'
                  };
                });
              })
              .catch(err =>
                clbErrorDialog.open({
                  type: 'Model libraries error.',
                  message: `Could not retrieve robots models: \n${err}`
                })
              );
          };

          scope.generateBrainsModels = function() {
            return scope
              .generateModels('brains')
              .then(([templateBrains, customBrains]) => {
                templateBrains.data.forEach(brain => (brain.public = true));
                customBrains.forEach(brain => (brain.custom = true));
                return [...templateBrains.data, ...customBrains].map(brain => ({
                  configPath: brain.configPath,
                  path: brain.path && decodeURIComponent(brain.path),
                  modelPath: brain.id,
                  modelTitle: brain.name,
                  thumbnail: brain.thumbnail,
                  custom: brain.custom,
                  public: brain.public,
                  isBrain: true,
                  script: brain.script,
                  description: brain.description
                    ? brain.description
                    : 'Brain has no description'
                }));
              })
              .catch(err =>
                clbErrorDialog.open({
                  type: 'Model libraries error.',
                  message: `Could not retrieve brains models: \n${err}`
                })
              );
          };

          const modelLibrary = scope.assetsPath + '/' + gz3d.MODEL_LIBRARY;
          $http.get(modelLibrary).then(function(res) {
            scope.categories = res.data;
            $q
              .all([scope.generateRobotsModels(), scope.generateBrainsModels()])
              .then(([robots, brains]) => {
                let robotCategory = {
                  thumbnail: 'robots.png',
                  title: 'Robots',
                  models: robots
                };
                scope.categories.push(robotCategory);
                GZ3D.modelList.push(robotCategory);
                let brainCategory = {
                  thumbnail: 'brain.png',
                  title: 'Brains',
                  models: brains
                };
                scope.categories.push(brainCategory);
              })
              .finally(() => {
                scope.createModelsCategories();
                scope.updateVisibleModels();
              });
          });

          scope.createModelsCategories = function() {
            for (var i = 0; i < scope.categories.length; i++) {
              scope.categories[i].models = scope.categories[i].models.filter(
                m => !m.physicsIgnore || m.physicsIgnore !== scope.physicsEngine
              );

              scope.categories[i].visible = i === 0;
              scope.categories[i].colorMode = 'default';
              scope.categories[i].color = {};
              scope.categories[i].color.default =
                'hsl(' +
                (10 + i / (scope.categories.length + 1) * 360.0) +
                ',95%,87%)';
              scope.categories[i].color.mouseover =
                'hsl(' +
                (10 + i / (scope.categories.length + 1) * 360.0) +
                ',80%,90%)'; // Mouse over
              scope.categories[i].color.mousedown =
                'hsl(' +
                (10 + i / (scope.categories.length + 1) * 360.0) +
                ',100%,70%)'; // Mouse down
            }
          };

          scope.setEditMode = function(mode) {
            var setMode = function(m) {
              gz3d.scene.setManipulationMode(m);
              panels.close();
            };

            if (gz3d.scene.manipulationMode === mode) {
              panels.close();
              return;
            } else {
              switch (mode) {
                case EDIT_MODE.VIEW:
                  setMode(mode);
                  break;
                case EDIT_MODE.TRANSLATE:
                case EDIT_MODE.ROTATE:
                  stateService.ensureStateBeforeExecuting(
                    STATE.PAUSED,
                    function() {
                      setMode(mode);
                    }
                  );
                  break;
              }
            }
          };

          scope.onModelMouseDown = (event, model) => {
            event.preventDefault();
            if (model.isBrain) scope.addBrain(model);
            else if (model.isRobot) {
              if (model.custom) {
                backendInterfaceService
                  .getCustomRobot(model.path.split('/')[1])
                  .then(() => {
                    scope.addRobot(model);
                  });
              } else scope.addRobot(model);
            } else scope.addModel(model);
          };

          scope.addModel = function(model) {
            if (stateService.currentState !== STATE.INITIALIZED) {
              window.guiEvents.emit(
                'spawn_entity_start',
                model.modelPath,
                model.modelSDF
              );
            }
          };

          scope.addRobot = model => {
            if (stateService.currentState !== STATE.INITIALIZED) {
              // manually trigger view mode
              gz3d.scene.setManipulationMode('view');

              gz3d.gui.spawnState = 'START';
              gz3d.scene.spawnModel.start(
                model.modelPath,
                model.modelSDF,
                model.modelTitle,
                obj => {
                  let pose = {
                    x: obj.position.x,
                    y: obj.position.y,
                    z: obj.position.z,
                    roll: obj.rotation.x,
                    pitch: obj.rotation.y,
                    yaw: obj.rotation.z
                  };
                  let robotID = obj.name.toLowerCase().replace(/ /gi, '_');
                  let onCreateCallback = model => {
                    if (model.name === robotID) {
                      gz3d.scene.selectEntity(model);
                      goldenLayoutService.openTool(
                        TOOL_CONFIGS.OBJECT_INSPECTOR
                      );
                    }

                    let callbackIndex = gz3d.iface.onCreateEntityCallbacks.indexOf(
                      onCreateCallback
                    );
                    gz3d.iface.onCreateEntityCallbacks.splice(callbackIndex, 1);
                  };
                  gz3d.iface.addOnCreateEntityCallbacks(onCreateCallback);

                  let robotRelativePath;
                  let isCustom = model.custom ? 'True' : 'False';
                  if (model.custom) {
                    robotRelativePath = model.path.split('/')[1];
                  } else {
                    robotRelativePath = model.modelPath + '/' + model.modelSDF;
                  }
                  backendInterfaceService.addRobot(
                    robotID,
                    robotRelativePath,
                    pose,
                    isCustom
                  );
                }
              );
            }
          };

          function parseBrainError(error) {
            const regex = /transfer\s*Function/gim;
            const matches = regex.exec(error.data.error_message);
            if (matches)
              return 'Some of the transfer functions are referencing variables from the old brain script.\
               Please remove these transfer functions to activate the brain script';
            else return error.data.error_message;
          }

          scope.addBrain = model => {
            // There might not be a brain so we first check the storage
            let brainExistsPromise;
            return storageServer
              .getBrain(simulationInfo.experimentID)
              .then(res => {
                // Ask user to confirm brain replacement if brain already there
                if (res.brain) {
                  brainExistsPromise = clbConfirm.open({
                    title: 'Replace brain?',
                    confirmLabel: 'Yes',
                    cancelLabel: 'No',
                    template:
                      'Are you sure you would like to change the brain script? \
                If populations in the existing script are referenced in the transfer functions \
                you might have to delete them.',
                    closable: true
                  });
                } else {
                  brainExistsPromise = $q.resolve();
                }
                return (
                  brainExistsPromise
                    // Try to set the brain in the backend
                    .then(() =>
                      backendInterfaceService
                        .setBrain('py', 'text', model.script, {})
                        // If something goes wrong (most likely existing TFs referring to the brain script) open an error dialog
                        .catch(err =>
                          clbErrorDialog.open({
                            type: 'Error while setting brain.',
                            message: parseBrainError(err)
                          })
                        )
                        // Even if something goes wrong, go ahead and save the brain in the storage as well
                        .finally(() =>
                          storageServer
                            .saveBrain(
                              simulationInfo.experimentID,
                              model.script,
                              {},
                              true,
                              model.modelPath
                            )
                            // Upon success, open the brain editor
                            .then(() => {
                              goldenLayoutService.openTool(
                                TOOL_CONFIGS.BRAIN_EDITOR
                              );
                              $rootScope.$broadcast('BRAIN_SCRIPT_UPDATED');
                            })
                        )
                    )
                );
              });
          };

          scope.onEntityCreated = modelCreated => {
            gz3d.scene.selectEntity(modelCreated);
            goldenLayoutService.openTool(TOOL_CONFIGS.OBJECT_INSPECTOR);
          };
          gz3d.iface.gui.emitter.on('entityCreated', scope.onEntityCreated);

          scope.deleteModel = function() {
            gz3d.gui.guiEvents.emit('delete_entity');
          };

          scope.duplicateModel = function() {
            gz3d.gui.guiEvents.emit('duplicate_entity');
          };

          scope.exportSDFWorld = function() {
            simulationSDFWorld(simulationInfo.serverBaseUrl).export(
              { simId: simulationInfo.simulationID },
              function(data) {
                var linkHref =
                  'data:text/xml;charset=utf-8,' + encodeURIComponent(data.sdf);
                downloadFileService.downloadFile(linkHref, 'world.sdf');
              }
            );
          };

          scope.saveSDFIntoCollabStorage = () => {
            scope.isSavingToCollab = true;

            simulationSDFWorld(simulationInfo.serverBaseUrl).save(
              { simId: simulationInfo.simulationID },
              {},
              () => (scope.isSavingToCollab = false),
              () => {
                clbErrorDialog.open({
                  type: 'BackendError.',
                  message: 'Error while saving SDF to the Storage.'
                });
                scope.isSavingToCollab = false;
              }
            );
          };
        }
      };
    }
  ]);
})();
