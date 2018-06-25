'use strict';

describe('Controller: ExperimentViewController', function() {
  var ExperimentViewController,
    controller,
    scope,
    log,
    timeout,
    stateService,
    simulationInfo,
    contextMenuState,
    colorableObjectService,
    STATE,
    gz3d,
    environmentRenderingService,
    userContextService,
    simulationStateObject,
    simulationControlObject,
    environmentService,
    lockServiceMock,
    collabExperimentLockServiceMock = {},
    q,
    callback;

  var nrpAnalyticsMock = {
    durationEventTrack: jasmine.createSpy('durationEventTrack'),
    tickDurationEvent: jasmine.createSpy('tickDurationEvent')
  };

  // load the controller's module
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template

  beforeEach(module('stateServiceMock'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('userContextServiceMock'));
  beforeEach(module('contextMenuStateServiceMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('colorableObjectServiceMock'));
  beforeEach(module('environmentRenderingServiceMock'));
  beforeEach(module('applyForceServiceMock'));

  beforeEach(
    module(function($provide) {
      simulationStateObject = {
        update: jasmine.createSpy('update'),
        state: jasmine.createSpy('state')
      };

      simulationControlObject = {
        simulation: jasmine.createSpy('simulation')
      };

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
        'collabExperimentLockService',
        collabExperimentLockServiceMock
      );

      simulationStateObject.update.calls.reset();
      simulationStateObject.state.calls.reset();
      simulationControlObject.simulation.calls.reset();
    })
  );

  // Initialize the controller and a mock scope
  beforeEach(
    inject(function(
      $controller,
      $rootScope,
      _$log_,
      _$timeout_,
      _simulationInfo_,
      _stateService_,
      _contextMenuState_,
      _STATE_,
      _gz3d_,
      _environmentService_,
      _userContextService_,
      _colorableObjectService_,
      _environmentRenderingService_,
      _$q_
    ) {
      controller = $controller;
      log = _$log_;
      scope = $rootScope.$new();
      timeout = _$timeout_;
      q = _$q_;
      simulationInfo = _simulationInfo_;
      stateService = _stateService_;
      contextMenuState = _contextMenuState_;
      STATE = _STATE_;
      gz3d = _gz3d_;
      userContextService = _userContextService_;
      colorableObjectService = _colorableObjectService_;
      environmentRenderingService = _environmentRenderingService_;
      environmentService = _environmentService_;

      callback = q.defer();

      var lockServiceCancelCallback = jasmine.createSpy('cancelCallback');
      lockServiceMock = {
        tryAddLock: jasmine
          .createSpy('tryAddLock')
          .and.returnValue(callback.promise),
        onLockChanged: jasmine
          .createSpy('onLockChanged')
          .and.callFake(function() {
            return lockServiceCancelCallback;
          }),
        releaseLock: jasmine
          .createSpy('releaseLock')
          .and.returnValue(callback.promise)
      };
      // create mock for $log
      spyOn(log, 'error');
    })
  );

  describe('(ViewMode)', function() {
    beforeEach(function() {
      ExperimentViewController = controller('experimentViewController', {
        $scope: scope,
        $element: undefined,
        stateService: stateService,
        STATE: STATE,
        userContextService: userContextService,
        nrpAnalytics: nrpAnalyticsMock,
        environmentRenderingService: environmentRenderingService,
        gz3d: gz3d,
        $log: log,
        colorableObjectService: colorableObjectService,
        simulationInfo: simulationInfo,
        contextMenuState: contextMenuState,
        $timeout: timeout,
        $window: window
      });
    });

    it('should call and stateService.Initialize()', function() {
      expect(stateService.Initialize.calls.count()).toBe(1);
    });

    it('should set a color on the selected screen', function() {
      //Ignore this warning because of the sim_id

      var simulations = [
        {
          simulationID: 0,
          experimentConfiguration: 'fakeExperiment0',
          state: STATE.CREATED
        },
        {
          simulationID: 1,
          experimentConfiguration: 'fakeExperiment1',
          state: STATE.INITIALIZED
        },
        {
          simulationID: 2,
          experimentConfiguration: 'fakeExperiment2',
          state: STATE.PAUSED
        },
        {
          simulationID: 3,
          experimentConfiguration: 'fakeExperiment3',
          state: STATE.STARTED
        },
        {
          simulationID: 4,
          experimentConfiguration: 'fakeExperiment4',
          state: STATE.STOPPED
        },
        {
          simulationID: 5,
          experimentConfiguration: 'fakeExperiment5',
          state: STATE.INITIALIZED
        },
        {
          simulationID: 6,
          experimentConfiguration: 'fakeExperiment6',
          state: STATE.CREATED
        }
      ];
      scope.activeSimulation = simulations[3];

      // prepare the test: create mockups
      var entityToChange = { children: [{ material: {} }] };
      gz3d.scene.getByName = jasmine
        .createSpy('getByName')
        .and.returnValue(entityToChange);
      // actual test
      // currently no element is selected, hence we want a console.error message
      gz3d.scene.selectedEntity = undefined;
      scope.setMaterialOnEntity('value_does_not_matter_here');
      expect(log.error).toHaveBeenCalled();

      gz3d.scene.selectedEntity = { name: 'left_vr_screen' };
      scope.setMaterialOnEntity('Gazebo/Red');

      expect(colorableObjectService.setEntityMaterial).toHaveBeenCalledWith(
        simulationInfo,
        gz3d.scene.selectedEntity,
        'Gazebo/Red'
      );
    });

    it('should call context menu service if user is the simulation owner', function() {
      var event = { button: 2 };

      //false case
      userContextService.isOwner.and.returnValue(false);

      scope.onContainerMouseDown(event); //call the function under test

      expect(contextMenuState.toggleContextMenu).not.toHaveBeenCalled();

      //true case
      userContextService.isOwner.and.returnValue(true);

      scope.onContainerMouseDown(event); //call the function under test

      expect(contextMenuState.toggleContextMenu).toHaveBeenCalledWith(
        true,
        event
      );
    });

    it('should set the focus on the supplied html element', function() {
      var element = { focus: jasmine.createSpy('focus') };
      var backup = window.document.getElementById;
      window.document.getElementById = jasmine
        .createSpy('getElementById')
        .and.returnValue(element);
      scope.focus('dummyelement');
      timeout.flush();
      expect(element.focus).toHaveBeenCalled();
      window.document.getElementById = backup;
    });

    it('should do nothing on $destroy when all is undefined', function() {
      scope.assetLoadingSplashScreen = undefined;
      gz3d.iface.webSocket = undefined;
      scope.rosConnection = undefined;
      scope.statusListener = undefined;

      scope.$destroy();

      expect(scope.splashScreen).not.toBeDefined();
      expect(scope.assetLoadingSplashScreen).not.toBeDefined();
      expect(scope.statusListener).not.toBeDefined();
      expect(scope.worldStatsListener).not.toBeDefined();
      expect(scope.rosConnection).not.toBeDefined();
      expect(gz3d.iface.webSocket).not.toBeDefined();
    });
  });

  describe('(EditMode)', function() {
    var elementMock;
    beforeEach(function() {
      environmentService.setPrivateExperiment(true);
      lockServiceMock.tryAddLock.calls.reset();
      lockServiceMock.releaseLock.calls.reset();

      elementMock = {
        find: jasmine.createSpy('find')
      };

      ExperimentViewController = controller('experimentViewController', {
        $scope: scope,
        $element: elementMock,
        stateService: stateService,
        STATE: STATE,
        userContextService: userContextService,
        environmentRenderingService: environmentRenderingService,
        gz3d: gz3d,
        $log: log,
        colorableObjectService: colorableObjectService,
        simulationInfo: simulationInfo,
        contextMenuState: contextMenuState,
        $timeout: timeout,
        $window: window
      });
    });

    it(' - controller exit() should call toolbar controller exit', function() {
      var exitMock = jasmine.createSpy('exit');

      var controllerMock = jasmine.createSpy('controller').and.returnValue({
        exit: exitMock
      });

      spyOn(angular, 'element').and.returnValue({
        controller: controllerMock
      });
      ExperimentViewController.exit();
      var editorToolbar = 'editor-toolbar';
      expect(elementMock.find).toHaveBeenCalledWith(editorToolbar);
      expect(controllerMock).toHaveBeenCalledWith(editorToolbar);
      expect(exitMock).toHaveBeenCalled();
    });

    it(' - onContainerMouseDown() should make the right calls', function() {
      var eventMock = {};

      scope.onContainerMouseDown(eventMock);
      expect(contextMenuState.toggleContextMenu).not.toHaveBeenCalled();

      userContextService.isOwner.and.returnValue(true);

      eventMock.button = 0; // left mouse
      scope.onContainerMouseDown(eventMock);
      expect(contextMenuState.toggleContextMenu).toHaveBeenCalledWith(false);

      eventMock.button = 1; // left mouse
      scope.onContainerMouseDown(eventMock);
      expect(contextMenuState.toggleContextMenu).toHaveBeenCalledWith(false);

      eventMock.button = 2; // left mouse
      scope.onContainerMouseDown(eventMock);
      expect(contextMenuState.toggleContextMenu).toHaveBeenCalledWith(
        true,
        eventMock
      );
    });
  });

  describe('(joining stopped simulation)', function() {
    beforeEach(function() {
      stateService.currentState = STATE.STOPPED;

      ExperimentViewController = controller('experimentViewController', {
        $scope: scope,
        $element: undefined,
        stateService: stateService,
        STATE: STATE,
        userContextService: userContextService,
        environmentRenderingService: environmentRenderingService,
        gz3d: gz3d,
        $log: log,
        colorableObjectService: colorableObjectService,
        simulationInfo: simulationInfo,
        contextMenuState: contextMenuState,
        $timeout: timeout,
        $window: window
      });
    });

    it('should set isJoiningStoppedSimulation to true when already stopped', function() {
      /*expect(userContextService.isJoiningStoppedSimulation).toBe(false);
      stateService.currentState = STATE.STOPPED;
      stateService
        .getCurrentState()
        .then.calls.mostRecent()
        .args[0](); //wtf!!!*/
      expect(userContextService.isJoiningStoppedSimulation).toBe(true);
    });
  });
});
