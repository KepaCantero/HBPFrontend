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

  angular.module('noiseModelModule').service('noiseModelService', [
    function() {
      function NoiseModelService() {
        this.sensorname = '';
        this.modelname = '';
        this.originalvalue = [];

        this.setDataNoiseModel = function(
          nodeModelName,
          nodeSensorName,
          nodeSensorType
        ) {
          this.modelname = nodeModelName;
          this.sensorname = nodeSensorName;
          this.sensortype = nodeSensorType;
        };

        this.getModelNameNoiseModel = function() {
          return this.modelname;
        };

        this.getSensorNameNoiseModel = function() {
          return this.sensorname;
        };

        this.getSensorTypeNoiseModel = function() {
          return this.sensortype;
        };

        this.setOriginalValue = function(
          mean,
          stddev,
          selNoiseType,
          selSensorName
        ) {
          var savedate = true;
          let j = this.originalvalue.length;
          if (j > 3) {
            for (var i = 3; i < j; i = i + 4) {
              if (selSensorName == this.originalvalue[i]) {
                savedate = false;
                break;
              }
            }
          }
          if (j < 2 || savedate) {
            this.originalvalue[j] = mean;
            this.originalvalue[j + 1] = stddev;
            this.originalvalue[j + 2] = selNoiseType;
            this.originalvalue[j + 3] = selSensorName;
          }
        };

        this.getOriginalValue = function(selSensorName) {
          let j = this.originalvalue.length;
          for (var i = 3; i < j; i = i + 4) {
            if (selSensorName == this.originalvalue[i]) {
              var value = [
                this.originalvalue[i - 3],
                this.originalvalue[i - 2],
                this.originalvalue[i - 1],
                this.originalvalue[i]
              ];
              return value;
            }
          }
        };
      }

      return new NoiseModelService();
    }
  ]);
})();
