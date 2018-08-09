'use strict';

describe('Service: gz3dViews', function() {
  var gz3dViewsService;

  var $q, $rootScope;
  var gz3d, environmentRenderingService;

  var deferredSceneInitialized;

  beforeEach(module('gz3dModule'));

  // mock modules
  beforeEach(module('gz3dMock'));
  beforeEach(module('environmentRenderingServiceMock'));

  beforeEach(
    inject(function(
      _gz3dViewsService_,
      _$q_,
      _$rootScope_,
      _gz3d_,
      _environmentRenderingService_
    ) {
      gz3dViewsService = _gz3dViewsService_;

      $q = _$q_;
      $rootScope = _$rootScope_;
      gz3d = _gz3d_;
      environmentRenderingService = _environmentRenderingService_;
    })
  );

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

  it(' - assignView(), success (no undefined containers, last view assigned)', function(
    done
  ) {
    var mockContainer = {};
    var viewToBeAssigned =
      gz3d.scene.viewManager.views[gz3d.scene.viewManager.views.length - 1];

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
});
