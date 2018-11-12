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
  angular.module('exdFrontendApp').directive('environmentSettingsQuality', [
    'gz3d',
    function(gz3d) {
      return {
        templateUrl:
          'components/environment-settings/environment-settings-quality.template.html',
        restrict: 'E',
        scope: true,
        link: function(scope) {
          //----------------------------------------------
          // Init the values

          scope.composerSettingsToUI = function() {
            var cs = gz3d.scene.composerSettings;

            scope.renderShadows = cs.shadows;
            scope.renderAmbientOcclusion = cs.ssao;
            scope.ambientOcclusionClamp = cs.ssaoClamp;
            scope.ambientOcclusionLum = cs.ssaoLumInfluence;
            scope.antiAliasingEnabled = cs.antiAliasing;
            scope.renderPBR =
              cs.pbrMaterial === undefined ? false : cs.pbrMaterial;
          };

          scope.composerSettingsToUI();

          scope.$watch('gz3d.scene.composerSettings', function() {
            scope.composerSettingsToUI();
          });

          //----------------------------------------------
          // UI to 3D scene

          scope.updateEnvQualitySettings = function() {
            var change = false;
            // Consider a change in ambient occlusion as a color setting, so call applyComposerSettings with first argument "updateColorCurve"" as true
            if (
              gz3d.scene.composerSettings.ssaoClamp !==
                scope.ambientOcclusionClamp ||
              gz3d.scene.composerSettings.ssaoLumInfluence !==
                scope.ambientOcclusionLum
            ) {
              change = true;
            }
            gz3d.scene.composerSettings.shadows = scope.renderShadows;
            gz3d.scene.composerSettings.ssao = scope.renderAmbientOcclusion;
            gz3d.scene.composerSettings.ssaoClamp = scope.ambientOcclusionClamp;
            gz3d.scene.composerSettings.ssaoLumInfluence =
              scope.ambientOcclusionLum;
            gz3d.scene.composerSettings.antiAliasing =
              scope.antiAliasingEnabled;
            gz3d.scene.composerSettings.pbrMaterial = scope.renderPBR;

            if (change !== true) {
              gz3d.scene.applyComposerSettings();
            } else {
              gz3d.scene.applyComposerSettings(undefined, undefined, true);
            }
          };
        }
      };
    }
  ]);
})();
