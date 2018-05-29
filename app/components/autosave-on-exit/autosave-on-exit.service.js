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

  /**
   * @ngdoc service
   * @namespace exdFrontendApp.services
   * @module exdFrontendApp
   * @name exdFrontendApp.autoSaveOnExitService
   * @description Service responsible for auto saving to storage on exit
   */
  angular.module('exdFrontendApp').factory('autosaveOnExitService', [
    '$rootScope',
    'userInteractionSettingsService',
    '$q',
    function($rootScope, userInteractionSettingsService, $q) {
      const JSON_SETTING_NAME = 'autosaveOnExit';

      let service = {};
      let exited = false;

      service.saveSettings = function() {
        return userInteractionSettingsService.settings.then(settings => {
          settings[JSON_SETTING_NAME] = service.settings;
          userInteractionSettingsService.saveSetting(JSON_SETTING_NAME);
          return $q.all(service.saveAll()).then(() => (exited = true));
        });
      };

      //load from file
      $rootScope.$on('ENTER_SIMULATION', () => {
        userInteractionSettingsService.settings.then(
          s => (service.settings = s[JSON_SETTING_NAME] || {})
        );
      });

      service.getEditorSettings = function(editorType) {
        return service.settings[editorType];
      };

      //settings - setter getter
      service.setEditorSetting = function(editorType, id, value) {
        if (angular.isDefined(service.settings)) {
          if (angular.isDefined(service.settings[editorType])) {
            service.settings[editorType][id] = value;
          }
        }
      };

      service.getEditorSetting = function(editorType, id) {
        if (angular.isDefined(service.settings)) {
          if (!angular.isDefined(service.settings[editorType])) {
            service.settings[editorType] = { [id]: false };
          }

          return service.settings[editorType][id];
        } else {
          return false;
        }
      };

      //Save storage callbacks
      service.registeredSaveToStorageCallbacks = {}; // {editorType: {setting_id : callback, ...}}

      //called by autosave-on-exit-checkbox-list elements
      service.registerSaveToStorageCallbacks = function(
        editorType,
        saveCallbacks
      ) {
        service.registeredSaveToStorageCallbacks[editorType] = saveCallbacks;
      };

      service.unregisterSaveToStorageCallbacks = function(editorType) {
        delete service.registeredSaveToStorageCallbacks[editorType];
      };

      function applyCallback(callback) {
        return $q.when(callback());
      }

      service.saveEditor = function(editorType) {
        const callbacks = service.registeredSaveToStorageCallbacks;

        let list = Object.keys(callbacks[editorType]).filter(
          id => service.settings[editorType][id]
        );

        return list.length > 0
          ? list.map(id => applyCallback(callbacks[editorType][id]))
          : $q.resolve();
      };

      service.saveAll = function() {
        return _.flatten(
          Object.keys(
            service.registeredSaveToStorageCallbacks
          ).map(editorType => service.saveEditor(editorType))
        );
      };

      service.onExit = function() {
        if (!exited) {
          return service.saveSettings();
        } else {
          return $q.resolve();
        }
      };

      return service;
    }
  ]);
})();
