(function() {
  'use strict';

  // Define test data which we want to share across the tests
  var exampleData = {};
  exampleData.prepared = true;
  exampleData.assets = [
    {
      id: 'test::id::mesh1',
      url: 'http://some_fake_url.com:1234/bla1.mesh',
      progress: 0,
      totalSize: 1,
      done: false
    },
    {
      id: 'test::id::mesh2',
      url: 'http://some_fake_url.com:1234/bla2.mesh',
      progress: 700,
      totalSize: 1000,
      done: false
    },
    {
      id: 'test::id::mesh3',
      url: 'http://some_fake_url.com:1234/bla3.mesh',
      progress: 200,
      totalSize: 200,
      done: true
    }
  ];

  describe('Services: assetLoadingSplash', function() {
    var assetLoadingSplash, modal;

    var modalMock = {};
    var modalInstance;

    // Load the service and the (mocked) service it depends upon
    beforeEach(module('exdFrontendApp'));
    beforeEach(
      module(function($provide) {
        $provide.value('$uibModal', modalMock);
      })
    );
    beforeEach(
      inject(function(_assetLoadingSplash_, _$uibModal_) {
        assetLoadingSplash = _assetLoadingSplash_;
        modal = _$uibModal_;

        modalInstance = {};
        modalInstance.close = jasmine.createSpy('close');
        modal.open = jasmine.createSpy('open').and.returnValue(modalInstance);
      })
    );

    it('should call modal open', function() {
      modal.open.calls.reset();
      modalInstance.close.calls.reset();
      assetLoadingSplash.open();
      expect(modal.open).toHaveBeenCalled();
      expect(modalInstance.close).not.toHaveBeenCalled();

      modal.open.calls.reset();
      modalInstance.close.calls.reset();
      assetLoadingSplash.open();
      expect(modal.open).toHaveBeenCalled();
      expect(modalInstance.close).toHaveBeenCalled();
    });

    it('should call modal close', function() {
      spyOn(console, 'error');
      var callbackOnClose = jasmine.createSpy('callbackOnClose');
      assetLoadingSplash.open(callbackOnClose);
      assetLoadingSplash.close();
      expect(modalInstance.close).toHaveBeenCalled();
      expect(callbackOnClose).toHaveBeenCalled();

      modalInstance = undefined;
      assetLoadingSplash.close();
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should set the observer callback', function() {
      var callback = jasmine.createSpy('progressCallback');
      assetLoadingSplash.setProgressObserver(callback);
      assetLoadingSplash.setProgress(exampleData);
      expect(callback).toHaveBeenCalledWith(exampleData);
    });

    it('should do nothing without an observer when setting the data', function() {
      // we expect that no exception will be thrown here
      assetLoadingSplash.setProgress(exampleData);
    });

    it('should test that close is not throwing an exception when open was called', function() {
      assetLoadingSplash.open();
      assetLoadingSplash.close();
    });
  });

  describe('Controller: AssetLoadingSplashCtrl', function() {
    var scope, timeout, $location, assetLoadingSplash;

    var assetLoadingSplashMock = {};
    var environmentRenderingServiceMock = {
      onSceneLoaded: jasmine.createSpy('onSceneLoaded'),
      scene3DSettingsReady: true
    };
    var scopeMock = {};
    var timeoutMock = jasmine.createSpy('$timeout');

    beforeEach(module('exdFrontendApp'));
    beforeEach(
      module(function($provide) {
        $provide.value('assetLoadingSplash', assetLoadingSplashMock);
        $provide.value('$scope', scopeMock);
        $provide.value('$timeout', timeoutMock);
        $provide.value(
          'environmentRenderingService',
          environmentRenderingServiceMock
        );
      })
    );
    beforeEach(
      inject(function(
        _$scope_,
        _$timeout_,
        _assetLoadingSplash_,
        _$location_,
        $controller
      ) {
        scope = _$scope_;
        timeout = _$timeout_;
        $location = _$location_;
        assetLoadingSplash = _assetLoadingSplash_;

        assetLoadingSplashMock.setProgressObserver = jasmine.createSpy(
          'setProgressObserver'
        );
        assetLoadingSplashMock.close = jasmine.createSpy('close');

        $location.path = jasmine.createSpy('path');

        scope.$apply = jasmine.createSpy('$apply');

        $controller('AssetLoadingSplashCtrl', {
          $scope: scope
        });
      })
    );

    it('should initialize the object properly', function() {
      expect(scope.progressData).toEqual({});
      expect(assetLoadingSplash.setProgressObserver).toHaveBeenCalled();
    });

    it('should calculate the correct progress', function() {
      assetLoadingSplash.setProgressObserver.calls
        .mostRecent()
        .args[0](exampleData);
      expect(assetLoadingSplash.close).not.toHaveBeenCalled();

      var ncalls = timeout.calls.count();
      timeout.calls.argsFor(ncalls - 1)[0]();

      expect(scope.progressData).toBe(exampleData);
      expect(scope.loadedAssets).toEqual(1);
      expect(scope.totalAssets).toEqual(3);
    });

    it('should close the splash close and redirect to esv-private', function() {
      scope.close();
      expect(assetLoadingSplash.close).toHaveBeenCalled();
      expect($location.path).toHaveBeenCalledWith('esv-private');
    });

    it('should watch gz3d when assets are loaded without error', function() {
      scope.$watch = jasmine.createSpy('$watch');

      exampleData.assets[0].progress = 1;
      exampleData.assets[0].done = true;
      exampleData.assets[1].progress = 1000;
      exampleData.assets[1].done = true;
      assetLoadingSplash.setProgressObserver.calls
        .mostRecent()
        .args[0](exampleData);
      expect(scope.$watch).toHaveBeenCalled();

      var ncalls = timeout.calls.count();
      timeout.calls.argsFor(ncalls - 1)[0]();

      expect(scope.loadedAssets).toEqual(3);
      expect(scope.totalAssets).toEqual(3);
    });

    it('should not close the splash and set isError when done with error', function() {
      exampleData.assets[0].progress = 0;
      exampleData.assets[0].done = true;
      exampleData.assets[0].error = true;
      exampleData.assets[1].progress = 1000;
      exampleData.assets[1].done = true;
      assetLoadingSplash.setProgressObserver.calls
        .mostRecent()
        .args[0](exampleData);
      expect(assetLoadingSplash.close).not.toHaveBeenCalled();

      expect(scope.isError).toBeTruthy();
    });

    it('should not close the splash and set isError when loading assets timeout occurs', function() {
      scope.isError = false;
      scope.totalAssets = 0;
      timeout.calls.mostRecent().args[0]();
      expect(assetLoadingSplash.close).not.toHaveBeenCalled();
      expect(scope.isError).toBeTruthy();
    });

    it('should do nothing if timeout occurs but assets loading is in progress', function() {
      scope.isError = false;
      scope.totalAssets = 1;
      timeout.calls.mostRecent().args[0]();
      expect(scope.isError).toBeFalsy();
    });
  });
})();
