'use strict';

describe('Service: EditorToolbar', function() {
  var editorToolbarService,
    pullForceService,
    dynamicViewOverlayService,
    DYNAMIC_VIEW_CHANNELS;

  // load the corresponding module
  beforeEach(module('editorToolbarModule'));
  beforeEach(module('dynamicViewModule'));

  beforeEach(module('dynamicViewOverlayServiceMock'));
  beforeEach(module('editorsPanelServiceMock'));
  beforeEach(module('pullForceServiceMock'));

  beforeEach(
    inject(function(
      _editorToolbarService_,
      _pullForceService_,
      _dynamicViewOverlayService_,
      _DYNAMIC_VIEW_CHANNELS_
    ) {
      editorToolbarService = _editorToolbarService_;
      pullForceService = _pullForceService_;
      dynamicViewOverlayService = _dynamicViewOverlayService_;
      DYNAMIC_VIEW_CHANNELS = _DYNAMIC_VIEW_CHANNELS_;
    })
  );

  describe('Service: EditorToolbar - Editor Settings', function() {
    it('Stupid test for getter function to show settings', function() {
      editorToolbarService.showEnvironmentSettingsPanel = true;
      expect(
        editorToolbarService.isEnvironmentSettingsPanelActive
      ).toBeTruthy();
    });

    it('Stupid test for getter function to hide settings', function() {
      editorToolbarService.showEnvironmentSettingsPanel = false;
      expect(editorToolbarService.isEnvironmentSettingsPanelActive).toBeFalsy();
    });

    it('Toggle Log Console should create console overlay if none is open', function() {
      dynamicViewOverlayService.isOverlayOpen.and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          fn(false);
        })
      });
      editorToolbarService.toggleLogConsole();
      expect(editorToolbarService.isLogConsoleActive).toBe(true);
      expect(
        dynamicViewOverlayService.createDynamicOverlay
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.LOG_CONSOLE);
    });

    it('Toggle Log Console should be closed if already open', function() {
      dynamicViewOverlayService.isOverlayOpen.and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          fn(true);
        })
      });
      editorToolbarService.toggleLogConsole();
      expect(editorToolbarService.isLogConsoleActive).toBe(false);
      expect(
        dynamicViewOverlayService.closeAllOverlaysOfType
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.LOG_CONSOLE);
    });

    it('Toggle Brainvisualizer should create console overlay if none is open', function() {
      dynamicViewOverlayService.isOverlayOpen.and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          fn(false);
        })
      });
      editorToolbarService.toggleBrainvisualizer();
      expect(editorToolbarService.isBrainVisualizerActive).toBe(true);
      expect(
        dynamicViewOverlayService.createDynamicOverlay
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.BRAIN_VISUALIZER);
    });

    it('Activate pull mode', function() {
      editorToolbarService.forceApplyModeActive = false;

      editorToolbarService.toggleForceApplyMode();
      expect(pullForceService.Activate).toHaveBeenCalled();
    });

    it('deactivate pull mode', function() {
      editorToolbarService.forceApplyModeActive = true;

      editorToolbarService.toggleForceApplyMode();
      expect(pullForceService.Deactivate).toHaveBeenCalled();
    });

    it('Toggle Brainvisualizer should be closed if already open', function() {
      dynamicViewOverlayService.isOverlayOpen.and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          fn(true);
        })
      });
      editorToolbarService.toggleBrainvisualizer();
      expect(editorToolbarService.isBrainVisualizerActive).toBe(false);
      expect(
        dynamicViewOverlayService.closeAllOverlaysOfType
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.BRAIN_VISUALIZER);
    });

    it('Toggle Spike Train should create console overlay if none is open', function() {
      dynamicViewOverlayService.isOverlayOpen.and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          fn(false);
        })
      });
      editorToolbarService.toggleSpikeTrain();
      expect(editorToolbarService.isSpikeTrainActive).toBe(true);
      expect(
        dynamicViewOverlayService.createDynamicOverlay
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.SPIKE_TRAIN);
    });

    it('Toggle Spike Train should be closed if already open', function() {
      dynamicViewOverlayService.isOverlayOpen.and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          fn(true);
        })
      });
      editorToolbarService.toggleSpikeTrain();
      expect(editorToolbarService.isSpikeTrainActive).toBe(false);
      expect(
        dynamicViewOverlayService.closeAllOverlaysOfType
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.SPIKE_TRAIN);
    });

    it('Toggle Performance View should create console overlay if none is open', function() {
      dynamicViewOverlayService.isOverlayOpen.and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          fn(false);
        })
      });
      editorToolbarService.togglePerformanceView();
      expect(editorToolbarService.isPerformanceViewActive).toBe(true);
      expect(
        dynamicViewOverlayService.createDynamicOverlay
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.PERFORMANCE_MONITOR);
    });

    it('Toggle Performance View should be closed if already open', function() {
      dynamicViewOverlayService.isOverlayOpen.and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          fn(true);
        })
      });
      editorToolbarService.togglePerformanceView();
      expect(editorToolbarService.isPerformanceViewActive).toBe(false);
      expect(
        dynamicViewOverlayService.closeAllOverlaysOfType
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.PERFORMANCE_MONITOR);
    });

    it('Toggle ROS terminal View should toggle visibility', function() {
      dynamicViewOverlayService.isOverlayOpen.and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          fn(false);
        })
      });
      expect(editorToolbarService.showRosTerminal).toBeFalsy();
      editorToolbarService.toggleRosTerminal();
      expect(editorToolbarService.showRosTerminal).toBe(true);
    });
  });
});
