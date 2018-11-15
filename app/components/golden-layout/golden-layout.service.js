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

  class GoldenLayoutService {
    constructor($compile, $rootScope, $q, TOOL_CONFIGS) {
      this.TOOL_CONFIGS = TOOL_CONFIGS;

      this.deferredInitialized = $q.defer();

      this.angularModuleComponent = function(container, state) {
        let element = container.getElement();
        element.html(state.angularDirective);

        let scope = $rootScope.$new();
        container.on('destroy', () => {
          scope.$destroy();
        });
        $compile(element[0])(scope);
      };
    }

    initialized() {
      return this.deferredInitialized.promise;
    }

    createLayout() {
      let config = {
        content: [
          {
            type: 'row',
            content: [this.TOOL_CONFIGS.ENVIRONMENT_RENDERING]
          }
        ],
        settings: {
          showPopoutIcon: false
        }
      };
      this.layout = new window.GoldenLayout(config, '#golden-layout-container');

      this.layout.registerComponent(
        'angularModuleComponent',
        this.angularModuleComponent
      );

      this.layout.init();

      $(window).resize(() => this.refreshSize());
      setTimeout(() => this.refreshSize());

      this.deferredInitialized.resolve();

      return this.layout;
    }

    refreshSize() {
      this.layout.updateSize();
    }

    createDragSource(element, toolConfig) {
      this.initialized().then(() => {
        this.layout.createDragSource(element, toolConfig);
      });
    }

    openTool(toolConfig) {
      if (
        toolConfig.componentState.singleton &&
        this.layout.root.getItemsById(toolConfig.id).length > 0
      ) {
        return;
      }

      this.addTool(toolConfig);
    }

    toggleTool(toolConfig) {
      if (
        toolConfig.componentState.singleton &&
        this.layout.root.getItemsById(toolConfig.id).length > 0
      ) {
        this.layout.root.getItemsById(toolConfig.id).forEach(item => {
          item.close();
        });
        return;
      }

      this.addTool(toolConfig);
    }

    addTool(toolConfig) {
      if (
        this.layout.root.contentItems.length === 1 &&
        this.layout.root.contentItems[0].isStack
      ) {
        let newContent = [];
        if (this.layout.root.contentItems[0].contentItems) {
          this.layout.root.contentItems[0].contentItems.forEach(content => {
            newContent.push(content.config);
          });
        }
        newContent.push(toolConfig);

        this.layout.root.removeChild(this.layout.root.contentItems[0]);
        this.layout.root.addChild({
          type: 'row',
          content: newContent
        });
      } else {
        this.layout.root.contentItems[0].addChild(toolConfig);
      }
    }
  }

  GoldenLayoutService.$$ngIsClass = true;
  GoldenLayoutService.$inject = [
    '$compile',
    '$rootScope',
    '$q',
    'TOOL_CONFIGS'
  ];

  angular
    .module('goldenLayoutModule')
    .service('goldenLayoutService', GoldenLayoutService);
})();
