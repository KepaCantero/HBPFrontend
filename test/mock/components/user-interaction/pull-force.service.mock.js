(function() {
  'use strict';

  angular
    .module('pullForceServiceMock', [])
    .service('pullForceService', function() {
      this.Activate = jasmine.createSpy('Activate');
      this.Deactivate = jasmine.createSpy('Deactivate');
      this.currentModel = jasmine
        .createSpy('currentModel')
        .and.returnValue(undefined);
      this.SetForceAmplifier = jasmine.createSpy('SetForceAmplifier');
    });
})();
