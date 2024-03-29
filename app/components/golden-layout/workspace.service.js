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

  class WorkspaceService {
    constructor($mdPanel) {
      this.$mdPanel = $mdPanel;
    }

    openConfigPanel(event) {
      let relativeToSelector = '#' + event.currentTarget.id;
      let position = this.$mdPanel
        .newPanelPosition()
        .relativeTo(relativeToSelector)
        .addPanelPosition(
          this.$mdPanel.xPosition.ALIGN_END,
          this.$mdPanel.yPosition.BELOW
        );

      let config = {
        //animation: animation,
        attachTo: angular.element(document.body),
        controller: 'WorkspaceSettingsPanelController',
        controllerAs: 'vm',
        templateUrl:
          'components/golden-layout/workspace-settings-panel.template.html',
        panelClass: 'workspace-settings-panel',
        position: position,
        trapFocus: false,
        zIndex: 15,
        clickOutsideToClose: true,
        clickEscapeToClose: true
      };

      this.$mdPanel.open(config).then(panel => {
        this.panel = panel;
      });
    }

    closeConfigPanel() {
      if (this.panel) {
        this.panel.close();
      }
    }
  }

  WorkspaceService.$$ngIsClass = true;
  WorkspaceService.$inject = ['$mdPanel'];

  angular
    .module('goldenLayoutModule')
    .service('workspaceService', WorkspaceService);
})();
