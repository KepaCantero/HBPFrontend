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
    'sceneInfo',
    'backendInterfaceService',
    'clbErrorDialog',
    'isARobotPredicate',
    'downloadFileService',
    'environmentService',
    'goldenLayoutService',
    'DYNAMIC_VIEW_CHANNELS',
    '$http',
    function(
      STATE,
      EDIT_MODE,
      TOOL_CONFIGS,
      panels,
      simulationSDFWorld,
      gz3d,
      stateService,
      simulationInfo,
      sceneInfo,
      backendInterfaceService,
      clbErrorDialog,
      isARobotPredicate,
      downloadFileService,
      environmentService,
      goldenLayoutService,
      DYNAMIC_VIEW_CHANNELS,
      $http
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

          // Register a callback which deletes the robot in the back-end on the corresponding "deleteEntity" event
          // and refresh the robots list managed by the SceneInfo service
          var deleteBackendRobotCallback = function(entity) {
            if (isARobotPredicate(entity)) {
              backendInterfaceService.deleteRobot(entity.name);
              sceneInfo.refreshRobotsList();
            }
          };
          gz3d.iface.addOnDeleteEntityCallbacks(deleteBackendRobotCallback);
          gz3d.iface.addOnCreateEntityCallbacks(sceneInfo.refreshRobotsList);

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

          const modelLibrary = scope.assetsPath + '/' + gz3d.MODEL_LIBRARY;
          $http.get(modelLibrary).then(function(res) {
            scope.categories = res.data;

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

            scope.updateVisibleModels();
          });

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

          scope.selectCreatedEntity = function() {
            /*eslint-disable camelcase*/
            scope.gz3d.gui.guiEvents._events.notification_popup =
              scope.default_notification_popup_handle;

            var obj = scope.gz3d.scene.getByName(scope.expectedObjectName);
            scope.expectedObjectName = null;

            if (obj) {
              scope.gz3d.scene.selectEntity(obj);
              /*dynamicViewOverlayService.createDynamicOverlay(
                DYNAMIC_VIEW_CHANNELS.OBJECT_INSPECTOR
              );*/
              goldenLayoutService.openTool(TOOL_CONFIGS.OBJECT_INSPECTOR);
            }
          };

          scope.interceptEntityCreationEvent = function(model, type) {
            if (
              scope.defaultEntityCreatedCallback !==
              scope.interceptEntityCreationEvent
            ) {
              scope.defaultEntityCreatedCallback(model, type);
            }

            scope.gz3d.iface.gui.emitter._events.entityCreated =
              scope.defaultEntityCreatedCallback;
            scope.defaultEntityCreatedCallback =
              scope.interceptEntityCreationEvent;
            // local variable <model> holds a temporary object;
            // another THREE.Object3D is about to be created by
            // modelUpdate method from GZ3D.GZIface.prototype.onConnected
            // with this.createModelFromMsg(message). We assign a notification
            // handler for that event.
            scope.expectedObjectName = model.name;
            scope.default_notification_popup_handle =
              scope.gz3d.gui.guiEvents._events.notification_popup;
            scope.gz3d.gui.guiEvents._events.notification_popup =
              scope.selectCreatedEntity;
          };

          scope.addModel = function(modelName) {
            if (stateService.currentState !== STATE.INITIALIZED) {
              window.guiEvents.emit('spawn_entity_start', modelName);

              if (
                scope.gz3d.iface.gui.emitter._events.entityCreated !==
                scope.interceptEntityCreationEvent
              ) {
                scope.defaultEntityCreatedCallback =
                  scope.gz3d.iface.gui.emitter._events.entityCreated;
                scope.gz3d.iface.gui.emitter._events.entityCreated =
                  scope.interceptEntityCreationEvent;
              }
            }
          };

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
