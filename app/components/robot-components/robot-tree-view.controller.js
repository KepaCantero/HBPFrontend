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
    constructor($scope, gz3d, roslib, simulationInfo) {
      $scope.$on('$destroy', () => {});

      $scope.selected = null;
      $scope.expandedNodes = [];

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

            if (isTopic(child)) {
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

      $scope.showSelected = node => {
        $scope.onSelectionChange({ $selectedObject: node });
      };

      $scope.filterThreeJSTree = node => {
        return (
          node === this.robot ||
          isSensor(node) ||
          isTopic(node) ||
          isRobotLink(node) ||
          isInfo(node)
        );
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
          if (ancestor === this.robot) {
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

      let isTopic = node => {
        if (
          node.userData &&
          node.userData.gazeboType &&
          node.userData.gazeboType === 'topic'
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
          node.userData.gazeboType === 'info'
        ) {
          return true;
        } else {
          return false;
        }
      };

      let hasSensorChildren = node => {
        let result = false;
        node.traverse(child => {
          if (isSensor(child)) {
            result = true;
          }
        });
        return result;
      };

      let isRobotComponentLeaf = node => {
        return isTopic(node) || isInfo(node);
      };

      let getRobotModelProperties = () => {
        // model property service
        this.rosWebsocketURL = simulationInfo.serverConfig.rosbridge.websocket;
        this.rosWebsocket = roslib.getOrCreateConnectionTo(
          this.rosWebsocketURL
        );
        this.rosModelPropertyService = new roslib.Service({
          ros: this.rosWebsocket,
          name: '/gazebo/get_model_properties',
          serviceType: 'GetModelProperties'
        });

        /* eslint-disable camelcase */
        var request = new roslib.ServiceRequest({
          model_name: 'robot'
        });
        /* eslint-enable camelcase */

        this.rosModelPropertyService.callService(
          request,
          success => {
            parseSensorProperties(success);
          },
          failure => {
            console.info(failure);
          }
        );
      };

      let parseSensorProperties = rosRobotProperties => {
        /* eslint-disable camelcase */
        this.cameras = [];
        for (let i = 0; i < rosRobotProperties.sensor_names.length; i = i + 1) {
          if (rosRobotProperties.sensor_types[i] === 'camera') {
            let sensorName = rosRobotProperties.sensor_names[i];
            let cameraName =
              rosRobotProperties.camera_names[this.cameras.length];
            let topicURL = getCameraTopicURL(
              rosRobotProperties.rostopic_camera_urls,
              cameraName
            );

            let sensorModelHierarchy = sensorName.split('::');
            let sensorObject = this.robot.getObjectByName(
              sensorModelHierarchy[sensorModelHierarchy.length - 1]
            );
            let topicObject = new THREE.Object3D();
            topicObject.name = 'ROS: /' + topicURL;
            topicObject.userData.gazeboType = 'topic';
            sensorObject.add(topicObject);

            this.cameras.push({
              modelHierarchyString: sensorName,
              cameraName: cameraName,
              topicURL: topicURL,
              topicObject: topicObject
            });
          }
        }
        /* eslint-enable camelcase */

        // add "no sensors" to links without sensor children
        this.robot.traverse(child => {
          if (
            child.userData.gazeboType === 'link' &&
            !hasSensorChildren(child)
          ) {
            let noSensorObject = new THREE.Object3D();
            noSensorObject.name = 'no sensors available';
            noSensorObject.userData.gazeboType = 'info';
            child.add(noSensorObject);
          }
        });
      };

      let getCameraTopicURL = (cameraTopicURLS, cameraName) => {
        let topicURL = undefined;
        cameraTopicURLS.forEach(topic => {
          if (topic.indexOf(cameraName) === 0) {
            // topic begins with camera name
            topicURL = topic;
          }
        });
        return topicURL;
      };

      this.robot = gz3d.scene.scene.getObjectByName('robot');

      $scope.treeData = gz3d.scene.scene;
      $scope.treeOptions = {
        dirSelectable: false,
        isLeaf: isRobotComponentLeaf
      };

      getRobotModelProperties();
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
      'roslib',
      'simulationInfo',
      function(...args) {
        return new RobotTreeViewController(...args);
      }
    ]);
})();
