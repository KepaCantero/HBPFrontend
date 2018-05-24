'use strict';

describe('Directive: transferFunctionEditor', function() {
  var $rootScope,
    $compile,
    $scope,
    isolateScope,
    transferFunctions,
    element,
    backendInterfaceService,
    currentStateMock,
    SOURCE_TYPE,
    TRANSFER_FUNCTION_TYPE,
    pythonCodeHelper,
    ScriptObject,
    $timeout,
    RESET_TYPE,
    downloadFileService,
    codeEditorsServices,
    clbErrorDialog,
    $httpBackend,
    registerFoundAutoSavedCallback,
    clbConfirmMock;

  var shouldUseErrorCallback = false;

  var getTransferFunctionResponse = {
    data: { tf1: 'pass', tf2: 'pass', faultyTf: 'invalidCode' },
    active: { tf1: true, tf2: true, faultyTf: false }
  };

  var backendInterfaceServiceMock = {
    getPopulations: jasmine
      .createSpy('getPopulations')
      .and.callFake(() => window.$q.resolve()),
    getStructuredTransferFunctions: jasmine.createSpy(
      'getStructuredTransferFunctions'
    ),
    getTransferFunctions: function(callback) {
      callback(getTransferFunctionResponse);
      return window.$q.resolve();
    },
    setStructuredTransferFunction: jasmine
      .createSpy('setStructuredTransferFunction')
      .and.callFake(() => window.$q.resolve()),
    setActivateTransferFunction: function(
      name,
      id,
      active,
      callback1,
      callback2
    ) {
      if (!shouldUseErrorCallback) callback1();
      else callback2();
    },
    editTransferFunction: jasmine
      .createSpy('editTransferFunction')
      .and.callFake(() => window.$q.resolve()),
    deleteTransferFunction: jasmine.createSpy('deleteTransferFunction'),
    getServerBaseUrl: jasmine.createSpy('getServerBaseUrl'),
    saveTransferFunctions: jasmine.createSpy('saveTransferFunctions'),
    getTopics: jasmine.createSpy('getTopics'),
    saveCSVRecordersFiles: jasmine.createSpy('backendInterfaceServiceMock')
  };

  var documentationURLsMock = {
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

  var clbConfirmMockResultCancel = false;

  var roslibMock = {};
  var returnedConnectionObject = {};
  returnedConnectionObject.subscribe = jasmine.createSpy('subscribe');
  roslibMock.getOrCreateConnectionTo = jasmine
    .createSpy('getOrCreateConnectionTo')
    .and.returnValue({});
  roslibMock.createTopic = jasmine
    .createSpy('createTopic')
    .and.returnValue(returnedConnectionObject);

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template
  beforeEach(module('currentStateMockFactory'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(
    module(function($provide) {
      $provide.value('backendInterfaceService', backendInterfaceServiceMock);
      $provide.value('documentationURLs', documentationURLsMock);
      $provide.value('stateService', currentStateMock);
      $provide.value('roslib', roslibMock);

      clbConfirmMock = {
        open: function() {
          return {
            then: function(success, failure) {
              if (!clbConfirmMockResultCancel) {
                success();
              } else {
                failure();
              }
            }
          };
        }
      };
      $provide.value('clbConfirm', clbConfirmMock);
    })
  );

  var editorMock = {};
  beforeEach(
    inject(function(
      _$rootScope_,
      _$compile_,
      _$httpBackend_,
      _$log_,
      _$timeout_,
      _backendInterfaceService_,
      $templateCache,
      _currentStateMockFactory_,
      _documentationURLs_,
      _roslib_,
      _stateService_,
      _STATE_,
      _SIMULATION_FACTORY_CLE_ERROR_,
      _SOURCE_TYPE_,
      _TRANSFER_FUNCTION_TYPE_,
      _pythonCodeHelper_,
      _RESET_TYPE_,
      _downloadFileService_,
      _codeEditorsServices_,
      _clbErrorDialog_,
      _autoSaveService_
    ) {
      $httpBackend = _$httpBackend_;
      clbErrorDialog = _clbErrorDialog_;
      codeEditorsServices = _codeEditorsServices_;
      downloadFileService = _downloadFileService_;
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      $timeout = _$timeout_;
      RESET_TYPE = _RESET_TYPE_;
      SOURCE_TYPE = _SOURCE_TYPE_;
      TRANSFER_FUNCTION_TYPE = _TRANSFER_FUNCTION_TYPE_;
      backendInterfaceService = _backendInterfaceService_;
      currentStateMock = _currentStateMockFactory_.get().stateService;
      editorMock.getLineHandle = jasmine
        .createSpy('getLineHandle')
        .and.returnValue(0);
      editorMock.addLineClass = jasmine.createSpy('addLineClass');
      editorMock.removeLineClass = jasmine.createSpy('removeLineClass');
      pythonCodeHelper = _pythonCodeHelper_;
      ScriptObject = pythonCodeHelper.ScriptObject;
      registerFoundAutoSavedCallback = spyOn(
        _autoSaveService_,
        'registerFoundAutoSavedCallback'
      );

      $scope = $rootScope.$new();
      $templateCache.put('views/esv/transfer-function-editor.html', '');
      $scope.control = {};
      element = $compile('<transfer-function-editor control="control"/>')(
        $scope
      );
      $scope.$digest();
      isolateScope = element.isolateScope();
      transferFunctions = isolateScope.transferFunctions;
    })
  );

  it('should init the populations, topics and transfer functions', function() {
    $scope.control.refresh();
    expect(isolateScope.populations).toEqual([]);
    expect(isolateScope.topics).toEqual([]);
    expect(isolateScope.transferFunctions).toEqual([]);
    expect(
      backendInterfaceService.getStructuredTransferFunctions
    ).toHaveBeenCalled();
  });

  it('should populate the populations', function() {
    $scope.control.refresh();
    expect(backendInterfaceService.getPopulations).toHaveBeenCalled();
  });

  it('should populate the topics', function() {
    $scope.control.refresh();
    expect(backendInterfaceService.getTopics).toHaveBeenCalled();
  });

  it('should print populations nicely', function() {
    expect(
      isolateScope.getFriendlyPopulationName({
        type: 1,
        start: 0,
        step: 8,
        stop: 15,
        name: 'foo'
      })
    ).toEqual('foo[0:8:15]');
    expect(
      isolateScope.getFriendlyPopulationName({
        type: 1,
        start: 0,
        step: 1,
        stop: 15,
        name: 'foo'
      })
    ).toEqual('foo[0:15]');
    expect(
      isolateScope.getFriendlyPopulationName({
        type: 2,
        gids: [0, 8, 15],
        name: 'foo'
      })
    ).toEqual('foo[0,8,15]');
    expect(
      isolateScope.getFriendlyPopulationName({ type: 3, name: 'foo' })
    ).toEqual('foo');
  });

  it('should print topics nicely', function() {
    expect(
      isolateScope.getFriendlyTopicName({ publishing: true, topic: 'foo' })
    ).toEqual('publishes on foo');
    expect(
      isolateScope.getFriendlyTopicName({ publishing: false, topic: 'bar' })
    ).toEqual('subscribes to bar');
  });

  it('should apply editor options', function() {
    spyOn(isolateScope, 'applyEditorOptions').and.callThrough();
    $timeout.flush(110);
    isolateScope.$apply();

    expect(isolateScope.applyEditorOptions).toHaveBeenCalled();
  });

  it('does nothing on apply or delete if no transfer function present', function() {
    expect(isolateScope.transferFunction).toBeNull();
    isolateScope.apply();
    isolateScope.delete();
  });

  it('loads transfer functions correctly', function() {
    isolateScope.transferFunction = { name: 'tf1', code: 'return 42' };
    isolateScope.transferFunctions = [isolateScope.transferFunction];
    /* eslint-disable camelcase*/
    isolateScope.loadTransferFunctions({
      transferFunctions: [
        {
          name: 'tf1',
          type: 1,
          devices: [0, 8, 15],
          topics: [
            {
              name: 'sub'
            }
          ],
          variables: [
            {
              type: 'csv',
              initial_value:
                '{"filename":"results.csv", "headers": ["Name", "Value"]}'
            }
          ],
          code: 'pass',
          rawCode: `@nrp.Robot2Neuron()
def tf1(t):
    pass)`
        },
        {
          name: 'tf2',
          type: 2,
          devices: [],
          variables: [],
          topics: [
            {
              name: '__return__'
            }
          ],
          code: 'raise Exception()',
          rawCode: `@nrp.Robot2Neuron()
    def tf2(t):
        raise Exception()`
        }
      ]
    });
    expect(isolateScope.transferFunctions.length).toEqual(3);
    expect(isolateScope.transferFunctions[0].devices).toEqual([0, 8, 15]);
    expect(isolateScope.transferFunctions[0].topics).toEqual([
      { name: 'sub', isDefault: false }
    ]);
    expect(isolateScope.transferFunctions[0].variables).toEqual([
      {
        type: 'csv',
        initial_value:
          '{"filename":"results.csv", "headers": ["Name", "Value"]}',
        headers: ['Name', 'Value'],
        filename: 'results.csv'
      }
    ]);
    expect(isolateScope.transferFunctions[0].code).toEqual('pass');
    expect(isolateScope.transferFunctions[1].devices).toEqual([]);
    expect(isolateScope.transferFunctions[1].topics).toEqual([
      { name: '__return__', isDefault: true }
    ]);
    expect(isolateScope.transferFunctions[1].variables).toEqual([]);
    expect(isolateScope.transferFunctions[1].code).toEqual('raise Exception()');
  });

  it('loads populations correctly', function() {
    expect(isolateScope.populations.length).toEqual(0);
    isolateScope.loadPopulations({
      populations: [
        {
          name: 'actors',
          neuron_model: 'FakeNeuron',
          gids: [0, 8, 15],
          parameters: [{ parameterName: 'E', value: 42 }]
        }
      ]
    });

    var posRes = {
      name: 'actors',
      neuron_model: 'FakeNeuron',
      gids: [
        Object({ id: 0, selected: false }),
        Object({ id: 8, selected: false }),
        Object({ id: 15, selected: false })
      ],
      rawInfo: Object({
        name: 'actors',
        neuron_model: 'FakeNeuron',
        gids: [0, 8, 15],
        parameters: [Object({ parameterName: 'E', value: 42 })]
      }),
      parameters: [Object({ parameterName: 'E', value: 42 })]
    };

    expect(isolateScope.populations.length).toEqual(1);
    expect(isolateScope.populations[0]).toEqual(posRes);
  });

  it('loads topics correctly', function() {
    isolateScope.loadTopics({ topics: [0, 8, 15] });
    expect(isolateScope.topics).toEqual([0, 8, 15]);
  });

  it('should toggle neurons correctly', function() {
    var neurons = [{ selected: true }, { selected: true }, { selected: false }];
    isolateScope.selectedPopulation = { gids: neurons };
    isolateScope.toggleNeuron(neurons[0], true);
    expect(isolateScope.isNeuronsSelected).toBeTruthy();
    isolateScope.toggleNeuron(neurons[1], true);
    expect(isolateScope.isNeuronsSelected).toBeFalsy();
    neurons[2].selected = true;
    isolateScope.toggleNeuron(neurons[2], false);
    expect(isolateScope.isNeuronsSelected).toBeTruthy();
  });

  describe('with loaded transfer functions', function() {
    var expectedTf1, expectedTf2, expectedFaultyTf;
    var expectedTopic1, expectedTopic2;
    var expectedPopulation1, expectedPopulation2, expectedPopulation3;
    var expected = [];

    beforeEach(function() {
      let tfID = 0;
      $scope.control.refresh();
      expectedTf1 = new ScriptObject(tfID++, 'return 42');
      expectedTf1.type = TRANSFER_FUNCTION_TYPE.NEURON2ROBOT;
      expectedTf1.name = expectedTf1.oldName = 'tf1';
      expectedTf1.local = false;
      expectedTf1.rawCode = '\n\n\n\n\n\n\n\n\n';
      expectedTf1.devices = [
        {
          name: 'device1',
          type: 'LeakyIntegratorAlpha',
          neurons: {
            name: 'sensors',
            start: 0,
            step: 8,
            stop: 15,
            type: 1
          }
        }
      ];
      expectedTf1.topics = [
        {
          name: 'foo',
          topic: '/bar',
          topicType: 'Device',
          publishing: true
        }
      ];
      expectedTf1.variables = [];

      expectedTf2 = new ScriptObject(tfID++, 'pass');
      expectedTf2.type = TRANSFER_FUNCTION_TYPE.NEURON2ROBOT;
      expectedTf2.name = expectedTf2.oldName = 'tf2';
      expectedTf2.local = true;
      expectedTf2.devices = [
        {
          name: 'device1',
          type: 'Poisson',
          neurons: {
            name: 'actors',
            type: 0
          }
        }
      ];
      expectedTf2.topics = [
        {
          name: 'foo',
          topic: '/bar',
          topicType: 'Device',
          publishing: false
        }
      ];
      expectedTf2.variables = [
        {
          name: 'bar',
          initial_value: '42',
          type: 'int'
        }
      ];

      expectedFaultyTf = new ScriptObject(tfID++, null);
      expectedFaultyTf.local = false;
      expectedFaultyTf.name = expectedFaultyTf.oldName = 'faultyTf';
      expectedFaultyTf.rawCode = 'invalidCode';
      expectedFaultyTf.active = false;

      expected = [expectedTf1, expectedTf2, expectedFaultyTf];

      expectedPopulation1 = {
        name: 'sensors',
        neuron_model: 'IF_cond_alpha',
        tooltip: 'This is fake',
        gids: [
          { id: 0, selected: true },
          { id: 8, selected: false },
          { id: 15, selected: true }
        ]
      };
      expectedPopulation2 = {
        name: 'actors',
        neuron_model: 'IF_cond_alpha',
        tooltip: 'This is fake',
        gids: [{ id: 42, selected: true }]
      };
      expectedPopulation3 = {
        name: 'foobars',
        neuron_model: 'FakeNeuron',
        tooltip: 'This is fake',
        gids: [
          { id: 0, selected: true },
          { id: 8, selected: true },
          { id: 15, selected: false },
          { id: 23, selected: true }
        ]
      };
      expectedTopic1 = { topic: '/foo', topicType: 'Bar' };
      expectedTopic2 = { topic: '/foo/bar', topicType: 'FooBar' };

      // We now assume that the transferFunctions are already retrieved
      isolateScope.transferFunctions = angular.copy(expected);
      isolateScope.transferFunction = isolateScope.transferFunctions[0];
      isolateScope.selectedTF = expectedTf1.name;
      isolateScope.topics = angular.copy([expectedTopic1, expectedTopic2]);
      isolateScope.populations = angular.copy([
        expectedPopulation1,
        expectedPopulation2,
        expectedPopulation3
      ]);
      transferFunctions = isolateScope.transferFunctions;
    });

    it('should fill the error field of the flawed transfer function', function() {
      var errorType = isolateScope.ERROR.RUNTIME;
      var msg = {
        functionName: 'tf1',
        message: 'You nearly broke the platform!',
        errorType: errorType,
        severity: 1,
        sourceType: SOURCE_TYPE.TRANSFER_FUNCTION
      };
      isolateScope.onNewErrorMessageReceived(msg);
      expect(transferFunctions[0].error[errorType]).toEqual(msg);
      msg.functionName = 'tf2';
      msg.errorType = errorType = isolateScope.ERROR.LOADING;
      isolateScope.onNewErrorMessageReceived(msg);
      expect(transferFunctions[1].error[errorType]).toEqual(msg);
    });

    it('should cleanCompileErrors', function() {
      const msg = {
        functionName: 'tf1',
        message: 'You nearly broke the platform!',
        errorType: isolateScope.ERROR.COMPILE,
        severity: 1,
        sourceType: SOURCE_TYPE.TRANSFER_FUNCTION
      };
      spyOn(isolateScope, 'cleanCompileError');
      isolateScope.onNewErrorMessageReceived(msg);
      expect(isolateScope.cleanCompileError).toHaveBeenCalled();
    });

    it('should handle runtime errors correctly', function() {
      const rawCodeEditor = {
        addLineClass: jasmine.createSpy('addLineClass_raw'),
        lineCount: () => 10,
        getLine: () => '',
        removeLineClass: angular.noop
      };

      const structuredEditor = {
        addLineClass: jasmine.createSpy('addLineClass_structured'),
        lineCount: () => 5,
        getLine: () => '',
        removeLineClass: angular.noop
      };

      spyOn(codeEditorsServices, 'getEditor').and.callFake(
        name => (name == 'rawCodeEditor' ? rawCodeEditor : structuredEditor)
      );

      const msg = {
        functionName: 'tf1',
        lineNumber: 8,
        errorType: isolateScope.ERROR.RUNTIME,
        severity: 1,
        sourceType: SOURCE_TYPE.TRANSFER_FUNCTION
      };

      isolateScope.onNewErrorMessageReceived(msg);
      expect(structuredEditor.addLineClass).toHaveBeenCalledWith(
        2,
        'background',
        'alert-danger'
      );
    });

    it('should add error line to current editor ', function() {
      const msg = {
        functionName: 'tf1',
        lineText: 'You nearly broke the platform!',
        errorType: isolateScope.ERROR.COMPILE,
        severity: 1,
        lineNumber: 1,
        sourceType: SOURCE_TYPE.TRANSFER_FUNCTION
      };

      const editor = {
        addLineClass: jasmine.createSpy('addLineClass'),
        lineCount: () => 1,
        getLine: () => '',
        removeLineClass: angular.noop
      };

      spyOn(codeEditorsServices, 'getEditor').and.returnValue(editor);
      isolateScope.onNewErrorMessageReceived(msg);
    });

    it('should ignore state machine errors', function() {
      var errorType = isolateScope.ERROR.RUNTIME;
      var msg = {
        functionName: 'tf1',
        message: 'You nearly broke the platform!',
        errorType: errorType,
        severity: 1,
        sourceType: SOURCE_TYPE.STATE_MACHINE
      };
      isolateScope.onNewErrorMessageReceived(msg);
      expect(transferFunctions[0].error[errorType]).toBeUndefined();
    });

    it('should select transfer functions correctly', function() {
      isolateScope.selectTransferFunction('tf1');
      expect(isolateScope.transferFunction).toEqual(expectedTf1);
      expect(isolateScope.transferFunction.name).toEqual('tf1');
      isolateScope.selectTransferFunction('tf2');
      expect(isolateScope.transferFunction).toEqual(expectedTf2);
      expect(isolateScope.transferFunction.name).toEqual('tf2');
      // rename tf2
      isolateScope.selectTransferFunction('tf3');
      expect(isolateScope.transferFunction.id).toEqual(1);
      expect(isolateScope.transferFunction.name).toEqual('tf3');
      isolateScope.selectTransferFunction('tf1');
      expect(isolateScope.transferFunction).toEqual(expectedTf1);
      // changed name is reset
      expect(isolateScope.transferFunctions[1].name).toEqual('tf2');
    });

    it('should change to rawscript panel when selecting a faulty transfer functions', function() {
      isolateScope.centerPanelTabSelection = 'script';
      isolateScope.selectTransferFunction('faultyTf');

      expect(isolateScope.transferFunction).toEqual(expectedFaultyTf);
      expect(isolateScope.centerPanelTabSelection).toBe('rawscript');
    });

    it('should create a new tf correctly', function() {
      isolateScope.transferFunction = expectedTf1;
      isolateScope.transferFunction.name = 'tf3';
      isolateScope.createNewTF();
      expect(isolateScope.transferFunctions.length).toEqual(4);
      expect(isolateScope.transferFunction.topics).toEqual([]);
      expect(isolateScope.transferFunction.variables).toEqual([]);
      expect(isolateScope.transferFunction.devices).toEqual([]);
    });

    it('should create a new monitor correctly', function() {
      isolateScope.transferFunction = expectedTf1;
      isolateScope.transferFunction.name = 'tf3';
      // in case no neurons are selected, nothing happens
      isolateScope.createNewMonitor();
      expect(isolateScope.transferFunctions.length).toEqual(3);
      // if neurons are selected, a new monitor tf is created
      isolateScope.selectedPopulation = expectedPopulation1;
      isolateScope.createNewMonitor();
      expect(isolateScope.transferFunctions.length).toEqual(4);
      expect(isolateScope.transferFunction.topics).toEqual([
        {
          name: 'publisher',
          topic: 'a monitoring topic',
          type: 'monitor topic',
          publishing: true
        }
      ]);
      expect(isolateScope.transferFunction.variables).toEqual([]);
      expect(isolateScope.transferFunction.devices).toEqual([
        {
          name: 'device',
          type: 'LeakyIntegratorAlpha',
          neurons: {
            name: 'sensors',
            start: 0,
            step: 2,
            stop: 3,
            type: 1,
            ids: []
          }
        }
      ]);
    });

    it('should not create tfs that already exist', function() {
      isolateScope.transferFunction = expectedTf1;
      isolateScope.createNewTF();
      isolateScope.createNewTF();
      expect(isolateScope.transferFunctions.length).toEqual(5);
      expect(isolateScope.transferFunctions[0].name).not.toEqual(
        isolateScope.transferFunctions[2].name
      );
      expect(isolateScope.transferFunctions[3].name).not.toEqual(
        isolateScope.transferFunctions[2].name
      );
    });

    it('should not create monitors that already exist', function() {
      isolateScope.transferFunction = expectedTf1;
      isolateScope.selectedPopulation = expectedPopulation1;
      isolateScope.createNewMonitor();
      isolateScope.createNewMonitor();
      expect(isolateScope.transferFunctions.length).toEqual(5);
      expect(isolateScope.transferFunctions[0].name).not.toEqual(
        isolateScope.transferFunctions[2].name
      );
      expect(isolateScope.transferFunctions[3].name).not.toEqual(
        isolateScope.transferFunctions[2].name
      );
    });

    it('should create a new variable correctly', function() {
      isolateScope.selectTransferFunction('tf1');
      isolateScope.addNewVariable('variable');
      expect(isolateScope.transferFunction.variables.length).toEqual(1);
      expect(isolateScope.transferFunction.variables[0]).toEqual({
        name: 'variable',
        initial_value: '0',
        type: 'int',
        showDetails: true
      });
    });

    it('should set a topic name accordingly', function() {
      var topic = expectedTf1.topics[0];
      topic.isDefault = true;
      isolateScope.setTopicName(topic);
      expect(topic.name).toEqual('__return__');
      topic.isDefault = false;
      isolateScope.setTopicName(topic);
      expect(topic.name).not.toEqual('__return__');
    });

    it('should create a new topic channel correctly', function() {
      isolateScope.selectTransferFunction('tf1');
      isolateScope.selectedTopic = expectedTopic2;
      isolateScope.createTopicChannel(true);
      expect(isolateScope.transferFunction.topics.length).toEqual(2);
      expect(isolateScope.transferFunction.topics[1]).toEqual({
        name: 'topic',
        topic: '/foo/bar',
        type: 'FooBar',
        publishing: true
      });
    });

    it('should create a new device channel correctly', function() {
      isolateScope.selectTransferFunction('tf1');
      expect(isolateScope.transferFunction.devices.length).toEqual(1);

      isolateScope.selectedPopulation = expectedPopulation1;
      isolateScope.createDevice();
      expect(isolateScope.transferFunction.devices.length).toEqual(2);
      expect(isolateScope.transferFunction.devices[1]).toEqual({
        name: 'device',
        type: 'LeakyIntegratorAlpha',
        neurons: {
          name: 'sensors',
          start: 0,
          step: 2,
          stop: 3,
          type: 1,
          ids: []
        }
      });

      isolateScope.selectedPopulation = expectedPopulation2;
      isolateScope.createDevice();
      expect(isolateScope.transferFunction.devices.length).toEqual(3);
      expect(isolateScope.transferFunction.devices[2]).toEqual({
        name: 'device2',
        type: 'LeakyIntegratorAlpha',
        neurons: {
          name: 'actors',
          start: 0,
          step: 1,
          stop: 1,
          type: 0,
          ids: []
        }
      });

      isolateScope.selectedPopulation.gids[0].selected = false;
      isolateScope.createDevice();
      expect(isolateScope.transferFunction.devices.length).toEqual(3);

      isolateScope.selectedPopulation = expectedPopulation3;
      isolateScope.createDevice();
      expect(isolateScope.transferFunction.devices.length).toEqual(4);
      expect(isolateScope.transferFunction.devices[3]).toEqual({
        name: 'device3',
        type: 'LeakyIntegratorAlpha',
        neurons: {
          name: 'foobars',
          start: 0,
          step: undefined,
          stop: 4,
          type: 2,
          ids: [0, 1, 3]
        }
      });
    });

    it('should delete a variable correctly', function() {
      isolateScope.selectTransferFunction('tf2');
      expect(isolateScope.transferFunction.variables.length).toEqual(1);
      isolateScope.deleteVariable(isolateScope.transferFunction.variables[0]);
      expect(isolateScope.transferFunction.variables.length).toEqual(0);
    });

    it('should delete a topic correctly', function() {
      isolateScope.selectTransferFunction('tf2');
      expect(isolateScope.transferFunction.topics.length).toEqual(1);
      isolateScope.deleteTopic(isolateScope.transferFunction.topics[0]);
      expect(isolateScope.transferFunction.topics.length).toEqual(0);
    });

    it('should delete a device correctly', function() {
      isolateScope.selectTransferFunction('tf2');
      expect(isolateScope.transferFunction.devices.length).toEqual(1);
      isolateScope.deleteDevice(isolateScope.transferFunction.devices[0]);
      expect(isolateScope.transferFunction.devices.length).toEqual(0);
    });

    describe('with CSV recorders', function() {
      var csvRecorder;

      beforeEach(function() {
        csvRecorder = {
          name: 'csv1',
          type: 'csv',
          initial_value:
            '{"filename":"results.csv", "headers":["Name", "Value"]}'
        };
        isolateScope.transferFunctions[0].variables.push(csvRecorder);
      });

      it('should parse csvs correctly', function() {
        isolateScope.parseFilenameAndHeaders(csvRecorder);
        expect(csvRecorder.filename).toEqual('results.csv');
        expect(csvRecorder.headers).toEqual(['Name', 'Value']);

        var test2 = {
          name: 'test2',
          type: 'csv',
          initial_value: '{"filename":"results.csv"}'
        };
        isolateScope.parseFilenameAndHeaders(test2);
        expect(test2.filename).toEqual('results.csv');
        expect(test2.headers).toEqual([]);

        csvRecorder.type = 'retina';
        isolateScope.parseFilenameAndHeaders(csvRecorder);
        expect(csvRecorder.filename).not.toBeDefined();
        expect(csvRecorder.headers).not.toBeDefined();
      });

      it('should add headers correctly', function() {
        isolateScope.parseFilenameAndHeaders(csvRecorder);
        isolateScope.addHeader(csvRecorder, 'StdDev');
        expect(csvRecorder.filename).toEqual('results.csv');
        expect(csvRecorder.headers).toEqual(['Name', 'Value', 'StdDev']);
        expect(JSON.parse(csvRecorder['initial_value'])).toEqual({
          filename: 'results.csv',
          headers: ['Name', 'Value', 'StdDev']
        });
      });

      it('should remove headers correctly', function() {
        isolateScope.parseFilenameAndHeaders(csvRecorder);
        isolateScope.deleteHeader(csvRecorder, 'Name');
        expect(csvRecorder.filename).toEqual('results.csv');
        expect(csvRecorder.headers).toEqual(['Value']);
        expect(JSON.parse(csvRecorder['initial_value'])).toEqual({
          filename: 'results.csv',
          headers: ['Value']
        });
      });
    });

    it(' updateCurrentTFContent should refresh its content', function() {
      spyOn(isolateScope, 'refresh').and.callThrough();
      spyOn(
        isolateScope,
        'populateTransferFunctionsWithRawCode'
      ).and.callThrough();

      isolateScope.centerPanelTabSelection = 'rawscript';
      isolateScope.updateCurrentTFContent();
      expect(
        isolateScope.populateTransferFunctionsWithRawCode
      ).toHaveBeenCalled();

      isolateScope.centerPanelTabSelection = 'script';
      isolateScope.updateCurrentTFContent();
      expect(isolateScope.refresh).toHaveBeenCalled();
    });

    it('rawToStructured should convert raw script', function() {
      var callbackHasBeenCalled = false;

      var tf = {
        name: 'test',
        rawCode: `@nrp.Robot2Neuron()
      def tf1(t):
          pass)`
      };

      isolateScope.transferFunction = { name: 'tf1', code: 'return 42' };
      isolateScope.transferFunctions = [isolateScope.transferFunction];
      var structuredTransferFunction = {
        name: 'tf1',
        code: 'return 42',
        devices: []
      };

      $httpBackend
        .whenPUT(
          'http://bbpce016.epfl.ch:8080/simulation/mocked_simulation_id/convert-raw-tf-to-structured'
        )
        .respond(200, { structuredScript: structuredTransferFunction });
      isolateScope.rawToStructured(tf, () => {
        callbackHasBeenCalled = true;
      });
      $httpBackend.flush();

      expect(callbackHasBeenCalled).toBe(true);
    });

    it('rawToStructured should handle error', function() {
      var callbackHasBeenCalled = false;

      var tf = {
        name: 'test',
        rawCode: `@nrp.Robot2Neuron()
      def tf1(t):
          pass)`
      };

      isolateScope.transferFunction = {
        name: 'tf1',
        code: 'return 42',
        error: {}
      };
      isolateScope.transferFunctions = [isolateScope.transferFunction];

      $httpBackend
        .whenPUT(
          'http://bbpce016.epfl.ch:8080/simulation/mocked_simulation_id/convert-raw-tf-to-structured'
        )
        .respond(200, { error: 'This an error', name: 'tf1' });
      isolateScope.rawToStructured(tf, () => {
        callbackHasBeenCalled = true;
      });
      $httpBackend.flush();

      expect(callbackHasBeenCalled).toBe(true);
    });

    it('structuredToRaw should convert script to raw', function() {
      isolateScope.transferFunction = {
        name: 'test',
        code: 'return 42',
        devices: []
      };
      isolateScope.transferFunctions = [isolateScope.transferFunction];

      $httpBackend
        .whenPUT(
          'http://bbpce016.epfl.ch:8080/simulation/mocked_simulation_id/convert-structured-tf-to-raw'
        )
        .respond(200, { rawScript: 'RAWTEST' });
      isolateScope.structuredToRaw(isolateScope.transferFunction, () => {});
      $httpBackend.flush();

      expect(isolateScope.transferFunction.rawCode).toBe('RAWTEST');
    });

    it('convertAllDirtyScripts should convert all dirty scripts', function() {
      var structuredTransferFunction = {
        name: 'tf1',
        code: 'return 42',
        devices: [],
        error: {}
      };

      $httpBackend
        .whenPUT(
          'http://bbpce016.epfl.ch:8080/simulation/mocked_simulation_id/convert-raw-tf-to-structured'
        )
        .respond(200, { structuredScript: structuredTransferFunction });

      $httpBackend
        .whenPUT(
          'http://bbpce016.epfl.ch:8080/simulation/mocked_simulation_id/convert-structured-tf-to-raw'
        )
        .respond(200, { rawScript: 'RAWTEST' });

      isolateScope.transferFunction = {
        name: 'test',
        code: 'return 42',
        dirty: true,
        error: {}
      };
      isolateScope.transferFunctions = [isolateScope.transferFunction];

      isolateScope.centerPanelTabSelection = 'script';

      var callbackHasBeenCalled = false;

      isolateScope.convertAllDirtyScripts(() => (callbackHasBeenCalled = true));
      $httpBackend.flush();
      expect(callbackHasBeenCalled).toBe(true);

      callbackHasBeenCalled = false;

      isolateScope.centerPanelTabSelection = 'rawscript';
      isolateScope.convertAllDirtyScripts(() => (callbackHasBeenCalled = true));
      $httpBackend.flush();
      expect(callbackHasBeenCalled).toBe(true);
    });

    it(' centerPanelTabChanged should change panel directly when no tfs are dirty', function() {
      isolateScope.switchingToNewTab = null;
      isolateScope.nTransferFunctionDirty = 0;
      isolateScope.centerPanelTabSelection = 'rawscript';

      isolateScope.centerPanelTabChanged('script');
      expect(isolateScope.centerPanelTabSelection).toBe('script');
    });

    it(' centerPanelTabChanged should call convertAllDirtyScripts', function() {
      spyOn(isolateScope, 'convertAllDirtyScripts').and.callThrough();

      isolateScope.nTransferFunctionDirty = 1;
      isolateScope.centerPanelTabChanged('rawscript');
      expect(isolateScope.convertAllDirtyScripts).toHaveBeenCalled();

      isolateScope.nTransferFunctionDirty = 1;
      isolateScope.centerPanelTabChanged('script');
      expect(isolateScope.convertAllDirtyScripts).toHaveBeenCalled();
    });

    it(' centerPanelTabChanged should not change from rawscript to script when TF is faulty', function() {
      spyOn(isolateScope, 'updateCurrentTFContent').and.callThrough();
      let faultyTf = { code: null }; // faulty TF

      isolateScope.transferFunction = faultyTf;
      isolateScope.centerPanelTabSelection = 'rawscript';

      isolateScope.centerPanelTabChanged('script');
      expect(isolateScope.updateCurrentTFContent).not.toHaveBeenCalled();
    });

    it('should handle reset', function() {
      isolateScope.populations = [{}, {}];
      isolateScope.$broadcast('RESET', RESET_TYPE.RESET_FULL);
      expect(isolateScope.populations.length).toBe(0);
    });

    it('should apply transfer functions correctly', function() {
      expect(isolateScope.transferFunctions.length).toEqual(3);
      isolateScope.selectTransferFunction('tf2');
      expect(isolateScope.transferFunction.local).toBeTruthy();
      isolateScope.apply();
      expect(
        backendInterfaceService.setStructuredTransferFunction
      ).toHaveBeenCalledWith(isolateScope.transferFunction);

      isolateScope.$apply();

      expect(isolateScope.transferFunction.local).toBeFalsy();
      expect(isolateScope.transferFunctions.length).toEqual(3);
      expect(isolateScope.transferFunction.name).toEqual('tf2');
    });

    it('should apply raw script correctly', function() {
      isolateScope.centerPanelTabSelection = 'rawscript';

      isolateScope.transferFunctions[0].rawCode =
        '@nrp.Robot2Neuron()\ndef tf1(t):\n    pass';
      isolateScope.transferFunctions[1].rawCode =
        '@nrp.Robot2Neuron()\ndef tf2(t):\n    pass';

      expect(isolateScope.transferFunctions.length).toEqual(3);
      isolateScope.selectTransferFunction('tf2');
      expect(isolateScope.transferFunction.local).toBeTruthy();
      isolateScope.apply(); //apply TF

      isolateScope.$apply();

      expect(isolateScope.transferFunction.local).toBeFalsy();
      expect(isolateScope.transferFunctions.length).toEqual(3);
      expect(isolateScope.transferFunction.name).toEqual('tf2');
    });

    it('should apply handle duplicate name in raw script correctly', function() {
      isolateScope.centerPanelTabSelection = 'rawscript';

      isolateScope.transferFunctions[0].rawCode =
        '@nrp.Robot2Neuron()\ndef tf2(t):\n    pass';
      isolateScope.transferFunctions[1].rawCode =
        '@nrp.Robot2Neuron()\ndef tf2(t):\n    pass';

      expect(isolateScope.transferFunctions.length).toEqual(3);
      isolateScope.selectTransferFunction('tf2');
      expect(isolateScope.transferFunction.local).toBeTruthy();
      isolateScope.apply();
      expect(isolateScope.transferFunction.local).toBeTruthy();
    });

    it('populateTransferFunctionsWithRawCode should populate raw function', function() {
      isolateScope.populateTransferFunctionsWithRawCode();
      let tfs = isolateScope.transferFunctions;
      expect(tfs[0].rawCode).toBe('pass');

      let lastTf = tfs[tfs.length - 1];
      expect(isolateScope.isTfFaulty(lastTf)).toBe(true);
    });

    it('should decide on a tf type correctly', function() {
      expectedTf1.type = undefined;
      isolateScope.setTFtype(expectedTf1);
      expect(expectedTf1.type).toEqual(TRANSFER_FUNCTION_TYPE.NEURON2ROBOT);
      expectedTf2.type = undefined;
      isolateScope.setTFtype(expectedTf2);
      expect(expectedTf2.type).toEqual(TRANSFER_FUNCTION_TYPE.ROBOT2NEURON);
      //it overrides a type if a default is present
      expectedTf1.type = TRANSFER_FUNCTION_TYPE.ROBOT2NEURON;
      isolateScope.setTFtype(expectedTf1);
      expect(expectedTf1.type).toEqual(TRANSFER_FUNCTION_TYPE.ROBOT2NEURON);
      expectedTf1.topics[0].name = '__return__';
      isolateScope.setTFtype(expectedTf1);
      expect(expectedTf1.type).toEqual(TRANSFER_FUNCTION_TYPE.NEURON2ROBOT);
    });

    it('should delete transfer functions correctly', function() {
      let getTransferFunctionsResponseCopy = angular.copy(
        getTransferFunctionResponse
      );
      let savedGetTransferFunctions =
        backendInterfaceService.getTransferFunctions;

      backendInterfaceService.getTransferFunctions = function(callback) {
        callback(getTransferFunctionsResponseCopy);
        return {
          then: callback
        };
      };

      let deleteFromGetTransferFunctionsResponse = function(tfName) {
        delete getTransferFunctionsResponseCopy['data'][tfName];
        delete getTransferFunctionsResponseCopy['active'][tfName];
      };

      let savedDeleteTransferFunction =
        backendInterfaceService.deleteTransferFunction;

      backendInterfaceService.deleteTransferFunction = jasmine
        .createSpy('deleteTransferFunction')
        .and.callFake(function(tfName, callback) {
          deleteFromGetTransferFunctionsResponse(tfName);
          return {
            then: callback
          };
        });

      deleteFromGetTransferFunctionsResponse('tf2');
      expect(isolateScope.transferFunctions.length).toEqual(3);
      isolateScope.selectTransferFunction('tf2');
      isolateScope.delete();

      expect(isolateScope.transferFunctions.length).toEqual(2);
      expect(
        backendInterfaceService.deleteTransferFunction
      ).not.toHaveBeenCalled(); // tf2 is local
      expect(isolateScope.transferFunction).not.toBeNull();

      isolateScope.selectTransferFunction('tf1');
      isolateScope.delete();

      expect(isolateScope.transferFunctions.length).toEqual(1);
      expect(backendInterfaceService.deleteTransferFunction).toHaveBeenCalled();
      expect(isolateScope.transferFunction).not.toBeNull();

      isolateScope.selectTransferFunction('faultyTf');
      isolateScope.delete();

      expect(isolateScope.transferFunctions.length).toEqual(0);
      expect(backendInterfaceService.deleteTransferFunction).toHaveBeenCalled();
      expect(isolateScope.transferFunction).toBeNull();

      //restore standard mocks
      backendInterfaceService.getTransferFunctions = savedGetTransferFunctions;
      backendInterfaceService.deleteTransferFunction = savedDeleteTransferFunction;
    });

    it('should save transfer functions to file', function() {
      isolateScope.centerPanelTabSelection = 'rawscript';

      spyOn(downloadFileService, 'downloadFile');
      spyOn(window, 'Blob').and.returnValue({});
      var href = 'http://some/url';
      var URLMock = {
        createObjectURL: jasmine
          .createSpy('createObjectURL')
          .and.returnValue(href)
      };
      window.URL = URLMock;
      isolateScope.download();
      expect(URLMock.createObjectURL).toHaveBeenCalled();
      expect(downloadFileService.downloadFile).toHaveBeenCalledWith(
        href,
        'transferFunctions.py'
      );

      isolateScope.centerPanelTabSelection = 'script';
      isolateScope.download();
      expect(URLMock.createObjectURL).toHaveBeenCalled();
    });

    it('should be able to load tf from file', function() {
      var readAsTextSpy = jasmine.createSpy('readAsTextSpy');
      var tfNameMock = ['superPythonFn', 'anotherCoolFn'];

      var transferFunctionsCode = _.map(tfNameMock, function(fnName) {
        var code =
          '@decorate-my-furniture\n' +
          '@nrp.Robot2Neuron()\n' +
          'def ' +
          fnName +
          ' (someParam1, someParam2):\n' +
          '    insert awesome python code here\n' +
          '    and here for multi-line awesomeness';
        return code;
      });

      var tfFileMock = transferFunctionsCode.join('\n');
      var fileReaderMock = {
        readAsText: readAsTextSpy
      };
      var eventMock = {
        target: { result: tfFileMock }
      };
      spyOn(window, 'FileReader').and.returnValue(fileReaderMock);
      spyOn(codeEditorsServices, 'getEditor').and.returnValue(editorMock);
      isolateScope.upload('someFile');
      expect(window.FileReader).toHaveBeenCalled();
      expect(readAsTextSpy).toHaveBeenCalled();
      fileReaderMock.onload(eventMock);
      isolateScope.$digest();
      isolateScope.transferFunctions = [
        new ScriptObject('tf', 'some unimportant code')
      ];
      $timeout.flush();
    });

    it('should correctly saveTFIntoCollabStorage with rawscript', function() {
      isolateScope.centerPanelTabSelection = 'rawscript';

      expect(isolateScope.isSavingToCollab).toEqual(false);
      isolateScope.saveTFIntoCollabStorage();

      // isolateScope.$apply;

      expect(
        backendInterfaceService.saveTransferFunctions
      ).toHaveBeenCalledWith(
        _.map(isolateScope.transferFunctions, 'rawCode'),
        jasmine.any(Function),
        jasmine.any(Function)
      );

      expect(isolateScope.isSavingToCollab).toEqual(true);
      backendInterfaceService.saveTransferFunctions.calls.argsFor(0)[1]();
      expect(isolateScope.isSavingToCollab).toBe(false);
      isolateScope.isSavingToCollab = true;

      spyOn(clbErrorDialog, 'open');
      backendInterfaceService.saveTransferFunctions.calls.argsFor(0)[2]();
      expect(isolateScope.isSavingToCollab).toBe(false);
      expect(clbErrorDialog.open).toHaveBeenCalled();
      clbErrorDialog.open.calls.reset();
    });

    it('should correctly saveTFIntoCollabStorage with script', function() {
      isolateScope.centerPanelTabSelection = 'script';

      expect(isolateScope.isSavingToCollab).toEqual(false);
      isolateScope.saveTFIntoCollabStorage();

      isolateScope.$apply();

      expect(
        backendInterfaceService.saveTransferFunctions
      ).toHaveBeenCalledWith(
        _.map(isolateScope.transferFunctions, 'rawCode'),
        jasmine.any(Function),
        jasmine.any(Function)
      );
    });

    it('should set the saving flag correctly if csv saving succeed', function() {
      expect(isolateScope.isSavingCSVToCollab).toBeFalsy();
      isolateScope.saveCSVIntoCollabStorage();
      expect(
        backendInterfaceServiceMock.saveCSVRecordersFiles
      ).toHaveBeenCalled();
      expect(isolateScope.isSavingCSVToCollab).toBe(true);
      backendInterfaceServiceMock.saveCSVRecordersFiles.calls
        .mostRecent()
        .args[1]();
      expect(isolateScope.isSavingCSVToCollab).toBe(false);
    });

    it('should set the saving flag correctly if csv saving failed', function() {
      expect(isolateScope.isSavingCSVToCollab).toBeFalsy();
      isolateScope.saveCSVIntoCollabStorage();
      expect(
        backendInterfaceServiceMock.saveCSVRecordersFiles
      ).toHaveBeenCalled();
      expect(isolateScope.isSavingCSVToCollab).toBe(true);
      backendInterfaceServiceMock.saveCSVRecordersFiles.calls
        .mostRecent()
        .args[1]();
      expect(isolateScope.isSavingCSVToCollab).toBe(false);
    });

    it('autosave should call callback if autosave work found', function() {
      const data = [{ name: 'tf1', error: {} }];
      registerFoundAutoSavedCallback.calls.first().args[1](data, false);

      expect(isolateScope.transferFunctions[0].name).toBe('tf1');
    });

    it('should support toggleActive', function() {
      var tf = { active: false, code: 'some code' };

      isolateScope.toggleActive(tf);
      expect(tf.active).toBe(true);

      shouldUseErrorCallback = true;
      isolateScope.toggleActive(tf);

      expect(tf.active).toBe(true);
      shouldUseErrorCallback = false;
    });

    it('should not call toggleActive on faulty TFs', function() {
      var tf = { active: false, code: null };

      isolateScope.toggleActive(tf);
      expect(tf.active).toBe(false);
    });

    it('should change the name of TF correctly', function() {
      isolateScope.centerPanelTabSelection = 'rawscript';

      isolateScope.transferFunctions[0].rawCode =
        '@nrp.Robot2Neuron()\ndef tf1(t):\n    pass';
      isolateScope.transferFunctions[1].rawCode =
        '@nrp.Robot2Neuron()\ndef tf2(t):\n    pass';

      expect(isolateScope.transferFunctions.length).toEqual(3);
      isolateScope.selectTransferFunction('tf2');
      expect(isolateScope.transferFunction.local).toBeTruthy();
      isolateScope.setNameTf();

      isolateScope.$apply();

      expect(isolateScope.transferFunction.local).toBeFalsy();
      expect(isolateScope.transferFunctions.length).toEqual(3);
    });
  });
});
