/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file is part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
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
 * ---LICENSE-END **/
/* global THREE: false */
/* global console: false */

(function() {
  'use strict';

  angular
    .module('performanceMonitorModule')
    .factory('performanceMonitorService', [
      'stateService',
      function(stateService) {
        function PerformanceMonitorService() {
          var backgroundColors = [
            'rgb(255, 99, 132)',
            'rgb(75, 192, 192)',
            'rgb(255, 159, 64)',
            'rgb(255, 205, 86)',
            'rgb(54, 162, 235)',
            'rgb(153, 102, 255)',
            'rgb(76, 191, 87)',
            'rgb(182, 148, 79)',
            'rgb(238, 117, 226)',
            'rgb(92, 224, 221)',
            'rgb(193, 224, 28)',
            'rgb(189, 61, 0)'
          ];

          this.config = {
            type: 'pie',
            data: {
              datasets: [
                {
                  data: [0, 0],
                  backgroundColor: [backgroundColors[0], backgroundColors[1]],
                  label: 'Performance Monitoring'
                }
              ],
              labels: ['Neural Simulation', 'World simulation']
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                duration: 0
              },
              tooltips: {
                callbacks: {
                  label: function(tooltipItem, data) {
                    var dataLabel = data.labels[tooltipItem.index];
                    var value =
                      data.datasets[tooltipItem.datasetIndex].data[
                        tooltipItem.index
                      ];

                    return dataLabel + ': ' + Math.round(10 * value) / 10 + 's';
                  }
                }
              },
              legend: {
                display: true,
                position: 'bottom'
              }
            }
          };

          this.clients = [];

          this.getConfig = function() {
            return this.config;
          };

          this.processStateChange = function(message) {
            if (
              angular.isDefined(message.brainsimElapsedTime) &&
              this.clients.length > 0
            ) {
              var data = this.config.data.datasets[0].data;
              var background = this.config.data.datasets[0].backgroundColor;
              var label = this.config.data.labels;
              var index = 2;

              data[0] = message.brainsimElapsedTime;
              data[1] = message.robotsimElapsedTime;

              _.forEach(
                Object.keys(message.transferFunctionsElapsedTime),
                function(key) {
                  if (index >= data.length) {
                    data.push(message.transferFunctionsElapsedTime[key]);
                    background.push(
                      backgroundColors[index % backgroundColors.length]
                    );
                    label.push(key);
                  } else {
                    label[index] = key;
                    data[index] = message.transferFunctionsElapsedTime[key];
                  }
                  index++;
                }
              );

              _.forEach(this.clients, function(client) {
                client.update();
              });
            }
          };

          this.registerClient = function(chart) {
            this.clients.push(chart);

            if (!this.messageCallbackHandler) {
              this.messageCallbackHandler = message =>
                this.processStateChange(message);
              stateService.addMessageCallback(this.messageCallbackHandler);
            }
          };

          this.unregisterClient = function(chart) {
            var index = this.clients.indexOf(chart);
            if (index > -1) {
              this.clients.splice(index, 1);
            }

            if (this.clients.length === 0) {
              stateService.removeMessageCallback(this.messageCallbackHandler);
              this.messageCallbackHandler = null;
            }
          };
        }

        return new PerformanceMonitorService();
      }
    ]);
})();
