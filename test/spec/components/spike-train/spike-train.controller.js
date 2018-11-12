'use strict';

describe('Controller: spiketrain', function() {
  beforeEach(module('spikeTrainModule'));
  beforeEach(module('exd.templates')); // import html template
  beforeEach(module('exdFrontendApp.Constants'));

  beforeEach(module('simulationInfoMock'));
  beforeEach(module('spikeListenerServiceMock'));

  var $rootScope, $scope, $timeout;
  var mockAngularElement;
  var spikeController,
    canvas,
    canvasParent,
    SPIKE_TIMELABEL_SPACE = 0;
  var spikeListenerService;

  beforeEach(
    module(function($provide) {
      canvas = document.createElement('canvas');
      canvasParent = document.createElement('div');
      canvasParent.appendChild(canvas);

      mockAngularElement = [
        // the mock HTML DOM
        {
          getElementsByClassName: jasmine
            .createSpy('getElementsByClassName')
            .and.returnValue([{}, {}]),
          getElementsByTagName: jasmine
            .createSpy('getElementsByClassName')
            .and.returnValue([{ remove: jasmine.createSpy('remove') }])
        }
      ];
      mockAngularElement.find = jasmine
        .createSpy('find')
        .and.returnValue([canvas]);
      $provide.value('$element', mockAngularElement);
    })
  );

  beforeEach(
    inject(function(
      _$rootScope_,
      $controller,
      $filter,
      _$timeout_,
      _RESET_TYPE_,
      _spikeListenerService_
    ) {
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      $timeout = _$timeout_;
      spikeListenerService = _spikeListenerService_;

      spikeController = $controller('SpikeTrainController', {
        $filter: $filter,
        $scope: $scope,
        spikeListenerService: spikeListenerService,
        SPIKE_TIMELABEL_SPACE: SPIKE_TIMELABEL_SPACE
      });
      var parent = document.createElement('div');
      parent.appendChild(canvas);
    })
  );

  beforeEach(function() {
    spyOn(spikeController, 'drawSeparator').and.callThrough();
    spyOn(spikeController, 'plotMessage').and.callThrough();
    spyOn(spikeController, 'clearPlot').and.callThrough();
    spyOn(spikeController, 'startSpikeDisplay').and.callThrough();
    spyOn(spikeController, 'stopSpikeDisplay').and.callThrough();
    spyOn(spikeController, 'redraw').and.callThrough();
    spyOn(spikeController, 'calculateCanvas').and.callThrough();
  });

  it('should start polling for resized canvas and update canvas size if necessary', function() {
    spikeController.calculateCanvas.calls.reset();

    $timeout.flush();

    expect(spikeController.calculateCanvas).toHaveBeenCalled();
  });

  it('should stop and hide on close', function() {
    $scope.$destroy();
    expect(spikeController.stopSpikeDisplay).toHaveBeenCalled();
  });

  it('should clearPlot on RESET', function() {
    $scope.$emit('RESET');
    $scope.$digest();
    expect(spikeController.clearPlot).toHaveBeenCalled();
  });

  it('should call startListening when startSpikeDisplay ', function() {
    spikeController.startSpikeDisplay();
    expect(spikeListenerService.startListening).toHaveBeenCalled();
  });

  it('should call stopListening when stopSpikeDisplay ', function() {
    spikeController.stopSpikeDisplay();
    expect(spikeListenerService.stopListening).toHaveBeenCalled();
  });

  it('should empty message on clear plot ', function() {
    spikeController.messages.push({});
    spikeController.clearPlot();
    expect(spikeController.messages.length).toBe(0);
  });

  it('should add separator the nth time it is open', function() {
    expect(spikeController.messages.length).toBe(0);

    spikeController.startSpikeDisplay();
    expect(spikeController.messages.length).toBe(1);
    expect(spikeController.messages[0]).toBe(spikeController.SEPARATOR_MSG);
  });

  it('should add plot new message and queue it', function() {
    var msg = {};
    spikeListenerService.startListening.calls.mostRecent().args[0](msg);
    expect(spikeController.messages.length).toBe(1);
    expect(spikeController.messages[0]).toBe(msg);
    expect(spikeController.plotMessage).toHaveBeenCalled();
  });

  // canvas size is 300x150 as default
  var getCanvasData = function(x, width) {
    return spikeController.canvasCtx.getImageData(x, 0, width, canvas.height)
      .data;
  };

  var verifyAllLineColor = function(canvasData, color) {
    for (var i = canvasData.length - 1; i >= 4; i = i - 4) {
      // rgba values
      expect(canvasData[i - 3]).toBe(color[0]);
      expect(canvasData[i - 2]).toBe(color[1]);
      expect(canvasData[i - 1]).toBe(color[2]);
      expect(canvasData[i]).toBe(255);
    }
  };

  it('should display spike message properly', function() {
    spyOn(spikeController, 'calculateCanvasSize');
    spikeController.visibleWidth = 300;

    var fakeMessage = {
      neuronCount: 1,
      simulationTime: 0.01,
      spikes: [{ neuron: 0, time: 9 }]
    };
    spikeController.newSpikesMessage(fakeMessage);

    var black = [0, 0, 0];
    // The last column is black
    verifyAllLineColor(getCanvasData(canvas.width - 1, 1), black);

    // The rest of the canvas is black-transparent (0,0,0,0)
    var canvasData = getCanvasData(0, canvas.width - 1);
    for (var i = 0; i < canvasData.length; i = i + 1) {
      expect(canvasData[i]).toBe(0);
    }
  });

  it('should display red bar at multiples of 100 * dt properly. (dt is 20ms, specified in the experiment template)', function() {
    spyOn(spikeController, 'calculateCanvasSize');
    spikeController.visibleWidth = 300;

    var fakeMessage = { neuronCount: 1, simulationTime: 2, spikes: [] };
    spikeController.newSpikesMessage(fakeMessage);

    // canvas size is 300x150 as default
    // The first column is red except for the last 15 pixel
    verifyAllLineColor(getCanvasData(canvas.width - 1, 1), [255, 0, 0]);
  });

  it('should plot separator', function() {
    spyOn(spikeController, 'calculateCanvasSize');
    spikeController.visibleWidth = 300;
    expect(spikeController.messages.length).toBe(0);

    spikeController.startSpikeDisplay(); //second  time visible
    expect(spikeController.messages.length).toBe(1);
    spikeController.redraw();

    expect(spikeController.drawSeparator).toHaveBeenCalled();
  });

  it('should change size on calculateCanvasSize if canvas too small', function() {
    spikeController.canvas = {
      width: 200,
      parentNode: {
        clientWidth: 300
      },
      setAttribute: jasmine.createSpy('setAttribute')
    };

    var res = spikeController.calculateCanvasSize();
    expect(res).toBe(true);
    expect(spikeController.canvas.setAttribute).toHaveBeenCalled();
  });

  it('should not change size on calculateCanvasSize if canvas big enough', function() {
    spikeController.canvas = {
      width: 300,
      height: 200,
      parentNode: {
        offsetWidth: 200
      },
      setAttribute: jasmine.createSpy('setAttribute')
    };

    var res = spikeController.calculateCanvasSize();
    expect(res).toBe(false);
    expect(spikeController.canvas.setAttribute).not.toHaveBeenCalled();
  });

  it('should execute calculateCanvas() correctly', function() {
    spyOn(spikeController, 'calculateCanvasSize').and.callThrough();
    var mockCanvas = {
      parentNode: {
        offsetWidth: 500,
        offsetHeight: 300
      },
      setAttribute: jasmine.createSpy('setAttribute')
    };
    spikeController.canvas = mockCanvas;

    var result = spikeController.calculateCanvas();

    expect(mockCanvas.setAttribute).toHaveBeenCalledWith(
      'width',
      mockCanvas.parentNode.offsetWidth
    );
    expect(mockCanvas.setAttribute).toHaveBeenCalledWith(
      'height',
      mockCanvas.parentNode.offsetHeight - 10
    );

    expect(spikeController.calculateCanvasSize).toHaveBeenCalled();
    expect(spikeController.redraw).toHaveBeenCalled();

    expect(result).toBe(true);
  });
});
