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
/* global THREE: false */

(function() {
  'use strict';

  class EnvironmentRenderingController {
    get containerElement() {
      return this.gz3dContainerElement;
    }
    get INIT_WIDTH_PERCENTAGE() {
      return 0.3;
    }

    constructor(
      $scope,
      $element,
      userContextService,
      experimentService,
      userNavigationService,
      environmentRenderingService,
      gz3dViewsService,
      stateService,
      videoStreamService,
      dynamicViewOverlayService
    ) {
      this.stateService = stateService;
      this.userContextService = userContextService;
      this.experimentService = experimentService;
      this.userNavigationService = userNavigationService;
      this.environmentRenderingService = environmentRenderingService;
      this.gz3dViewsService = gz3dViewsService;
      this.videoStreamService = videoStreamService;
      this.dynamicViewOverlayService = dynamicViewOverlayService;

      this.view = undefined;
      this.videoUrl = undefined;
      this.reconnectTrials = 0;

      $scope.$on('$destroy', () => this.onDestroy());

      /* initialization */
      this.gz3dContainerElement = $element[0].getElementsByClassName(
        'gz3d-webgl'
      )[0];

      this.environmentRenderingService.sceneInitialized().then(() => {
        // assign a view which doesn't have a displaying container yet for now
        this.gz3dViewsService
          .assignView(this.gz3dContainerElement)
          .then(view => {
            this.view = view;
            // if it's a camera view and we're inside an overlay, keep aspect ratio for that overlay
            let overlayWrapper = this.dynamicViewOverlayService.getParentOverlayWrapper(
              $element
            );
            if (
              this.view.type === 'camera' &&
              angular.isDefined(overlayWrapper)
            ) {
              overlayWrapper.setAttribute(
                'keep-aspect-ratio',
                this.view.initAspectRatio.toString()
              );
              // set initial size according to aspect ratio
              let parentWidthPx = dynamicViewOverlayService.getOverlayParentElement()[0]
                .clientWidth;
              let parentHeightPx = dynamicViewOverlayService.getOverlayParentElement()[0]
                .clientHeight;
              let height =
                this.INIT_WIDTH_PERCENTAGE *
                parentWidthPx /
                this.view.initAspectRatio /
                parentHeightPx;
              overlayWrapper.style.width =
                (this.INIT_WIDTH_PERCENTAGE * 100).toString() + '%';
              overlayWrapper.style.height = (height * 100).toString() + '%';

              // place according to index of view
              let pos = gz3dViewsService.views.indexOf(this.view) - 1;
              let row = Math.floor(pos / 3) % 3;
              let column = pos % 3;
              overlayWrapper.style.top = (row * 33).toString() + '%';
              overlayWrapper.style.left = (column * 33).toString() + '%';

              // remove context menus from views other than user view
              if (this.view !== this.gz3dViewsService.views[0]) {
                let contextMenu = $element[0].getElementsByTagName(
                  'context-menu'
                )[0];
                contextMenu.remove();
              }

              // set up server video stream
              this.videoStreamService
                .getStreamingUrlForTopic(this.view.topic)
                .then(streamUrl => {
                  this.videoUrl = streamUrl;
                });
            }
          });
      });
    }

    onDestroy() {
      /* de-initialization */
      if (
        this.view &&
        this.view.camera &&
        this.view.camera.cameraHelper &&
        this.view.camera.cameraHelper.visible
      ) {
        this.gz3dViewsService.toggleCameraHelper(this.view);
      }

      if (this.view) {
        this.view.container = undefined;
      }
    }

    isCameraView() {
      return this.view && this.view.type && this.view.type === 'camera';
    }

    onClickFrustumIcon() {
      this.gz3dViewsService.toggleCameraHelper(this.view);
    }

    onClickCameraStream() {
      this.showServerStream = !this.showServerStream;
      this.reconnectTrials++;
    }

    getVideoUrlSource() {
      return this.showServerStream
        ? this.videoUrl +
            '&t=' +
            this.stateService.currentState +
            this.reconnectTrials
        : '';
    }
  }

  EnvironmentRenderingController.$$ngIsClass = true;
  EnvironmentRenderingController.$inject = [
    '$scope',
    '$element',
    'userContextService',
    'experimentService',
    'userNavigationService',
    'environmentRenderingService',
    'gz3dViewsService',
    'stateService',
    'videoStreamService',
    'dynamicViewOverlayService'
  ];

  /**
   * @ngdoc function
   * @name environmentRenderingModule.controller:EnvironmentRenderingController
   * @description
   * # EnvironmentRenderingController
   * Controller of the environmentRenderingModule
   */
  angular
    .module('environmentRenderingModule')
    .controller(
      'EnvironmentRenderingController',
      EnvironmentRenderingController
    );
})();
