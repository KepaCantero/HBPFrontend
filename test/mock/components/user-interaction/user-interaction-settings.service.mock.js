(function() {
  'use strict';

  var mockSettingsData = {
    autosaveOnExit: {
      tranferFunctions: {
        CSVData: true
      }
    },
    camera: {
      sensitivity: {
        translation: 0.123,
        rotation: 0.456
      },
      defaultMode: 'free-camera'
    }
  };

  angular
    .module('userInteractionSettingsServiceMock', [])
    .service('userInteractionSettingsService', function() {
      this.settings = {
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          fn(mockSettingsData);
        })
      };
      this.loadSettings = jasmine.createSpy('loadSettings');
      this.saveSettings = jasmine.createSpy('saveSettings');
      this.saveSetting = jasmine
        .createSpy('saveSetting')
        .and.callFake(function() {
          return window.$q.when();
        });
    });
})();
