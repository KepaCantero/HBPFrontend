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

  angular.module('editorToolbarModule').directive('editorToolbar', [
    function() {
      return {
        templateUrl: 'components/editor-toolbar/editor-toolbar.template.html',
        restrict: 'E',
        scope: true,
        controller: 'EditorToolbarController',
        controllerAs: 'vm',
        link: (scope, element) => {
          let editButtton = element.find('.hbp-toolbar-action');

          // This is a fix for : [NRRPLT-6077] Edit button is disabled for unclear reason.
          // Basically, it may happen that angular does not update the ng-class
          // when the following conditions are met. For this reason, we apply the disable tag
          // manually.

          scope.$watch(
            `vm.userContextService.editIsDisabled ||
                       vm.editorsPanelService.loadingEditPanel ||
                       (vm.stateService.currentState === vm.STATE.HALTED) ||
                       (vm.stateService.currentState === vm.STATE.STOPPED) ||
                       (vm.stateService.currentState === vm.STATE.FAILED)`,
            value => {
              value
                ? editButtton.addClass('disabled')
                : editButtton.removeClass('disabled');
            }
          );
        }
      };
    }
  ]);
})();
