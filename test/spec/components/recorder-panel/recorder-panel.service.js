'use strict';

describe('Service: recorder-panel', function() {
  beforeEach(module('recorderPanelModule'));

  var recorderPanelService;
  let backendInterfaceService;

  beforeEach(module('backendInterfaceServiceMock'));
  beforeEach(module('simulationInfoMock'));

  beforeEach(
    inject(function(_recorderPanelService_, _backendInterfaceService_) {
      recorderPanelService = _recorderPanelService_;
      backendInterfaceService = _backendInterfaceService_;
    })
  );

  it('should not be visible by default ', function() {
    expect(recorderPanelService.hidden).toBe(true);
  });

  it('should update visibility ', function() {
    recorderPanelService.start();
    recorderPanelService.toggleShow();
    expect(recorderPanelService.hidden).toBe(false);
    recorderPanelService.toggleShow();
    expect(recorderPanelService.hidden).toBe(true);
    recorderPanelService.stop();
    recorderPanelService.cancelSave();
  });

  it('should properly handle recording steps', function() {
    recorderPanelService.start();
    expect(recorderPanelService.isRecording()).toBe(true);
    expect(backendInterfaceService.startRecording).toHaveBeenCalled();

    recorderPanelService.pause(true);
    expect(recorderPanelService.isPaused()).toBe(true);
    expect(backendInterfaceService.stopRecording).toHaveBeenCalled();

    recorderPanelService.pause(false);
    expect(recorderPanelService.isPaused()).toBe(false);
    expect(backendInterfaceService.startRecording).toHaveBeenCalled();

    recorderPanelService.stop();
    expect(recorderPanelService.waitingForUserConfirm()).toBe(true);
    expect(backendInterfaceService.stopRecording).toHaveBeenCalled();

    recorderPanelService.save();
    expect(recorderPanelService.isStopped()).toBe(true);
    expect(backendInterfaceService.saveRecording).toHaveBeenCalled();

    recorderPanelService.start();
    recorderPanelService.stop();
    recorderPanelService.cancelSave();
    expect(recorderPanelService.isStopped()).toBe(true);
    expect(recorderPanelService.isSaving()).toBe(false);
    expect(backendInterfaceService.resetRecording).toHaveBeenCalled();
  });
});
