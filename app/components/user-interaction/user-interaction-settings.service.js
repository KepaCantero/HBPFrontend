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

  class UserInteractionSettingsService {
    constructor(
      $q,
      CAMERA_SENSITIVITY_RANGE,
      UIS_DEFAULTS,
      simulationConfigService
    ) {
      this.$q = $q;
      this.CAMERA_SENSITIVITY_RANGE = CAMERA_SENSITIVITY_RANGE;
      this.UIS_DEFAULTS = UIS_DEFAULTS;
      this.simulationConfigService = simulationConfigService;

      this.settingsData = undefined;
    }

    loadSettings() {
      return this.simulationConfigService
        .loadConfigFile('user-interaction-settings')
        .then(fileContent => {
          this.settingsData = JSON.parse(fileContent);
          this.clampCameraSensitivity();
        })
        .catch(() => {
          // error, set all defaults
          console.info(
            'UserInteractionSettingsService.loadSettings() - error during loadConfigFile()'
          );
          this.settingsData = JSON.parse(JSON.stringify(this.UIS_DEFAULTS));
        });
    }

    saveSettings() {
      this.simulationConfigService.saveConfigFile(
        'user-interaction-settings',
        JSON.stringify(this.settingsData, null, 2)
      );
    }

    clampCameraSensitivity() {
      let sensitivity = this.settingsData.camera.sensitivity;
      if (sensitivity && sensitivity.translation) {
        sensitivity.translation = Math.min(
          this.CAMERA_SENSITIVITY_RANGE.TRANSLATION_MAX,
          Math.max(
            this.CAMERA_SENSITIVITY_RANGE.TRANSLATION_MIN,
            sensitivity.translation
          )
        );
      }
      if (sensitivity && sensitivity.rotation) {
        sensitivity.rotation = Math.min(
          this.CAMERA_SENSITIVITY_RANGE.ROTATION_MAX,
          Math.max(
            this.CAMERA_SENSITIVITY_RANGE.ROTATION_MIN,
            sensitivity.rotation
          )
        );
      }
    }

    get settings() {
      var deferred = this.$q.defer();

      if (!angular.isDefined(this.settingsData)) {
        this.loadSettings().then(() => {
          deferred.resolve(this.settingsData);
        });
      } else {
        deferred.resolve(this.settingsData);
      }

      return deferred.promise;
    }
  }

  UserInteractionSettingsService.$$ngIsClass = true;
  UserInteractionSettingsService.$inject = [
    '$q',
    'CAMERA_SENSITIVITY_RANGE',
    'UIS_DEFAULTS',
    'simulationConfigService'
  ];

  angular
    .module('userInteractionModule')
    .service('userInteractionSettingsService', UserInteractionSettingsService);

  angular.module('userInteractionModule').constant('UIS_DEFAULTS', {
    camera: {
      defaultMode: 'free-camera',
      sensitivity: {
        translation: 1.0,
        rotation: 1.0
      }
    }
  });
})();
