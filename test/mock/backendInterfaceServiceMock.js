(function() {
  'use strict';

  /* eslint-disable camelcase*/
  angular
    .module('backendInterfaceServiceMock', [])
    .service('backendInterfaceService', function() {
      this.itWasSuccessful = true;
      this.mockError = {};
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
      this.setBrain = jasmine
        .createSpy('setBrain')
        .and.callFake(
          (
            filetype,
            braintype,
            scriptCode,
            successCallback,
            failureCallback
          ) => {
            if (this.itWasSuccessful) {
              successCallback();
            } else {
              failureCallback(this.mockError);
            }
          }
        );
      this.updatePopulations = jasmine
        .createSpy('updatePopulations')
        .and.callFake(
          (
            filetype,
            population,
            braintype,
            changePopulations,
            successCallback,
            failureCallback
          ) => {
            if (this.itWasSuccessful) {
              successCallback();
            } else {
              failureCallback({
                data: {
                  error_message: 'Error'
                }
              });
            }
          }
        );
    });
})();
