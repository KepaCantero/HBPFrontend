(function() {
  'use strict';

  angular
    .module('applyForceServiceMock', [])
    .service('applyForceService', function() {
      this.disableApplyForceMode = jasmine.createSpy('disableApplyForceMode');
    });
})();
