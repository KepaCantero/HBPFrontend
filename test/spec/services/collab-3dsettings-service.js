'use strict';

describe('Services: collab-3dsettings-service', function() {
  var gz3dMock, collab3DSettingsService;

  gz3dMock = { scene: { composerSettings: {} } };
  gz3dMock.scene.applyComposerSettings = function() {};

  var simulationConfigServiceMock;

  simulationConfigServiceMock = {};

  simulationConfigServiceMock.loadConfigFile = function() {
    var res = {};
    res.then = function(callback) {
      callback(
        '{"shadows":true,"antiAliasing":true,"ssao":false,"ssaoDisplay":false,"ssaoClamp":0.8,"ssaoLumInfluence":0.7,"rgbCurve":{"red":[[0,0],[0.277587890625,0.2623291015625],[0.683837890625,0.7545166015625],[1,1]],"green":[[0,0],[0.324462890625,0.3560791015625],[0.636962890625,0.7193603515625],[1,1]],"blue":[[0,0],[0.515869140625,0.4693603515625],[1,1]]},"levelsInBlack":0.14,"levelsInGamma":1.44,"levelsInWhite":1,"levelsOutBlack":0,"levelsOutWhite":1,"skyBox":"img/3denv/sky/clouds/clouds","sun":"SIMPLELENSFLARE","bloom":true,"bloomStrength":"0.35","bloomRadius":0.37,"bloomThreshold":0.98,"fog":true,"fogDensity":"0.04","fogColor":"#d8ccb1","cameraSensitivity":{"translation":1.1,"rotation":1.2}}'
      );

      return { catch: function() {} };
    };
    return res;
  };

  simulationConfigServiceMock.saveConfigFile = function() {
    var res = {};
    res.then = function(callback) {
      callback(true);
    };
    return res;
  };

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('gz3dModule'));
  beforeEach(module('userNavigationServiceMock'));

  // load the service to test and mock the necessary service

  beforeEach(
    module(function($provide) {
      $provide.value('gz3d', gz3dMock);
      $provide.value('simulationConfigService', simulationConfigServiceMock);
    })
  );

  beforeEach(
    inject(function(_collab3DSettingsService_) {
      collab3DSettingsService = _collab3DSettingsService_;
    })
  );

  it('should load 3D settings', function() {
    spyOn(simulationConfigServiceMock, 'loadConfigFile').and.callThrough();
    collab3DSettingsService.loadSettings();
    expect(simulationConfigServiceMock.loadConfigFile).toHaveBeenCalled();
  });

  it('should save to collab 3D settings', function() {
    spyOn(simulationConfigServiceMock, 'saveConfigFile').and.callThrough();
    collab3DSettingsService.saveSettings();
    expect(simulationConfigServiceMock.saveConfigFile).toHaveBeenCalled();
  });
});
