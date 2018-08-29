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

  angular
    .module('userNavigationModule', ['nrpUser', 'gz3dModule'])
    .constant('NAVIGATION_MODES', {
      FREE_CAMERA: 'FreeCamera',
      GHOST: 'Ghost',
      HUMAN_BODY: 'HumanBody',
      LOOKAT: 'Lookat'
    })
    .constant('CAMERA_SENSITIVITY_RANGE', {
      TRANSLATION_MIN: 0.05,
      TRANSLATION_MAX: 2.0,
      ROTATION_MIN: 0.1,
      ROTATION_MAX: 2
    })
    .factory('userNavigationService', [
      '$timeout',
      'NAVIGATION_MODES',
      'STATE',
      'gz3d',
      'nrpUser',
      'simulationInfo',
      'roslib',
      'stateService',
      'userInteractionSettingsService',
      function(
        $timeout,
        NAVIGATION_MODES,
        STATE,
        gz3d,
        nrpUser,
        simulationInfo,
        roslib,
        stateService,
        userInteractionSettingsService
      ) {
        return {
          navigationMode: undefined,
          avatarObject: undefined,
          avatarObjectName: undefined,
          avatarNameBase: 'user_avatar',
          avatarInitialized: false,
          userDataInitialized: false,
          avatarModelPathWithCollision: 'user_avatar_basic',
          avatarModelPathNoCollision: 'user_avatar_basic_no-collision',
          userCamera: undefined,
          defaultPosition: undefined,
          defaultLookAt: undefined,
          userID: undefined,
          userDisplayName: undefined,
          userReferenceROSCompliant: undefined,
          showHumanNavInfoDiv: false,

          rosbridgeWebsocketUrl: undefined,
          roslib: undefined,

          init: function() {
            const that = this;

            stateService.getCurrentState().then(function() {
              if (stateService.currentState !== STATE.STOPPED) {
                that.rosbridgeWebsocketUrl =
                  simulationInfo.serverConfig.rosbridge.websocket;
                that.roslib = roslib;

                that.userCamera = gz3d.scene.viewManager.mainUserView.camera;

                // react to updates from gazebo server
                if (angular.isDefined(gz3d.iface.modelInfoTopic)) {
                  gz3d.iface.modelInfoTopic.subscribe(
                    that.onModelInfo.bind(that)
                  );
                } else {
                  gz3d.iface.emitter.on('connection', function() {
                    gz3d.iface.modelInfoTopic.subscribe(
                      that.onModelInfo.bind(that)
                    );
                  });
                }

                that.avatarObjectName = that.avatarNameBase;
                // get user info
                nrpUser.getCurrentUser().then(function(profile) {
                  that.setUserData(profile);

                  that.removeAvatar();

                  // set up controls
                  that.freeCameraControls = new THREE.FirstPersonControls(gz3d);
                  that.lookatControls = new THREE.LookatControls(
                    gz3d.scene.viewManager.mainUserView
                  );

                  that.avatarControls = new THREE.AvatarControls(that, gz3d);
                  that.avatarControls.createAvatarTopics(that.avatarObjectName);
                  userInteractionSettingsService.settings //.loadSettings()
                    .then(function(settings) {
                      if (settings.camera.defaultMode === 'lookat') {
                        that.setLookatCamera();
                      } else {
                        that.setModeFreeCamera();
                      }
                    });
                });
              }
            });

            this.displayHumanNavInfo = function() {
              if (
                stateService.currentState === STATE.PAUSED &&
                that.showHumanNavInfoDiv === false
              ) {
                that.showHumanNavInfoDiv = true;
                $timeout(function() {
                  that.showHumanNavInfoDiv = false;
                }, 5000);
              }
            };
          },

          deinit: function() {
            this.removeAvatar();
          },

          update: function(tElapsed) {
            if (angular.isDefined(this.controls)) {
              userInteractionSettingsService.settings.then(settings => {
                this.controls.update(
                  tElapsed,
                  settings.camera.sensitivity.translation,
                  settings.camera.sensitivity.rotation
                );
              });
            }
          },

          setUserData: function(profile) {
            this.userID = profile.id;
            this.userDisplayName = profile.displayName;

            // create a user reference string that works with ROS topics
            this.userReferenceROSCompliant = this.userID.replace(
              /([^a-zA-Z0-9]+)/gi,
              '_'
            );

            this.avatarObjectName =
              this.avatarNameBase + '_' + this.userReferenceROSCompliant;

            this.userDataInitialized = true;
          },

          onModelInfo: function(modelMessage) {
            // check if message concerns avatar and in avatar mode
            if (
              this.navigationMode !== NAVIGATION_MODES.HUMAN_BODY ||
              modelMessage.name !== this.avatarObjectName
            ) {
              return;
            }

            if (!this.avatarInitialized) {
              this.initAvatar();
            }
          },

          isUserAvatar: function(entity) {
            return entity.name.indexOf(this.avatarObjectName) !== -1;
          },

          getUserAvatar: function() {
            if (!angular.isDefined(gz3d.scene)) {
              return undefined;
            }

            var that = this;
            var avatar;
            var found = false;
            gz3d.scene.scene.traverse(function(node) {
              if (
                !found &&
                node.name &&
                node.name.indexOf(that.avatarObjectName) !== -1
              ) {
                avatar = node;
                found = true;
              }
            });

            return avatar;
          },

          createAvatar: function(hasCollision) {
            var avatar = new THREE.Object3D();
            avatar.name = this.avatarObjectName;
            var modelName;
            if (hasCollision) {
              modelName = this.avatarModelPathWithCollision;
            } else {
              modelName = this.avatarModelPathNoCollision;
            }

            this.avatarControls.init(avatar, this.userCamera);

            // set spawning pose
            if (
              angular.isDefined(this.currentPosition) &&
              angular.isDefined(this.currentDirection) &&
              angular.isDefined(this.currentLookAt)
            ) {
              this.avatarControls.setPose(
                this.currentPosition,
                this.currentLookAt
              );
            } else {
              // no current position, default
              this.avatarControls.setPose(
                this.defaultPosition,
                this.defaultLookAt
              );
            }

            gz3d.gui.emitter.emit('entityCreated', avatar, modelName);

            this.avatarInitialized = false;
          },

          initAvatar: function() {
            this.avatarObject = this.getUserAvatar();
            if (!angular.isDefined(this.avatarObject)) {
              return;
            }

            // avatar controls
            this.freeCameraControls.enabled = false;
            this.lookatControls.enabled = false;
            this.avatarControls.init(this.avatarObject, this.userCamera);

            switch (this.navigationMode) {
              case NAVIGATION_MODES.HUMAN_BODY:
                // humans can't fly
                this.avatarControls.lockVerticalMovement = true;
                break;
            }

            // apply saved pose
            if (
              angular.isDefined(this.currentPosition) &&
              angular.isDefined(this.currentDirection) &&
              angular.isDefined(this.currentLookAt)
            ) {
              this.avatarControls.applyPose(
                this.currentPosition,
                this.currentLookAt
              );
            } else {
              // no current position, default
              this.avatarControls.applyPose(
                this.defaultPosition,
                this.defaultLookAt
              );
            }

            // set and activate controls
            this.controls = gz3d.scene.controls = this.avatarControls;
            this.avatarControls.enabled = true;
            this.avatarControls.attachEventListeners();

            this.avatarInitialized = true;
          },

          removeAvatar: function() {
            var avatar = this.getUserAvatar();
            if (angular.isDefined(avatar)) {
              gz3d.gui.emitter.emit('deleteEntity', avatar);
            }
            this.avatarInitialized = false;
          },

          setDefaultPose: function(
            posX,
            posY,
            posZ,
            lookAtX,
            lookAtY,
            lookAtZ
          ) {
            this.defaultPosition = new THREE.Vector3(posX, posY, posZ);
            this.defaultLookAt = new THREE.Vector3(lookAtX, lookAtY, lookAtZ);
          },

          saveCurrentPose: function() {
            if (!angular.isDefined(this.userCamera)) {
              return;
            }
            this.userCamera.updateMatrixWorld();
            this.currentPosition = this.userCamera.getWorldPosition();
            this.currentDirection = this.userCamera.getWorldDirection();
            var raycaster = new THREE.Raycaster(
              this.currentPosition,
              this.currentDirection
            );
            var intersections = raycaster.intersectObjects(
              gz3d.scene.scene.children,
              true
            );
            if (intersections.length > 0) {
              this.currentLookAt = new THREE.Vector3().copy(
                intersections[0].point
              );
            } else {
              this.currentLookAt = this.currentPosition
                .clone()
                .add(this.currentDirection.clone().multiplyScalar(100));
            }
          },

          setModeHumanBody: function() {
            document.addEventListener('keydown', this.displayHumanNavInfo);

            if (this.navigationMode === NAVIGATION_MODES.HUMAN_BODY) {
              return;
            }

            this.saveCurrentPose();
            // detach camera
            gz3d.scene.scene.add(this.userCamera);

            this.navigationMode = NAVIGATION_MODES.HUMAN_BODY;

            this.freeCameraControls.enabled = false;
            this.lookatControls.enabled = false;
            this.controls = gz3d.scene.controls = undefined;
            this.freeCameraControls.detachEventListeners();
            this.lookatControls.detachEventListeners();

            this.removeAvatar();
            var avatarCollision = true;
            this.createAvatar(avatarCollision);
          },

          setModeFreeCamera: function() {
            document.removeEventListener('keydown', this.displayHumanNavInfo);

            if (this.navigationMode === NAVIGATION_MODES.FREE_CAMERA) {
              return;
            }

            this.navigationMode = NAVIGATION_MODES.FREE_CAMERA;

            this.saveCurrentPose();

            // detach camera
            gz3d.scene.scene.add(this.userCamera);

            this.avatarControls.enabled = false;
            gz3d.scene.controls = undefined;
            this.avatarControls.detachEventListeners();
            this.removeAvatar();

            if (
              angular.isDefined(this.currentPosition) &&
              angular.isDefined(this.currentDirection)
            ) {
              this.userCamera.position.copy(this.currentPosition);
              this.userCamera.updateMatrixWorld();
              var lookAt = this.currentPosition
                .clone()
                .add(this.currentDirection.clone().multiplyScalar(100));
              this.userCamera.lookAt(lookAt);
            }

            window.firstPersonControls = this.freeCameraControls;
            this.freeCameraControls.enabled = true;

            this.lookatControls.detachEventListeners();
            this.lookatControls.enabled = false;

            this.controls = gz3d.scene.controls = this.freeCameraControls;
            this.freeCameraControls.attachEventListeners();
          },

          setLookatCamera: function() {
            document.removeEventListener('keydown', this.displayHumanNavInfo);

            if (this.navigationMode === NAVIGATION_MODES.LOOKAT) {
              return;
            }

            this.navigationMode = NAVIGATION_MODES.LOOKAT;

            this.saveCurrentPose();

            // detach camera
            gz3d.scene.scene.add(this.userCamera);

            this.removeAvatar();

            window.lookatControls = this.lookatControls;

            this.lookatControls.attachEventListeners();
            this.lookatControls.enabled = true;

            this.freeCameraControls.detachEventListeners();
            this.freeCameraControls.enabled = false;

            this.controls = gz3d.scene.controls = this.lookatControls;
          },

          isActiveNavigationMode: function(mode) {
            return this.navigationMode === mode;
          }
        };
      }
    ]);
})();
