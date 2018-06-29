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
    .module('helpTooltipModule', ['helpTooltipPopoverModule', 'nrpAngulartics'])
    .constant('HELP_CODES', {
      PLAY_BUTTON:
        "Here you can start the simulation on the server. The simulation will then run until either you stop it or the simulation times out. The timeout is shown in the toolbar, named 'Timeout'.",
      PAUSE_BUTTON: 'Here you can pause the simulation on the server.',
      STOP_BUTTON: 'Here you can stop the simulation on the server.',
      RESET_BUTTON: 'Here you can activate the reset menu.',
      TIME_DISPLAY:
        "This shows the simulated time of the experiment on the server 'Simulation time', the actual elapsed time 'Real time' and the 'Timeout', after which the simulation is terminated.",
      MANIPULATE_LIGHT:
        'Submenu: Increase or decrease the global brightness of the lights in the simulation.',
      CAMERA_TRANSLATION:
        'With those controls, you can change the viewpoint of your local camera. By clicking on the left/right/diagonal arrows, pressing the keys (WASD) or the arrow keys, you can move forward/left/backward/right. The up/down arrows, the keys (RF) or (Page-Up,Page-Down) let you move up and down. The circle in the middle lets you reset the position.',
      CAMERA_ROTATION:
        'With those controls, you can change the orientation of your local camera. The center circle lets you reset the orientation. You also can look around by draging the mouse in the 3d-scene.',
      SPIKE_TRAIN:
        'Toggle the spike-train visualization. Each neuron of the used network is represented by a horizontal bar (sorted by the neuron ID). Each bar displays the recent history of the spike events for the corresponding neuron.\n This visualization is available only if the corresponding neuron monitor transfer function has been defined.',
      JOINT_PLOT:
        'Toggle the robot joints plot. Select which of the available joints and their properties (e.g. velocity or position) should be displayed with the check-boxes on the left. The plot shows the latest values of the selected joint properties.',
      PERFORMANCE_VIEW:
        'Toggle the performance monitor. You can use this panel to profile your experiment.',
      ROBOT_VIEW:
        "Toggle the robot camera view. Each camera source is visualized in a separate image window. This allows the user to observe 'what the robot sees'.",
      OWNER_DISPLAY:
        'This information appears when you are not the displayed owner of the experiment and thus you are in a view-only mode.',
      ENVIRONMENT_SETTINGS:
        'This button displays the 3D environment setting panel.',
      PROFILE: 'Open Profile Menu',
      USER_NAVIGATION:
        'Open user navigation sub-menu: Camera Button - Freeflying Camera / Character Button - Character bound physical presence.',
      CODE_EDITOR:
        'Toggle the experiment designer. Choose between the environment designer and the transfer function (TF) editor in the tabs above.\n- The environment designer allows to add, move, rotate and scale objects during the simulation. The environment model can be saved or loaded using the SDF format.\n- The TF editor allows to re-define or add new transfer functions into the current simulation. The transfer functions represent the main interface between the robot and the spiking neural network and define the conversion from the sensory input to the sensory neurons and from the network output to the robot control properties. A transfer function can be defined, loaded and saved as a Python script.',
      BRAIN_VISUALIZER: 'This button opens the brain visualizer.',
      LOG_CONSOLE: 'This button opens the log console.',
      SERVER_VIDEO_STREAM: 'This button opens the server video viewer.',
      ROS_TERMINAL: 'Open the ROS terminal.',
      EXIT_BUTTON: 'Here you can leave the simulation.',
      INFO_BUTTON: 'This button shows information about the simulation.',
      FORCE_APPLY:
        'This button opens the aply force dialog to activate dynamic application of forces on objects.',
      ENVIRONMENT_EDITOR: 'Toggle the environment (add models, etc.)',
      TRANSFER_FUNCTION_EDITOR: 'Toggle the transfer function editor',
      BRAIN_EDITOR: 'Toggle the PyNN brain editor',
      SMACH_EDITOR: 'Toggle the SMACH state machine editor',
      RESOURCES_EDITOR: 'Edit experiment resources like files, assets, etc.',
      EXPERIMENT_NAME: "The experiment's name",
      EDIT_EXPERIMENT_NAME: "Edit the experiment's name",
      SIMTOOLS_SIDEBAR: 'Toggle the sidebar with simulation tools'
    });
})();
