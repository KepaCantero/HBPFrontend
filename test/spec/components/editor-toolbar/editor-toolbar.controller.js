'use strict';

describe('Controller: EditorToolbarController', function() {
  var $controller,
    $rootScope,
    $scope,
    $timeout,
    $window,
    location,
    editorToolbarController,
    stateService,
    userContextService,
    userNavigationService,
    editorsPanelService,
    gz3d,
    clbConfirm,
    environmentService,
    backendInterfaceService,
    splash,
    environmentRenderingService,
    simulationInfo,
    editorToolbarService,
    gz3dViewsService,
    clientLoggerService,
    dynamicViewOverlayService,
    DYNAMIC_VIEW_CHANNELS,
    NAVIGATION_MODES,
    STATE,
    EDIT_MODE,
    RESET_TYPE,
    nrpModalService;

  // load the controller's module
  beforeEach(module('editorToolbarModule'));
  beforeEach(module('helpTooltipModule'));
  beforeEach(module('tipTooltipModule'));
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template

  beforeEach(module('stateServiceMock'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('splashMock'));
  beforeEach(module('backendInterfaceServiceMock'));
  beforeEach(module('objectInspectorServiceMock'));
  beforeEach(module('performanceMonitorServiceMock'));
  beforeEach(module('userNavigationServiceMock'));
  beforeEach(module('userContextServiceMock'));
  beforeEach(module('editorsPanelServiceMock'));
  beforeEach(module('environmentRenderingServiceMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('clientLoggerServiceMock'));
  beforeEach(module('dynamicViewOverlayServiceMock'));
  beforeEach(module('gz3dViewsServiceMock'));
  beforeEach(module('nrpModalServiceMock'));

  var simulationStateObject = {
    update: jasmine.createSpy('update'),
    state: jasmine.createSpy('state')
  };

  var simulationControlObject = {
    simulation: jasmine.createSpy('simulation')
  };

  var nrpBackendVersionsObject = {
    get: jasmine.createSpy('get')
  };

  beforeEach(
    module(function($provide) {
      var collab3DSettingsServiceMock = {};

      collab3DSettingsServiceMock.loadSettings = function() {
        var res = {};
        res.finally = function(callback) {
          callback(true);
        };
        return res;
      };
      $provide.value('clbConfirm', {
        open: jasmine.createSpy('open').and.returnValue({
          then: jasmine.createSpy('then')
        })
      });
      $provide.value('collab3DSettingsService', collab3DSettingsServiceMock);

      $provide.value(
        'simulationState',
        jasmine
          .createSpy('simulationState')
          .and.returnValue(simulationStateObject)
      );
      $provide.value(
        'simulationControl',
        jasmine
          .createSpy('simulationControl')
          .and.returnValue(simulationControlObject)
      );

      $provide.value(
        'nrpBackendVersions',
        jasmine
          .createSpy('nrpBackendVersions')
          .and.returnValue(nrpBackendVersionsObject)
      );
      $provide.value('nrpFrontendVersion', { get: jasmine.createSpy('get') });
      $provide.value('serverError', jasmine.createSpy('serverError'));
      $provide.value('panels', { open: jasmine.createSpy('open') });
      var experimentListMock = {
        experiments: jasmine.createSpy('experiments')
      };
      $provide.value(
        'experimentList',
        jasmine.createSpy('experimentList').and.returnValue(experimentListMock)
      );
    })
  );

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _$timeout_,
      _$location_,
      _$window_,
      _stateService_,
      _userContextService_,
      _userNavigationService_,
      _gz3d_,
      _editorsPanelService_,
      _clbConfirm_,
      _environmentService_,
      _backendInterfaceService_,
      _splash_,
      _environmentRenderingService_,
      _simulationInfo_,
      _editorToolbarService_,
      _gz3dViewsService_,
      _clientLoggerService_,
      _dynamicViewOverlayService_,
      _DYNAMIC_VIEW_CHANNELS_,
      _STATE_,
      _NAVIGATION_MODES_,
      _EDIT_MODE_,
      _RESET_TYPE_,
      _nrpModalService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      $timeout = _$timeout_;
      location = _$location_;
      $window = _$window_;
      stateService = _stateService_;
      userContextService = _userContextService_;
      gz3d = _gz3d_;
      userNavigationService = _userNavigationService_;
      editorsPanelService = _editorsPanelService_;
      clbConfirm = _clbConfirm_;
      environmentService = _environmentService_;
      backendInterfaceService = _backendInterfaceService_;
      splash = _splash_;
      environmentRenderingService = _environmentRenderingService_;
      simulationInfo = _simulationInfo_;
      editorToolbarService = _editorToolbarService_;
      gz3dViewsService = _gz3dViewsService_;
      clientLoggerService = _clientLoggerService_;
      dynamicViewOverlayService = _dynamicViewOverlayService_;
      DYNAMIC_VIEW_CHANNELS = _DYNAMIC_VIEW_CHANNELS_;
      STATE = _STATE_;
      NAVIGATION_MODES = _NAVIGATION_MODES_;
      EDIT_MODE = _EDIT_MODE_;
      RESET_TYPE = _RESET_TYPE_;
      nrpModalService = _nrpModalService_;

      userContextService.hasEditRights.and.callFake(function(entity) {
        return (
          userContextService.isOwner ||
          userNavigationService.isUserAvatar(entity)
        ); // todo: investigate how to inject
      });
    })
  );

  describe('(ViewMode)', function() {
    beforeEach(function() {
      editorToolbarController = $controller('EditorToolbarController', {
        $rootScope: $rootScope,
        $scope: $scope
      });
    });

    it('should set isJoiningStoppedSimulation to true when already stopped', function() {
      expect(userContextService.isJoiningStoppedSimulation).toBe(false);
      stateService.currentState = STATE.STOPPED;
      stateService
        .getCurrentState()
        .then.calls.mostRecent()
        .args[0](); //wtf!!!
      expect(userContextService.isJoiningStoppedSimulation).toBe(true);
    });

    it('should toggle showEditorPanel visibility on codeEditorButtonClickHandler()', function() {
      userContextService.editIsDisabled = false;
      editorToolbarController.codeEditorButtonClickHandler();
      expect(editorsPanelService.toggleEditors).toHaveBeenCalled();
    });

    it('should not toggle showEditorPanel visibility on codeEditorButtonClickHandler()', function() {
      userContextService.editIsDisabled = true;
      editorToolbarController.codeEditorButtonClickHandler();
      expect(editorsPanelService.toggleEditors).not.toHaveBeenCalled();
    });

    it('should ensure that the state is PAUSED when resetting', function() {
      editorToolbarController.resetButtonClickHandler();

      clbConfirm
        .open()
        .then.calls.mostRecent()
        .args[0]();

      expect(stateService.ensureStateBeforeExecuting).toHaveBeenCalledWith(
        STATE.PAUSED,
        jasmine.any(Function)
      );
    });

    it('should show a popup when the reset button is pressed', function() {
      editorToolbarController.resetButtonClickHandler();
      expect(clbConfirm.open).toHaveBeenCalled();
    });

    it('should pass the radio button value to resetService when Collab not available', function() {
      spyOn(editorToolbarController, 'notifyResetToWidgets');
      var request = { resetType: RESET_TYPE.RESET_ROBOT_POSE };

      editorToolbarController.__resetButtonClickHandler(request);
      $timeout.flush(100);

      environmentService.setPrivateExperiment(false); //Collab IS NOT available

      expect(backendInterfaceService.reset).toHaveBeenCalledWith(
        request,
        jasmine.any(Function),
        jasmine.any(Function)
      );

      var successCallback = backendInterfaceService.reset.calls.mostRecent()
        .args[1];
      successCallback();
      $timeout.flush(100);
      expect(gz3d.scene.applyComposerSettings).toHaveBeenCalledWith(
        true,
        false
      );
    });

    it('should notify the widgets when resetting', function() {
      spyOn(editorToolbarController, 'notifyResetToWidgets').and.callThrough();

      var request = { resetType: RESET_TYPE.RESET_WORLD };

      editorToolbarController.__resetButtonClickHandler(request);
      $timeout.flush(100);

      expect(
        editorToolbarController.notifyResetToWidgets
      ).not.toHaveBeenCalled();

      request.resetType = RESET_TYPE.RESET_CAMERA_VIEW;

      editorToolbarController.__resetButtonClickHandler(request);
      $timeout.flush(100);

      expect(
        dynamicViewOverlayService.closeAllOverlaysOfType
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.OBJECT_INSPECTOR);
    });

    it('should make correct reset calls when server reset happened', function() {
      spyOn(editorToolbarController, 'notifyResetToWidgets').and.callThrough();
      spyOn(editorToolbarController, 'updatePanelUI').and.callThrough();
      editorsPanelService.showEditorPanel = true;

      editorToolbarController.resetOccuredOnServer();

      expect(editorsPanelService.toggleEditors).toHaveBeenCalled();
      expect(editorToolbarController.notifyResetToWidgets).toHaveBeenCalled();
      expect(editorToolbarController.updatePanelUI).toHaveBeenCalled();
      expect(gz3d.scene.resetView).toHaveBeenCalled();

      expect(gz3d.scene.selectEntity).toHaveBeenCalled();
    });

    it('should pass the radio button value to resetCollabService when Storage is available', function() {
      spyOn(_, 'defer');

      var testWorld = {
        type: RESET_TYPE.RESET_WORLD,
        headline: 'Resetting Environment',
        subHeadline: 'Downloading World SDF from the Storage'
      };
      var testBrain = {
        type: RESET_TYPE.RESET_BRAIN,
        headline: 'Resetting Brain',
        subHeadline: 'Downloading brain configuration file from the Storage'
      };
      var testCases = [testWorld, testBrain];

      for (var i = 0; i < testCases.length; i++) {
        var request = { resetType: testCases[i].type };
        editorToolbarController.resetButtonClickHandler();
        editorToolbarController.request = request; // overwrites default button state | Fake user input
        environmentService.setPrivateExperiment(true); //Collab IS available
        splash.splashScreen = undefined;

        clbConfirm
          .open()
          .then.calls.mostRecent()
          .args[0]();

        $timeout.flush(100);
        expect(stateService.ensureStateBeforeExecuting).toHaveBeenCalledWith(
          STATE.PAUSED,
          jasmine.any(Function)
        );

        //ensureStateBeforeExecuting's first parameter is a state, second is a callback
        var resetFunction = stateService.ensureStateBeforeExecuting.calls.mostRecent()
          .args[1];

        resetFunction(); // call the callback
        $timeout.flush(100);

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
          request,
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

    it('notify everything to update panel ui if there is a RESET of the brain', function() {
      spyOn($rootScope, '$broadcast').and.callThrough();
      var request = { resetType: RESET_TYPE.RESET_BRAIN };

      editorToolbarController.__resetButtonClickHandler(request);
      $timeout.flush(100);

      expect($rootScope.$broadcast, 'UPDATE_PANEL_UI').toHaveBeenCalled();
    });

    it("shouldn't do anything if no radio button is set", function() {
      editorToolbarController.resetButtonClickHandler();
      editorToolbarController.request = { resetType: RESET_TYPE.NO_RESET };
      clbConfirm
        .open()
        .then.calls.mostRecent()
        .args[0]();
      expect(backendInterfaceService.reset.calls.count()).toBe(0);
    });

    it('should reset GUI when reset type is RESET.RESET_ALL', function() {
      spyOn(editorToolbarController, 'resetGUI').and.callThrough();

      $rootScope.$broadcast('RESET', RESET_TYPE.RESET_FULL);
      $rootScope.$digest();

      expect(editorToolbarController.resetGUI).toHaveBeenCalled();
    });

    it('should add log when RESET occurs', function() {
      $rootScope.$broadcast('RESET', RESET_TYPE.RESET_FULL);
      $rootScope.$digest();

      expect(clientLoggerService.logMessage).toHaveBeenCalled();
    });

    it('should reset GUI when reset type is RESET.RESET_ALL', function() {
      editorToolbarController.resetGUI();
      expect(gz3d.scene.resetView).toHaveBeenCalled();
      expect(gz3d.scene.selectEntity).toHaveBeenCalledWith(null);
      expect(
        dynamicViewOverlayService.closeAllOverlaysOfType
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.OBJECT_INSPECTOR);
    });

    it('should call resetView() when "Reset Camera view" checkbox is checked', function() {
      //gz3d.scene.resetView is already being spied on

      var request = { resetType: RESET_TYPE.RESET_CAMERA_VIEW };
      editorToolbarController.resetButtonClickHandler();

      editorToolbarController.__resetButtonClickHandler(request);
      $timeout.flush(100);
      expect(gz3d.scene.resetView).toHaveBeenCalled();
    });

    it('should register for status information', function() {
      stateService.currentState = STATE.STARTED;
      stateService
        .getCurrentState()
        .then.calls.mostRecent()
        .args[0]();
      expect(
        stateService.startListeningForStatusInformation
      ).toHaveBeenCalled();
      expect(stateService.addMessageCallback).toHaveBeenCalled();
    });

    it('should open splash screen with callbackOnClose', function() {
      stateService
        .getCurrentState()
        .then.calls.mostRecent()
        .args[0]();
      stateService.currentState = STATE.STOPPED;
      $scope.sceneLoading = false;
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

    it('should test light change', function() {
      var initiaLightness = 0.5;
      gz3d.scene.scene = {};
      gz3d.scene.emitter = { lightDiffuse: initiaLightness };
      gz3d.scene.findLightIntensityInfo = function() {
        return {
          min: this.emitter.lightDiffuse,
          max: this.emitter.lightDiffuse
        };
      };

      gz3d.scene.emitter.emit = function(msg, direction) {
        this.lightDiffuse += direction;
      };

      $scope.lightDiffuse = initiaLightness;

      editorToolbarController.modifyLightClickHandler(1);
      expect(gz3d.scene.emitter.lightDiffuse).toBeGreaterThan(initiaLightness);

      editorToolbarController.modifyLightClickHandler(-1);
      editorToolbarController.modifyLightClickHandler(-1);
      expect(gz3d.scene.emitter.lightDiffuse).toBeLessThan(initiaLightness);
    });

    it('should respect maximum light limit', function() {
      gz3d.isGlobalLightMinReached.and.returnValue(false);
      gz3d.isGlobalLightMaxReached.and.returnValue(true);

      editorToolbarController.modifyLightClickHandler(1);
      expect(gz3d.scene.emitter.emit).not.toHaveBeenCalled();
    });

    it('should respect minimum light limit', function() {
      gz3d.isGlobalLightMinReached.and.returnValue(true);
      gz3d.isGlobalLightMaxReached.and.returnValue(false);

      editorToolbarController.modifyLightClickHandler(-1);
      expect(gz3d.scene.emitter.emit).not.toHaveBeenCalled();
    });

    it('should respect light to be changed', function() {
      gz3d.isGlobalLightMinReached.and.returnValue(false);
      gz3d.isGlobalLightMaxReached.and.returnValue(false);

      editorToolbarController.modifyLightClickHandler(1);
      expect(gz3d.scene.emitter.emit).toHaveBeenCalledWith('lightChanged', 0.1);
      editorToolbarController.modifyLightClickHandler(-1);
      expect(gz3d.scene.emitter.emit).toHaveBeenCalledWith(
        'lightChanged',
        -0.1
      );
    });

    it('should call or skip camera controls according to mouse events and help mode status', function() {
      var e = { which: 1 }; // 1 for left mouse button
      editorToolbarController.requestMove(e, 'moveForward');
      expect(gz3d.scene.controls.onMouseDownManipulator).toHaveBeenCalledWith(
        'moveForward'
      );
      editorToolbarController.releaseMove(e, 'moveForward');
      expect(gz3d.scene.controls.onMouseUpManipulator).toHaveBeenCalledWith(
        'moveForward'
      );

      e.which = 2; // 2 for right mouse button
      gz3d.scene.controls.onMouseDownManipulator.calls.reset();
      gz3d.scene.controls.onMouseUpManipulator.calls.reset();
      editorToolbarController.requestMove(e, 'moveBackward');
      expect(gz3d.scene.controls.onMouseDownManipulator).not.toHaveBeenCalled();
      editorToolbarController.releaseMove(e, 'moveBackward');
      expect(gz3d.scene.controls.onMouseUpManipulator).not.toHaveBeenCalled();
    });

    it('should not set edit mode if the new mode is equal to the current one', function() {
      gz3d.scene.manipulationMode = EDIT_MODE.VIEW;

      //false case
      editorToolbarController.setEditMode(EDIT_MODE.VIEW);
      expect(gz3d.scene.setManipulationMode).not.toHaveBeenCalled();

      //true case
      editorToolbarController.setEditMode(EDIT_MODE.EDIT);
      expect(gz3d.scene.setManipulationMode).toHaveBeenCalledWith(
        EDIT_MODE.EDIT
      );
    });

    it('should correctly execute simControlButtonHandler', function() {
      //test setup
      var newState = STATE.STARTED;
      editorToolbarController.setEditMode = jasmine.createSpy('setEditMode');
      editorToolbarController.updateSimulation = jasmine.createSpy(
        'updateSimulation'
      );

      //call function under test
      editorToolbarController.simControlButtonHandler(newState);

      //check test outcome
      expect(editorToolbarController.updateSimulation).toHaveBeenCalledWith(
        newState
      );
      expect(editorToolbarController.setEditMode).toHaveBeenCalledWith(
        EDIT_MODE.VIEW
      );
    });

    it('should toggle the showSpikeTrain variable', function() {
      expect(editorToolbarService.showSpikeTrain).toBe(false);
      editorToolbarController.spikeTrainButtonClickHandler();
      expect(editorToolbarService.showSpikeTrain).toBe(true);
    });

    it(' - robotViewButtonClickHandler()', function() {
      // define mock views
      var mockView1 = {
        container: {},
        name: 'main_view'
      };
      gz3dViewsService.views.push(mockView1);
      var mockView2 = {
        container: undefined,
        name: 'camera1'
      };
      gz3dViewsService.views.push(mockView2);
      var mockView3 = {
        container: undefined,
        name: 'camera1'
      };
      gz3dViewsService.views.push(mockView3);

      // test if no camera views available
      gz3dViewsService.hasCameraView.and.returnValue(false);
      editorToolbarController.robotViewButtonClickHandler();
      expect(
        dynamicViewOverlayService.createDynamicOverlay
      ).not.toHaveBeenCalled();

      // test if camera views available
      gz3dViewsService.hasCameraView.and.returnValue(true);
      editorToolbarController.robotViewButtonClickHandler();
      // 1 call for each container undefined
      expect(
        dynamicViewOverlayService.createDynamicOverlay.calls.count()
      ).toEqual(2);
    });

    // todo: is the test in this way really suitable ?
    it('should do nothing on $destroy when all is undefined', function() {
      environmentRenderingService.assetLoadingSplashScreen = undefined;
      gz3d.iface.webSocket = undefined;
      $scope.rosConnection = undefined;
      $scope.statusListener = undefined;

      $scope.$destroy();

      expect(splash.splashScreen).not.toBeDefined();
      expect(
        environmentRenderingService.assetLoadingSplashScreen
      ).not.toBeDefined();
      expect($scope.statusListener).not.toBeDefined();
      expect($scope.worldStatsListener).not.toBeDefined();
      expect($scope.rosConnection).not.toBeDefined();
      expect(gz3d.iface.webSocket).not.toBeDefined();
    });

    it('should go back to the esv-private page when no "ctx" parameter was in the url', function() {
      spyOn($window.location, 'reload');

      environmentService.setPrivateExperiment(false);
      editorToolbarController.exitSimulation(true);
      $timeout.flush();
      expect(location.path()).toEqual('/esv-private');
      expect($window.location.reload).toHaveBeenCalled();
    });

    it('check that update simulation change state', function() {
      editorToolbarController.updateSimulation(STATE.STARTED);

      expect(stateService.setCurrentState).toHaveBeenCalledWith(STATE.STARTED);
    });

    it('disable rebirth if state is stopped', function() {
      editorToolbarController.onStateChanged(STATE.STOPPED);
      expect(gz3d.iface.webSocket.disableRebirth).toHaveBeenCalled();
    });

    it('disable rebirth if state is stopped', function() {
      editorToolbarController.onStateChanged(STATE.STARTED);
      expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();
    });

    it('disable rebirth if state is stopped', function() {
      editorToolbarController.onStateChanged(STATE.PAUSED);
      expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();
    });

    it('disable rebirth if state is stopped', function() {
      editorToolbarController.onStateChanged(STATE.CREATED);
      expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();
    });

    it('disable rebirth if state is stopped', function() {
      editorToolbarController.onStateChanged(STATE.FAILED);
      expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();
    });

    it('disable rebirth if state is stopped', function() {
      editorToolbarController.onStateChanged(STATE.INITIALIZED);
      expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();
    });

    it('disable rebirth if state is stopped', function() {
      editorToolbarController.onStateChanged(STATE.HALTED);
      expect(gz3d.iface.webSocket.disableRebirth).not.toHaveBeenCalled();
    });

    it('should clean up on destroy', function() {
      spyOn(
        editorToolbarController,
        'resetListenerUnbindHandler'
      ).and.callThrough();

      $scope.$destroy();

      expect(environmentRenderingService.deinit).toHaveBeenCalled();
      expect(
        editorToolbarController.resetListenerUnbindHandler
      ).toHaveBeenCalled();
      expect(gz3d.iface.webSocket.close).toHaveBeenCalled();
    });
  });

  describe('(EditMode)', function() {
    beforeEach(function() {
      environmentService.setPrivateExperiment(true);

      editorToolbarController = $controller('EditorToolbarController', {
        $rootScope: $rootScope,
        $scope: $scope
      });
    });

    it('should go back to the esv-private page when a "ctx" parameter was in the url', function() {
      spyOn($window.location, 'reload');

      editorToolbarController.exitSimulation(true);
      $timeout.flush();
      expect(location.path()).toEqual('/esv-private');
      expect(userContextService.deinit).toHaveBeenCalled();
      expect($window.location.reload).toHaveBeenCalled();
    });

    it('should clean up when exit is called', function() {
      spyOn(editorToolbarController, 'cleanUp').and.callThrough();

      editorToolbarController.exitSimulation();

      expect(editorToolbarController.cleanUp).toHaveBeenCalled();
    });

    it('should call the create modal upon exit click', function() {
      editorToolbarController.openExitDialog();
      expect(nrpModalService.createModal).toHaveBeenCalled();
    });

    it('should call the destroy modal upon destroy dialog', function() {
      editorToolbarController.destroyDialog();
      expect(nrpModalService.destroyModal).toHaveBeenCalled();
    });
  });

  describe('(BrainVisualizer)', function() {
    beforeEach(function() {
      editorToolbarController = $controller('EditorToolbarController', {
        $rootScope: $rootScope,
        $scope: $scope
      });
    });

    it('should enable display of the brainvisualizer panel', function() {
      dynamicViewOverlayService.isOverlayOpen = jasmine
        .createSpy('isOverlayOpen')
        .and.returnValue({
          then: jasmine.createSpy('then').and.callFake(function(fn) {
            fn(false);
          })
        });
      editorToolbarService.toggleBrainvisualizer();
      expect(editorToolbarService.isBrainVisualizerActive).toBeTruthy();
      expect(
        dynamicViewOverlayService.createDynamicOverlay
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.BRAIN_VISUALIZER);
    });

    it('should close of the brainvisualizer panel', function() {
      dynamicViewOverlayService.isOverlayOpen = jasmine
        .createSpy('isOverlayOpen')
        .and.returnValue({
          then: jasmine.createSpy('then').and.callFake(function(fn) {
            fn(true);
          })
        });
      editorToolbarService.toggleBrainvisualizer();
      expect(editorToolbarService.isBrainVisualizerActive).toBeFalsy();
      expect(
        dynamicViewOverlayService.closeAllOverlaysOfType
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.BRAIN_VISUALIZER);
    });
  });

  describe('(EnvironmentSettings)', function() {
    beforeEach(function() {
      editorToolbarController = $controller('EditorToolbarController', {
        $rootScope: $rootScope,
        $scope: $scope
      });
    });

    it('should enable display of the environment settings panel', function() {
      editorToolbarService.showEnvironmentSettingsPanel = false;
      editorToolbarController.environmentSettingsClickHandler();
      expect(editorToolbarService.showEnvironmentSettingsPanel).toBe(true);
    });

    it('should disable display of the environment settings panel', function() {
      editorToolbarService.showEnvironmentSettingsPanel = true;
      editorToolbarController.environmentSettingsClickHandler();
      expect(editorToolbarService.showEnvironmentSettingsPanel).toBe(false);
    });
  });

  describe('(Video Panel)', function() {
    beforeEach(function() {
      editorToolbarController = $controller('EditorToolbarController', {
        $rootScope: $rootScope,
        $scope: $scope
      });
    });

    it('should enable the video panel if no stream is available', function() {
      spyOn($rootScope, '$emit');

      editorToolbarService.videoStreamsAvailable = true;
      editorToolbarController.videoStreamsToggle();

      expect(
        editorToolbarController.dynamicViewOverlayService.createDynamicOverlay
      ).toHaveBeenCalledWith(
        editorToolbarController.DYNAMIC_VIEW_CHANNELS.STREAM_VIEWER
      );
    });

    it('should not enable the video panel if no stream is available', function() {
      spyOn($rootScope, '$emit');

      editorToolbarService.videoStreamsAvailable = false;
      editorToolbarController.videoStreamsToggle();

      expect(
        editorToolbarController.dynamicViewOverlayService.createDynamicOverlay
      ).not.toHaveBeenCalledWith();
    });
  });

  describe('(User Navigation)', function() {
    beforeEach(function() {
      editorToolbarController = $controller('EditorToolbarController', {
        $rootScope: $rootScope,
        $scope: $scope
      });
    });

    it('should properly update navigation mode', function() {
      userNavigationService.nagitationMode = NAVIGATION_MODES.FREE_CAMERA;
      editorToolbarController.setNavigationMode(NAVIGATION_MODES.FREE_CAMERA);
      expect(userNavigationService.setModeFreeCamera).toHaveBeenCalled();

      editorToolbarController.setNavigationMode(NAVIGATION_MODES.GHOST);
      expect(userNavigationService.setModeGhost).toHaveBeenCalled();

      editorToolbarController.setNavigationMode(NAVIGATION_MODES.HUMAN_BODY);
      expect(userNavigationService.setModeHumanBody).toHaveBeenCalled();

      editorToolbarController.setNavigationMode(NAVIGATION_MODES.LOOKAT_ROBOT);
      expect(userNavigationService.setLookatRobotCamera).toHaveBeenCalled();
    });

    it('change show state for navigation mode menu', function() {
      editorToolbarService.showNavigationModeMenu = false;

      editorToolbarController.navigationModeMenuClickHandler();
      expect(editorToolbarService.isNavigationModeMenuActive).toBeTruthy();
      editorToolbarController.navigationModeMenuClickHandler();
      expect(editorToolbarService.isNavigationModeMenuActive).toBeFalsy();
    });
  });
});

// TODO: refactor more so in belongs to a new simulationService whatever
describe('Controller: Gz3dViewCtrl - mocked window', function() {
  var editorToolbar, controller, scope, rootScope, window;

  // load the controller's module
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template

  beforeEach(module('simulationInfoMock'));
  beforeEach(module('environmentRenderingServiceMock'));
  beforeEach(module('stateServiceMock'));
  beforeEach(module('clientLoggerServiceMock'));

  beforeEach(
    module(function() {
      var getCurrentStateSpy = jasmine.createSpy('getCurrentState');
      var getThenSpy = jasmine.createSpy('then');

      getCurrentStateSpy.and.callFake(function() {
        return {
          then: getThenSpy.and.callFake(function(f) {
            f();
          })
        };
      });
    })
  );

  // Initialize the controller and a mock scope
  beforeEach(
    inject(function($controller, $rootScope, _$window_) {
      controller = $controller;
      rootScope = $rootScope;
      scope = $rootScope.$new();
      window = _$window_;

      spyOn(window, 'stop').and.returnValue(null);
    })
  );

  describe('(Clean up code tested with a mocked window object)', function() {
    beforeEach(function() {
      editorToolbar = controller('EditorToolbarController', {
        $rootScope: rootScope,
        $scope: scope
      });
    });

    it('should close rosbridge connections on onSimulationDone', function() {
      editorToolbar.stateService.stopListeningForStatusInformation.calls.reset();
      editorToolbar.stateService.removeMessageCallback.calls.reset();

      // call the method under test
      editorToolbar.onSimulationDone();

      expect(
        editorToolbar.stateService.stopListeningForStatusInformation
      ).toHaveBeenCalled();
      expect(
        editorToolbar.stateService.removeMessageCallback
      ).toHaveBeenCalled();
    });
  });
});
