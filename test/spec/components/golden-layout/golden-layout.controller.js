'use strict';

describe('Controller: GoldenLayoutController', function() {
  let $controller, $rootScope, $scope;

  let controller;

  let goldenLayoutService, nrpUser, userInteractionSettingsService;

  let mockLayout;

  beforeEach(function() {
    module('goldenLayoutModule');

    // mocks
    module('goldenLayoutServiceMock');
    module('nrpUserMock');
    module('userInteractionSettingsServiceMock');
  });

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _goldenLayoutService_,
      _nrpUser_,
      _userInteractionSettingsService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;

      goldenLayoutService = _goldenLayoutService_;
      nrpUser = _nrpUser_;
      userInteractionSettingsService = _userInteractionSettingsService_;
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
    expect(goldenLayoutService.createLayout).toHaveBeenCalledWith(undefined);
    expect(controller.layout).toBe(mockLayout);

    // with predefined layout
    let initConfig = {};
    userInteractionSettingsService.settingsData.autosaveOnExit = {};
    userInteractionSettingsService.settingsData.autosaveOnExit.lastWorkspaceLayouts = {};
    userInteractionSettingsService.settingsData.autosaveOnExit.lastWorkspaceLayouts[
      nrpUser.currentUser.id
    ] = initConfig;

    controller = $controller('GoldenLayoutController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
    expect(goldenLayoutService.createLayout).toHaveBeenCalledWith(initConfig);
  });

  it(' - onDestroy', function() {
    $scope.$broadcast('$destroy');

    expect(controller.layout).toBe(undefined);
  });
});
