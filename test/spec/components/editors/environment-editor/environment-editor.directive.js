'use strict';

describe('Directive: environment-designer', function() {
  var rootScope,
    $scope,
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
    $q,
    clbConfirm,
    backendInterfaceService;

  let modelLibraryMock;

  let storageServerMock = {
    getCustomModels: jasmine.createSpy('getCustomModels').and.returnValue(
      Promise.resolve([
        {
          name: 'custom robot1 name',
          description: 'custom robot1 description',
          thumbnail: '<robot png data>',
          id: 'robot1',
          fileName: 'robots/robot1.zip',
          path: 'robots%2Frobot1.zip'
        }
      ])
    ),
    saveBrain: jasmine.createSpy('saveBrain'),
    getCurrentUser: jasmine
      .createSpy('getCurrentUser')
      .and.returnValue(Promise.resolve()),
    getUser: jasmine.createSpy('getUser').and.returnValue(Promise.resolve()),
    getAllCustomModels: jasmine
      .createSpy()
      .and.callFake(() => window.$q.when()),
    getBrain: jasmine
      .createSpy('getBrain')
      .and.callFake(() => window.$q.resolve({ brain: 'somebrain' }))
  };

  let backendInterfaceServiceMock = {
    addRobot: jasmine.createSpy('addRobot').and.returnValue(Promise.resolve()),
    setBrain: jasmine.createSpy('setBrain').and.returnValue(Promise.resolve())
  };
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
      $provide.value('storageServer', storageServerMock);
      $provide.value('backendInterfaceService', backendInterfaceServiceMock);
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
      _$q_,
      _clbConfirm_,
      _backendInterfaceService_
    ) {
      rootScope = $rootScope;
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
      clbConfirm = _clbConfirm_;
      backendInterfaceService = _backendInterfaceService_;

      spyOn(newExperimentProxyService, 'getTemplateModels').and.returnValue(
        $q.resolve(
          $q.resolve({
            data: [
              {
                name: 'robot1 name',
                sdf: 'model.sdf',
                description: 'robot1 description',
                thumbnail: '<robot png data>',
                id: 'robot1',
                configPath: 'robots/<robot folder>/model.config',
                isRobot: true
              },
              {
                name: 'robot2 name',
                sdf: 'model.sdf',
                thumbnail: '<robot png data>',
                id: 'robot1',
                configPath: 'robots/<robot folder>/model.config',
                isRobot: true
              }
            ]
          })
        )
      );

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
          ],
          color: { default: 'defaultColour' }
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
          ],
          color: { default: 'defaultColour' }
        }
      ];
      httpBackend.whenGET(/.*assets.*/).respond(modelLibraryMock);

      spyOn(document, 'addEventListener');
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
    $scope.toggleVisibleCategory($scope.categories[0]);
    $scope.updateVisibleModels();
    $scope.$apply();
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
    storageServer.getCustomModels.and.returnValue(
      $q.resolve([
        {
          name: 'custom robot1 name',
          description: 'custom robot1 description',
          thumbnail: '<robot png data>',
          id: 'robot1',
          fileName: 'robots/robot1.zip',
          path: 'robots%2Frobot1.zip'
        },
        {
          name: 'custom robot2 name',
          thumbnail: '<robot png data>',
          id: 'robot2',
          fileName: 'robots/robot2.zip',
          path: 'robots%2Frobot2.zip'
        }
      ])
    );

    $scope.generateRobotsModels().then(res =>
      expect(res[0]).toEqual({
        configPath: 'robots/<robot folder>/model.config',
        modelPath: 'robot1',
        path: undefined,
        modelSDF: 'model.sdf',
        modelTitle: 'robot1 name',
        thumbnail: '<robot png data>',
        custom: undefined,
        public: true,
        isRobot: true,
        description: 'robot1 description'
      })
    );
    $scope.$digest();
  });

  it('should generate the brain models from the proxy call', function() {
    newExperimentProxyService.getTemplateModels.and.returnValue(
      $q.resolve({
        data: [
          {
            name: 'brain1 name',
            description: 'brain1 description',
            path: 'brain_models/<brain1 folder>/brain1.py',
            isBrain: true
          },
          {
            name: 'brain2 name',
            path: 'brain_models/<brain2 folder>/brain2.py',
            isBrain: true
          }
        ]
      })
    );
    storageServer.getCustomModels.and.returnValue(
      $q.resolve([
        {
          name: 'custom brain1 name',
          description: 'custom brain1 description',
          thumbnail: '<brain1 png data>',
          id: 'brain1',
          fileName: 'brain_models/brain1.zip',
          path: 'brains_models%2Fbrain1.zip'
        },
        {
          name: 'custom robot2 name',
          thumbnail: '<brain2 png data>',
          id: 'brain2',
          fileName: 'brain_models/brain2.zip',
          path: 'brain_models%2Fbrain2.zip'
        }
      ])
    );

    $scope.generateBrainsModels().then(res =>
      expect(res[0]).toEqual({
        configPath: undefined,
        path: 'brain_models/<brain1 folder>/brain1.py',
        modelPath: undefined,
        modelTitle: 'brain1 name',
        thumbnail: undefined,
        custom: undefined,
        public: true,
        isBrain: true,
        script: undefined,
        description: 'brain1 description'
      })
    );
    $scope.$digest();
  });

  it('should open an error dialog if the file to upload has not the zip extension', function() {
    spyOn(clbErrorDialog, 'open');
    $scope.uploadModelZip({ type: 'wrong type' }, {});
    $scope.$digest();
    expect(clbErrorDialog.open).toHaveBeenCalled();
  });

  it('should upload a custom model when past a valid zip and regenerate the models', function() {
    spyOn(window, 'FileReader').and.returnValue({
      readAsArrayBuffer: function() {
        this.onload({ target: { result: 'fakeZip' } });
      }
    });
    spyOn($scope, 'existsModelCustom').and.returnValue(window.$q.resolve());
    spyOn($scope, 'regenerateModels').and.returnValue(window.$q.resolve());
    storageServer.setCustomModel = jasmine
      .createSpy()
      .and.returnValue(window.$q.resolve());
    const entityType = 'entityType';
    $scope.uploadModelZip({ type: 'application/zip' }, entityType);
    rootScope.$digest();
    expect(storageServer.getAllCustomModels).toHaveBeenCalledWith(entityType);
    expect(storageServer.setCustomModel).toHaveBeenCalled();
    expect($scope.regenerateModels).toHaveBeenCalled();
    expect($scope.uploadingModel).toBe(false);
  });

  it('should createErrorPopupwhen failing to setCustomModel', function() {
    spyOn(window, 'FileReader').and.returnValue({
      readAsArrayBuffer: function() {
        this.onload({ target: { result: 'fakeZip' } });
      }
    });
    spyOn($scope, 'existsModelCustom').and.returnValue(window.$q.resolve());
    spyOn($scope, 'createErrorPopup').and.returnValue(window.$q.resolve());
    storageServer.setCustomModel = jasmine
      .createSpy()
      .and.returnValue(window.$q.reject({}));
    const entityType = 'entityType';
    $scope.uploadModelZip({ type: 'application/zip' }, entityType);
    rootScope.$digest();
    expect(storageServer.getAllCustomModels).toHaveBeenCalledWith(entityType);
    expect(storageServer.setCustomModel).toHaveBeenCalled();
    expect($scope.createErrorPopup).toHaveBeenCalled();
    expect($scope.uploadingModel).toBe(false);
  });

  it('should call uploadModelZip when uploading a model', () => {
    const inputMock = [];
    inputMock.on = jasmine.createSpy();
    inputMock.click = jasmine.createSpy();
    inputMock.push({ files: [{ type: 'application/zip' }] });
    spyOn(window, '$').and.returnValue(inputMock);
    spyOn(document.body, 'appendChild');
    spyOn(document.body, 'removeChild');

    spyOn($scope, 'uploadModelZip');
    const modelType = 'modelType';
    $scope.uploadModel(modelType);

    expect(window.$).toHaveBeenCalled();
    expect(inputMock.on).toHaveBeenCalledTimes(2);
    expect(inputMock.click).toHaveBeenCalled();
    expect(inputMock.on.calls.count()).toBe(2);
    const uploadCallback = inputMock.on.calls.argsFor(0)[1];
    uploadCallback({ target: { files: [] } });
    expect($scope.uploadModelZip).toHaveBeenCalled();
    const uploadingModelFlagCb = inputMock.on.calls.argsFor(1)[1];
    expect($scope.uploadingModel).toBeFalsy();
    uploadingModelFlagCb();
    expect($scope.uploadingModel).toBe(true);
  });

  it('should call clbErrorDialog when creating errorPopup', () => {
    spyOn(clbErrorDialog, 'open');
    const errMsg = 'errMsg';
    $scope.createErrorPopup(errMsg);
    expect(clbErrorDialog.open).toHaveBeenCalledWith({
      type: 'Error.',
      message: errMsg
    });
  });

  it('should prevent context menu', () => {
    expect(document.addEventListener).toHaveBeenCalledWith(
      'contextmenu',
      jasmine.any(Function)
    );
    const contextmenuCb = document.addEventListener.calls.mostRecent().args[1];
    const eventMock = {
      preventDefault: jasmine.createSpy()
    };
    contextmenuCb(eventMock);
    expect(eventMock.preventDefault).toHaveBeenCalled();
  });

  it('should generate a robot or a brain depending on the category', function() {
    spyOn($scope, 'generateRobotsModels').and.returnValue($q.resolve());
    spyOn($scope, 'generateBrainsModels').and.returnValue($q.resolve());
    $scope
      .generateModel('Robots')
      .then(() => expect($scope.generateRobotsModels).toHaveBeenCalled());
    $scope.$digest();

    $scope
      .generateModel('Brains')
      .then(() => expect($scope.generateBrainsModels).toHaveBeenCalled());
    $scope.$digest();

    $scope.generateRobotsModels.calls.reset();
    $scope.generateBrainsModels.calls.reset();
    $scope.generateModel('Other models').catch(() => {
      expect($scope.generateRobotsModels).not.toHaveBeenCalled();
      expect($scope.generateBrainsModels).not.toHaveBeenCalled();
    });
    $scope.$digest();
  });

  it('should regenerate a model of the Brains or Robots category', function() {
    spyOn($scope, 'generateModel').and.returnValue($q.resolve());
    $scope.categories = [{ title: 'Brains' }, { title: 'Robots' }];
    $scope.regenerateModels().then(() => {
      for (let i = 0; i <= 1; i++)
        expect($scope.generateModel).toHaveBeenCalledWith(
          $scope.categories[i].title
        );
    });
    $scope.$digest();

    $scope.categories = [{ title: 'Broccoli' }];
    $scope.generateModel.calls.reset();
    $scope
      .regenerateModels()
      .then(() => expect($scope.generateModel).not.toHaveBeenCalled());
    $scope.$digest();
  });

  it('should fail to generate the robots models from the proxy call', function() {
    newExperimentProxyService.getTemplateModels.and.returnValue($q.reject());
    storageServer.getCustomModels.and.returnValue($q.reject());
    spyOn(clbErrorDialog, 'open');

    $scope
      .generateRobotsModels()
      .then(() => expect(clbErrorDialog.open).toHaveBeenCalled());
    $scope.$digest();
  });

  it('should fail to generate the brains models from the proxy call', function() {
    newExperimentProxyService.getTemplateModels.and.returnValue($q.reject());
    storageServer.getCustomModels.and.returnValue($q.reject());
    spyOn(clbErrorDialog, 'open');

    $scope
      .generateBrainsModels()
      .then(() => expect(clbErrorDialog.open).toHaveBeenCalled());
    $scope.$digest();
  });

  it('should add a brain successfully', function() {
    spyOn(clbConfirm, 'open').and.returnValue($q.resolve());
    storageServer.saveBrain.and.returnValue($q.resolve());

    backendInterfaceService.setBrain.and.returnValue($q.resolve());

    $scope.addBrain({
      script: 'testScript',
      modelPath: 'testPath',
      description: 'you wont believe it!'
    });
    rootScope.$digest();
    expect(storageServer.getBrain).toHaveBeenCalled();
    expect(storageServer.saveBrain).toHaveBeenCalled();
    expect(backendInterfaceService.setBrain).toHaveBeenCalled();
    expect(storageServer.saveBrain).toHaveBeenCalled();
    expect(goldenLayoutService.openTool).toHaveBeenCalledWith(
      $scope.TOOL_CONFIGS.BRAIN_EDITOR
    );
  });

  it('should check if a custom model already exists: wrong owner ', function(
    done
  ) {
    spyOn(clbConfirm, 'open').and.returnValue($q.resolve());
    spyOn(clbErrorDialog, 'open').and.returnValue($q.resolve());
    $scope.owner = 'the_owner';
    let filename = 'some_suitable_filename';
    $scope
      .checkIfAppendExistsModelCustom([{ userId: 'not_the_owner' }], filename)
      .catch(() => {
        expect(clbErrorDialog.open).toHaveBeenCalledWith({
          type: `A Custom Model already exists with the name ${filename}`,
          message:
            'The model you tried to upload already exists in the database. Rename it and try uploading it again.'
        });
        done();
      });
    $scope.$digest();
  });

  it('should check if a custom model already exists: correct owner ', function(
    done
  ) {
    spyOn(clbConfirm, 'open').and.returnValue($q.resolve());
    $scope.owner = 'the_owner';
    let filename = 'some_suitable_filename';
    $scope
      .checkIfAppendExistsModelCustom([{ userId: 'the_owner' }], filename)
      .then(() => {
        expect(clbConfirm.open).toHaveBeenCalledWith({
          title: `One of your custom models already has the name: ${filename}`,
          confirmLabel: 'Yes',
          cancelLabel: 'No',
          template: 'Are you sure you would like to upload the file again?',
          closable: true
        });
        done();
      });
    $scope.$digest();
  });

  it('should check if a custom model with a given filename exists', function(
    done
  ) {
    spyOn($scope, 'checkIfAppendExistsModelCustom').and.returnValue(
      $q.resolve()
    );
    let filename = 'some_suitable_filename';
    let customModels = [{ fileName: [filename] }];
    $scope.existsModelCustom(customModels, filename).then(() => {
      expect($scope.checkIfAppendExistsModelCustom).toHaveBeenCalledWith(
        customModels,
        filename
      );
      done();
    });
    $scope.$digest();

    customModels = [{ fileName: [] }];
    $scope.checkIfAppendExistsModelCustom.calls.reset();
    $scope.existsModelCustom(customModels, filename).then(() => {
      expect($scope.checkIfAppendExistsModelCustom).not.toHaveBeenCalledWith(
        customModels,
        filename
      );
      done();
    });
    $scope.$digest();
  });

  it('should add a brain even though the backend throws', function() {
    spyOn(clbConfirm, 'open').and.returnValue($q.resolve());
    backendInterfaceService.setBrain.and.returnValue(
      // eslint-disable-next-line camelcase
      $q.reject({ data: { error_message: 'Transfer Function' } })
    );
    storageServer.saveBrain.and.returnValue($q.resolve());
    spyOn(clbErrorDialog, 'open').and.returnValue($q.resolve());

    $scope
      .addBrain({ script: 'testScript', modelPath: 'testPath' })
      .then(() => {
        expect(goldenLayoutService.openTool).toHaveBeenCalledWith(
          $scope.TOOL_CONFIGS.BRAIN_EDITOR
        );
        expect(clbErrorDialog.open).toHaveBeenCalledWith({
          type: 'Error while setting brain.',
          message:
            'Some of the transfer functions are referencing variables from the old brain script.               Please remove these transfer functions to activate the brain script'
        });
      });
    $scope.$digest();
  });

  it('should not spawn models when in INITIALIZED state', function() {
    spyOn($scope, 'addModel');
    spyOn(window.guiEvents, 'emit');
    $scope.toggleVisibleCategory($scope.categories[0]);
    $scope.updateVisibleModels();
    $scope.$apply();
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
    $scope.toggleVisibleCategory($scope.categories[0]);
    $scope.updateVisibleModels();
    $scope.$apply();
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

  it(' - addRobot()', function() {
    spyOn(backendInterfaceService, 'addRobot');

    let robotModel = {
      modelPath: 'my_robot',
      modelSDF: 'model.sdf',
      modelTitle: 'MyRobot',
      custom: false,
      path: undefined,
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
    let diffObj = angular.copy(obj);
    diffObj.name = 'a_different_name'; // Test branching condition 'if(model.name !== robotID)'
    gz3d.scene.spawnModel.start.and.callFake(
      (modelPath, modelSDF, modelTitle, callback) => {
        callback(diffObj);
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
    robotModel.path = 'path/to/zip';
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
      path: undefined,
      isRobot: true
    };

    // No custom robot
    let event = { preventDefault: jasmine.createSpy('preventDefault') };
    $scope.onModelMouseDown(event, robotModel);
    expect($scope.addRobot).toHaveBeenCalledWith(robotModel);

    // Custom robot
    robotModel.custom = true;
    robotModel.path = 'path/to/zip';
    $scope.onModelMouseDown(event, robotModel);
    expect(backendInterfaceService.getCustomRobot).toHaveBeenCalled();
    expect($scope.addRobot).toHaveBeenCalledWith(robotModel);

    // Not a robot nor a brain
    $scope.addRobot.calls.reset();
    spyOn($scope, 'addModel').and.callThrough();
    robotModel.isRobot = false;
    $scope.stateService.currentState = $scope.STATE.INITIALIZED;
    $scope.onModelMouseDown(event, robotModel);
    expect($scope.addRobot).not.toHaveBeenCalled();
    expect($scope.addModel).toHaveBeenCalled();
  });

  it(' - onModelMouseDown(), brain', function() {
    spyOn($scope, 'addBrain');
    let brainModel = {
      modelPath: 'brain_model/path_to_brain_file',
      modelTitle: 'nut',
      isBrain: true
    };
    let event = { preventDefault: jasmine.createSpy('preventDefault') };
    $scope.onModelMouseDown(event, brainModel);
    expect($scope.addBrain).toHaveBeenCalledWith(brainModel);
  });
});
