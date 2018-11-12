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

  angular.module('exdFrontendApp').directive('environmentSettingsPanel', [
    'CAMERA_SENSITIVITY_RANGE',
    'gz3d',
    'collab3DSettingsService',
    'userInteractionSettingsService',
    'simulationInfo',
    function(
      CAMERA_SENSITIVITY_RANGE,
      gz3d,
      collab3DSettingsService,
      userInteractionSettingsService,
      simulationInfo
    ) {
      return {
        templateUrl:
          'components/environment-settings/environment-settings-panel.template.html',
        restrict: 'E',
        scope: true, // create a child scope for the directive and inherits the parent scope properties
        link: function(scope) {
          scope.simulationInfo = simulationInfo;
          scope.gz3d = gz3d;

          scope.resetSettings = function() {
            if (gz3d.scene.defaultComposerSettings) {
              gz3d.scene.composerSettings = JSON.parse(
                JSON.stringify(gz3d.scene.defaultComposerSettings)
              );
              gz3d.scene.applyComposerSettings(true);
            }
            userInteractionSettingsService.loadSettings();
          };

          scope.saveSettings = function() {
            collab3DSettingsService.saveSettings();
            userInteractionSettingsService.saveSettings();
          };
        }
      };
    }
  ]);
})();
