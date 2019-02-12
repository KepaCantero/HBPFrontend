'use strict';

describe('Services: PrivateExperimentsService', function() {
  var privateExperimentsService,
    storageServer,
    $rootScope,
    experimentProxyService,
    experimentSimulationService,
    clbErrorDialog;

  beforeEach(module('exdFrontendApp'));

  beforeEach(
    inject(function(
      _storageServer_,
      $stateParams,
      _experimentProxyService_,
      SERVER_POLL_INTERVAL,
      _experimentSimulationService_,
      uptimeFilter,
      nrpUser,
      _clbErrorDialog_,
      FAIL_ON_SELECTED_SERVER_ERROR,
      FAIL_ON_ALL_SERVERS_ERROR,
      $interval,
      $q,
      _$rootScope_
    ) {
      storageServer = _storageServer_;
      experimentProxyService = _experimentProxyService_;
      experimentSimulationService = _experimentSimulationService_;
      clbErrorDialog = _clbErrorDialog_;
      $rootScope = _$rootScope_;

      /*global PrivateExperimentsService*/
      privateExperimentsService = new PrivateExperimentsService(
        $stateParams,
        experimentProxyService,
        SERVER_POLL_INTERVAL,
        experimentSimulationService,
        storageServer,
        uptimeFilter,
        nrpUser,
        clbErrorDialog,
        FAIL_ON_SELECTED_SERVER_ERROR,
        FAIL_ON_ALL_SERVERS_ERROR,
        $interval,
        $q
      );
    })
  );

  it('should return data on getBase64Content', function(done) {
    spyOn(storageServer, 'getBase64Content').and.returnValue(
      window.$q.when('somedata')
    );
    privateExperimentsService
      .getExperimentImage({ configuration: {} })
      .then(function(res) {
        expect(res).toBe('data:image/png;base64,somedata');
        done();
      });
    $rootScope.$digest();
  });

  it('should return pizdaint jobs', function(done) {
    spyOn(experimentProxyService, 'getPizDaintJobs').and.returnValue(
      window.$q.when('somedata')
    );
    privateExperimentsService.getPizDaintJobs().then(function(res) {
      expect(res).toBe('somedata');
      done();
    });
    $rootScope.$digest();
  });

  it('should return pizdaint job status', function(done) {
    spyOn(experimentProxyService, 'getJobStatus').and.returnValue(
      window.$q.when({ status: 'RUNNING' })
    );
    privateExperimentsService
      .getPizDaintJobStatus('jobUrl')
      .then(function(res) {
        expect(res).toBe('RUNNING');
        expect(experimentProxyService.getJobStatus).toHaveBeenCalled();
        done();
      });
    $rootScope.$digest();
  });

  it('should return pizdaint job outcome', function(done) {
    spyOn(experimentProxyService, 'getJobOutcome').and.returnValue(
      window.$q.when('outcome')
    );
    privateExperimentsService
      .getPizDaintJobOutcome('jobUrl')
      .then(function(res) {
        expect(res).toBe('outcome');
        expect(experimentProxyService.getJobOutcome).toHaveBeenCalled();
        done();
      });
    $rootScope.$digest();
  });

  it('should show error when error starting piz daint exp', function() {
    spyOn(clbErrorDialog, 'open');
    spyOn(
      experimentSimulationService,
      'startPizDaintExperiment'
    ).and.returnValue(window.$q.reject(false));
    privateExperimentsService.startPizDaintExperiment();
    $rootScope.$digest();
    expect(clbErrorDialog.open).toHaveBeenCalled();
  });

  it('should delete an experiment successfully', function(done) {
    spyOn(storageServer, 'deleteExperiment').and.returnValue(
      window.$q.when({})
    );
    privateExperimentsService.deleteExperiment({}).then(function(res) {
      expect(res).toEqual({});
      done();
    });
    $rootScope.$digest();
  });

  it('should log error if no thumbnail found', function() {
    spyOn(console, 'error');

    privateExperimentsService.checkConfiguration({ configuration: {} });
    expect(console.error).toHaveBeenCalled();
  });

  it('should fill in experiment configuration details', function() {
    let exp = {
      configuration: {
        thumbnail: 'thumb.jpg',
        description: 'Some description',
        name: 'Experiment test',
        timeout: 840
      }
    };

    exp = privateExperimentsService.checkConfiguration(exp);
    expect(exp.configuration.timeout).toBe(840);
    expect(exp.configuration.name).toBe('Experiment test');
  });
});
