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
      $rootScope,
      CAMERA_SENSITIVITY_RANGE,
      UIS_DEFAULTS,
      autoSaveFactory,
      nrpUser,
      simulationConfigService,
      userContextService
    ) {
      this.$q = $q;
      this.CAMERA_SENSITIVITY_RANGE = CAMERA_SENSITIVITY_RANGE;
      this.UIS_DEFAULTS = UIS_DEFAULTS;
      this.nrpUser = nrpUser;
      this.simulationConfigService = simulationConfigService;
      this.userContextService = userContextService;

      this.autoSaveService = autoSaveFactory.createService(
        'user-interaction-settings'
      );
      this.autoSaveService.onsave(() => {
        return this.saveSettings();
      });

      this.settingsData = undefined;
      this.lastSavedSettingsData = undefined;

      $rootScope.$on('EXIT_SIMULATION', () => {});
    }

    loadSettings() {
      return this.simulationConfigService
        .loadConfigFile('user-interaction-settings')
        .then(fileContent => {
          this.settingsData = JSON.parse(fileContent);
          this.clampCameraSensitivity();

          // move old to new structure in settings file, can be deleted later on
          this.nrpUser.getCurrentUser().then(profile => {
            if (
              this.settingsData.autosaveOnExit &&
              this.settingsData.autosaveOnExit.lastWorkspaceLayouts &&
              this.settingsData.autosaveOnExit.lastWorkspaceLayouts[profile.id]
            ) {
              this.workspaces.then(workspaces => {
                workspaces.autosave = this.settingsData.autosaveOnExit.lastWorkspaceLayouts[
                  profile.id
                ];
                delete this.settingsData.autosaveOnExit.lastWorkspaceLayouts[
                  profile.id
                ];
              });
            }
          });
        })
        .catch(() => {
          // error, set all defaults
          console.info(
            'UserInteractionSettingsService.loadSettings() - error during loadConfigFile()'
          );
          this.settingsData = JSON.parse(JSON.stringify(this.UIS_DEFAULTS));
        })
        .finally(() => {
          this.lastSavedSettingsData = JSON.parse(
            JSON.stringify(this.settingsData)
          );
        });
    }

    _persistToFile(data) {
      let stringifiedData = JSON.stringify(data, null, 2);

      return this.simulationConfigService
        .saveConfigFile('user-interaction-settings', stringifiedData)
        .then(() => (this.lastSavedSettingsData = JSON.parse(stringifiedData)));
    }

    saveSettings() {
      return this._persistToFile(this.settingsData);
    }

    saveSetting(...settingType) {
      let clone = Object.assign({}, this.lastSavedSettingsData); // shallow

      settingType.forEach(sType => (clone[sType] = this.settingsData[sType]));

      return this._persistToFile(clone);
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
      return new Promise(resolve => {
        if (!angular.isDefined(this.settingsData)) {
          this.loadSettings().then(() => {
            resolve(this.settingsData);
          });
        } else {
          resolve(this.settingsData);
        }
      });
    }

    get workspaces() {
      return new Promise((resolve, reject) => {
        this.settings
          .then(settings => {
            // ensure necessary structure existing
            settings.workspaces = settings.workspaces || {};
            settings.workspaces.custom = settings.workspaces.custom || [];

            resolve(settings.workspaces);
          })
          .catch(() => {
            reject();
          });
      });
    }

    saveCustomWorkspace(name, layoutConfig) {
      return new Promise((resolve, reject) => {
        if (!this.userContextService.isOwner()) {
          return reject();
        }

        let id = name.toLowerCase();

        this.workspaces
          .then(workspaces => {
            let workspace = workspaces.custom.find(element => {
              return element.id === id;
            });

            if (workspace) {
              workspace.layout = layoutConfig;
            } else {
              workspaces.custom.push({
                id: id,
                name: name,
                layout: layoutConfig
              });
            }

            this.autoSaveService.setDirty();
            resolve();
          })
          .catch(error => {
            reject(error);
          });
      });
    }

    deleteCustomWorkspace(id) {
      return new Promise((resolve, reject) => {
        if (!this.userContextService.isOwner()) {
          return reject();
        }

        this.workspaces.then(workspaces => {
          workspaces.custom.forEach((element, index) => {
            if (element.id === id) {
              workspaces.custom.splice(index, 1);
              this.autoSaveService.setDirty();
            }
          });
          resolve();
        });
      });
    }

    autosaveLayout(layoutConfig) {
      return new Promise((resolve, reject) => {
        if (!this.userContextService.isOwner()) {
          return reject();
        }

        this.workspaces.then(workspaces => {
          let oldAutosave = JSON.stringify(workspaces.autosave);
          let newAutosave = JSON.stringify(layoutConfig);
          if (newAutosave !== oldAutosave) {
            workspaces.autosave = layoutConfig;
            this.autoSaveService.setDirty();
          }
          resolve();
        });
      });
    }
  }

  UserInteractionSettingsService.$$ngIsClass = true;
  UserInteractionSettingsService.$inject = [
    '$q',
    '$rootScope',
    'CAMERA_SENSITIVITY_RANGE',
    'UIS_DEFAULTS',
    'autoSaveFactory',
    'nrpUser',
    'simulationConfigService',
    'userContextService'
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
    },
    workspaces: {}
  });
})();
