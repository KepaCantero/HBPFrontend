'use strict';

describe('Directive: smachEditor', function () {

  var VIEW = 'views/esv/smach-editor.html';

  var $rootScope,
    $compile,
    $httpBackend,
    $scope,
    isolateScope,
    element,
    backendInterfaceService,
    pythonCodeHelper,
    ScriptObject,
    stateMachines,
    $timeout,
    simulationInfo,
    roslib,
    STATE,
    SIMULATION_FACTORY_CLE_ERROR,
    SOURCE_TYPE;

  var backendInterfaceServiceMock = {
    getStateMachines: jasmine.createSpy('getStateMachines'),
    setStateMachine: jasmine.createSpy('setStateMachine'),
    saveStateMachines: jasmine.createSpy('saveStateMachines'),
    deleteStateMachine: jasmine.createSpy('deleteStateMachine'),
    getServerBaseUrl: jasmine.createSpy('getServerBaseUrl')
  };

  var documentationURLsMock =
  {
    getDocumentationURLs: function() {
      return {
        then: function(callback) {
          return callback({
            cleDocumentationURL: 'cleDocumentationURL',
            backendDocumentationURL: 'backendDocumentationURL'
          });
        }
      };
    }
  };
 var simulationInfoMock = {
     contextID: '97923877-13ea-4b43-ac31-6b79e130d344',
     simulationID : 'mocked_simulation_id',
     isCollabExperiment: true
 };

  var roslibMock = {};
  var returnedConnectionObject = {};
  returnedConnectionObject.subscribe = jasmine.createSpy('subscribe');
  roslibMock.getOrCreateConnectionTo = jasmine.createSpy('getOrCreateConnectionTo').andReturn({});
  roslibMock.createTopic = jasmine.createSpy('createTopic').andReturn(returnedConnectionObject);

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template
  beforeEach(module(function ($provide) {
    $provide.value('backendInterfaceService', backendInterfaceServiceMock);
    $provide.value('documentationURLs', documentationURLsMock);
    $provide.value('simulationInfo', simulationInfoMock);
    $provide.value('roslib', roslibMock);
  }));

  var editorMock = {};
  beforeEach(inject(function (_$rootScope_,
                              _$httpBackend_,
                              _$compile_,
                              _backendInterfaceService_,
                              $templateCache,
                              _pythonCodeHelper_,
                              _$timeout_,
                              _simulationInfo_,
                              _roslib_,
                              _STATE_,
                              _SIMULATION_FACTORY_CLE_ERROR_,
                              _SOURCE_TYPE_) {
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    $compile = _$compile_;
    backendInterfaceService = _backendInterfaceService_;
    pythonCodeHelper = _pythonCodeHelper_;
    ScriptObject = pythonCodeHelper.ScriptObject;
    roslib = _roslib_;
    STATE = _STATE_;
    SIMULATION_FACTORY_CLE_ERROR = _SIMULATION_FACTORY_CLE_ERROR_;
    SOURCE_TYPE = _SOURCE_TYPE_;
    $timeout = _$timeout_;
    simulationInfo =_simulationInfo_;
    editorMock.getLineHandle = jasmine.createSpy('getLineHandle').andReturn(0);
    editorMock.addLineClass = jasmine.createSpy('addLineClass');
    editorMock.removeLineClass = jasmine.createSpy('removeLineClass');

    $scope = $rootScope.$new();
    $templateCache.put(VIEW, '');
    $scope.control = {};
    element = $compile('<smach-editor control="control"/>')($scope);
    $scope.$digest();

    isolateScope = element.isolateScope();
    stateMachines = isolateScope.stateMachines;
  }));

  it('should init the stateMachines variable', function () {
    $scope.control.refresh();
    expect(isolateScope.stateMachines).toEqual([]);
    expect(backendInterfaceService.getStateMachines).toHaveBeenCalled();
    expect(isolateScope.backendDocumentationURL).toEqual('backendDocumentationURL');
    expect(isolateScope.isCollabExperiment).toEqual(simulationInfo.isCollabExperiment);
  });

  describe('Retrieving, saving and deleting stateMachines', function () {
    var data = {};
    for (var i = 0; i < 3; ++i) {
      var smId = 'SM' + i;
      data[smId] = 'class ' + smId + '(DefaultStateMachine):\n';
    }
    var response = {data: data};
    var expected = [];

    beforeEach(function () {
      $scope.control.refresh();
      for (var i = 0; i < 3; ++i) {
        var smId = 'SM' + i;
        var sm = new ScriptObject(smId, data[smId]);
        sm.name = isolateScope.getStateMachineName(smId);
        expected.push(sm);
      }
      isolateScope.stateMachines = angular.copy(expected);
      stateMachines = isolateScope.stateMachines;
    });

    it('should handle the retrieved stateMachines properly', function () {
      backendInterfaceService.getStateMachines.mostRecentCall.args[0](response);
      expect(_.findIndex(stateMachines, expected[0])).not.toBe(-1);
      expect(_.findIndex(stateMachines, expected[1])).not.toBe(-1);
      expect(_.findIndex(stateMachines, expected[2])).not.toBe(-1);
      expect(stateMachines.length).toBe(3);
      // This order is not guaranteed. Still, keys are printed in insertion order on all major browsers
      // See http://stackoverflow.com/questions/5525795/does-javascript-guarantee-object-property-order
      expect(stateMachines).toEqual(expected);
    });

    it('should call the refresh function', function () {
      var callback;
      var editor = {
        'refresh': jasmine.createSpy('refresh'),
        'on': function (name, cb) {
          callback = cb;
        },
        'off': function () {
          callback = undefined;
        }
      };
      isolateScope.refreshLayout(editor);
      expect(callback).toBeDefined();
      callback();
      expect(editor.refresh).toHaveBeenCalled();
      expect(callback).not.toBeDefined();
    });

    it('should test the update function', function () {
      var sm = new ScriptObject('SM', 'Code of SM');
      isolateScope.stateMachines = [sm];
      isolateScope.update(sm);
      expect(backendInterfaceService.setStateMachine).toHaveBeenCalledWith(sm.id, sm.code, jasmine.any(Function));
      sm.dirty = true;
      sm.local = true;
      backendInterfaceService.setStateMachine.mostRecentCall.args[2]();
      expect(sm.dirty).toEqual(false);
      expect(sm.local).toEqual(false);
    });

    it('should delete a state machine properly', function () {
      var sm0 = stateMachines[0];
      isolateScope.delete(sm0);
      expect(backendInterfaceService.deleteStateMachine).toHaveBeenCalledWith('SM0', jasmine.any(Function));
      backendInterfaceService.deleteStateMachine.mostRecentCall.args[1]();
      expect(stateMachines.indexOf(sm0)).toBe(-1);

      var sm1 = stateMachines[0];
      sm1.local = true;
      isolateScope.delete(sm1);
      expect(stateMachines.indexOf(sm1)).toBe(-1);
      // Since the state machine is local, we should not call back the server
      expect(backendInterfaceService.deleteStateMachine).not.toHaveBeenCalledWith('SM1', jasmine.any(Function));
    });

    it('should save state machine code to a file', function () {
      var buttonMock = {attr: jasmine.createSpy('attr')};
      spyOn(document, 'querySelector').andReturn(buttonMock);
      spyOn(window, 'Blob').andReturn({});
      var URLMock = {createObjectURL: jasmine.createSpy('createObjectURL')};
      window.URL = URLMock;
      isolateScope.save(new ScriptObject('stateMachineId', 'Some code'));
      expect(document.querySelector).toHaveBeenCalled();
      expect(URLMock.createObjectURL).toHaveBeenCalled();
    });

    it('should save state machine code to collab', function () {
      var sm = new ScriptObject('SM', 'Code of SM');
      isolateScope.stateMachines = [sm];
      expect(isolateScope.isSavingToCollab).toEqual(false);
      isolateScope.saveSMIntoCollabStorage();
      var sms = {};
      sms[sm.id] = sm.code;
      expect(backendInterfaceService.saveStateMachines).toHaveBeenCalledWith(simulationInfo.contextID, sms, jasmine.any(Function), jasmine.any(Function));
      expect(isolateScope.isSavingToCollab).toEqual(true);
      backendInterfaceService.saveStateMachines.argsForCall[0][2]();
      expect(isolateScope.isSavingToCollab).toBe(false);
      isolateScope.isSavingToCollab = true;
      backendInterfaceService.saveStateMachines.argsForCall[0][3]();
      expect(isolateScope.isSavingToCollab).toBe(false);
      });

    it('should fill the error field of the flawed state machine', function () {
        var errorType = isolateScope.ERROR.RUNTIME;
        var msg = {
          functionName: 'SM0',
          message: 'You nearly broke the platform!',
          errorType: errorType,
          severity: 1,
          sourceType: SOURCE_TYPE.STATE_MACHINE
        };
        isolateScope.onNewErrorMessageReceived(msg);
        expect(stateMachines[0].error[errorType]).toEqual(msg);
        msg.functionName = 'SM1';
        msg.errorType = errorType = isolateScope.ERROR.LOADING;
        isolateScope.onNewErrorMessageReceived(msg);
        expect(stateMachines[1].error[errorType]).toEqual(msg);
      });

    it('should ignore transfer function errors', function () {
        var errorType = isolateScope.ERROR.RUNTIME;
        var msg = {
          functionName: 'SM0',
          message: 'You nearly broke the platform!',
          errorType: errorType,
          severity: 1,
          sourceType: SOURCE_TYPE.TRANSFER_FUNCTION
        };
        isolateScope.onNewErrorMessageReceived(msg);
        expect(stateMachines[0].error[errorType]).toBeUndefined();
      });

    it('should report syntax error', function () {
        var firstSMName = stateMachines[0].name;
        var errorType = isolateScope.ERROR.COMPILE;
        var msg = {
          functionName: firstSMName,
          message: 'Minor syntax error',
          lineNumber: 3,
          errorType: errorType,
          severity: 1,
          sourceType: SOURCE_TYPE.STATE_MACHINE
        };
        spyOn(isolateScope, 'getStateMachineEditor').andReturn(editorMock);
        isolateScope.onNewErrorMessageReceived(msg);
        expect(stateMachines[0].error[errorType]).toEqual(msg);
        expect(editorMock.getLineHandle).toHaveBeenCalled();
        expect(editorMock.addLineClass).toHaveBeenCalled();
      });

    it('should call the compile error clean-up callback if a new compile error is received', function () {
        var compile = isolateScope.ERROR.COMPILE;
        var msg = {
          functionName: 'SM1',
          message: 'You are in trouble!',
          lineNumber: 1,
          errorType: compile,
          severity: 1,
          sourceType: SOURCE_TYPE.STATE_MACHINE
        };
        spyOn(isolateScope, 'getStateMachineEditor').andReturn(editorMock);
        spyOn(isolateScope, 'cleanCompileError');
        isolateScope.onNewErrorMessageReceived(msg);
        expect(isolateScope.cleanCompileError).toHaveBeenCalled();
        msg.errorType = isolateScope.ERROR.RUNTIME;
        isolateScope.cleanCompileError.reset();
        isolateScope.onNewErrorMessageReceived(msg);
        expect(isolateScope.cleanCompileError).not.toHaveBeenCalled();
      });

    it('should retrieve the flawed state machine using its ID when an error is received', function () {
        var namingError = isolateScope.ERROR.COMPILE;
        var sm1 = stateMachines[0];
        sm1.name = '';
        var msg = {
          functionName: 'SM1',
          message: 'Invalid def name',
          lineNumber: -1,
          errorType: namingError,
          severity: 1,
          sourceType: SOURCE_TYPE.STATE_MACHINE
        };
        spyOn(isolateScope, 'getStateMachineEditor').andReturn(editorMock);
        spyOn(isolateScope, 'cleanCompileError');
        spyOn(_, 'find').andReturn(sm1);
        isolateScope.onNewErrorMessageReceived(msg);
        expect(_.find).toHaveBeenCalledWith(isolateScope.stateMachines, {'id': msg.functionName});
      });

    it('should retrieve the flawed state machine using its name when no state machine found using its ID when an error is received', function () {
        var namingError = isolateScope.ERROR.COMPILE;
        var sm1 = stateMachines[0];
        sm1.name = 'NewFunctionName';
        sm1.id = 'OldFunctionName';
        var msg = {
          functionName: 'NewFunctionName',
          message: 'Invalid def name',
          lineNumber: -1,
          errorType: namingError,
          severity: 1,
          sourceType: SOURCE_TYPE.STATE_MACHINE
        };
        spyOn(isolateScope, 'getStateMachineEditor').andReturn(editorMock);
        spyOn(isolateScope, 'cleanCompileError');
        spyOn(_, 'find').andCallFake(function (arg1, arg2) {
          if (Object.keys(arg2)[0] === 'id') {
            return undefined;
          }
          return sm1;
        });
        isolateScope.onNewErrorMessageReceived(msg);
        expect(Object.keys(_.find.mostRecentCall.args[1])[0]).toBe('name');
      });
    });

    describe('Editing state machines', function () {

      it('should create state machines properly', function () {
        var numberOfNewStateMachines = 3;
        var date = 666;
        spyOn(Date, 'now').andReturn(date);
        for (var i = 0; i < numberOfNewStateMachines; ++i) {
          isolateScope.create();
        }
        var n = numberOfNewStateMachines - 1;
        var sm = stateMachines[0];
        var name = 'statemachine_' + n;
        expect(sm.name).toEqual(name);
        expect(sm.id).toEqual(name + '_' + date + '_front-end_generated');
        expect(sm.code).toContain('import hbp_nrp_excontrol');
        expect(sm.code).toContain('from smach import StateMachine');
        expect(sm.code).toContain('StateMachine.add(');
      });

      it('should update script flags properly when editing the state machine code', function () {
        var smCode = 'class MyStateMachine(DefaultStateMachine):\n    def populate():\n        return None';
        var smCodeNewCode = 'class MyStateMachine(DefaultMachine):\n    def populate():\n        return []';
        stateMachines[0] = {code: smCode, dirty: false, local: false, id: 'sm'};
        var sm = stateMachines[0];
        sm.code = smCodeNewCode;
        isolateScope.onStateMachineChange(sm);
        expect(stateMachines).toEqual(
          [
            {code: smCodeNewCode, dirty: true, local: false, id: 'sm'}
          ]);
      });

      it('should retrieve the name of the state from its id', function () {
        var name = 'statemachine_3';
        var id = name + '_1000234677_front-end_generated';
        expect(isolateScope.getStateMachineName(id)).toEqual(name);
      });

      it('should load to back-end memory a state machine from file', function () {
        var readAsTextSpy = jasmine.createSpy('readAsTextSpy');
        var expectedName = 'statemachine_0';
        var stateMachineCode = 'some code';
        var fileReaderMock = {
          readAsText: readAsTextSpy
        };
        var eventMock = {
          target: {result: stateMachineCode}
        };
        spyOn(window, 'FileReader').andReturn(fileReaderMock);
        spyOn(Date, 'now').andReturn(666);

        isolateScope.loadStateMachine('someFile');
        expect(window.FileReader).toHaveBeenCalled();
        expect(readAsTextSpy).toHaveBeenCalled();
        fileReaderMock.onload(eventMock);
        expect(stateMachines).toEqual([]);
        $timeout.flush();
        stateMachines = isolateScope.stateMachines;
        var expectedStateMachineId = expectedName + '_666_front-end_generated';
        var sm = stateMachines[0];
        expect(sm.id).toEqual(expectedStateMachineId);
        expect(sm.name).toEqual(expectedName);
        expect(sm.code).toEqual(stateMachineCode);
      });

      it('should not try to load an invalid file', function () {
        var readAsTextSpy = jasmine.createSpy('readAsTextSpy');
        var fileReaderMock = {
          readAsText: readAsTextSpy
        };
        spyOn(window, 'FileReader').andReturn(fileReaderMock);

        isolateScope.loadStateMachine({$error: 'some error'});
        expect(window.FileReader).not.toHaveBeenCalled();
      });

    });
});
