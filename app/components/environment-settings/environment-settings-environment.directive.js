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

  angular
    .module('exdFrontendApp.Constants')
    .constant('SKYBOX_LIBRARY', 'libraries/skybox_library.json');

  angular.module('exdFrontendApp').directive('environmentSettingsEnvironment', [
    'gz3d',
    'nrpAnalytics',
    'simulationInfo',
    '$http',
    'SKYBOX_LIBRARY',
    function(gz3d, nrpAnalytics, simulationInfo, $http, SKYBOX_LIBRARY) {
      return {
        templateUrl:
          'components/environment-settings/environment-settings-environment.template.html',
        restrict: 'E',
        scope: true,
        link: function(scope) {
          //----------------------------------------------
          // Init the values

          scope.envMap = {
            selectedEnvMap: 0
          };

          scope.dynamicEnvMap = 0;
          scope.selectedSun = 0;
          scope.bloom = false;
          scope.bloomStrength = 0;
          scope.bloomRadius = 0;
          scope.bloomThreshold = 0;
          scope.fog = false;
          scope.fogDensity = 0;
          scope.fogColor = '';

          scope.skyDefaultFogList = [
            '#b2b2b2',
            '#cddde9',
            '#97a2af',
            '#c7c0bc',
            '#3c4146',
            '#d8ccb1',
            '#675b33',
            '#3b482d',
            '#2c3a1f',
            '#756e01',
            '#777674'
          ];

          scope.sunList = ['', 'SIMPLELENSFLARE'];
          scope.skyList = [];
          scope.skyLabelList = [];

          scope.composerSettingsToUI = function() {
            const skyBoxLibrary =
              simulationInfo.serverConfig.gzweb.assets + '/' + SKYBOX_LIBRARY;
            $http.get(skyBoxLibrary).then(function(res) {
              scope.skyList = res.data.skyList;
              scope.skyLabelList = res.data.skyLabelList;

              var cs = gz3d.scene.composerSettings;

              scope.envMap.selectedEnvMap = scope.skyList.indexOf(cs.skyBox);
              scope.selectedSun = scope.sunList.indexOf(cs.sun);
              scope.dynamicEnvMap = cs.dynamicEnvMap ? 1 : 0;

              scope.bloom = cs.bloom;
              scope.bloomThreshold = cs.bloomThreshold;
              scope.bloomStrength = cs.bloomStrength;
              scope.bloomRadius = cs.bloomRadius;

              scope.fog = cs.fog;
              scope.fogDensity = cs.fogDensity;
              scope.fogColor = cs.fogColor;
            });
          };
          scope.composerSettingsToUI();

          scope.$watch('gz3d.scene.composerSettings', function() {
            scope.composerSettingsToUI();
          });

          //----------------------------------------------
          // UI to 3D scene

          scope.updateEnvSettings = function() {
            var previousDynamicEnvMap =
              gz3d.scene.composerSettings.dynamicEnvMap;

            var cs = gz3d.scene.composerSettings;
            if (cs.skyBox !== scope.skyList[scope.envMap.selectedEnvMap]) {
              cs.skyBox = scope.skyList[scope.envMap.selectedEnvMap];
              scope.fogColor = gz3d.scene.composerSettings.fogColor =
                scope.skyDefaultFogList[scope.envMap.selectedEnvMap];
            }

            gz3d.scene.composerSettings.sun = scope.sunList[scope.selectedSun];
            gz3d.scene.composerSettings.dynamicEnvMap = scope.dynamicEnvMap
              ? true
              : false;

            gz3d.scene.composerSettings.bloom = scope.bloom;
            gz3d.scene.composerSettings.bloomStrength = scope.bloomStrength;
            gz3d.scene.composerSettings.bloomThreshold = scope.bloomThreshold;
            gz3d.scene.composerSettings.bloomRadius = scope.bloomRadius;

            gz3d.scene.composerSettings.fog = scope.fog;
            gz3d.scene.composerSettings.fogDensity = scope.fogDensity;
            gz3d.scene.composerSettings.fogColor = scope.fogColor;

            gz3d.scene.applyComposerSettings(
              undefined,
              previousDynamicEnvMap !==
                gz3d.scene.composerSettings.dynamicEnvMap,
              true
            );
          };
        }
      };
    }
  ]);
})();
