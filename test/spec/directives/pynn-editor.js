/**
 * Created by Bernd Eckstein on 16.10.15.
 */
'use strict';

describe('Directive: pynnEditor', function() {
  String.prototype.repeat = function(num) {
    return new Array(num + 1).join(this);
  };

  var $rootScope,
    $compile,
    $scope,
    isolateScope,
    element,
    RESET_TYPE,
    backendInterfaceService,
    storageServer,
    $timeout,
    codeEditorsServices,
    simulationInfo,
    clbConfirm;

  var backendInterfaceServiceMock = {
    setBrain: jasmine.createSpy('setBrain')
  };

  var getBrainresponse = {};
  var storageServerMock = {
    getBrain: jasmine
      .createSpy('getBrain')
      .and.callFake(() => window.$q.resolve(getBrainresponse)),
    saveBrain: jasmine
      .createSpy('saveBrain')
      .and.callFake(() => window.$q.resolve()),
    getTransferFunctions: jasmine
      .createSpy('getTransferFunctions')
      .and.callFake(() =>
        window.$q.resolve({ data: { tfname: 'def tf:\n\tbrain.index=0' } })
      ),
    saveTransferFunctions: jasmine
      .createSpy('saveTransferFunctions')
      .and.callFake(() => window.$q.resolve())
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

  var tokenMock = {
    type: 'variable',
    string: 'token'
  };

  var lineMock = {};

  var cmMock = {
    getTokenAt: function() {
      return tokenMock;
    },
    addLineClass: function(/*line, str, str2*/) {
      return lineMock;
    },
    addLineWidget: function(/*line, node, boolean*/) {},
    scrollIntoView: function(/*line*/) {},
    removeLineClass: jasmine.createSpy('removeLineClass'),
    clearHistory: jasmine.createSpy('clearHistory'),
    markClean: jasmine.createSpy('markClean')
  };

  /* eslint-disable camelcase*/
  var errorMock1 = {
    data: {
      error_message: 'ERROR',
      error_line: 0,
      error_column: 1
    }
  };

  var errorMock2 = {
    data: {
      error_message: "Error Message: The name 'token' is not defined",
      error_line: 0,
      error_column: 0
    }
  };

  var downloadFileServiceMock = {
    downloadFile: jasmine.createSpy('downloadFile')
  };

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('userContextServiceMock'));
  beforeEach(module('applyForceServiceMock'));

  beforeEach(
    module(function($provide) {
      $provide.value('backendInterfaceService', backendInterfaceServiceMock);
      $provide.value('storageServer', storageServerMock);
      $provide.value('documentationURLs', documentationURLsMock);
      $provide.value('downloadFileService', downloadFileServiceMock);
    })
  );

  beforeEach(
    inject(function(
      _$rootScope_,
      _$httpBackend_,
      _$compile_,
      _RESET_TYPE_,
      _storageServer_,
      _backendInterfaceService_,
      $templateCache,
      _$timeout_,
      _codeEditorsServices_,
      _simulationInfo_,
      _clbConfirm_
    ) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      RESET_TYPE = _RESET_TYPE_;
      storageServer = _storageServer_;
      backendInterfaceService = _backendInterfaceService_;

      $timeout = _$timeout_;
      codeEditorsServices = _codeEditorsServices_;
      simulationInfo = _simulationInfo_;
      clbConfirm = _clbConfirm_;

      $scope = $rootScope.$new();
      $templateCache.put('views/esv/pynn-editor.html', '');
      $scope.control = {};
      element = $compile('<pynn-editor control="control"/>')($scope);
      $scope.$digest();
      isolateScope = element.isolateScope();
    })
  );

  it('should refresh on start', function() {
    spyOn(isolateScope, 'refresh');
    $timeout.flush();
    expect(isolateScope.refresh).toHaveBeenCalled();
  });

  describe('Get/Set brain, PyNN script', function() {
    var data = {
      brainType: 'py',
      brain: '// A PyNN script',
      data_type: 'text',
      filename: '/path/filename.py',
      populations: {
        list1: { list: [1, 2, 3] },
        index1: { list: [9] },
        slice0: { from: 0, to: 10, step: 1 }
      }
    };
    var data2 = {
      brain_type: 'h5',
      data: '// binary h5 data',
      data_type: 'base64',
      filename: '/path/filename.h5',
      populations: { short_list: { list: [0] } }
    };
    var expectedScript = data.brain;
    var expectedPopulations = [
      {
        list: '1,2,3',
        name: 'list1',
        regex: '^\\b(?!\\bindex1\\b|\\bslice0\\b)([A-z_]+[\\w_]*)$',
        previousName: 'list1'
      },
      {
        list: '9',
        name: 'index1',
        regex: '^\\b(?!\\blist1\\b|\\bslice0\\b)([A-z_]+[\\w_]*)$',
        previousName: 'index1'
      },
      {
        from: 0,
        to: 10,
        step: 1,
        name: 'slice0',
        displayMode: 'range',
        regex: '^\\b(?!\\blist1\\b|\\bindex1\\b)([A-z_]+[\\w_]*)$',
        previousName: 'slice0'
      }
    ];

    beforeEach(function() {
      // Mock functions that access elements that are not available in test environment
      codeEditorsServices.getEditor = jasmine
        .createSpy('getEditor')
        .and.returnValue(cmMock);
      storageServer.getBrain.calls.reset();
      storageServer.saveBrain.calls.reset();
      backendInterfaceService.setBrain.calls.reset();
    });

    it('should apply editor options', function() {
      spyOn(isolateScope, 'applyEditorOptions').and.callThrough();
      $timeout.flush(310);
      isolateScope.$apply();
      expect(isolateScope.applyEditorOptions).toHaveBeenCalled();
    });

    it('should handle the retrieved populations and pynn script properly', function() {
      // Mock getBrain Callback with data as return value
      getBrainresponse = data;

      isolateScope.refresh();
      isolateScope.$apply();
      expect(storageServer.getBrain).toHaveBeenCalled();
      expect(isolateScope.pynnScript.code).toEqual(expectedScript);
      expect(angular.toJson(isolateScope.populations)).toEqual(
        angular.toJson(expectedPopulations)
      );
    });

    it('should show the population help', function() {
      isolateScope.showLocalHelp(true, 'populations');
      expect(isolateScope.localHelpVisible['populations']).toBe(true);
    });

    it('should start/stop editing a population', function() {
      isolateScope.startEditing(isolateScope.populations[0]);
      expect(isolateScope.populations[0].editing).toBe(true);

      spyOn(isolateScope, 'apply').and.callThrough();

      isolateScope.editingFocusLost(isolateScope.populations[0]);

      $timeout.flush(310);
      isolateScope.$apply();

      expect(isolateScope.apply).toHaveBeenCalled();
    });

    it('should not load a h5 brain', function() {
      // Mock getBrain Callback with data2 as return value
      getBrainresponse = data2;

      isolateScope.refresh();
      isolateScope.$apply();
      expect(storageServer.getBrain).toHaveBeenCalled();
      expect(isolateScope.pynnScript.code).toBe('# Write PyNN script here');
    });

    it('should apply changes made on the pynn script and the brain population properly', function() {
      spyOn(clbConfirm, 'open').and.returnValue(window.$q.when({}));

      isolateScope.pynnScript.code = expectedScript;
      isolateScope.populations = [
        { name: 'index2', list: '1', previousName: 'index' }
      ];
      isolateScope.apply();
      isolateScope.$apply();
      expect(backendInterfaceService.setBrain).toHaveBeenCalledWith(
        isolateScope.pynnScript.code,
        { index2: { list: [1], previousName: 'index' } },
        'py',
        'text',
        true,
        jasmine.any(Function),
        jasmine.any(Function)
      );

      expect(isolateScope.loading).toBe(true);
      backendInterfaceService.setBrain.calls.argsFor(0)[5](); // success callback
      expect(isolateScope.loading).toBe(false);
    });

    it('should save the pynn script and the neuron populations properly', function() {
      isolateScope.pynnScript.code = '# some dummy pynn script';
      isolateScope.populations = { dummy_population: { list: ' 1, 2, 3 ' } };
      isolateScope.saveIntoStorage();
      expect(
        storageServer.saveBrain
      ).toHaveBeenCalledWith(
        simulationInfo.experimentID,
        isolateScope.pynnScript.code,
        { dummy_population: { list: [1, 2, 3] } }
      );
    });

    it('should be able to repeat the same test twice', function() {
      isolateScope.apply();
      isolateScope.$apply();
      expect(backendInterfaceService.setBrain).toHaveBeenCalled();
      expect(isolateScope.loading).toBe(true);
      backendInterfaceService.setBrain.calls.argsFor(0)[5](); // success callback
      expect(isolateScope.loading).toBe(false);
    });

    it('should handle an error when sending a pynn script properly (1)', function() {
      isolateScope.apply();
      isolateScope.$apply();
      expect(backendInterfaceService.setBrain).toHaveBeenCalled();
      expect(isolateScope.loading).toBe(true);
      backendInterfaceService.setBrain.calls.argsFor(0)[6](errorMock1); // error callback
      expect(isolateScope.loading).toBe(false);
    });

    it('should handle an error when sending a pynn script properly (2)', function() {
      isolateScope.apply();
      isolateScope.$apply();
      expect(backendInterfaceService.setBrain).toHaveBeenCalled();
      expect(isolateScope.loading).toBe(true);
      isolateScope.pynnScript.code = 'some pynn script';
      backendInterfaceService.setBrain.calls.argsFor(0)[6](errorMock2); // error callback
      expect(isolateScope.loading).toBe(false);
    });

    it('should not issue any getBrain request after a $destroy event of the parent scope', function() {
      $timeout.flush();
      spyOn(isolateScope, 'resetListenerUnbindHandler').and.callThrough();
      spyOn(isolateScope, 'unbindWatcherResize').and.callThrough();
      spyOn(isolateScope, 'unbindListenerUpdatePanelUI').and.callThrough();
      spyOn(isolateScope, 'refresh').and.callThrough();

      isolateScope.$parent.$destroy();
      expect(isolateScope.resetListenerUnbindHandler).toHaveBeenCalled();
      expect(isolateScope.unbindWatcherResize).toHaveBeenCalled();
      expect(isolateScope.unbindListenerUpdatePanelUI).toHaveBeenCalled();

      isolateScope.$broadcast('UPDATE_PANEL_UI');
      expect(isolateScope.refresh).not.toHaveBeenCalled();
    });
  });

  describe('Testing pynn-editor functions', function() {
    beforeEach(function() {
      // Mock functions that access elements that are not available in test environment
      codeEditorsServices.getEditor = jasmine
        .createSpy('getEditor')
        .and.returnValue(cmMock);
    });

    it('should parse a token correctly', function() {
      var token = isolateScope.parseName(
        "Error Message: The name 'token' is not defined"
      );
      expect(token).toEqual('token');
    });

    it('should not parse a token of an unknown error message', function() {
      var token = isolateScope.parseName('Some other error message');
      expect(token).toBe(false);
    });

    it('should search a token', function() {
      isolateScope.pynnScript.code = 'search a\ntoken token\nanother line';
      var pos = isolateScope.searchToken('token');
      expect(pos.line).toBe(1);
      expect(pos.ch).toBe(0);
    });

    it('should call clear functions', function() {
      isolateScope.lineHandle = jasmine.createSpy('lineHandle');
      isolateScope.lineWidget = jasmine.createSpy('lineWidget');
      isolateScope.lineWidget.clear = jasmine.createSpy('clear');
      isolateScope.cm = cmMock;
      isolateScope.clearError();
      expect(isolateScope.lineWidget.clear).toHaveBeenCalled();
      expect(isolateScope.cm.removeLineClass).toHaveBeenCalled();
    });

    it('should check markError function with NaNs', function() {
      isolateScope.clearError();
      isolateScope.markError(NaN, NaN, NaN);
      expect(isolateScope.lineHandle).toBeUndefined();
    });

    it('should check markError function with zeros', function() {
      isolateScope.clearError();
      isolateScope.markError('', 0, 0);
      expect(isolateScope.lineHandle).toBeUndefined();
    });

    it('should refresh codemirror when collabDirty or localDirty flags are set', function() {
      spyOn(codeEditorsServices, 'refreshEditor').and.callThrough();

      isolateScope.collabDirty = true;
      isolateScope.localDirty = false;
      isolateScope.refresh();
      $timeout.flush();
      expect(codeEditorsServices.refreshEditor).toHaveBeenCalled();

      isolateScope.collabDirty = false;
      isolateScope.localDirty = true;
      isolateScope.refresh();
      $timeout.flush();
      expect(codeEditorsServices.refreshEditor).toHaveBeenCalled();
    });

    it('should refresh on event UPDATE_PANEL_UI', function() {
      spyOn(isolateScope, 'refresh').and.callThrough();
      isolateScope.$broadcast('UPDATE_PANEL_UI');
      expect(isolateScope.refresh).toHaveBeenCalled();
    });

    it('should set dirty flags on event RESET', function() {
      isolateScope.localBrainDirty = true;
      isolateScope.$broadcast('RESET', RESET_TYPE.RESET_FULL);
      expect(isolateScope.localBrainDirty).toBe(false);
    });
  });

  describe('Testing GUI operations on brain populations', function() {
    beforeEach(function() {
      isolateScope.populations = [
        { name: 'population_1', list: '2' },
        { name: 'population_2', list: '2,2' },
        { name: 'population_3', list: '2,1' },
        { name: 'population_4', list: '4,5' },
        { name: 'population_5', from: 1, to: 10 },
        { name: 'population_6', list: '1,2,3' },
        { name: 'population_7', from: 1, to: 10 },
        { name: 'population_8', from: 2, to: 10 }
      ];
    });

    it('should delete a population in the scope.populations object', function() {
      isolateScope.deletePopulation(0);
      isolateScope.deletePopulation(1);
      expect(Object.keys(isolateScope.populations).length).toBe(6);
      expect(isolateScope.populations[0].name).toEqual('population_2');
      expect(isolateScope.populations[1].name).toEqual('population_4');
    });

    it('should generate a new population name', function() {
      expect(isolateScope.populations[0]).toBeDefined();
      var neuronName = isolateScope.generatePopulationName();
      expect(neuronName).toBe('population_0');
      expect(isolateScope.generatePopulationName()).toBe(neuronName);
    });

    it('should add a population in the scope.populations object', function() {
      // Add a list with default value {list: '0, 1, 2'} and default name of form population_<number>
      var defaultList = { list: '0, 1, 2' };
      isolateScope.addList();
      expect(
        isolateScope.populations[isolateScope.populations.length - 1].list
      ).toEqual(defaultList.list);
      expect(isolateScope.populations.length).toBe(9);

      // Add a slice with default value {'from': 0, 'to': 1, 'step': 1} and default name of form population_<number>
      var expectedSlice = {
        name: 'population_9',
        from: 0,
        to: 1,
        step: 1,
        id: 10
      };
      isolateScope.addSlice();
      expect(
        isolateScope.populations[isolateScope.populations.length - 1].name
      ).toEqual(expectedSlice.name);
      expect(isolateScope.populations.length).toBe(10);
    });

    it('should test whether a population is a slice or not', function() {
      // A slice is discriminated by means of its properties 'from' and 'to'.
      // Thus isSlice(population) is false if population is a list (JS array or {list: '1,2,3'} object).
      expect(
        isolateScope.isSlice({ list: '1, 2, 3', name: 'test_population' })
      ).toBe(false);
      expect(isolateScope.isSlice({})).toBe(false);
      expect(isolateScope.isSlice({ from: 0 })).toBe(false);
      expect(isolateScope.isSlice({ to: 10, step: 3 })).toBe(false);
      expect(isolateScope.isSlice({ from: 0, to: 10 })).toBe(true);
      expect(isolateScope.isSlice({ from: 0, to: 10, step: 3 })).toBe(true);
      var slice = { from: 0, to: 5 };
      expect(isolateScope.isSlice(slice)).toBe(true);
      slice.from = undefined;
      expect(isolateScope.isSlice(slice)).toBe(true);
      delete slice.from;
      expect(isolateScope.isSlice(slice)).toBe(false);
    });

    it('should test whether step default values are added in populations of type slice', function() {
      var populations = {
        slice1: { from: 0, to: 1 },
        slice2: { from: 0, to: 1 }
      };
      populations = isolateScope.preprocessPopulations(populations);
      angular.forEach(populations, function(population) {
        if (isolateScope.isSlice(population)) {
          expect(population.step).toBeGreaterThan(0);
        }
      });
    });

    it('should test whether populations of type list have been converted into strings', function() {
      var populations = {
        list_1: { list: [1, 2, 3] },
        list_2: { list: [4, 5, 6] }
      };
      populations = isolateScope.preprocessPopulations(populations);
      angular.forEach(populations, function(population) {
        expect(typeof population.list).toBe('string');
      });
    });

    it(' - onPopulationDefineModeChange()', function() {
      // display mode 'range'
      isolateScope.populations[0].displayMode = 'range';
      isolateScope.onPopulationDefineModeChange(isolateScope.populations[0]);
      expect(isolateScope.populations[0].list).not.toBeDefined();
      expect(isolateScope.populations[0].from).toBe(0);
      expect(isolateScope.populations[0].to).toBe(1);
      expect(isolateScope.populations[0].step).toBe(1);

      // display mode 'list'
      isolateScope.populations[0].displayMode = 'list';
      isolateScope.onPopulationDefineModeChange(isolateScope.populations[0]);
      expect(isolateScope.populations[0].from).not.toBeDefined();
      expect(isolateScope.populations[0].to).not.toBeDefined();
      expect(isolateScope.populations[0].step).not.toBeDefined();
      expect(isolateScope.populations[0].list).toBe('');
    });
  });

  describe('Pynn-editor Upload & download', function() {
    it('should call downloadFileService.downloadFile with the right parameters when downloading a file', function() {
      isolateScope.download();
      expect(
        downloadFileServiceMock.downloadFile.calls.mostRecent().args[0]
      ).toMatch(/^blob:/);
      expect(
        downloadFileServiceMock.downloadFile.calls.mostRecent().args[1]
      ).toEqual('pynnBrain.py');
    });

    it('should set the pynnScript when one uploads a file', () => {
      spyOn(window, 'FileReader').and.callFake(() => {
        let fileReader = {
          readAsText: text => fileReader.onload({ target: { result: text } })
        };

        return fileReader;
      });

      var newPynnScript = 'new_pynn_script';
      isolateScope.uploadFile(newPynnScript);

      expect(isolateScope.pynnScript.code).toBe(newPynnScript);
    });
  });
});
