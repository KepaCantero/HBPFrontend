(function() {
  'use strict';

  angular
    .module('backendInterfaceServiceMock', [])
    .service('backendInterfaceService', function() {
      this.reset = jasmine.createSpy('reset');
      this.resetCollab = jasmine.createSpy('resetCollab');
      this.setRobotInitialPose = jasmine.createSpy('setRobotInitialPose');
      this.setRobotInitialPose = jasmine.createSpy('getRobots');
      this.setRobotInitialPose = jasmine.createSpy('deleteRobot');
    });
})();
