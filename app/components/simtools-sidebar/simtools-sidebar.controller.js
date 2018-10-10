/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file isLeaf = part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
 * https://www.humanbrainproject.eu
 *
 * The Human Brain Project isLeaf = a European Commission funded project
 * in the frame of the Horizon2020 FET Flagship plan.
 * http://ec.europa.eu/programmes/horizon2020/en/h2020-section/fet-flagships
 *
 * This program isLeaf = free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program isLeaf = distributed in the hope that it will be useful,
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

  let cameraTranslateButtonMapping = [
    [null, 'moveUp', 'moveForward'],
    ['moveLeft', 'initPosition', 'moveRight'],
    ['moveBackward', 'moveDown', null]
  ];
  let cameraRotateButtonMapping = [
    [null, 'rotateUp', null],
    ['rotateLeft', 'initRotation', 'rotateRight'],
    [null, 'rotateDown', null]
  ];
  let buttonMouseCoordinateOffset = [5, 5];

  let getCameraButtonThirds = mouseEvent => {
    let targetRect = mouseEvent.currentTarget.getClientRects()[0];
    let relX = Math.min(
      (mouseEvent.offsetX + buttonMouseCoordinateOffset[0]) / targetRect.width,
      1.0
    );
    let relY = Math.min(
      (mouseEvent.offsetY + buttonMouseCoordinateOffset[1]) / targetRect.height,
      1.0
    );
    let thirdX = Math.min(Math.floor(relX * 3), 2),
      thirdY = Math.min(Math.floor(relY * 3), 2);

    return [thirdX, thirdY];
  };

  class SimToolsSidebarController {
    constructor(
      $rootScope,
      $scope,
      $timeout,
      DYNAMIC_VIEW_CHANNELS,
      NAVIGATION_MODES,
      SIMTOOLS_SIDEBAR_ID,
      dynamicViewOverlayService,
      editorsPanelService,
      editorToolbarService,
      gz3d,
      gz3dViewsService,
      helpTooltipService,
      nrpAnalytics,
      simToolsSidebarService,
      userContextService,
      userNavigationService,
      videoStreamService,
      tipTooltipService,
      TIP_CODES
    ) {
      this.$scope = $scope;

      this.DYNAMIC_VIEW_CHANNELS = DYNAMIC_VIEW_CHANNELS;
      this.NAVIGATION_MODES = NAVIGATION_MODES;
      this.SIMTOOLS_SIDEBAR_ID = SIMTOOLS_SIDEBAR_ID;

      this.dynamicViewOverlayService = dynamicViewOverlayService;
      this.editorsPanelService = editorsPanelService;
      this.editorToolbarService = editorToolbarService;
      this.gz3d = gz3d;
      this.gz3dViewsService = gz3dViewsService;
      this.helpTooltipService = helpTooltipService;
      this.nrpAnalytics = nrpAnalytics;
      this.simToolsSidebarService = simToolsSidebarService;
      this.userContextService = userContextService;
      this.userNavigationService = userNavigationService;
      this.videoStreamService = videoStreamService;

      this.isSubmenuSceneNavigationOpen = false;
      this.isSubmenuLightingOpen = false;

      this.show = false;
      this.overflowing = [];
      this.expandedCategory = null;

      this.tipTooltipService = tipTooltipService;
      this.tipTooltipService.setCurrentTip(TIP_CODES.SIMULATIONS_TIPS);

      $rootScope.$on('ASSETS_LOADED', () => {
        this.show = true;
        $timeout(() => {
          this.overflowing[
            this.SIMTOOLS_SIDEBAR_ID.SIDEBAR
          ] = this.simToolsSidebarService.isOverflowingY(
            this.SIMTOOLS_SIDEBAR_ID.SIDEBAR
          );
        }, 100);
      });
    }

    onButtonLightIntensity(direction) {
      if (
        (direction < 0 && this.gz3d.isGlobalLightMinReached()) ||
        (direction > 0 && this.gz3d.isGlobalLightMaxReached())
      ) {
        return;
      }

      this.gz3d.scene.emitter.emit('lightChanged', direction * 0.1);
    }

    onButtonEditors() {
      if (
        this.userContextService.editIsDisabled ||
        this.editorsPanelService.loadingEditPanel
      ) {
        return;
      } else {
        return this.editorsPanelService.toggleEditors();
      }
    }

    onButtonToggleEditor(editorChannel) {
      if (this.userContextService.editIsDisabled) {
        return;
      }

      this.dynamicViewOverlayService.toggleDynamicViewOverlay(editorChannel);
    }

    onButtonVideoStreams() {
      if (!this.videoStreamService.videoStreamsAvailable) {
        return;
      }

      this.dynamicViewOverlayService.createDynamicOverlay(
        this.DYNAMIC_VIEW_CHANNELS.STREAM_VIEWER
      );
    }

    onButtonCameraTranslate(event) {
      let thirds = getCameraButtonThirds(event);
      let action =
        cameraTranslateButtonMapping[thirds[1]] &&
        cameraTranslateButtonMapping[thirds[1]][thirds[0]];
      if (action) {
        if (event.type === 'mousedown') {
          this.userNavigationService.requestCameraTransform(event, action);
        } else {
          this.userNavigationService.releaseCameraTransform(event, action);
        }
      }
    }

    onButtonCameraRotate(event) {
      let thirds = getCameraButtonThirds(event);
      let action =
        cameraRotateButtonMapping[thirds[1]] &&
        cameraRotateButtonMapping[thirds[1]][thirds[0]];
      if (action) {
        if (event.type === 'mousedown') {
          this.userNavigationService.requestCameraTransform(event, action);
        } else {
          this.userNavigationService.releaseCameraTransform(event, action);
        }
      }
    }

    onButtonExpandCategory(groupID) {
      this.isSubmenuLightingOpen = this.isSubmenuSceneNavigationOpen = false;

      if (this.expandedCategory === groupID) {
        this.expandedCategory = null;
      } else {
        this.expandedCategory = groupID;
      }
    }
  }

  angular
    .module('simToolsSidebarModule')
    .controller('SimToolsSidebarController', [
      '$rootScope',
      '$scope',
      '$timeout',
      'DYNAMIC_VIEW_CHANNELS',
      'NAVIGATION_MODES',
      'SIMTOOLS_SIDEBAR_ID',
      'dynamicViewOverlayService',
      'editorsPanelService',
      'editorToolbarService',
      'gz3d',
      'gz3dViewsService',
      'helpTooltipService',
      'nrpAnalytics',
      'simToolsSidebarService',
      'userContextService',
      'userNavigationService',
      'videoStreamService',
      'tipTooltipService',
      'TIP_CODES',
      function(...args) {
        return new SimToolsSidebarController(...args);
      }
    ]);
})();
