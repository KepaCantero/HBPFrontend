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

  class EnvironmentRenderingOptionsController {
    constructor(userNavigationService, gz3d, NAVIGATION_MODES) {
      this.userNavigationService = userNavigationService;
      this.gz3d = gz3d;
      this.NAVIGATION_MODES = NAVIGATION_MODES;

      this.onButtonLightIntensity = direction => {
        if (
          (direction < 0 && this.gz3d.isGlobalLightMinReached()) ||
          (direction > 0 && this.gz3d.isGlobalLightMaxReached())
        ) {
          return;
        }

        this.gz3d.scene.emitter.emit('lightChanged', direction * 0.1);
      };
    }

    onButtonCameraTranslate(event, row, col) {
      if (event.type === 'mouseleave') {
        event.which = 1;
        cameraTranslateButtonMapping.forEach(actionRow => {
          actionRow.forEach(action => {
            this.userNavigationService.releaseCameraTransform(event, action);
          });
        });
        return;
      }

      let action = cameraTranslateButtonMapping[row][col];
      if (action) {
        if (event.type === 'mousedown') {
          this.userNavigationService.requestCameraTransform(event, action);
        } else {
          this.userNavigationService.releaseCameraTransform(event, action);
        }
      }
    }

    onButtonCameraRotate(event, row, col) {
      if (event.type === 'mouseleave') {
        event.which = 1;
        cameraRotateButtonMapping.forEach(actionRow => {
          actionRow.forEach(action => {
            this.userNavigationService.releaseCameraTransform(event, action);
          });
        });
        return;
      }

      let action = cameraRotateButtonMapping[row][col];
      if (action) {
        if (event.type === 'mousedown') {
          this.userNavigationService.requestCameraTransform(event, action);
        } else {
          this.userNavigationService.releaseCameraTransform(event, action);
        }
      }
    }
  }

  EnvironmentRenderingOptionsController.$inject = [
    'userNavigationService',
    'gz3d',
    'NAVIGATION_MODES'
  ];

  /**
   * @ngdoc function
   * @name environmentRenderingModule.controller:EnvironmentRenderingOptionsController
   * @description
   * # EnvironmentRenderingOptionsController
   * Options Controller of the environmentRenderingModule
   */
  angular
    .module('environmentRenderingModule')
    .controller(
      'EnvironmentRenderingOptionsController',
      EnvironmentRenderingOptionsController
    );
})();
