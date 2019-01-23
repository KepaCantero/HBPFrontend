'use strict';

describe('Directive: environment-designer', function() {
  var $scope,
    element,
    stateService,
    panels,
    simulationSDFWorld,
    simulationInfo,
    clbErrorDialog,
    goldenLayoutService,
    httpBackend,
    storageServer,
    newExperimentProxyService,
    $q;

  let modelLibraryMock;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(module('currentStateMockFactory'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('stateServiceMock'));
  beforeEach(module('dynamicViewOverlayServiceMock'));
  beforeEach(module('goldenLayoutServiceMock'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('sceneInfoMock'));
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
      TOOL_CONFIGS,
      _currentStateMockFactory_,
      _stateService_,
      _objectInspectorService_,
      _panels_,
      _simulationSDFWorld_,
      _simulationInfo_,
      _clbErrorDialog_,
      _goldenLayoutService_,
      _$httpBackend_,
      _storageServer_,
      _newExperimentProxyService_,
      _$q_
    ) {
      $scope = $rootScope.$new();
      $scope.EDIT_MODE = EDIT_MODE;
      $scope.STATE = STATE;
      $scope.TOOL_CONFIGS = TOOL_CONFIGS;
      stateService = _stateService_;
      simulationInfo = _simulationInfo_;
      panels = _panels_;
      simulationSDFWorld = _simulationSDFWorld_;
      clbErrorDialog = _clbErrorDialog_;
      goldenLayoutService = _goldenLayoutService_;
      httpBackend = _$httpBackend_;
      storageServer = _storageServer_;
      newExperimentProxyService = _newExperimentProxyService_;
      $q = _$q_;

      modelLibraryMock = [
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
              thumbnail: 'img/esv/objects/cylinder.png',
              physicsIgnore: 'opensim'
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
              thumbnail: 'img/esv/objects/directionallight.png',
              physicsIgnore: 'bullet'
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

  it('should emit "duplicate_entity" on duplicate', function() {
    spyOn($scope.gz3d.gui.guiEvents, 'emit');
    $scope.duplicateModel();
    expect($scope.gz3d.gui.guiEvents.emit).toHaveBeenCalledWith(
      'duplicate_entity'
    );
  });

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
    expect($scope.addModel).toHaveBeenCalled();
    expect($scope.addModel.calls.mostRecent().args[0].modelPath).toBe('box');
  });

  it('should update visible models when toggling category', function() {
    spyOn($scope, 'updateVisibleModels');

    $scope.toggleVisibleCategory({ visible: true });

    expect($scope.updateVisibleModels).toHaveBeenCalled();
  });

  it('should generate the robots models from the proxy call', function() {
    spyOn(newExperimentProxyService, 'getTemplateModels').and.returnValue(
      $q.resolve({
        data: [
          {
            name: 'robot1 name',
            sdf: 'model.sdf',
            description: 'robot1 description',
            thumbnail: '<robot png data>',
            id: 'robot1',
            path: 'robots/<robot folder>/model.config'
          }
        ]
      })
    );
    spyOn(storageServer, 'getCustomModels').and.returnValue(
      $q.resolve([
        {
          name: 'custom robot1 name',
          description: 'custom robot1 description',
          thumbnail: '<robot png data>',
          id: 'robot1',
          zipURI: 'robot1.zip',
          fileName: 'robots/robot1.zip',
          path: 'robots%2Frobot1.zip'
        }
      ])
    );

    $scope.generateRobotsModels().then(res =>
      expect(res).toEqual([
        Object({
          configPath: 'robots/<robot folder>/model.config',
          modelPath: 'robot1',
          zipURI: undefined,
          modelSDF: 'model.sdf',
          modelTitle: 'robot1 name',
          thumbnail: '<robot png data>',
          custom: undefined,
          public: true,
          isRobot: true
        }),
        Object({
          configPath: 'robots%2Frobot1.zip',
          modelPath: 'robot1',
          zipURI: 'robot1.zip',
          modelSDF: undefined,
          modelTitle: 'custom robot1 name',
          thumbnail: '<robot png data>',
          custom: true,
          public: undefined,
          isRobot: true
        })
      ])
    );
    $scope.$digest();
  });

  it('should not spawn models when in INITIALIZED state', function() {
    spyOn($scope, 'addModel');
    spyOn(window.guiEvents, 'emit');
    $scope.stateService.currentState = $scope.STATE.INITIALIZED;
    var addBoxBtnDomElem = element.find('#insert-entity-box');
    var addBoxBtn = angular.element(addBoxBtnDomElem);

    addBoxBtn.triggerHandler('mousedown');
    expect($scope.addModel).toHaveBeenCalled();
    expect($scope.addModel.calls.mostRecent().args[0].modelPath).toBe('box');
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
      'box',
      undefined
    );
  });

  it('should open object inspector after adding a model', function() {
    let mockModel = {
      modelPath: 'model-path',
      modelSDF: 'model.sdf'
    };
    let mockModelCreated = {};

    $scope.addModel(mockModel);
    $scope.onEntityCreated(mockModelCreated, mockModel.modelPath);

    expect($scope.gz3d.scene.selectEntity).toHaveBeenCalledWith(
      mockModelCreated
    );
    expect(goldenLayoutService.openTool).toHaveBeenCalledWith(
      $scope.TOOL_CONFIGS.OBJECT_INSPECTOR
    );
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

describe('Directive: environment-designer robots models', function() {
  var $scope,
    backendInterfaceService,
    gz3d,
    httpBackend,
    stateService,
    storageServer,
    newExperimentProxyService,
    environmentService,
    $q;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(module('currentStateMockFactory'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('stateServiceMock'));
  beforeEach(module('dynamicViewOverlayServiceMock'));
  beforeEach(module('goldenLayoutServiceMock'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('sceneInfoMock'));

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

      window.GZ3D.modelList = [];
    })
  );

  beforeEach(
    inject(function(
      $rootScope,
      $compile,
      $document,
      _EDIT_MODE_,
      _STATE_,
      _TOOL_CONFIGS_,
      _backendInterfaceService_,
      _currentStateMockFactory_,
      _gz3d_,
      _stateService_,
      _panels_,
      _simulationSDFWorld_,
      _simulationInfo_,
      _clbErrorDialog_,
      _environmentService_,
      _goldenLayoutService_,
      _$httpBackend_,
      _storageServer_,
      _newExperimentProxyService_,
      _$q_
    ) {
      $scope = $rootScope.$new();
      $scope.EDIT_MODE = _EDIT_MODE_;
      $scope.STATE = _STATE_;
      $scope.TOOL_CONFIGS = _TOOL_CONFIGS_;

      backendInterfaceService = _backendInterfaceService_;
      gz3d = _gz3d_;
      httpBackend = _$httpBackend_;
      stateService = _stateService_;
      storageServer = _storageServer_;
      newExperimentProxyService = _newExperimentProxyService_;
      environmentService = _environmentService_;
      $q = _$q_;
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
              thumbnail: 'img/esv/objects/cylinder.png',
              physicsIgnore: 'opensim'
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
              thumbnail: 'img/esv/objects/directionallight.png',
              physicsIgnore: 'bullet'
            }
          ]
        }
      ];
      httpBackend.whenGET(/.*assets.*/).respond(modelLibraryMock);

      $compile('<environment-designer />')($scope);
      spyOn(environmentService, 'isDevMode').and.returnValue(true);
      spyOn(newExperimentProxyService, 'getTemplateModels').and.returnValue(
        $q.resolve({
          data: [
            {
              name: 'robot1 name',
              description: 'robot1 description',
              thumbnail: '<robot png data>',
              id: 'robot1',
              path: 'robots/<robot folder>/model.config'
            }
          ]
        })
      );
      spyOn(storageServer, 'getCustomModels').and.returnValue(
        $q.resolve([
          {
            name: 'custom robot1 name',
            description: 'custom robot1 description',
            thumbnail: '<robot png data>',
            id: 'robot1',
            fileName: 'robots/robot1.zip',
            path: 'robots%2Frobot1.zip'
          }
        ])
      );
      $scope.$digest();
      httpBackend.flush();
    })
  );

  it('should check that dev mode is correctly set', function() {
    expect($scope.devMode).toBe(true);
  });

  it(' - addRobot()', function() {
    spyOn(backendInterfaceService, 'addRobot');

    let robotModel = {
      modelPath: 'my_robot',
      modelSDF: 'model.sdf',
      modelTitle: 'MyRobot',
      custom: false,
      zipURI: undefined,
      isRobot: true
    };

    // call with invalid state
    stateService.currentState = $scope.STATE.INITIALIZED;
    $scope.addRobot(robotModel);
    expect(gz3d.scene.spawnModel.start).not.toHaveBeenCalled();
    expect(backendInterfaceService.addRobot).not.toHaveBeenCalled();

    // valid state, no custom model
    stateService.currentState = $scope.STATE.STARTED;
    let obj = {
      name: 'my_robot_scene_name',
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 4, y: 5, z: 6 }
    };
    gz3d.iface.addOnCreateEntityCallbacks.and.callFake(callback => {
      callback(obj);
    });
    gz3d.iface.onCreateEntityCallbacks = [];
    gz3d.scene.spawnModel.start.and.callFake(
      (modelPath, modelSDF, modelTitle, callback) => {
        callback(obj);
      }
    );
    $scope.addRobot(robotModel);
    expect(backendInterfaceService.addRobot).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.any(String),
      jasmine.any(Object),
      'False'
    );

    // custom model
    robotModel.custom = true;
    robotModel.zipURI = 'path/to/zip';
    gz3d.scene.spawnModel.start.and.callFake(
      (modelPath, modelSDF, modelTitle, callback) => {
        callback(obj);
      }
    );
    $scope.addRobot(robotModel);
    expect(backendInterfaceService.addRobot).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.any(String),
      jasmine.any(Object),
      'True'
    );
  });

  it(' - onModelMouseDown(), robot', function() {
    spyOn($scope, 'addRobot');
    spyOn(backendInterfaceService, 'getCustomRobot').and.returnValue({
      then: callback => {
        callback();
      }
    });

    let robotModel = {
      modelPath: 'my_robot',
      modelSDF: 'model.sdf',
      modelTitle: 'MyRobot',
      custom: false,
      zipURI: undefined,
      isRobot: true
    };

    // no custom robot
    let event = { preventDefault: jasmine.createSpy('preventDefault') };
    $scope.onModelMouseDown(event, robotModel);
    expect($scope.addRobot).toHaveBeenCalledWith(robotModel);

    // custom robot
    robotModel.custom = true;
    robotModel.zipURI = 'path/to/zip';
    $scope.onModelMouseDown(event, robotModel);
    expect(backendInterfaceService.getCustomRobot).toHaveBeenCalled();
    expect($scope.addRobot).toHaveBeenCalledWith(robotModel);
  });
});
