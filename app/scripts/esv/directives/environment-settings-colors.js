/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file is part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
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
 * ---LICENSE-END **/
(function ()
{
  'use strict';
  angular.module('exdFrontendApp')
    .directive('environmentSettingsColors', ['gz3d', 'nrpAnalytics',
      'editorToolbarService',
      function (gz3d, nrpAnalytics, editorToolbarService)
      {
        return {
          templateUrl: 'views/esv/environment-settings-colors.html',
          restrict: 'E',
          scope: true,
          link: function (scope, element, attrs)
          {
            scope.editorToolbarService = editorToolbarService;

            //----------------------------------------------
            // Init the values

            scope.selectedColorChannel = 0;

            scope.composerSettingsToUI = function ()
            {
              if (editorToolbarService.isEnvironmentSettingsPanelActive)
              {
                scope.composerSettings = gz3d.scene.composerSettings;
                scope.inGamma = (1.0 - (gz3d.scene.composerSettings.levelsInGamma - 1.0));
              }
            };

            scope.$watch('editorToolbarService.showEnvironmentSettingsPanel', function ()
            {
              scope.composerSettingsToUI();
            });

            scope.$watch('gz3d.scene.composerSettings', function ()
            {
              scope.composerSettingsToUI();
            });

            //----------------------------------------------
            // UI to 3D scene

            scope.updateEnvColorSettings = function (p)
            {
              gz3d.scene.composerSettings.levelsInGamma = (1.0 - (scope.inGamma - 1.0));
              gz3d.scene.applyComposerSettings(undefined,undefined,true);
            };

            scope.onRGBCurveChanged = function ()
            {
              gz3d.scene.applyComposerSettings(true,undefined,true);
            };

            //----------------------------------------------
            // Reset

            scope.resetCurve = function ()
            {
              gz3d.scene.composerSettings.rgbCurve = { 'red': [], 'green': [], 'blue': [] };
              gz3d.scene.applyComposerSettings(true);
            };



            scope.resetLevels = function ()
            {
              gz3d.scene.composerSettings.levelsInBlack = 0.0;
              gz3d.scene.composerSettings.levelsInGamma = 1.0;
              gz3d.scene.composerSettings.levelsInWhite = 1.0;
              gz3d.scene.composerSettings.levelsOutBlack = 0.0;
              gz3d.scene.composerSettings.levelsOutWhite = 1.0;
              scope.inGamma = gz3d.scene.composerSettings.levelsInGamma = 1.0;
              gz3d.scene.applyComposerSettings();
            };

          }
        };
      }
    ]);
} ());
