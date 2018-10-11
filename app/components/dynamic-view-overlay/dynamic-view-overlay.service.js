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

  /**
   * @ngdoc service
   * @namespace exdFrontendApp.services
   * @module jointPlotModule
   * @name jointPlotModule.jointService
   * @description Service that subscribes to the joint ros-topic
   */
  class DynamicViewOverlayService {
    static get OVERLAY_HTML() {
      return '<dynamic-view-overlay></dynamic-view-overlay>';
    }
    get OVERLAY_PARENT_SELECTOR() {
      return '.editor-display';
    }
    get OVERLAY_WRAPPER_CLASS() {
      return 'dynamic-view-overlay-wrapper';
    }
    get DYNAMIC_VIEW_CONTAINER_CLASS() {
      return 'dynamic-view-container';
    }

    constructor($compile, $q, $rootScope, $timeout, nrpAnalytics) {
      this.$compile = $compile;
      this.$q = $q;
      this.$rootScope = $rootScope;
      this.$timeout = $timeout;

      this.nrpAnalytics = nrpAnalytics;

      this.overlays = {};
      this.overlayIDCount = 0;
    }

    applyAttributesToOverlay(overlayWrapper, dynamicViewChannel) {
      // set resizeable
      if (typeof dynamicViewChannel.isResizeable !== 'undefined') {
        overlayWrapper.setAttribute(
          'resizeable',
          dynamicViewChannel.isResizeable.toString()
        );
      }

      if (typeof dynamicViewChannel.maxWidth !== 'undefined') {
        overlayWrapper.style.maxWidth = dynamicViewChannel.maxWidth;
      }

      if (typeof dynamicViewChannel.maxHeight !== 'undefined') {
        overlayWrapper.style.maxHeight = dynamicViewChannel.maxHeight;
      }

      if (typeof dynamicViewChannel.overflowX !== 'undefined') {
        overlayWrapper.style.overflowX = dynamicViewChannel.overflowX;
      }

      if (typeof dynamicViewChannel.overflowY !== 'undefined') {
        overlayWrapper.style.overflowY = dynamicViewChannel.overflowY;
      }
    }

    createOverlay(dynamicViewChannel, parentElement = null) {
      if (!angular.isDefined(parentElement) || parentElement === null) {
        parentElement = this.getOverlayParentElement()[0];
      }

      // create overlay
      let scope = this.$rootScope.$new();
      let overlay = this.$compile(DynamicViewOverlayService.OVERLAY_HTML)(
        scope
      );
      overlay.hide();
      // each overlay gets a unique ID
      let htmlID = 'dynamic-view-overlay-' + this.overlayIDCount;
      overlay[0].id = htmlID;
      this.overlays[htmlID] = overlay;
      this.overlayIDCount = this.overlayIDCount + 1;

      parentElement.appendChild(overlay[0]);

      this.getController(overlay, 'dynamicViewOverlay').then(controller => {
        controller.setDynamicViewChannel(dynamicViewChannel);

        //let overlayWrapper = overlay.children('.'+this.OVERLAY_WRAPPER_CLASS)[0];
        let overlayWrapper = overlay[0].getElementsByClassName(
          this.OVERLAY_WRAPPER_CLASS
        )[0];
        if (overlayWrapper) {
          this.applyAttributesToOverlay(overlayWrapper, dynamicViewChannel);
        }
        overlay.show();
      });

      this.nrpAnalytics.eventTrack('Toggle-' + dynamicViewChannel.directive, {
        category: 'Simulation-GUI',
        value: true
      });

      scope.$on('$destroy', () => {
        this.nrpAnalytics.eventTrack('Toggle-' + dynamicViewChannel.directive, {
          category: 'Simulation-GUI',
          value: false
        });
      });

      return overlay;
    }

    refreshOverlay(channel) {
      this.isOverlayOpen(channel).then(controller => {
        if (!controller || !controller.$scope) return;
        controller.$scope.$broadcast('UPDATE_PANEL_UI');
      });
    }

    // TODO: Shall we merge the two create functions, or just make it clear when to use which?
    createDynamicOverlay(channel) {
      let deferedContinue = this.$q.defer();
      this.isOverlayOpen(channel).then(overlayOpen => {
        // create a new view, only if multiple instances are possible or the view is not open
        if (
          !(
            channel.allowMultipleViews !== undefined &&
            !channel.allowMultipleViews
          ) ||
          !overlayOpen
        ) {
          this.createOverlay(channel);
        } else {
          this.refreshOverlay(channel);
        }
        this.isOverlayOpen(channel).then(function(open) {
          if (open) {
            deferedContinue.resolve('overlay initialized');
          } else {
            deferedContinue.reject('overlay not found');
          }
        });
      });
      return deferedContinue.promise;
    }

    removeOverlay(id) {
      let element = document.getElementById(id);
      if (element) element.remove();
      delete this.overlays[id];
    }

    closeAllOverlaysOfType(type) {
      let checkAndCloseOverlay = controller => {
        if (controller.channelType && controller.channelType === type) {
          controller.closeOverlay();
        }
      };
      // check all overlays
      for (let property in this.overlays) {
        if (this.overlays.hasOwnProperty(property)) {
          // get controller of overlay
          this.getController(
            this.overlays[property],
            'dynamicViewOverlay'
          ).then(checkAndCloseOverlay);
        }
      }
    }

    getOverlayParentElement() {
      return angular.element(this.OVERLAY_PARENT_SELECTOR);
    }

    getParentOverlayWrapper(element) {
      return element.parents('.' + this.OVERLAY_WRAPPER_CLASS)[0];
    }

    getController(element, controllerType) {
      let deferredController = this.$q.defer();
      let waitForController = () => {
        let controller = element.controller(controllerType);
        if (angular.isDefined(controller)) {
          // once we have a controller, resolve
          deferredController.resolve(controller);
        } else {
          // check again in 100ms
          this.$timeout(waitForController, 100);
        }
      };
      waitForController();

      return deferredController.promise;
    }

    isOverlayOpen(channelType) {
      let arrayIndex = 0;
      let deferredIsOpen = this.$q.defer();
      const array = Object.values(this.overlays);

      if (array.length === 0) {
        deferredIsOpen.resolve(false);
      } else {
        array.forEach(overlay => {
          this.getController(overlay, 'dynamicViewOverlay').then(controller => {
            if (
              controller.channelType &&
              controller.channelType === channelType
            ) {
              deferredIsOpen.resolve(controller);
            } else if (arrayIndex === array.length - 1) {
              deferredIsOpen.resolve(false);
            }
            arrayIndex++;
          });
        });
      }
      return deferredIsOpen.promise;
    }

    toggleDynamicViewOverlay(channelType) {
      this.isOverlayOpen(channelType).then(state => {
        if (state) {
          this.closeAllOverlaysOfType(channelType);
        } else {
          this.createDynamicOverlay(channelType);
        }
      });
    }
  }

  DynamicViewOverlayService.$$ngIsClass = true;
  DynamicViewOverlayService.$inject = [
    '$compile',
    '$q',
    '$rootScope',
    '$timeout',
    'nrpAnalytics'
  ];

  angular
    .module('dynamicViewOverlayModule')
    .service('dynamicViewOverlayService', DynamicViewOverlayService);
})();
