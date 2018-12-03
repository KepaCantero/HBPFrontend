'use strict';

describe('Services: experimentService', function() {
  var experimentService,
    simulationControlObject,
    experimentsFactoryObject,
    rootScope;

  var simulationData = {
    owner: 'Some owner id',
    experimentConfiguration: 'expconf',
    creationDate: '19.02.1970'
  };

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('nrpUserMock'));
  beforeEach(
    module(function($provide) {
      simulationControlObject = {
        simulation: function(desc, rescallback) {
          rescallback(simulationData);
        }
      };

      var nrpFrontendVersionObject = {
        get: function(callback) {
          callback({ toString: 'V1.0' });
        }
      };

      var nrpBackendVersionsObject = {
        get: function(callback) {
          callback({ toString: 'V1.0' });
        }
      };

      $provide.value(
        'simulationControl',
        jasmine
          .createSpy('simulationControl')
          .and.returnValue(simulationControlObject)
      );
      $provide.value('experimentsFactory', experimentsFactoryObject);
      $provide.value('nrpFrontendVersion', nrpFrontendVersionObject);
      $provide.value(
        'nrpBackendVersions',
        jasmine
          .createSpy('nrpBackendVersions')
          .and.returnValue(nrpBackendVersionsObject)
      );
    })
  );

  beforeEach(
    inject(function(_experimentService_, _$rootScope_) {
      experimentService = _experimentService_;
      rootScope = _$rootScope_;
      rootScope.$digest();
    })
  );

  it('should set experimentConfiguration', function() {
    expect(experimentService.experimentConfiguration).toBe(
      simulationData.experimentConfiguration
    );
  });

  it('should set environmentConfiguration', function() {
    expect(experimentService.environmentConfiguration).toBe(
      simulationData.environmentConfiguration
    );
  });

  it('should set creationDate', function() {
    expect(experimentService.creationDate).toBe(simulationData.creationDate);
  });

  it('should set creationDate', function() {
    expect(experimentService.creationDate).toBe(simulationData.creationDate);
  });

  it('should set owner display name', function() {
    expect(experimentService.owner).toBe('ownerDisplayName');
  });

  it('should init rosTopics', function() {
    expect(experimentService.rosTopics).not.toBeNull();
  });

  it('should init rosbridgeWebsocketUrl', function() {
    expect(experimentService.rosbridgeWebsocketUrl).not.toBeNull();
  });

  it('should init versionString', function() {
    rootScope.$digest();

    expect(experimentService.versionString).not.toBeNull();
  });
});
