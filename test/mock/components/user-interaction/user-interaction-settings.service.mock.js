(function() {
  'use strict';

  var mockSettingsData = {
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
      this.settingsData = mockSettingsData;
      this.workspaces = {
        then: jasmine.createSpy('then')
      };
      this.autosaveLayout = jasmine.createSpy('autosaveLayout');
      this.saveCustomWorkspace = jasmine.createSpy('saveCustomWorkspace');
      this.deleteCustomWorkspace = jasmine.createSpy('deleteCustomWorkspace');
    });
})();
