'use strict';

describe('Directive: logConsole', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template

  var $rootScope,
    $timeout,
    element,
    childScope,
    clientLoggerServiceMock,
    clientLoggerController,
    LOG_TYPE,
    scheduler;

  beforeEach(module('clientLoggerServiceMock'));

  describe(' - test without missed logs', function() {
    beforeEach(
      inject(function(
        _$rootScope_,
        _$timeout_,
        $compile,
        _clientLoggerService_,
        _LOG_TYPE_
      ) {
        $rootScope = _$rootScope_;
        $timeout = _$timeout_;
        clientLoggerServiceMock = _clientLoggerService_;
        LOG_TYPE = _LOG_TYPE_;

        scheduler = new Rx.TestScheduler();
        var originalBufferTime = Rx.Observable.prototype.bufferTime;
        spyOn(Rx.Observable.prototype, 'bufferTime').and.callFake(function(
          initialDelay
        ) {
          return originalBufferTime.call(this, initialDelay, scheduler);
        });

        element = $compile('<log-console></log-console>')($rootScope);
        $rootScope.$digest();
        childScope = element.isolateScope();
        clientLoggerController = childScope.vm;
      })
    );

    it('should have a controller defined as vm', function() {
      expect(clientLoggerController).toBeDefined();
    });

    it('should listen to INFO logs', function() {
      expect(clientLoggerController.logs.length).toBe(0);
      clientLoggerServiceMock.logs.next({
        level: LOG_TYPE.INFO,
        message: 'test'
      });
      scheduler.flush();
      $timeout.flush();
      expect(clientLoggerController.logs.length).toBe(1);
    });

    it('should ignore ADVERTISEMENT logs', function() {
      clientLoggerServiceMock.logs.next({
        level: LOG_TYPE.ADVERTS,
        message: 'test'
      });
      $timeout.flush();
      expect(clientLoggerController.logs.length).toBe(0);
    });

    it('should unsusbscribe on scope destroy', function() {
      expect(clientLoggerServiceMock.logs.observers.length).toBe(1);
      $rootScope.$destroy();
      expect(clientLoggerServiceMock.logs.observers.length).toBe(0);
    });
  });

  describe(' - test with previously missed logs', function() {
    beforeEach(
      inject(function(
        _$rootScope_,
        _$timeout_,
        $compile,
        _clientLoggerService_,
        _LOG_TYPE_
      ) {
        $rootScope = _$rootScope_;
        $timeout = _$timeout_;
        clientLoggerServiceMock = _clientLoggerService_;
        LOG_TYPE = _LOG_TYPE_;

        var logs = [];
        logs.push({
          level: LOG_TYPE.ADVERTS,
          time: '12:00:10',
          message: 'advert'
        });
        logs.push({ level: LOG_TYPE.INFO, time: '12:00:13', message: 'test1' });
        logs.push({ level: LOG_TYPE.INFO, time: '12:00:13', message: 'test2' });
        logs.push({ level: LOG_TYPE.INFO, time: '12:01:12', message: 'test3' });
        clientLoggerServiceMock.getLogHistory = logs;

        element = $compile('<log-console></log-console>')($rootScope);
        $rootScope.$digest();
        childScope = element.isolateScope();
        clientLoggerController = childScope.vm;
      })
    );

    it('should respect missed message collected by editor toolbar', function() {
      $timeout.flush();
      expect(clientLoggerController.logs.length).toBe(4);
    });
  });

  describe(' - test with previously missed logs', function() {
    beforeEach(
      inject(function(
        _$rootScope_,
        _$timeout_,
        $compile,
        _clientLoggerService_,
        _LOG_TYPE_
      ) {
        $rootScope = _$rootScope_;
        $timeout = _$timeout_;
        clientLoggerServiceMock = _clientLoggerService_;
        LOG_TYPE = _LOG_TYPE_;

        var logs = [];
        for (var i = 0; i < 105; i++) {
          logs.push({
            level: LOG_TYPE.INFO,
            time: '12:00:00',
            message: 'test'
          });
        }
        clientLoggerServiceMock.getLogHistory = logs;

        element = $compile('<log-console></log-console>')($rootScope);
        $rootScope.$digest();
        childScope = element.isolateScope();
        clientLoggerController = childScope.vm;
      })
    );
  });
});
