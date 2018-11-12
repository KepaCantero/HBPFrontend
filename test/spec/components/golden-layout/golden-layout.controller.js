'use strict';

describe('Controller: GoldenLayoutController', function() {
  let $controller, $rootScope, $scope;

  let controller;

  let goldenLayoutService;

  let mockLayout;

  beforeEach(function() {
    module('goldenLayoutModule');

    // mocks
    module('goldenLayoutServiceMock');
  });

  beforeEach(
    inject(function(_$controller_, _$rootScope_, _goldenLayoutService_) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;

      goldenLayoutService = _goldenLayoutService_;
    })
  );

  beforeEach(function() {
    mockLayout = {};
    goldenLayoutService.createLayout.and.returnValue(mockLayout);
  });

  beforeEach(function() {
    $scope = $rootScope.$new();
    controller = $controller('GoldenLayoutController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
  });

  it(' - constructor', function() {
    expect(controller).toBeDefined();
    expect(goldenLayoutService.createLayout).toHaveBeenCalled();
    expect(controller.layout).toBe(mockLayout);
  });

  it(' - onDestroy', function() {
    $scope.$broadcast('$destroy');

    expect(controller.layout).toBe(undefined);
  });
});
