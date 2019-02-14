/* global THREE: false */

'use strict';

describe('Controller: SimToolsSidebarController', function() {
  let simToolsSidebarController;

  let $controller, $rootScope, $scope, $timeout;
  let simToolsSidebarService;

  // real modules
  beforeEach(() => {
    module('simToolsSidebarModule');
    module('goldenLayoutModule');
    module('tipTooltipModule');
  });

  // mock modules
  beforeEach(() => {
    module('clientLoggerServiceMock');
    module('editorToolbarServiceMock');
    module('environmentRenderingServiceMock');
    module('gz3dMock');
    module('gz3dViewsServiceMock');
    module('helpTooltipServiceMock');
    module('nrpAnalyticsMock');
    module('simulationInfoMock');
    module('userContextServiceMock');
    module('videoStreamServiceMock');
    module('tipTooltipServiceMock');
  });

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _$timeout_,
      _simToolsSidebarService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $timeout = _$timeout_;

      simToolsSidebarService = _simToolsSidebarService_;
    })
  );

  beforeEach(function() {
    $scope = $rootScope.$new();
    simToolsSidebarController = $controller('SimToolsSidebarController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
  });

  it(' - constructor()', function() {
    expect(simToolsSidebarController.isSubmenuSceneNavigationOpen).toBe(false);
    expect(simToolsSidebarController.isSubmenuLightingOpen).toBe(false);
  });

  it(' - on event ASSETS_LOADED', function() {
    expect(simToolsSidebarController.show).toBe(false);

    $rootScope.$broadcast('ASSETS_LOADED');

    expect(simToolsSidebarController.show).toBe(true);

    spyOn(simToolsSidebarService, 'isOverflowingY').and.returnValue(true);
    $timeout.flush();
    expect(
      simToolsSidebarController.overflowing[
        simToolsSidebarController.SIMTOOLS_SIDEBAR_ID.SIDEBAR
      ]
    ).toBe(true);
  });

  it(' - onButtonExpandCategory()', function() {
    expect(simToolsSidebarController.expandedCategory).toBe(null);
    simToolsSidebarController.onButtonExpandCategory('my-category');
    expect(simToolsSidebarController.expandedCategory).toBe('my-category');
    simToolsSidebarController.onButtonExpandCategory('my-category');
    expect(simToolsSidebarController.expandedCategory).toBe(null);

    // should also close the submenus
    simToolsSidebarController.isSubmenuSceneNavigationOpen = true;
    simToolsSidebarController.isSubmenuLightingOpen = true;
    simToolsSidebarController.onButtonExpandCategory('my-category');
    expect(simToolsSidebarController.isSubmenuSceneNavigationOpen).toBe(false);
    expect(simToolsSidebarController.isSubmenuLightingOpen).toBe(false);
  });
});
