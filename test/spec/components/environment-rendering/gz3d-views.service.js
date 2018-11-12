'use strict';

describe('Service: gz3dViewsService', function() {
  let gz3dViewsService;

  let $q, $rootScope;
  let TOOL_CONFIGS;
  let environmentRenderingService, goldenLayoutService, gz3d;

  let deferredSceneInitialized;

  beforeEach(function() {
    // load real modules
    module('gz3dModule');
    module('goldenLayoutModule');

    // load mocks
    module('environmentRenderingServiceMock');
    module('goldenLayoutServiceMock');
    module('gz3dMock');
    module('nrpAnalyticsMock');

    inject(function(
      _gz3dViewsService_,
      _$q_,
      _$rootScope_,
      _TOOL_CONFIGS_,
      _environmentRenderingService_,
      _goldenLayoutService_,
      _gz3d_
    ) {
      gz3dViewsService = _gz3dViewsService_;

      $q = _$q_;
      $rootScope = _$rootScope_;

      TOOL_CONFIGS = _TOOL_CONFIGS_;

      environmentRenderingService = _environmentRenderingService_;
      goldenLayoutService = _goldenLayoutService_;
      gz3d = _gz3d_;
    });
  });

  beforeEach(function() {
    deferredSceneInitialized = $q.defer();
    environmentRenderingService.sceneInitialized.and.returnValue(
      deferredSceneInitialized.promise
    );
  });

  it(' - constructor', function() {
    expect(gz3dViewsService).toBeDefined();
    expect(gz3dViewsService.$q).toBeDefined();
    expect(gz3dViewsService.gz3d).toBeDefined();
    expect(gz3dViewsService.environmentRenderingService).toBeDefined();
  });

  it(' - views (getter)', function() {
    expect(gz3dViewsService.views).toBe(gz3d.scene.viewManager.views);
  });

  it(' - hasCameraView()', function() {
    expect(gz3dViewsService.hasCameraView()).toBe(true);

    // no view of type camera
    gz3d.scene.viewManager.views.forEach(function(el) {
      el.type = 'not-a-camera';
    });
    expect(gz3dViewsService.hasCameraView()).toBe(false);
  });

  it(' - setView(), success', function(done) {
    var mockView = {};
    var mockContainer = {};

    // success
    var successPromise = gz3dViewsService.setView(mockView, mockContainer);
    successPromise.then(
      function(success) {
        expect(
          gz3d.scene.viewManager.setViewContainerElement
        ).toHaveBeenCalledWith(mockView, mockContainer);
        expect(success).toBe(true);
        done();
      },
      function() {}
    );
    deferredSceneInitialized.resolve();
    $rootScope.$digest();
  });

  it(' - setView(), failure', function(done) {
    var mockView = {};
    var mockContainer = {};

    // failure
    var successPromise = gz3dViewsService.setView(mockView, mockContainer);
    successPromise.then(
      function() {},
      function(success) {
        expect(success).toBe(false);
        done();
      }
    );
    deferredSceneInitialized.reject();
    $rootScope.$digest();
  });

  it(" - assignView(), success (first containers undefined, so it's assigned)", function(
    done
  ) {
    var mockContainer = {};
    gz3d.scene.viewManager.views[0].container = undefined;
    var viewToBeAssigned = gz3d.scene.viewManager.views[0];

    var viewPromise = gz3dViewsService.assignView(mockContainer);
    viewPromise.then(
      function(result) {
        expect(
          gz3d.scene.viewManager.setViewContainerElement
        ).toHaveBeenCalledWith(viewToBeAssigned, mockContainer);
        expect(result).toBe(viewToBeAssigned);
        done();
      },
      function() {}
    );
    deferredSceneInitialized.resolve();
    $rootScope.$digest();
  });

  it(' - assignView(), failure', function(done) {
    var mockContainer = {};
    var viewPromise = gz3dViewsService.assignView(mockContainer);
    viewPromise.then(
      function() {},
      function(result) {
        expect(typeof result).toBe('string');
        done();
      }
    );

    deferredSceneInitialized.reject();
    $rootScope.$digest();
  });

  it(' - isUserView()', function() {
    var view = gz3d.scene.viewManager.mainUserView;
    expect(gz3dViewsService.isUserView(view)).toBe(true);
  });

  it(' - toggleCameraHelper()', function() {
    var mockView = {
      camera: {
        cameraHelper: {
          visible: false
        }
      }
    };

    gz3dViewsService.toggleCameraHelper(mockView);
    expect(mockView.camera.cameraHelper.visible).toBe(true);

    gz3dViewsService.toggleCameraHelper(mockView);
    expect(mockView.camera.cameraHelper.visible).toBe(false);
  });

  it(' - isUserView()', function() {
    expect(gz3dViewsService.isUserView({})).toBe(false);
    expect(
      gz3dViewsService.isUserView(gz3d.scene.viewManager.mainUserView)
    ).toBe(true);
  });

  it(' - onToggleRobotViews()', function() {
    spyOn(gz3dViewsService, 'hasCameraView').and.returnValue(false);
    gz3dViewsService.onToggleRobotViews();
    expect(goldenLayoutService.openTool).not.toHaveBeenCalled();

    // open views, close them
    let layoutItems = [{ remove: jasmine.createSpy('remove') }];
    goldenLayoutService.layout.root.getItemsById.and.returnValue(layoutItems);
    gz3dViewsService.hasCameraView.and.callThrough();
    gz3dViewsService.onToggleRobotViews();
    expect(layoutItems[0].remove).toHaveBeenCalled();

    // all views closed, open them
    gz3dViewsService.views[1].container = undefined;
    gz3dViewsService.onToggleRobotViews();
    expect(goldenLayoutService.openTool).toHaveBeenCalledWith(
      TOOL_CONFIGS.ROBOT_CAMERA_RENDERING
    );
  });
});
