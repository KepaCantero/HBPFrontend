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

  class DynamicViewOverlayController {
    constructor($element, $scope, $timeout, dynamicViewOverlayService) {
      this.$element = $element;
      this.$scope = $scope;
      this.$timeout = $timeout;
      this.dynamicViewOverlayService = dynamicViewOverlayService;

      this.dynamicViewElement = angular.element(
        this.$element[0].getElementsByTagName('dynamic-view')[0]
      );

      $scope.$on('$destroy', () => this.onDestroy());
    }

    onDestroy() {
      this.dynamicViewElement.controller('dynamicView').onDestroy();
    }

    closeOverlay() {
      this.onDestroy();
      this.dynamicViewOverlayService.removeOverlay(this.$element[0].id);
    }

    setDynamicViewChannel(channelType) {
      this.dynamicViewOverlayService
        .getController(this.dynamicViewElement, 'dynamicView')
        .then(controller => {
          controller.setViewContentViaChannelType(channelType);
          this.channelType = channelType;

          this.applyChannelDefaults();
          this.randomizePosition();
        });
    }

    static isResizeable(channelType) {
      return (
        typeof channelType.isResizeable === 'undefined' ||
        (typeof channelType.isResizeable !== 'undefined' &&
          channelType.isResizeable)
      );
    }

    applyChannelDefaults() {
      if (!this.channelType) {
        return;
      }

      if (
        this.channelType.overlayDefaultSize &&
        DynamicViewOverlayController.isResizeable(this.channelType)
      ) {
        let overlayWrapper = this.$element[0].getElementsByClassName(
          this.dynamicViewOverlayService.OVERLAY_WRAPPER_CLASS
        )[0];
        overlayWrapper.style.width =
          this.channelType.overlayDefaultSize.width + 'px';
        overlayWrapper.style.height =
          this.channelType.overlayDefaultSize.height + 'px';

        if (this.channelType.overlayDefaultSize.minWidth) {
          overlayWrapper.style.minWidth =
            this.channelType.overlayDefaultSize.minWidth + 'px';
        }
        if (this.channelType.overlayDefaultSize.minHeight) {
          overlayWrapper.style.minHeight =
            this.channelType.overlayDefaultSize.minHeight + 'px';
        }
      }
    }

    randomizePosition() {
      // do not randomize position if view is not resizeable, otherwise it seems to be placed to close to borders
      if (!DynamicViewOverlayController.isResizeable(this.channelType)) {
        return;
      }

      let overlayWrapper = this.$element[0].getElementsByClassName(
        this.dynamicViewOverlayService.OVERLAY_WRAPPER_CLASS
      )[0];
      let overlayParent = this.dynamicViewOverlayService.getOverlayParentElement()[0];

      const MARGIN = 0.05;
      let getRandomDimension = prop =>
        (MARGIN + Math.random() * (1 - 2 * MARGIN)) *
        (overlayParent[prop] - overlayWrapper[prop]);

      angular
        .element(overlayWrapper)
        .css('left', getRandomDimension('clientWidth'));
      angular
        .element(overlayWrapper)
        .css('top', getRandomDimension('clientHeight'));
    }
  }

  DynamicViewOverlayController.$$ngIsClass = true;
  DynamicViewOverlayController.$inject = [
    '$element',
    '$scope',
    '$timeout',
    'dynamicViewOverlayService'
  ];

  angular
    .module('dynamicViewOverlayModule', ['dynamicViewModule'])
    .controller('DynamicViewOverlayController', DynamicViewOverlayController);
})();
