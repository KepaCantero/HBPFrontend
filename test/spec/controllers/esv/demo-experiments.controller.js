(function() {
  'use strict';

  var ctx = 'context_id';
  var experimentID = 'experimentID';
  var experimentFolderUUID = 'experimentFolderUUID';
  var hostName = 'myBackend';

  var matureExperiment = {
    configuration: {
      maturity: 'production',
      name: 'Mature experiment name'
    },
    availableServers: [hostName],
    joinableServers: [
      {
        server: hostName,
        runningSimulation: {
          owner: 'vonarnim',
          simulationID: 1
        }
      }
    ]
  };

  var defaultPageOptions = {
    dev: false,
    collab: false,
    slurm: {
      nodes: [20, 14, 0, 34]
    },
    me: {
      id: 'vonarnim',
      username: 'cmartins',
      displayName: 'Claudio Sousa'
    },
    groups: { result: ['hbp-sp10-user-edit-rights'] },
    experiments: {
      matureExperiment: matureExperiment,
      developementExperiment: {
        configuration: {
          maturity: 'devel',
          name: 'Developement experiment name'
        },
        availableServers: [],
        joinableServers: []
      }
    },
    collabExperimentResponse: {
      contextID: ctx,
      experimentID: experimentID,
      experimentFolderUUID: experimentFolderUUID
    },
    server: {
      gzweb: {
        assets: 'http://localhost:8040',
        'nrp-services': 'http://localhost:8080'
      },
      rosbridge: { topics: {} }
    },
    startExperiment: {
      simulationID: 1,
      state: 'paused'
    },
    userQuery: {
      _embedded: {
        users: [
          {
            id: 'vonarnim'
          }
        ]
      }
    }
  };

  describe('Controller: demoExperimentsController', function() {
    var $controller,
      $httpBackend,
      $rootScope,
      $timeout,
      $templateCache,
      $compile,
      environmentService,
      $location,
      bbpConfig,
      proxyUrl,
      oidcUrl,
      $q;

    var serverErrorMock = {
      displayHTTPError: jasmine
        .createSpy('displayHTTPError')
        .and.callFake(function() {
          return $q.reject();
        })
    };
    var nrpBackendVersionsObject = {
      get: jasmine.createSpy('get')
    };
    beforeEach(module('exdFrontendApp'));
    beforeEach(module('exd.templates'));

    beforeEach(
      module(function($provide) {
        $provide.value(
          'nrpBackendVersions',
          jasmine
            .createSpy('nrpBackendVersions')
            .and.returnValue(nrpBackendVersionsObject)
        );
        $provide.value('nrpFrontendVersion', { get: jasmine.createSpy('get') });
        $provide.value('serverError', serverErrorMock);

        $provide.value('simulationConfigService', {
          initConfigFiles: jasmine
            .createSpy('initConfigFiles')
            .and.returnValue({
              then: function(f) {
                f();
                return { catch: jasmine.createSpy('catch') };
              }
            })
        });
      })
    );

    beforeEach(
      inject(function(
        _$controller_,
        _$rootScope_,
        _$timeout_,
        _$httpBackend_,
        _$templateCache_,
        _$compile_,
        _$stateParams_,
        _$interval_,
        _environmentService_,
        _$location_,
        _bbpConfig_,
        _roslib_,
        _experimentsFactory_,
        _SERVER_POLL_INTERVAL_,
        _$window_,
        _$q_
      ) {
        $controller = _$controller_;
        $httpBackend = _$httpBackend_;
        $templateCache = _$templateCache_;
        $rootScope = _$rootScope_;
        $timeout = _$timeout_;
        $compile = _$compile_;
        $location = _$location_;
        bbpConfig = _bbpConfig_;
        proxyUrl = bbpConfig.get('api.proxy.url');
        oidcUrl = bbpConfig.get('api.user.v0');

        $q = _$q_;
        environmentService = _environmentService_;
      })
    );

    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    function renderDemoWebPage(options) {
      var slurmUrl = bbpConfig.get('api.slurmmonitor.url');

      var pageOptions = _.defaults({}, options, defaultPageOptions);
      //var experimentIds = _.map(pageOptions.experiments, function (val, key) { return key; });

      if (pageOptions.dev) {
        spyOn($location, 'search').and.returnValue({ dev: true });
      }

      $httpBackend
        .whenGET(proxyUrl + '/identity/' + defaultPageOptions.me.id)
        .respond(200, pageOptions.userQuery);

      environmentService.setPrivateExperiment(pageOptions.collab);

      $httpBackend
        .whenGET(new RegExp(proxyUrl + '/experiments'))
        .respond(200, pageOptions.experiments);
      $httpBackend
        .whenGET(new RegExp(proxyUrl + '/experimentImage/'))
        .respond(200, {});
      $httpBackend
        .whenGET(slurmUrl + '/api/v1/partitions/interactive')
        .respond(200, pageOptions.slurm);
      $httpBackend.whenGET(oidcUrl + '/user/me').respond(200, pageOptions.me);
      $httpBackend
        .whenGET(oidcUrl + '/user/me/groups')
        .respond(200, pageOptions.groups);

      $controller('demoExperimentsController', {
        $rootScope: $rootScope,
        $scope: $rootScope
      });

      var template = $templateCache.get('views/esv/demo-experiments.html');
      var page = $compile(template)($rootScope);

      $rootScope.$apply();

      return page;
    }

    it('should be able to join a running experiment', function() {
      spyOn($location, 'path');

      renderDemoWebPage();
      $rootScope.vm.launchExperiment();

      $httpBackend.flush();
      $timeout.flush(2000);

      var experimentID = Object.keys(defaultPageOptions.experiments)[0];
      var simulationID = defaultPageOptions.startExperiment.simulationID;
      var expectedLocation = [
        'esv-web/experiment-view/' +
          hostName +
          '/' +
          experimentID +
          '/false/' +
          simulationID
      ];
      expect($location.path.calls.mostRecent().args).toEqual(expectedLocation);
    });

    it('should wait when no experiment is running', function() {
      spyOn($location, 'path');

      matureExperiment.joinableServers = [];

      renderDemoWebPage();
      $rootScope.vm.launchExperiment();

      $httpBackend.flush();
      $timeout.flush(2000);

      expect($location.path.calls.mostRecent().args[0]).toEqual('/');
    });

    it('should not join experiment if user did cancel', function() {
      spyOn($location, 'path');

      matureExperiment.joinableServers = [];

      renderDemoWebPage();
      $rootScope.vm.launchExperiment();
      $rootScope.vm.joiningExperiment = false;

      $httpBackend.flush();
      $timeout.flush(2000);

      expect($location.path.calls.mostRecent().args[0]).toEqual('/');
    });

    it('should be to cancel a wait for joining an experiment', function() {
      matureExperiment.joinableServers = [];

      renderDemoWebPage();
      $rootScope.vm.launchExperiment();
      $rootScope.vm.cancelLaunch();

      $httpBackend.flush();
      $timeout.flush(2000);

      expect($rootScope.vm.joiningExperiment).toEqual(false);
    });

    it('should destroy the experiment service on exit', function() {
      renderDemoWebPage();

      $rootScope.vm.launchExperiment();

      $httpBackend.flush();
      $timeout.flush(2000);

      spyOn($rootScope.vm.experimentsService, 'destroy');
      $rootScope.$destroy();

      expect($rootScope.vm.experimentsService.destroy).toHaveBeenCalled();
    });
  });
})();
