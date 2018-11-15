'use strict';

describe('Service: GoldenLayoutService', function() {
  let TOOL_CONFIGS;

  let goldenLayoutService;

  let mock$compile, mockCompiledElement, mockLayout;

  beforeEach(function() {
    module('goldenLayoutModule');
  });

  beforeEach(function() {
    mockCompiledElement = jasmine
      .createSpy('mockCompiledElement')
      .and.callFake(scope => {
        return scope;
      });
    mock$compile = jasmine.createSpy('mock$compile').and.callFake(function() {
      return mockCompiledElement;
    });

    mockLayout = {
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
      }
    };

    module(function($provide) {
      // Just use callFake to have $compile return a function
      $provide.value('$compile', mock$compile);
    });
  });

  beforeEach(
    inject(function(
      _$compile_,
      _$rootScope_,
      _$timeout_,
      _TOOL_CONFIGS_,
      _goldenLayoutService_
    ) {
      TOOL_CONFIGS = _TOOL_CONFIGS_;

      goldenLayoutService = _goldenLayoutService_;
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
    spyOn(goldenLayoutService, 'initialized').and.returnValue({
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

  it(' - addTool', function() {
    goldenLayoutService.layout = mockLayout;

    let mockToolConfig = {
      id: 'mock-id',
      componentState: {
        singleton: true
      }
    };

    // not a stack to be added to
    mockLayout.root.contentItems[0].isStack = false;

    goldenLayoutService.addTool(mockToolConfig);
    expect(mockLayout.root.contentItems[0].addChild).toHaveBeenCalledWith(
      mockToolConfig
    );

    // add tool to stack, convert stack to row
    mockLayout.root.contentItems[0].isStack = true;

    goldenLayoutService.addTool(mockToolConfig);
    expect(mockLayout.root.contentItems[0].addChild).toHaveBeenCalledWith(
      mockToolConfig
    );
  });
});
