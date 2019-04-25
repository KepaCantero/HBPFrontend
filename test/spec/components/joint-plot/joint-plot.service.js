'use strict';

describe('Service: joint-service', function() {
  let rosLibConnectionObject = {
    subscribe: jasmine.createSpy('subscribe'),
    unsubscribe: jasmine.createSpy('unsubscribe')
  };

  let rosLibServiceObject = {
    callService: jasmine.createSpy('callService')
  };

  let roslibMock = {
    getOrCreateConnectionTo: jasmine.createSpy('getOrCreateConnectionTo'),
    createTopic: jasmine
      .createSpy('createTopic')
      .and.returnValue(rosLibConnectionObject),
    Ros: jasmine.createSpy('Ros'),
    Service: jasmine.createSpy('Service'),
    ServiceRequest: jasmine.createSpy('ServiceRequest'),
    createService: jasmine
      .createSpy('createService')
      .and.returnValue(rosLibServiceObject)
  };

  beforeEach(module('simulationInfoMock'));
  beforeEach(module('sceneInfoMock'));

  beforeEach(
    module(function($provide) {
      $provide.value('roslib', roslibMock);
    })
  );

  beforeEach(module('jointPlotServiceModule'));

  let jointService;
  beforeEach(
    inject(function(_jointService_) {
      jointService = _jointService_;
    })
  );

  beforeEach(function() {
    rosLibConnectionObject.subscribe.calls.reset();
    rosLibConnectionObject.unsubscribe.calls.reset();
  });

  it('should create a connection when instanciating a RobotJointService', function() {
    const robotJointService = jointService.getRobotJointService('robotid');
    expect(roslibMock.getOrCreateConnectionTo).toHaveBeenCalled();
    expect(roslibMock.createTopic).toHaveBeenCalled();
    expect(robotJointService.callbacks.length).toBe(0);
  });

  it('should unsubscribe on close', function() {
    const robotJointService = jointService.getRobotJointService('robotid');
    expect(rosLibConnectionObject.unsubscribe).not.toHaveBeenCalled();
    robotJointService.topicCallback = {};
    robotJointService.close();
    expect(rosLibConnectionObject.unsubscribe).toHaveBeenCalled();
  });

  it('should subscribe to joint topic once callbacks are registered', function() {
    const robotJointService = jointService.getRobotJointService('robotid');
    spyOn(robotJointService, 'subscribe').and.callThrough();
    expect(robotJointService.subscribe).not.toHaveBeenCalled();
    expect(robotJointService.callbacks.length).toBe(0);
    robotJointService.subscribe(function() {});
    expect(robotJointService.callbacks.length).toBe(1);
    expect(robotJointService.subscribe).toHaveBeenCalled();
  });

  it('should unsubscribe from joint topic once no more callbacks are registered', function() {
    const robotJointService = jointService.getRobotJointService('robotid');
    expect(rosLibConnectionObject.subscribe).not.toHaveBeenCalled();
    let testCallback = function() {};
    robotJointService.subscribe(testCallback);
    expect(robotJointService.callbacks.length).toBe(1);
    expect(rosLibConnectionObject.subscribe).toHaveBeenCalled();
    robotJointService.unsubscribe(testCallback);
    expect(robotJointService.callbacks.length).toBe(0);
    expect(rosLibConnectionObject.unsubscribe).toHaveBeenCalled();
  });

  it('should add callbacks to a list', function() {
    const robotJointService = jointService.getRobotJointService('robotid');
    expect(robotJointService.callbacks.length).toBe(0);
    let jointMessageCallback = jasmine.createSpy('jointMessageCallback');
    robotJointService.subscribe(jointMessageCallback);
    expect(robotJointService.callbacks.length).toBe(1);

    expect(jointMessageCallback).not.toHaveBeenCalled();
    robotJointService.jointsType['jointName'] = 0;
    robotJointService.parseMessages({
      header: { stamp: { secs: 5000, nsecs: 0 } },
      name: 'jointName'
    });
    expect(jointMessageCallback).toHaveBeenCalled();

    // no jointsType
    jointMessageCallback.calls.reset();
    robotJointService.jointsType = {};
    robotJointService.parseMessages({
      header: { stamp: { secs: 5000, nsecs: 0 } },
      name: 'jointName'
    });
    expect(jointMessageCallback).not.toHaveBeenCalled();

    // no callbacks
    jointMessageCallback.calls.reset();
    robotJointService.jointsType['jointName'] = 0;
    robotJointService.callbacks = [];
    robotJointService.parseMessages({
      header: { stamp: { secs: 5000, nsecs: 0 } },
      name: 'jointName'
    });
    expect(jointMessageCallback).not.toHaveBeenCalled();
  });
});
