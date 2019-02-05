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

  // Layout based on constraint or not. If not, uses column based layout
  const USE_SIZE_CONSTRAINED_LAYOUTER = true;

  const compileFn = Symbol('compileFn');

  class GoldenLayoutService {
    constructor(
      $compile,
      $rootScope,
      $timeout,
      TOOL_CONFIGS,
      layouter,
      userInteractionSettingsService
    ) {
      this.TOOL_CONFIGS = TOOL_CONFIGS;
      // layout logic implemented in layouter as a strategy
      this.layouter = layouter;
      this.userInteractionSettingsService = userInteractionSettingsService;

      this.$compile = $compile;
      this.$rootScope = $rootScope;
      this.$timeout = $timeout;

      this.angularModuleComponent = (service =>
        function(container, state) {
          let element = container.getElement();
          element.html(state.angularDirective);
          service[compileFn](container, element[0]);
        })(this);

      this.dragSources = [];
    }

    [compileFn](container, element) {
      let scope = this.$rootScope.$new();
      container.on('destroy', () => scope.$destroy());
      this.$compile(element)(scope);
    }

    isLayoutInitialised() {
      let promise = new Promise(resolve => {
        let checkInitialized = () => {
          if (this.layout && this.layout.isInitialised) {
            resolve();
          } else {
            setTimeout(checkInitialized, 100);
          }
        };

        checkInitialized();
      });

      return promise;
    }

    createLayout(initConfig) {
      if (typeof initConfig === 'undefined') {
        initConfig = {
          content: [this.TOOL_CONFIGS.ENVIRONMENT_RENDERING],
          settings: {
            showPopoutIcon: false
          }
        };
      }

      this.layout = new window.GoldenLayout(
        initConfig,
        '#golden-layout-container'
      );

      this.layout.on('stackCreated', stack => {
        const OPTIONS_DIRECTIVE = 'golden-layout-options';

        this.$timeout(() => {
          if (!stack.contentItems.length) return;

          const { customOptionsDirective } = stack.contentItems[0].config;
          if (!customOptionsDirective) return;

          const controlsContainer = stack.header.controlsContainer;
          const template = `<${OPTIONS_DIRECTIVE}>${customOptionsDirective}</${OPTIONS_DIRECTIVE}>`;
          controlsContainer.prepend(template);

          this[compileFn](stack, controlsContainer[0].children[0]);
        });
      });

      this.layout.registerComponent(
        'angularModuleComponent',
        this.angularModuleComponent
      );

      this.layout.init();

      this.watchContainerSize();

      this.layout.on('stateChanged', () => {
        this.userInteractionSettingsService.autosaveLayout(
          this.layout.toConfig()
        );
      });

      this.isLayoutInitialised().then(() => {
        this.dragSources.forEach(dragSource => {
          this.layout.createDragSource(
            dragSource.element,
            dragSource.toolConfig
          );
        });
      });

      return this.layout;
    }

    /**
     * Refresh the Golden Layout when it's container size changes
     * at most 250ms after the container resize, and at most every 500ms
     */
    watchContainerSize() {
      if (this.resizeInterval) clearInterval(this.resizeInterval);
      const glContainer = $('#golden-layout-container');
      const refreshSizeThrottled = _.throttle(() => this.refreshSize(), 500);
      this.resizeInterval = setInterval(() => {
        let size = glContainer.width();
        if (this.lastSize != size) refreshSizeThrottled();
        this.lastSize == size;
      }, 250);

      this.$rootScope.$on('$destroy', () => clearInterval(this.resizeInterval));
    }

    refreshSize() {
      this.layout.updateSize();
    }

    createDragSource(element, toolConfig) {
      if (
        !this.dragSources.some(dragSource => {
          return dragSource.element === element;
        })
      ) {
        this.dragSources.push({
          element: element,
          toolConfig: toolConfig
        });
      }

      this.isLayoutInitialised().then(() => {
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
      this.layouter.addComponent(this.layout, toolConfig);
    }
  }

  GoldenLayoutService.$$ngIsClass = true;
  GoldenLayoutService.$inject = [
    '$compile',
    '$rootScope',
    '$timeout',
    'TOOL_CONFIGS',
    USE_SIZE_CONSTRAINED_LAYOUTER
      ? 'constraintBasedLayouter'
      : 'addAsColumnLayouter',
    'userInteractionSettingsService'
  ];

  angular
    .module('goldenLayoutModule')
    .service('goldenLayoutService', GoldenLayoutService);
})();
