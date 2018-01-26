(function() {
  'use strict';

  angular
    .module('applyForceServiceMock', [])
    .service('applyForceService', function() {
      this.disableApplyForceMode = jasmine.createSpy('disableApplyForceMode');
      this.detachGizmo = jasmine.createSpy('detachGizmo');
      this.getLinkRayCastIntersection = jasmine.createSpy(
        'getLinkRayCastIntersection'
      );
      this.applyForceToLink = jasmine.createSpy('applyForceToLink');
      this.ActivateForTarget = jasmine.createSpy('ActivateForTarget');
    });
})();
