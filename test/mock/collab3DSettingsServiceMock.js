(function() {
  'use strict';

  angular
    .module('collab3DSettingsServiceMock', [])
    .service('collab3DSettingsService', ['$q'], function($q) {
      this.loadSettings = jasmine.createSpy('loadSettings');
      this.saveSettings = jasmine.createSpy('saveSettings');
      this.settings = $q.resolve({});
    });
})();
