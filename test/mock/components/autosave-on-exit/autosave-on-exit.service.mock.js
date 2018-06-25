(function() {
  'use strict';

  angular
    .module('autosaveOnExitServiceMock', [])
    .service('autosaveOnExitService', function() {
      this.onExit = jasmine.createSpy('onExit').and.returnValue({
        then: fn => {
          fn();
        }
      });
    });
})();
