(function() {
  'use strict';

  const robotJointServiceUnsubscribe = jasmine.createSpy();

  const robotJointServiceMock = {
    subscribe: jasmine
      .createSpy()
      .and.returnValue(robotJointServiceUnsubscribe),
    unsubscribe: robotJointServiceUnsubscribe
  };

  angular
    .module('jointPlotServiceModuleMock', [])
    .service('jointService', function() {
      this.robotJointService = robotJointServiceMock;
      this.getRobotJointService = jasmine
        .createSpy()
        .and.returnValue(robotJointServiceMock);
    });
})();
