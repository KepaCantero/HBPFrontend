'use strict';

describe('Controller: EditorToolbarController', function() {
  var $controller,
    $rootScope,
    $scope,
    editorToolbarController,
    userContextService,
    userNavigationService,
    editorsPanelService,
    gz3d,
    environmentService,
    splash,
    environmentRenderingService,
    editorToolbarService,
    gz3dViewsService,
    dynamicViewOverlayService,
    DYNAMIC_VIEW_CHANNELS,
    NAVIGATION_MODES,
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
  beforeEach(module('pullForceServiceMock'));
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
      _dynamicViewOverlayService_,
      _DYNAMIC_VIEW_CHANNELS_,
      _STATE_,
      _NAVIGATION_MODES_,
      _EDIT_MODE_,
      _nrpModalService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      userContextService = _userContextService_;
      gz3d = _gz3d_;
      userNavigationService = _userNavigationService_;
      editorsPanelService = _editorsPanelService_;
      environmentService = _environmentService_;
      splash = _splash_;
      environmentRenderingService = _environmentRenderingService_;
      editorToolbarService = _editorToolbarService_;
      gz3dViewsService = _gz3dViewsService_;
      dynamicViewOverlayService = _dynamicViewOverlayService_;
      DYNAMIC_VIEW_CHANNELS = _DYNAMIC_VIEW_CHANNELS_;
      NAVIGATION_MODES = _NAVIGATION_MODES_;
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

    it('should toggle minize toolbar', function() {
      editorToolbarController.toolbarMinimized = false;
      editorToolbarController.toggleMinimizeToolbar();

      expect(editorToolbarController.toolbarMinimized).toBe(true);
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

    it(' - isOneRobotViewOpen()', function() {
      gz3dViewsService.hasCameraView.and.returnValue(true);
      gz3dViewsService.views = [
        {
          name: 'some_robot_view',
          container: {}
        }
      ];
      expect(editorToolbarController.isOneRobotViewOpen()).toBe(true);
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
  });

  describe('(EditMode)', function() {
    beforeEach(function() {
      environmentService.setPrivateExperiment(true);

      editorToolbarController = $controller('EditorToolbarController', {
        $rootScope: $rootScope,
        $scope: $scope
      });
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
