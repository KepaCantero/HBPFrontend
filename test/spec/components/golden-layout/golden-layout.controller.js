'use strict';

describe('Controller: GoldenLayoutController', function() {
  let $controller, $rootScope, $scope;

  let controller;

  let goldenLayoutService, userInteractionSettingsService;

  let mockLayout, mockWorkspaces;

  beforeEach(function() {
    module('goldenLayoutModule');

    // mocks
    module('goldenLayoutServiceMock');
    module('userInteractionSettingsServiceMock');
  });

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _goldenLayoutService_,
      _userInteractionSettingsService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;

      goldenLayoutService = _goldenLayoutService_;
      userInteractionSettingsService = _userInteractionSettingsService_;
    })
  );

  beforeEach(function() {
    mockLayout = {};
    mockWorkspaces = {};
    userInteractionSettingsService.workspaces.then.and.callFake(callback => {
      callback(mockWorkspaces);
    });
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
    // no predefined layout
    expect(controller).toBeDefined();
    expect(goldenLayoutService.createLayout).toHaveBeenCalledWith(undefined);

    // with predefined layout
    mockWorkspaces.autosave = {};

    controller = $controller('GoldenLayoutController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
    expect(goldenLayoutService.createLayout).toHaveBeenCalledWith(
      mockWorkspaces.autosave
    );
  });

  it(' - onDestroy', function() {
    $scope.$broadcast('$destroy');

    expect(controller.layout).toBe(undefined);
  });
});
