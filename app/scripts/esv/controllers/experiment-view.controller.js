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
/* global console: false */
/* global THREE: false */

(function() {
  'use strict';

  angular
    .module('exdFrontendApp.Constants')
    // constants for the server side status
    .constant('STATE', {
      CREATED: 'created',
      STARTED: 'started',
      PAUSED: 'paused',
      INITIALIZED: 'initialized',
      HALTED: 'halted',
      FAILED: 'failed',
      STOPPED: 'stopped'
    });

  class ExperimentViewController {
    constructor(
      scope,
      element,
      stateService,
      STATE,
      userContextService,
      nrpAnalytics,
      environmentRenderingService,
      gz3d,
      log,
      colorableObjectService,
      simulationInfo,
      contextMenuState,
      timeout,
      window
    ) {
      this.element = element;
      this.userContextService = userContextService;
      this.simulationInfo = simulationInfo;

      stateService.Initialize();

      //applyForceService.initialize(); // stupid call to avoid "not being used jshint"

      // Query the state of the simulation
      stateService.getCurrentState().then(function() {
        if (stateService.currentState === STATE.STOPPED) {
          // The Simulation is already Stopped, so do nothing more but show the alert popup
          userContextService.isJoiningStoppedSimulation = true;
          nrpAnalytics.eventTrack('Join-stopped', {
            category: 'Simulation'
          });
        } else {
          nrpAnalytics.durationEventTrack('Server-initialization', {
            category: 'Experiment'
          });
          nrpAnalytics.tickDurationEvent('Browser-initialization');

          environmentRenderingService.init();

          //TODO: touch event handling for context menu should happen somewhere else?
          // Handle touch clicks to toggle the context menu
          // This is used to save the position of a touch start event used for content menu toggling
          /*
          var touchStart = { clientX: 0, clientY: 0 };
          var touchMove = { clientX: 0, clientY: 0 };

          gz3d.scene.container.addEventListener('touchstart', function (event) {
            touchStart.clientX = event.touches[0].clientX;
            touchStart.clientY = event.touches[0].clientY;
            touchMove.clientX = touchStart.clientX;
            touchMove.clientY = touchStart.clientY;
          }, false);

          gz3d.scene.container.addEventListener('touchmove', function (event) {
            touchMove.clientX = event.touches[0].clientX;
            touchMove.clientY = event.touches[0].clientY;
          }, false);

          gz3d.scene.container.addEventListener('touchend', function (event) {
            var deltaX = touchMove.clientX - touchStart.clientX;
            var deltaY = touchMove.clientY - touchStart.clientY;
            var touchDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            // if the touch distance was small
            // Also test on clientX/clientY greater 0 (Because 'touchend' can sometimes be called without 'touchstart')
            // ...and so clientX and clientY are in their initial state '0'
            if ((touchDistance <= 20) && (touchStart.clientX > 0) && (touchStart.clientY > 0)) {
              event.clientX = touchMove.clientX;
              event.clientY = touchMove.clientY;
              contextMenuState.toggleContextMenu(true, event);
            }
            touchStart = { clientX: 0, clientY: 0 };
            touchMove = { clientX: 0, clientY: 0 };
          }, false);
         */
        }

        // We restrict material changes to simple objects and screen glasses found in screen models of the 3D scene,
        // i.e., only visuals bearing the name screen_glass or COLORABLE_VISUAL can be modified by this function.
        scope.setMaterialOnEntity = function(material) {
          var selectedEntity = gz3d.scene.selectedEntity;
          if (!selectedEntity) {
            log.error(
              'Could not change color since there was no object selected'
            );
            return;
          }
          colorableObjectService.setEntityMaterial(
            simulationInfo,
            selectedEntity,
            material
          );
          // Hide context menu after a color was assigned
          contextMenuState.toggleContextMenu(false);
        };

        // colorable object context Menu setup
        var colorableMenuItemGroup = {
          id: 'changeColor',
          visible: false,
          items: [
            {
              html:
                '<materials-chooser on-select="setMaterialOnEntity(material)"/>',
              callback: function(event) {
                event.stopPropagation();
              },
              visible: false
            }
          ],
          hide: function() {
            this.visible = this.items[0].visible = false;
          },
          show: function(model) {
            var isColorableEntity = colorableObjectService.isColorableEntity(
              model
            );
            var show = isColorableEntity;
            return (this.visible = this.items[0].visible = show);
          }
        };

        contextMenuState.pushItemGroup(colorableMenuItemGroup);

        //main context menu handler
        scope.onContainerMouseDown = function(event) {
          if (userContextService.isOwner()) {
            switch (event.button) {
              case 2:
                //right click -> show menu
                contextMenuState.toggleContextMenu(true, event);
                break;

              //other buttons -> hide menu
              case 0:
              case 1:
                contextMenuState.toggleContextMenu(false);
                break;
            }
          }
        };

        scope.focus = function(id) {
          // timeout makes sure that it is invoked after any other event has been triggered.
          // e.g. click events that need to run before the focus or
          // inputs elements that are in a disabled state but are enabled when those events
          // are triggered.
          timeout(function() {
            var element = window.document.getElementById(id);
            if (element) {
              element.focus();
            }
          });
        };
      });
    }

    exit() {
      //calls the exit function that has been moved to the toolbar
      const editorToolbar = 'editor-toolbar';
      if (this.element) {
        //not systematically mocked in the tests
        const controller = angular
          .element(this.element.find(editorToolbar))
          .controller(editorToolbar);
        controller.exit();
      }
    }
  }

  ExperimentViewController.$$ngIsClass = true;
  ExperimentViewController.$inject = [
    '$scope',
    '$element',
    'stateService',
    'STATE',
    'userContextService',
    'nrpAnalytics',
    'environmentRenderingService',
    'gz3d',
    '$log',
    'colorableObjectService',
    'simulationInfo',
    'contextMenuState',
    '$timeout',
    '$window',
    'applyForceService'
  ];

  angular
    .module('exdFrontendApp')
    .controller('experimentViewController', ExperimentViewController);
})();
