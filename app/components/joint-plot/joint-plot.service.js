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
  class JointPlotService {
    // number of points per second
    static get POINT_FREQUENCY() {
      return 2;
    }

    constructor(roslib, simulationInfo, bbpConfig) {
      this.roslib = roslib;
      this.server = simulationInfo.serverConfig.rosbridge.websocket;
      this.jointTopic = bbpConfig.get('ros-topics').joint;
      this.lastMessageTime = Number.MIN_VALUE;

      this.rosConnection = this.roslib.getOrCreateConnectionTo(this.server);
      this.jointTopicSubscriber = this.roslib.createTopic(
        this.rosConnection,
        this.jointTopic,
        'sensor_msgs/JointState',
        // eslint-disable-next-line camelcase
        { throttle_rate: 1.0 / JointPlotService.POINT_FREQUENCY * 1000.0 }
      );
      this.callbacks = [];
    }

    close() {
      if (angular.isDefined(this.topicCallback)) {
        this.jointTopicSubscriber.unsubscribe(this.topicCallback);
      }
    }

    /**
     * Parse messages
     * @instance
     * @method parseMessages
     * @param {} received messages
     */
    parseMessages(message) {
      if (this.callbacks.length === 0) return;

      //10% tolerance timewise
      const tolerance = 1.1;

      let currentTime =
        message.header.stamp.secs + message.header.stamp.nsecs * 0.000000001;

      if (
        Math.abs(currentTime - this.lastMessageTime) * tolerance >=
        1 / JointPlotService.POINT_FREQUENCY
      ) {
        this.lastMessageTime = currentTime;
        for (let i = 0; i < this.callbacks.length; i = i + 1) {
          this.callbacks[i](message);
        }
      }
    }

    /**
     * Subscribes to the joint ros-topic
     * @instance
     * @method subscribe
     * @param {} callback The callback to be called when joint topic messages are received
     */
    subscribe(callback) {
      this.callbacks.push(callback);
      if (this.callbacks.length === 1) {
        // we went from zero subscribers to one
        this.topicCallback = msg => this.parseMessages(msg);
        this.jointTopicSubscriber.subscribe(this.topicCallback);
      }
    }

    /**
     * Unsubscribes to the joint ros-topic
     * @instance
     * @method unsubscribe
     * @param {} callback The callback to be removed from the list of callbacks
     */
    unsubscribe(callback) {
      let index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);

        // in case we have zero callbacks now, unsubscribe
        if (this.callbacks.length === 0) {
          this.jointTopicSubscriber.unsubscribe(this.topicCallback);
        }
      }
    }
  }

  JointPlotService.$$ngIsClass = true;
  JointPlotService.$inject = ['roslib', 'simulationInfo', 'bbpConfig'];

  angular.module('jointPlotModule').service('jointService', JointPlotService);
})();
