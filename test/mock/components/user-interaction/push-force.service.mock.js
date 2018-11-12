(function() {
  'use strict';

  angular
    .module('pushForceServiceMock', [])
    .service('pushForceService', function() {
      this.disableApplyForceMode = jasmine.createSpy('disableApplyForceMode');
      this.detachGizmo = jasmine.createSpy('detachGizmo');
      this.getLinkRayCastIntersection = jasmine.createSpy(
        'getLinkRayCastIntersection'
      );
      this.applyForceToLink = jasmine.createSpy('applyForceToLink');
      this.setTargetModel = jasmine.createSpy('setTargetModel');
      this.enterModeApplyForce = jasmine.createSpy('enterModeApplyForce');
    });
})();
