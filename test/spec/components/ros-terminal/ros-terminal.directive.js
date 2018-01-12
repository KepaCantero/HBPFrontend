'use strict';

describe('Directive: ros-terminal', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template
  beforeEach(module('simulationInfoMock'));

  var $rootScope,
    element,
    childScope,
    rosCommanderService,
    editorToolbarService,
    rosCommandLine,
    $timeout;

  var roslibMock = {
    getOrCreateConnectionTo: jasmine
      .createSpy('getOrCreateConnectionTo')
      .and.returnValue({
        roscmd: jasmine.createSpy('roscmd'),
        removeRoscmdListener: jasmine.createSpy('removeRoscmdListener'),
        setRoscmdListener: jasmine.createSpy('setRoscmdListener')
      })
  };

  beforeEach(
    module(function($provide) {
      $provide.value('roslib', roslibMock);
    })
  );

  beforeEach(
    inject(function(
      _$rootScope_,
      $compile,
      _rosCommanderService_,
      _editorToolbarService_,
      _$timeout_
    ) {
      $rootScope = _$rootScope_;
      rosCommanderService = _rosCommanderService_;
      editorToolbarService = _editorToolbarService_;
      $timeout = _$timeout_;

      spyOn(localStorage, 'getItem');
      spyOn(localStorage, 'setItem');
      element = $compile('<ros-terminal></ros-terminal>')($rootScope);
      $rootScope.$digest();
      rosCommandLine = element.find('.ros-command-line');

      childScope = element.isolateScope();
    })
  );

  it('should up/down keys should brose cmd history', function() {
    expect(childScope.cmdLine).toBe('');
    rosCommandLine.trigger($.Event('keydown', { which: 38 })); // navigate to 1st item in cmd history
    expect(childScope.cmdLine).toBe('rostopic');
    rosCommandLine.trigger($.Event('keydown', { which: 38 })); // navigate to 2nd item in cmd history
    expect(childScope.cmdLine).toBe('help');
    rosCommandLine.trigger($.Event('keydown', { which: 38 })); // already at the top of history, no change
    expect(childScope.cmdLine).toBe('help');
    rosCommandLine.trigger($.Event('keydown', { which: 40 })); // navigate to 1st item
    expect(childScope.cmdLine).toBe('rostopic');
    rosCommandLine.trigger($.Event('keydown', { which: 40 })); // navigate to new cmdline
    expect(childScope.cmdLine).toBe('');
    rosCommandLine.trigger($.Event('keydown', { which: 40 })); // already new cmdline, no change
    expect(childScope.cmdLine).toBe('');
    $timeout.flush();
    $rootScope.$digest();
  });

  it('should focus when clicking in the terminal', function() {
    childScope.focused = false;
    $(document).trigger($.Event('click', { target: element }));
    expect(childScope.focused).toBe(true);
  });

  it('should trigger sendCommand valid cmd', function() {
    spyOn(rosCommanderService, 'sendCommand').and.callThrough();
    rosCommandLine.val('rostopic');
    rosCommandLine.trigger($.Event('keypress', { which: 13 }));
    expect(rosCommanderService.sendCommand).toHaveBeenCalled();
  });

  it('should trigger error message on invalid cmd', function() {
    expect(childScope.commands.length).toBe(1);
    rosCommandLine.val('wrondcmd');
    rosCommandLine.trigger($.Event('keypress', { which: 13 }));
    expect(childScope.commands.length).toBe(3);
    expect(childScope.commands[2]).toEqual({
      type: 'error',
      data: "Unknown command 'wrondcmd'"
    });
  });

  it('should trigger help with "help" cmd', function() {
    expect(childScope.commands.length).toBe(1);
    rosCommandLine.val('help');
    rosCommandLine.trigger($.Event('keypress', { which: 13 }));
    expect(childScope.commands.length).toBe(8);
  });

  it('should stopCurrentExecution on ctrl+c', function() {
    spyOn(rosCommanderService, 'stopCurrentExecution').and.callThrough();
    $(document).trigger($.Event('keydown', { which: 67, ctrlKey: true }));
    expect(rosCommanderService.stopCurrentExecution).toHaveBeenCalled();
  });

  it('should set flag on exit', function() {
    editorToolbarService.showRosTerminal = true;
    childScope.$destroy();
    expect(editorToolbarService.showRosTerminal).toBe(false);
  });
});

describe('Directive: ros-terminal', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template
  beforeEach(module('simulationInfoMock'));

  var $rootScope, $timeout, childScope;

  var rosCommanderServiceMock = {
    rosResponses$: Rx.Observable.of([{ data: ['Server response'] }, true])
  };

  beforeEach(
    module(function($provide) {
      $provide.value('rosCommanderService', rosCommanderServiceMock);
    })
  );

  beforeEach(
    inject(function(_$rootScope_, _$timeout_, $compile) {
      $rootScope = _$rootScope_;
      $timeout = _$timeout_;
      spyOn(localStorage, 'getItem').and.returnValue('[]');

      var element = $compile('<ros-terminal></ros-terminal>')($rootScope);
      $rootScope.$digest();
      childScope = element.isolateScope();
    })
  );

  it('test new message received adds new cmd', function() {
    $timeout.flush();
    $rootScope.$digest();

    expect(childScope.commands.length).toBe(2);
    expect(childScope.commands[1].data).toBe('Server response');
  });
});
