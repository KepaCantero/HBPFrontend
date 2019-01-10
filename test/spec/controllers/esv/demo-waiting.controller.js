'use strict';

describe('Controller: demo-waiting', function() {
  beforeEach(module('exdFrontendApp'));

  var $rootScope, scope, $timeout, location;

  var experiments = [
    {
      configuration: {
        maturity: 'devel',
        name: 'Developement experiment name',
        thumbnail: 'thumbnail'
      },
      availableServers: [],
      joinableServers: [{ runningSimulation: { state: 'started' } }]
    }
  ];

  var windowMock = {
    location: {
      href: '',
      reload: jasmine.createSpy('reload')
    }
  };

  var experimentsFactoryMock = {
    createExperimentsService: jasmine
      .createSpy('createExperimentService')
      .and.returnValue({
        initialize: jasmine.createSpy('initialize'),
        experiments: { then: (arg1, arg2, callback) => callback(experiments) },
        destroy: jasmine.createSpy('destroy')
      })
  };
  beforeEach(
    module(function($provide) {
      $provide.value('$window', windowMock);
      $provide.value('experimentsFactory', experimentsFactoryMock);
    })
  );

  beforeEach(
    inject(function(
      $controller,
      _$rootScope_,
      _$timeout_,
      _$window_,
      _$location_
    ) {
      $rootScope = _$rootScope_;
      $timeout = _$timeout_;
      location = _$location_;
      scope = $rootScope.$new();

      spyOn(location, 'path');
      $controller('DemoAutorunExperimentController', {
        $scope: scope,
        $timeout: $timeout,
        $window: windowMock,
        $location: location
      });
    })
  );

  it('should check that the process function succeeds', () => {
    scope.process();
    $timeout.flush(1100);
    expect(windowMock.location.reload).toHaveBeenCalled();
    expect(scope.experiments).toBe(experiments);
    expect(
      scope.experimentsFactory.createExperimentsService().destroy
    ).toHaveBeenCalled();
    expect(
      scope.experimentsFactory.createExperimentsService().initialize
    ).toHaveBeenCalled();
  });
});
