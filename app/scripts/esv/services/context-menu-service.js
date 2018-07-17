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
/* global THREE: false */
(function() {
  'use strict';

  angular
    .module('contextMenuStateService', ['nrpAngulartics'])
    .factory('contextMenuState', [
      'gz3d',
      'nrpAnalytics',
      '$timeout',
      function(gz3d, nrpAnalytics, $timeout) {
        return {
          //whether the context menu should be displayed
          isShown: false,

          // the position of the context menu
          contextMenuTop: 0,
          contextMenuLeft: 0,

          itemsGroups: [
            /* itemGroup sample
           {
           label: 'Sample',
           visible: true,
           items: [
           { text: 'sampleButton1',
           callback: function() {$event.stopPropagation();},
           visible : true
           },
           { text: 'sampleButton2',
           callback: function() {$event.stopPropagation();},
           visible : true
           }
           ]

           hide: function() {
           //hiding logic
           },

           show: function(model) {
           //showing logic
           return true; //ask for redraw, false otherwise
           }
           }
           */

            // first item just reflects model's name
            {
              label: 'Object name',
              visible: true,

              hide: function() {
                this.visible = false;
              },

              show: function(model) {
                this.visible = true;
                this.label = model.name;

                return true;
              }
            }
          ],

          pushItemGroup: function(itemGroup) {
            if (
              !this.itemsGroups.some(function(item) {
                return item.id === itemGroup.id;
              })
            ) {
              this.itemsGroups.push(itemGroup);
            }
          },

          hideMenu: function() {
            for (var i = 0, len = this.itemsGroups.length; i < len; i += 1) {
              this.itemsGroups[i].hide();
            }
          },

          toggleContextMenu: function(show, event) {
            nrpAnalytics.eventTrack('Toggle-context-menu', {
              category: 'Simulation-GUI'
            });

            if (show && !this.isShown) {
              var model = this._getModelUnderMouse(event);
              var animatedExt = '_animated';

              if (
                model &&
                (model.name.indexOf(animatedExt) < 0 ||
                  model.name.indexOf(animatedExt) !==
                    model.name.length - animatedExt.length)
              ) {
                var needsRefresh = false;

                //update visibility info
                for (
                  var i = 0, len = this.itemsGroups.length;
                  i < len;
                  i += 1
                ) {
                  needsRefresh =
                    this.itemsGroups[i].show(model, event) || needsRefresh;
                }

                // scene.radialMenu.showing is a property of GZ3D that was originally used to display a radial menu, We are
                // reusing it for our context menu. The reason is that this variables disables or enables the controls of
                // scene in the render loop.
                this.isShown = gz3d.scene.radialMenu.showing =
                  model.name !== '' && model.name !== 'plane' && needsRefresh;

                this.checkForContextMenuPosition = () => {
                  var target = document.getElementById('contextmenu');

                  if (this.isShown) {
                    if (!target.clientHeight) {
                      $timeout(this.checkForContextMenuPosition);
                    } else {
                      if (
                        event.offsetY + target.clientHeight >
                        event.view.innerHeight - 10
                      ) {
                        this.contextMenuTop =
                          event.offsetY - target.clientHeight;
                      } else {
                        this.contextMenuTop = event.offsetY;
                      }

                      if (
                        event.offsetX + target.clientWidth >
                        event.view.innerWidth - 10
                      ) {
                        this.contextMenuLeft =
                          event.offsetX - target.clientWidth;
                      } else {
                        this.contextMenuLeft = event.offsetX;
                      }
                    }
                  }
                };

                this.contextMenuTop = -10000; // Need to wait for angular to compute the clientHeight before we can find the best position
                this.contextMenuLeft = -10000; // (see checkForContextMenuPosition)

                this.checkForContextMenuPosition();

                gz3d.scene.selectEntity(model);
              }
            } else {
              this.hideMenu();
              if (gz3d.scene.radialMenu) {
                gz3d.scene.radialMenu.showing = false;
              }
              this.isShown = false;
            }
          },

          axisSelected: function(model) {
            return (
              !model.name ||
              _.some(
                [
                  'TX',
                  'TY',
                  'TZ',
                  'RX',
                  'RY',
                  'RZ',
                  'plane',
                  'TXY',
                  'TXZ',
                  'TYZ'
                ],
                function(parameter) {
                  return parameter === model.name;
                }
              )
            );
          },

          _getModelUnderMouse: function(event) {
            var pos = new THREE.Vector2(event.offsetX, event.offsetY);
            var intersect = new THREE.Vector3();
            var model = gz3d.scene.getRayCastModel(pos, intersect);
            if (model) {
              if (this.axisSelected(model)) {
                model = gz3d.scene.modelManipulator.object;
              }
            }

            return model;
          }
        };
      }
    ]);
})();
