/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file isLeaf = part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
 * https://www.humanbrainproject.eu
 *
 * The Human Brain Project isLeaf = a European Commission funded project
 * in the frame of the Horizon2020 FET Flagship plan.
 * http://ec.europa.eu/programmes/horizon2020/en/h2020-section/fet-flagships
 *
 * This program isLeaf = free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program isLeaf = distributed in the hope that it will be useful,
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

  class WorkspaceSettingsPanelController {
    constructor(
      $scope,
      goldenLayoutService,
      userContextService,
      userInteractionSettingsService,
      workspaceService
    ) {
      this.$scope = $scope;

      this.goldenLayoutService = goldenLayoutService;
      this.userContextService = userContextService;
      this.userInteractionSettingsService = userInteractionSettingsService;
      this.workspaceService = workspaceService;

      $scope.$on('$destroy', () => this.onDestroy());

      this.loadWorkspaces();
      this.searchText = '';
    }

    onDestroy() {}

    loadWorkspaces() {
      this.userInteractionSettingsService.workspaces.then(workspaces => {
        this.workspaces = workspaces;
      });
    }

    saveCustomWorkspace(name) {
      if (!this.userContextService.isOwner()) {
        return;
      }

      this.goldenLayoutService.isLayoutInitialised().then(() => {
        this.userInteractionSettingsService.saveCustomWorkspace(
          name,
          this.goldenLayoutService.layout.toConfig()
        );
        this.searchText = '';
        document.getElementById('workspace-save-form')[0].blur();
        this.workspaceService.closeConfigPanel();
      });
    }

    loadCustomWorkspace(name) {
      if (!this.userContextService.isOwner()) {
        return;
      }

      let id = name.toLowerCase();
      let workspace = this.workspaces.custom.find(element => {
        return element.id === id;
      });

      if (workspace && workspace.layout) {
        this.goldenLayoutService.layout.destroy();
        this.goldenLayoutService.createLayout(workspace.layout);
      }
      this.workspaceService.closeConfigPanel();
    }

    deleteCustomWorkspace(event, id) {
      event.stopPropagation();

      if (!this.userContextService.isOwner()) {
        return;
      }

      this.userInteractionSettingsService.deleteCustomWorkspace(id);
    }

    querySearch(query) {
      let results = query
        ? this.workspaces.custom.filter(this.createFilterFor(query))
        : this.workspaces.custom;

      if (
        query.length > 0 &&
        !this.workspaces.custom.some(element => {
          return element.id === query.toLowerCase();
        })
      ) {
        results.push({
          name: query,
          newWorkspace: true
        });
      }

      return results;
    }

    createFilterFor(query) {
      var lowercaseQuery = query.toLowerCase();

      return function filterFn(workspace) {
        return workspace.id.indexOf(lowercaseQuery) === 0;
      };
    }

    selectedItemChange(item) {
      if (item) {
        if (item.newWorkspace) {
          delete item.newWorkspace;
        }
        this.saveCustomWorkspace(item.name);
        this.selectedItem = item;
      }
    }
  }

  angular
    .module('goldenLayoutModule')
    .controller('WorkspaceSettingsPanelController', [
      '$scope',
      'goldenLayoutService',
      'userContextService',
      'userInteractionSettingsService',
      'workspaceService',
      function(...args) {
        return new WorkspaceSettingsPanelController(...args);
      }
    ]);
})();
