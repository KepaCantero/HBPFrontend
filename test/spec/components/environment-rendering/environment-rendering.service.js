'use strict';

describe('Services: environmentRenderingService', function() {
  beforeEach(module('tipTooltipModule'));

  var STATE;

  var environmentRenderingService;
  var stateService,
    $rootScope,
    gz3d,
    userContextService,
    assetLoadingSplash,
    simulationInfo,
    isNotARobotPredicate,
    userNavigationService,
    collab3DSettingsService;

  var frameInterval, lastFrameTime;

  // provide mock objects
  beforeEach(
    module(function($provide) {
      var stateServiceMock = {
        currentState: undefined,
        getCurrentState: jasmine.createSpy('getCurrentState').and.returnValue({
          then: jasmine.createSpy('then').and.callFake(function(fn) {
            fn();
          })
        }),
        addStateCallback: jasmine.createSpy('addStateCallback'),
        removeStateCallback: jasmine.createSpy('removeStateCallback')
      };
      $provide.value('stateService', stateServiceMock);

      var userNavigationServiceMock = {
        init: jasmine.createSpy('init'),
        deinit: jasmine.createSpy('deinit'),
        setDefaultPose: {
          apply: jasmine.createSpy('apply')
        },
        update: jasmine.createSpy('update')
      };
      $provide.value('userNavigationService', userNavigationServiceMock);

      var userContextServiceMock = {
        hasEditRights: jasmine.createSpy('hasEditRights')
      };
      $provide.value('userContextService', userContextServiceMock);

      var assetLoadingSplashMock = {
        open: jasmine.createSpy('open').and.returnValue({}),
        close: jasmine.createSpy('close')
      };
      $provide.value('assetLoadingSplash', assetLoadingSplashMock);

      var isNotARobotPredicateMock = {};
      $provide.value('isNotARobotPredicate', isNotARobotPredicateMock);

      var nrpAnalyticsMock = {
        durationEventTrack: jasmine.createSpy('durationEventTrack'),
        tickDurationEvent: jasmine.createSpy('tickDurationEvent')
      };
      $provide.value('nrpAnalytics', nrpAnalyticsMock);

      var collab3DSettingsServiceMock = {
        loadSettings: jasmine.createSpy('loadSettings').and.returnValue({
          finally: jasmine.createSpy('finally').and.callFake(function(fn) {
            fn();
          })
        })
      };
      $provide.value('collab3DSettingsService', collab3DSettingsServiceMock);
    })
  );

  beforeEach(function() {
    module('environmentRenderingModule');
    module('exdFrontendApp.Constants');
    module('simulationInfoMock');
    module('bbpConfigMock');
    module('gz3dMock');

    // inject service for testing.
    inject(function(
      _$rootScope_,
      _STATE_,
      _environmentRenderingService_,
      _stateService_,
      _gz3d_,
      _isNotARobotPredicate_,
      _userContextService_,
      _assetLoadingSplash_,
      _simulationInfo_,
      _userNavigationService_,
      _collab3DSettingsService_
    ) {
      STATE = _STATE_;
      $rootScope = _$rootScope_;
      environmentRenderingService = _environmentRenderingService_;
      stateService = _stateService_;
      gz3d = _gz3d_;
      isNotARobotPredicate = _isNotARobotPredicate_;
      userContextService = _userContextService_;
      assetLoadingSplash = _assetLoadingSplash_;
      simulationInfo = _simulationInfo_;
      userNavigationService = _userNavigationService_;
      collab3DSettingsService = _collab3DSettingsService_;
    });
  });

  beforeEach(function() {
    spyOn(
      environmentRenderingService,
      'initAnimationFrameFunctions'
    ).and.callThrough();
    spyOn(environmentRenderingService, 'setFPSLimit').and.callThrough();
    spyOn(
      environmentRenderingService,
      'updateInitialCameraPose'
    ).and.callThrough();
    spyOn(environmentRenderingService, 'animate').and.callThrough();
    spyOn(
      environmentRenderingService,
      'initComposerSettings'
    ).and.callThrough();
    spyOn(environmentRenderingService, 'isElementVisible').and.callThrough();
    spyOn(environmentRenderingService, 'update').and.callThrough();
  });

  afterEach(function() {
    environmentRenderingService.initAnimationFrameFunctions.calls.reset();
    environmentRenderingService.setFPSLimit.calls.reset();
    environmentRenderingService.updateInitialCameraPose.calls.reset();
    environmentRenderingService.animate.calls.reset();
    environmentRenderingService.initComposerSettings.calls.reset();
    environmentRenderingService.isElementVisible.calls.reset();
    environmentRenderingService.update.calls.reset();
  });

  it(' - init(), state of experiment is not stopped', function() {
    expect(
      environmentRenderingService.assetLoadingSplashScreen
    ).not.toBeDefined();
    stateService.currentState = STATE.CREATED;

    environmentRenderingService.init();

    expect(
      environmentRenderingService.initAnimationFrameFunctions
    ).toHaveBeenCalled();
    expect(environmentRenderingService.setFPSLimit).toHaveBeenCalled();
    expect(environmentRenderingService.sceneInitialized).toBeDefined();
    expect(gz3d.Initialize).toHaveBeenCalled();
    expect(gz3d.iface.addCanDeletePredicate).toHaveBeenCalledWith(
      isNotARobotPredicate
    );
    expect(gz3d.iface.addCanDeletePredicate).toHaveBeenCalledWith(
      userContextService.hasEditRights
    );
    expect(stateService.addStateCallback).toHaveBeenCalledWith(
      environmentRenderingService.onStateChanged
    );
    expect(environmentRenderingService.assetLoadingSplashScreen).toBeDefined();
    expect(gz3d.iface.setAssetProgressCallback).toHaveBeenCalledWith(
      jasmine.any(Function)
    );
    expect(
      environmentRenderingService.updateInitialCameraPose
    ).toHaveBeenCalledWith(simulationInfo.experimentDetails.cameraPose);
    expect(environmentRenderingService.animate).toHaveBeenCalled();

    environmentRenderingService.deferredSceneInitialized.resolve();
    $rootScope.$digest();

    expect(environmentRenderingService.initComposerSettings).toHaveBeenCalled();
  });

  it(' - init(), state of experiment is stopped', function() {
    stateService.currentState = STATE.STOPPED;

    environmentRenderingService.init();

    expect(gz3d.Initialize).not.toHaveBeenCalled();
    expect(gz3d.iface.addCanDeletePredicate).not.toHaveBeenCalled();
    expect(gz3d.iface.addCanDeletePredicate).not.toHaveBeenCalled();
    expect(stateService.addStateCallback).not.toHaveBeenCalled();
    expect(
      environmentRenderingService.assetLoadingSplashScreen
    ).not.toBeDefined();
    expect(gz3d.iface.setAssetProgressCallback).not.toHaveBeenCalled();
    expect(environmentRenderingService.animate).not.toHaveBeenCalled();
    expect(
      environmentRenderingService.updateInitialCameraPose
    ).not.toHaveBeenCalled();
  });

  it(' - deinit()', function() {
    var frameRequestID = 1234;
    environmentRenderingService.requestID = frameRequestID;
    environmentRenderingService.cancelAnimationFrame = jasmine.createSpy(
      'cancelAnimationFrame'
    );
    environmentRenderingService.assetLoadingSplashScreen = {};

    environmentRenderingService.deinit();

    expect(
      environmentRenderingService.cancelAnimationFrame
    ).toHaveBeenCalledWith(frameRequestID);
    expect(assetLoadingSplash.close).toHaveBeenCalled();
    expect(
      environmentRenderingService.assetLoadingSplashScreen
    ).not.toBeDefined();
    expect(stateService.removeStateCallback).toHaveBeenCalledWith(
      environmentRenderingService.onStateChanged
    );
    expect(userNavigationService.deinit).toHaveBeenCalled();
    expect(gz3d.deInitialize).toHaveBeenCalled();
  });

  it(' - animate(), normal run through', function() {
    environmentRenderingService.isElementVisible.and.returnValue(true);

    var frameRequestID = 1234;
    environmentRenderingService.requestAnimationFrame = jasmine
      .createSpy('requestAnimationFrame')
      .and.returnValue(frameRequestID);
    environmentRenderingService.visible = true;
    environmentRenderingService.needsImmediateUpdate = false;
    environmentRenderingService.dropCycles = 0;
    frameInterval = 100;
    lastFrameTime = Date.now() - frameInterval;
    environmentRenderingService.tLastFrame = lastFrameTime;
    environmentRenderingService.frameInterval = frameInterval;

    environmentRenderingService.animate();

    expect(
      environmentRenderingService.requestAnimationFrame
    ).toHaveBeenCalledWith(environmentRenderingService.animate);
    expect(environmentRenderingService.requestID).toBe(frameRequestID);
    expect(environmentRenderingService.visible).toBe(true);
    expect(environmentRenderingService.dropCycles).toBe(0);
    expect(environmentRenderingService.tLastFrame).not.toBeLessThan(
      lastFrameTime + frameInterval
    );
    expect(environmentRenderingService.update).toHaveBeenCalled();
  });

  it(' - animate(), element not visible', function() {
    environmentRenderingService.requestAnimationFrame = jasmine
      .createSpy('requestAnimationFrame')
      .and.returnValue(1);
    environmentRenderingService.isElementVisible.and.returnValue(false);

    environmentRenderingService.animate();

    expect(
      environmentRenderingService.requestAnimationFrame
    ).toHaveBeenCalledWith(environmentRenderingService.animate);
    expect(environmentRenderingService.update).not.toHaveBeenCalled();
  });

  it(' - animate(), element became visible / immediate update', function() {
    environmentRenderingService.requestAnimationFrame = jasmine
      .createSpy('requestAnimationFrame')
      .and.returnValue(1);
    environmentRenderingService.isElementVisible.and.returnValue(true);
    environmentRenderingService.visible = false;
    environmentRenderingService.needsImmediateUpdate = false;
    frameInterval = 100;
    lastFrameTime = Date.now() - frameInterval;
    environmentRenderingService.tLastFrame = lastFrameTime;
    environmentRenderingService.frameInterval = frameInterval;

    environmentRenderingService.animate();

    expect(environmentRenderingService.visible).toBe(true);
    expect(environmentRenderingService.tLastFrame).not.toBeLessThan(
      lastFrameTime + frameInterval
    );
    expect(environmentRenderingService.update).toHaveBeenCalled();
    expect(environmentRenderingService.needsImmediateUpdate).toBe(false);
  });

  it(' - animate(), skipped frames / setting drop cycles', function() {
    environmentRenderingService.isElementVisible.and.returnValue(true);

    var frameRequestID = 1234;
    environmentRenderingService.requestAnimationFrame = jasmine
      .createSpy('requestAnimationFrame')
      .and.returnValue(frameRequestID);
    environmentRenderingService.visible = true;
    environmentRenderingService.needsImmediateUpdate = false;
    environmentRenderingService.dropCycles = 0;
    frameInterval = 100;
    environmentRenderingService.frameInterval = frameInterval;
    lastFrameTime =
      Date.now() -
      frameInterval * environmentRenderingService.skippedFramesForDropCycles;
    environmentRenderingService.tLastFrame = lastFrameTime;

    environmentRenderingService.animate();

    expect(environmentRenderingService.dropCycles).toBe(
      environmentRenderingService.skippedFramesForDropCycles
    );

    // check max drop cycles
    environmentRenderingService.dropCycles = 0;
    frameInterval = 100;
    environmentRenderingService.frameInterval = frameInterval;
    lastFrameTime =
      Date.now() -
      frameInterval * (environmentRenderingService.maxDropCycles + 1);
    environmentRenderingService.tLastFrame = lastFrameTime;

    environmentRenderingService.animate();

    expect(environmentRenderingService.dropCycles).toBe(
      environmentRenderingService.maxDropCycles
    );
  });

  it(' - animate(), dropping frames', function() {
    environmentRenderingService.isElementVisible.and.returnValue(true);

    var frameRequestID = 1234;
    environmentRenderingService.requestAnimationFrame = jasmine
      .createSpy('requestAnimationFrame')
      .and.returnValue(frameRequestID);
    environmentRenderingService.visible = true;
    environmentRenderingService.needsImmediateUpdate = false;
    environmentRenderingService.dropCycles = 3;

    environmentRenderingService.animate();

    expect(environmentRenderingService.dropCycles).toBe(2);
  });

  it(' - update(), undefined scene', function() {
    gz3d.scene = undefined;

    environmentRenderingService.update();

    expect(userNavigationService.update).not.toHaveBeenCalled();
  });

  it(' - update(), normal run', function() {
    environmentRenderingService.update();

    expect(userNavigationService.update).toHaveBeenCalled();
    expect(gz3d.scene.render).toHaveBeenCalled();
  });

  it(' - initAnimationFrameFunctions()', function() {
    environmentRenderingService.initAnimationFrameFunctions();

    expect(environmentRenderingService.requestAnimationFrame).toBeDefined();
    expect(environmentRenderingService.cancelAnimationFrame).toBeDefined();
  });

  it(' - setFPSLimit()', function() {
    environmentRenderingService.setFPSLimit(5);

    expect(environmentRenderingService.frameInterval).toBe(1000 / 5);
  });

  it(' - updateInitialCameraPose()', function() {
    gz3d.scene.setDefaultCameraPose.apply = jasmine.createSpy('apply');
    var pose = {};
    environmentRenderingService.updateInitialCameraPose(pose);

    expect(gz3d.scene.setDefaultCameraPose.apply).toHaveBeenCalledWith(
      gz3d.scene,
      pose
    );
    expect(userNavigationService.setDefaultPose.apply).toHaveBeenCalledWith(
      userNavigationService,
      pose
    );
  });

  it(' - onStateChanged()', function() {
    environmentRenderingService.onStateChanged(STATE.STOPPED);

    expect(gz3d.iface.webSocket.disableRebirth).toHaveBeenCalled();
  });

  it(' - onSceneLoaded()', function() {
    spyOn(
      environmentRenderingService.deferredSceneInitialized,
      'resolve'
    ).and.callThrough();

    environmentRenderingService.assetLoadingSplashScreen = {};
    environmentRenderingService.sceneInitialized = {
      resolve: jasmine.createSpy('resolve')
    };
    environmentRenderingService.sceneLoading = true;

    environmentRenderingService.onSceneLoaded();
    environmentRenderingService.onSceneReady();

    expect(
      environmentRenderingService.assetLoadingSplashScreen
    ).not.toBeDefined();
    expect(gz3d.scene.showLightHelpers).toBe(false);
    expect(
      environmentRenderingService.deferredSceneInitialized.resolve
    ).toHaveBeenCalled();
    expect(gz3d.setLightHelperVisibility).toHaveBeenCalled();
    expect(userNavigationService.init).toHaveBeenCalled();
    expect(environmentRenderingService.sceneLoading).toBe(false);
  });

  it(' - initComposerSettings()', function() {
    environmentRenderingService.initComposerSettings();

    expect(collab3DSettingsService.loadSettings).toHaveBeenCalled();
  });

  it(' - update rendering callback', function() {
    var testFunction = jasmine.createSpy('testFunction');
    var testFunction2 = jasmine.createSpy('testFunction2');
    environmentRenderingService.addOnUpdateRenderingCallback(testFunction);

    environmentRenderingService.update(13);

    expect(testFunction).toHaveBeenCalledWith(13);
    testFunction.calls.reset();

    environmentRenderingService.addOnUpdateRenderingCallback(testFunction2);
    environmentRenderingService.removeOnUpdateRenderingCallback(testFunction);

    environmentRenderingService.update(14);
    expect(testFunction).not.toHaveBeenCalled();
    expect(testFunction2).toHaveBeenCalledWith(14);
    testFunction2.calls.reset();

    environmentRenderingService.removeOnUpdateRenderingCallback(testFunction2);
    expect(testFunction).not.toHaveBeenCalled();
    expect(testFunction2).not.toHaveBeenCalled();
  });
});
