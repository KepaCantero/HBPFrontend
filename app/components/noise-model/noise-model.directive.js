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

  angular
    .module('noiseModelModule', ['dynamicViewOverlayModule'])
    .directive('noiseModel', [
      'noiseModelService',
      'baseEventHandler',
      'simulationInfo',
      'roslib',
      function(noiseModelService, baseEventHandler, simulationInfo, roslib) {
        return {
          templateUrl: 'components/noise-model/noise-model.template.html',
          restrict: 'E',
          replace: true,
          scope: {
            toggleVisibility: '&',
            ngShow: '=?'
          },
          link: scope => {
            scope.suppressKeyPress = function(event) {
              baseEventHandler.suppressAnyKeyPress(event);
            };

            var modelsZeroMean = ['gamma', 'fisher', 'squared'];
            var modelsZeroStddev = ['gamma', 'cauchy', 'lognormal', 'fisher'];

            var robotName = noiseModelService.getModelNameNoiseModel();
            scope.selSensorName = noiseModelService.getSensorNameNoiseModel();
            var selSensorType = noiseModelService.getSensorTypeNoiseModel();

            if (selSensorType == 'camera') {
              scope.showLibnoise = true;
              scope.LibnoisePerlin = 'Generic - Libnoise Perlin';
            }

            let rosBridgeURL = simulationInfo.serverConfig.rosbridge.websocket;
            var rosConnection = roslib.getOrCreateConnectionTo(rosBridgeURL);
            var rosServiceNoiseParameters = new roslib.Service({
              ros: rosConnection,
              name: '/gazebo/set_sensor_noise_properties',
              serviceType: 'gazebo_msgs/SetSensorNoiseProperties'
            });

            var rosServiceGetNoiseParameters = new roslib.Service({
              ros: rosConnection,
              name: '/gazebo/get_sensor_noise_properties',
              serviceType: 'gazebo_msgs/getSensorNoiseProperties'
            });

            /* eslint-disable camelcase */
            var request0 = new roslib.ServiceRequest({
              model_name: robotName,
              sensor_name: scope.selSensorName
            });
            /* eslint-enable camelcase */
            rosServiceGetNoiseParameters.callService(request0, function(
              result
            ) {
              scope.selNoiseType = result.type_noise;
              if (scope.selNoiseType != '') {
                document.getElementById(
                  'oi' + scope.selNoiseType
                ).checked = true;
              }
              scope.stddev = result.std_dev;
              scope.mean = result.mean;
              noiseModelService.setOriginalValue(
                scope.mean,
                scope.stddev,
                scope.selNoiseType,
                scope.selSensorName
              );
            });

            scope.resetValueClicked = function() {
              scope.originalvalue = noiseModelService.getOriginalValue(
                scope.selSensorName
              );
              if (scope.selNoiseType != '') {
                document.getElementById(
                  'oi' + scope.selNoiseType
                ).checked = false;
              }
              scope.mean = scope.originalvalue[0];
              scope.stddev = scope.originalvalue[1];
              scope.selNoiseType = scope.originalvalue[2];
              if (scope.selNoiseType != '') {
                document.getElementById(
                  'oi' + scope.selNoiseType
                ).checked = true;
              } else {
                scope.selNoiseType = 'gaussian';
              }
              updateAll();
              sendParametersToGazebo();
            };

            var sendParametersToGazebo = function() {
              /* eslint-disable camelcase */
              var request = new roslib.ServiceRequest({
                model_name: robotName,
                sensor_name: scope.selSensorName,
                noise_type: scope.selNoiseType,
                mean: scope.mean,
                std_dev: scope.stddev
              });
              /* eslint-enable camelcase */
              rosServiceNoiseParameters.callService(request, function(result) {
                return result;
              });
            };

            scope.onMeanParameterChanged = function() {
              var checkZeroValueMean = false;
              for (var i = 0; i < modelsZeroMean.length; i++) {
                if (scope.selNoiseType == modelsZeroMean[i]) {
                  checkZeroValueMean = true;
                  break;
                }
              }
              if (
                scope.mean < 0.0 ||
                (scope.mean == 0.0 && checkZeroValueMean)
              ) {
                scope.selectedStyleMean = 'background-color:red;';
              } else {
                scope.selectedStyleMean = '';
                sendParametersToGazebo();
              }
            };

            scope.onStdDevParameterChanged = function() {
              var checkZeroValueStddev = false;
              for (var i = 0; i < modelsZeroStddev.length; i++) {
                if (scope.selNoiseType == modelsZeroStddev[i]) {
                  checkZeroValueStddev = true;
                  break;
                }
              }
              if (
                scope.stddev < 0.0 ||
                (scope.stddev == 0.0 && checkZeroValueStddev)
              ) {
                scope.selectedStyleStddev = 'background-color:red;';
              } else {
                scope.selectedStyleStddev = '';
                sendParametersToGazebo();
              }
            };

            var updateAll = function() {
              scope.disabledMean = false;
              scope.disabledStddev = false;
              if (scope.selNoiseType == 'squared') {
                scope.disabledStddev = true;
              }
              if (scope.selNoiseType == 'libnoise') {
                scope.disabledMean = true;
                scope.disabledStddev = true;
              }
              scope.onMeanParameterChanged();
              scope.onStdDevParameterChanged();
            };

            scope.setNoiseModel = function(mode) {
              if (scope.selNoiseType != '') {
                document.getElementById(
                  'oi' + scope.selNoiseType
                ).checked = false;
                document.getElementById('oi' + mode).checked = true;
              }
              scope.selNoiseType = mode;
              updateAll();
              if (
                scope.selectedStyleStddev == '' &&
                scope.selectedStyleMean == ''
              ) {
                sendParametersToGazebo();
              }
            };
          }
        };
      }
    ]);
})();
