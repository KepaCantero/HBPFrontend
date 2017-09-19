'use strict';

describe('Services: PrivateExperimentsService', function() {


  var privateExperimentsService,
    storageServer,
    $rootScope;

  beforeEach(module('exdFrontendApp'));

  beforeEach(inject(function(_storageServer_, $stateParams, experimentProxyService, SERVER_POLL_INTERVAL, experimentSimulationService, uptimeFilter, nrpUser, clbErrorDialog, FAIL_ON_SELECTED_SERVER_ERROR, FAIL_ON_ALL_SERVERS_ERROR, $interval, $q, _$rootScope_) {
    storageServer = _storageServer_;
    $rootScope = _$rootScope_;

    /*jshint -W117 */
    privateExperimentsService = new PrivateExperimentsService(_storageServer_, $stateParams, experimentProxyService, SERVER_POLL_INTERVAL, experimentSimulationService, uptimeFilter, nrpUser, clbErrorDialog, FAIL_ON_SELECTED_SERVER_ERROR, FAIL_ON_ALL_SERVERS_ERROR, $interval, $q);
    /*jshint +W117 */
  }));

  it('should return data on getBase64Content', function(done) {
    var response = { uuid: 'uuid', data: 'somedata' };

    spyOn(storageServer, 'getBase64Content').and.returnValue(window.$q.when(response));
    privateExperimentsService
      .getExperimentImage({ configuration: {} })
      .then(function(res) {
        expect(res).toBe(response);
        done();
      });
    $rootScope.$digest();
  });

  it('should resolve to null if not file found', function(done) {
    spyOn(storageServer, 'getFileContent').and.returnValue(window.$q.when({}));
    privateExperimentsService
      .loadExperimentDetails({})
      .then(function(res){
        expect(res).toBeNull();
        done();
      });
    $rootScope.$digest();
  });

  it('should log error if no thumbnail found', function(done) {
    spyOn(storageServer, 'getFileContent')
      .and.returnValue(window.$q.when({ uuid: 'fakeUUID', data: '<xml><name>Name</name><description>Desc</description><timeout>840.0</timeout></xml>' }));
    spyOn(console, 'error');

    privateExperimentsService
      .loadExperimentDetails({})
      .then(function(){
        expect(console.error).toHaveBeenCalled();
        done();
      });
    $rootScope.$digest();
  });

});
