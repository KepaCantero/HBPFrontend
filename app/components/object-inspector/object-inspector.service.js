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
/* global console: false */

(function() {
  'use strict';

  angular
    .module('objectInspectorModule')
    .constant('OBJECT_VIEW_MODE', {
      NORMAL: 'normal',
      TRANSPARENT: 'transparent',
      WIREFRAME: 'wireframe'
    })
    .factory('objectInspectorService', [
      '$timeout',
      'EDIT_MODE',
      'STATE',
      'OBJECT_VIEW_MODE',
      'DYNAMIC_VIEW_CHANNELS',
      'gz3d',
      'stateService',
      'colorableObjectService',
      'isNotARobotPredicate',
      'simulationInfo',
      'userNavigationService',
      'NAVIGATION_MODES',
      function(
        $timeout,
        EDIT_MODE,
        STATE,
        OBJECT_VIEW_MODE,
        DYNAMIC_VIEW_CHANNELS,
        gz3d,
        stateService,
        colorableObjectService,
        isNotARobotPredicate,
        simulationInfo,
        userNavigationService,
        NAVIGATION_MODES
      ) {
        //var objectInspectorService = {
        function ObjectInspectorService() {
          var that = this;
          var TRANSFORM_TYPES = GZ3D.TRANSFORM_TYPE_NAME_PREFIX;

          //whether the object editor should be displayed
          this.selectedObject = undefined;
          this.translation = new THREE.Vector3(0, 0, 0);
          this.scaling = new THREE.Vector3(1, 1, 1);
          this.rotationEuler = new THREE.Euler(0, 0, 0);
          this.floatPrecision = 3;
          this.showCollision = undefined;
          this.selectedStyle = [];
          this.inputErrorStyle = 'background-color:red;';
          this.highlightingStyle = 'background-color:yellow;';
          this.snapToGridDist = 0;
          this.lockXAxis = undefined;
          this.lockYAxis = undefined;
          this.lockTAxis = undefined;
          this.selectedTab = 0;
          this.robotMode = false;
          this.selectedRobotComponent = null;

          this.getSelectedObjectShape = function() {
            if (this.selectedObject) {
              return this.selectedObject.getShapeName();
            }
          };

          this.isSelectedRobotComponentTopic = function() {
            return (
              this.selectedRobotComponent &&
              this.selectedRobotComponent.userData &&
              this.selectedRobotComponent.userData.gazeboType &&
              this.selectedRobotComponent.userData.gazeboType === 'rostopic' &&
              this.selectedRobotComponent.userData.rosTopic
            );
          };

          this.isRobot = function() {
            return (
              this.selectedObject && !isNotARobotPredicate(this.selectedObject)
            );
          };

          this.isSelectedObjectSimpleShape = function() {
            if (!!this.selectedObject && !!this.selectedObject.isSimpleShape) {
              return this.selectedObject.isSimpleShape();
            } else {
              return false;
            }
          };

          this.updateScale = function(newValue, newValueAxis) {
            switch (this.getSelectedObjectShape()) {
              case 'cylinder': //X=Y Z
                if (newValueAxis === 'x' || newValueAxis === 'y') {
                  this.scaling.y = this.scaling.x = newValue;
                }
                break;
              case 'sphere': //X=Y=Z
                this.scaling.x = this.scaling.y = this.scaling.z = newValue;
                break;
              case undefined: // no selected object --> do nothing
                break;
              // box and complex --> do nothing
            }
          };

          this.roundToPrecision = function(number) {
            return parseFloat(number.toFixed(this.floatPrecision));
          };

          this.roundToPrecisionVector3 = function(vector3) {
            vector3.x = this.roundToPrecision(vector3.x);
            vector3.y = this.roundToPrecision(vector3.y);
            vector3.z = this.roundToPrecision(vector3.z);
            return vector3;
          };

          this.roundTransformationsValues = function() {
            this.roundToPrecisionVector3(this.translation);
            this.roundToPrecisionVector3(this.scaling);
            this.roundToPrecisionVector3(this.rotationEuler);
          };

          this.selectMaterial = function(material) {
            colorableObjectService.setEntityMaterial(
              simulationInfo,
              this.selectedObject,
              material
            );
          };

          this.onTranslationChange = function(newValueAxis) {
            var selectedStyle = that.inputErrorStyle;
            var idx = 'T' + newValueAxis.toUpperCase();

            var newValue = this.translation[newValueAxis];

            if (newValue === 0 || !!newValue) {
              that.resetStyle(idx);
              this.onObjectChange(TRANSFORM_TYPES.TRANSLATE);
            } else {
              that.setStyle(selectedStyle, idx);
            }
          };

          this.onScaleChange = function(newValueAxis) {
            var selectedStyle = that.inputErrorStyle;
            var idx = 'S' + newValueAxis.toUpperCase();

            var newValue = this.scaling[newValueAxis];

            if (!!newValue && newValue !== 0) {
              // scaling factor must be non-zero
              that.resetStyle(idx);
              this.updateScale(newValue, newValueAxis);
              this.onObjectChange(TRANSFORM_TYPES.SCALE);
            } else {
              that.setStyle(selectedStyle, idx);
            }
          };

          this.onRotationChange = function(newValueAxis) {
            var selectedStyle = that.inputErrorStyle;
            var idx = 'R' + newValueAxis.toUpperCase();

            var newValue = this.rotationEuler[newValueAxis];

            if (newValue === 0 || !!newValue) {
              that.resetStyle(idx);
              this.onObjectChange(TRANSFORM_TYPES.ROTATE);
            } else {
              that.setStyle(selectedStyle, idx);
            }
          };

          this.emitEntityChanged = function() {
            gz3d.scene.emitter.emit('entityChanged', this.selectedObject);
          };

          this.onObjectChange = function(transformType) {
            this.updateSelectedObject(transformType);
            this.selectedObject.updateMatrixWorld();
            this.emitEntityChanged();
          };

          this.setViewMode = function(mode) {
            if (this.selectedObject.viewAs === mode) {
              return;
            }

            gz3d.scene.setViewAs(this.selectedObject, mode);
          };

          this.setSpaceMode = function(mode) {
            gz3d.scene.modelManipulator.space = mode;
            this.update();
          };

          this.onSnapToGridDistChange = function() {
            gz3d.scene.modelManipulator.snapDist = this.snapToGridDist;
          };

          this.onLockAxisChange = function() {
            gz3d.scene.modelManipulator.lockXAxis = this.lockXAxis;
            gz3d.scene.modelManipulator.lockYAxis = this.lockYAxis;
            gz3d.scene.modelManipulator.lockZAxis = this.lockZAxis;
          };

          this.removeEventListeners = function() {
            document.removeEventListener('keydown', this.onKeyDown);
            document.removeEventListener('keyup', this.onKeyUp);
            document.removeEventListener('mouseup', this.onUpdateNeeded);
            document.removeEventListener(
              'mousemove',
              gz3d.scene.modelManipulator.onPointerMove
            );
            document.removeEventListener('mousemove', this.onMouseMove);
          };

          this.setManipulationMode = function(mode) {
            if (gz3d.scene.manipulationMode === mode) {
              return;
            } else {
              switch (mode) {
                case EDIT_MODE.VIEW:
                  this.removeEventListeners();
                  gz3d.scene.setManipulationMode(mode);
                  userNavigationService.controls.enabled = true;
                  break;
                case EDIT_MODE.TRANSLATE:
                case EDIT_MODE.SCALE:
                case EDIT_MODE.ROTATE:
                case EDIT_MODE.NATURAL:
                  stateService.ensureStateBeforeExecuting(
                    STATE.PAUSED,
                    function() {
                      gz3d.scene.setManipulationMode(mode);
                    }
                  );
                  // as view mode deselects any selected object, reselect here
                  gz3d.scene.selectEntity(this.selectedObject);

                  document.addEventListener('keydown', this.onKeyDown, false);
                  document.addEventListener('keyup', this.onKeyUp, false);
                  document.addEventListener(
                    'mouseup',
                    this.onUpdateNeeded,
                    false
                  );
                  document.addEventListener(
                    'mousemove',
                    gz3d.scene.modelManipulator.onPointerMove,
                    false
                  );
                  document.addEventListener(
                    'mousemove',
                    this.onMouseMove,
                    false
                  );

                  userNavigationService.controls.enabled = false;

                  break;
              }
            }
          };

          this.onShowCollisionChange = function() {
            this.selectedObject.showCollision = this.showCollision;

            var that = this;

            if (this.showCollision) {
              this.selectedObject.traverse(function(node) {
                gz3d.iface.loadCollisionVisuals(node);
              });
            }

            this.selectedObject.traverse(function(node) {
              if (node.name.indexOf('COLLISION_VISUAL') >= 0) {
                // found collision geometry node, get all meshes attached
                node.traverse(function(subnode) {
                  if (subnode instanceof THREE.Mesh) {
                    subnode.visible = that.showCollision;
                  }
                });
              }
            });

            gz3d.scene.refresh3DViews();
          };

          this.onKeyUp = function(event) {
            if (gz3d.scene === null) {
              return;
            }

            if (gz3d.scene.naturalAutoAlignMode) {
              gz3d.scene.naturalAutoAlignMode.onKeyUp(event);
            }
          };

          this.onKeyDown = function(event) {
            if (gz3d.scene === null) {
              return;
            }

            if (gz3d.scene.naturalAutoAlignMode) {
              gz3d.scene.naturalAutoAlignMode.onKeyDown(event);
            }

            if (gz3d.scene.modelManipulator.selected === 'null') {
              var prefix = '';
              if (gz3d.scene.manipulationMode === EDIT_MODE.TRANSLATE) {
                prefix = TRANSFORM_TYPES.TRANSLATE;
              } else if (gz3d.scene.manipulationMode === EDIT_MODE.SCALE) {
                prefix = TRANSFORM_TYPES.SCALE;
              } else if (gz3d.scene.manipulationMode === EDIT_MODE.ROTATE) {
                prefix = TRANSFORM_TYPES.ROTATE;
              }

              var ix = null;
              switch (event.key) {
                case 'x':
                  ix = prefix + 'X';
                  break;
                case 'y':
                  ix = prefix + 'Y';
                  break;
                case 'z':
                  ix = prefix + 'Z';
                  break;
              }

              if (ix === null) {
                return;
              }

              var selected = that.getMeshByName(ix);
              if (selected) {
                document.addEventListener('mouseup', that.onAxisMoveEnd, false);

                gz3d.scene.modelManipulator.highlightPicker(selected);
                if (that.getMouseEvent()) {
                  gz3d.scene.modelManipulator.selectPicker(
                    that.getMouseEvent()
                  );
                } else {
                  that.setSelectPicker(true);
                }
              }
            } else {
              /// gracefully exit axis lock mode on any key press
              gz3d.scene.modelManipulator.handleAxisLockEnd();
            }
            that.update();
          };

          this.getMouseEvent = function() {
            return this.mouseEvent;
          };

          this.getMeshByName = function(ix) {
            return gz3d.scene.modelManipulator.pickerMeshes[ix];
          };

          this.setSelectPicker = function(value) {
            this.doSelectPicker = value;
          };

          /** captures mouse move events for gz3d.scene.modelManipulator.selectPicker invocation */
          this.onMouseMove = function(event) {
            that.mouseEvent = event;
            if (that.doSelectPicker) {
              gz3d.scene.modelManipulator.selectPicker(that.mouseEvent);
              that.setSelectPicker(false);
            }

            if (gz3d.scene.modelManipulator.selected !== 'null') {
              that.update();
            }

            if (gz3d.scene.naturalAutoAlignMode) {
              gz3d.scene.updateMoveNaturalManipulation(
                event.clientX,
                event.clientY
              );
            }
          };

          this.onAxisMoveEnd = function() {
            if (gz3d.scene === null) {
              return;
            }
            gz3d.scene.modelManipulator.handleAxisLockEnd();
            that.update();
            document.removeEventListener('mouseup', this.onAxisMoveEnd);
          };

          this.checkLightSelected = function() {
            var result = false;
            if (that.selectedObject) {
              that.selectedObject.traverse(function(subnode) {
                if (subnode instanceof THREE.Light) {
                  result = true;
                }
              });
            }
            return result;
          };

          this.isLightSelected = this.checkLightSelected;

          this.onUpdateNeeded = function() {
            if (gz3d.scene === null) {
              return;
            }
            that.update();
            that.emitEntityChanged();
          };

          this.setStyle = function(style, idx) {
            that.selectedStyle[idx] = style;
          };

          this.setStyleList = function(idxList, style) {
            angular.forEach(idxList, that.setStyle.bind(null, style));
          };

          this.resetStyle = function(idx) {
            that.selectedStyle[idx] = '';
          };

          this.updateStyle = function(transform, style, axis) {
            var idx = transform + axis;

            if (
              gz3d.scene.modelManipulator.isSelected(transform) &&
              gz3d.scene.modelManipulator.isSelected(axis)
            ) {
              var fieldsList = axis === 'E' ? ['RX', 'RY', 'RZ'] : [idx];
              that.setStyleList(fieldsList, style);
            } else {
              if (axis !== 'E') {
                that.resetStyle(idx);
              }
            }
          };

          this.updateStyles = function() {
            var selectedStyle = that.highlightingStyle;

            angular.forEach(['T', 'S', 'R'], function(transform) {
              angular.forEach(
                ['X', 'Y', 'Z'],
                that.updateStyle.bind(null, transform, selectedStyle)
              );
            });
            that.updateStyle('R', selectedStyle, 'E');
          };

          this.setRobotMode = function(robotMode) {
            if (this.robotMode !== robotMode) {
              this.robotMode = robotMode;

              if (this.robotMode) {
                this.robotObject = this.selectedObject;
                gz3d.scene.lockSelectedIdentity = true;

                this.previousNavigationMode =
                  userNavigationService.navigationMode;
                this.previousCameraPosition = userNavigationService.userCamera.position.clone();
                this.previousCameraRotation = userNavigationService.userCamera.rotation.clone();
                this.previousLookAtObject =
                  userNavigationService.lookatRobotControls.lookAtTarget;

                userNavigationService.lookatRobotControls.setLookatTarget(null);
                userNavigationService.setLookatRobotCamera();
                userNavigationService.lookatRobotControls.setDistance(
                  userNavigationService.lookatRobotControls.minDistance + 1.3
                );

                gz3d.scene.setViewAs(
                  this.selectedObject,
                  OBJECT_VIEW_MODE.TRANSPARENT
                );

                gz3d.scene.setLabelInfoVisible(this.selectedObject, true);
              } else {
                gz3d.scene.lockSelectedIdentity = false;

                userNavigationService.userCamera.position.copy(
                  this.previousCameraPosition
                );
                userNavigationService.userCamera.rotation.copy(
                  this.previousCameraRotation
                );
                userNavigationService.userCamera.updateMatrixWorld(true);

                gz3d.scene.setViewAs(this.robotObject, OBJECT_VIEW_MODE.NORMAL);
                gz3d.scene.setLabelInfoVisible(this.robotObject, false);

                if (this.previousNavigationMode) {
                  switch (this.previousNavigationMode) {
                    case NAVIGATION_MODES.FREE_CAMERA:
                      userNavigationService.setModeFreeCamera();
                      break;

                    case NAVIGATION_MODES.GHOST:
                      userNavigationService.setModeGhost();
                      break;

                    case NAVIGATION_MODES.HUMAN_BODY:
                      if (stateService.currentState !== STATE.PAUSED) {
                        userNavigationService.setModeHumanBody();
                      }
                      break;

                    case NAVIGATION_MODES.LOOKAT_ROBOT:
                      userNavigationService.lookatRobotControls.setLookatTarget(
                        this.previousLookAtObject
                      );
                      userNavigationService.setLookatRobotCamera();
                      break;
                  }
                }
              }
            }
          };

          this.update = function() {
            // update selected object
            that.selectedObject = gz3d.scene.selectedEntity;
            if (
              that.selectedObject &&
              that.currentDisplayedObject !== that.selectedObject
            ) {
              that.currentDisplayedObject = that.selectedObject;
            }

            that.isARobot = !isNotARobotPredicate(that.selectedObject);

            if (
              angular.isUndefined(that.selectedObject) ||
              that.selectedObject === null
            ) {
              that.selectedTab = 0;
              that.setRobotMode(false);
              return;
            }

            if (!that.isRobot()) {
              that.selectedTab = 0;
              that.setRobotMode(false);
            }

            if (that.checkLightSelected()) {
              that.setViewMode(OBJECT_VIEW_MODE.WIREFRAME);
            }

            that.updateStyles();

            // update translation, scale, rotation
            that.updateInspector(TRANSFORM_TYPES.ALL);

            // round for readability purposes
            that.roundTransformationsValues();

            that.hasColorableVisual = colorableObjectService.isColorableEntity(
              that.selectedObject
            );

            // update view mode radio buttons
            document.getElementById('oi-viewmode-normal').checked = false;
            document.getElementById('oi-viewmode-transparent').checked = false;
            document.getElementById('oi-viewmode-wireframe').checked = false;
            if (angular.isDefined(that.selectedObject.viewAs)) {
              switch (that.selectedObject.viewAs) {
                case OBJECT_VIEW_MODE.NORMAL:
                  document.getElementById('oi-viewmode-normal').checked = true;
                  break;
                case OBJECT_VIEW_MODE.TRANSPARENT:
                  document.getElementById(
                    'oi-viewmode-transparent'
                  ).checked = true;
                  break;
                case OBJECT_VIEW_MODE.WIREFRAME:
                  document.getElementById(
                    'oi-viewmode-wireframe'
                  ).checked = true;
                  break;
              }
            }

            // update space radio buttons

            document.getElementById('oi-space-local').checked = false;
            document.getElementById('oi-space-world').checked = false;
            switch (gz3d.scene.modelManipulator.space) {
              case 'local':
                document.getElementById('oi-space-local').checked = true;
                break;
              case 'world':
                document.getElementById('oi-space-world').checked = true;
                break;
            }

            // update show collisions
            if (angular.isUndefined(that.selectedObject.showCollision)) {
              that.showCollision = that.selectedObject.showCollision = false;
            } else {
              that.showCollision = that.selectedObject.showCollision;
            }
          };

          // update inspector from object
          this.updateInspector = function(transformType) {
            this.updateInspectorFunctions[transformType]();
          };

          this.updateInspectorFunctions = {};
          // - none
          this.updateInspectorFunctions[TRANSFORM_TYPES.NONE] = angular.noop;
          // - translation
          this.updateInspectorFunctions[
            TRANSFORM_TYPES.TRANSLATE
          ] = function() {
            that.translation.copy(that.selectedObject.position);
            that.roundToPrecisionVector3(that.translation);
          };
          // - scale
          this.updateInspectorFunctions[TRANSFORM_TYPES.SCALE] = function() {
            that.scaling.copy(that.selectedObject.scale);
            that.roundToPrecisionVector3(that.scaling);
          };
          // - rotation
          this.updateInspectorFunctions[TRANSFORM_TYPES.ROTATE] = function() {
            that.rotationEuler.copy(that.selectedObject.rotation);
            that.rotationEuler.x *= 180 / Math.PI;
            that.rotationEuler.y *= 180 / Math.PI;
            that.rotationEuler.z *= 180 / Math.PI;
            that.roundToPrecisionVector3(that.rotationEuler);
          };
          // - all
          this.updateInspectorFunctions[TRANSFORM_TYPES.ALL] = function() {
            that.updateInspectorFunctions[TRANSFORM_TYPES.TRANSLATE]();
            that.updateInspectorFunctions[TRANSFORM_TYPES.ROTATE]();
            that.updateInspectorFunctions[TRANSFORM_TYPES.SCALE]();
          };

          // update inspector from object
          this.updateSelectedObject = function(transformType) {
            this.updateSelectedObjectFunctions[transformType]();
          };
          // update object from inspector
          this.updateSelectedObjectFunctions = {};
          // - none
          this.updateSelectedObjectFunctions[TRANSFORM_TYPES.NONE] =
            angular.noop;
          // - translation
          this.updateSelectedObjectFunctions[
            TRANSFORM_TYPES.TRANSLATE
          ] = function() {
            that.selectedObject.position.copy(that.translation);
          };
          // - rotation
          this.updateSelectedObjectFunctions[
            TRANSFORM_TYPES.ROTATE
          ] = function() {
            var radRotation = that.rotationEuler.clone();

            radRotation.x *= Math.PI / 180;
            radRotation.y *= Math.PI / 180;
            radRotation.z *= Math.PI / 180;

            that.selectedObject.rotation.copy(radRotation);
          };
          // - scale
          this.updateSelectedObjectFunctions[
            TRANSFORM_TYPES.SCALE
          ] = function() {
            that.selectedObject.scale.copy(that.scaling);
          };
          // - all
          this.updateSelectedObjectFunctions[TRANSFORM_TYPES.ALL] = function() {
            that.updateSelectedObjectFunctions[TRANSFORM_TYPES.TRANSLATE]();
            that.updateSelectedObjectFunctions[TRANSFORM_TYPES.ROTATE]();
            that.updateSelectedObjectFunctions[TRANSFORM_TYPES.SCALE]();
          };
        }

        return new ObjectInspectorService();
      }
    ]);
})();
