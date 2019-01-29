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
      this.startRecording = jasmine.createSpy('startRecording');
      this.stopRecording = jasmine.createSpy('stopRecording');
      this.resetRecording = jasmine.createSpy('resetRecording');
      this.saveRecording = jasmine.createSpy('saveRecording').and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          fn();
        })
      });
      this.getRecording = jasmine.createSpy('getRecording').and.returnValue({
        then: jasmine.createSpy('then')
      });
    });
})();
