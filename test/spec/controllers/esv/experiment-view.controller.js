'use strict';

describe('Controller: ExperimentViewController', function() {
  let controller;

  let $controller, $rootScope, $scope;
  let experimentViewService, goldenLayoutService;

  beforeEach(function() {
    module('exdFrontendApp');

    // mocks
    module('experimentViewServiceMock');
    module('simulationInfoMock');
    module('userContextServiceMock');
    module('goldenLayoutServiceMock');
  });

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _experimentViewService_,
      _goldenLayoutService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;

      experimentViewService = _experimentViewService_;
      goldenLayoutService = _goldenLayoutService_;
    })
  );

  beforeEach(function() {
    $scope = $rootScope.$new();
    controller = $controller('experimentViewController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
  });

  it(' - constructor', function() {
    expect(experimentViewService.broadcastEnterSimulation).toHaveBeenCalled();
  });

  it(' - sidemenuToggled()', function() {
    controller.sidemenuToggled();
    expect(goldenLayoutService.refreshSize).toHaveBeenCalled();
  });
});
