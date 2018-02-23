'use strict';

describe('Services: roslib-angular', function() {
  var roslib;
  var testURL = 'ws://fu.bar:123';
  var tokenKey =
    'tokens-test-client-id@https://services.humanbrainproject.eu/oidc';

  // Unfortunately we have to mock a global variable here.
  var mockedOn = jasmine.createSpy('on');
  window.ROSLIB = {
    Ros: jasmine.createSpy('Ros').and.returnValue({ on: mockedOn }),
    PhoenixRos: jasmine
      .createSpy('PhoenixRos')
      .and.returnValue({ on: mockedOn }),
    Topic: jasmine.createSpy('Topic')
  };

  beforeEach(module('exdFrontendApp'));
  beforeEach(
    inject(function(_roslib_) {
      roslib = _roslib_;
      mockedOn.calls.reset();
      spyOn(console, 'log');
      spyOn(console, 'error');
      var mockToken =
        '[{"access_token":"mockaccesstoken","token_type":"Bearer","state":"mockstate","expires_in":"172799","id_token":"mockidtoken","expires":1432803024,"scopes":["openid"]}]';
      window.localStorage.getItem = jasmine
        .createSpy('getItem')
        .and.returnValue(mockToken);
    })
  );

  it('should create a connection if there is none for this URL currently', function() {
    roslib.getOrCreateConnectionTo(testURL);
    expect(localStorage.getItem).toHaveBeenCalledWith(tokenKey);
    expect(window.ROSLIB.PhoenixRos).toHaveBeenCalledWith({
      url: 'ws://fu.bar:123?token=mockaccesstoken'
    });
  });

  it('should create a dummy token if localStorage token is malformed or absent', function() {
    window.localStorage.getItem.calls.reset();
    window.ROSLIB.PhoenixRos.calls.reset();
    window.localStorage.getItem = jasmine
      .createSpy('getItem')
      .and.returnValue(undefined);
    roslib.getOrCreateConnectionTo(testURL);
    expect(localStorage.getItem).toHaveBeenCalledWith(tokenKey);
    expect(window.ROSLIB.PhoenixRos).toHaveBeenCalledWith({
      url: 'ws://fu.bar:123?token=no-token'
    });
    window.localStorage.getItem.calls.reset();
    window.localStorage.getItem = jasmine
      .createSpy('getItem')
      .and.returnValue([{}]);
    roslib.getOrCreateConnectionTo(testURL);
    expect(localStorage.getItem).toHaveBeenCalledWith(tokenKey);
    expect(window.ROSLIB.PhoenixRos).toHaveBeenCalledWith({
      url: 'ws://fu.bar:123?token=malformed-token'
    });
  });

  it('should reuse an already existing connection', function() {
    var rosConnection1 = roslib.getOrCreateConnectionTo(testURL);
    var rosConnection2 = roslib.getOrCreateConnectionTo(testURL);
    expect(rosConnection1.close).toBe(rosConnection2.close);
  });

  it('should create a topic by calling the global ROSLIB.Topic', function() {
    roslib.createStringTopic({}, 'topic_name');
    expect(window.ROSLIB.Topic).toHaveBeenCalled();
  });
});
