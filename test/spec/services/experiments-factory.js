'use strict';

describe('Services: experimentsFactory', function() {
  var $q,
    experimentProxyService,
    storageServer,
    experimentsFactory,
    scope,
    $interval,
    clbErrorDialog,
    FAIL_ON_SELECTED_SERVER_ERROR,
    FAIL_ON_ALL_SERVERS_ERROR,
    environmentService;

  beforeEach(module('experimentServices'));
  beforeEach(module('exdFrontendApp'));
  beforeEach(
    inject(function(
      _$q_,
      _experimentProxyService_,
      _storageServer_,
      _experimentsFactory_,
      _$rootScope_,
      _$httpBackend_,
      _$interval_,
      _clbErrorDialog_,
      _FAIL_ON_SELECTED_SERVER_ERROR_,
      _FAIL_ON_ALL_SERVERS_ERROR_,
      _environmentService_
    ) {
      $q = _$q_;
      experimentProxyService = _experimentProxyService_;
      storageServer = _storageServer_;
      experimentsFactory = _experimentsFactory_;
      scope = _$rootScope_;
      $interval = _$interval_;
      clbErrorDialog = _clbErrorDialog_;
      FAIL_ON_SELECTED_SERVER_ERROR = _FAIL_ON_SELECTED_SERVER_ERROR_;
      FAIL_ON_ALL_SERVERS_ERROR = _FAIL_ON_ALL_SERVERS_ERROR_;
      environmentService = _environmentService_;

      _$httpBackend_.whenGET(new RegExp('.*')).respond({});
      spyOn(console, 'error');
    })
  );

  it('image should come from proxy', function() {
    var experiments = [{ joinableServers: [], availableServers: [] }];
    var image = { '0': 'fakeImage' };
    spyOn(experimentProxyService, 'getExperiments').and.returnValue(
      $q.when(experiments)
    );
    spyOn(experimentProxyService, 'getImage').and.returnValue($q.when(image));
    spyOn(storageServer, 'getFileContent');
    var exp = experimentsFactory.createExperimentsService();
    exp.initialize();
    scope.$apply();
    exp.experiments.then(function(experiments) {
      expect(experiments[0].imageData).toBe(image[0]);
    });
    expect(storageServer.getFileContent).not.toHaveBeenCalled();
  });

  it('image should come from collab storage', function() {
    spyOn(storageServer, 'getExperiments').and.returnValue(
      $q.when([{ uuid: 'uuid' }])
    );
    spyOn(storageServer, 'getFileContent').and.returnValue(
      $q.when({
        uuid: 'fakeUUID',
        data:
          '<xml><name>Name</name><thumbnail>thumbnail.png</thumbnail><description>Desc</description><timeout>840.0</timeout></xml>'
      })
    );
    spyOn(storageServer, 'getBlobContent').and.returnValue(
      $q.when({ uuid: 'fakeUUID', data: 'data:image/png;base64,fakeContent' })
    );
    var readAsDataURL = jasmine.createSpy();
    var eventListener = jasmine.createSpy();
    spyOn(window, 'FileReader').and.returnValue({
      addEventListener: eventListener,
      readAsDataURL: readAsDataURL
    });
    var exp = experimentsFactory.createExperimentsService(true);
    exp.initialize();
    scope.$apply();

    exp.experiments.then(function(experiments) {
      expect(experiments[0].imageData).toBe('fakeContent');
    });
  });

  it('image should come from proxy if collab storage fails', function() {
    var image = { experimentid: 'fakeImage' };
    spyOn(experimentProxyService, 'getJoinableServers').and.returnValue(
      $q.when([])
    );
    spyOn(experimentProxyService, 'getAvailableServers').and.returnValue(
      $q.when([])
    );
    spyOn(experimentProxyService, 'getImage').and.returnValue($q.when(image));

    spyOn(storageServer, 'getExperiments').and.returnValue($q.when([]));

    environmentService.setPrivateExperiment(true);
    var exp = experimentsFactory.createExperimentsService();
    exp.initialize();
    scope.$apply();

    exp.experiments.then(function(experiments) {
      expect(experiments[0].imageData).toBe('fakeImage');
    });
    scope.$apply();
  });

  it('image should come from proxy if downloading image from collab storage failed', function() {
    var image = { experimentid: 'fakeImage' };
    spyOn(experimentProxyService, 'getJoinableServers').and.returnValue(
      $q.when([])
    );
    spyOn(experimentProxyService, 'getAvailableServers').and.returnValue(
      $q.when([])
    );
    spyOn(experimentProxyService, 'getImage').and.returnValue($q.when(image));
    spyOn(storageServer, 'getExperiments').and.returnValue($q.when([]));

    environmentService.setPrivateExperiment(true);
    var exp = experimentsFactory.createExperimentsService();
    exp.initialize();
    scope.$apply();

    exp.experiments.then(function(experiments) {
      expect(experiments[0].imageData).toBe('fakeImage');
    });
    scope.$apply();
  });

  it('experiment name and description should come from collab storage', function() {
    spyOn(experimentProxyService, 'getJoinableServers').and.returnValue(
      $q.when([])
    );
    spyOn(experimentProxyService, 'getAvailableServers').and.returnValue(
      $q.when([])
    );
    spyOn(storageServer, 'getExperiments').and.returnValue(
      $q.when([{ uuid: 'folder_id' }])
    );
    spyOn(experimentProxyService, 'getImage');
    var xml =
      '<?xml version="1.0" ?><ns1:ExD xmlns:ns1="http://schemas.humanbrainproject.eu/SP10/2014/ExDConfig"><ns1:name>newName</ns1:name><ns1:description>newDescription</ns1:description><ns1:timeout>100</ns1:timeout><thumbnail>fake.png</thumbnail></ns1:ExD>';
    spyOn(storageServer, 'getFileContent').and.returnValue(
      $q.when({ uuid: 'uuid', data: xml })
    );
    environmentService.setPrivateExperiment(true);
    var exp = experimentsFactory.createExperimentsService(true);
    exp.initialize();
    scope.$apply();

    exp.experiments.then(function(experiments) {
      expect(experiments[0].configuration.name).toBe('newName');
      expect(experiments[0].configuration.description).toBe('newDescription');
      expect(experiments[0].configuration.timeout).toBe(100);
    });
    scope.$apply();
    expect(storageServer.getFileContent).toHaveBeenCalledWith(
      'folder_id',
      'experiment_configuration.exc',
      true
    );
  });

  it('experiment xml should be stored', function() {
    spyOn(experimentProxyService, 'getJoinableServers').and.returnValue(
      $q.when([])
    );
    spyOn(experimentProxyService, 'getAvailableServers').and.returnValue(
      $q.when([])
    );
    spyOn(storageServer, 'getExperiments').and.returnValue(
      $q.when([{ uuid: 'fakeUUID' }])
    );
    spyOn(experimentProxyService, 'getImage');
    var xml =
      '<?xml version="1.0" ?><ns1:ExD xmlns:ns1="http://schemas.humanbrainproject.eu/SP10/2014/ExDConfig"><ns1:name>newName</ns1:name><ns1:description>newDescription</ns1:description><ns1:timeout>100</ns1:timeout><thumbnail>fake.png</thumbnail></ns1:ExD>';
    spyOn(storageServer, 'getFileContent').and.returnValue(
      $q.when({ uuid: 'uuid', data: xml })
    );
    environmentService.setPrivateExperiment(true);
    var exp = experimentsFactory.createExperimentsService(
      'context_id',
      'experimentid',
      'folder_id'
    );
    exp.initialize();
    scope.$apply();

    exp.experiments.then(function(experiments) {
      expect(experiments[0].configuration.experimentFile).toBeDefined();
    });
    scope.$apply();
  });
  it('refresh should update collab experiments joinable servers', function() {
    var joinableServer = [
      { server: 'testHost', runningSimulation: { owner: '1', simulationID: 5 } }
    ];
    var callCount = 0;
    spyOn(
      experimentProxyService,
      'getJoinableServers'
    ).and.callFake(function() {
      if (callCount === 0) {
        callCount++;
        return $q.when([]);
      } else if (callCount === 1) {
        callCount++;
        return $q.when(joinableServer);
      }
    });
    spyOn(experimentProxyService, 'getAvailableServers').and.returnValue(
      $q.when([])
    );
    spyOn(storageServer, 'getExperiments').and.returnValue(
      $q.when([{ uuid: 'fakeUUID' }])
    );
    var xml =
      '<?xml version="1.0" ?><ns1:ExD xmlns:ns1="http://schemas.humanbrainproject.eu/SP10/2014/ExDConfig"><ns1:name>newName</ns1:name><ns1:description>newDescription</ns1:description><ns1:timeout>100</ns1:timeout><thumbnail>fake.png</thumbnail></ns1:ExD>';
    spyOn(storageServer, 'getFileContent').and.returnValue(
      $q.when({ uuid: 'uuid', data: xml })
    );
    environmentService.setPrivateExperiment(true);
    var exp = experimentsFactory.createExperimentsService(
      'context_id',
      'experimentid',
      'folder_id'
    );
    exp.initialize();
    scope.$apply();
    $interval.flush(10 * 1000);
    exp.experiments.then(function(experiments) {
      expect(experiments[0].joinableServers).toEqual(joinableServer);
    });
    scope.$apply();
  });

  function startExperimentWithDataShouldTriggerError(
    experiments,
    expectedError
  ) {
    spyOn(experimentProxyService, 'getExperiments').and.returnValue(
      $q.when(experiments)
    );
    spyOn(experimentProxyService, 'getImage').and.returnValue(
      $q.when({ '0': 'fakeImage' })
    );
    spyOn(experimentProxyService, 'getServerConfig').and.returnValue(
      $q.reject()
    );
    var exp = experimentsFactory.createExperimentsService();
    exp.initialize();
    scope.$apply();
    spyOn(clbErrorDialog, 'open');
    //spyOn(experimentSimulationService, 'startNewExperiment').and.returnValue(window.$q.reject());
    exp.experiments
      .then(function(experiments) {
        return exp.startExperiment(experiments[0]);
      })
      .catch(function() {
        expect(clbErrorDialog.open).toHaveBeenCalledWith(expectedError);
      });
    scope.$apply();
  }

  it('should trigger a specific error when it fails to start an experiment from a list of servers', function() {
    startExperimentWithDataShouldTriggerError(
      [{ joinableServers: [], configuration: {}, availableServers: [] }],
      FAIL_ON_ALL_SERVERS_ERROR
    );
  });

  it('should trigger a specific error when it fails to start an experiment from a specific DEV servers', function() {
    startExperimentWithDataShouldTriggerError(
      [
        {
          joinableServers: [],
          configuration: {},
          availableServers: [],
          devServer: 'devServer'
        }
      ],
      FAIL_ON_SELECTED_SERVER_ERROR
    );
  });
});
