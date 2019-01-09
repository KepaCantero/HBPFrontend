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

  angular.module('tipTooltipModule').constant('TIP_CODES', {
    WELCOME: {
      text:
        'Welcome to the Neurorobotics Platform! To begin using the platform you should clone an experiment from the template list. Simply select an experiment and press the clone button.'
    },
    TEMPLATES: {
      text:
        'The templates can be used as a starting point for a new experiment. Simply select a template and clone it. It will be added to your personal experiment list.'
    },
    MY_EXPERIMENTS: {
      text:
        'This is your personal experiment list. To launch a simulation select an experiment and press the "Launch" button.'
    },
    MY_EXPERIMENTS_EMTPY: {
      text:
        'This is your personal experiment list. You don\'t have an experiment yet, got to "Templates" to clone your first experiment.'
    },
    EXPERIMENT_FILES: {
      text: 'You can browse and modify all the files of your experiments here.'
    },
    RUNNING_SIMULATIONS: {
      text: 'The running simulations are listed here.'
    },
    NEW_EXPERIMENT: {
      text:
        'Create a new experiment here. Simply choose an environment and press next to add robots and configure a brain.'
    },
    NAVIGATION: {
      text:
        'Use the <b>w, s, a, d</b> keys to translate the camera. Move your <b>mouse</b> whilst pressing the <b>left button</b> to rotate the camera. The translation/rotation sensitively can be changed in the <b>User camera</b> section after clicking on the gear icon on the top right.',
      stackMode: true
    },
    OBJECT_INSPECTOR: {
      text:
        'The object inspector can be used to move/rotate/scale and inspect 3D objects in the scene.<br>' +
        'For more information about these functionalities use the <b>mouse over tooltips</b> in the Object Inspector.',
      stackMode: true
    },
    SIMULATIONS_TIPS: {
      tipList: [
        {
          text:
            'Welcome to the simulation! Use the "Options" button on the top right corner to interact with the camera, ' +
            'change the light settings or apply a force to the robot.<br/>' +
            'Press the "Play" button to run the simulation.<br/>' +
            '<b>New</b>: You can now move the tool windows by dragging their title. ' +
            'You can split windows horizontally or vertically. Stacks with tabs are also possible. ' +
            'A shadow will preview the position the window will move to.',
          image: ['img/tips/cog_wheel.png']
        },
        {
          text:
            'Press the "Joint Plot" button to see the joint plot of your robot.',
          image: ['img/tips/joint.png']
        },
        {
          text: 'Press the "Spike Train" button to see the spike train',
          image: ['img/tips/spiketrain.png']
        },
        {
          text:
            'Press the "Brain Visualizer" button to see a 3D representation of your neurons.',
          image: ['img/tips/brainvis.png']
        },
        {
          text:
            'Open the editors to see the various scripts used by this experiment.',
          image: [
            'img/tips/env.png',
            'img/tips/tf.png',
            'img/tips/brain_edi.png',
            'img/tips/sm.png',
            'img/tips/resource.png'
          ]
        },
        {
          text: 'Press the "Pause" button to pause your simulation.',
          image: ['img/tips/pause.jpg']
        }
      ]
    },
    TEXTURES: {
      text:
        'Advanced tip: You can upload your own texture in the resources/textures folder and display it on an object from a state machine',
      image: 'img/tips/chess-board-solid.svg',
      stackMode: true
    }
  });
})();
