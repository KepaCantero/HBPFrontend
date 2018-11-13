'use strict';

describe('Directive: gl-tool-source', function() {
  let $compile, $rootScope;
  let element;
  let eventDispatcherService;

  let TOOL_CONFIGS;
  let goldenLayoutService, helpTooltipService;

  let toolConfig = 'ENVIRONMENT_RENDERING';

  beforeEach(function() {
    module('goldenLayoutModule');
    module('eventDispatcherModule');

    // mocks
    module('goldenLayoutServiceMock');
    module('helpTooltipServiceMock');
  });

  beforeEach(
    inject(function(
      _$rootScope_,
      _$compile_,
      _TOOL_CONFIGS_,
      _eventDispatcherService_,
      _goldenLayoutService_,
      _helpTooltipService_
    ) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;

      TOOL_CONFIGS = _TOOL_CONFIGS_;

      eventDispatcherService = _eventDispatcherService_;
      goldenLayoutService = _goldenLayoutService_;
      helpTooltipService = _helpTooltipService_;
    })
  );

  beforeEach(function() {
    var $scope = $rootScope.$new();
    element = $compile('<div gl-tool-source="' + toolConfig + '"></div>')(
      $scope
    );
    $scope.$digest();
  });

  it(' - compilation', function() {
    expect(element).toBeDefined();
  });

  it(' - init on ASSETS_LOADED', function() {
    $rootScope.$broadcast('ASSETS_LOADED');

    expect(goldenLayoutService.createDragSource).toHaveBeenCalledWith(
      element[0],
      TOOL_CONFIGS[toolConfig]
    );
  });

  it(' - mouseup, with help tooltip open', function() {
    $rootScope.$broadcast('ASSETS_LOADED');

    helpTooltipService.visible = helpTooltipService.HELP;
    eventDispatcherService.triggerMouseEvent(element[0], 'mouseup', 0, 0, 0);
    expect(goldenLayoutService.openTool).not.toHaveBeenCalled();
  });

  it(' - mouseup, with help tooltip closed', function() {
    $rootScope.$broadcast('ASSETS_LOADED');

    helpTooltipService.visible = false;
    TOOL_CONFIGS[toolConfig].componentState.singleton = false;
    eventDispatcherService.triggerMouseEvent(element[0], 'mouseup', 0, 0, 0);
    expect(goldenLayoutService.openTool).toHaveBeenCalledWith(
      TOOL_CONFIGS[toolConfig]
    );
  });

  it(' - mouseup, singleton tool config', function() {
    $rootScope.$broadcast('ASSETS_LOADED');

    helpTooltipService.visible = false;
    TOOL_CONFIGS[toolConfig].componentState.singleton = true;
    eventDispatcherService.triggerMouseEvent(element[0], 'mouseup', 0, 0, 0);
    expect(goldenLayoutService.toggleTool).toHaveBeenCalledWith(
      TOOL_CONFIGS[toolConfig]
    );
  });
});
