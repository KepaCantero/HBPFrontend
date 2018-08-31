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

  let hasSensorChildren = node => {
    let result = false;
    node.traverse(child => {
      if (
        child.userData &&
        child.userData.gazeboType &&
        child.userData.gazeboType === 'sensor'
      ) {
        result = true;
      }
    });
    return result;
  };

  class RobotComponentsService {
    constructor(gz3d, roslib, simulationInfo) {
      this.gz3d = gz3d;
      this.roslib = roslib;
      this.simulationInfo = simulationInfo;
    }

    initialize() {
      if (this.initialized) {
        return;
      }
      // model property service
      this.rosWebsocketURL = this.simulationInfo.serverConfig.rosbridge.websocket;
      this.rosWebsocket = this.roslib.getOrCreateConnectionTo(
        this.rosWebsocketURL
      );
      this.rosModelPropertyService = new this.roslib.Service({
        ros: this.rosWebsocket,
        name: '/gazebo/get_model_properties',
        serviceType: 'GetModelProperties'
      });

      this.getRobotModelProperties();

      this.initialized = true;
    }
    getRobot() {
      this.robot = this.gz3d.scene.selectedEntity;
      return this.robot;
    }
    getRobotModelProperties() {
      /* eslint-disable camelcase */
      var request = new this.roslib.ServiceRequest({
        model_name: 'robot'
      });
      /* eslint-enable camelcase */

      this.rosModelPropertyService.callService(
        request,
        success => {
          this.parseRobotModelProperties(success);
        },
        failure => {
          console.info(failure);
        }
      );
    }

    parseRobotModelProperties(rosRobotProperties) {
      /* eslint-disable camelcase */
      this.sensors = [];

      if (
        rosRobotProperties.sensor_names &&
        rosRobotProperties.sensor_names.length > 0
      ) {
        for (let i = 0; i < rosRobotProperties.sensor_names.length; i = i + 1) {
          let sensorName = rosRobotProperties.sensor_names[i];
          let sensorType = rosRobotProperties.sensor_types[i];
          let sensorModelHierarchy = sensorName.split('::');
          let sensorObject = this.robot.getObjectByName(
            sensorModelHierarchy[sensorModelHierarchy.length - 1]
          );

          let topicObject = new THREE.Object3D();
          topicObject.sensorname = sensorName;
          topicObject.sensortype = sensorType;
          topicObject.userData.gazeboType = 'rostopic';
          topicObject.userData.type = 'sensor';
          topicObject.name = 'URL to topic could not be retrieved';

          if (
            rosRobotProperties.sensor_ros_message_type &&
            rosRobotProperties.sensor_ros_message_type[i] &&
            //this is a very important check, cause there are some robots for which the
            //ros sensors are not setup properly and thus we have no way to map the sensor names
            // to the sensor_names_ROS if the two arrays are not sized the same
            rosRobotProperties.sensor_names_ROS.length ==
              rosRobotProperties.sensor_names.length
          ) {
            let topicURL = rosRobotProperties.rostopic_sensor_urls[i];
            topicObject.userData.rosTopic = '/' + topicURL;
            topicObject.name = 'ROS: /' + topicURL;
            topicObject.userData.rosType = rosRobotProperties.sensor_ros_message_type[
              i
            ].replace('/', '.msg.');
          } else topicObject.userData.rosType = 'unknown';

          sensorObject.add(topicObject);
          this.sensors.push(sensorObject);
        }
      }

      this.actuators = [];
      if (
        rosRobotProperties.rostopic_actuator_urls &&
        rosRobotProperties.rostopic_actuator_urls.length > 0
      ) {
        if (!this.robotControllers) {
          this.robotControllers = new THREE.Object3D();
          this.robotControllers.name = 'Controllers';
          this.robotControllers.userData.gazeboType = 'robotComponentsTreeInfo';
          this.robot.add(this.robotControllers);
        }

        for (
          let i = 0;
          i < rosRobotProperties.rostopic_actuator_urls.length;
          i = i + 1
        ) {
          let topicURL = rosRobotProperties.rostopic_actuator_urls[i];
          let topicObject = new THREE.Object3D();
          topicObject.name = 'ROS: /' + topicURL;
          topicObject.userData.gazeboType = 'rostopic';
          topicObject.userData.rosTopic = '/' + topicURL;
          topicObject.userData.type = 'actuator';
          if (
            rosRobotProperties.actuator_ros_message_type &&
            rosRobotProperties.actuator_ros_message_type[i]
          ) {
            topicObject.userData.rosType = rosRobotProperties.actuator_ros_message_type[
              i
            ].replace('/', '.msg.');
          } else topicObject.userData.rosType = 'unknown';

          this.robotControllers.add(topicObject);

          this.actuators.push(topicObject);
        }
      }
      /* eslint-enable camelcase */

      // add "no sensors" to links without sensor children
      this.robot.traverse(child => {
        if (child.userData.gazeboType === 'link' && !hasSensorChildren(child)) {
          let noSensorObject = new THREE.Object3D();
          noSensorObject.name = 'no topics available';
          noSensorObject.userData.gazeboType = 'rostopic';
          child.add(noSensorObject);
        }
      });
    }

    getCameraTopicURL(cameraTopicURLS, cameraName) {
      let topicURL = undefined;
      cameraTopicURLS.forEach(topic => {
        if (topic.indexOf(cameraName) === 0) {
          // topic begins with camera name
          topicURL = topic;
        }
      });
      return topicURL;
    }

    isCameraComponentTopic(component) {
      return (
        component &&
        component.userData &&
        component.userData.gazeboType &&
        component.userData.gazeboType === 'rostopic' &&
        component.userData.rosTopic &&
        component.sensortype &&
        component.sensortype === 'camera'
      );
    }
  }

  RobotComponentsService.$$ngIsClass = true;
  RobotComponentsService.$inject = ['gz3d', 'roslib', 'simulationInfo'];

  angular
    .module('robotComponentsModule')
    .service('robotComponentsService', RobotComponentsService);
})();
