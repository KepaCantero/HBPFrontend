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

  /* global console: false */

  class DynamicViewController {
    constructor($compile, $element, $rootScope, $scope) {
      this.$compile = $compile;
      this.$element = $element;
      this.$rootScope = $rootScope;
      this.$scope = $scope;

      $scope.$on('$destroy', () => this.onDestroy());

      /* initialization */
      this.viewContainer = this.getViewContainerElement(this.$element);
    }

    onDestroy() {
      if (this.contentScope) {
        this.contentScope.$destroy();
      }
    }

    setViewContent(content) {
      // trigger $destroy event before replacing and recompiling content
      // elements/directives set as content of this dynamic-view directive can de-initialize via $scope.$on('$destroy', ...)
      if (angular.isDefined(this.contentScope)) {
        this.contentScope.$destroy();
      }

      // content container should exist
      if (!angular.isDefined(this.viewContainer)) {
        console.warn(
          'dynamicView.setViewContent() - viewContainer element not defined!'
        );
        return;
      }

      // set and compile new content
      this.viewContent = content;
      this.viewContainer.innerHTML = this.viewContent;
      this.contentScope = this.$rootScope.$new();
      this.$compile(this.viewContainer)(this.contentScope);
    }

    getViewContainerElement(parentElement) {
      let containerElement = parentElement.find('[dynamic-view-container]');
      return containerElement[0];
    }

    setViewContentViaChannelType(channelType) {
      return this.setViewContent(
        '<' + channelType.directive + '></' + channelType.directive + '>'
      );
    }
  }

  DynamicViewController.$$ngIsClass = true;
  DynamicViewController.$inject = [
    '$compile',
    '$element',
    '$rootScope',
    '$scope'
  ];

  angular
    .module('dynamicViewModule', [])
    .controller('DynamicViewController', DynamicViewController)
    .constant('DYNAMIC_VIEW_CHANNELS', {
      BRAIN_VISUALIZER: {
        name: 'Brain Visualizer',
        directive: 'brainvisualizer-panel',
        overlayDefaultSize: {
          widthPercent: 60,
          heightPercent: 70
        },
        isResizeable: true,
        allowMultipleViews: false
      },
      ENVIRONMENT_RENDERING: {
        name: 'Environment Rendering',
        directive: 'environment-rendering',
        overlayDefaultSize: {
          widthPercent: 60,
          heightPercent: 60
        }
      },
      JOINT_PLOT: {
        name: 'Joint Plot',
        directive: 'joint-plot',
        overlayDefaultSize: {
          widthPercent: 50,
          heightPercent: 50
        }
      },
      LOG_CONSOLE: {
        name: 'Log Console',
        directive: 'log-console',
        allowMultipleViews: false, // default true
        overlayDefaultSize: {
          widthPercent: 40,
          heightPercent: 40
        }
      },
      OBJECT_INSPECTOR: {
        name: 'Object Inspector',
        directive: 'object-inspector',
        isResizeable: false, // default true
        allowMultipleViews: false, // default true
        maxHeight: '100%',
        overflowY: 'auto'
      },
      STREAM_VIEWER: {
        name: 'Stream viewer',
        directive: 'video-stream',
        overlayDefaultSize: {
          widthPercent: 40,
          heightPercent: 40
        }
      },
      MODEL_VIEWER: {
        name: 'Noise Model viewer',
        directive: 'noise-model',
        overlayDefaultSize: {
          width: 500,
          height: 450
        }
      },
      SPIKE_TRAIN: {
        name: 'Spike-Train',
        directive: 'spike-train',
        allowMultipleViews: false, // default true
        overlayDefaultSize: {
          widthPercent: 40,
          heightPercent: 40,
          minWidth: 700,
          minHeight: 200
        }
      },
      PYNN_EDITOR: {
        name: 'PyNN Editor',
        directive: 'pynn-editor',
        allowMultipleViews: false, // default true
        overlayDefaultSize: {
          widthPercent: 70,
          heightPercent: 70,
          minWidth: 700,
          minHeight: 300
        }
      },
      SMACH_EDITOR: {
        name: 'SMACH Editor',
        directive: 'smach-editor',
        allowMultipleViews: false, // default true
        overlayDefaultSize: {
          widthPercent: 70,
          heightPercent: 70,
          minWidth: 700,
          minHeight: 300
        }
      },
      ENVIRONMENT_EDITOR: {
        name: 'Environment Editor',
        directive: 'environment-designer',
        allowMultipleViews: false, // default true
        overlayDefaultSize: {
          widthPercent: 80,
          heightPercent: 80,
          minWidth: 700,
          minHeight: 300
        }
      },
      TRANSFER_FUNCTION_EDITOR: {
        name: 'Transfer Function Editor',
        directive: 'transfer-function-editor',
        allowMultipleViews: false, // default true
        overlayDefaultSize: {
          widthPercent: 70,
          heightPercent: 70,
          minWidth: 700,
          minHeight: 300
        }
      },
      PERFORMANCE_MONITOR: {
        name: 'Performance Monitor',
        directive: 'performance-monitor',
        allowMultipleViews: false, // default true
        overlayDefaultSize: {
          widthPercent: 50,
          heightPercent: 50,
          minWidth: 400,
          minHeight: 450
        }
      },
      ROS_TERMINAL: {
        name: 'ROS Terminal',
        directive: 'ros-terminal',
        allowMultipleViews: false,
        overlayDefaultSize: {
          widthPercent: 50,
          heightPercent: 50
        }
      },
      APPLY_FORCE_CONFIGURATION: {
        name: 'Apply Force',
        directive: 'apply-force-view',
        allowMultipleViews: false,
        isResizeable: false
      },
      PULL_FORCE_MODE: {
        name: 'Apply Force',
        directive: 'pull-force',
        allowMultipleViews: false,
        isResizeable: false
      }
    });
})();
