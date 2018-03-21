'use strict';

describe('Controller: editorPanelCtrl', function() {
  // load the controller's module
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('gz3dModule'));

  var $httpBackend,
    scope,
    rootScope,
    bbpConfig,
    gz3d,
    editorsPanelService,
    collabContextlessUrl;

  var baseEventHandlerMock = {
    suppressAnyKeyPress: jasmine.createSpy('suppressAnyKeyPress')
  };

  beforeEach(
    module(function($provide) {
      $provide.value('baseEventHandler', baseEventHandlerMock);
    })
  );

  // Initialize the controller and a mock scope
  beforeEach(
    inject(function(
      $controller,
      $rootScope,
      _$httpBackend_,
      _bbpConfig_,
      _editorsPanelService_,
      _gz3d_,
      simulationInfo
    ) {
      $httpBackend = _$httpBackend_;
      rootScope = $rootScope;
      scope = $rootScope.$new();
      bbpConfig = _bbpConfig_;
      gz3d = _gz3d_;
      editorsPanelService = _editorsPanelService_;

      // Mock the scene controls object
      gz3d.scene = {};
      gz3d.scene.controls = {};
      gz3d.scene.controls.keyboardBindingsEnabled = true;

      $controller('editorPanelCtrl', {
        $rootScope: rootScope,
        $scope: scope,
        simulationInfo: simulationInfo
      });

      scope.controls.graphicalEditor.refresh = jasmine.createSpy('refresh');

      $httpBackend.whenGET(/\/me/).respond(200);
    })
  );

  beforeEach(function() {
    collabContextlessUrl =
      bbpConfig.get('api.collabContextManagement.url') +
      '/collab/configuration';
    $httpBackend.whenGET(collabContextlessUrl).respond(200, {});
  });

  it('should set the panelIsOpen on the open and close callbacks', function() {
    expect(scope.panelIsOpen).toBeFalsy();
    expect(scope.openCallback).toEqual(jasmine.any(Function));
    expect(scope.closeCallback).toEqual(jasmine.any(Function));
    scope.openCallback();
    expect(scope.panelIsOpen).toBeTruthy();
    scope.closeCallback();
    expect(scope.panelIsOpen).toBeFalsy();
  });

  it('should refresh the panel on the open callbacks', function() {
    editorsPanelService.showEditorPanel = true;
    editorsPanelService.activeTabIndex = scope.tabindex.transferfunction;
    scope.openCallback();
    expect(scope.controls.graphicalEditor.refresh).not.toHaveBeenCalled();

    editorsPanelService.activeTabIndex = scope.tabindex.statemachine;
    scope.closeCallback();
    scope.openCallback();
    expect(scope.controls.graphicalEditor.refresh).not.toHaveBeenCalled();

    editorsPanelService.activeTabIndex = scope.tabindex.pynneditor;
    scope.closeCallback();
    scope.openCallback();

    editorsPanelService.activeTabIndex = scope.tabindex.graphicalEditor;
    scope.closeCallback();
    scope.openCallback();
    expect(scope.controls.graphicalEditor.refresh).toHaveBeenCalled();
  });

  it('should disable the key bindings when an code editor tab is active and the panel is opened', function() {
    expect(scope.panelIsOpen).toBe(false);
    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBe(true);

    //Test the transferfunction tab
    scope.activeTabIndex = scope.tabindex.transferfunction;
    scope.openCallback();
    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBeFalsy();

    scope.closeCallback();
    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBeTruthy();

    //Test the statemachine tab
    scope.activeTabIndex = scope.tabindex.statemachine;
    scope.openCallback();
    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBeFalsy();

    scope.closeCallback();
    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBeTruthy();

    //Test the pynn-editor tab
    scope.activeTabIndex = scope.tabindex.pynneditor;
    scope.openCallback();
    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBeFalsy();
    scope.closeCallback();
    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBeTruthy();

    //Test the graphical-editor tab
    scope.activeTabIndex = scope.tabindex.graphicalEditor;
    scope.openCallback();
    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBeFalsy();
    scope.closeCallback();
    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBeTruthy();
  });

  it('should disable the key bindings when the panel is open and the disableKeyBindings function is called', function() {
    scope.panelIsOpen = true;
    gz3d.scene.controls.keyboardBindingsEnabled = true;
    scope.disableKeyBindings();

    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBeFalsy();
  });

  it('should NOT disable the key bindings when the panel is CLOSED and the disableKeyBindings function is called', function() {
    scope.panelIsOpen = false;
    gz3d.scene.controls.keyboardBindingsEnabled = true;
    scope.disableKeyBindings();

    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBeTruthy();
  });

  it('should re-enable the key bindings', function() {
    gz3d.scene.controls.keyboardBindingsEnabled = false;
    scope.reenableKeyBindings();

    expect(gz3d.scene.controls.keyboardBindingsEnabled).toBeTruthy();
  });

  it('should not throw an error when gz3d.scene is already disposed on close', function() {
    gz3d.scene = undefined;
    expect(scope.reenableKeyBindings).not.toThrow();
  });

  it('should set the variable showEditorPanel to be false', function() {
    editorsPanelService.showEditorPanel = true;

    scope.$destroy();

    expect(editorsPanelService.showEditorPanel).toBeFalsy();
  });

  it('should refresh code editors after resizing', function() {
    spyOn(document.activeElement, 'blur');

    scope.onResizeEnd();
    expect(document.activeElement.blur).toHaveBeenCalled();

    scope.activeTabIndex = scope.tabindex.transferfunction;
    scope.onResizeEnd();
  });

  it('should watch showEditorPanel', function() {
    spyOn(scope, 'openCallback');
    spyOn(scope, 'closeCallback');

    editorsPanelService.showEditorPanel = false;
    scope.$digest();
    expect(scope.closeCallback).toHaveBeenCalled();

    editorsPanelService.showEditorPanel = true;
    scope.$digest();
    expect(scope.openCallback).toHaveBeenCalled();
  });

  it('should call suppressAnyKeyPress from baseEventHandler service', function() {
    scope.suppressKeyPress();
    expect(baseEventHandlerMock.suppressAnyKeyPress).toHaveBeenCalled();
  });

  it('should refresh on the event UPDATE_PANEL_UI', function() {
    spyOn(scope, 'refresh');

    scope.$emit('UPDATE_PANEL_UI');
    expect(scope.refresh).toHaveBeenCalled();
  });
});
