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
      rosCommanderService,
      tipTooltipService,
      TIP_CODES,
      nrpModalService,
      autosaveOnExitService
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
      this.tipTooltipService = tipTooltipService;
      this.toolbarMinimized =
        localStorage.getItem('toolbarMinimized') == 'true';

      this.DYNAMIC_VIEW_CHANNELS = DYNAMIC_VIEW_CHANNELS;
      this.EDIT_MODE = EDIT_MODE;
      this.NAVIGATION_MODES = NAVIGATION_MODES;
      this.RESET_TYPE = RESET_TYPE;
      this.STATE = STATE;

      this.$timeout = $timeout;
      this.$location = $location;
      this.$window = $window;
      this.nrpModalService = nrpModalService;
      this.autosaveOnExitService = autosaveOnExitService;
      this.pbrMaterial = false;

      this.tipTooltipService.setCurrentTip(TIP_CODES.SIMULATIONS_TIPS);

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

      const esvPages = new Set(['esv-private']);

      // force page reload when navigating to esv pages, to discard experiment related context
      // valid for all navigation reasons: explicit $location.path, or browser nav button
      $rootScope.$on('$stateChangeStart', (e, state) => {
        if (esvPages.has(state.name)) {
          $timeout(() => $window.location.reload());
        }
      });

      // clean up on leaving
      $scope.$on('$destroy', () => {});

      this.toggleMinimizeToolbar = function() {
        this.toolbarMinimized = !this.toolbarMinimized;
        localStorage.setItem(
          'toolbarMinimized',
          this.toolbarMinimized ? 'true' : 'false'
        );
      };

      this.destroyDialog = function() {
        this.nrpModalService.destroyModal();
      };
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

    isOneRobotViewOpen() {
      if (!this.gz3dViewsService.hasCameraView()) {
        return false;
      }

      var allHidden = true;

      this.gz3dViewsService.views.forEach(view => {
        if (view.name !== 'main_view' && view.container !== undefined) {
          allHidden = false;
        }
      });

      return !allHidden;
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

        case this.NAVIGATION_MODES.LOOKAT:
          this.userNavigationService.setLookatCamera();
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
    'rosCommanderService',
    'tipTooltipService',
    'TIP_CODES',
    'nrpModalService',
    'autosaveOnExitService'
  ];

  angular
    .module('editorToolbarModule', [
      'helpTooltipModule',
      'clb-ui-dialog',
      'rosTerminalModule',
      'tipTooltipModule',
      'modal'
    ])
    .controller('EditorToolbarController', EditorToolbarController);
})();
