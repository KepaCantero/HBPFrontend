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
    .module('exdFrontendApp')
    .directive('autosaveOnExitCheckboxList', [
      'autosaveOnExitService',
      function(autosaveOnExitService) {
        return {
          template: '<div>' + '  <div ng-transclude>' + '  </div>' + '</div>',
          transclude: true,
          restrict: 'E',
          scope: true,

          controller: [
            '$scope',
            '$element',
            '$attrs',
            function($scope, $element, $attrs) {
              $scope.editorType = $attrs.id;

              this.getEditorType = function() {
                return $scope.editorType;
              };

              var checkboxes = [];

              this.addCheckbox = function(checkbox) {
                checkboxes.push(checkbox);
              };

              $scope.getCallbacksNames = function() {
                var callbacks = {};
                checkboxes.forEach(c => (callbacks[c.id] = c.saveCallback));

                return callbacks;
              };
            }
          ],

          link: function(scope) {
            autosaveOnExitService.registerSaveToStorageCallbacks(
              scope.editorType,
              scope.getCallbacksNames()
            );
          }
        };
      }
    ])
    .directive('autosaveOnExitCheckbox', [
      'autosaveOnExitService',
      function(autosaveOnExitService) {
        return {
          scope: {
            id: '@',
            savecallback: '&',
            label: '@'
          },
          restrict: 'E',
          require: '^autosaveOnExitCheckboxList',
          template:
            '<div>\n' +
            '<input owner-only id="{{checkbox.idAttribute}}" type="checkbox" ng-model="checkbox.model" ng-model-options="{ getterSetter: true }"/>\n' +
            '<label for="{{checkbox.idAttribute}}" style="font-weight: normal;">{{label}}</label>\n' +
            '<br>\n' +
            '</div>',
          link: function(
            scope,
            element,
            attrs,
            autosaveOnExitCheckboxListController
          ) {
            let editorType = autosaveOnExitCheckboxListController.getEditorType();

            let modelGetter = autosaveOnExitService.getEditorSetting.bind(
              null,
              editorType,
              scope.id
            );
            let modelSetter = autosaveOnExitService.setEditorSetting.bind(
              null,
              editorType,
              scope.id
            );

            scope.checkbox = {
              id: scope.id,
              idAttribute: scope.id + 'AutosaveCheckbox',
              saveCallback: scope.savecallback,
              label: scope.label,
              model: function(newValue) {
                return arguments.length ? modelSetter(newValue) : modelGetter();
              }
            };

            autosaveOnExitCheckboxListController.addCheckbox(scope.checkbox);
          }
        };
      }
    ]);
})();
