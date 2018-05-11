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

  it('should resolve to null if not file found', function(done) {
    spyOn(storageServer, 'getFileContent').and.returnValue(window.$q.when({}));
    privateExperimentsService.loadExperimentDetails({}).then(function(res) {
      expect(res).toBeNull();
      done();
    });
    $rootScope.$digest();
  });

  it('should log error if no thumbnail found', function(done) {
    spyOn(storageServer, 'getFileContent').and.returnValue(
      window.$q.when({
        uuid: 'fakeUUID',
        data:
          '<xml><name>Name</name><description>Desc</description><timeout>840.0</timeout><bibiConf/></xml>'
      })
    );
    spyOn(console, 'error');

    privateExperimentsService.loadExperimentDetails({}).then(function() {
      expect(console.error).toHaveBeenCalled();
      done();
    });
    $rootScope.$digest();
  });

  it('should fill in experiment configuration details', function(done) {
    spyOn(storageServer, 'getFileContent').and.returnValue(
      window.$q.when({
        uuid: 'fakeUUID',
        data:
          '<?xml version="1.0" encoding="utf-8"?>\
              <ExD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\
                xmlns="http://schemas.humanbrainproject.eu/SP10/2014/ExDConfig"\
                xsi:schemaLocation="http://schemas.humanbrainproject.eu/SP10/2014/ExDConfig ../ExDConfFile.xsd">\
                <name>Husky Braitenberg experiment with distributed brain (Nest only)</name>\
                <thumbnail>ExDDistributedBrainHuskyHolodeck.png</thumbnail>\
                <description>This experiment is amazing</description>\
                <tags>husky robotics distributed braitenberg nest holodeck</tags>\
                <timeout>840</timeout>\
                <configuration type="3d-settings" src="ExDXMLExample.ini"/>\
                <configuration type="brainvisualizer" src="brainvisualizer.json"/>\
                <configuration type="user-interaction-settings" src="ExDXMLExample.uis"/>\
                <maturity>development</maturity>\
                <environmentModel src="virtual_room/virtual_room.sdf">\
                    <robotPose x="0.0" y="0.0" z="0.5" roll="0.0" pitch="-0.0" yaw="3.14159265359"/>\
                </environmentModel>\
                <bibiConf src="milestone2_python_tf.bibi" processes="2"/>\
                <cameraPose>\
                    <cameraPosition x="4.5" y="0" z="1.8"/>\
                    <cameraLookAt x="0" y="0" z="0.6"/>\
                </cameraPose>\
              </ExD>'
      })
    );

    privateExperimentsService.loadExperimentDetails({}).then(function(details) {
      expect(details.timeout).toBe(840);
      done();
    });
    $rootScope.$digest();
  });
});
