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

  /* global console: false */

  //auto scroll when the distance from bottom of the scrollable area <= than AUTO_SCROLL_MAX_DISTANCE
  const AUTO_SCROLL_MAX_DISTANCE = 10;
  const MAX_VISIBLE_LOGS = 100; //number of last received logs kept visible
  const LOG_INTERVAL = 500;

  class LogConsoleController {
    constructor(
      $scope,
      $timeout,
      $element,
      stateService,
      clientLoggerService,
      editorToolbarService,
      STATE,
      LOG_TYPE
    ) {
      this.logs = [];
      this.stateService = stateService;
      this.STATE = STATE;
      const logList = $element.find('.log-list')[0];
      // notify toolbar to reset the displayed log counter

      clientLoggerService.resetLoggedMessages();

      let logSubscription = clientLoggerService.logs
        .filter(log => log.level === LOG_TYPE.INFO)
        .map(log => ({
          time: moment().format('HH:mm:ss'),
          msg: log.message
        }))
        .bufferTime(LOG_INTERVAL)
        .filter(m => m.length)
        .subscribe(m => this.newMessagesReceived(m));

      const that = this;

      function scrollToBottom() {
        if (
          logList.scrollHeight - (logList.scrollTop + logList.clientHeight) <
          AUTO_SCROLL_MAX_DISTANCE
        ) {
          setTimeout(() => (logList.scrollTop = logList.scrollHeight));
        }
      }
      //Present the first MAX_VISIBLE_LOGS messages in the history
      that.logs = clientLoggerService.getLogHistory
        .slice(-MAX_VISIBLE_LOGS)
        .map(log => {
          return {
            msg: log.message,
            time: log.time
          };
        });
      scrollToBottom();

      this.newMessagesReceived = function(messages) {
        $timeout(() => {
          that.logs.splice(that.logs.length, 0, ...messages);
          //remove extra logs
          that.logs.splice(0, that.logs.length - MAX_VISIBLE_LOGS);

          //set vertical scroll to bottom after new log current log is at the bottom
          scrollToBottom();
        });
      };

      $scope.$on('$destroy', function() {
        logSubscription.unsubscribe();
        editorToolbarService.showLogConsole = false;
      });
    }
  }

  LogConsoleController.$$ngIsClass = true;
  LogConsoleController.$inject = [
    '$scope',
    '$timeout',
    '$element',
    'stateService',
    'clientLoggerService',
    'editorToolbarService',
    'STATE',
    'LOG_TYPE'
  ];

  angular
    .module('clientLoggerModule')
    .controller('LogConsoleController', LogConsoleController);
})();
