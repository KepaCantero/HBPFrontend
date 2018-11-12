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

  class SpikeTrainController {
    static get PLOT_COLOR() {
      return 'black';
    }
    static get FONT() {
      return 'sans-serif';
    }
    static get MARK_INTERVAL() {
      return 2;
    } //s
    static get MIN_NEURON_HEIGHT() {
      return 1;
    } //px

    set drawingCanvas(value) {
      this.canvas = value;
      this.canvasCtx = this.canvas.getContext('2d');
    }

    constructor(
      $element,
      $filter,
      $scope,
      $timeout,
      RESET_TYPE,
      SPIKE_TIMELABEL_SPACE,
      spikeListenerService
    ) {
      this.SEPARATOR_MSG = Symbol('sep');

      this.$filter = $filter;
      this.spikeListenerService = spikeListenerService;
      this.SPIKE_TIMELABEL_SPACE = SPIKE_TIMELABEL_SPACE;

      this.firstRun = true;
      this.messages = [];
      this.neuronCount = 0;

      this.onNewSpikesMessage = msg => this.newSpikesMessage(msg);

      this.drawingCanvas = $element.find('canvas')[0];

      this.startSpikeDisplay();

      let pollCheckResize = () => {
        let newDimensions = [
          this.canvas.parentNode.offsetWidth,
          this.canvas.parentNode.offsetHeight
        ].join('x');
        if (this.oldDimensions !== newDimensions) {
          this.calculateCanvas();
        }
        this.oldDimensions = newDimensions;
        $timeout(pollCheckResize, 500);
      };
      $timeout(pollCheckResize, 500);

      $scope.$on('RESET', (event, resetType) => {
        if (resetType !== RESET_TYPE.RESET_CAMERA_VIEW) this.clearPlot();
      });

      $scope.$on('$destroy', () => {
        this.stopSpikeDisplay();
        angular.element(window).off('resize.spiketrain');
      });
    }

    /**
     * Returns whether the size could been calculated
     */
    calculateCanvas() {
      const parent = this.canvas.parentNode;
      if (!parent.offsetWidth || !parent.offsetHeight) return false;

      this.canvas.setAttribute('height', parent.offsetHeight - 10); //margin to avoid parasite scrollbar
      this.canvas.setAttribute('width', parent.offsetWidth);

      this.calculateCanvasSize();
      this.redraw();
      return true;
    }

    clearPlot() {
      this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.firstRun = true;
      this.messages = [];
    }

    newSpikesMessage(msg) {
      this.messages.push(msg);
      // How many messages are not needed
      const d = this.messages.length - $(document).width();
      if (d > 0)
        // Remove them
        this.messages.splice(0, d);

      this.plotMessage(msg);
    }

    plotMessage(msg, verifyNeuronCount = true) {
      this.translate(1);

      if (!msg || !msg.spikes || msg.neuronCount === undefined) return;

      if (verifyNeuronCount && this.neuronCount !== msg.neuronCount) {
        this.neuronCount = msg.neuronCount;
        this.calculateCanvasSize() && this.redraw();
      }

      let neuronHeight = Math.max(
        Math.floor(
          (this.canvas.height - this.SPIKE_TIMELABEL_SPACE * 2) /
            msg.neuronCount
        ),
        SpikeTrainController.MIN_NEURON_HEIGHT
      );

      if (msg.simulationTime % SpikeTrainController.MARK_INTERVAL === 0)
        this.drawMark(msg.simulationTime);

      this.setColor();

      msg.spikes
        .map(spike => spike.neuron * neuronHeight + this.SPIKE_TIMELABEL_SPACE)
        .forEach(y0 => this.plotLine(y0, neuronHeight));
    }

    setColor(color = SpikeTrainController.PLOT_COLOR) {
      this.canvasCtx.fillStyle = this.canvasCtx.strokeStyle = color;
    }

    plotLine(y = 0, height = 0) {
      // 0.5 offset for pure black lines (see: http://mzl.la/1NpjoBh)
      const xPos = this.visibleWidth - 0.5;

      this.canvasCtx.beginPath();
      // do canvas.height - y so that we draw from the bottom of the canvas up
      this.canvasCtx.moveTo(xPos, this.canvas.height - y);
      this.canvasCtx.lineTo(xPos, this.canvas.height - (y + height));
      this.canvasCtx.stroke();
    }

    translate(hDelta = 0) {
      const originOp = this.canvasCtx.globalCompositeOperation;
      this.canvasCtx.globalCompositeOperation = 'copy'; //override left pixels
      this.canvasCtx.drawImage(this.canvas, -hDelta, 0);
      //this.canvasCtx.clearRect(this.visibleWidth - hDelta, this.SPIKE_TIMELABEL_SPACE, hDelta, this.canvas.height - 2 * this.SPIKE_TIMELABEL_SPACE);
      this.canvasCtx.globalCompositeOperation = originOp;
    }

    drawMark(time) {
      const MARK_COLOR = 'red';
      const MARK_SIZE = 10;

      this.setColor(MARK_COLOR);
      this.plotLine(
        this.SPIKE_TIMELABEL_SPACE,
        this.canvas.height - 2 * this.SPIKE_TIMELABEL_SPACE
      );

      const timeText = this.$filter('timeDDHHMMSS')(time);
      this.canvasCtx.textAlign = 'center';

      // draw time stamp at top and bottom of the canvas
      [this.canvas.height, MARK_SIZE].forEach(y => {
        this.canvasCtx.fillText(timeText, this.visibleWidth - 1, y);
      });
    }

    drawSeparator() {
      const SEP_SIZE = 30;
      const SEP_MARGIN = 15;
      const SEP_CHAR = '\u2248';

      const lineHeight = this.canvas.height - 2 * this.SPIKE_TIMELABEL_SPACE;
      const originalFont = this.canvasCtx.font;

      this.translate(SEP_MARGIN);

      this.setColor();
      this.plotLine(this.SPIKE_TIMELABEL_SPACE, lineHeight);

      // Draw double ~ sign
      this.canvasCtx.font = `${SEP_SIZE}px ${SpikeTrainController.FONT}`;
      this.canvasCtx.fillText(
        SEP_CHAR,
        this.visibleWidth,
        this.canvas.height / 2
      );

      this.canvasCtx.font = originalFont;

      this.translate(SEP_MARGIN);
    }

    startSpikeDisplay() {
      this.spikeListenerService.startListening(this.onNewSpikesMessage);
      if (!this.firstRun) this.messages.push(this.SEPARATOR_MSG);

      this.firstRun = false;
    }

    stopSpikeDisplay() {
      this.spikeListenerService.stopListening(this.onNewSpikesMessage);
    }

    calculateCanvasSize() {
      this.visibleWidth = this.canvas.parentNode.offsetWidth;
      const width = this.visibleWidth + 40; //40px for off screen buffer
      const minHeight =
        this.neuronCount * SpikeTrainController.MIN_NEURON_HEIGHT +
        2 * this.SPIKE_TIMELABEL_SPACE;
      if (width <= this.canvas.width && minHeight <= this.canvas.height)
        return false; //no canvas size change

      this.canvas.setAttribute(
        'height',
        Math.max(this.canvas.height, minHeight)
      );
      this.canvas.setAttribute('width', width);
      return true; // canvas size changed
    }

    redraw() {
      this.messages.forEach(
        msg =>
          msg === this.SEPARATOR_MSG
            ? this.drawSeparator()
            : this.plotMessage(msg, false)
      );
    }
  }

  SpikeTrainController.$$ngIsClass = true;
  SpikeTrainController.$inject = [
    '$element',
    '$filter',
    '$scope',
    '$timeout',
    'RESET_TYPE',
    'SPIKE_TIMELABEL_SPACE',
    'spikeListenerService'
  ];

  angular
    .module('spikeTrainModule', [
      'spikeListenerModule',
      'exdFrontendApp.Constants'
    ])
    .constant('SPIKE_TIMELABEL_SPACE', 15) // Vertical space in the canvas reserved for the time label
    .controller('SpikeTrainController', SpikeTrainController);
})();
