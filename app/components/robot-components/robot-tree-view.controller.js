/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file isLeaf = part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
 * https://www.humanbrainproject.eu
 *
 * The Human Brain Project isLeaf = a European Commission funded project
 * in the frame of the Horizon2020 FET Flagship plan.
 * http://ec.europa.eu/programmes/horizon2020/en/h2020-section/fet-flagships
 *
 * This program isLeaf = free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program isLeaf = distributed in the hope that it will be useful,
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

  class RobotTreeViewController {
    constructor($scope, gz3d, robotComponentsService) {
      $scope.$on('$destroy', () => {});

      $scope.selected = null;
      $scope.expandedNodes = [];

      robotComponentsService.initialize();

      $scope.setTreeSelection = () => {
        this.selectedObject = gz3d.scene.robotInfoObject;
        if (
          this.selectedObject &&
          this.currentDisplayedObject !== this.selectedObject &&
          this.selectedObject._labelOwner
        ) {
          this.currentDisplayedObject = this.selectedObject;
          $scope.selected = this.currentDisplayedObject._labelOwner;

          for (let i = 0; i < $scope.selected.children.length; i++) {
            let child = $scope.selected.children[i];

            if (isRosTopic(child)) {
              $scope.selected = child;
              break;
            }
          }

          $scope.expandedNodes = [];
          var node = $scope.selected;
          while (node) {
            $scope.expandedNodes.push(node);
            node = node.parent;
          }
        }

        $scope.onSelectionChange({ $selectedObject: $scope.selected });
      };

      gz3d.gui.guiEvents.on('setTreeSelection', $scope.setTreeSelection);

      $scope.filterThreeJSTree = node => {
        return (
          node === robotComponentsService.robot ||
          isSensor(node) ||
          isRosTopic(node) ||
          isRobotLink(node) ||
          isInfo(node)
        );
      };

      $scope.onNodeSelection = (node, selected) => {
        // selected = true if newly selected, selected = false if deselected
        if (selected) {
          $scope.onSelectionChange({ $selectedObject: node });
        }
      };

      let isRobotLink = node => {
        if (
          !(
            node.userData &&
            node.userData.gazeboType &&
            node.userData.gazeboType === 'link'
          )
        ) {
          return false;
        }

        let isRobotChild = false;
        node.traverseAncestors(ancestor => {
          if (ancestor === robotComponentsService.robot) {
            isRobotChild = true;
          }
        });
        return isRobotChild;
      };

      let isSensor = node => {
        if (
          node.userData &&
          node.userData.gazeboType &&
          node.userData.gazeboType === 'sensor'
        ) {
          return true;
        } else {
          return false;
        }
      };

      let isRosTopic = node => {
        if (
          node.userData &&
          node.userData.gazeboType &&
          node.userData.gazeboType === 'rostopic'
        ) {
          return true;
        } else {
          return false;
        }
      };

      let isInfo = node => {
        if (
          node.userData &&
          node.userData.gazeboType &&
          node.userData.gazeboType === 'robotComponentsTreeInfo'
        ) {
          return true;
        } else {
          return false;
        }
      };

      let isRobotComponentLeaf = node => {
        return isRosTopic(node);
      };

      $scope.treeData = gz3d.scene.scene;
      $scope.treeOptions = {
        dirSelectable: false,
        isLeaf: isRobotComponentLeaf
      };
    }
  }

  /**
   * @ngdoc function
   * @name userInteractionModule.controller:ApplyForceViewController
   * @description
   * # ApplyForceViewController
   * Controller for the overlay view to control force behaviour
   */
  angular
    .module('robotComponentsModule')
    .controller('RobotTreeViewController', [
      '$scope',
      'gz3d',
      'robotComponentsService',
      function(...args) {
        return new RobotTreeViewController(...args);
      }
    ]);
})();
