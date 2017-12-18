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
  /* global n3Charts */
  n3Charts.Factory.Transition.defaultDuration = 0;

  class JoinPlotController {
    //visible seconds
    static get WINDOW_TIME() {
      return 10;
    }
    get properties() {
      return ['position', 'velocity', 'effort'];
    }

    constructor(
      $element,
      scope,
      RESET_TYPE,
      jointService,
      dynamicViewOverlayService
    ) {
      this.plot = {
        curves: {},
        options: {
          drawDots: true,
          drawLegend: false,
          tooltipHook: () => false,
          tooltip: { mode: 'none' },
          axes: {
            x: {
              key: 'time',
              ticks: 10,
              min: 0,
              max: JoinPlotController.WINDOW_TIME
            },
            y: { padding: { min: 5, max: 5 } }
          },
          series: []
        }
      };

      this.selectedProperty = { name: this.properties[0] };

      scope.$on('RESET', (event, resetType) => {
        if (resetType !== RESET_TYPE.RESET_CAMERA_VIEW) this.clearPlot();
      });

      let messageCallback = msg => this.onNewJointMessage(msg);
      jointService.subscribe(messageCallback);

      scope.$on('$destroy', () => jointService.unsubscribe(messageCallback));

      // if we are inside an overlay, set size at start
      // linechart keeps increasing in size with every draw if container doesn't have a set size
      let overlayWrapper = dynamicViewOverlayService.getParentOverlayWrapper(
        $element
      );
      if (overlayWrapper) {
        overlayWrapper.style.height = '300px';
      }
    }

    onNewJointMessage(message) {
      if (!this.allJoints) this.initializeJoints(message.name);

      var currentTime =
        message.header.stamp.secs + message.header.stamp.nsecs * 0.000000001;
      if (currentTime > this.plot.options.axes.x.max) {
        this.plot.options.axes.x.max = currentTime;
        this.plot.options.axes.x.min =
          currentTime - JoinPlotController.WINDOW_TIME;
      }

      _.forOwn(this.plot.curves, values => {
        while (values.length && values[0].time < this.plot.options.axes.x.min)
          values.shift();
      });
      _.forEach(message.name, (name, idx) => {
        this.properties.forEach(prop => {
          this.plot.curves[name + '_' + prop].push({
            time: currentTime,
            y: message[prop][idx]
          });
        });
      });
    }

    initializeJoints(allJoints) {
      let colorScale = d3.scale.category10();

      this.allJoints = allJoints.map((joint, i) => ({
        name: joint,
        color: colorScale(i),
        selected: false
      }));

      this.allJoints.forEach(joint => {
        this.properties.forEach(prop => {
          let curveName = joint.name + '_' + prop;
          this.plot.curves[curveName] = [];
          this.plot.options.series.push({
            //chart series = cartesian multiplication curves * properties
            key: 'y',
            joint,
            prop,
            type: ['dot', 'line'],
            dataset: curveName,
            color: joint.color
          });
        });
      });

      this.updateVisibleSeries();
    }

    clearPlot() {
      _.forOwn(this.plot.curves, values => (values.length = 0));
      this.plot.options.axes.x.min = 0;
      this.plot.options.axes.x.max = JoinPlotController.WINDOW_TIME;
    }

    updateVisibleSeries() {
      this.plot.options.series.forEach(serie => {
        serie.visible =
          serie.prop === this.selectedProperty.name && !!serie.joint.selected;
      });
    }
  }

  JoinPlotController.$$ngIsClass = true;
  JoinPlotController.$inject = [
    '$element',
    '$scope',
    'RESET_TYPE',
    'jointService',
    'dynamicViewOverlayService'
  ];

  angular
    .module('jointPlotModule', ['bbpConfig'])
    .controller('JoinPlotController', JoinPlotController);
})();
