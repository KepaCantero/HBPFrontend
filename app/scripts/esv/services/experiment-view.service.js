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

  class ExperimentViewService {
    constructor(
      $window,
      $location,
      $rootScope,
      $timeout,
      DYNAMIC_VIEW_CHANNELS,
      EDIT_MODE,
      RESET_TYPE,
      STATE,
      backendInterfaceService,
      bbpConfig,
      clbConfirm,
      dynamicViewOverlayService,
      environmentRenderingService,
      environmentService,
      gz3d,
      nrpAnalytics,
      nrpModalService,
      objectInspectorService,
      performanceMonitorService,
      simulationInfo,
      splash,
      stateService,
      userContextService,
      storageServer
    ) {
      this.$window = $window;
      this.$location = $location;
      this.$rootScope = $rootScope;
      this.$timeout = $timeout;

      this.DYNAMIC_VIEW_CHANNELS = DYNAMIC_VIEW_CHANNELS;
      this.EDIT_MODE = EDIT_MODE;
      this.RESET_TYPE = RESET_TYPE;
      this.STATE = STATE;

      this.backendInterfaceService = backendInterfaceService;
      this.bbpConfig = bbpConfig;
      this.clbConfirm = clbConfirm;
      this.dynamicViewOverlayService = dynamicViewOverlayService;
      this.environmentRenderingService = environmentRenderingService;
      this.environmentService = environmentService;
      this.gz3d = gz3d;
      this.nrpAnalytics = nrpAnalytics;
      this.nrpModalService = nrpModalService;
      this.objectInspectorService = objectInspectorService;
      this.performanceMonitorService = performanceMonitorService;
      this.simulationInfo = simulationInfo;
      this.splash = splash;
      this.stateService = stateService;
      this.userContextService = userContextService;
      this.storageServer = storageServer;

      //When resetting do something
      this.resetListenerUnbindHandler = $rootScope.$on(
        'RESET',
        (event, resetType) => {
          if (
            resetType === RESET_TYPE.RESET_FULL ||
            resetType === RESET_TYPE.RESET_WORLD
          ) {
            this.resetGUI();
          }
        }
      );

      $rootScope.$on('ENTER_SIMULATION', () => {
        // Query the state of the simulation
        stateService.getCurrentState().then(() => {
          if (stateService.currentState !== STATE.STOPPED) {
            // Register for the status updates as well as the timing stats
            // Note that we have two different connections here, hence we only put one as a callback for
            // $rootScope.iface and the other one not!
            /* Listen for status information */
            stateService.startListeningForStatusInformation();
            this.messageCallbackHandler = stateService.addMessageCallback(
              message => this.messageCallback(message)
            );
            this.stateCallbackHandler = stateService.addStateCallback(
              newState => this.onStateChanged(newState)
            );
          }
        });
      });
    }

    isInSimulationView() {
      return this.$location.$$url.includes('experiment-view');
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
        let loadingModel = false;
        if (angular.isDefined(message.progress.subtask)) {
          loadingModel =
            message.progress.subtask.indexOf('Loading model') !== -1; // Loading Model messages are already handled by the asset loading splash screen.
        }

        var stateStopFailed =
          this.stateService.currentState === this.STATE.STOPPED ||
          this.stateService.currentState === this.STATE.FAILED;

        let demoMode = this.bbpConfig.get('demomode.demoCarousel', false);
        if (demoMode && stateStopFailed) {
          this.exitSimulation();
        } else {
          // In demo mode, we don't show the end splash screen,
          //TODO (Sandro): i think splash-screen stuff should be handled with a message callback inside the splashscreen service itself, not here
          //TODO: but first onSimulationDone() has to be moved to experiment service or replaced
          /* splashScreen == null means it has been already closed and should not be reopened */

          if (
            !loadingModel &&
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
                stateStopFailed ? () => this.exitSimulation() : undefined
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
        this.simulationInfo.timeoutType = message.timeout_type;
      }
      if (angular.isDefined(message.simulationTime)) {
        this.simulationInfo.simulationTimeText = message.simulationTime;
      }
      if (angular.isDefined(message.realTime)) {
        this.simulationInfo.realTimeText = message.realTime;
      }
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

    /**
     * Notify the widgets the reset events occurred on the backend side, e.g., from VirtualCoach
     * Hide the editor if visible, reset the UI
     */
    resetOccuredOnServer() {
      //Workaround for resetting correctly the PBR textures
      if (
        this.resetRequest.resetType == this.RESET_TYPE.RESET_WORLD ||
        this.resetRequest.resetType == this.RESET_TYPE.RESET_FULL
      ) {
        this.gz3d.scene.composerSettings.pbrMaterial = this.pbrMaterial;
        this.gz3d.scene.applyComposerSettings();
      }
      // Close opened object inspectors. ResetType is 1
      this.notifyResetToWidgets(this.RESET_TYPE.RESET_FULL);
      this.updatePanelUI();
      this.gz3d.scene.resetView();
    }

    onSimulationDone() {
      this.closeSimulationConnections();
      // unregister the message callback
      this.stateService.removeMessageCallback(this.messageCallbackHandler);
      this.stateService.removeStateCallback(this.stateCallbackHandler);
    }

    //TODO: (@SandroWeber) taken from editor-toolbar.controller ... move this, let service react to close down themselves
    closeSimulationConnections() {
      // Stop listening for status messages
      this.stateService.stopListeningForStatusInformation();
    }

    setSimulationState(newState) {
      this.stateService.setCurrentState(newState);

      if (
        this.gz3d.scene &&
        this.gz3d.scene.manipulationMode !== this.EDIT_MODE.VIEW
      ) {
        this.gz3d.scene.setManipulationMode(this.EDIT_MODE.VIEW);
      }

      if (this.objectInspectorService !== null) {
        this.objectInspectorService.removeEventListeners();
      }
    }

    resetSimulation() {
      this.resetRequest = {
        resetType: this.RESET_TYPE.NO_RESET,
        contextId: this.simulationInfo.contextID
      };
      let resetMenuPopupScope = this.$rootScope.$new();
      resetMenuPopupScope.vm = this;
      this.clbConfirm
        .open({
          title: 'Reset Menu',
          templateUrl: 'views/esv/reset-checklist-template.html',
          scope: resetMenuPopupScope
        })
        .then(() => {
          this.stateService.ensureStateBeforeExecuting(
            this.STATE.PAUSED,
            () => {
              const resetType = this.resetRequest.resetType;
              if (resetType === this.RESET_TYPE.NO_RESET) {
                return;
              }

              this.stateService.setCurrentState(this.STATE.PAUSED);

              this.dynamicViewOverlayService.closeAllOverlaysOfType(
                this.DYNAMIC_VIEW_CHANNELS.OBJECT_INSPECTOR
              );

              this.$timeout(() => {
                if (
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
                    this.splash.splashScreen ||
                    this.splash.open(false, undefined);

                  //open splash screen, blocking ui (i.e. no ok button) and no closing callback

                  let resetWhat = '',
                    downloadWhat = '';

                  if (resetType === this.RESET_TYPE.RESET_WORLD) {
                    resetWhat = 'Environment';
                    downloadWhat = 'World SDF ';
                  }

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

                  //Workaround for resetting correctly the PBR textures
                  this.pbrMaterial = this.gz3d.scene.composerSettings.pbrMaterial;
                  this.gz3d.scene.composerSettings.pbrMaterial = true;
                  this.gz3d.scene.applyComposerSettings();

                  this.backendInterfaceService.resetCollab(
                    this.resetRequest,
                    this.splash.closeSplash,
                    this.splash.closeSplash
                  );
                }
              }, 150);
            }
          );
        });
    }

    openExitDialog() {
      let exitDialogScope = this.$rootScope.$new();
      exitDialogScope.vm = this;
      let exitSimulationTemplate = {
        templateUrl:
          'components/editor-toolbar/exit-simulation-dialog.template.html',
        closable: true,
        scope: exitDialogScope
      };
      this.nrpModalService.createModal(exitSimulationTemplate);
    }

    exitSimulation() {
      let isDemoMode = this.bbpConfig.get('demomode.demoCarousel', false);
      if (isDemoMode) {
        this.cleanUp();
        this.splash.splashScreen = null; // do not reopen splashscreen if further messages happen
        this.$location.path('esv-demo');
      } else {
        this.cleanUp();
        this.splash.splashScreen = null; // do not reopen splashscreen if further messages happen
        this.$window.location.href = this.$location.path(
          'esv-private'
        ).$$absUrl;
        this.$window.location.reload();
      }
    }

    stopSimulation() {
      this.storageServer.logActivity('simulation_stop', {
        simulationID: this.simulationInfo.experimentID
      });
      this.setSimulationState(this.STATE.STOPPED);
    }

    //TODO: (@SandroWeber) taken from editor-toolbar.controller ... move this, services should clean up after themselves
    cleanUp() {
      this.broadcastExitSimulation();

      // unbind resetListener callback
      this.resetListenerUnbindHandler();
      this.nrpAnalytics.durationEventTrack('Simulate', {
        category: 'Simulation'
      });

      if (this.environmentService.isPrivateExperiment()) {
        this.userContextService.deinit();
      }

      this.closeSimulationConnections();
    }

    //TODO: (@SandroWeber) move this to their respective services, they can react to RESET events themselves
    resetGUI() {
      this.gz3d.scene.resetView(); //update the default camera position, if defined
      this.gz3d.scene.selectEntity(null);
    }

    notifyResetToWidgets(resetType) {
      this.$rootScope.$broadcast('RESET', resetType);
    }

    updatePanelUI() {
      this.$rootScope.$broadcast('UPDATE_PANEL_UI');
    }

    broadcastExitSimulation() {
      this.$rootScope.$broadcast('EXIT_SIMULATION');
    }

    broadcastEnterSimulation() {
      this.$rootScope.$broadcast('ENTER_SIMULATION');
    }
  }

  ExperimentViewService.$$ngIsClass = true;
  ExperimentViewService.$inject = [
    '$window',
    '$location',
    '$rootScope',
    '$timeout',
    'DYNAMIC_VIEW_CHANNELS',
    'EDIT_MODE',
    'RESET_TYPE',
    'STATE',
    'backendInterfaceService',
    'bbpConfig',
    'clbConfirm',
    'dynamicViewOverlayService',
    'environmentRenderingService',
    'environmentService',
    'gz3d',
    'nrpAnalytics',
    'nrpModalService',
    'objectInspectorService',
    'performanceMonitorService',
    'simulationInfo',
    'splash',
    'stateService',
    'userContextService',
    'storageServer'
  ];

  angular
    .module('exdFrontendApp')
    .service('experimentViewService', ExperimentViewService);
})();
