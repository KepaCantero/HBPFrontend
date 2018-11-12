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
/* global GZ3D: false */

(function() {
  'use strict';
  angular.module('exdFrontendApp').directive('environmentSettingsMaster', [
    'gz3d',
    'clbConfirm',
    '$window',
    function(gz3d, clbConfirm, $window) {
      return {
        templateUrl:
          'components/environment-settings/environment-settings-master.template.html',
        restrict: 'E',
        scope: true,
        link: function(scope) {
          scope.masterSettings = [
            GZ3D.MASTER_QUALITY_BEST,
            GZ3D.MASTER_QUALITY_MIDDLE,
            GZ3D.MASTER_QUALITY_LOW,
            GZ3D.MASTER_QUALITY_MINIMAL
          ];
          scope.masterSettingsImage = {};
          scope.masterSettingsImage[GZ3D.MASTER_QUALITY_BEST] =
            'img/3denv/quality_best.jpg';
          scope.masterSettingsImage[GZ3D.MASTER_QUALITY_MINIMAL] =
            'img/3denv/quality_minimal.jpg';
          scope.masterSettingsImage[GZ3D.MASTER_QUALITY_MIDDLE] =
            'img/3denv/quality_middle.jpg';
          scope.masterSettingsImage[GZ3D.MASTER_QUALITY_LOW] =
            'img/3denv/quality_low.jpg';
          scope.currentMasterSettings = GZ3D.MASTER_QUALITY_BEST;

          //----------------------------------------------
          // Init the values

          scope.masterSettingsToUI = function() {
            scope.currentMasterSettings =
              gz3d.scene.composer.currentMasterSettings;
          };
          scope.masterSettingsToUI();

          scope.$watch('gz3d.scene.composer.currentMasterSettings', function() {
            scope.masterSettingsToUI();
          });

          //----------------------------------------------
          // Master settings

          scope.setMasterSettings = function(master) {
            if (gz3d.scene.composer.currentMasterSettings !== master) {
              if (
                master === GZ3D.MASTER_QUALITY_BEST ||
                gz3d.scene.composer.currentMasterSettings ===
                  GZ3D.MASTER_QUALITY_BEST
              ) {
                clbConfirm
                  .open({
                    title: 'Master settings',
                    confirmLabel: 'Reload Now',
                    cancelLabel: 'Later',
                    template:
                      'The page needs to be reloaded to reflect the new settings.',
                    closable: false
                  })
                  .then(
                    function() {
                      gz3d.scene.setMasterSettings(master, false);
                      $window.location.reload();
                    },
                    function() {
                      gz3d.scene.setMasterSettings(master, false);
                    }
                  );
              } else {
                gz3d.scene.setMasterSettings(master, true);
              }
            }
          };
        }
      };
    }
  ]);
})();
