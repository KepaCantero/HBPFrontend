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
  angular.module('exdFrontendApp').directive('environmentSettingsUsercamera', [
    'CAMERA_SENSITIVITY_RANGE',
    'gz3d',
    'gz3dViewsService',
    'userInteractionSettingsService',
    function(
      CAMERA_SENSITIVITY_RANGE,
      gz3d,
      gz3dViewsService,
      userInteractionSettingsService
    ) {
      return {
        templateUrl:
          'components/environment-settings/environment-settings-usercamera.template.html',
        restrict: 'E',
        scope: true,
        link: function(scope) {
          scope.CAMERA_SENSITIVITY_RANGE = CAMERA_SENSITIVITY_RANGE;

          scope.gz3dViewsService = gz3dViewsService;
          scope.userInteractionSettingsService = userInteractionSettingsService;

          userInteractionSettingsService.settings.then(settings => {
            scope.camSensitivityTranslation =
              settings.camera.sensitivity.translation;
            scope.camSensitivityRotation = settings.camera.sensitivity.rotation;
          });

          //----------------------------------------------
          // Init the values

          scope.composerSettingsToUI = function() {
            scope.userCameraSettings = gz3d.scene.composerSettings;
            if (!scope.userCameraSettings.verticalFOV) {
              scope.userCameraSettings.verticalFOV = 60;
            }
            if (!scope.userCameraSettings.nearClippingDistance) {
              scope.userCameraSettings.nearClippingDistance = 0.15;
            }
            if (!scope.userCameraSettings.farClippingDistance) {
              scope.userCameraSettings.farClippingDistance = 100.0;
            }
            if (!scope.userCameraSettings.showCameraHelper) {
              scope.userCameraSettings.showCameraHelper = false;
            }
          };
          scope.composerSettingsToUI();

          scope.$watch('gz3d.scene.composerSettings', function() {
            scope.composerSettingsToUI();
          });

          scope.uisSettingsToUI = function() {
            scope.camSensitivityTranslation =
              userInteractionSettingsService.settingsData.camera.sensitivity.translation;
            scope.camSensitivityRotation =
              userInteractionSettingsService.settingsData.camera.sensitivity.rotation;
          };
          scope.uisSettingsToUI();

          scope.$watch(
            'userInteractionSettingsService.settingsData',
            function() {
              scope.uisSettingsToUI();
            }
          );

          //----------------------------------------------
          // UI to 3D scene

          scope.updateFrustumSettings = function() {
            gz3d.scene.applyComposerSettings();
          };

          scope.updateCameraSensitivity = function() {
            userInteractionSettingsService.settingsData.camera.sensitivity.translation = parseFloat(
              scope.camSensitivityTranslation
            );
            userInteractionSettingsService.settingsData.camera.sensitivity.rotation = parseFloat(
              scope.camSensitivityRotation
            );
          };
        }
      };
    }
  ]);
})();
