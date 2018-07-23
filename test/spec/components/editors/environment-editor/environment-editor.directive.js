'use strict';

describe('Directive: environment-designer', function() {
  var $scope,
    element,
    stateService,
    panels,
    contextMenuState,
    simulationSDFWorld,
    simulationInfo,
    clbErrorDialog,
    dynamicViewOverlayService,
    DYNAMIC_VIEW_CHANNELS,
    httpBackend,
    userNavigationService;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(module('currentStateMockFactory'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('stateServiceMock'));
  beforeEach(module('dynamicViewOverlayServiceMock'));
  beforeEach(module('contextMenuStateServiceMock'));
  beforeEach(module('gz3dMock'));
  beforeEach(
    module(function($provide) {
      $provide.value(
        'simulationSDFWorld',
        jasmine.createSpy('simulationSDFWorld').and.callThrough()
      );
      $provide.value('bbpConfig', {
        get: jasmine.createSpy('get').and.returnValue({
          bbpce016: {
            gzweb: {
              assets: 'mock_assets',
              websocket: 'mock_websocket'
            }
          }
        })
      });
      $provide.value('panels', {
        close: jasmine.createSpy('close')
      });
    })
  );

  beforeEach(
    inject(function(
      $rootScope,
      $compile,
      $document,
      EDIT_MODE,
      STATE,
      _DYNAMIC_VIEW_CHANNELS_,
      _currentStateMockFactory_,
      _stateService_,
      _contextMenuState_,
      _objectInspectorService_,
      _panels_,
      _simulationSDFWorld_,
      _simulationInfo_,
      _clbErrorDialog_,
      _environmentService_,
      _dynamicViewOverlayService_,
      _$httpBackend_,
      _userNavigationService_
    ) {
      $scope = $rootScope.$new();
      $scope.EDIT_MODE = EDIT_MODE;
      $scope.STATE = STATE;
      DYNAMIC_VIEW_CHANNELS = _DYNAMIC_VIEW_CHANNELS_;
      contextMenuState = _contextMenuState_;
      stateService = _stateService_;
      simulationInfo = _simulationInfo_;
      panels = _panels_;
      simulationSDFWorld = _simulationSDFWorld_;
      clbErrorDialog = _clbErrorDialog_;
      dynamicViewOverlayService = _dynamicViewOverlayService_;
      httpBackend = _$httpBackend_;
      userNavigationService = _userNavigationService_;

      var modelLibraryMock = [
        {
          title: 'Shapes',
          thumbnail: 'shapes.png',
          models: [
            {
              modelPath: 'box',
              modelTitle: 'Box',
              thumbnail: 'img/esv/objects/box.png'
            },
            {
              modelPath: 'sphere',
              modelTitle: 'Sphere',
              thumbnail: 'img/esv/objects/sphere.png'
            },
            {
              modelPath: 'cylinder',
              modelTitle: 'Cylinder',
              thumbnail: 'img/esv/objects/cylinder.png'
            }
          ]
        },
        {
          title: 'Lights',
          thumbnail: 'lights.png',
          models: [
            {
              modelPath: 'pointlight',
              modelTitle: 'Point Light',
              thumbnail: 'img/esv/objects/pointlight.png'
            },
            {
              modelPath: 'spotlight',
              modelTitle: 'Spot Light',
              thumbnail: 'img/esv/objects/spotlight.png'
            },
            {
              modelPath: 'directionallight',
              modelTitle: 'Directional Light',
              thumbnail: 'img/esv/objects/directionallight.png'
            }
          ]
        }
      ];

      httpBackend.whenGET(/.*assets.*/).respond(modelLibraryMock);

      element = $compile('<environment-designer />')($scope);
      $scope.$digest();

      httpBackend.flush();
    })
  );

  it('should initialize scope variables correctly', function() {
    expect($scope.assetsPath).toBeDefined();
  });

  it('should call correctly close panels when edit mode already set', function() {
    stateService.currentState = $scope.STATE.STARTED;
    $scope.gz3d.scene.manipulationMode = $scope.EDIT_MODE.TRANSLATE;
    $scope.setEditMode($scope.EDIT_MODE.TRANSLATE);
    expect(panels.close).toHaveBeenCalled();
  });

  it('should correctly set the edit mode', function() {
    stateService.currentState = $scope.STATE.STARTED;
    $scope.setEditMode($scope.EDIT_MODE.TRANSLATE);
    expect(stateService.ensureStateBeforeExecuting).toHaveBeenCalled();
    expect($scope.gz3d.scene.setManipulationMode).toHaveBeenCalledWith(
      $scope.EDIT_MODE.TRANSLATE
    );
  });

  it('should call correctly contextMenuState.pushItemGroup', function() {
    stateService.currentState = $scope.STATE.PAUSED;
    var itemGroup = contextMenuState.pushItemGroup.calls.mostRecent().args[0];

    // initial structure
    expect(itemGroup.visible).toBe(false);
    expect(itemGroup.items[0].text).toEqual('Inspect');
    expect(itemGroup.items[0].visible).toBe(false);
    expect(itemGroup.items[1].text).toEqual('Look At');
    expect(itemGroup.items[1].visible).toBe(false);
    expect(itemGroup.items[2].text).toEqual('Duplicate');
    expect(itemGroup.items[2].visible).toBe(false);
    expect(itemGroup.items[3].text).toEqual('Show Skin');
    expect(itemGroup.items[3].visible).toBe(false);
    expect(itemGroup.items[4].text).toEqual('Delete');
    expect(itemGroup.items[4].visible).toBe(false);

    // check hide()
    itemGroup.visible = true;
    itemGroup.items[0].visible = true;
    itemGroup.items[1].visible = true;
    itemGroup.items[2].visible = true;
    itemGroup.items[3].visible = true;
    itemGroup.items[4].visible = true;
    itemGroup.hide();
    expect(itemGroup.visible).toBe(false);
    expect(itemGroup.items[0].visible).toBe(false);
    expect(itemGroup.items[1].visible).toBe(false);
    expect(itemGroup.items[2].visible).toBe(false);
    expect(itemGroup.items[3].visible).toBe(false);
    expect(itemGroup.items[4].visible).toBe(false);

    var eventMock = { stopPropagation: jasmine.createSpy('stopPropagation') };
    // check call to edit item
    itemGroup.items[0].callback(eventMock);
    expect(dynamicViewOverlayService.createDynamicOverlay).toHaveBeenCalledWith(
      DYNAMIC_VIEW_CHANNELS.OBJECT_INSPECTOR
    );
    expect(contextMenuState.toggleContextMenu).toHaveBeenCalledWith(false);
    expect(eventMock.stopPropagation).toHaveBeenCalled();

    // check call to duplicate item
    spyOn($scope, 'duplicateModel');
    itemGroup.items[2].callback(eventMock);
    expect($scope.duplicateModel).toHaveBeenCalled();
    expect(eventMock.stopPropagation).toHaveBeenCalled();

    // check call to look at
    spyOn(userNavigationService, 'setLookatRobotCamera');
    itemGroup.items[1].callback(eventMock);
    expect(userNavigationService.setLookatRobotCamera).toHaveBeenCalled();
    expect(contextMenuState.toggleContextMenu).toHaveBeenCalledWith(false);
    expect(eventMock.stopPropagation).toHaveBeenCalled();

    // check show skin
    $scope.gz3d.scene.selectedEntity = {};
    $scope.gz3d.scene.setSkinVisible = function() {};
    $scope.gz3d.scene.skinVisible = function() {
      return false;
    };
    spyOn($scope.gz3d.scene, 'setSkinVisible');
    itemGroup.items[3].callback(eventMock);
    expect($scope.gz3d.scene.setSkinVisible).toHaveBeenCalled();
    expect(contextMenuState.toggleContextMenu).toHaveBeenCalledWith(false);
    expect(eventMock.stopPropagation).toHaveBeenCalled();

    // check call to delete item
    spyOn($scope, 'deleteModel');
    itemGroup.items[4].callback(eventMock);
    expect($scope.deleteModel).toHaveBeenCalled();
    expect(eventMock.stopPropagation).toHaveBeenCalled();

    // see that anyhting containing 'robot' can't be deleted
    var modelMock = { name: 'robot' };
    itemGroup.show(modelMock);
    expect(itemGroup.visible).toBe(true);
    expect(itemGroup.items[0].visible).toBe(true);
    expect(itemGroup.items[1].visible).toBe(true);
    expect(itemGroup.items[2].visible).toBe(false);
    expect(itemGroup.items[3].visible).toBe(false);
    expect(itemGroup.items[4].visible).toBe(false);
    modelMock.name = 'iAmNotARobot';
    itemGroup.show(modelMock);
    expect(itemGroup.visible).toBe(true);
    expect(itemGroup.items[0].visible).toBe(true);
    expect(itemGroup.items[1].visible).toBe(true);
    expect(itemGroup.items[2].visible).toBe(true);
    expect(itemGroup.items[3].visible).toBe(false);
    expect(itemGroup.items[4].visible).toBe(true);
  });

  it('should pause the simulation when needed', function() {
    stateService.currentState = $scope.STATE.STARTED;
    $scope.setEditMode($scope.EDIT_MODE.TRANSLATE);
    expect(
      stateService.ensureStateBeforeExecuting.calls.mostRecent().args[0]
    ).toBe($scope.STATE.PAUSED);
    stateService.currentState = $scope.STATE.STARTED;
    $scope.setEditMode($scope.EDIT_MODE.ROTATE);
    expect(
      stateService.ensureStateBeforeExecuting.calls.mostRecent().args[0]
    ).toBe($scope.STATE.PAUSED);
  });

  it('should not update the state if already in the correct state', function() {
    expect(stateService.setCurrentState.calls.count()).toBe(0);
    stateService.currentState = $scope.STATE.STARTED;
    $scope.setEditMode($scope.EDIT_MODE.VIEW);
    expect(stateService.setCurrentState.calls.count()).toBe(0);
    stateService.currentState = $scope.STATE.PAUSED;
    $scope.setEditMode($scope.EDIT_MODE.TRANSLATE);
    expect(stateService.setCurrentState.calls.count()).toBe(0);
    stateService.currentState = $scope.STATE.PAUSED;
    $scope.setEditMode($scope.EDIT_MODE.ROTATE);
    expect(stateService.setCurrentState.calls.count()).toBe(0);
  });

  it('should call the right REST API for the SDF export process', function() {
    var exportSpy = jasmine.createSpy('export');
    simulationSDFWorld.and.callFake(function() {
      return {
        export: exportSpy.and.callFake(function() {})
      };
    });

    $scope.exportSDFWorld();
    expect(simulationSDFWorld).toHaveBeenCalled();
    expect(exportSpy).toHaveBeenCalled();
  });

  it('should call correctly addModel("box")', function() {
    spyOn($scope, 'addModel');

    var addBoxBtnDomElem = element.find('#insert-entity-box');
    var addBoxBtn = angular.element(addBoxBtnDomElem);

    addBoxBtn.triggerHandler('mousedown');
    expect($scope.addModel).toHaveBeenCalledWith('box');
  });

  it('should update visible models when toggling category', function() {
    spyOn($scope, 'updateVisibleModels');

    $scope.toggleVisibleCategory({ visible: true });

    expect($scope.updateVisibleModels).toHaveBeenCalled();
  });

  it('should not spawn models when in INITIALIZED state', function() {
    spyOn($scope, 'addModel');
    spyOn(window.guiEvents, 'emit');
    $scope.stateService.currentState = $scope.STATE.INITIALIZED;
    var addBoxBtnDomElem = element.find('#insert-entity-box');
    var addBoxBtn = angular.element(addBoxBtnDomElem);

    addBoxBtn.triggerHandler('mousedown');
    expect($scope.addModel).toHaveBeenCalledWith('box');
    expect(window.guiEvents.emit).not.toHaveBeenCalledWith(
      'spawn_entity_start',
      'box'
    );
  });

  it('should execute correctly addModel("box")', function() {
    spyOn(window.guiEvents, 'emit');

    var addBoxBtnDomElem = element.find('#insert-entity-box');
    var addBoxBtn = angular.element(addBoxBtnDomElem);

    addBoxBtn.triggerHandler('mousedown');

    //should emit 'spawn_entity_start'
    expect(window.guiEvents.emit).toHaveBeenCalledWith(
      'spawn_entity_start',
      'box'
    );
  });

  it('should open object inspector after adding a model', function() {
    var objName = 'cylinder_0';
    var obj = {};
    obj.name = objName;

    $scope.expectedObjectName = objName;
    $scope.gz3d.scene.getByName.and.returnValue(objName);

    $scope.selectCreatedEntity(objName + ' created');

    expect($scope.gz3d.scene.selectedEntity === obj);
    expect(dynamicViewOverlayService.createDynamicOverlay).toHaveBeenCalledWith(
      DYNAMIC_VIEW_CHANNELS.OBJECT_INSPECTOR
    );
  });

  it('should check interceptEntityCreationEvent', function() {
    stateService.currentSate = $scope.STATE.STARTED;

    var objName = 'cylinder_0';
    var obj = {};
    obj.name = objName;

    $scope.addModel(objName);

    // $scope.defaultEntityCreatedCallback is overwritten within
    // $scope.interceptEntityCreationEvent()
    var toBeCalled = $scope.defaultEntityCreatedCallback;

    $scope.interceptEntityCreationEvent(obj);

    expect(toBeCalled).toHaveBeenCalled();
  });

  it('should create a new dummy anchor and click it when exporting the environment', function() {
    var exportSpy = jasmine.createSpy('export');
    simulationSDFWorld.and.callFake(function() {
      return {
        export: exportSpy.and.callFake(function(args, cb) {
          cb({ sdf: 'dummysdf' });
        })
      };
    });

    var dummyAnchorElement = {
      style: {},
      click: jasmine.createSpy('click')
    };

    spyOn(document, 'createElement').and.callFake(function() {
      return dummyAnchorElement;
    });

    spyOn(document.body, 'appendChild');
    spyOn(document.body, 'removeChild');

    $scope.exportSDFWorld();
    expect(exportSpy).toHaveBeenCalled();
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
    expect(dummyAnchorElement.click).toHaveBeenCalled();
  });

  it('should emit delete_entity and toggle menu when deleteModel is called', function() {
    spyOn($scope.gz3d.gui.guiEvents, 'emit').and.callThrough();
    $scope.deleteModel(); //call function
    //should emit 'delete_entity'
    expect($scope.gz3d.gui.guiEvents.emit).toHaveBeenCalledWith(
      'delete_entity'
    );
    //should toggle menu
    expect(contextMenuState.toggleContextMenu).toHaveBeenCalledWith(false);
  });

  it('should correctly saveSDFIntoCollabStorage', function() {
    let saveSpy = jasmine.createSpy('saveSpy').and.callFake(() => {});
    simulationSDFWorld.and.returnValue({
      save: saveSpy
    });

    expect($scope.isSavingToCollab).toEqual(false);
    $scope.saveSDFIntoCollabStorage();
    expect(saveSpy).toHaveBeenCalledWith(
      { simId: simulationInfo.simulationID },
      {},
      jasmine.any(Function),
      jasmine.any(Function)
    );
    expect($scope.isSavingToCollab).toEqual(true);
    saveSpy.calls.argsFor(0)[2]();
    expect($scope.isSavingToCollab).toBe(false);
    $scope.isSavingToCollab = true;
    spyOn(clbErrorDialog, 'open');
    saveSpy.calls.argsFor(0)[3]();
    expect($scope.isSavingToCollab).toBe(false);
    expect(clbErrorDialog.open).toHaveBeenCalled();
  });
});
