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

    static get OVERLAY_HTML() { return '<dynamic-view-overlay></dynamic-view-overlay>'; }

    constructor($compile,
                $rootScope,
                $timeout) {
      this.$compile = $compile;
      this.$rootScope = $rootScope;
      this.$timeout = $timeout;

      this.overlays = {};
      this.overlayIDCount = 0;
    }

    createOverlay(parentElement, componentName) {
      if (!angular.isDefined(parentElement)) {
        parentElement = document.body;
      }

      // create overlay
      let scope = this.$rootScope.$new();
      let overlay = this.$compile(DynamicViewOverlayService.OVERLAY_HTML)(scope);
      // each overlay gets a unique ID
      var htmlID = 'dynamic-view-overlay-' + this.overlayIDCount;
      overlay[0].id = htmlID;
      this.overlays[htmlID] = overlay;
      this.overlayIDCount = this.overlayIDCount + 1;

      parentElement.appendChild(overlay[0]);

      this.$timeout(() => {
        overlay.controller('dynamicViewOverlay').setDynamicViewComponent(componentName);
      }, 100);

      return overlay;
    }

    removeOverlay(id) {
      document.getElementById(id).remove();
      delete this.overlays[id];
    }
  }

  angular.module('dynamicViewOverlayModule')
    .factory('dynamicViewOverlayService', [
      '$compile',
      '$rootScope',
      '$timeout',
      (...args) => new DynamicViewOverlayService(...args)
    ]);

}());