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

  angular.module('exdFrontendApp').directive('movable', [
    '$document',
    function($document) {
      var MARGIN = 8;
      var TOP_BAR_HEIGHT_PERCENTAGE = 0.05;

      return {
        restrict: 'A',
        link: function(scope, element, attrs) {
          // just to get from e.g. 0.41 to 41 for css percentage values
          var FRACTION_TO_PERCENTAGE = 100;

          var initialCoordinates,
            initialBoundingRect,
            dragElement = attrs.movableAnchor
              ? element.find(attrs.movableAnchor)
              : $(element[0]);

          dragElement.css({
            cursor: 'move'
          });

          element.css({
            position: 'absolute'
          });
          var getEventCoordinates = function(event) {
            var isTouchEvent =
              event.originalEvent && event.originalEvent.touches;
            var eventX = isTouchEvent
              ? event.originalEvent.touches[0].pageX
              : event.pageX;
            var eventY = isTouchEvent
              ? event.originalEvent.touches[0].pageY
              : event.pageY;
            return { x: eventX, y: eventY };
          };

          var onPointerDown = function(event) {
            // Prevent default dragging of selected content
            event.preventDefault();
            event.stopPropagation();

            initialCoordinates = getEventCoordinates(event);
            initialBoundingRect = element[0].getBoundingClientRect();

            $document.on('mousemove touchmove', onPointerMove);
            $document.on('mouseup touchend', onPointerUp);
          };

          dragElement.on('mousedown touchstart', onPointerDown);

          var onPointerMove = function(event) {
            event.stopPropagation();

            var coordinates = getEventCoordinates(event);
            var dX = coordinates.x - initialCoordinates.x;
            var dY = coordinates.y - initialCoordinates.y;

            if (
              coordinates.x < window.innerWidth - MARGIN &&
              coordinates.x > MARGIN
            ) {
              var relativeLeft =
                (initialBoundingRect.left + dX) /
                window.innerWidth *
                FRACTION_TO_PERCENTAGE;
              element.css({ left: relativeLeft + '%' });
            }
            if (
              coordinates.y < window.innerHeight - MARGIN &&
              coordinates.y >
                MARGIN + TOP_BAR_HEIGHT_PERCENTAGE * window.innerHeight
            ) {
              var relativeTop =
                (initialBoundingRect.top + dY) /
                window.innerHeight *
                FRACTION_TO_PERCENTAGE;
              relativeTop -= TOP_BAR_HEIGHT_PERCENTAGE * FRACTION_TO_PERCENTAGE;
              element.css({ top: relativeTop + '%' });
            }
          };

          var onPointerUp = function(event) {
            event.stopPropagation();
            $document.off('mousemove touchmove', onPointerMove);
            $document.off('mouseup touchend', onPointerUp);
          };

          scope.$on('$destroy', function() {
            $document.off('mousemove touchmove', onPointerMove);
          });
        }
      };
    }
  ]);
})();
