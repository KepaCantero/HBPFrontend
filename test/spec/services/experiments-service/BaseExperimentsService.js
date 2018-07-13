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

  it('should sync the internal dictionary with the updated experiment details', function() {
    var ExperimentsService = function() {};
    ExperimentsService.prototype = Object.create(
      window.BaseExperimentsService.prototype
    );
    ExperimentsService.prototype.constructor = window.BaseExperimentsService;

    var experimentsService = new ExperimentsService();
    experimentsService.experimentsArray = [{}];
    experimentsService.experimentsDict = {};
    experimentsService.experimentsDefered = { notify: function() {} };

    var exp1 = {
      id: '1',
      configuration: {
        experimentFile: 'xml code 1',
        bibiConfSrc: 'path to .bibi file 1'
      },
      availableServers: []
    };
    var exp2 = {
      id: '2',
      configuration: { experimentFile: 'xml code 2' },
      availableServers: []
    };
    experimentsService.syncExperimentsList([exp1, exp2]);
    expect(experimentsService.experimentsArray.length).toBe(2);
    expect(
      experimentsService.experimentsDict['2'].configuration.bibiConfSrc
    ).toBeUndefined();
    // should update the bibiConfSrc field
    exp2.configuration.bibiConfSrc = 'path to .bibi file 2';
    experimentsService.syncExperimentsList([exp1, exp2]);
    expect(
      experimentsService.experimentsDict['2'].configuration.bibiConfSrc
    ).toBe(exp2.configuration.bibiConfSrc);
    exp2.configuration.bibiConfSrc = undefined;
    experimentsService.syncExperimentsList([exp1, exp2]);
    expect(
      experimentsService.experimentsDict['2'].configuration.bibiConfSrc
    ).toBeUndefined();
    // should update the experimentFile field
    exp1.configuration.experimentFile = undefined;
    experimentsService.syncExperimentsList([exp1, exp2]);
    expect(
      experimentsService.experimentsDict['1'].configuration.experimentFile
    ).toBeUndefined();
    exp1.configuration.experimentFile = 'some new xml code';
    experimentsService.syncExperimentsList([exp1, exp2]);
    expect(
      experimentsService.experimentsDict['1'].configuration.experimentFile
    ).toBe(exp1.configuration.experimentFile);
    expect(
      experimentsService.experimentsArray[0].configuration.experimentFile
    ).toBe(exp1.configuration.experimentFile);
  });
});
