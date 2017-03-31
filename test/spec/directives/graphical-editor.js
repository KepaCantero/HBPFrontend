'use strict';

describe('Directive: graphicalEditor', function () {

	var $rootScope, $compile, $httpBackend, $log, $timeout, $scope, isolateScope,
    transferFunctions, element, backendInterfaceService,
    currentStateMock, roslib, stateService, STATE, documentationURLs,
    SIMULATION_FACTORY_CLE_ERROR, SOURCE_TYPE, TRANSFER_FUNCTION_TYPE, pythonCodeHelper,
    ScriptObject, simulationInfo, hbpDialogFactory;

	var backendInterfaceServiceMock = {
	  getPopulations: jasmine.createSpy('getPopulations'),
    getStructuredTransferFunctions: jasmine.createSpy('getStructuredTransferFunctions'),
    setStructuredTransferFunction: jasmine.createSpy('setStructuredTransferFunction'),
    deleteTransferFunction: jasmine.createSpy('deleteTransferFunction'),
    getServerBaseUrl: jasmine.createSpy('getServerBaseUrl'),
    saveTransferFunctions: jasmine.createSpy('saveTransferFunctions'),
	  getTopics: jasmine.createSpy('getTopics'),
  };

	var documentationURLsMock =
	{
		getDocumentationURLs: function() {
		  return {
			then: function(callback) {
			  return callback({cleDocumentationURL: 'cleDocumentationURL',
				backendDocumentationURL: 'backendDocumentationURL'});}
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
	roslibMock.getOrCreateConnectionTo = jasmine.createSpy('getOrCreateConnectionTo').and.returnValue({});
	roslibMock.createTopic = jasmine.createSpy('createTopic').and.returnValue(returnedConnectionObject);

	beforeEach(module('exdFrontendApp'));
	beforeEach(module('exd.templates')); // import html template
	beforeEach(module('currentStateMockFactory'));
	beforeEach(module(function ($provide) {
		$provide.value('backendInterfaceService', backendInterfaceServiceMock);
		$provide.value('documentationURLs', documentationURLsMock);
		$provide.value('stateService', currentStateMock);
		$provide.value('roslib', roslibMock);
		$provide.value('simulationInfo', simulationInfoMock);
	}));

	var editorMock = {};
	beforeEach(inject(function (_$rootScope_,
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
                              _simulationInfo_,
                              _hbpDialogFactory_) {
    simulationInfo = _simulationInfo_;
    $rootScope = _$rootScope_;
    $compile = _$compile_;
    $httpBackend = _$httpBackend_;
    $log = _$log_;
    $timeout = _$timeout_;
    documentationURLs = _documentationURLs_;
    roslib = _roslib_;
    STATE = _STATE_;
    SIMULATION_FACTORY_CLE_ERROR = _SIMULATION_FACTORY_CLE_ERROR_;
    SOURCE_TYPE = _SOURCE_TYPE_;
    TRANSFER_FUNCTION_TYPE = _TRANSFER_FUNCTION_TYPE_;
    stateService = _stateService_;
    backendInterfaceService = _backendInterfaceService_;
    currentStateMock = _currentStateMockFactory_.get().stateService;
    editorMock.getLineHandle = jasmine.createSpy('getLineHandle').and.returnValue(0);
    editorMock.addLineClass = jasmine.createSpy('addLineClass');
    editorMock.removeLineClass = jasmine.createSpy('removeLineClass');
    pythonCodeHelper = _pythonCodeHelper_;
    ScriptObject = pythonCodeHelper.ScriptObject;
    hbpDialogFactory = _hbpDialogFactory_;

    $scope = $rootScope.$new();
    $templateCache.put('views/esv/graphical-editor.html', '');
    $scope.control = {};
    element = $compile('<graphical-editor control="control"/>')($scope);
    $scope.$digest();
    isolateScope = element.isolateScope();
    transferFunctions = isolateScope.transferFunctions;
  }));

  it('should init the populations, topics and transfer functions', function () {
    $scope.control.refresh();
	  expect(isolateScope.populations).toEqual([]);
    expect(isolateScope.topics).toEqual([]);
	  expect(isolateScope.transferFunctions).toEqual([]);
	  expect(backendInterfaceService.getStructuredTransferFunctions).toHaveBeenCalled();
  });

  it('should populate the populations', function () {
	  $scope.control.refresh();
	  expect(backendInterfaceService.getPopulations).toHaveBeenCalled();
  });

  it('should populate the topics', function () {
	  $scope.control.refresh();
	  expect(backendInterfaceService.getTopics).toHaveBeenCalled();
  });

  it('should print populations nicely', function() {
    expect(isolateScope.getFriendlyPopulationName({'type': 1, 'start': 0, 'step': 8, 'stop': 15, 'name': 'foo'})).toEqual('foo[0:8:15]');
    expect(isolateScope.getFriendlyPopulationName({'type': 1, 'start': 0, 'step': 1, 'stop': 15, 'name': 'foo'})).toEqual('foo[0:15]');
    expect(isolateScope.getFriendlyPopulationName({'type': 2, 'gids': [0, 8, 15], 'name': 'foo'})).toEqual('foo[0,8,15]');
    expect(isolateScope.getFriendlyPopulationName({'type': 3, 'name': 'foo'})).toEqual('foo');
  });

  it('should print topics nicely', function() {
    expect(isolateScope.getFriendlyTopicName({'publishing': true, 'topic': 'foo'})).toEqual('publishes on foo');
    expect(isolateScope.getFriendlyTopicName({'publishing': false, 'topic': 'bar'})).toEqual('subscribes to bar');
  });

  it('does nothing on apply or delete if no transfer function present', function() {
    expect(isolateScope.transferFunction).toBeNull();
    isolateScope.apply();
    isolateScope.delete();
  });

  it('loads transfer functions correctly', function() {
    isolateScope.transferFunction = {'name': 'tf1', 'code': 'return 42'};
    isolateScope.transferFunctions = [isolateScope.transferFunction];
    isolateScope.loadTransferFunctions({
      'transferFunctions': [
        {
          'name': 'tf1',
          'type': 1,
          'devices': [0,8,15],
          'topics': [{
            'name': 'sub'
          }],
          'variables': [{
            'type': 'csv',
            'initial_value': '{"filename":"results.csv", "headers": ["Name", "Value"]}'
          }],
          'code': 'pass'
        },
        {
          'name': 'tf2',
          'type': 2,
          'devices': [],
          'variables': [],
          'topics': [{
            'name': '__return__'
          }],
          'code': 'raise Exception()'
        }
      ]
    });
    expect(isolateScope.transferFunctions.length).toEqual(2);
    expect(isolateScope.transferFunctions[0].devices).toEqual([0,8,15]);
    expect(isolateScope.transferFunctions[0].topics).toEqual([{'name': 'sub', 'isDefault': false}]);
    expect(isolateScope.transferFunctions[0].variables).toEqual([{
      'type': 'csv',
      'initial_value': '{"filename":"results.csv", "headers": ["Name", "Value"]}',
      'headers': ['Name', 'Value'],
      'filename': 'results.csv'
    }]);
    expect(isolateScope.transferFunctions[0].code).toEqual('pass');
    expect(isolateScope.transferFunctions[1].devices).toEqual([]);
    expect(isolateScope.transferFunctions[1].topics).toEqual([{'name': '__return__', 'isDefault': true}]);
    expect(isolateScope.transferFunctions[1].variables).toEqual([]);
    expect(isolateScope.transferFunctions[1].code).toEqual('raise Exception()');
  });

  it('loads populations correctly', function () {
    expect(isolateScope.populations.length).toEqual(0);
    isolateScope.loadPopulations({
      'populations': [
        {
          'name': 'actors', 'neuron_model': 'FakeNeuron', 'gids': [0, 8, 15],
          'parameters': [
            { 'parameterName': 'E', 'value': 42 }
          ]
        }
      ]
    });
    expect(isolateScope.populations.length).toEqual(1);
    expect(isolateScope.populations[0]).toEqual({
      'name': 'actors',
      'neuron_model': 'FakeNeuron',
      'tooltip': 'E: 42\n',
      'gids': [
        { 'id': 0, 'selected': false },
        { 'id': 8, 'selected': false },
        { 'id': 15, 'selected': false }
      ]
    });
  });

  it('loads topics correctly', function() {
    isolateScope.loadTopics({ 'topics': [0, 8, 15]});
    expect(isolateScope.topics).toEqual([0,8,15]);
  });

  it('should toggle neurons correctly', function() {
    var neurons = [
      { 'selected': true},
      { 'selected': true},
      { 'selected': false}
    ];
    isolateScope.selectedPopulation = { 'gids': neurons};
    isolateScope.toggleNeuron(neurons[0], true);
    expect(isolateScope.isNeuronsSelected).toBeTruthy();
    isolateScope.toggleNeuron(neurons[1], true);
    expect(isolateScope.isNeuronsSelected).toBeFalsy();
    neurons[2].selected = true;
    isolateScope.toggleNeuron(neurons[2], false);
    expect(isolateScope.isNeuronsSelected).toBeTruthy();
  });

  describe('with loaded transfer functions', function() {
    var expectedTf1, expectedTf2;
    var expectedTopic1, expectedTopic2;
    var expectedPopulation1, expectedPopulation2, expectedPopulation3;
    var expected = [];

    beforeEach(function () {
      $scope.control.refresh();
      expectedTf1 = new ScriptObject('tf1', 'return 42');
      expectedTf1.type = TRANSFER_FUNCTION_TYPE.NEURON2ROBOT;
      expectedTf1.oldName = 'tf1';
      expectedTf1.local = false;
      expectedTf1.devices = [
        {
          'name': 'device1',
          'type': 'LeakyIntegratorAlpha',
          'neurons': {
            'name': 'sensors',
            'start': 0,
            'step': 8,
            'stop': 15,
            'type': 1
          }
        }
      ];
      expectedTf1.topics = [
        {
          'name': 'foo',
          'topic': '/bar',
          'topicType': 'Device',
          'publishing': true
        }
      ];
      expectedTf1.variables = [];
      expectedTf2 = new ScriptObject('tf2', 'pass');
      expectedTf2.type = TRANSFER_FUNCTION_TYPE.NEURON2ROBOT;
      expectedTf2.oldName = 'tf2';
      expectedTf2.local = true;
      expectedTf2.devices = [
        {
          'name': 'device1',
          'type': 'Poisson',
          'neurons': {
            'name': 'actors',
            'type': 0
          }
        }
      ];
      expectedTf2.topics = [
        {
          'name': 'foo',
          'topic': '/bar',
          'topicType': 'Device',
          'publishing': false
        }
      ];
      expectedTf2.variables = [{
        'name': 'bar',
        'initial_value': '42',
        'type': 'int'
      }];
      expected = [expectedTf1, expectedTf2];

      expectedPopulation1 = {
        'name': 'sensors',
        'neuron_model': 'IF_cond_alpha',
        'tooltip': 'This is fake',
        'gids' : [
          { 'id': 0, 'selected': true },
          { 'id': 8, 'selected': false },
          { 'id': 15, 'selected': true }
        ]
      };
      expectedPopulation2 = {
        'name': 'actors',
        'neuron_model': 'IF_cond_alpha',
        'tooltip': 'This is fake',
        'gids' : [
          { 'id': 42, 'selected': true }
        ]
      };
      expectedPopulation3 = {
        'name': 'foobars',
        'neuron_model': 'FakeNeuron',
        'tooltip': 'This is fake',
        'gids' : [
          { 'id': 0, 'selected': true },
          { 'id': 8, 'selected': true },
          { 'id': 15, 'selected': false },
          { 'id': 23, 'selected': true }
        ]
      };
      expectedTopic1 = { 'topic': '/foo', 'topicType': 'Bar' };
      expectedTopic2 = { 'topic': '/foo/bar', 'topicType': 'FooBar' };

      // We now assume that the transferFunctions are already retrieved
      isolateScope.transferFunctions = angular.copy(expected);
      isolateScope.transferFunction = isolateScope.transferFunctions[0];
      isolateScope.selectedTF = expectedTf1.name;
      isolateScope.topics = angular.copy([expectedTopic1, expectedTopic2]);
      isolateScope.populations = angular.copy([expectedPopulation1, expectedPopulation2, expectedPopulation3]);
      transferFunctions = isolateScope.transferFunctions;
    });


    it('should fill the error field of the flawed transfer function', function () {
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

    it('should ignore state machine errors', function () {
      var errorType = isolateScope.ERROR.RUNTIME;
      var msg = { functionName: 'tf1', message: 'You nearly broke the platform!', errorType: errorType, severity: 1, sourceType: SOURCE_TYPE.STATE_MACHINE };
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
      expect(isolateScope.transferFunction.id).toEqual('tf2');
      expect(isolateScope.transferFunction.name).toEqual('tf3');
      isolateScope.selectTransferFunction('tf1');
      expect(isolateScope.transferFunction).toEqual(expectedTf1);
      // changed name is reset
      expect(isolateScope.transferFunctions[1].name).toEqual('tf2');
    });

    it('should create a new tf correctly', function() {
      isolateScope.transferFunction = expectedTf1;
      isolateScope.transferFunction.name = 'tf3';
      isolateScope.createNewTF();
      expect(isolateScope.transferFunctions.length).toEqual(3);
      expect(isolateScope.transferFunction.topics).toEqual([]);
      expect(isolateScope.transferFunction.variables).toEqual([]);
      expect(isolateScope.transferFunction.devices).toEqual([]);
    });

    it('should create a new monitor correctly', function() {
      isolateScope.transferFunction = expectedTf1;
      isolateScope.transferFunction.name = 'tf3';
      // in case no neurons are selected, nothing happens
      isolateScope.createNewMonitor();
      expect(isolateScope.transferFunctions.length).toEqual(2);
      // if neurons are selected, a new monitor tf is created
      isolateScope.selectedPopulation = expectedPopulation1;
      isolateScope.createNewMonitor();
      expect(isolateScope.transferFunctions.length).toEqual(3);
      expect(isolateScope.transferFunction.topics).toEqual([{
        'name': 'publisher',
        'topic': 'a monitoring topic',
        'type': 'monitor topic',
        'publishing': true
      }]);
      expect(isolateScope.transferFunction.variables).toEqual([]);
      expect(isolateScope.transferFunction.devices).toEqual([{
        'name': 'device',
        'type': 'LeakyIntegratorAlpha',
        'neurons': {
          'name': 'sensors',
          'start': 0,
          'step': 2,
          'stop': 3,
          'type': 1,
          'ids': []
        }
      }]);
    });

    it('should not create tfs that already exist', function() {
      isolateScope.transferFunction = expectedTf1;
      isolateScope.createNewTF();
      isolateScope.createNewTF();
      expect(isolateScope.transferFunctions.length).toEqual(4);
      expect(isolateScope.transferFunctions[0].name).not.toEqual(isolateScope.transferFunctions[2].name);
      expect(isolateScope.transferFunctions[3].name).not.toEqual(isolateScope.transferFunctions[2].name);
    });

    it('should not create monitors that already exist', function() {
      isolateScope.transferFunction = expectedTf1;
      isolateScope.selectedPopulation = expectedPopulation1;
      isolateScope.createNewMonitor();
      isolateScope.createNewMonitor();
      expect(isolateScope.transferFunctions.length).toEqual(4);
      expect(isolateScope.transferFunctions[0].name).not.toEqual(isolateScope.transferFunctions[2].name);
      expect(isolateScope.transferFunctions[3].name).not.toEqual(isolateScope.transferFunctions[2].name);
    });

    it('should create a new variable correctly', function() {
      isolateScope.selectTransferFunction('tf1');
      isolateScope.addNewVariable();
      expect(isolateScope.transferFunction.variables.length).toEqual(1);
      expect(isolateScope.transferFunction.variables[0]).toEqual({
        'name': 'variable1',
        'initial_value': '0',
        'type': 'int'
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
        'name': 'topic1',
        'topic': '/foo/bar',
        'type': 'FooBar',
        'publishing': true
      });
    });

    it('should create a new device channel correctly', function() {
      isolateScope.selectTransferFunction('tf1');
      expect(isolateScope.transferFunction.devices.length).toEqual(1);

      isolateScope.selectedPopulation = expectedPopulation1;
      isolateScope.createDevice();
      expect(isolateScope.transferFunction.devices.length).toEqual(2);
      expect(isolateScope.transferFunction.devices[1]).toEqual({
        'name': 'device2',
        'type': 'LeakyIntegratorAlpha',
        'neurons': {
          'name': 'sensors',
          'start': 0,
          'step': 2,
          'stop': 3,
          'type': 1,
          'ids': []
        }
      });

      isolateScope.selectedPopulation = expectedPopulation2;
      isolateScope.createDevice();
      expect(isolateScope.transferFunction.devices.length).toEqual(3);
      expect(isolateScope.transferFunction.devices[2]).toEqual({
        'name': 'device3',
        'type': 'LeakyIntegratorAlpha',
        'neurons': {
          'name': 'actors',
          'start': 0,
          'step': 1,
          'stop': 1,
          'type': 0,
          'ids': []
        }
      });

      isolateScope.selectedPopulation.gids[0].selected = false;
      isolateScope.createDevice();
      expect(isolateScope.transferFunction.devices.length).toEqual(3);

      isolateScope.selectedPopulation = expectedPopulation3;
      isolateScope.createDevice();
      expect(isolateScope.transferFunction.devices.length).toEqual(4);
      expect(isolateScope.transferFunction.devices[3]).toEqual({
        'name': 'device4',
        'type': 'LeakyIntegratorAlpha',
        'neurons': {
          'name': 'foobars',
          'start': 0,
          'step': undefined,
          'stop': 4,
          'type': 2,
          'ids': [0, 1, 3]
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
          'name': 'csv1',
          'type': 'csv',
          'initial_value': '{"filename":"results.csv", "headers":["Name", "Value"]}'
        };
        isolateScope.transferFunctions[0].variables.push(csvRecorder);
      });

      it('should parse csvs correctly', function() {
        isolateScope.parseFilenameAndHeaders(csvRecorder);
        expect(csvRecorder.filename).toEqual('results.csv');
        expect(csvRecorder.headers).toEqual(['Name', 'Value']);

        var test2 = {
          'name': 'test2',
          'type': 'csv',
          'initial_value': '{"filename":"results.csv"}'
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
        /* jshint sub:true*/
        expect(JSON.parse(csvRecorder['initial_value'])).toEqual({'filename':'results.csv', 'headers':['Name', 'Value', 'StdDev']});
      });

      it('should remove headers correctly', function() {
        isolateScope.parseFilenameAndHeaders(csvRecorder);
        isolateScope.deleteHeader(csvRecorder, 'Name');
        expect(csvRecorder.filename).toEqual('results.csv');
        expect(csvRecorder.headers).toEqual(['Value']);
        /* jshint sub:true*/
        expect(JSON.parse(csvRecorder['initial_value'])).toEqual({'filename':'results.csv', 'headers':['Value']});
      });
    });

    it('should apply transfer functions correctly', function() {
      expect(isolateScope.transferFunctions.length).toEqual(2);
      isolateScope.selectTransferFunction('tf2');
      expect(isolateScope.transferFunction.local).toBeTruthy();
      isolateScope.apply();
      expect(backendInterfaceService.setStructuredTransferFunction).toHaveBeenCalledWith(
        isolateScope.transferFunction, jasmine.any(Function), jasmine.any(Function)
      );
      backendInterfaceService.setStructuredTransferFunction.calls.mostRecent().args[1]();
      expect(isolateScope.transferFunction.local).toBeFalsy();
      expect(isolateScope.transferFunctions.length).toEqual(2);
      expect(isolateScope.transferFunction.name).toEqual('tf2');
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
      expect(isolateScope.transferFunctions.length).toEqual(2);
      isolateScope.selectTransferFunction('tf2');
      isolateScope.delete();
      expect(isolateScope.transferFunctions.length).toEqual(1);
      expect(backendInterfaceService.deleteTransferFunction).not.toHaveBeenCalled();
      expect(isolateScope.transferFunction).not.toBeNull();

      isolateScope.selectTransferFunction('tf1');
      isolateScope.delete();
      expect(isolateScope.transferFunctions.length).toEqual(0);
      expect(backendInterfaceService.deleteTransferFunction).toHaveBeenCalled();
      expect(isolateScope.transferFunction).toBeNull();
    });
  });
});
