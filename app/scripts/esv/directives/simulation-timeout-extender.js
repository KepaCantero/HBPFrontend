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
  angular.module('exdFrontendApp').directive('simulationTimeoutExtender', [
    'clbErrorDialog',
    'clbConfirm',
    'backendInterfaceService',
    '$document',
    function(clbErrorDialog, clbConfirm, backendInterfaceService, $document) {
      return {
        restrict: 'E',
        scope: {
          extentTimeoutCondition: '@'
        },
        link: function(scope, element, attrs) {
          scope.extendTimeout = function() {
            return backendInterfaceService.extendTimeout().catch(function(err) {
              timeoutExtendRefused = true;
              if (err && err.status === 402) {
                clbErrorDialog.open({
                  type: 'AllocationError.',
                  Message:
                    'Your cluster job allocation cannot be extended further'
                });
              }
            });
          };
          scope.unbind = function() {
            $document.unbind(
              'mousemove click mouseup mousedown keydown keypress keyup submit change mouseenter scroll resize dblclick'
            );
            scope.autoExtendTimeout = false;
          };
          if (!attrs.extentTimeoutCondition)
            throw "Directive 'simulation-timeout-extender' requires 'extentTimeoutCondition' attribute to be defined";

          scope.autoExtendTimeout = false;
          var timeoutExtendRefused = false,
            popupIsOpen = false;

          scope.$watch(
            function() {
              return scope.$eval(attrs.extentAutoCondition);
            },
            function(extend) {
              if (extend) {
                $document.bind(
                  'mousemove click mouseup mousedown keydown keypress keyup submit change mouseenter scroll resize dblclick',
                  function() {
                    scope.autoExtendTimeout = true;
                  }
                );
              }
            }
          );
          scope.$watch(
            function() {
              return scope.$eval(attrs.extentTimeoutCondition);
            },
            function(extend) {
              if (extend && !timeoutExtendRefused && !popupIsOpen) {
                if (scope.autoExtendTimeout) {
                  scope.extendTimeout();
                  scope.unbind();
                } else {
                  popupIsOpen = true;
                  return clbConfirm
                    .open({
                      title: 'Your simulation will soon reach its timeout.',
                      confirmLabel: 'Yes',
                      cancelLabel: 'No',
                      template:
                        'Would you like to extend the simulation timeout?',
                      closable: false
                    })
                    .then(function() {
                      scope.extendTimeout();
                    })
                    .catch(function() {
                      timeoutExtendRefused = true;
                    })
                    .finally(function() {
                      popupIsOpen = false;
                      scope.unbind();
                    });
                }
              }
            }
          );
          scope.$on('$destroy', () => scope.unbind());
        }
      };
    }
  ]);
})();
