(function() {
  'use strict';

  angular
    .module('backendInterfaceServiceMock', [])
    .service('backendInterfaceService', function() {
      this.reset = jasmine.createSpy('reset');
      this.resetCollab = jasmine.createSpy('resetCollab');
      this.setRobotInitialPose = jasmine.createSpy('setRobotInitialPose');
    });
})();
