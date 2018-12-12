'use strict';

describe('Service: ExperimentViewService', function() {
  let experimentViewService;

  let $location, $rootScope, $timeout;
  let RESET_TYPE, STATE;
  let backendInterfaceService,
    bbpConfig,
    environmentRenderingService,
    environmentService,
    gz3d,
    nrpModalService,
    simulationInfo,
    splash,
    stateService;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('backendInterfaceServiceMock'));
  beforeEach(module('clbConfirmMock'));
  beforeEach(module('environmentRenderingServiceMock'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('nrpModalServiceMock'));
  beforeEach(module('objectInspectorServiceMock'));
  beforeEach(module('performanceMonitorServiceMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('splashMock'));
  beforeEach(module('stateServiceMock'));
  beforeEach(module('userContextServiceMock'));

  beforeEach(
    inject(function(
      _experimentViewService_,
      _$location_,
      _$rootScope_,
      _$timeout_,
      _RESET_TYPE_,
      _STATE_,
      _backendInterfaceService_,
      _bbpConfig_,
      _environmentRenderingService_,
      _environmentService_,
      _gz3d_,
      _nrpModalService_,
      _simulationInfo_,
      _splash_,
      _stateService_
    ) {
      experimentViewService = _experimentViewService_;
      experimentViewService.$window = { location: { reload: angular.noop } };

      $location = _$location_;
      $rootScope = _$rootScope_;
      $timeout = _$timeout_;
      RESET_TYPE = _RESET_TYPE_;
      STATE = _STATE_;
      backendInterfaceService = _backendInterfaceService_;
      bbpConfig = _bbpConfig_;
      environmentRenderingService = _environmentRenderingService_;
      environmentService = _environmentService_;
      gz3d = _gz3d_;
      nrpModalService = _nrpModalService_;
      simulationInfo = _simulationInfo_;
      splash = _splash_;
      stateService = _stateService_;

      environmentService.$window = {
        location: {
          reload: jasmine.createSpy()
        }
      };
    })
  );

  it('should call resetGUI on RESET_FULL / RESET_WORLD events', function() {
    spyOn(experimentViewService, 'resetGUI').and.callThrough();

    $rootScope.$broadcast('RESET', RESET_TYPE.RESET_FULL);
    expect(experimentViewService.resetGUI.calls.count()).toBe(1);

    $rootScope.$broadcast('RESET', RESET_TYPE.RESET_WORLD);
    expect(experimentViewService.resetGUI.calls.count()).toBe(2);

    $rootScope.$broadcast('RESET', RESET_TYPE.RESET_BRAIN);
    expect(experimentViewService.resetGUI.calls.count()).toBe(2);
  });

  it('should start listening to state and message info on ENTER_SIMULATION', function() {
    stateService.currentSate = STATE.PAUSED;
    let mockMessageCallbackHandler = {};
    let mockStateCallbackHandler = {};
    stateService.addMessageCallback.and.returnValue(mockMessageCallbackHandler);
    stateService.addStateCallback.and.returnValue(mockStateCallbackHandler);

    $rootScope.$broadcast('ENTER_SIMULATION');

    expect(stateService.startListeningForStatusInformation).toHaveBeenCalled();
    expect(stateService.addMessageCallback).toHaveBeenCalled();
    expect(stateService.addStateCallback).toHaveBeenCalled();
    expect(experimentViewService.messageCallbackHandler).toBe(
      mockMessageCallbackHandler
    );
    expect(experimentViewService.stateCallbackHandler).toBe(
      mockStateCallbackHandler
    );
  });

  it('should react to ROS status messages from stateService', function() {
    spyOn(experimentViewService, 'messageCallback');

    let messageCallback = null;
    let fakeAddMessageCallback = fn => {
      messageCallback = fn;
    };
    stateService.addMessageCallback.and.callFake(fakeAddMessageCallback);

    $rootScope.$broadcast('ENTER_SIMULATION');

    let mockMessage = {};
    messageCallback(mockMessage);
    expect(experimentViewService.messageCallback).toHaveBeenCalledWith(
      mockMessage
    );
  });

  it('should react to simulation state changes', function() {
    spyOn(experimentViewService, 'onStateChanged');

    let stateCallback = null;
    let fakeAddStateCallback = fn => {
      stateCallback = fn;
    };
    stateService.addStateCallback.and.callFake(fakeAddStateCallback);

    $rootScope.$broadcast('ENTER_SIMULATION');

    let mockState = {};
    stateCallback(mockState);
    expect(experimentViewService.onStateChanged).toHaveBeenCalledWith(
      mockState
    );
  });

  it(' - isInSimulationView()', function() {
    $location.$$url = 'something-something-url/';
    expect(experimentViewService.isInSimulationView()).toBe(false);

    $location.$$url += 'experiment-view/something-something-simulation-id';
    expect(experimentViewService.isInSimulationView()).toBe(true);
  });

  it(' - resetGUI()', function() {
    experimentViewService.resetGUI();
    expect(gz3d.scene.resetView).toHaveBeenCalled();
    expect(gz3d.scene.selectEntity).toHaveBeenCalledWith(null);
  });

  it('should open splash screen with callbackOnClose', function() {
    $rootScope.$broadcast('ENTER_SIMULATION');

    stateService.currentState = STATE.STOPPED;
    environmentRenderingService.sceneLoading = false;
    experimentViewService.resetRequest = {};
    //Test the messageCallback
    splash.splashScreen = undefined;
    /* eslint-disable camelcase */
    stateService.addMessageCallback.calls.mostRecent().args[0]({
      progress: {
        block_ui: 'False',
        task: 'Task1',
        subtask: 'Subtask1'
      }
    });
    expect(splash.open).toHaveBeenCalled();
    var callbackOnClose = splash.open.calls.mostRecent().args[1];
    expect(callbackOnClose).toBeDefined();
    expect(splash.setMessage).toHaveBeenCalledWith({
      headline: 'Task1',
      subHeadline: 'Subtask1'
    });
    // test open splash screen without callbackOnClose
    splash.splashScreen = undefined;
    stateService.currentState = STATE.INITIALIZED;
    stateService.addMessageCallback.calls.mostRecent().args[0]({
      progress: {
        block_ui: 'False',
        task: 'Task1',
        subtask: 'Subtask1'
      }
    });
    callbackOnClose = splash.open.calls.mostRecent().args[1];
    expect(callbackOnClose).not.toBeDefined();
    // test "done" (without close, with onSimulationDone)
    splash.showButton = true;
    splash.spin = true;
    stateService.addMessageCallback.calls.mostRecent().args[0]({
      progress: {
        block_ui: 'False',
        done: 'True'
      }
    });
    expect(splash.spin).toBe(false);
    expect(splash.setMessage).toHaveBeenCalledWith({ headline: 'Finished' });
    expect(splash.close).not.toHaveBeenCalled();

    // onSimulationDone() should have been called
    expect(stateService.removeMessageCallback).toHaveBeenCalled();

    // test "done" in IF path (with close, without onSimulationDone)
    stateService.currentState = STATE.STOPPED;
    splash.splashScreen = undefined;
    splash.close.calls.reset();
    stateService.removeMessageCallback.calls.reset();
    splash.showButton = false;
    stateService.addMessageCallback.calls
      .mostRecent()
      .args[0]({ progress: { block_ui: 'True', done: 'True' } });
    /* eslint-enable camelcase */
    expect(splash.close).toHaveBeenCalled();
    // onSimulationDone() should NOT have been called
    expect(stateService.removeMessageCallback).not.toHaveBeenCalled();
    // test "timeout"
    stateService.addMessageCallback.calls
      .mostRecent()
      .args[0]({ timeout: 264, simulationTime: 1, realTime: 2 });
    expect(simulationInfo.simTimeoutText).toBe(264);
    // test "simulationTime"
    expect(simulationInfo.simulationTimeText).toBe(1);
    // test "realTime"
    expect(simulationInfo.realTimeText).toBe(2);
  });

  it(' - resetOccuredOnServer()', function() {
    spyOn(experimentViewService, 'notifyResetToWidgets').and.callThrough();
    spyOn(experimentViewService, 'updatePanelUI').and.callThrough();

    experimentViewService.resetRequest = {
      resetType: RESET_TYPE.RESET_FULL
    };

    experimentViewService.resetOccuredOnServer();

    expect(experimentViewService.notifyResetToWidgets).toHaveBeenCalled();
    expect(experimentViewService.updatePanelUI).toHaveBeenCalled();
    expect(gz3d.scene.resetView).toHaveBeenCalled();
    expect(gz3d.scene.applyComposerSettings).toHaveBeenCalled();

    expect(gz3d.scene.selectEntity).toHaveBeenCalled();
  });

  it('should clean up on exiting simulation', function() {
    spyOn(experimentViewService, 'cleanUp');

    experimentViewService.exitSimulation();
    expect(experimentViewService.cleanUp).toHaveBeenCalled();
  });

  it('should go back to the esv-private page when no "ctx" parameter was in the url', function() {
    environmentService.setPrivateExperiment(false);
    experimentViewService.exitSimulation();
    expect($location.path()).toEqual('/esv-private');

    environmentService.setPrivateExperiment(true);
    experimentViewService.exitSimulation();
    expect($location.path()).toEqual('/esv-private');
  });

  it('should go back to the esv-demo page when in demo mode', function() {
    spyOn(bbpConfig, 'get').and.callFake((value, defaultValue) => {
      if (value === 'demomode.demoCarousel') {
        return true;
      } else {
        return defaultValue;
      }
    });

    experimentViewService.exitSimulation();
    expect($location.path()).toEqual('/esv-demo-wait');
  });

  it('disable rebirth if state is stopped', function() {
    experimentViewService.onStateChanged(STATE.STARTED);
    expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();

    experimentViewService.onStateChanged(STATE.PAUSED);
    expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();

    experimentViewService.onStateChanged(STATE.CREATED);
    expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();

    experimentViewService.onStateChanged(STATE.FAILED);
    expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();

    experimentViewService.onStateChanged(STATE.INITIALIZED);
    expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();

    experimentViewService.onStateChanged(STATE.HALTED);
    expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();

    experimentViewService.onStateChanged(STATE.STOPPED);
    expect(gz3d.iface.webSocket.disableRebirth).toHaveBeenCalled();
  });

  it(' - cleanUp()', function() {
    spyOn(
      experimentViewService,
      'resetListenerUnbindHandler'
    ).and.callThrough();

    experimentViewService.cleanUp();

    expect(experimentViewService.resetListenerUnbindHandler).toHaveBeenCalled();
  });

  it('should call the create modal upon exit click', function() {
    experimentViewService.openExitDialog();
    expect(nrpModalService.createModal).toHaveBeenCalled();
  });

  it(' - onSimulationDone()', function() {
    spyOn(
      experimentViewService,
      'closeSimulationConnections'
    ).and.callThrough();

    experimentViewService.onSimulationDone();

    expect(experimentViewService.closeSimulationConnections).toHaveBeenCalled();
    expect(stateService.stopListeningForStatusInformation).toHaveBeenCalled();
    expect(stateService.removeMessageCallback).toHaveBeenCalled();
  });

  describe(' - resetSimulation()', function() {
    let mockResetRequest;

    beforeEach(() => {
      mockResetRequest = {
        resetType: RESET_TYPE.NO_RESET,
        contextId: 'mockContextID'
      };

      experimentViewService.clbConfirm.open.and.returnValue({
        then: fn => {
          experimentViewService.resetRequest = mockResetRequest;
          fn();
        }
      });
    });

    it('should show a popup when the reset button is pressed', function() {
      experimentViewService.resetSimulation();
      expect(experimentViewService.clbConfirm.open).toHaveBeenCalled();
    });

    it("shouldn't do anything if no radio button is set", function() {
      mockResetRequest.resetType = RESET_TYPE.NO_RESET;
      experimentViewService.resetSimulation();
      expect(backendInterfaceService.reset.calls.count()).toBe(0);
    });

    it('should ensure state PAUSED before resetting', function() {
      mockResetRequest.resetType = RESET_TYPE.RESET_FULL;
      experimentViewService.resetSimulation();
      expect(stateService.ensureStateBeforeExecuting).toHaveBeenCalledWith(
        STATE.PAUSED,
        jasmine.any(Function)
      );
      expect(stateService.setCurrentState).toHaveBeenCalledWith(STATE.PAUSED);
    });

    it('should close editor panels', function() {
      mockResetRequest.resetType = RESET_TYPE.RESET_FULL;
      experimentViewService.resetSimulation();
    });

    it('should notify the widgets when resetting camera/robot', function() {
      spyOn(experimentViewService, 'notifyResetToWidgets').and.callThrough();

      mockResetRequest.resetType = RESET_TYPE.RESET_FULL;
      experimentViewService.resetSimulation();
      $timeout.flush(100);
      expect(experimentViewService.notifyResetToWidgets).not.toHaveBeenCalled();

      mockResetRequest.resetType = RESET_TYPE.RESET_CAMERA_VIEW;
      experimentViewService.resetSimulation();
      $timeout.flush(100);
      expect(experimentViewService.notifyResetToWidgets.calls.count()).toBe(0);

      mockResetRequest.resetType = RESET_TYPE.RESET_ROBOT_POSE;
      experimentViewService.resetSimulation();
      $timeout.flush(100);
      expect(experimentViewService.notifyResetToWidgets.calls.count()).toBe(1);
    });

    it('should make respective calls when resetting camera view', function() {
      mockResetRequest.resetType = RESET_TYPE.RESET_CAMERA_VIEW;
      experimentViewService.resetSimulation();
      $timeout.flush(150);
      expect(gz3d.scene.resetView).toHaveBeenCalled();
    });

    it('should reset GUI when reset type is RESET.RESET_ALL', function() {
      spyOn(experimentViewService, 'resetGUI').and.callThrough();

      $rootScope.$broadcast('RESET', RESET_TYPE.RESET_FULL);
      $rootScope.$digest();

      expect(experimentViewService.resetGUI).toHaveBeenCalled();
    });

    it('should pass the radio button value to resetCollabService when Storage is available', function() {
      spyOn(_, 'defer');

      const testWorld = {
        type: RESET_TYPE.RESET_WORLD,
        headline: 'Resetting Environment',
        subHeadline: 'Downloading World SDF from the Storage'
      };
      const testCases = [testWorld];

      for (let i = 0; i < testCases.length; i++) {
        experimentViewService.resetSimulation();
        mockResetRequest.resetType = testCases[i].type; // overwrites default button state | Fake user input
        environmentService.setPrivateExperiment(true); //Collab IS available
        splash.splashScreen = undefined;

        $timeout.flush(100);

        //ensureStateBeforeExecuting's first parameter is a state, second is a callback
        const resetFunction = stateService.ensureStateBeforeExecuting.calls.mostRecent()
          .args[1];

        resetFunction(); // call the callback
        $timeout.flush(150);

        //open splash
        expect(splash.open).toHaveBeenCalled();

        //defer call
        expect(_.defer).toHaveBeenCalled();
        _.defer.calls.mostRecent().args[0](); // call deferred function

        expect(splash.spin).toBe(true);
        expect(splash.setMessage).toHaveBeenCalledWith({
          headline: testCases[i].headline,
          subHeadline: testCases[i].subHeadline
        });

        expect(backendInterfaceService.resetCollab).toHaveBeenCalledWith(
          mockResetRequest,
          jasmine.any(Function),
          jasmine.any(Function)
        );

        backendInterfaceService.resetCollab.calls.mostRecent().args[1](); //1 is the success callback

        expect(splash.closeSplash).toHaveBeenCalled();

        //reset spies
        splash.close.calls.reset();
        splash.splashScreen = 'isDefined';

        backendInterfaceService.resetCollab.calls.mostRecent().args[2](); //2 is the failure callback
        $timeout.flush(100);
      }
    });
  });
});
