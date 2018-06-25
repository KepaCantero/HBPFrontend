'use strict';

describe('Directive: client-logger', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('simulationInfoMock'));

  let $rootScope;
  var clientLoggerService;
  var dynamicViewOverlayService;
  var LOG_TYPE;
  var DYNAMIC_VIEW_CHANNELS;

  var topicSubscriberMock = {
    subscribe: jasmine.createSpy('subscribe').and.callFake(function() {}),
    unsubscribe: jasmine.createSpy('unsubscribeTopic')
  };

  var roslibMock = {
    getOrCreateConnectionTo: jasmine.createSpy('getOrCreateConnectionTo'),
    createTopic: jasmine
      .createSpy('getOrCreateConnectionTo')
      .and.returnValue(topicSubscriberMock)
  };

  beforeEach(module('dynamicViewOverlayServiceMock'));

  beforeEach(
    module(function($provide) {
      $provide.value('roslib', roslibMock);
      topicSubscriberMock.subscribe.calls.reset();
    })
  );

  beforeEach(
    inject(function(
      _$rootScope_,
      _clientLoggerService_,
      _dynamicViewOverlayService_,
      _LOG_TYPE_,
      _DYNAMIC_VIEW_CHANNELS_
    ) {
      $rootScope = _$rootScope_;
      clientLoggerService = _clientLoggerService_;
      dynamicViewOverlayService = _dynamicViewOverlayService_;
      LOG_TYPE = _LOG_TYPE_;
      DYNAMIC_VIEW_CHANNELS = _DYNAMIC_VIEW_CHANNELS_;
    })
  );

  it('should subscribe a ros topic once if there are subscribers', function() {
    expect(topicSubscriberMock.subscribe).toHaveBeenCalled(); // subscription of log history callback
    clientLoggerService.logs.subscribe();
    expect(topicSubscriberMock.subscribe).toHaveBeenCalled();
    expect(topicSubscriberMock.subscribe.calls.count()).toEqual(1);
    clientLoggerService.logs.subscribe();
    expect(topicSubscriberMock.subscribe.calls.count()).toEqual(1);
  });

  it('should subscribe a ros topic once if there are subscribers', function() {
    var subscription1 = clientLoggerService.logs.subscribe();
    var subscription2 = clientLoggerService.logs.subscribe();
    subscription1.unsubscribe();
    expect(topicSubscriberMock.unsubscribe).not.toHaveBeenCalled();
    subscription2.unsubscribe();
    expect(topicSubscriberMock.unsubscribe).not.toHaveBeenCalled(); // history logger still subscribed
    clientLoggerService.onExit();
    expect(topicSubscriberMock.unsubscribe).toHaveBeenCalled();
  });

  it('should notify observer if a log message is incoming', function() {
    //spyOn(clientLoggerService.logs.)
    var echo = jasmine.createSpy('echo').and.callFake(function(message) {
      expect(message).toBe('test');
    });
    clientLoggerService.logs
      .filter(function(log) {
        return log.level === LOG_TYPE.INFO;
      })
      .map(function(log) {
        return log.message;
      })
      .subscribe(echo);
    clientLoggerService.logMessage('test', LOG_TYPE.INFO);
    expect(echo).toHaveBeenCalled();
  });

  it('should add log when RESET occurs', function() {
    spyOn(clientLoggerService, 'logMessage').and.callThrough();

    $rootScope.$broadcast('RESET');
    $rootScope.$digest();

    expect(clientLoggerService.logMessage).toHaveBeenCalled();
  });

  it('should de-initialize on EXIT_SIMULATION event', function() {
    spyOn(clientLoggerService, 'onExit').and.callThrough();

    $rootScope.$broadcast('EXIT_SIMULATION');
    $rootScope.$digest();

    expect(clientLoggerService.onExit).toHaveBeenCalled();
  });

  describe(' - test history log', function() {
    it('Counting of log message if no console is shown', function() {
      dynamicViewOverlayService
        .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.LOG_CONSOLE)
        .then.and.callFake(function(fn) {
          fn(false);
        });

      clientLoggerService.logMessage('test', LOG_TYPE.INFO);
      expect(clientLoggerService.missedConsoleLogs).toBe(1);
      expect(clientLoggerService.logHistory.length).toBe(1);
    });

    it('Do not count log message if console is shown', function() {
      dynamicViewOverlayService
        .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.LOG_CONSOLE)
        .then.and.callFake(function(fn) {
          fn(true);
        });

      clientLoggerService.logMessage('test', LOG_TYPE.INFO);
      expect(clientLoggerService.missedConsoleLogs).toBe(0);
      expect(clientLoggerService.logHistory.length).toBe(1);
    });

    it('Reset log message has to reset missedConsoleLogs counter', function() {
      clientLoggerService.missedConsoleLogs = 2;
      clientLoggerService.resetLoggedMessages();
      expect(clientLoggerService.missedConsoleLogs).toBe(0);
      expect(clientLoggerService.logHistory.length).toBe(0);
    });

    it('getLogHistory getter', function() {
      let mockHistory = {};
      clientLoggerService.logHistory = mockHistory;
      expect(clientLoggerService.getLogHistory).toBe(mockHistory);
    });
  });
});
