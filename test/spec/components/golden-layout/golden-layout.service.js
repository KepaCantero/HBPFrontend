'use strict';

describe('Service: GoldenLayoutService', function() {
  let TOOL_CONFIGS;

  let goldenLayoutService, userInteractionSettingsService;

  let mockCompiledElement, mockLayout;

  beforeEach(function() {
    module('goldenLayoutModule');

    module('userInteractionSettingsServiceMock');
  });

  beforeEach(function() {
    mockCompiledElement = jasmine
      .createSpy('mockCompiledElement')
      .and.callFake(scope => {
        return scope;
      });

    mockLayout = {
      on: jasmine.createSpy(),
      registerComponent: jasmine.createSpy('registerComponent'),
      init: jasmine.createSpy('init'),
      updateSize: jasmine.createSpy('updateSize'),
      createDragSource: jasmine.createSpy('createDragSource'),
      root: {
        getItemsById: jasmine.createSpy('getItemsById'),
        addChild: jasmine.createSpy('addChild'),
        removeChild: jasmine.createSpy('removeChild'),
        contentItems: [
          {
            addChild: jasmine.createSpy('addChild'),
            config: {}
          }
        ]
      },
      toConfig: jasmine.createSpy('toConfig')
    };
  });

  beforeEach(
    inject(function(
      _$rootScope_,
      _$timeout_,
      _TOOL_CONFIGS_,
      _goldenLayoutService_,
      _userInteractionSettingsService_
    ) {
      TOOL_CONFIGS = _TOOL_CONFIGS_;

      goldenLayoutService = _goldenLayoutService_;
      userInteractionSettingsService = _userInteractionSettingsService_;
    })
  );

  it(' - constructor', function() {
    expect(goldenLayoutService.TOOL_CONFIGS).toBe(TOOL_CONFIGS);
    expect(goldenLayoutService.angularModuleComponent).toBeDefined();
  });

  it(' - angularModuleComponent', function() {
    let mockElement = [document.createElement('div')];
    mockElement.html = jasmine.createSpy('html');

    let destroyCallback = undefined;
    let mockContainer = {
      getElement: jasmine.createSpy('getElement').and.returnValue(mockElement),
      on: jasmine.createSpy('on').and.callFake((event, cb) => {
        destroyCallback = cb;
      })
    };

    let mockState = {
      angularDirective: 'mock-angular-directive'
    };

    let mock$compile = jasmine
      .createSpy('mock$compile')
      .and.callFake(() => mockCompiledElement);

    goldenLayoutService.$compile = mock$compile;
    goldenLayoutService.angularModuleComponent(mockContainer, mockState);

    expect(mockElement.html).toHaveBeenCalledWith(mockState.angularDirective);
    expect(mockContainer.on).toHaveBeenCalledWith(
      'destroy',
      jasmine.any(Function)
    );
    expect(destroyCallback).toBeDefined();

    expect(mock$compile).toHaveBeenCalledWith(mockElement[0]);

    // expect to destroy element scope when container is destroyed
    let elementScope = mockCompiledElement.calls.mostRecent().args[0];
    spyOn(elementScope, '$destroy');
    destroyCallback();
    expect(elementScope.$destroy).toHaveBeenCalled();
  });

  it(' - createLayout', function() {
    spyOn(window, 'GoldenLayout').and.returnValue(mockLayout);

    goldenLayoutService.createLayout();
    expect(goldenLayoutService.layout).toBe(mockLayout);
    expect(mockLayout.registerComponent).toHaveBeenCalledWith(
      'angularModuleComponent',
      goldenLayoutService.angularModuleComponent
    );
    expect(mockLayout.init).toHaveBeenCalled();
  });

  it(' - refreshSize', function() {
    goldenLayoutService.layout = {
      updateSize: jasmine.createSpy('updateSize')
    };
    goldenLayoutService.refreshSize();
    expect(goldenLayoutService.layout.updateSize).toHaveBeenCalled();
  });

  it(' - createDragSource', function() {
    goldenLayoutService.layout = mockLayout;
    spyOn(goldenLayoutService, 'isLayoutInitialised').and.returnValue({
      then: jasmine.createSpy('then').and.callFake(cb => {
        cb();
      })
    });

    let mockElement = {},
      mockToolConfig = {};
    goldenLayoutService.createDragSource(mockElement, mockToolConfig);
    expect(mockLayout.createDragSource).toHaveBeenCalledWith(
      mockElement,
      mockToolConfig
    );
  });

  it(' - openTool', function() {
    spyOn(goldenLayoutService, 'addTool');
    goldenLayoutService.layout = mockLayout;

    let mockToolConfig = {
      id: 'mock-id',
      componentState: {
        singleton: true
      }
    };

    mockLayout.root.getItemsById.and.returnValue([]);

    // first call for a singleton tool, success
    goldenLayoutService.openTool(mockToolConfig);
    expect(goldenLayoutService.addTool).toHaveBeenCalledWith(mockToolConfig);

    // second call for a singletion tool, failure
    goldenLayoutService.addTool.calls.reset();
    mockLayout.root.getItemsById.and.returnValue([
      { close: jasmine.createSpy('close') }
    ]);
    goldenLayoutService.openTool(mockToolConfig);
    expect(goldenLayoutService.addTool).not.toHaveBeenCalled();

    // not a singleton tool with same elements open, success
    goldenLayoutService.addTool.calls.reset();
    mockToolConfig.componentState.singleton = false;
    goldenLayoutService.openTool(mockToolConfig);
    expect(goldenLayoutService.addTool).toHaveBeenCalledWith(mockToolConfig);
  });

  it(' - toggleTool', function() {
    spyOn(goldenLayoutService, 'addTool');
    goldenLayoutService.layout = mockLayout;

    let mockToolConfig = {
      id: 'mock-id',
      componentState: {
        singleton: true
      }
    };

    mockLayout.root.getItemsById.and.returnValue([]);

    // first call for a singleton tool, success
    goldenLayoutService.toggleTool(mockToolConfig);
    expect(goldenLayoutService.addTool).toHaveBeenCalledWith(mockToolConfig);

    // second call for a singletion tool, failure
    goldenLayoutService.addTool.calls.reset();
    let mockItems = [{ close: jasmine.createSpy('close') }];
    mockLayout.root.getItemsById.and.returnValue(mockItems);

    goldenLayoutService.toggleTool(mockToolConfig);
    expect(goldenLayoutService.addTool).not.toHaveBeenCalled();
    expect(mockItems[0].close).toHaveBeenCalled();

    // not a singleton tool with same elements open, success
    goldenLayoutService.addTool.calls.reset();
    mockToolConfig.componentState.singleton = false;
    goldenLayoutService.openTool(mockToolConfig);
    expect(goldenLayoutService.addTool).toHaveBeenCalledWith(mockToolConfig);
  });

  it(' - isLayoutInitialised', function(done) {
    goldenLayoutService.layout = {
      isInitialised: true
    };

    goldenLayoutService.isLayoutInitialised().then(() => {
      done();
    });
  });

  it('hooks stackCreated', () => {
    spyOn(window, 'GoldenLayout').and.returnValue(mockLayout);

    goldenLayoutService.createLayout();

    expect(mockLayout.on).toHaveBeenCalledWith(
      'stackCreated',
      jasmine.any(Function)
    );
  });

  it('hooks stateChanged', () => {
    spyOn(window, 'GoldenLayout').and.returnValue(mockLayout);

    goldenLayoutService.createLayout();

    expect(mockLayout.on).toHaveBeenCalledWith(
      'stateChanged',
      jasmine.any(Function)
    );
  });

  it(' - addTool', function() {
    goldenLayoutService.layouter = {
      addComponent: jasmine.createSpy('addComponent')
    };
    goldenLayoutService.layout = {};

    let config = {};

    goldenLayoutService.addTool(config);
    expect(goldenLayoutService.layouter.addComponent).toHaveBeenCalledWith(
      goldenLayoutService.layout,
      config
    );
  });

  const stackHookForComponent = component => {
    inject(($rootScope, $timeout) => {
      spyOn(window, 'GoldenLayout').and.returnValue(mockLayout);

      goldenLayoutService.createLayout();
      const stackCreatedFn = mockLayout.on.calls.argsFor(
        mockLayout.on.calls.count() - 2
      )[1];

      stackCreatedFn(component);

      $timeout.flush();
      $rootScope.$digest();
    });
  };

  it('GL component with custom options generates GL toolbar extension', () => {
    const stackMock = {
      header: {
        controlsContainer: $('<div/>')
      },
      on: jasmine.createSpy(),
      contentItems: [
        {
          config: { customOptionsDirective: 'MOCK_DIRECTIVE' }
        }
      ]
    };
    stackHookForComponent(stackMock);

    expect(stackMock.header.controlsContainer.children().length).toBe(1);
  });

  it('GL component with NO custom options generates NO GL toolbar extension', () => {
    const stackMock = {
      header: {
        controlsContainer: $('<div/>')
      },
      on: jasmine.createSpy(),
      contentItems: [
        {
          config: {}
        }
      ]
    };
    stackHookForComponent(stackMock);

    expect(stackMock.header.controlsContainer.children().length).toBe(0);
  });

  it('stateChanged event should trigger autosave', () => {
    spyOn(window, 'GoldenLayout').and.returnValue(mockLayout);
    goldenLayoutService.createLayout();
    const stateChangedCallback = mockLayout.on.calls.mostRecent().args[1];
    stateChangedCallback();
    expect(userInteractionSettingsService.autosaveLayout).toHaveBeenCalled();
  });

  it('re-create added drag sources on createLayout()', () => {
    let dragSource = { element: {}, toolConfig: {} };
    goldenLayoutService.dragSources = [dragSource];
    spyOn(goldenLayoutService, 'isLayoutInitialised').and.returnValue({
      then: jasmine.createSpy('then').and.callFake(callback => {
        callback();
      })
    });
    spyOn(window, 'GoldenLayout').and.returnValue(mockLayout);

    goldenLayoutService.createLayout();
    expect(mockLayout.createDragSource).toHaveBeenCalledWith(
      dragSource.element,
      dragSource.toolConfig
    );
  });
});
