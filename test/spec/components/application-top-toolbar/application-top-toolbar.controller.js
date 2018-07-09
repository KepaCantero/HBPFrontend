'use strict';

describe('Controller: ApplicationTopToolbarController', function() {
  let applicationTopToolbarController;

  let $controller, $rootScope, $scope, $window;
  let bbpConfig,
    experimentViewService,
    simulationInfo,
    storageServerTokenManager,
    userContextService;

  beforeEach(module('exdFrontendApp'));

  beforeEach(module('experimentViewServiceMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('storageServerMock'));
  beforeEach(module('userContextServiceMock'));

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _$window_,
      _bbpConfig_,
      _experimentViewService_,
      _simulationInfo_,
      _storageServerTokenManager_,
      _userContextService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $window = _$window_;
      bbpConfig = _bbpConfig_;
      experimentViewService = _experimentViewService_;
      simulationInfo = _simulationInfo_;
      storageServerTokenManager = _storageServerTokenManager_;
      userContextService = _userContextService_;
    })
  );

  beforeEach(function() {
    $scope = $rootScope.$new();
    applicationTopToolbarController = $controller(
      'ApplicationTopToolbarController',
      {
        $rootScope: $rootScope,
        $scope: $scope
      }
    );
  });

  it(' - openMenu()', function() {
    let mockMdMenu = {
      open: jasmine.createSpy('open')
    };
    let mockEvent = {};

    applicationTopToolbarController.openMenu(mockMdMenu, mockEvent);
    expect(mockMdMenu.open).toHaveBeenCalledWith(mockEvent);
  });

  it(' - onButtonLogout()', function() {
    applicationTopToolbarController.onButtonLogout();

    expect(storageServerTokenManager.clearStoredToken).toHaveBeenCalled();
    expect($window.location.reload).toHaveBeenCalled();
  });

  it(' - onButtonSetSimulationState()', function() {
    let mockState = {};
    applicationTopToolbarController.onButtonSetSimulationState(mockState);

    expect(experimentViewService.setSimulationState).toHaveBeenCalledWith(
      mockState
    );
  });

  it(' - onButtonReset()', function() {
    applicationTopToolbarController.onButtonReset();

    expect(experimentViewService.resetSimulation).toHaveBeenCalled();
  });

  it(' - onButtonExit()', function() {
    // demo mode = false
    applicationTopToolbarController.onButtonExit();
    expect(experimentViewService.openExitDialog).toHaveBeenCalled();
    expect(experimentViewService.exitSimulation).not.toHaveBeenCalled();

    // demo mode = true
    spyOn(bbpConfig, 'get').and.callFake((value, defaultValue) => {
      if (value === 'demomode.demoCarousel') {
        return true;
      } else {
        return defaultValue;
      }
    });
    applicationTopToolbarController.onButtonExit();
    expect(experimentViewService.exitSimulation).toHaveBeenCalled();
  });

  it(' - allowPlayPause()', function() {
    userContextService.isOwner.and.returnValue(false);
    expect(applicationTopToolbarController.allowPlayPause()).toBe(false);

    userContextService.isOwner.and.returnValue(true);
    expect(applicationTopToolbarController.allowPlayPause()).toBe(true);
  });

  describe('outside a running experiment/simulation view', function() {
    beforeEach(function() {
      experimentViewService.isInSimulationView.and.returnValue(false);
    });

    beforeEach(function() {
      $scope = $rootScope.$new();
      applicationTopToolbarController = $controller(
        'ApplicationTopToolbarController',
        {
          $rootScope: $rootScope,
          $scope: $scope
        }
      );
    });
  });

  describe('inside a running experiment/simulation view', function() {
    beforeEach(function() {
      experimentViewService.isInSimulationView.and.returnValue(true);
      simulationInfo.experimentDetails.name = 'test experiment 123';
    });

    beforeEach(function() {
      $scope = $rootScope.$new();
      applicationTopToolbarController = $controller(
        'ApplicationTopToolbarController',
        {
          $rootScope: $rootScope,
          $scope: $scope
        }
      );
    });
  });
});
