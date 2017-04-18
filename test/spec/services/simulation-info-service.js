'use strict';

describe('Services: server-info-service', function () {
  var simulationInfo, httpBackend, simulationData, serverConfig, environmentService;


  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(function () {
    simulationData = {
      serverID: 'bbpce016',
      simulationID: 'mocked_simulation_id',
      ctx: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
      experimentID: 'AnimatedMouse'
    };
    serverConfig = {
      gzweb: {
        assets: 'mock_assets',
        'nrp-services': 'http://some-url',
        websocket: 'mock_websocket'
      },
      rosbridge: {
        topics: {
          spikes: '/mock_spike_topic',
          status: '/mock_status_topic'
        },
        websocket: 'wss://mock_ws_url'
      }
    };
  });

  beforeEach(inject(function (
    _simulationInfo_,
    _$httpBackend_,
    _environmentService_) {
    simulationInfo = _simulationInfo_;
    httpBackend = _$httpBackend_;
    environmentService = _environmentService_;
  }));

  it('should set simulationInfo properties using $stateParams properties', function () {
    httpBackend.whenGET('http://proxy/server/' + simulationData.serverID).respond(200, serverConfig);

    // Collab mode
    environmentService.setPrivateExperiment(true);
    var experimentResponse = { data: { 'experiment_configuration': { visualModel: 'mouse.dae'} } };
    httpBackend.whenGET(serverConfig.gzweb['nrp-services'] + '/experiment/' + simulationData.ctx).respond(200, experimentResponse);
    simulationInfo.initialize(simulationData.serverID, simulationData.experimentID, simulationData.simulationID, simulationData.ctx);
    httpBackend.flush();

    expect(simulationInfo.serverID).toEqual(simulationData.serverID);
    expect(simulationInfo.simulationID).toEqual(simulationData.simulationID);
    expect(simulationInfo.serverConfig).toBeDefined();
    expect(simulationInfo.serverBaseUrl).toBeDefined();
    expect(simulationInfo.contextID).toBe(simulationData.ctx);
    expect(environmentService.isPrivateExperiment()).toBe(true);
    expect(simulationInfo.experimentID).toBe(simulationData.experimentID);
    /*jshint camelcase: false */
    var visualUrl = experimentResponse.data.experiment_configuration.visualModel;
    expect(simulationInfo.animatedModel.assetsPath).toBe(serverConfig.gzweb.assets + '/' + visualUrl);

    // Non-Collab mode
    environmentService.setPrivateExperiment(false);
    experimentResponse = { 'AnimatedMouse': { configuration: { visualModel: 'mouse.dae'} } };
    httpBackend.whenGET('http://proxy/experiments').respond(200, experimentResponse);
    simulationInfo.initialize(simulationData.serverID, simulationData.experimentID, simulationData.simulationID, undefined);
    httpBackend.flush();

    expect(simulationInfo.serverID).toEqual(simulationData.serverID);
    expect(simulationInfo.simulationID).toEqual(simulationData.simulationID);
    expect(simulationInfo.serverConfig).toBeDefined();
    expect(simulationInfo.serverBaseUrl).toBeDefined();
    expect(simulationInfo.contextID).not.toBeDefined();
    expect(environmentService.isPrivateExperiment()).toBe(false);
    expect(simulationInfo.experimentID).toBe(simulationData.experimentID);
    visualUrl = experimentResponse[simulationData.experimentID].configuration.visualModel;
    expect(simulationInfo.animatedModel.assetsPath).toBe(serverConfig.gzweb.assets + '/' + visualUrl);


  });

  it('should throw an error when simulationInfo.initialize() is called with no prior knowledge of serverID or simulationID', function () {
    expect(simulationInfo.initialize).toThrow();
    expect(_.partial(simulationInfo.initialize, 'fake_id')).toThrow();
  });
});
