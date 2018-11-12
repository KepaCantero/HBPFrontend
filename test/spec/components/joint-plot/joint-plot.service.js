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

  beforeEach(module('jointPlotModule'));

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

  it('should create a connection on start', function() {
    expect(roslibMock.getOrCreateConnectionTo).toHaveBeenCalled();
    expect(roslibMock.createTopic).toHaveBeenCalled();
    expect(jointService.callbacks.length).toBe(0);
  });

  it('should unsubscribe on close', function() {
    expect(rosLibConnectionObject.unsubscribe).not.toHaveBeenCalled();
    jointService.topicCallback = {};
    jointService.close();
    expect(rosLibConnectionObject.unsubscribe).toHaveBeenCalled();
  });

  it('should subscribe to joint topic once callbacks are registered', function() {
    expect(rosLibConnectionObject.subscribe).not.toHaveBeenCalled();
    expect(jointService.callbacks.length).toBe(0);
    jointService.subscribe(function() {});
    expect(jointService.callbacks.length).toBe(1);
    expect(rosLibConnectionObject.subscribe).toHaveBeenCalled();
  });

  it('should unsubscribe from joint topic once no more callbacks are registered', function() {
    expect(rosLibConnectionObject.subscribe).not.toHaveBeenCalled();
    let testCallback = function() {};
    jointService.subscribe(testCallback);
    expect(jointService.callbacks.length).toBe(1);
    expect(rosLibConnectionObject.subscribe).toHaveBeenCalled();
    jointService.unsubscribe(testCallback);
    expect(jointService.callbacks.length).toBe(0);
    expect(rosLibConnectionObject.unsubscribe).toHaveBeenCalled();
  });

  it('should add callbacks to a list', function() {
    expect(jointService.callbacks.length).toBe(0);
    let jointMessageCallback = jasmine.createSpy('jointMessageCallback');
    jointService.subscribe(jointMessageCallback);
    expect(jointService.callbacks.length).toBe(1);

    expect(jointMessageCallback).not.toHaveBeenCalled();
    jointService.jointsType['jointName'] = 0;
    jointService.parseMessages({
      header: { stamp: { secs: 5000, nsecs: 0 } },
      name: 'jointName'
    });
    expect(jointMessageCallback).toHaveBeenCalled();

    // no jointsType
    jointMessageCallback.calls.reset();
    jointService.jointsType = {};
    jointService.parseMessages({
      header: { stamp: { secs: 5000, nsecs: 0 } },
      name: 'jointName'
    });
    expect(jointMessageCallback).not.toHaveBeenCalled();

    // no callbacks
    jointMessageCallback.calls.reset();
    jointService.jointsType['jointName'] = 0;
    jointService.callbacks = [];
    jointService.parseMessages({
      header: { stamp: { secs: 5000, nsecs: 0 } },
      name: 'jointName'
    });
    expect(jointMessageCallback).not.toHaveBeenCalled();
  });
});
