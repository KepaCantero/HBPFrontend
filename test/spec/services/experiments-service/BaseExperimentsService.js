'use strict';

describe('Services: BaseExperimentsService', function() {
  it('should throw if instantiated', function() {
    expect(function() {
      new window.BaseExperimentsService();
    }).toThrow();
    expect(function() {
      window.BaseExperimentsService();
    }).toThrow();
  });

  it('should throw if abstract functions are not overriden', function() {
    var ExperimentsService = function() {};
    ExperimentsService.prototype = Object.create(
      window.BaseExperimentsService.prototype
    );
    ExperimentsService.prototype.constructor = window.BaseExperimentsService;
    var abstractFunctions = ['getExperiments', 'getExperimentImage'];

    abstractFunctions.forEach(function(fnName) {
      expect(function() {
        new ExperimentsService()[fnName]();
      }).toThrow();
    });
  });

  it('should set imageData to false if failed to retrieve image', function() {
    var catchCallback;
    var ExperimentsService = function() {
      this.getExperimentImage = function() {
        return {
          then: function() {
            return {
              catch: function(cb) {
                catchCallback = cb;
              }
            };
          }
        };
      };
    };
    ExperimentsService.prototype = Object.create(
      window.BaseExperimentsService.prototype
    );
    ExperimentsService.prototype.constructor = window.BaseExperimentsService;

    var experimentsService = new ExperimentsService();
    experimentsService.experimentsArray = [{}];

    experimentsService.updateMissingImages();
    catchCallback();
    expect(experimentsService.experimentsArray[0].imageUrl).toBe(false);
  });
});
