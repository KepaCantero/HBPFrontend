(function () {
  'use strict';

  /**
   * @ngdoc function
   * @name exdFrontendApp.controller:Gz3dViewCtrl
   * @description
   * # Gz3dViewCtrl
   * Controller of the exdFrontendApp
   */

  /* global GZ3D: false */
  /* global THREE: false */
  /* global console: false */

  angular.module('exdFrontendApp.Constants')
    // constants for the server side status
    .constant('STATE', {
      CREATED: 'created',
      STARTED: 'started',
      PAUSED: 'paused',
      INITIALIZED: 'initialized',
      STOPPED: 'stopped',
    })
    .constant('OPERATION_MODE', {
      VIEW: 'view',
      EDIT: 'edit'
    })
    .constant('UI', {
      UNDEFINED: -1,
      PLAY_BUTTON: 0,
      PAUSE_BUTTON: 1,
      STOP_BUTTON: 2,
      RESET_BUTTON: 3,
      TIME_DISPLAY: 4,
      LIGHT_SLIDER: 5,
      CAMERA_TRANSLATION: 6,
      CAMERA_ROTATION: 7,
      SPIKETRAIN: 8,
      OWNER_DISPLAY: 9,
      EXIT_BUTTON: 10,
      ROBOT_VIEW: 11,
      CODE_EDITOR: 12,
      JOINT_PLOT: 13,
      GRAPHICS_PERFORMANCE: 14
    })
    .constant('SLIDER_INITIAL_POSITION', 50)
    .constant('SCREEN_GLASS_STRING', '::screen_glass');

  angular.module('exdFrontendApp')
    .controller('Gz3dViewCtrl',
      ['$rootScope', '$scope', '$stateParams', '$timeout',
        '$location', '$window', '$document', 'bbpConfig',
        'hbpUserDirectory', 'simulationService',
        'simulationControl', 'screenControl', 'experimentList',
        'experimentSimulationService', 'timeDDHHMMSSFilter', 'splash',
        'assetLoadingSplash', 'STATE', 'nrpBackendVersions',
        'nrpFrontendVersion', 'UI', 'OPERATION_MODE', 'SCREEN_GLASS_STRING',
        'gz3d', 'EDIT_MODE', 'stateService', 'contextMenuState', 'objectInspectorService',
        'simulationInfo', 'SLIDER_INITIAL_POSITION', 'hbpDialogFactory',
        'backendInterfaceService', 'RESET_TYPE',
        function ($rootScope, $scope, $stateParams, $timeout,
                  $location, $window, $document, bbpConfig,
                  hbpUserDirectory, simulationService,
                  simulationControl, screenControl, experimentList,
                  experimentSimulationService, timeDDHHMMSSFilter, splash,
                  assetLoadingSplash, STATE, nrpBackendVersions,
                  nrpFrontendVersion, UI, OPERATION_MODE, SCREEN_GLASS_STRING,
                  gz3d, EDIT_MODE, stateService, contextMenuState, objectInspectorService,
                  simulationInfo, SLIDER_INITIAL_POSITION, hbpDialogFactory,
                  backendInterfaceService, RESET_TYPE) {

          // This is the only place where simulation info are, and should be, initialized
          simulationInfo.Initialize();
          $scope.simulationInfo = simulationInfo;

          stateService.Initialize();
          var serverConfig = bbpConfig.get('api.neurorobotics')[simulationInfo.serverID];
          $scope.operationMode = simulationInfo.mode;
          $scope.helpModeActivated = false;
          $scope.helpDescription = '';
          $scope.helpText = {};
          $scope.currentSelectedUIElement = UI.UNDEFINED;

          $scope.rosbridgeWebsocketUrl = serverConfig.rosbridge.websocket;
          $scope.spikeTopic = serverConfig.rosbridge.topics.spikes;
          $scope.jointTopic = serverConfig.rosbridge.topics.joint;

          $scope.STATE = STATE;
          $scope.OPERATION_MODE = OPERATION_MODE;
          $scope.UI = UI;
          $scope.RESET_TYPE = RESET_TYPE;

          function ViewState() {
            this.isInitialized = false;
            this.isJoiningStoppedSimulation = false;
            this.isOwner = false;
            var _userID, _ownerID;
            Object.defineProperty(this, 'userID',
              {
                get: function () {
                  return _userID;
                },
                set: function (val) {
                  _userID = val;
                  this.isOwner = (_ownerID === _userID);
                },
                enumerable: true
              });
            Object.defineProperty(this, 'ownerID',
              {
                get: function () {
                  return _ownerID;
                },
                set: function (val) {
                  _ownerID = val;
                  this.isOwner = (_ownerID === _userID);
                },
                enumerable: true
              });
          }

          $scope.viewState = new ViewState();
          $scope.gz3d = gz3d;
          $scope.stateService = stateService;
          $scope.EDIT_MODE = EDIT_MODE;
          $scope.contextMenuState = contextMenuState;
          $scope.objectInspectorService = objectInspectorService;

          $scope.sliderPosition = SLIDER_INITIAL_POSITION;

          simulationInfo.experimentID = 'experiment-not-found';
          if (!bbpConfig.get('localmode.forceuser', false)) {
            hbpUserDirectory.getCurrentUser().then(function (profile) {
              $scope.viewState.userID = profile.id;
            });
          } else {
            $scope.viewState.userID = bbpConfig.get('localmode.ownerID');
          }
          simulationControl(simulationInfo.serverBaseUrl).simulation({sim_id: simulationInfo.simulationID}, function (data) {
            $scope.viewState.ownerID = data.owner;
            $scope.experimentConfiguration = data.experimentConfiguration;
            $scope.environmentConfiguration = data.environmentConfiguration;
            $scope.creationDate = data.creationDate;
            // get experiment list from current server
            experimentList(simulationInfo.serverBaseUrl).experiments(function (data) {
              angular.forEach(data.data, function (experimentTemplate, experimentID) {
                if (experimentTemplate.experimentConfiguration === $scope.experimentConfiguration) {
                  $scope.ExperimentDescription = experimentTemplate.description;
                  $scope.ExperimentName = experimentTemplate.name;
                  $scope.updateInitialCameraPose(experimentTemplate.cameraPose);
                  simulationInfo.experimentID = experimentID;
                }
              });
            });
            if (!bbpConfig.get('localmode.forceuser', false)) {
              hbpUserDirectory.get([data.owner]).then(function (profile) {
                $scope.owner = simulationService().getUserName(profile);
              });
            } else {
              $scope.owner = bbpConfig.get('localmode.ownerID');
              $scope.viewState.isOwner = true;
            }
          });

          $scope.versions = {};
          nrpFrontendVersion.get(function (data) {
            $scope.versions.hbp_nrp_esv = data.hbp_nrp_esv;
          });
          nrpBackendVersions(simulationInfo.serverBaseUrl).get(function (data) {
            $scope.versions = angular.extend($scope.versions, data);
          });

          /* status messages are listened to here. A splash screen is opened to display progress messages. */
          /* This is the case when closing an simulation for example. Loading is taken take of */
          /* by a progressbar somewhere else. */
          /* Timeout messages are displayed in the toolbar. */
          var messageCallback = function (message) {
            /* Progress messages (apart start state progress messages which are handled by another progress bar) */
            if (angular.isDefined(message.progress) && message.state !== STATE.STARTED) {
              $scope.splashScreen = $scope.splashScreen || splash.open(
                  !message.progress.block_ui,
                  ((stateService.currentState === STATE.STOPPED) ? $scope.exit : undefined));
              if (angular.isDefined(message.progress.done) && message.progress.done) {
                splash.spin = false;
                splash.setMessage({headline: 'Finished'});

                /* if splash is a blocking modal (no button), then close it */
                /* (else it is closed by the user on button click) */
                if (!splash.showButton) {
                  splash.close();
                  $scope.splashScreen = undefined;
                }
              } else {
                splash.setMessage({headline: message.progress.task, subHeadline: message.progress.subtask});
              }
            }
            /* Time messages */
            if (angular.isDefined(message.timeout)) {
              $scope.simTimeoutText = message.timeout;
            }
            if (angular.isDefined(message.simulationTime)) {
              $scope.simulationTimeText = message.simulationTime;
            }
            if (angular.isDefined(message.realTime)) {
              $scope.realTimeText = message.realTime;
            }
          };

          // Query the state of the simulation
          stateService.getCurrentState().then(function () {
            if (stateService.currentState === STATE.STOPPED) {
              // The Simulation is already Stopped, so do nothing more but show the alert popup
              $scope.viewState.isJoiningStoppedSimulation = true;
            } else {
              // Initialize GZ3D and so on...
              gz3d.Initialize();

              // Handle touch clicks to toggle the context menu
              // This is used to save the position of a touch start event used for content menu toggling
              var touchStart = {clientX: 0, clientY: 0};
              var touchMove = {clientX: 0, clientY: 0};

              gz3d.scene.container.addEventListener('touchstart', function (event) {
                touchStart.clientX = event.touches[0].clientX;
                touchStart.clientY = event.touches[0].clientY;
                touchMove.clientX = touchStart.clientX;
                touchMove.clientY = touchStart.clientY;
              }, false);

              gz3d.scene.container.addEventListener('touchmove', function (event) {
                touchMove.clientX = event.touches[0].clientX;
                touchMove.clientY = event.touches[0].clientY;
              }, false);

              gz3d.scene.container.addEventListener('touchend', function (event) {
                var deltaX = touchMove.clientX - touchStart.clientX;
                var deltaY = touchMove.clientY - touchStart.clientY;
                var touchDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                // if the touch distance was small
                // Also test on clientX/clientY greater 0 (Because 'touchend' can sometimes be called without 'touchstart')
                // ...and so clientX and clientY are in their initial state '0'
                if ((touchDistance <= 20) && (touchStart.clientX > 0) && (touchStart.clientY > 0)) {
                  event.clientX = touchMove.clientX;
                  event.clientY = touchMove.clientY;
                  contextMenuState.toggleContextMenu(true, event);
                }
                touchStart = {clientX: 0, clientY: 0};
                touchMove = {clientX: 0, clientY: 0};
              }, false);

              // Register for the status updates as well as the timing stats
              // Note that we have two different connections here, hence we only put one as a callback for
              // $rootScope.iface and the other one not!
              /* Listen for status infromations */
              stateService.startListeningForStatusInformation();
              stateService.addMessageCallback(messageCallback);

              // Show the splash screen for the progress of the asset loading
              $scope.assetLoadingSplashScreen = $scope.assetLoadingSplashScreen || assetLoadingSplash.open($scope.onSceneLoaded);
              gz3d.iface.setAssetProgressCallback(function (data) {
                assetLoadingSplash.setProgress(data);
              });
            }
          });

          $scope.onSceneLoaded = function () {
            // Lights management
            $scope.$watch('sliderPosition', function () {
              var ratio = $scope.sliderPosition / 50; // turns the slider position (in [0,100]) into a ratio (in [0, 2])
              gz3d.scene.emitter.emit('lightChanged', ratio);
            });

            // when in edit mode make light's helper geometry visible
            if ($scope.operationMode === OPERATION_MODE.EDIT) {
              $scope.setLightHelperVisibility(true);
            } else {
              $scope.setLightHelperVisibility(false);
            }
          };

          // play/pause/stop button handler
          $scope.simControlButtonHandler = function (newState) {
            $scope.updateSimulation(newState);
            $scope.setEditMode(EDIT_MODE.VIEW);
          };

          $scope.resetButtonClickHandler = function () {
            $scope.request = {
              resetType: RESET_TYPE.NO_RESET
            };

            //frontend-bound reset checkboxes
            $scope.frontend = {
              checkboxes: {
                viewReset: false
              }
            };

            hbpDialogFactory.confirm({
              'templateUrl': 'views/esv/reset-checklist-template.html',
              'scope': $scope
            })
            .then(function() {
              var rst = $scope.request.resetType;
              if (rst === RESET_TYPE.NO_RESET) { return; }
              else if (rst < 256) { // Backend message
                /* TODO: this should be removed as soon as some reset features are
                correctly implemented and tested */
                if (rst === RESET_TYPE.RESET_OLD) { // Old reset
                  $scope.updateSimulation(STATE.INITIALIZED);
                  $scope.setEditMode(EDIT_MODE.VIEW);
                }
                else { // Just forward the reset value to the backend
                  backendInterfaceService.reset($scope.request);
                }
              }
              else {
                if (rst === RESET_TYPE.RESET_CAMERA_VIEW) {
                  gz3d.scene.resetView();
                }
              }
            });
          };

          $scope.setEditMode = function (newMode) {
            //oldMode !== newMode
            if (gz3d.scene.manipulationMode !== newMode) {
              gz3d.scene.setManipulationMode(newMode);
            }
          };

          $scope.setLightHelperVisibility = function (visible) {
            gz3d.scene.showLightHelpers = visible;

            gz3d.scene.scene.traverse(function (node) {
              if (node.name.indexOf('_lightHelper') > -1) {
                node.visible = visible;
              }
            });
          };

          $scope.updateSimulation = function (newState) {
            stateService.setCurrentState(newState).then(
              function () {
                // Temporary fix for screen color update on reset event, see comments above
                if (newState === STATE.INITIALIZED) {

                  gz3d.scene.controls.onMouseDownManipulator('initPosition');
                  gz3d.scene.controls.onMouseDownManipulator('initRotation');
                  gz3d.scene.controls.update();
                  gz3d.scene.controls.onMouseUpManipulator('initPosition');
                  gz3d.scene.controls.onMouseUpManipulator('initRotation');
                  $scope.sliderPosition = SLIDER_INITIAL_POSITION;
                  gz3d.scene.resetView(); //update the default camera position, if defined

                  // Don't stay in INITIALIZED, but switch to STARTED->PAUSED
                  stateService.setCurrentState(STATE.STARTED).then(
                    function () {
                      stateService.setCurrentState(STATE.PAUSED);
                    }
                  );
                }
              }
            );
          };

          // We restrict material changes to screen glasses found in screen models of the 3D scene,
          // i.e., only visuals bearing the name screen_glass can be modified by this function.
          $scope.setMaterialOnEntity = function(value) {
            var selectedEntity = gz3d.scene.selectedEntity;

            if (!selectedEntity) {
              console.error('Could not change screen color since there was no object selected');
              return;
            }
            var screenGlass = $scope.getScreenGlass(selectedEntity);
            var materialChange = { 'visual_path': screenGlass.name, 'material': value };
            // Request color change through RESTful call
            screenControl(simulationInfo.serverBaseUrl).updateScreenColor(
              {sim_id: simulationInfo.simulationID}, materialChange
            );

            // Hide context menu after a color was assigned
            contextMenuState.toggleContextMenu(false);
          };

          $scope.getScreenGlass = function(entity) {
            var screenGlass;
            entity.traverse(function(node) {
                var index = node.name.length - SCREEN_GLASS_STRING.length;
                // Check whether the current node name ends with SCREEN_GLASS_STRING
                // (Note that string.endsWith() doesn't exist yet but ECMA6 will add this function, see
                // http://stackoverflow.com/questions/280634/endswith-in-javascript)
                if (node.name.indexOf(SCREEN_GLASS_STRING, index) !== -1) {
                  screenGlass = node;
                  return node;
                }
            });
            return screenGlass;
          };

          // ScreenChange context Menu setup
          var screenChangeMenuItemGroup = {
            label: 'Change Color',
            visible: false,
            items: [
              {
                text: 'Red',
                callback: function (event) {
                  $scope.setMaterialOnEntity('Gazebo/Red');
                  event.stopPropagation();
                },
                visible: false
              },
              {
                text: 'Blue',
                callback: function (event) {
                  $scope.setMaterialOnEntity('Gazebo/Blue');
                  event.stopPropagation();
                },
                visible: false
              }
            ],

            hide: function () {
              this.visible = this.items[0].visible = this.items[1].visible = false;
            },

            show: function (model) {
              var shouldShowOnlyInViewMode =
                (gz3d.scene.manipulationMode === EDIT_MODE.VIEW);

              var shouldShowOnlyOnScreens = angular.isDefined($scope.getScreenGlass(model));
              var show =
                shouldShowOnlyInViewMode &&
                shouldShowOnlyOnScreens;

              return (this.visible =
                this.items[0].visible =
                  this.items[1].visible = show);
            }
          };
          contextMenuState.pushItemGroup(screenChangeMenuItemGroup);

          //main context menu handler
          $scope.onContainerMouseDown = function (event) {
            if ($scope.viewState.isOwner) {
              switch (event.button) {
                case 2:
                  //right click -> show menu
                  contextMenuState.toggleContextMenu(true, event);
                  break;

                //other buttons -> hide menu
                case 0:
                case 1:
                  contextMenuState.toggleContextMenu(false);
                  break;
              }
            }
          };

          //main handler for mouseup events on the container element
          $scope.onContainerMouseUp = function (event) {
            if ($scope.viewState.isOwner) {
              switch (event.button) {
                case 2:
                  // right click
                  break;

                case 0:
                  // left click
                case 1:
                  // middle mouse button
                  if (objectInspectorService.isShown) {
                    objectInspectorService.update();
                  }
                  break;
              }
            }
          };

          $scope.focus = function (id) {
            // timeout makes sure that it is invoked after any other event has been triggered.
            // e.g. click events that need to run before the focus or
            // inputs elements that are in a disabled state but are enabled when those events
            // are triggered.
            $timeout(function () {
              var element = $window.document.getElementById(id);
              if (element) {
                element.focus();
              }
            });
          };

          // Camera manipulation
          var hasNavigationAlreadyBeenClicked = false;
          $scope.showKeyboardControlInfoDiv = false;

          // This should be integrated to the tutorial story when
          // it will be implemented !
          $scope.showKeyboardControlInfo = function () {
            if (!hasNavigationAlreadyBeenClicked) {
              hasNavigationAlreadyBeenClicked = true;
              $scope.showKeyboardControlInfoDiv = true;
              $timeout(function () {
                $scope.showKeyboardControlInfoDiv = false;
              }, 20000);
            }
          };

          $scope.requestMove = function (event, action) {
            if (!$scope.helpModeActivated && event.which === 1) { // camera control uses left button only
              gz3d.scene.controls.onMouseDownManipulator(action);
            }
          };

          $scope.releaseMove = function (event, action) {
            if (!$scope.helpModeActivated && event.which === 1) { // camera control uses left button only
              gz3d.scene.controls.onMouseUpManipulator(action);
            }
          };

          $scope.updateInitialCameraPose = function (pose) {
            if (pose !== null) {
              gz3d.scene.setDefaultCameraPose.apply(gz3d.scene, pose);
            }
          };

          // Spiketrain
          $scope.showSpikeTrain = false;
          $scope.toggleSpikeTrain = function () {
            $scope.showSpikeTrain = !$scope.showSpikeTrain;
          };

          // JointPlot
          $scope.showJointPlot = false;
          $scope.toggleJointPlot = function () {
            $scope.showJointPlot = !$scope.showJointPlot;
          };

          // robot view
          $scope.toggleRobotView = function () {
            $scope.showRobotView = !$scope.showRobotView;
            gz3d.scene.viewManager.views.forEach(function (view) {
              if (angular.isDefined(view.type) && view.type === 'camera' /* view will be named the same as the corresponding camera sensor from the gazebo .sdf */) {
                view.active = !view.active;
                view.container.style.visibility = view.active ? 'visible' : 'hidden';
              }
            });
          };

          // graphics performance settings
          $scope.toggleGraphicsPerformance = function () {
            var isShadowsEnabled = gz3d.scene.renderer.shadowMapEnabled;
            $scope.showShadows = !isShadowsEnabled;
            gz3d.scene.setShadowMaps($scope.showShadows);
          };

          // help mode
          $scope.toggleHelpMode = function () {
            $scope.helpModeActivated = !$scope.helpModeActivated;
            $scope.helpDescription = "";
            $scope.currentSelectedUIElement = UI.UNDEFINED;
          };

          // clean up on leaving
          $scope.$on("$destroy", function () {
            // Close the splash screens
            if (angular.isDefined($scope.splashScreen)) {
              splash.close();
              delete $scope.splashScreen;
            }
            if (angular.isDefined($scope.assetLoadingSplashScreen)) {
              assetLoadingSplash.close();
              delete $scope.assetLoadingSplashScreen;
            }

            // Stop listening for status messages
            stateService.stopListeningForStatusInformation();

            // unregister the message callback
            stateService.removeMessageCallback(messageCallback);

            if (angular.isDefined(gz3d.iface) && angular.isDefined(gz3d.iface.webSocket)) {
              gz3d.iface.webSocket.close();
            }
            gz3d.deInitialize();

            // Stop/Cancel loading assets
            // The window.stop() method is not supported by Internet Explorer
            // https://developer.mozilla.org/de/docs/Web/API/Window/stop
            if (angular.isDefined($window.stop)) {
              $window.stop();
            }
            else if (angular.isDefined($document.execCommand)) {
              $document.execCommand("Stop", false);
            }
          });

          $scope.help = function (uiElement) {
            if ($scope.currentSelectedUIElement === uiElement) {
              $scope.helpDescription = "";
              $scope.currentSelectedUIElement = UI.UNDEFINED;
            }
            else {
              $scope.helpDescription = $scope.helpText[uiElement];
              $scope.currentSelectedUIElement = uiElement;
            }
          };

          $scope.showEditorPanel = false;
          $scope.edit = function () {
            $scope.showEditorPanel = !$scope.showEditorPanel;
          };

          $scope.exit = function () {
            $scope.splashScreen = undefined;
            if (angular.isDefined($stateParams.ctx) && $stateParams.ctx !== '') {
              if ($scope.operationMode === OPERATION_MODE.EDIT) {
                $location.path("esv-collab/edit");
              } else {
                $location.path("esv-collab/run");
              }
            } else {
              $location.path("esv-web");
            }
          };
        }])
  ;
}());
