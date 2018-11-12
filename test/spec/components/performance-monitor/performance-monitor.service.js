'use strict';

describe('Services: performance-monitor service', function() {
  var performanceMonitorService;

  beforeEach(function() {
    module('performanceMonitorModule');

    module('stateServiceMock');
  });

  beforeEach(
    inject(function(_performanceMonitorService_) {
      performanceMonitorService = _performanceMonitorService_;
    })
  );

  it('should register clients correctly', function() {
    expect(performanceMonitorService.clients.length).toEqual(0);
    performanceMonitorService.registerClient(0);
    expect(performanceMonitorService.clients.length).toEqual(1);
  });

  it('should unregister clients correctly', function() {
    performanceMonitorService.registerClient(0);
    performanceMonitorService.registerClient(8);
    performanceMonitorService.registerClient(15);
    expect(performanceMonitorService.clients.length).toEqual(3);
    performanceMonitorService.unregisterClient(8);
    expect(performanceMonitorService.clients.length).toEqual(2);
    performanceMonitorService.unregisterClient(8);
    expect(performanceMonitorService.clients.length).toEqual(2);
  });

  it('should provide a default configuration', function() {
    var config = performanceMonitorService.getConfig();
    expect(config.type).toEqual('pie');
    expect(config.data.datasets.length).toEqual(1);
    expect(config.data.datasets[0].data.length).toEqual(2);
    expect(config.data.labels.length).toEqual(2);
    var label = config.options.tooltips.callbacks.label;
    expect(label).toBeDefined();
    expect(label({ index: 0, datasetIndex: 0 }, config.data)).toEqual(
      'Neural Simulation: 0s'
    );
    expect(label({ index: 1, datasetIndex: 0 }, config.data)).toEqual(
      'World simulation: 0s'
    );
  });

  it('should process messages correctly', function() {
    var client = {
      update: jasmine.createSpy('update')
    };
    performanceMonitorService.clients = [client];

    expect(
      performanceMonitorService.config.data.datasets[0].data.length
    ).toEqual(2);
    expect(performanceMonitorService.config.data.labels.length).toEqual(2);
    performanceMonitorService.processStateChange({
      brainsimElapsedTime: 0.9,
      robotsimElapsedTime: 1.2,
      transferFunctionsElapsedTime: {
        eyeSensorTransmit: 0.3,
        linearTwist: 0.05
      }
    });

    expect(client.update).toHaveBeenCalled();
    expect(
      performanceMonitorService.config.data.datasets[0].data.length
    ).toEqual(4);
    expect(
      performanceMonitorService.config.data.datasets[0].data.length
    ).toEqual(4);

    performanceMonitorService.processStateChange({
      brainsimElapsedTime: 1.8,
      robotsimElapsedTime: 2.4,
      transferFunctionsElapsedTime: {
        eyeSensorTransmit: 0.6,
        linearTwist: 0.1
      }
    });

    expect(client.update).toHaveBeenCalled();
    expect(
      performanceMonitorService.config.data.datasets[0].data.length
    ).toEqual(4);
    expect(
      performanceMonitorService.config.data.datasets[0].data.length
    ).toEqual(4);
  });
});
