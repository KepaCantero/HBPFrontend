(function() {
  'use strict';

  var ctx = 'context_id';
  var experimentID = 'experimentID';
  var experimentFolderUUID = 'experimentFolderUUID';
  var hostName = 'myBackend';

  var matureExperiment = {
    configuration: {
      maturity: 'production',
      name: 'Mature experiment name',
      tags: ['tag1']
    },
    availableServers: [{ id: hostName }],
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
    groups: [{ name: 'hbp-sp10-user-edit-rights' }],
    experiments: {
      matureExperiment: matureExperiment,
      developementExperiment: {
        configuration: {
          maturity: 'devel',
          name: 'Developement experiment name',
          tags: ['tag1', 'tag2']
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

  describe('Controller: esvExperimentsCtrl', function() {
    var $http,
      $controller,
      $httpBackend,
      $rootScope,
      $timeout,
      $templateCache,
      $compile,
      $stateParams,
      $interval,
      environmentService,
      $location,
      bbpConfig,
      proxyUrl,
      roslib,
      experimentsFactory,
      SERVER_POLL_INTERVAL,
      $window,
      storageServer,
      $q,
      clbErrorDialog,
      collabConfigService;

    var serverErrorMock = {
      displayHTTPError: jasmine
        .createSpy('displayHTTPError')
        .and.callFake(function() {
          return $q.reject();
        })
    };

    beforeEach(module('exdFrontendApp'));
    beforeEach(module('userContextServiceMock'));
    beforeEach(module('exd.templates'));

    beforeEach(
      module(function($provide) {
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
        _$http_,
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
        _storageServer_,
        _$q_,
        _clbErrorDialog_,
        _collabConfigService_
      ) {
        $http = _$http_;
        $controller = _$controller_;
        $httpBackend = _$httpBackend_;
        $templateCache = _$templateCache_;
        $rootScope = _$rootScope_;
        $timeout = _$timeout_;
        $compile = _$compile_;
        $stateParams = _$stateParams_;
        $interval = _$interval_;
        $location = _$location_;
        bbpConfig = _bbpConfig_;
        roslib = _roslib_;
        experimentsFactory = _experimentsFactory_;
        SERVER_POLL_INTERVAL = _SERVER_POLL_INTERVAL_;
        proxyUrl = bbpConfig.get('api.proxy.url');
        $window = _$window_;
        storageServer = _storageServer_;
        $q = _$q_;
        clbErrorDialog = _clbErrorDialog_;
        environmentService = _environmentService_;
        collabConfigService = _collabConfigService_;
      })
    );

    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
    });

    function renderEsvWebPage(options) {
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
      $httpBackend
        .whenGET(proxyUrl + '/identity/me')
        .respond(200, pageOptions.me);
      $httpBackend
        .whenGET(proxyUrl + '/identity/me/groups')
        .respond(200, pageOptions.groups);
      $httpBackend.whenGET(/api\/collab\/configuration/).respond(200);

      $controller('esvExperimentsCtrl', {
        $rootScope: $rootScope,
        $scope: $rootScope,
        environmentService: environmentService,
        storageServer: storageServer,
        clbErrorDialog: clbErrorDialog
      });

      var template = $templateCache.get('views/esv/esv-experiments.html');
      var page = $compile(template)($rootScope);

      $rootScope.$digest();
      $timeout.flush();
      $httpBackend.flush();
      $timeout.flush();

      if ($http.pendingRequests.length) {
        $httpBackend.flush();
        $rootScope.$digest();
      }

      return page;
    }

    function getExperimentListScope(page) {
      return angular
        .element(page.find('[load-private-experiments]'))
        .isolateScope();
    }

    it('should show only mature experiments in normal mode', function() {
      var page = renderEsvWebPage();
      var experiments = page.find('.experiment-box');
      expect(experiments.length).toBe(1);
      var expTitle = $(experiments)
        .find('.title-line:first > .h4')
        .text();
      expect(expTitle.trim()).toBe(
        defaultPageOptions.experiments.matureExperiment.configuration.name
      );
    });

    it('should filter experiments by name', function() {
      var page = renderEsvWebPage({ dev: true });

      var experiments = page.find('.experiment-box');
      expect(experiments.length).toBe(2);

      $rootScope.query = 'test';
      $rootScope.$digest();
      experiments = page.find('.experiment-box');
      expect(experiments.length).toBe(0);

      $rootScope.query = 'develop';
      $rootScope.$digest();
      experiments = page.find('.experiment-box');
      expect(experiments.length).toBe(1);

      $rootScope.query = 'absent';
      $rootScope.$digest();
      experiments = page.find('.experiment-box');
      expect(experiments.length).toBe(0);
    });

    it('should filter experiments by tag', function() {
      var page = renderEsvWebPage({ dev: true });

      var experiments = page.find('.experiment-box');
      expect(experiments.length).toBe(2);

      $rootScope.query = 'tag';
      $rootScope.$digest();
      experiments = page.find('.experiment-box');
      expect(experiments.length).toBe(2);

      $rootScope.query = 'tag1';
      $rootScope.$digest();
      experiments = page.find('.experiment-box');
      expect(experiments.length).toBe(2);

      $rootScope.query = 'tag2';
      $rootScope.$digest();
      experiments = page.find('.experiment-box');
      expect(experiments.length).toBe(1);

      $rootScope.query = 'tag3';
      $rootScope.$digest();
      experiments = page.find('.experiment-box');
      expect(experiments.length).toBe(0);
    });

    it('should show all experiments in dev mode', function() {
      var page = renderEsvWebPage({ dev: true });
      var experiments = page.find('.experiment-box');
      expect(experiments.length).toBe(2);
    });

    it('should not allow to chose backend when in dev mode', function() {
      var page = renderEsvWebPage();
      //select first experiment
      page
        .find('.experiment-box')
        .first()
        .click();

      var selectServer = page.find('select[ng-model="exp.devServer"]');
      expect(selectServer.length).toBe(0);
    });

    it('should allow to chose backend when in dev mode', function() {
      var page = renderEsvWebPage({ dev: true });
      //select first experiment
      page
        .find('.experiment-box')
        .first()
        .click();

      var selectServer = page.find('select[ng-model="exp.devServer"]');
      expect(selectServer.length).toBe(1);
    });

    it('should show version numbers in dev mode', function() {
      var page = renderEsvWebPage({ dev: true });
      //select first experiment
      page
        .find('.experiment-box')
        .first()
        .click();

      var versionLink = page.find('a[name="versionLink"]');
      expect(versionLink.length).toBe(1);
    });

    it('should not show version numbers in dev mode', function() {
      var page = renderEsvWebPage();
      //select first experiment
      page
        .find('.experiment-box')
        .first()
        .click();

      var versionLink = page.find('a[name="versionLink"]');
      expect(versionLink.length).toBe(0);
    });

    it('should show experiments sorted by name', function() {
      var page = renderEsvWebPage({ dev: true });
      var experimentTitles = page
        .find('.experiment-box .title-line > .h4')
        .toArray()
        .map(function(elem) {
          return elem.textContent.trim();
        });

      var sortedExperimentNames = _.map(
        defaultPageOptions.experiments,
        function(val) {
          return val.configuration.name;
        }
      ).sort();
      expect(experimentTitles).toEqual(sortedExperimentNames);
    });

    function checkButtonVisibility(page, analyticsEvent, expected) {
      var buttonsElements = page.find(
        '[analytics-event="' + analyticsEvent + '"]'
      );
      expect(buttonsElements.length).toBe(expected);
    }
    function checkButtonsVisibility(page, options) {
      checkButtonVisibility(page, 'Launch', options.launch);
      checkButtonVisibility(page, 'Clone', options.clone);
    }

    function checkNewExperimentButtonsVisibility(page, options) {
      checkButtonVisibility(page, 'uploadEnvironment', options.environment);
      checkButtonVisibility(page, 'uploadRobot', options.robot);
      checkButtonVisibility(page, 'uploadBrain', options.brain);
      checkButtonVisibility(page, 'CloneNewExperiment', options.cloneNew);
    }

    it('should allow launching when available servers', function() {
      var page = renderEsvWebPage({ dev: true });
      page
        .find('.experiment-box')
        .last()
        .click();
      checkButtonVisibility(page, 'Launch', 1);
    });

    it('should NOT allow launching when NO available server', function() {
      var page = renderEsvWebPage({ dev: true });
      page
        .find('.experiment-box')
        .first()
        .click();
      checkButtonVisibility(page, 'Launch', 0);
    });

    it('should trigger the right requests when launching an experiment', function() {
      var page = renderEsvWebPage();
      page
        .find('.experiment-box')
        .first()
        .click();

      spyOn(Math, 'random').and.returnValue(0);
      spyOn(Date, 'now').and.returnValue(0);

      //get server config
      $httpBackend
        .whenGET(proxyUrl + '/server/' + hostName)
        .respond(200, defaultPageOptions.server);
      //start experiment
      var startUrl =
        defaultPageOptions.server.gzweb['nrp-services'] + '/simulation';
      $httpBackend
        .whenPOST(startUrl)
        .respond(200, defaultPageOptions.startExperiment);
      $httpBackend
        .whenGET(startUrl)
        .respond(200, [
          { simulationID: 1, state: 'paused', creationUniqueID: '0' }
        ]);

      //mock roslib
      spyOn(roslib, 'createStringTopic').and.returnValue({
        subscribe: angular.noop
      });

      spyOn($location, 'path');

      page.find('[analytics-event="Launch"]').click();
      $httpBackend.flush();
      $timeout.flush();
      $httpBackend.flush();
      $rootScope.$digest();

      //simulation url
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

    it('should reset startingExperiment when failing to launch an experiment', function() {
      var page = renderEsvWebPage();
      page
        .find('.experiment-box')
        .first()
        .click();

      //get server config
      $httpBackend
        .whenGET(proxyUrl + '/server/' + hostName)
        .respond(200, defaultPageOptions.server);

      //mock roslib
      spyOn(roslib, 'createStringTopic').and.returnValue({
        subscribe: angular.noop
      });
      spyOn($location, 'path');
    });

    it('should trigger the right requests when stopping a simulation', function() {
      var page = renderEsvWebPage();
      page
        .find('.experiment-box')
        .first()
        .click();
      var simulationUrl =
        defaultPageOptions.server.gzweb['nrp-services'] +
        '/simulation/' +
        defaultPageOptions.startExperiment.simulationID +
        '/state';
      //get server config
      $httpBackend
        .whenGET(proxyUrl + '/server/' + hostName)
        .respond(200, defaultPageOptions.server);
      //get simulation state
      $httpBackend.whenGET(simulationUrl).respond(200, { state: 'halted' });
      //get simulation state
      $httpBackend.whenPUT(simulationUrl).respond(200);

      page.find('[analytics-event="Stop"]').click();
      $httpBackend.flush();
    });

    it('should change path when joining a simulation', function() {
      var page = renderEsvWebPage();
      page
        .find('.experiment-box')
        .first()
        .click();

      spyOn($location, 'path');
      page.find('a[analytics-event="Join"]').click();
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

    it('should requery experiments after SERVER_POLL_INTERVAL', function() {
      renderEsvWebPage();
      $httpBackend
        .expectGET(proxyUrl + '/experiments')
        .respond(200, defaultPageOptions.experiments);
      $interval.flush(SERVER_POLL_INTERVAL);
      $httpBackend.flush();
    });

    it('should destroy the experimentsService on scope destroy', function() {
      var experimentsService;
      var createExperimentsService =
        experimentsFactory.createExperimentsService;
      spyOn(
        experimentsFactory,
        'createExperimentsService'
      ).and.callFake(function() {
        experimentsService = createExperimentsService.apply(
          experimentsFactory,
          arguments
        );
        return experimentsService;
      });
      renderEsvWebPage();
      spyOn(experimentsService, 'destroy').and.callThrough();

      $rootScope.$broadcast('$destroy');
      $rootScope.$digest();
      expect(experimentsService.destroy).toHaveBeenCalled();
    });

    describe('esvExperimentsCtrl without a context id', function() {
      it('should show the right buttons', function() {
        var page = renderEsvWebPage();
        page
          .find('.experiment-box')
          .first()
          .click();

        checkButtonsVisibility(page, { launch: 1, clone: 0 });
      });

      it('should show the right buttons when editing right', function() {
        var page = renderEsvWebPage();
        page
          .find('.experiment-box')
          .first()
          .click();
        var angularElement = angular.element;
        var uploadElement;
        spyOn(angular, 'element').and.callFake(function(e) {
          uploadElement = angularElement(e);
          return uploadElement;
        });
      });
    });

    describe('Private experiments', function() {
      var collabContextlessUrl, collabContextUrl;

      beforeEach(function() {
        collabContextUrl = 'http://proxy/storage/experiments';
        $stateParams.ctx = ctx;
      });

      it('should set experiments to error when collab fails', function() {
        $httpBackend.whenGET(collabContextUrl).respond(502, []);
        spyOn(clbErrorDialog, 'open');
        renderEsvWebPage({ collab: true });

        expect(clbErrorDialog.open).toHaveBeenCalledWith({
          type: 'Private experiment error',
          message: 'Failed to retrieve private experiments'
        });
      });

      describe('yet to clone', function() {
        beforeEach(function() {
          $httpBackend.whenGET(collabContextUrl).respond(200, []);
        });

        it('should only show the clone button', function() {
          var page = renderEsvWebPage({ collab: true });
          page
            .find('.experiment-box')
            .last()
            .click();
          checkButtonsVisibility(page, { launch: 0, clone: 1 });
        });

        it('should only show the correct new experiment buttons', function() {
          var page = renderEsvWebPage({ collab: true, dev: true });
          page
            .find('.experiment-box')
            .first()
            .click();
          checkNewExperimentButtonsVisibility(page, {
            environment: 1,
            robot: 1,
            brain: 1,
            cloneNew: 1
          });
        });

        it('should trigger PUT request on clone click', function() {
          var page = renderEsvWebPage();
          page
            .find('.experiment-box')
            .last()
            .click();
          spyOn($window.location, 'reload');
          $httpBackend.whenPUT(collabContextlessUrl).respond(200, {});
          page.find('[analytics-event="Clone"]').click();
        });

        it('should reload experiments after clone', function() {
          var page = renderEsvWebPage();
          spyOn($rootScope, 'reloadExperiments');
          spyOn(collabConfigService, 'clone');
          var scope = getExperimentListScope(page);
          scope.cloneExperiment(matureExperiment);
          collabConfigService.clone.calls.mostRecent().args[2]();
          expect($rootScope.reloadExperiments).toHaveBeenCalled();
        });
      });

      describe('with cloned experiment', function() {
        beforeEach(function() {
          $httpBackend
            .whenGET(new RegExp(proxyUrl + '/joinableServers/'))
            .respond(200, []);
          $httpBackend
            .whenGET(new RegExp(proxyUrl + '/availableServers/'))
            .respond(200, matureExperiment.availableServers);
          spyOn(storageServer, 'getExperiments').and.returnValue(
            $q.when([{ uuid: 'fakeUUID' }])
          );
          spyOn(storageServer, 'getFileContent').and.returnValue(
            $q.when({
              uuid: 'fakeUUID',
              data:
                '<xml><name>Name</name><thumbnail>thumbnail.png</thumbnail><description>Desc</description><timeout>840.0</timeout></xml>'
            })
          );
          $httpBackend
            .whenGET('http://proxy/storage/fakeUUID/thumbnail.png?byname=true')
            .respond(200);
        });

        it('should select first experiment if only one experiment is shown', function() {
          var page = renderEsvWebPage({
            experiments: { matureExperiment: matureExperiment }
          });
          var scope = getExperimentListScope(page);
          expect(scope.pageState.selected).toBeDefined(scope.experiments[0].id);
        });

        it('should not select an experiment if multiple experiments are shown', function() {
          $httpBackend.whenGET(collabContextUrl).respond(200, {});
          var page = renderEsvWebPage();
          var scope = getExperimentListScope(page);
          expect(scope.pageState.selected).toBeUndefined();
        });

        it('should only show the launch button when the experiment exists in collab', function() {
          var page = renderEsvWebPage({ collab: true });
          page
            .find('.experiment-box')
            .first()
            .click();
          checkButtonsVisibility(page, { launch: 1, clone: 0 });
        });
      });
    });
  });
})();
