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

/* global console: false */

(function() {
  'use strict';

  angular
    .module('environmentRenderingModule')
    .constant('FPS_LIMIT', {
      FPS_20: 20,
      FPS_30: 30,
      FPS_60: 60,
      FPS_INFINITE: Infinity
    })
    .constant('VENDORS', ['ms', 'moz', 'webkit', 'o'])
    .service('environmentRenderingService', [
      '$q',
      'STATE',
      'FPS_LIMIT',
      'VENDORS',
      'gz3d',
      'userNavigationService',
      'simulationInfo',
      'stateService',
      'isNotARobotPredicate',
      'userContextService',
      'assetLoadingSplash',
      'nrpAnalytics',
      'collab3DSettingsService',
      '$timeout',
      'tipTooltipService',
      'TIP_CODES',
      'storageServer',
      '$http',
      function(
        $q,
        STATE,
        FPS_LIMIT,
        VENDORS,
        gz3d,
        userNavigationService,
        simulationInfo,
        stateService,
        isNotARobotPredicate,
        userContextService,
        assetLoadingSplash,
        nrpAnalytics,
        collab3DSettingsService,
        $timeout,
        tipTooltipService,
        TIP_CODES,
        storageServer,
        $http
      ) {
        function EnvironmentRenderingService() {
          var that = this;

          this.tLastFrame = 0;
          this.maxDropCycles = 10;
          this.skippedFramesForDropCycles = 5;
          this.sceneLoading = true;
          this.deferredSceneInitialized = $q.defer();
          this.scene3DSettingsReady = false;
          this.tipTooltipService = tipTooltipService;
          this.storageServer = storageServer;
          this.$http = $http;

          this.sceneInitialized = function() {
            return this.deferredSceneInitialized.promise;
          };
          let onUpdateRenderingCallbacks = [];
          this.addOnUpdateRenderingCallback = callback => {
            onUpdateRenderingCallbacks.push(callback);
          };
          this.removeOnUpdateRenderingCallback = callback => {
            onUpdateRenderingCallbacks = onUpdateRenderingCallbacks.filter(
              element => {
                return element !== callback;
              }
            );
          };

          this.init = function() {
            this.initAnimationFrameFunctions();

            // default to 30 fps cap
            this.setFPSLimit(FPS_LIMIT.FPS_30);
            stateService.getCurrentState().then(function() {
              if (stateService.currentState !== STATE.STOPPED) {
                gz3d.Initialize();
                gz3d.iface.addCanDeletePredicate(isNotARobotPredicate);
                gz3d.iface.addCanDeletePredicate(
                  userContextService.hasEditRights
                );

                // Register for the status updates as well as the timing stats
                // Note that we have two different connections here, hence we only put one as a callback for
                // $rootScope.iface and the other one not!
                /* Listen for status informations */
                stateService.addStateCallback(that.onStateChanged);

                // Show the splash screen for the progress of the asset loading
                that.assetLoadingSplashScreen =
                  that.assetLoadingSplashScreen || assetLoadingSplash.open();
                gz3d.iface.setAssetProgressCallback(function(data) {
                  assetLoadingSplash.setProgress(data);
                });

                that.updateInitialCameraPose(
                  simulationInfo.experimentDetails.cameraPose
                );

                that.initRobotSkin();

                that.animate();
              }
            });

            this.deferredSceneInitialized.promise.then(function() {
              that.initComposerSettings();
            });
          };

          this.initRobotSkin = function() {
            this.storageServer
              .getRobotConfigPath(simulationInfo.experimentID)
              .then(robotConfigPath => {
                this.$http.get(robotConfigPath).then(xml => {
                  let config = new X2JS().xml_str2json(xml.data);
                  if (config.model.frontend_skin_model) {
                    // I need to build a relative path for the mesh from the config
                    let proxyStr = 'proxy/models/';
                    let modelPath = robotConfigPath.substring(
                      robotConfigPath.indexOf(proxyStr) + proxyStr.length
                    );
                    modelPath = modelPath.substring(
                      0,
                      modelPath.lastIndexOf('/')
                    );

                    if (modelPath.indexOf('robots/') === 0)
                      modelPath = modelPath.substring(7);

                    let skinDefinition = {};
                    skinDefinition.mesh =
                      modelPath + '/' + config.model.frontend_skin_model.mesh;
                    skinDefinition.mapTo = 'robot';
                    skinDefinition.visible = true;
                    skinDefinition.parentObject = 'robot';
                    skinDefinition.bonePrefix = 'robot::';
                    skinDefinition.scale =
                      config.model.frontend_skin_model.scale;
                    gz3d.scene.addSkinMesh(skinDefinition);
                  }
                });
              });
          };

          this.deinit = function() {
            if (angular.isDefined(this.cancelAnimationFrame)) {
              this.cancelAnimationFrame(this.requestID);
            }

            // Close the splash screens
            if (angular.isDefined(this.assetLoadingSplashScreen)) {
              if (angular.isDefined(assetLoadingSplash)) {
                assetLoadingSplash.close();
              }
              delete this.assetLoadingSplashScreen;
            }

            stateService.removeStateCallback(this.onStateChanged);
            userNavigationService.deinit();
            gz3d.deInitialize();
          };

          this.animate = function() {
            that.requestID = that.requestAnimationFrame(that.animate);

            if (!that.isElementVisible()) {
              // only update when actually needed
              return;
            } else if (!that.visible) {
              // rendering element was not visible, but is now
              that.needsImmediateUpdate = true;
            }
            that.visible = that.isElementVisible();

            var tNow = Date.now();
            var tElapsed =
              that.tLastFrame === undefined ? 0 : tNow - that.tLastFrame;

            if (that.needsImmediateUpdate) {
              that.tLastFrame = tNow - tElapsed % that.frameInterval;
              that.update(tElapsed);
              that.needsImmediateUpdate = false;
            } else {
              // Drop cycles when the animation loop gets too slow to lower CPU usage
              if (that.dropCycles > 0) {
                that.dropCycles--;
                return;
              } else if (
                tElapsed >=
                that.skippedFramesForDropCycles * that.frameInterval
              ) {
                that.dropCycles = Math.min(
                  that.maxDropCycles,
                  Math.floor(tElapsed / that.frameInterval)
                );
              }

              if (tElapsed >= that.frameInterval) {
                that.tLastFrame = tNow - tElapsed % that.frameInterval;
                that.update(tElapsed);
              }
            }
          };

          this.update = tElapsed => {
            if (!angular.isDefined(gz3d.scene)) {
              return;
            }

            for (let i = 0; i < onUpdateRenderingCallbacks.length; i++) {
              const func = onUpdateRenderingCallbacks[i];
              func(tElapsed);
            }
            userNavigationService.update(tElapsed);
            gz3d.scene.render();
          };

          this.initAnimationFrameFunctions = function() {
            /**
             * global requestAnimationFrame() and cancelAnimationFrame()
             *
             * these global functions serve as wrappers of a native $window method (see https://css-tricks.com/using-requestanimationframe/ for detailed explanation)
             * in order to cover different API conventions and browser versions (see VENDORS)
             *
             * both functions are needed within Initialize() / deInitialize()
             * taken from three.js r62, where it was exposed globally in this fashion
             */
            // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
            // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
            // requestAnimationFrame polyfill by Erik Möller
            // fixes from Paul Irish and Tino Zijdel
            // using 'self' instead of 'window' for compatibility with both NodeJS and IE10.

            this.requestAnimationFrame = window.requestAnimationFrame.bind(
              window
            );

            this.cancelAnimationFrame = window.cancelAnimationFrame.bind(
              window
            );

            for (
              var x = 0;
              x < VENDORS.length && !this.requestAnimationFrame;
              ++x
            ) {
              var raf = window[VENDORS[x] + 'RequestAnimationFrame'];
              this.requestAnimationFrame = raf ? raf.bind(window) : undefined;
              var caf = window[VENDORS[x] + 'CancelAnimationFrame'];
              this.cancelAnimationFrame = caf
                ? caf.bind(window)
                : this.cancelAnimationFrame;
              var carf = window[VENDORS[x] + 'CancelRequestAnimationFrame'];
              if (!caf && carf) {
                this.cancelAnimationFrame = carf;
              }
            }

            if (
              this.requestAnimationFrame === undefined &&
              setTimeout !== undefined
            ) {
              this.requestAnimationFrame = function(callback) {
                var currTime = Date.now(),
                  timeToCall = Math.max(
                    0,
                    this.frameInterval - (currTime - this.tLastFrame)
                  );
                var id = setTimeout(function() {
                  callback(currTime + timeToCall);
                }, timeToCall);
                this.tLastFrame = currTime + timeToCall;
                return id;
              };
              console.info(
                'requestAnimationFrame undefined, using self-defined'
              );
            }

            if (
              this.cancelAnimationFrame === undefined &&
              clearTimeout !== undefined
            ) {
              console.info(
                'cancelAnimationFrame undefined, using self-defined'
              );
              this.cancelAnimationFrame = function(id) {
                clearTimeout(id);
              };
            }
          };

          this.setFPSLimit = function(fps) {
            this.frameInterval = 1000 / fps;
          };

          this.isElementVisible = function() {
            // Check page visibily
            var isPageVisible = true;
            if (typeof document.hidden !== 'undefined') {
              isPageVisible = !document.hidden;
            } else if (typeof document.msHidden !== 'undefined') {
              isPageVisible = !document.msHidden;
            } else if (typeof document.webkitHidden !== 'undefined') {
              isPageVisible = !document.webkitHidden;
            }

            return isPageVisible;
          };

          this.updateInitialCameraPose = function(pose) {
            if (pose !== null) {
              gz3d.scene.setDefaultCameraPose.apply(gz3d.scene, pose);
              userNavigationService.setDefaultPose.apply(
                userNavigationService,
                pose
              );
            }
          };

          this.onStateChanged = function(newState) {
            if (newState === STATE.STOPPED) {
              if (gz3d.iface && gz3d.iface.webSocket) {
                gz3d.iface.webSocket.disableRebirth();
              }
            }
          };

          this.showCameraHintWhenNeeded = function() {
            if (!this.sceneLoading) {
              var camera = gz3d.scene.viewManager.mainUserView.camera;

              if (this.lastCameraTransform) {
                if (
                  !camera.position.equals(this.lastCameraTransform.position) ||
                  !camera.quaternion.equals(this.lastCameraTransform.quaternion)
                ) {
                  this.tipTooltipService.setCurrentTip(TIP_CODES.NAVIGATION);
                }
              }

              this.lastCameraTransform = {
                position: camera.position.clone(),
                quaternion: camera.quaternion.clone()
              };
            }

            $timeout(() => this.showCameraHintWhenNeeded(), 200);
          };

          this.onSceneLoaded = function() {
            if (this.sceneLoading) {
              nrpAnalytics.durationEventTrack('Browser-initialization', {
                category: 'Simulation'
              });
              nrpAnalytics.tickDurationEvent('Simulate');

              gz3d.scene.showLightHelpers = false;
              this.deferredSceneInitialized.resolve();
              gz3d.setLightHelperVisibility();
              userNavigationService.init();
            }
          };

          this.onSceneReady = function() {
            delete this.assetLoadingSplashScreen;
            this.sceneLoading = false;
            this.tipTooltipService.startShowingTipIfRequired();

            $timeout(() => this.showCameraHintWhenNeeded(), 200);
          };

          // Init composer settings
          this.initComposerSettings = function() {
            this.loadingEnvironmentSettingsPanel = true;
            collab3DSettingsService.loadSettings().finally(function() {
              that.loadingEnvironmentSettingsPanel = false;
              $timeout(() => {
                that.scene3DSettingsReady = true;
              });
            });
          };
        }

        var service = new EnvironmentRenderingService();

        return service;
      }
    ]);
})();
