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

  class EditorToolbarController {
    constructor(
      $rootScope,
      $scope,
      $timeout,
      $location,
      $window,
      contextMenuState,
      userContextService,
      stateService,
      gz3d,
      editorsPanelService,
      userNavigationService,
      objectInspectorService,
      performanceMonitorService,
      nrpAnalytics,
      clbConfirm,
      environmentService,
      backendInterfaceService,
      environmentRenderingService,
      splash,
      simulationInfo,
      videoStreamService,
      dynamicViewOverlayService,
      helpTooltipService,
      editorToolbarService,
      gz3dViewsService,
      clientLoggerService,
      bbpConfig,
      STATE,
      NAVIGATION_MODES,
      EDIT_MODE,
      RESET_TYPE,
      DYNAMIC_VIEW_CHANNELS,
      rosCommanderService
    ) {
      this.backendInterfaceService = backendInterfaceService;
      this.clientLoggerService = clientLoggerService;
      this.contextMenuState = contextMenuState;
      this.dynamicViewOverlayService = dynamicViewOverlayService;
      this.editorsPanelService = editorsPanelService;
      this.editorToolbarService = editorToolbarService;
      this.environmentRenderingService = environmentRenderingService;
      this.environmentService = environmentService;
      this.gz3d = gz3d;
      this.clbConfirm = clbConfirm;
      this.helpTooltipService = helpTooltipService;
      this.nrpAnalytics = nrpAnalytics;
      this.objectInspectorService = objectInspectorService;
      this.performanceMonitorService = performanceMonitorService;
      this.simulationInfo = simulationInfo;
      this.splash = splash;
      this.stateService = stateService;
      this.userContextService = userContextService;
      this.userNavigationService = userNavigationService;
      this.videoStreamService = videoStreamService;
      this.demoMode = bbpConfig.get('demomode.demoCarousel', false);
      this.gz3dViewsService = gz3dViewsService;
      this.rosCommanderService = rosCommanderService;

      this.DYNAMIC_VIEW_CHANNELS = DYNAMIC_VIEW_CHANNELS;
      this.EDIT_MODE = EDIT_MODE;
      this.NAVIGATION_MODES = NAVIGATION_MODES;
      this.RESET_TYPE = RESET_TYPE;
      this.STATE = STATE;

      this.$timeout = $timeout;
      this.$location = $location;
      this.$window = $window;

      // Query the state of the simulation
      stateService.getCurrentState().then(() => {
        if (stateService.currentState === STATE.STOPPED) {
          // The Simulation is already Stopped, so do nothing more but show the alert popup
          userContextService.isJoiningStoppedSimulation = true;
          nrpAnalytics.eventTrack('Join-stopped', {
            category: 'Simulation'
          });
        } else {
          nrpAnalytics.durationEventTrack('Server-initialization', {
            category: 'Experiment'
          });
          nrpAnalytics.tickDurationEvent('Browser-initialization');

          environmentRenderingService.init();
          // Register for the status updates as well as the timing stats
          // Note that we have two different connections here, hence we only put one as a callback for
          // $rootScope.iface and the other one not!
          /* Listen for status informations */
          stateService.startListeningForStatusInformation();
          this.messageCallbackHandler = stateService.addMessageCallback(
            message => this.messageCallback(message)
          );
          this.stateCallbackHandler = stateService.addStateCallback(newState =>
            this.onStateChanged(newState)
          );
        }
      });

      this.checkIfVideoStreamsAvailable();
      $scope.$watch('vm.stateService.currentState', () => {
        //starting the experiment might publish new video streams, so we check again
        if (
          !this.editorToolbarService.videoStreamsAvailable &&
          this.stateService.currentState === this.STATE.STARTED
        ) {
          this.$timeout(() => this.checkIfVideoStreamsAvailable(), 500);
        }
      });

      //When resetting do something
      this.resetListenerUnbindHandler = $scope.$on(
        'RESET',
        (event, resetType) => {
          if (
            resetType === RESET_TYPE.RESET_FULL ||
            resetType === RESET_TYPE.RESET_WORLD
          ) {
            this.resetGUI();
          }
          this.clientLoggerService.logMessage('Reset EVENT occurred...');
        }
      );

      const esvPages = new Set(['esv-private', 'esv-web']);

      // force page reload when navigating to esv pages, to discard experiment related context
      // valid for all navigation reasons: explicit $location.path, or browser nav button
      $rootScope.$on('$stateChangeStart', (e, state) => {
        if (esvPages.has(state.name)) {
          $timeout(() => $window.location.reload());
        }
      });

      // clean up on leaving
      $scope.$on('$destroy', () => {
        /* NOT CALLED AUTOMATICALLY ON EXITING AN EXPERIMENT */
        /* possible cause of memory leaks */

        this.cleanUp();
      });

      this.updatePanelUI = function() {
        $rootScope.$broadcast('UPDATE_PANEL_UI');
      };

      this.notifyResetToWidgets = function(resetType) {
        $rootScope.$broadcast('RESET', resetType);
      };

      this.resetButtonClickHandler = function() {
        // this.request takes the radio button value from reset-checklist-template.html - TODO: can we refactor this as ClickHandler parameter?
        this.request = {
          resetType: this.RESET_TYPE.NO_RESET,
          contextId: this.simulationInfo.contextID
        };
        clbConfirm
          .open({
            title: 'Reset Menu',
            templateUrl: 'views/esv/reset-checklist-template.html',
            scope: $scope
          })
          .then(() => {
            stateService.ensureStateBeforeExecuting(STATE.PAUSED, () =>
              this.__resetButtonClickHandler(this.request)
            );
          });
      };
    }

    /**
     * Notify the widgets the reset events occurred on the backend side, e.g., from VirtualCoach
     * Hide the editor if visible, reset the UI
     */
    resetOccuredOnServer() {
      if (this.editorsPanelService.showEditorPanel) {
        this.editorsPanelService.toggleEditors();
      }
      // Close opened object inspectors. ResetType is 1
      this.notifyResetToWidgets(this.RESET_TYPE.RESET_FULL);
      this.updatePanelUI();
      this.gz3d.scene.resetView();
    }

    /* status messages are listened to here. A splash screen is opened to display progress messages. */
    /* This is the case when closing or resetting a simulation/environment for example.
    /* Loading is taken take of by a progressbar somewhere else. */
    /* Timeout messages are displayed in the toolbar. */
    messageCallback(message) {
      // prevent this analytics event from sent multiple time
      let analyticsEventTimeout = _.once(() => {
        this.nrpAnalytics.eventTrack('Timeout', {
          category: 'Simulation'
        });
      });

      /* Progress messages (except start state progress messages which are handled by another progress bar) */
      if (angular.isDefined(message.progress)) {
        if (angular.isDefined(message.progress.subtask)) {
          var loadingModel =
            message.progress.subtask.indexOf('Loading model') !== -1; // Loading Model messages are already handled by the asset loading splash screen.
        }

        var stateStopFailed =
          this.stateService.currentState === this.STATE.STOPPED ||
          this.stateService.currentState === this.STATE.FAILED;
        if (this.demoMode && stateStopFailed) {
          this.exitSimulation();
        } else {
          // In demo mode, we don't show the end splash screen,
          //TODO (Sandro): i think splashscreen stuff should be handled with a message callback inside the splashscreen service itself, not here
          //TODO: but first onSimulationDone() has to be moved to experiment service or replaced
          /* splashScreen == null means it has been already closed and should not be reopened */
          if (
            !loadingModel &&
            this.splash.splashScreen !== null &&
            !this.environmentRenderingService.sceneLoading &&
            (angular.isDefined(message.state) ||
              (stateStopFailed ||
                (angular.isDefined(message.progress.subtask) &&
                  message.progress.subtask.length > 0)))
          ) {
            this.splash.splashScreen =
              this.splash.splashScreen ||
              this.splash.open(
                !message.progress.block_ui,
                stateStopFailed ? () => this.exit() : undefined
              );
          }
          if (
            angular.isDefined(message.progress.done) &&
            message.progress.done
          ) {
            this.splash.spin = false;
            this.splash.setMessage({ headline: 'Finished' });
            /* if splash is a blocking modal (no button), then close it*/
            /* (else it is closed by the user on button click) */
            if (!this.splash.showButton) {
              // blocking modal -> we using the splash for some in-simulation action (e.g. resetting),
              // so we don't have to close the websocket, just the splash screen.
              this.resetOccuredOnServer();
              this.splash.close();
              this.splash.splashScreen = undefined;
            } else {
              // the modal is non blocking (i.e. w/ button) ->
              // we are closing the simulation thus we have to
              // cleanly close ros websocket and stop window
              this.onSimulationDone();
            }
          } else {
            this.splash.setMessage({
              headline: message.progress.task,
              subHeadline: message.progress.subtask
            });
          }
        }
      }
      /* Time messages */
      if (angular.isDefined(message.timeout)) {
        if (parseInt(message.timeout, 10) < 1.0) {
          analyticsEventTimeout();
        }
        this.simulationInfo.simTimeoutText = message.timeout;
      }
      if (angular.isDefined(message.simulationTime)) {
        this.simulationInfo.simulationTimeText = message.simulationTime;
      }
      if (angular.isDefined(message.realTime)) {
        this.simulationInfo.realTimeText = message.realTime;
      }
      this.performanceMonitorService.processStateChange(message);
    }

    onStateChanged(newState) {
      if (
        newState === this.STATE.STOPPED &&
        this.gz3d.iface &&
        this.gz3d.iface.webSocket
      ) {
        this.gz3d.iface.webSocket.disableRebirth();
      }
    }

    resetGUI() {
      this.gz3d.scene.resetView(); //update the default camera position, if defined
      if (this.objectInspectorService !== null) {
        this.gz3d.scene.selectEntity(null);
        this.dynamicViewOverlayService.closeAllOverlaysOfType(
          this.DYNAMIC_VIEW_CHANNELS.OBJECT_INSPECTOR
        );
      }
    }

    onSimulationDone() {
      this.closeSimulationConnections();
      // unregister the message callback
      this.stateService.removeMessageCallback(this.messageCallbackHandler);
      this.stateService.removeStateCallback(this.stateCallbackHandler);
    }

    closeSimulationConnections() {
      // Stop listening for status messages
      if (this.gz3d.iface && this.gz3d.iface.webSocket) {
        this.gz3d.iface.webSocket.close();
      }
      // Stop listening for status messages
      this.stateService.stopListeningForStatusInformation();
    }

    exit(quitDemo) {
      this.exitSimulation(quitDemo);
    }

    exitSimulation(quitDemo) {
      this.cleanUp();

      this.splash.splashScreen = null; // do not reopen splashscreen if further messages happen
      if (this.environmentService.isPrivateExperiment()) {
        this.$location.path('esv-private');
      } else {
        if (this.demoMode && !quitDemo) {
          this.$location.path('esv-demo-wait');
        } else {
          this.$location.path('esv-web');
        }
      }
    }

    cleanUp() {
      this.environmentRenderingService.deinit();
      this.clientLoggerService.onExit();

      // unbind resetListener callback
      this.resetListenerUnbindHandler();
      this.nrpAnalytics.durationEventTrack('Simulate', {
        category: 'Simulation'
      });

      if (this.environmentService.isPrivateExperiment()) {
        this.editorsPanelService.deinit();
        this.userContextService.deinit();
      }

      this.closeSimulationConnections();
    }

    updateSimulation(newState) {
      this.stateService.setCurrentState(newState);
    }

    // play/pause/stop button handler
    simControlButtonHandler(newState) {
      this.updateSimulation(newState);
      this.setEditMode(this.EDIT_MODE.VIEW);
      if (this.objectInspectorService !== null) {
        this.objectInspectorService.removeEventListeners();
      }
    }

    setEditMode(newMode) {
      //currentMode !== newMode
      if (this.gz3d.scene.manipulationMode !== newMode) {
        this.gz3d.scene.setManipulationMode(newMode);
      }
    }

    __resetButtonClickHandler(request) {
      const resetType = request.resetType;
      if (resetType === this.RESET_TYPE.NO_RESET) {
        return;
      }

      this.stateService.setCurrentState(this.STATE.PAUSED);

      if (this.editorsPanelService.showEditorPanel) {
        this.editorsPanelService.toggleEditors();
      }
      this.dynamicViewOverlayService.closeAllOverlaysOfType(
        this.DYNAMIC_VIEW_CHANNELS.OBJECT_INSPECTOR
      );

      this.$timeout(() => {
        if (
          resetType === this.RESET_TYPE.RESET_BRAIN ||
          resetType === this.RESET_TYPE.RESET_CAMERA_VIEW ||
          resetType === this.RESET_TYPE.RESET_ROBOT_POSE
        ) {
          // send out notifications on button click only for resets not currently being caught via backend messages
          // right now only resets that cause a state change in backend will be registered in messageCallback()
          this.notifyResetToWidgets(resetType);
        }

        if (resetType >= 256) {
          // Frontend-bound reset
          if (resetType === this.RESET_TYPE.RESET_CAMERA_VIEW) {
            this.gz3d.scene.resetView();
          }
        } else {
          // Backend-bound reset
          this.splash.splashScreen =
            this.splash.splashScreen || this.splash.open(false, undefined);
          if (this.environmentService.isPrivateExperiment()) {
            //reset from collab
            //open splash screen, blocking ui (i.e. no ok button) and no closing callback

            let resetWhat = '',
              downloadWhat = '';

            (resetType => {
              //customize user message depending on the reset type
              if (resetType === this.RESET_TYPE.RESET_WORLD) {
                resetWhat = 'Environment';
                downloadWhat = 'World SDF ';
              } else if (resetType === this.RESET_TYPE.RESET_BRAIN) {
                resetWhat = 'Brain';
                downloadWhat = 'brain configuration file ';
              }
            })(resetType);

            const messageHeadline = 'Resetting ' + resetWhat;
            const messageSubHeadline =
              'Downloading ' + downloadWhat + 'from the Storage';

            _.defer(() => {
              this.splash.spin = true;
              this.splash.setMessage({
                headline: messageHeadline,
                subHeadline: messageSubHeadline
              });
            });

            this.backendInterfaceService.resetCollab(
              request,
              this.splash.closeSplash,
              this.splash.closeSplash
            );
          } else {
            //other kinds of reset
            this.backendInterfaceService.reset(
              request,
              () => {
                // Success callback
                // do not close the splash if successful
                // it will be closed by messageCallback
                this.gz3d.scene.applyComposerSettings(true, false);
                this.splash.closeSplash();
                if (resetType === this.RESET_TYPE.RESET_BRAIN) {
                  this.updatePanelUI();
                }
              },
              this.splash.closeSplash
            );
          }
        }
      }, 100);
    }

    // Lights management
    modifyLightClickHandler(direction) {
      if (
        (direction < 0 && this.gz3d.isGlobalLightMinReached()) ||
        (direction > 0 && this.gz3d.isGlobalLightMaxReached())
      ) {
        return;
      }

      this.gz3d.scene.emitter.emit('lightChanged', direction * 0.1);
    }

    // Camera manipulation
    // This should be integrated to the tutorial story when
    // it will be implemented !
    requestMove(event, action) {
      if (event.which === 1) {
        // camera control uses left button only
        this.gz3d.scene.controls.onMouseDownManipulator(action);
      }
    }

    releaseMove(event, action) {
      if (event.which === 1) {
        // camera control uses left button only
        this.gz3d.scene.controls.onMouseUpManipulator(action);
      }
    }

    // robot view
    robotViewButtonClickHandler() {
      if (!this.gz3dViewsService.hasCameraView()) {
        return;
      }

      var allHidden = true;

      this.gz3dViewsService.views.forEach(view => {
        if (view.name !== 'main_view' && view.container !== undefined) {
          allHidden = false;
        }
      });

      if (allHidden) {
        // open overlays for every view that doesn't have a container
        this.gz3dViewsService.views.forEach(view => {
          if (view.container === undefined) {
            this.dynamicViewOverlayService.createDynamicOverlay(
              this.DYNAMIC_VIEW_CHANNELS.ENVIRONMENT_RENDERING
            );
          }
        });
      } else {
        this.dynamicViewOverlayService.closeAllOverlaysOfType(
          this.DYNAMIC_VIEW_CHANNELS.ENVIRONMENT_RENDERING
        );
      }

      this.nrpAnalytics.eventTrack('Toggle-robot-view', {
        category: 'Simulation-GUI',
        value: true
      });
    }

    navigationModeMenuClickHandler() {
      this.editorToolbarService.showNavigationModeMenu = !this
        .editorToolbarService.showNavigationModeMenu;
    }

    editorMenuClickHandler() {
      this.editorToolbarService.showEditorMenu = !this.editorToolbarService
        .showEditorMenu;
    }

    setNavigationMode(mode) {
      switch (mode) {
        case this.NAVIGATION_MODES.FREE_CAMERA:
          this.userNavigationService.setModeFreeCamera();
          break;

        case this.NAVIGATION_MODES.GHOST:
          this.userNavigationService.setModeGhost();
          break;

        case this.NAVIGATION_MODES.HUMAN_BODY:
          if (this.stateService.currentState !== this.STATE.PAUSED) {
            this.userNavigationService.setModeHumanBody();
          }
          break;

        case this.NAVIGATION_MODES.LOOKAT_ROBOT:
          this.userNavigationService.setLookatRobotCamera();
          break;
      }
    }

    codeEditorButtonClickHandler() {
      if (
        this.userContextService.editIsDisabled ||
        this.editorsPanelService.loadingEditPanel
      ) {
        return;
      } else {
        return this.editorsPanelService.toggleEditors();
      }
    }

    checkIfVideoStreamsAvailable() {
      this.videoStreamService.getStreamUrls().then(videoStreams => {
        this.editorToolbarService.videoStreamsAvailable =
          videoStreams && !!videoStreams.length;
      });
    }

    /**
    * Toogle the video stream widget visibility
    */
    videoStreamsToggle() {
      if (!this.editorToolbarService.videoStreamsAvailable) {
        return;
      }

      this.dynamicViewOverlayService.createDynamicOverlay(
        this.DYNAMIC_VIEW_CHANNELS.STREAM_VIEWER
      );
    }

    environmentSettingsClickHandler() {
      if (this.environmentRenderingService.loadingEnvironmentSettingsPanel) {
        return;
      } else {
        this.editorToolbarService.showEnvironmentSettingsPanel = !this
          .editorToolbarService.isEnvironmentSettingsPanelActive;
        this.nrpAnalytics.eventTrack('Toggle-environment-settings-panel', {
          category: 'Simulation-GUI',
          value: this.editorToolbarService.showEnvironmentSettingsPanel
        });
      }
    }

    // Spiketrain
    spikeTrainButtonClickHandler() {
      this.editorToolbarService.showSpikeTrain = !this.editorToolbarService
        .isSpikeTrainActive;
      this.nrpAnalytics.eventTrack('Toggle-spike-train', {
        category: 'Simulation-GUI',
        value: this.editorToolbarService.isSpikeTrainActive
      });
    }
  }

  EditorToolbarController.$$ngIsClass = true;
  EditorToolbarController.$inject = [
    '$rootScope',
    '$scope',
    '$timeout',
    '$location',
    '$window',
    'contextMenuState',
    'userContextService',
    'stateService',
    'gz3d',
    'editorsPanelService',
    'userNavigationService',
    'objectInspectorService',
    'performanceMonitorService',
    'nrpAnalytics',
    'clbConfirm',
    'environmentService',
    'backendInterfaceService',
    'environmentRenderingService',
    'splash',
    'simulationInfo',
    'videoStreamService',
    'dynamicViewOverlayService',
    'helpTooltipService',
    'editorToolbarService',
    'gz3dViewsService',
    'clientLoggerService',
    'bbpConfig',
    'STATE',
    'NAVIGATION_MODES',
    'EDIT_MODE',
    'RESET_TYPE',
    'DYNAMIC_VIEW_CHANNELS',
    'rosCommanderService'
  ];

  angular
    .module('editorToolbarModule', [
      'helpTooltipModule',
      'clb-ui-dialog',
      'rosTerminalModule'
    ])
    .controller('EditorToolbarController', EditorToolbarController);
})();
