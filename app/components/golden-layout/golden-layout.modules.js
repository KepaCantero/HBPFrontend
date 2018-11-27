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

  angular.module('goldenLayoutModule', []).constant('TOOL_CONFIGS', {
    ENVIRONMENT_RENDERING: {
      type: 'component',
      title: 'Environment Rendering',
      id: 'environment-rendering',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'environmentRenderingModule',
        angularDirective: '<environment-rendering />',
        singleton: true
      },
      isClosable: false,
      pwidth: 800, // prefered width in px
      pheight: 600 // prefered height in px
    },
    /* (SandroWeber)
     This component is really nothing different from ENVIRONMENT_RENDERING but to keep current
     functionality we need to differentiate between instances rendering the user view and instances rendering
     robot camera views.
     Ultimately the two should become one tool that allows the user to choose the perspective/view rendered.
      */
    ROBOT_CAMERA_RENDERING: {
      type: 'component',
      title: 'Robot Camera Rendering',
      id: 'robot-camera-rendering',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'environmentRenderingModule',
        angularDirective: '<environment-rendering />'
      },
      pwidth: 300,
      pheight: 200
    },
    ENVIRONMENT_EDITOR: {
      type: 'component',
      title: 'Environment Editor',
      id: 'environment-designer',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<environment-designer />',
        singleton: true
      },
      pwidth: 600,
      pheight: 800
    },
    TRANSFER_FUNCTION_EDITOR: {
      type: 'component',
      title: 'TF Editor',
      id: 'transfer-function-editor',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<transfer-function-editor />',
        singleton: true
      },
      pwidth: 900,
      pheight: 700
    },
    BRAIN_EDITOR: {
      type: 'component',
      title: 'Brain Editor',
      id: 'pynn-editor',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<pynn-editor />',
        singleton: true
      },
      pwidth: 800,
      pheight: 900
    },
    SMACH_EDITOR: {
      type: 'component',
      title: 'Smach Editor',
      id: 'smach-editor',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<smach-editor />',
        singleton: true
      },
      pwidth: 800,
      pheight: 900
    },
    RESOURCES_EDITOR: {
      type: 'component',
      title: 'Resources Editor',
      id: 'resources-editor',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<resources-editor />',
        singleton: true
      },
      pwidth: 600,
      pheight: 800
    },
    ROS_TERMINAL: {
      type: 'component',
      title: 'ROS Terminal',
      id: 'ros-terminal',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<ros-terminal />',
        singleton: true
      },
      pwidth: 400,
      pheight: 300
    },
    PULL_FORCE: {
      type: 'component',
      title: 'Apply Force',
      id: 'apply-force',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<apply-force />',
        singleton: true
      },
      pwidth: 200,
      pheight: 250
    },
    SPIKE_TRAIN: {
      type: 'component',
      title: 'Spike Train',
      id: 'spike-train',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<spike-train />',
        singleton: true
      },
      pwidth: 600,
      pheight: 300
    },
    JOINT_PLOT: {
      type: 'component',
      title: 'Joint Plot',
      id: 'joint-plot',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<joint-plot />'
      },
      pwidth: 800,
      pheight: 400
    },
    BRAIN_VISUALIZER: {
      type: 'component',
      title: 'Brain Visualizer',
      id: 'brainvisualizer',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<brainvisualizer />',
        singleton: true
      },
      pwidth: 800,
      pheight: 600
    },
    LOG_CONSOLE: {
      type: 'component',
      title: 'Log Console',
      id: 'log-console',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<log-console />',
        singleton: true
      },
      pwidth: 400,
      pheight: 300
    },
    SERVER_VIDEO_STREAM: {
      type: 'component',
      title: 'Video Stream',
      id: 'video-stream',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<video-stream />'
      },
      pwidth: 600,
      pheight: 400
    },
    PERFORMANCE_VIEW: {
      type: 'component',
      title: 'Performance Monitor',
      id: 'performance-monitor',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<performance-monitor />',
        singleton: true
      },
      pwidth: 300,
      pheight: 500
    },
    OBJECT_INSPECTOR: {
      type: 'component',
      title: 'Object Inspector',
      id: 'object-inspector',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<object-inspector />',
        singleton: true
      },
      pwidth: 300,
      pheight: 800
    },
    ENVIRONMENT_RENDERING_SETTINGS: {
      type: 'component',
      title: 'Rendering Settings',
      id: 'environment-settings-panel',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'exdFrontendApp',
        angularDirective: '<environment-settings-panel />',
        singleton: true
      },
      pwidth: 400,
      pheight: 300
    },
    NOISE_MODEL_VIEWER: {
      type: 'component',
      title: 'Noise Model viewer',
      id: 'noise-model-viewer',
      componentName: 'angularModuleComponent',
      componentState: {
        module: 'noiseModelModule',
        angularDirective: '<noise-model />',
        singleton: true
      }
    },
    pwidth: 400,
    pheight: 300
  });
})();
