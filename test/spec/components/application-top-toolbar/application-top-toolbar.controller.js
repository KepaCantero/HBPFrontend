'use strict';

describe('Controller: ApplicationTopToolbarController', function() {
  let applicationTopToolbarController;

  let $controller, $rootScope, $scope, $window;
  let applicationTopToolbarService,
    bbpConfig,
    environmentRenderingService,
    experimentViewService,
    nrpAnalytics,
    simToolsSidebarService,
    simulationInfo,
    storageServerTokenManager,
    userContextService;

  beforeEach(module('exdFrontendApp'));

  // used outside simulation
  beforeEach(module('applicationTopToolbarServiceMock'));
  beforeEach(module('nrpAnalyticsMock'));
  beforeEach(module('storageServerMock'));
  beforeEach(module('userContextServiceMock'));
  // used inside simulation
  beforeEach(module('environmentRenderingServiceMock'));
  beforeEach(module('experimentViewServiceMock'));
  beforeEach(module('simToolsSidebarServiceMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('stateServiceMock'));

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _$window_,
      _applicationTopToolbarService_,
      _bbpConfig_,
      _environmentRenderingService_,
      _experimentViewService_,
      _nrpAnalytics_,
      _simToolsSidebarService_,
      _simulationInfo_,
      _storageServerTokenManager_,
      _userContextService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $window = _$window_;
      applicationTopToolbarService = _applicationTopToolbarService_;
      bbpConfig = _bbpConfig_;
      environmentRenderingService = _environmentRenderingService_;
      experimentViewService = _experimentViewService_;
      nrpAnalytics = _nrpAnalytics_;
      simToolsSidebarService = _simToolsSidebarService_;
      simulationInfo = _simulationInfo_;
      storageServerTokenManager = _storageServerTokenManager_;
      userContextService = _userContextService_;
    })
  );

  beforeEach(function() {
    applicationTopToolbarService.isInSimulationView.and.returnValue(true);

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
    expect(experimentViewService.exitDemo).toHaveBeenCalled();
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

    it(' - constructor()', function() {
      expect(
        applicationTopToolbarController.environmentRenderingService
      ).toBeDefined();
      expect(
        applicationTopToolbarController.simToolsSidebarService
      ).toBeDefined();
      expect(applicationTopToolbarController.simulationInfo).toBeDefined();
      expect(applicationTopToolbarController.stateService).toBeDefined();
    });

    it(' - onButtonEnvironmentSettings()', function() {
      environmentRenderingService.loadingEnvironmentSettingsPanel = false;
      applicationTopToolbarController.onButtonEnvironmentSettings();
      expect(nrpAnalytics.eventTrack).toHaveBeenCalled();
    });

    it(' - toggleSimulationToolsSidebar()', function() {
      applicationTopToolbarController.toggleSimulationToolsSidebar();
      expect(simToolsSidebarService.toggleSidebar).toHaveBeenCalled();
    });
  });
});
