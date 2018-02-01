(function() {
  'use strict';

  angular
    .module('simulationConfigServiceMock', [])
    .service('simulationConfigService', function() {
      this.simulateCatch = false;

      this.doesConfigFileExist = function() {
        var res = {};
        res.then = function(callback) {
          callback(true);
        };
        return res;
      };

      this.loadConfigFile = jasmine
        .createSpy('loadConfigFile')
        .and.callFake(function() {
          var that = this;
          var res = {};
          res.then = jasmine.createSpy('then').and.callFake(function(callback) {
            callback(
              '{"shadows":true,"antiAliasing":true,"ssao":false,"ssaoDisplay":false,"ssaoClamp":0.8,"ssaoLumInfluence":0.7,"rgbCurve":{"red":[[0,0],[0.277587890625,0.2623291015625],[0.683837890625,0.7545166015625],[1,1]],"green":[[0,0],[0.324462890625,0.3560791015625],[0.636962890625,0.7193603515625],[1,1]],"blue":[[0,0],[0.515869140625,0.4693603515625],[1,1]]},"levelsInBlack":0.14,"levelsInGamma":1.44,"levelsInWhite":1,"levelsOutBlack":0,"levelsOutWhite":1,"skyBox":"img/3denv/sky/clouds/clouds","sun":"SIMPLELENSFLARE","bloom":true,"bloomStrength":"0.35","bloomRadius":0.37,"bloomThreshold":0.98,"fog":true,"fogDensity":"0.04","fogColor":"#d8ccb1"}'
            );

            var catchres = {};

            catchres.catch = function(callback) {
              if (that.simulateCatch) {
                callback();
              }
            };

            return catchres;
          });
          return res;
        });

      this.saveConfigFile = jasmine.createSpy('saveConfigFile');
    });
})();
