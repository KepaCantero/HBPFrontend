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

  angular.module('exdFrontendApp.Constants', [])
    // constants for the server side status
    .constant('STATE', {
      CREATED: 'created',
      STARTED: 'started',
      PAUSED: 'paused',
      INITIALIZED: 'initialized',
      STOPPED: 'stopped',
      UNDEFINED: 'undefined'
    })
    .constant('ERROR', {
      UNDEFINED_STATE: 'The latest active simulation is corrupted: undefined state.',
      UNDEFINED_ID: 'The latest active simulation is corrupted: undefined id.'
    });

  angular.module('exdFrontendApp')
    .controller('Gz3dViewCtrl', ['$rootScope', '$scope', '$stateParams', '$timeout', '$location', '$http', '$window', '$document', 'bbpConfig',
      'gzInitialization', 'hbpUserDirectory', 'simulationGenerator', 'simulationService', 'simulationControl',
      'simulationState', 'simulationStatistics', 'serverError','lightControl', 'screenControl',
      'timeDDHHMMSSFilter', 'splash', 'assetLoadingSplash', 'roslib', 'STATE', 'ERROR', 'nrpBackendVersions',
      'nrpFrontendVersion',
        function ($rootScope, $scope, $stateParams, $timeout, $location, $http, $window, $document, bbpConfig,
          gzInitialization, hbpUserDirectory, simulationGenerator, simulationService, simulationControl,
          simulationState, simulationStatistics, serverError,
          lightControl, screenControl,
          timeDDHHMMSSFilter, splash, assetLoadingSplash, roslib, STATE, ERROR, nrpBackendVersions,
          nrpFrontendVersion) {

      if (!$stateParams.serverID || !$stateParams.simulationID){
        throw "No serverID or simulationID given.";
      }
      var serverID = $stateParams.serverID;
      var simulationID = $stateParams.simulationID;
      var serverConfig = bbpConfig.get('api.neurorobotics')[serverID];
      var serverBaseUrl = serverConfig.gzweb['nrp-services'];

      gzInitialization.Initialize($stateParams.serverID, $stateParams.simulationID);

      $scope.helpModeActivated = false;

      $scope.rosbridgeWebsocketUrl = serverConfig.rosbridge.websocket;
      $scope.spikeTopic = serverConfig.rosbridge.topics.spikes;

      $scope.state = STATE.UNDEFINED;
      $scope.STATE = STATE;
      $scope.isOwner = false;

      hbpUserDirectory.getCurrentUser().then(function (profile) {
        $scope.userName = profile.displayName;
        $scope.userID = profile.id;
        simulationControl(serverBaseUrl).simulation({sim_id: simulationID}, function(data){
          $scope.ownerID = data.owner;
          var experimentID = data.experimentID;
          $http.get('views/esv/experiment_templates.json').success(function (experimentData) {
            $scope.ExperimentDescription = experimentData[experimentID].snippet;
          });
          hbpUserDirectory.get([data.owner]).then(function (profile)
          {
            $scope.owner = simulationService().getUserName(profile);
          });
          $scope.isOwner = ($scope.ownerID === $scope.userID);
        });
      });


      $scope.isInitialized = false;

      simulationState(serverBaseUrl).state({sim_id: simulationID}, function(data){
        $scope.state = data.state;
        $scope.registerForStatusInformation();
      });

      $scope.versions = {};
      nrpFrontendVersion.get(function(data) { $scope.versions.hbp_nrp_esv = data.hbp_nrp_esv; });
      nrpBackendVersions(serverBaseUrl).get(function(data) {
        $scope.versions = angular.extend($scope.versions, data);
      });
      /* status messages are listened to here. A splash screen is opened to display progress messages. */
      /* This is the case when closing an simulation for example. Loading is taken take of */
      /* by a progressbar somewhere else. */
      /* Timeout messages are displayed in the toolbar. */
      $scope.registerForStatusInformation = function() {
          var rosbridgeWebsocketUrl = $scope.rosbridgeWebsocketUrl;
          var statusTopic = serverConfig.rosbridge.topics.status;
          var callbackOnClose = function() {
            $scope.splashScreen = undefined;
            /* avoid "$apply already in progress" error */
            _.defer(function() { // jshint ignore:line
              $scope.$apply(function() { $location.path("/"); });
            });
          };

          $scope.rosConnection = $scope.rosConnection || roslib.getOrCreateConnectionTo(rosbridgeWebsocketUrl);
          $scope.statusListener = $scope.statusListener || roslib.createStringTopic($scope.rosConnection, statusTopic);

          $scope.statusListener.unsubscribe(); // clear old subscriptions
          $scope.statusListener.subscribe(function (data) {
            var message = JSON.parse(data.data);
            /* State messages */
            /* Manage before other since others may depend on state changes */
            if (message !== undefined && message.state !== undefined) {
              $scope.$apply(function() { $scope.state = message.state; });
            }
            /* Progress messages (apart start state progress messages which are handled by another progress bar) */
            if (message !== undefined && message.progress !== undefined && $scope.state !== STATE.STARTED ) {
              $scope.splashScreen = $scope.splashScreen || splash.open(
                  !message.progress.block_ui,
                  (($scope.state === STATE.STOPPED) ? callbackOnClose : undefined));
              if (message.progress.done !== undefined && message.progress.done) {
                splash.spin = false;
                splash.setMessage({ headline: 'Finished' });

                /* if splash is a blocking modal (no button), then close it */
                /* (else it is closed by the user on button click) */
                if (!splash.showButton) {
                  splash.close();
                  $scope.splashScreen = undefined;
                }
              } else {
                splash.setMessage({ headline: message.progress.task, subHeadline: message.progress.subtask });
              }
            }
            /* Timeout messages */
            if (message !== undefined && message.timeout !== undefined) {
              $scope.$apply(function() { $scope.simTimeoutText = message.timeout; });
            }
          });
      };

      $scope.assetLoadingSplashScreen = $scope.assetLoadingSplashScreen || assetLoadingSplash.open();
      $rootScope.iface.setAssetProgressCallback(function(data){
        assetLoadingSplash.setProgress(data);
      });

      $scope.updateSimulation = function (newState) {
        simulationState(serverBaseUrl).update({sim_id: simulationID}, {state: newState}, function(data) {
          $scope.state = data.state;
        }, function(data) {
          serverError(data);
        }
        );
      };

      simulationStatistics.setRealTimeCallback(function (realTimeValue) {
        $scope.$apply(function() {
          $scope.realTimeText = realTimeValue;
        });
      });

      simulationStatistics.setSimulationTimeCallback(function (simulationTimeValue) {
        $scope.$apply(function() {
          $scope.simulationTimeText = simulationTimeValue;
        });
      });

      // stores, whether the context menu should be displayed
      $scope.isContextMenuShown = false;

      // the position of the context menu
      $scope.contextMenuTop = 0;
      $scope.contextMenuLeft = 0;

      $scope.getModelUnderMouse = function(event) {
        var pos = new THREE.Vector2(event.clientX, event.clientY);
        var intersect = new THREE.Vector3();
        var model = $rootScope.scene.getRayCastModel(pos, intersect);
        return model;
      };

      // for convenience we pass just a string as "red" or "blue" currently, this will be replaced later on
      $scope.setColorOnEntity = function (value) {
        if(!$scope.selectedEntity) {
          console.error('Could not change screen color since there was no object selected');
          return;
        }
        var colors = {red: 0xff0000, blue: 0x0000ff};

        // the following line would change the color for a simple box
        //var entityToChange = scene.getByName(scene.selectedEntity.name + "::link::visual");

        // since we currently want restrict ourselves to screens we go with:
        var entityToChange = $rootScope.scene.getByName($scope.selectedEntity.name + '::body::screen_glass');
        var child = entityToChange.children[0];
        var material = child ? child.material : undefined;

        if (entityToChange && child && material && colors[value]) {
          // send RESTful commands to server
          var screenParams = {};

          if (($scope.selectedEntity.name === 'right_vr_screen') && (value === 'red'))
          {
            screenParams.name = 'RightScreenToRed';
          }
          else if (($scope.selectedEntity.name === 'left_vr_screen') && (value === 'red'))
          {
            screenParams.name = 'LeftScreenToRed';
          }
          else if (($scope.selectedEntity.name === 'right_vr_screen') && (value === 'blue'))
          {
            screenParams.name = 'RightScreenToBlue';
          }
          else if (($scope.selectedEntity.name === 'left_vr_screen') && (value === 'blue'))
          {
            screenParams.name = 'LeftScreenToBlue';
          }

          screenControl(serverBaseUrl).updateScreenColor({sim_id: simulationID}, screenParams);
        }

        // deactivate the context menu after a color was assigned
        $scope.toggleScreenChangeMenu(false);
      };

      // this menu is currently only displayed if the model name contains "screen"
      $scope.toggleScreenChangeMenu = function (show, event) {
        if($scope.isOwner) {
          if (show) {
            if (!$scope.isContextMenuShown) {
              var model = $scope.getModelUnderMouse(event);
              // scene.radialMenu.showing is a property of GZ3D that was originally used to display a radial menu, We are
              // reusing it for our context menu. The reason is that this variables disables or enables the controls of
              // scene in the render loop.
              $rootScope.scene.radialMenu.showing = $scope.isContextMenuShown =
                (model &&
                model.name !== '' &&
                model.name !== 'plane' &&
                model.name.indexOf('screen') !== -1 &&
                $rootScope.scene.modelManipulator.pickerNames.indexOf(model.name) === -1);


              $scope.contextMenuTop = event.clientY;
              $scope.contextMenuLeft = event.clientX;
              $scope.selectedEntity = $rootScope.scene.selectedEntity;
            }
          }
          else {
            $scope.isContextMenuShown = false;
            $rootScope.scene.radialMenu.showing = false;
          }
        }

      };

      // Lights management
      $scope.sliderPosition = 50;
      $scope.updateLightIntensities = function(sliderPosition) {
        var ratio = (sliderPosition - 50.0) / 50.25; // turns the slider position (in [0,100]) into an increase/decrease ratio (in [-1, 1])
        // we avoid purposedly -1.0 when dividing by 50 + epsilon -- for zero intensity cannot scale to a positive value!
        $rootScope.scene.emitter.emit('lightChanged', ratio);
      };

      // Camera manipulation
      var hasNavigationAlreadyBeenClicked = false;
      $scope.showKeyboardControlInfoDiv = false;

      // This should be integrated to the tutorial story when
      // it will be implemented !
      function showKeyboardControlInfo() {
        if (!hasNavigationAlreadyBeenClicked)
        {
          hasNavigationAlreadyBeenClicked = true;
          $scope.showKeyboardControlInfoDiv = true;
          $timeout(function () {
            $scope.showKeyboardControlInfoDiv = false;
          }, 20000);
        }
      }

      $scope.requestMove = function (action) {
        $rootScope.scene.controls.onMouseDownManipulator(action);
      };

      $scope.releaseMove = function (action) {
        $rootScope.scene.controls.onMouseUpManipulator(action);
      };


      // Spiketrain
      $scope.showSpikeTrain = false;
      $scope.toggleSpikeTrain = function() {
        $scope.showSpikeTrain = !$scope.showSpikeTrain;
      };

      // help mode
      $scope.toggleHelpMode = function() {
        $scope.helpModeActivated = !$scope.helpModeActivated;
      };

      // clean up on leaving
      $scope.$on("$destroy", function() {
        // Close the splash screens
        if (angular.isDefined($scope.splashScreen)) {
          splash.close();
          delete $scope.splashScreen;
        }
        if (angular.isDefined($scope.assetLoadingSplashScreen)) {
          assetLoadingSplash.close();
          delete $scope.assetLoadingSplashScreen;
        }
        // unregister to the statustopic
        if (angular.isDefined($scope.statusListener)) {
          $scope.statusListener.unsubscribe();
        }
        // Close the roslib connections
        if (angular.isDefined($scope.rosConnection)) {
          $scope.rosConnection.close();
        }
        if (angular.isDefined($rootScope.iface) && angular.isDefined($rootScope.iface.webSocket)) {
          $rootScope.iface.webSocket.close();
        }
        gzInitialization.deInitialize();

        // Stop/Cancel loading assets
        // The window.stop() method is not supported by Internet Explorer
        // https://developer.mozilla.org/de/docs/Web/API/Window/stop
        if(angular.isDefined($window.stop)) {
          $window.stop();
        }
        else if(angular.isDefined($document.execCommand)) {
          $document.execCommand("Stop", false);
        }
      });
    }]);
}());
