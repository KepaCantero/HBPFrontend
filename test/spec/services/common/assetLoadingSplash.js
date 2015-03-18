(function () {
  'use strict';

  // Define test data which we want to share across the tests
  var exampleData = [
    {id: 'test::id::mesh1', url: 'http://some_fake_url.com:1234/bla1.mesh', progress: 0, totalSize: 1, done: false},
    {id: 'test::id::mesh2', url: 'http://some_fake_url.com:1234/bla2.mesh', progress: 700, totalSize: 1000, done: false},
    {id: 'test::id::mesh3', url: 'http://some_fake_url.com:1234/bla3.mesh', progress: 200, totalSize: 200, done: true}
  ];

  describe('Services: assetLoadingSplash', function () {
    var assetLoadingSplash,
      modal;

    var modalMock = {};
    var modalInstance = {};

    // Load the service and the (mocked) service it depends upon
    beforeEach(module('exdFrontendApp'));
    beforeEach(module(function ($provide) {
      $provide.value('$modal', modalMock);
    }));
    beforeEach(inject(function (_assetLoadingSplash_, _$modal_) {
      assetLoadingSplash = _assetLoadingSplash_;
      modal = _$modal_;

      modalInstance.close = jasmine.createSpy('close');
      modal.open = jasmine.createSpy('open').andReturn(modalInstance);
    }));

    it('should call modal open', function () {
      modal.open.reset();
      assetLoadingSplash.open();
      expect(modal.open).toHaveBeenCalled();

      modal.open.reset();
      assetLoadingSplash.open();
      expect(modal.open).not.toHaveBeenCalled();
    });

    it('should call modal close', function () {
      assetLoadingSplash.open();
      assetLoadingSplash.close();
      expect(modalInstance.close).toHaveBeenCalled();
    });

    it('should set the observer callback', function () {
      var callback = jasmine.createSpy('progressCallback');
      assetLoadingSplash.setProgressObserver(callback);
      assetLoadingSplash.setProgress(exampleData);
      expect(callback).toHaveBeenCalledWith(exampleData);
    });

    it('should do nothing without an observer when setting the data', function () {
      // we expect that no exception will be thrown here
      assetLoadingSplash.setProgress(exampleData);
    });

    it('should test that close is not throwing an exception when open was called', function() {
      assetLoadingSplash.open();
      assetLoadingSplash.close();
    });

  });

  describe('Controller: AssetLoadingSplashCtrl', function () {
    var scope,
      log,
      timeout,
      filter,
      assetLoadingSplash,
      Ctrl;

    var assetLoadingSplashMock = {};
    var scopeMock = {};
    var timeoutMock = jasmine.createSpy('$timeout');

    beforeEach(module('exdFrontendApp'));
    beforeEach(module(function ($provide) {
      $provide.value('assetLoadingSplash', assetLoadingSplashMock);
      $provide.value('$scope', scopeMock);
      $provide.value('$timeout', timeoutMock);
    }));
    beforeEach(inject(function (_$scope_, _$timeout_, _$filter_, _$log_, _assetLoadingSplash_, $controller) {
      scope = _$scope_;
      log = _$log_;
      timeout = _$timeout_;
      filter = _$filter_;
      assetLoadingSplash = _assetLoadingSplash_;

      assetLoadingSplashMock.setProgressObserver = jasmine.createSpy('setProgressObserver');
      assetLoadingSplashMock.close = jasmine.createSpy('close');

      scope.$apply = jasmine.createSpy('$apply');

      spyOn(log, 'error');

      Ctrl = $controller('AssetLoadingSplashCtrl', {
        $scope: scope
      });
    }));

    it('should initialize the object properly', function () {
      expect(scope.progressData).toEqual([]);
      expect(scope.percentage).toEqual(0);
      expect(assetLoadingSplash.setProgressObserver).toHaveBeenCalled();
    });

    it('should calculate the correct progress', function () {
      assetLoadingSplash.setProgressObserver.mostRecentCall.args[0](exampleData);
      expect(assetLoadingSplash.close).not.toHaveBeenCalled();


      timeout.mostRecentCall.args[0]();
      scope.$apply.mostRecentCall.args[0]();

      expect(scope.progressData).toBe(exampleData);
      expect(scope.percentage).toEqual('75');
    });
  });
}());