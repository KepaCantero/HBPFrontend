'use strict';

describe('Controller: demo-waiting', function() {
  beforeEach(module('exdFrontendApp'));

  var $rootScope, bbpConfig, scope, $httpBackend, STATE, $timeout, location;

  var experiments = {
    developementExperiment: {
      configuration: {
        maturity: 'devel',
        name: 'Developement experiment name'
      },
      availableServers: [],
      joinableServers: []
    }
  };
  var windowMock = {
    location: {
      href: '',
      reload: jasmine.createSpy('reload')
    }
  };
  beforeEach(
    module(function($provide) {
      $provide.value('$window', windowMock);
    })
  );

  beforeEach(
    inject(function(
      $controller,
      _$rootScope_,
      _bbpConfig_,
      _$httpBackend_,
      _STATE_,
      _$timeout_,
      _$window_,
      _$location_
    ) {
      $rootScope = _$rootScope_;
      bbpConfig = _bbpConfig_;
      $httpBackend = _$httpBackend_;
      STATE = _STATE_;
      $timeout = _$timeout_;
      location = _$location_;
      scope = $rootScope.$new();

      var proxyUrl = bbpConfig.get('api.proxy.url');
      spyOn(location, 'path');
      $httpBackend
        .whenGET(new RegExp(proxyUrl + '/experiments'))
        .respond(200, experiments);
      $httpBackend
        .whenGET(new RegExp(proxyUrl + '/availableServers'))
        .respond(200, []);
      $httpBackend
        .whenGET(new RegExp(proxyUrl + '/experimentImage/'))
        .respond(200, {});
      $httpBackend.whenGET(new RegExp(proxyUrl + '/identity')).respond(200, {});
      $controller('DemoAutorunExperimentController', {
        $scope: scope,
        $timeout: $timeout,
        $window: windowMock,
        $location: location
      });
    })
  );

  it('should destroy experimentsService', function() {
    experiments.developementExperiment.joinableServers = [
      { server: 'server', runningSimulation: { state: STATE.PAUSED } }
    ];
    scope.process();
    $httpBackend.flush();
    $timeout.flush(10000);
    expect(scope.experimentsService).toBe(undefined);
  });

  it('should move to the next simulation ready', function() {
    experiments.developementExperiment.joinableServers = [
      { server: 'server', runningSimulation: { state: STATE.PAUSED } }
    ];
    scope.process();
    $httpBackend.flush();
    $timeout.flush(10000);

    expect(location.path.calls.mostRecent().args[0]).toContain(
      'experiment-view'
    );
    expect(windowMock.location.reload).toHaveBeenCalled();
  });
});
