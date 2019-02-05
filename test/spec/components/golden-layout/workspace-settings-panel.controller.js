'use strict';

describe('Controller: WorkspaceSettingsPanelController', function() {
  let $controller, $rootScope, $scope;

  let controller;

  let goldenLayoutService, userContextService, userInteractionSettingsService;

  let mockWorkspaces;

  beforeEach(function() {
    module('goldenLayoutModule');

    // mocks
    module('$mdPanelMock');
    module('goldenLayoutServiceMock');
    module('userContextServiceMock');
    module('userInteractionSettingsServiceMock');
  });

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _goldenLayoutService_,
      _userContextService_,
      _userInteractionSettingsService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;

      goldenLayoutService = _goldenLayoutService_;
      userContextService = _userContextService_;
      userInteractionSettingsService = _userInteractionSettingsService_;
    })
  );

  beforeEach(function() {
    mockWorkspaces = {};
    userInteractionSettingsService.workspaces.then.and.callFake(callback => {
      callback(mockWorkspaces);
    });

    spyOn(document, 'getElementById').and.returnValue([
      { blur: jasmine.createSpy('blur') }
    ]);
  });

  beforeEach(function() {
    $scope = $rootScope.$new();
    controller = $controller('WorkspaceSettingsPanelController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
  });

  it(' - constructor()', function() {
    expect(controller.workspaces).toBe(mockWorkspaces);
  });

  it(' - saveCustomWorkspace()', function() {
    goldenLayoutService.isLayoutInitialised.and.returnValue({
      then: jasmine.createSpy('then').and.callFake(callback => {
        callback();
      })
    });
    let layoutConfigMock = {};
    goldenLayoutService.layout.toConfig.and.returnValue(layoutConfigMock);
    let testName = 'test-name';

    // no owner rights
    userContextService.isOwner.and.returnValue(false);
    controller.saveCustomWorkspace(testName);
    expect(
      userInteractionSettingsService.saveCustomWorkspace
    ).not.toHaveBeenCalled();

    // with owner rights
    userContextService.isOwner.and.returnValue(true);
    controller.saveCustomWorkspace(testName);
    expect(
      userInteractionSettingsService.saveCustomWorkspace
    ).toHaveBeenCalledWith(testName, layoutConfigMock);
  });

  it(' - loadCustomWorkspace()', function() {
    goldenLayoutService.layout = {
      destroy: jasmine.createSpy('destroy')
    };
    let testName = 'Test-Name';

    // no owner rights
    userContextService.isOwner.and.returnValue(false);
    controller.loadCustomWorkspace(testName);
    expect(goldenLayoutService.layout.destroy).not.toHaveBeenCalled();
    expect(goldenLayoutService.createLayout).not.toHaveBeenCalled();

    // no fitting saved layout
    userContextService.isOwner.and.returnValue(true);
    controller.workspaces.custom = [];
    controller.loadCustomWorkspace(testName);
    expect(goldenLayoutService.layout.destroy).not.toHaveBeenCalled();
    expect(goldenLayoutService.createLayout).not.toHaveBeenCalled();

    // with fitting saved layout
    let matchingWorkspace = {
      id: testName.toLowerCase(),
      layout: {}
    };
    controller.workspaces.custom = [matchingWorkspace];
    controller.loadCustomWorkspace(testName);
    expect(goldenLayoutService.layout.destroy).toHaveBeenCalled();
    expect(goldenLayoutService.createLayout).toHaveBeenCalledWith(
      matchingWorkspace.layout
    );
  });

  it(' - deleteCustomWorkspace()', function() {
    let event = { stopPropagation: jasmine.createSpy('stopPropagation') };
    let id = 'my-id';

    // no owner rights
    userContextService.isOwner.and.returnValue(false);
    controller.deleteCustomWorkspace(event, id);
    expect(
      userInteractionSettingsService.deleteCustomWorkspace
    ).not.toHaveBeenCalled();

    // with owner rights
    userContextService.isOwner.and.returnValue(true);
    controller.deleteCustomWorkspace(event, id);
    expect(
      userInteractionSettingsService.deleteCustomWorkspace
    ).toHaveBeenCalledWith(id);
  });

  it(' - querySearch()', function() {
    controller.workspaces.custom = [
      {
        id: 'id1',
        layout: {}
      },
      {
        id: 'id2',
        layout: {}
      }
    ];
    let query;

    // empty query
    query = '';
    let result = controller.querySearch(query);
    expect(result).toEqual(controller.workspaces.custom);

    // query matching both elements, but distinct
    query = 'id';
    result = controller.querySearch(query);
    expect(result).toContain(controller.workspaces.custom[0]);
    expect(result).toContain(controller.workspaces.custom[1]);
    expect(result).toContain({ name: query, newWorkspace: true });

    // query matching one element exactly, check lowercase ID
    query = 'ID1';
    result = controller.querySearch(query);
    expect(result).toContain(controller.workspaces.custom[0]);
  });

  it(' - selectedItemChange()', function() {
    let item = { name: 'workspace1' };

    // no item selected
    controller.selectedItem = item;
    controller.selectedItemChange(undefined);
    expect(controller.selectedItem).toBe(item);

    // selecting defined workspace
    controller.selectedItem = undefined;
    controller.selectedItemChange(item);
    expect(controller.selectedItem).toBe(item);

    // selecting to add a new workspace
    spyOn(controller, 'saveCustomWorkspace');
    item.newWorkspace = true;
    controller.selectedItemChange(item);
    expect(controller.saveCustomWorkspace).toHaveBeenCalledWith(item.name);
    expect(controller.selectedItem).toBe(item);
  });
});
