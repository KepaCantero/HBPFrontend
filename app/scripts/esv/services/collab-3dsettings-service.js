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

  angular.module('exdFrontendApp').service('collab3DSettingsService', [
    'gz3d',
    'simulationConfigService',
    'userNavigationService',
    'simulationInfo',
    function(gz3d, simulationConfigService) {
      var loadSettings = function() {
        if (gz3d.scene.defaultComposerSettings === undefined) {
          gz3d.scene.defaultComposerSettings = JSON.parse(
            JSON.stringify(gz3d.scene.composerSettings)
          );
        }

        return simulationConfigService
          .loadConfigFile('3d-settings')
          .then(function(fileContent) {
            gz3d.scene.composerSettings = JSON.parse(fileContent);
            gz3d.scene.applyComposerSettings(true);
            gz3d.scene.defaultComposerSettings = JSON.parse(
              JSON.stringify(gz3d.scene.composerSettings)
            );

            return fileContent;
          })
          .catch(function() {
            gz3d.scene.applyComposerSettings(true);
          });
      };

      var saveSettings = function() {
        simulationConfigService.saveConfigFile(
          '3d-settings',
          JSON.stringify(gz3d.scene.composerSettings, null, 2)
        );
      };

      return {
        loadSettings: loadSettings,
        saveSettings: saveSettings
      };
    }
  ]);
})();
