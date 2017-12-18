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
   * @module clientLoggerModule
   * @name clientLoggerModule.clientLoggerService
   * @description Service that manages subscriptions to the client logger ros-topic
   */
  class ClientLoggerService {
    // number of points per second
    get logs() {
      return this.multicasted;
    }

    constructor(
      roslib,
      simulationInfo,
      bbpConfig,
      dynamicViewOverlayService,
      DYNAMIC_VIEW_CHANNELS,
      LOG_TYPE
    ) {
      this.roslib = roslib;
      this.websocket = simulationInfo.serverConfig.rosbridge.websocket;
      this.rosTopic = bbpConfig.get('ros-topics').logs;
      this.LOG_TYPE = LOG_TYPE;
      //this.dynamicViewOverlayService = dynamicViewOverlayService;
      //this.DYNAMIC_VIEW_CHANNELS = DYNAMIC_VIEW_CHANNELS;
      this.logHistory = [];
      this.missedConsoleLogs = 0;

      //creates an observable from subscribe/unsubscribe emthods
      let logsObservable = Rx.Observable.fromEventPattern(
        cb => this.subscribeRosTopic(cb),
        () => this.unsubscribeRosTopic()
      );

      //let's use a subject to handle multiple subscribers
      this.subject = new Rx.Subject();

      this.multicasted = logsObservable
        .multicast(this.subject) //we multicast the observable to the subject
        .refCount(); // auto handle the reference count: call 'subscribe' on ref count 0->1 and call unsubscribe on 1->0

      var consoleLogReceived = log => {
        dynamicViewOverlayService
          .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.LOG_CONSOLE)
          .then(isConsoleOpen => {
            if (!isConsoleOpen) {
              this.missedConsoleLogs++;
            }
          });
        log.time = moment().format('HH:mm:ss');
        this.logHistory.push(log);
      };
      this.logSubscription = this.logs
        .filter(log => log.level === LOG_TYPE.INFO)
        .subscribe(log => consoleLogReceived(log));
    }

    onExit() {
      this.logSubscription.unsubscribe();
    }

    /**
     * Public method to log a message with a specifig log type
     * @instance
     * @method logMessage
     * @param message is a string that includes the message
     * @param type is a LOG_TYPE that represents the location where the message is displayed
     */
    logMessage(message, type = this.LOG_TYPE.INFO) {
      this.subject.next({ level: type, message: message });
    }

    /**
    * Private method subscribing to the log ros-topic
    * @instance
    * @method subscribeRosTopic
    * @param {} callback The callback to be called when joint topic messages are received
    */
    subscribeRosTopic(newMessageReceived) {
      var rosConnection = this.roslib.getOrCreateConnectionTo(this.websocket);
      this.topicSubscriber = this.roslib.createTopic(
        rosConnection,
        this.rosTopic,
        'cle_ros_msgs/ClientLoggerMessage'
      );
      this.topicSubscription = this.topicSubscriber.subscribe(
        newMessageReceived,
        true
      );
    }

    /**
    * Private method unsubscribing to the log ros-topic
    * @instance
    * @method unsubscribeRosTopic
    */
    unsubscribeRosTopic() {
      this.topicSubscriber &&
        this.topicSubscriber.unsubscribe(this.topicSubscription);
      delete this.topicSubscriber;
      delete this.topicSubscription;
    }

    /**
     * Public method that has to be called if log history is collected
     * @instance
     * @method resetLoggedMessages
     */
    resetLoggedMessages() {
      this.missedConsoleLogs = 0;
    }

    /**
     * Public getter that returns all previously received log messages
     * @instance
     * @method getLogHistory
     */
    get getLogHistory() {
      return this.logHistory;
    }
  }

  ClientLoggerService.$$ngIsClass = true;
  ClientLoggerService.$inject = [
    'roslib',
    'simulationInfo',
    'bbpConfig',
    'dynamicViewOverlayService',
    'DYNAMIC_VIEW_CHANNELS',
    'LOG_TYPE'
  ];

  angular
    .module('clientLoggerModule', [])
    .service('clientLoggerService', ClientLoggerService)
    .constant('LOG_TYPE', {
      INFO: 1,
      ADVERTS: 2
    });
})();
