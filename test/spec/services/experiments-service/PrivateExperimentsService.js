'use strict';

describe('Services: PrivateExperimentsService', function() {
  var privateExperimentsService, storageServer, $rootScope;

  beforeEach(module('exdFrontendApp'));

  beforeEach(
    inject(function(
      _storageServer_,
      $stateParams,
      experimentProxyService,
      SERVER_POLL_INTERVAL,
      experimentSimulationService,
      uptimeFilter,
      nrpUser,
      clbErrorDialog,
      FAIL_ON_SELECTED_SERVER_ERROR,
      FAIL_ON_ALL_SERVERS_ERROR,
      $interval,
      $q,
      _$rootScope_
    ) {
      storageServer = _storageServer_;
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
