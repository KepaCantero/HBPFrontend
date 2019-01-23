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
      backendInterfaceService
    ) {
      return {
        templateUrl:
          'components/editors/environment-editor/environment-editor.template.html',
        restrict: 'E',
        link: function(scope) {
          scope.stateService = stateService;
          scope.STATE = STATE;
          scope.devMode = environmentService.isDevMode();

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

          scope.generateRobotsModels = function() {
            return $q
              .all([
                newExperimentProxyService.getTemplateModels('robots'),
                storageServer.getCustomModels('robots')
              ])
              .then(([templateRobots, customRobots]) => {
                templateRobots.data.forEach(robot => (robot.public = true));
                customRobots.forEach(robot => (robot.custom = true));
                return [...templateRobots.data, ...customRobots].map(robot => {
                  return {
                    configPath: robot.path,
                    modelPath: robot.id,
                    zipURI: robot.zipURI && robot.zipURI.replace(/%2F/gi, '/'),
                    modelSDF: robot.sdf,
                    modelTitle: robot.name,
                    thumbnail: robot.thumbnail,
                    custom: robot.custom,
                    public: robot.public,
                    isRobot: true
                  };
                });
              });
          };

          const modelLibrary = scope.assetsPath + '/' + gz3d.MODEL_LIBRARY;
          $http.get(modelLibrary).then(function(res) {
            scope.categories = res.data;
            //if not dev mode we don't show the robots
            var modelsPromise;
            if (!scope.devMode) {
              modelsPromise = $q.resolve();
            } else {
              // if the generate robots models fails, we open an error panel
              // but still continue with the rest of the objects in the env editor
              modelsPromise = scope
                .generateRobotsModels()
                .then(templateRobots => {
                  let robotCategory = {
                    thumbnail: 'robots.png',
                    title: 'Robots',
                    models: templateRobots
                  };
                  scope.categories.push(robotCategory);
                  GZ3D.modelList.push(robotCategory);
                })
                .catch(err =>
                  clbErrorDialog.open({
                    type: 'Model libraries error.',
                    message: `Could not retrieve robots models: \n${err}`
                  })
                );
            }
            modelsPromise.finally(() => {
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

            if (model.isRobot) {
              if (model.custom) {
                backendInterfaceService
                  .getCustomRobot(model.zipURI.split('/')[1])
                  .then(() => {
                    scope.addRobot(model);
                  });
              } else {
                scope.addRobot(model);
              }
            } else {
              scope.addModel(model);
            }
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
                    robotRelativePath = model.zipURI.split('/')[1];
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
