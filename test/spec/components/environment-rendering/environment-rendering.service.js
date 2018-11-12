'use strict';

describe('Services: environmentRenderingService', function() {
  beforeEach(module('tipTooltipModule'));

  var STATE, VENDORS;

  var environmentRenderingService;
  var stateService,
    $rootScope,
    $timeout,
    gz3d,
    userContextService,
    assetLoadingSplash,
    simulationInfo,
    userNavigationService,
    collab3DSettingsService,
    tipTooltipService,
    $httpBackend;

  var frameInterval, lastFrameTime, document;

  // provide mock objects
  beforeEach(
    module(function($provide) {
      var assetLoadingSplashMock = {
        open: jasmine.createSpy('open').and.returnValue({}),
        close: jasmine.createSpy('close')
      };
      $provide.value('assetLoadingSplash', assetLoadingSplashMock);

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

      document = {};
      $provide.value('$document', document);
    })
  );

  beforeEach(function() {
    module('environmentRenderingModule');
    module('exdFrontendApp.Constants');
    module('simulationInfoMock');
    module('bbpConfigMock');
    module('gz3dMock');
    module('tipTooltipServiceMock');
    module('storageServerMock');
    module('stateServiceMock');
    module('userContextServiceMock');
    module('userNavigationServiceMock');

    // inject service for testing.
    inject(function(
      _$rootScope_,
      _$timeout_,
      _STATE_,
      _VENDORS_,
      _environmentRenderingService_,
      _stateService_,
      _gz3d_,
      _userContextService_,
      _assetLoadingSplash_,
      _simulationInfo_,
      _userNavigationService_,
      _collab3DSettingsService_,
      _tipTooltipService_,
      _$httpBackend_
    ) {
      STATE = _STATE_;
      VENDORS = _VENDORS_;
      $rootScope = _$rootScope_;
      $timeout = _$timeout_;
      environmentRenderingService = _environmentRenderingService_;
      stateService = _stateService_;
      gz3d = _gz3d_;
      userContextService = _userContextService_;
      assetLoadingSplash = _assetLoadingSplash_;
      simulationInfo = _simulationInfo_;
      userNavigationService = _userNavigationService_;
      collab3DSettingsService = _collab3DSettingsService_;
      tipTooltipService = _tipTooltipService_;
      $httpBackend = _$httpBackend_;
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

    var xmlConfig = `<?xml version="1.0"?>
<model>
  <name>CDP1 Mouse forelimb attached to sled</name>
  <version>1.0</version>
  <sdf version='1.4'>model.sdf</sdf>
  <frontend_skin_model>    <mesh>myskin.fbx</mesh>
  </frontend_skin_model>
</model>
`;

    $httpBackend.whenGET('robotpath').respond(xmlConfig);
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

  it(' - should return a promise for sceneInitialized', function() {
    expect(environmentRenderingService.sceneInitialized()).toBe(
      environmentRenderingService.deferredSceneInitialized.promise
    );
  });

  it(' - initialize requestAnimationFrame for any of its implementations', function() {
    spyOn(window.requestAnimationFrame, 'bind').and.returnValue(undefined);
    for (var i = 0; i < VENDORS.length; ++i) {
      var raf = window[VENDORS[i] + 'RequestAnimationFrame'];
      var caf = window[VENDORS[i] + 'CancelAnimationFrame'];
      if (raf) {
        spyOn(raf, 'bind').and.returnValue(undefined);
      }
      if (caf) {
        spyOn(caf, 'bind').and.returnValue(undefined);
      }
    }
    environmentRenderingService.initAnimationFrameFunctions();
    expect(environmentRenderingService.requestAnimationFrame).toBeDefined();
    expect(environmentRenderingService.cancelAnimationFrame).toBeDefined();
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

    // pose is null
    environmentRenderingService.updateInitialCameraPose(null);
    gz3d.scene.setDefaultCameraPose.apply.calls.reset();
    userNavigationService.setDefaultPose.apply.calls.reset();
    expect(gz3d.scene.setDefaultCameraPose.apply).not.toHaveBeenCalled();
    expect(userNavigationService.setDefaultPose.apply).not.toHaveBeenCalled();
  });

  it(' - onStateChanged()', function() {
    let disableRebirth = gz3d.iface.webSocket.disableRebirth;
    environmentRenderingService.onStateChanged(STATE.STOPPED);

    expect(disableRebirth).toHaveBeenCalled();

    // no websocket
    disableRebirth.calls.reset();
    gz3d.iface.webSocket = null;
    environmentRenderingService.onStateChanged(STATE.STOPPED);
    expect(disableRebirth).not.toHaveBeenCalled();

    // other state besides STOPPED
    disableRebirth.calls.reset();
    gz3d.iface.webSocket = {};
    environmentRenderingService.onStateChanged(STATE.STARTED);
    expect(disableRebirth).not.toHaveBeenCalled();
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

    spyOn(environmentRenderingService, 'showCameraHintWhenNeeded');
    $timeout.flush();
    expect(
      environmentRenderingService.showCameraHintWhenNeeded
    ).toHaveBeenCalled();

    // not loading
    environmentRenderingService.sceneLoading = false;
    gz3d.setLightHelperVisibility.calls.reset();
    environmentRenderingService.onSceneLoaded();
    expect(gz3d.setLightHelperVisibility).not.toHaveBeenCalled();
  });

  it(' - initComposerSettings()', function() {
    environmentRenderingService.initComposerSettings();

    expect(collab3DSettingsService.loadSettings).toHaveBeenCalled();

    environmentRenderingService.scene3DSettingsReady = false;
    $timeout.flush();
    expect(environmentRenderingService.scene3DSettingsReady).toBe(true);
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

  it(' - showCameraHintWhenNeeded()', function(done) {
    spyOn(
      environmentRenderingService,
      'showCameraHintWhenNeeded'
    ).and.callThrough();
    environmentRenderingService.sceneLoading = false;
    environmentRenderingService.lastCameraTransform = new THREE.Object3D();
    environmentRenderingService.lastCameraTransform.position.set(1, 2, 3);
    environmentRenderingService.lastCameraTransform.quaternion.set(1, 2, 3, 4);

    environmentRenderingService.showCameraHintWhenNeeded();

    expect(tipTooltipService.setCurrentTip).toHaveBeenCalled();
    $timeout.flush();
    expect(
      environmentRenderingService.showCameraHintWhenNeeded.calls.count()
    ).toBe(2);

    done();
  });

  it(' should display camera hint when needed', function() {
    environmentRenderingService.lastCameraTransform = {
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 }
    };
    environmentRenderingService.sceneLoading = false;
    environmentRenderingService.showCameraHintWhenNeeded();

    expect(
      environmentRenderingService.tipTooltipService.setCurrentTip
    ).toHaveBeenCalled();
  });

  it(' - should handle robot skin', function() {
    gz3d.scene.addSkinMesh = jasmine.createSpy('addSkinMesh');

    environmentRenderingService.initRobotSkin();

    $httpBackend.flush();

    expect(gz3d.scene.addSkinMesh).toHaveBeenCalled();
  });

  it(' - event ENTER_SIMULATION', function() {
    spyOn(environmentRenderingService, 'init');
    $rootScope.$broadcast('ENTER_SIMULATION');
    expect(environmentRenderingService.init).toHaveBeenCalled();
  });

  it(' - event EXIT_SIMULATION', function() {
    spyOn(environmentRenderingService, 'deinit');
    $rootScope.$broadcast('EXIT_SIMULATION');
    expect(environmentRenderingService.deinit).toHaveBeenCalled();
  });

  it(' - event ASSETS_LOADED', function() {
    spyOn(environmentRenderingService, 'onSceneLoaded');
    $rootScope.$broadcast('ASSETS_LOADED');
    expect(environmentRenderingService.onSceneLoaded).toHaveBeenCalled();
  });

  it(' - initAnimationFrameFunctions(), with undefined requestAnimationFrame() & cancelAnimationFrame()', function(
    done
  ) {
    window.requestAnimationFrame = {
      bind: jasmine.createSpy('bind').and.returnValue(undefined)
    };
    window.cancelAnimationFrame = {
      bind: jasmine.createSpy('bind').and.returnValue(undefined)
    };
    for (let x = 0; x < VENDORS.length && !this.requestAnimationFrame; ++x) {
      window[VENDORS[x] + 'RequestAnimationFrame'] = undefined;
      window[VENDORS[x] + 'CancelAnimationFrame'] = undefined;
      window[VENDORS[x] + 'CancelRequestAnimationFrame'] = undefined;
    }
    environmentRenderingService.initAnimationFrameFunctions();

    let mockRequestCallback = jasmine.createSpy('mockCallback');
    let id = environmentRenderingService.requestAnimationFrame(
      mockRequestCallback
    );
    setTimeout(function() {
      expect(mockRequestCallback).toHaveBeenCalled();
      environmentRenderingService.cancelAnimationFrame(id);
      done();
    }, 500);
  });

  it(' - isElementVisible()', function(done) {
    document.hidden = true;
    expect(environmentRenderingService.isElementVisible()).toBe(false);

    document.hidden = undefined;
    document.msHidden = true;
    expect(environmentRenderingService.isElementVisible()).toBe(false);

    document.msHidden = undefined;
    document.webkitHidden = true;
    expect(environmentRenderingService.isElementVisible()).toBe(false);

    document.webkitHidden = false;
    expect(environmentRenderingService.isElementVisible()).toBe(true);

    done();
  });
});
