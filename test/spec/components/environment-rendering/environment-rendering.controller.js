/* global THREE: false */

'use strict';

describe('Controller: EnvironmentRenderingController', function() {
  var environmentRenderingController,
    controller,
    $scope,
    $rootScope,
    log,
    stateService,
    gz3d,
    userNavigationService,
    collabExperimentLockServiceMock = {},
    lockServiceMock,
    $q,
    callback,
    lockServiceCancelCallback,
    userContextService,
    simulationStateObject,
    simulationControlObject,
    nrpBackendVersionsObject,
    gz3dViewsService,
    environmentRenderingService,
    dynamicViewOverlayService,
    videoStreamService;

  var mockAngularElement,
    deferredSceneInitialized,
    deferredView,
    deferredStreamingUrl;

  // load the controller's module
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template

  beforeEach(module('stateServiceMock'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('userNavigationServiceMock'));
  beforeEach(module('userContextServiceMock'));
  beforeEach(module('editorsPanelServiceMock'));
  beforeEach(module('contextMenuStateMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('assetLoadingSplashMock'));
  beforeEach(module('colorableObjectServiceMock'));
  beforeEach(module('experimentServiceMock'));
  beforeEach(module('gz3dViewsServiceMock'));
  beforeEach(module('environmentRenderingServiceMock'));
  beforeEach(module('dynamicViewOverlayServiceMock'));
  beforeEach(module('videoStreamServiceMock'));

  beforeEach(
    module(function($provide) {
      simulationStateObject = {
        update: jasmine.createSpy('update'),
        state: jasmine.createSpy('state')
      };

      simulationControlObject = {
        simulation: jasmine.createSpy('simulation')
      };

      nrpBackendVersionsObject = {
        get: jasmine.createSpy('get')
      };

      var collab3DSettingsServiceMock = {};

      collab3DSettingsServiceMock.loadSettings = function() {
        var res = {};
        res.finally = function(callback) {
          callback(true);
        };
        return res;
      };

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
      $provide.value(
        'collabExperimentLockService',
        collabExperimentLockServiceMock
      );

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
      $provide.value('$element', mockAngularElement);

      simulationStateObject.update.calls.reset();
      simulationStateObject.state.calls.reset();
      simulationControlObject.simulation.calls.reset();
      nrpBackendVersionsObject.get.calls.reset();
    })
  );

  // Initialize the controller and a mock scope
  beforeEach(
    inject(function(
      $controller,
      _$rootScope_,
      _$element_,
      _$log_,
      _$timeout_,
      _simulationInfo_,
      _stateService_,
      _contextMenuState_,
      _nrpBackendVersions_,
      _nrpFrontendVersion_,
      _gz3d_,
      _userNavigationService_,
      _$q_,
      _environmentService_,
      _experimentService_,
      _userContextService_,
      _colorableObjectService_,
      _gz3dViewsService_,
      _environmentRenderingService_,
      _dynamicViewOverlayService_,
      _videoStreamService_
    ) {
      controller = $controller;
      $rootScope = _$rootScope_;
      log = _$log_;
      $scope = $rootScope.$new();
      stateService = _stateService_;
      gz3d = _gz3d_;
      userNavigationService = _userNavigationService_;
      $q = _$q_;
      userContextService = _userContextService_;
      gz3dViewsService = _gz3dViewsService_;
      environmentRenderingService = _environmentRenderingService_;
      dynamicViewOverlayService = _dynamicViewOverlayService_;
      videoStreamService = _videoStreamService_;

      callback = $q.defer();
      lockServiceCancelCallback = jasmine.createSpy('cancelCallback');
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
      collabExperimentLockServiceMock.createLockServiceForExperimentId = function() {
        return lockServiceMock;
      };

      userContextService.hasEditRights.and.callFake(function(entity) {
        return (
          userContextService.isOwner ||
          userNavigationService.isUserAvatar(entity)
        );
      });

      // create mock for $log
      spyOn(log, 'error');

      deferredSceneInitialized = $q.defer();
      environmentRenderingService.sceneInitialized.and.returnValue(
        deferredSceneInitialized.promise
      );

      deferredView = $q.defer();
      gz3dViewsService.assignView.and.returnValue(deferredView.promise);

      deferredStreamingUrl = $q.defer();
      videoStreamService.getStreamingUrlForTopic.and.returnValue(
        deferredStreamingUrl.promise
      );
    })
  );

  describe('(ViewMode)', function() {
    beforeEach(function() {
      environmentRenderingController = controller(
        'EnvironmentRenderingController',
        {
          $rootScope: $rootScope,
          $scope: $scope
        }
      );

      spyOn(environmentRenderingController, 'onDestroy').and.callThrough();
    });

    it('should have editRights when owner', function() {
      userContextService.isOwner = false;
      expect(
        userContextService.hasEditRights({ name: 'not-user-avatar' })
      ).toBe(false);
      userContextService.isOwner = true;
      expect(
        userContextService.hasEditRights({ name: 'not-user-avatar' })
      ).toBe(true);
      expect(userNavigationService.isUserAvatar).toHaveBeenCalled();
    });

    it('should have editRights for user avatar', function() {
      userContextService.isOwner = false;
      expect(userContextService.hasEditRights({ name: 'user-avatar' })).toBe(
        true
      );
      expect(userNavigationService.isUserAvatar).toHaveBeenCalled();
    });

    it('should emit light intensity changes', function() {
      gz3d.scene.scene = {};

      var light0 = new THREE.AmbientLight();
      var light1 = new THREE.PointLight();
      light1.name = 'left_spot';
      light1.initialIntensity = 0.5;
      var light2 = new THREE.PointLight();
      light2.name = 'right_spot';
      light2.initialIntensity = 0.5;

      gz3d.scene.scene.__lights = [light1, light2];

      var helper = undefined;
      var entity0 = {
        children: [light0, helper]
      };
      var entity1 = {
        children: [light1, helper]
      };
      var entity2 = {
        children: [light2, helper]
      };
      gz3d.scene.getByName = function(name) {
        if (name === 'ambient') {
          return entity0;
        }

        if (name === 'left_spot') {
          return entity1;
        }

        if (name === 'right_spot') {
          return entity2;
        }

        return undefined;
      };

      //TODO: complete test implementation
      //gz3d.scene.getLightType = GZ3D.Scene.prototype.getLightType;
      //gz3d.scene.intensityToAttenuation = GZ3D.Scene.prototype.intensityToAttenuation;
      //scope.incrementLightIntensities(-0.5);
    });

    it('should do nothing on $destroy when all is undefined', function() {
      $scope.assetLoadingSplashScreen = undefined;
      gz3d.iface.webSocket = undefined;
      $scope.rosConnection = undefined;
      $scope.statusListener = undefined;

      $scope.$destroy();

      expect($scope.splashScreen).not.toBeDefined();
      expect($scope.assetLoadingSplashScreen).not.toBeDefined();
      expect($scope.statusListener).not.toBeDefined();
      expect($scope.worldStatsListener).not.toBeDefined();
      expect($scope.rosConnection).not.toBeDefined();
      expect(gz3d.iface.webSocket).not.toBeDefined();
    });

    it(' - initialization', function() {
      var mockOverlayWrapper = {
        setAttribute: jasmine.createSpy('setAttribute'),
        clientWidth: 300,
        style: {
          width: 0,
          height: 0
        }
      };
      dynamicViewOverlayService.getParentOverlayWrapper.and.returnValue(
        mockOverlayWrapper
      );

      var mockOverlayParent = [{ clientWidth: 300, clientHeight: 200 }];
      dynamicViewOverlayService.getOverlayParentElement.and.returnValue(
        mockOverlayParent
      );

      var container = mockAngularElement[0].getElementsByClassName()[0];
      expect(environmentRenderingController.gz3dContainerElement).toBe(
        container
      );
      expect(environmentRenderingController.containerElement).toBe(container);
      expect(environmentRenderingService.sceneInitialized).toHaveBeenCalled();

      deferredSceneInitialized.resolve();
      $rootScope.$digest();
      expect(gz3dViewsService.assignView).toHaveBeenCalledWith(container);

      var mockView = {
        type: 'camera',
        initAspectRatio: 1.6,
        topic: 'test_topic_url'
      };
      deferredView.resolve(mockView);
      $rootScope.$digest();
      expect(environmentRenderingController.view).toBe(mockView);
      expect(
        dynamicViewOverlayService.getParentOverlayWrapper
      ).toHaveBeenCalled();
      expect(mockOverlayWrapper.setAttribute).toHaveBeenCalledWith(
        'keep-aspect-ratio',
        mockView.initAspectRatio.toString()
      );

      var expectedWidth = environmentRenderingController.INIT_WIDTH_PERCENTAGE;
      var expectedHeight =
        environmentRenderingController.INIT_WIDTH_PERCENTAGE *
        mockOverlayParent[0].clientWidth /
        mockView.initAspectRatio /
        mockOverlayParent[0].clientHeight;
      expect(mockOverlayWrapper.style.width).toBe(
        (expectedWidth * 100).toString() + '%'
      );
      expect(mockOverlayWrapper.style.height).toBe(
        (expectedHeight * 100).toString() + '%'
      );

      expect(videoStreamService.getStreamingUrlForTopic).toHaveBeenCalledWith(
        mockView.topic
      );
      var streamUrl = 'test_streaming_url';
      deferredStreamingUrl.resolve(streamUrl);
      $rootScope.$digest();
      expect(environmentRenderingController.videoUrl).toBe(streamUrl);
    });

    it(' - $destroy', function() {
      environmentRenderingController.view = {
        container: {},
        camera: {
          cameraHelper: {
            visible: true
          }
        }
      };

      $scope.$destroy();

      expect(environmentRenderingController.onDestroy).toHaveBeenCalled();
      expect(gz3dViewsService.toggleCameraHelper).toHaveBeenCalledWith(
        environmentRenderingController.view
      );
      expect(environmentRenderingController.view.container).not.toBeDefined();
    });

    it(' - isCameraView', function() {
      environmentRenderingController.view = {
        type: 'camera'
      };
      expect(environmentRenderingController.isCameraView()).toBe(true);

      environmentRenderingController.view = {
        type: 'not-camera'
      };
      expect(environmentRenderingController.isCameraView()).toBe(false);

      environmentRenderingController.view = undefined;
      expect(environmentRenderingController.isCameraView()).toBe(undefined);
    });

    it(' - onClickFrustumIcon', function() {
      var view = {};
      environmentRenderingController.view = view;
      environmentRenderingController.onClickFrustumIcon();
      expect(gz3dViewsService.toggleCameraHelper).toHaveBeenCalledWith(view);
    });

    it(' - onClickCameraStream', function() {
      environmentRenderingController.showServerStream = false;
      environmentRenderingController.reconnectTrials = 0;

      environmentRenderingController.onClickCameraStream();
      expect(environmentRenderingController.showServerStream).toBe(true);
      expect(environmentRenderingController.reconnectTrials).toBe(1);

      environmentRenderingController.onClickCameraStream();
      expect(environmentRenderingController.showServerStream).toBe(false);
      expect(environmentRenderingController.reconnectTrials).toBe(2);
    });

    it(' - getVideoUrlSource', function() {
      var testUrl = 'test_video_url';
      var testState = 'test_state_running';
      var reconnectTrials = 5;
      environmentRenderingController.reconnectTrials = reconnectTrials;
      environmentRenderingController.videoUrl = testUrl;
      stateService.currentState = testState;

      // not showing server stream, return empty string
      environmentRenderingController.showServerStream = false;
      var url = environmentRenderingController.getVideoUrlSource();
      expect(url).toBe('');

      // now showing server stream
      environmentRenderingController.showServerStream = true;
      url = environmentRenderingController.getVideoUrlSource();
      expect(url).toBe(testUrl + '&t=' + testState + reconnectTrials);
    });
  });
});
