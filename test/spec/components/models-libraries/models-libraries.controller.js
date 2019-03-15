'use strict';

describe('Controller: ModelsLibrariesController', function() {
  let modelsLibrariesController, modelsLibrariesService;

  let $controller,
    $rootScope,
    $scope,
    $q,
    $httpBackend,
    clbConfirm,
    clbErrorDialog;
  const templateModels = [
    {
      description:
        'Modified Hollie arm model for force based index finger movements.↵      In contrast to the first Hollie arm model it was required to remove the↵      PID control of the index finger joints to allow force control for this↵      particular finger.',
      id: 'arm_robot_force',
      maturity: 'production',
      name: 'Arm robot force based version',
      path: 'arm_robot_force / model.config',
      sdf: 'arm_robot_force.sdf',
      thumbnail: 'thumbnail.png'
    },
    {
      description:
        'Model of an idustrial arm and hand robot.↵        The arm: Schunk Powerball Lightweight Arm LWA 4P↵        The hand: Schunk SVH 5-finger hand.',
      id: 'arm_robot',
      maturity: 'development',
      name: 'Arm robot',
      path: 'arm_robot/model.config',
      sdf: 'arm_robot.sdf',
      thumbnail: 'thumbnail.png'
    }
  ];

  const customModels = [
    {
      configPath: 'p3dxbenchmark/model.config',
      description: 'A ROS/Gazebo Pioneer 3DX model.',
      fileName: 'robots/p3dxbenchmark_world3.zip',
      id: 'p3dx',
      name: 'Pioneer 3DX',
      path: 'robots%2Fp3dx.zip',
      sdf: 'p3dx.sdf',
      thumbnail: 'thumbnail.png'
    }
  ];

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('storageServerMock'));
  beforeEach(module('nrpUserMock'));
  beforeEach(module('modelsLibraries'));

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _modelsLibrariesService_,
      _$q_,
      _$httpBackend_,
      _clbConfirm_,
      _clbErrorDialog_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      modelsLibrariesService = _modelsLibrariesService_;
      $q = _$q_;
      $httpBackend = _$httpBackend_;
      clbConfirm = _clbConfirm_;
      clbErrorDialog = _clbErrorDialog_;
    })
  );

  beforeEach(
    inject(function($compile) {
      $httpBackend.whenGET('http://proxy/models/robots').respond({});
      $httpBackend.whenGET('http://proxy/models/environments').respond({});
      $httpBackend.whenGET('http://proxy/models/brains').respond({});

      $scope = $rootScope.$new();
      modelsLibrariesController = $controller('modelsLibrariesController', {
        $rootScope: $rootScope,
        $scope: $scope
      });
      $compile('<models-libraries />')($scope);
    })
  );

  it('should loadAllModels successfully', function() {
    spyOn(modelsLibrariesService, 'generateModels').and.returnValue(
      $q.resolve([...templateModels, ...customModels])
    );
    spyOn(modelsLibrariesService, 'getRobotConfig').and.returnValue(
      'http://proxy/models/robots/p3dx/config'
    );
    modelsLibrariesController.loadAllModels().then(() => {
      expect(modelsLibrariesService.generateModels).toHaveBeenCalledTimes(3);
      expect(modelsLibrariesController.models[0].name).toBe('robots');
      expect(modelsLibrariesController.models[0].data[0].name).toBe(
        'Arm robot force based version'
      );
      expect(modelsLibrariesController.models[0].data[0].configpath).toBe(
        'http://proxy/models/robots/p3dx/config'
      );
      expect(modelsLibrariesController.models[1].name).toBe('environments');
      expect(modelsLibrariesController.models[1].data[1].maturity).toBe(
        'development'
      );
      expect(modelsLibrariesController.models[2].name).toBe('brains');
      expect(modelsLibrariesController.models[2].data[2].thumbnail).toBe(
        'thumbnail.png'
      );
    });
    $rootScope.$apply();
  });

  it('should find a category successfully', function() {
    expect(modelsLibrariesController.findCategory('robots')).toEqual({
      name: 'robots',
      visible: false,
      data: undefined,
      loading: false
    });
  });

  it('should toggle the visibilty of a category successfully', function() {
    modelsLibrariesController.toggleVisibility('robots');
    expect(
      modelsLibrariesController.findCategory('robots').visible
    ).toBeTruthy();
    modelsLibrariesController.toggleVisibility('robots');
    expect(
      modelsLibrariesController.findCategory('robots').visible
    ).toBeFalsy();
  });

  it('should select an entity', function() {
    spyOn(modelsLibrariesService, 'generateModels').and.returnValue(
      $q.resolve([...templateModels, ...customModels])
    );
    spyOn(modelsLibrariesService, 'getRobotConfig').and.returnValue(
      'http://proxy/models/robots/p3dx/config'
    );
    modelsLibrariesController.loadAllModels().then(() => {
      modelsLibrariesController.selectEntity('robots%2Fp3dx.zip');
      expect(
        modelsLibrariesController.findCategory('robots').data[2].isSelected
      ).toBeTruthy();
    });
    $rootScope.$apply();
  });

  it('should delete a model successfully', function() {
    spyOn(modelsLibrariesService, 'deleteCustomModel').and.returnValue(
      $q.resolve()
    );
    spyOn(clbConfirm, 'open').and.returnValue($q.resolve());
    spyOn(modelsLibrariesController, 'loadAllModels').and.returnValue(
      $q.resolve()
    );
    modelsLibrariesController.deleteModel('robots%2Fp3dx.zip').then(() => {
      expect(modelsLibrariesService.deleteCustomModel).toHaveBeenCalledWith(
        'robots%2Fp3dx.zip'
      );
      expect(modelsLibrariesController.loadAllModels).toHaveBeenCalled();
    });
    $rootScope.$apply();
  });

  it('should fail to delete a model', function() {
    spyOn(modelsLibrariesService, 'generateModels').and.returnValue(
      $q.resolve([...templateModels, ...customModels])
    );
    spyOn(modelsLibrariesService, 'getRobotConfig').and.returnValue(
      'http://proxy/models/robots/p3dx/config'
    );
    spyOn(modelsLibrariesService, 'deleteCustomModel').and.returnValue(
      $q.reject('Error,could not delete custom model')
    );
    spyOn(clbErrorDialog, 'open');
    spyOn(clbConfirm, 'open').and.returnValue($q.resolve());
    modelsLibrariesController.deleteModel('robots%2Fp3dx.zip').then(() => {
      expect(modelsLibrariesService.deleteCustomModel).toHaveBeenCalledWith(
        'robots%2Fp3dx.zip'
      );
      expect(clbErrorDialog.open).toHaveBeenCalledWith({
        type: 'Error.',
        message: 'Error,could not delete custom model'
      });
    });
    $rootScope.$apply();
  });

  it('should open an error dialog if the file to upload has not the zip extension', function() {
    spyOn(clbErrorDialog, 'open');
    modelsLibrariesController.uploadModelZip({ type: 'wrong type' }, {});
    $scope.$digest();
    expect(clbErrorDialog.open).toHaveBeenCalled();
  });

  it('should upload a custom model when a valid zip is provided and reload the models', function() {
    spyOn(window, 'FileReader').and.returnValue({
      readAsArrayBuffer: function() {
        this.onload({ target: { result: 'fakeZip' } });
      }
    });
    spyOn(modelsLibrariesController, 'existsModelCustom').and.returnValue(
      $q.resolve()
    );
    spyOn(modelsLibrariesService, 'getCustomModels').and.returnValue(
      $q.resolve()
    );
    spyOn(modelsLibrariesController, 'loadAllModels').and.returnValue(
      $q.resolve()
    );
    spyOn(modelsLibrariesController, 'selectEntity').and.callFake(
      () => undefined
    );
    spyOn(modelsLibrariesController, 'findCategory').and.returnValue({
      data: [
        {
          path: {
            toString: () => 'fakeZip',
            includes: () => true
          }
        }
      ]
    });
    modelsLibrariesService.setCustomModel = jasmine
      .createSpy()
      .and.returnValue($q.resolve());
    const entityType = 'entityType';
    modelsLibrariesController.uploadModelZip(
      { type: 'application/zip' },
      entityType
    );
    $rootScope.$digest();
    expect(modelsLibrariesService.getCustomModels).toHaveBeenCalledWith(
      entityType
    );
    expect(modelsLibrariesService.setCustomModel).toHaveBeenCalled();
    expect(modelsLibrariesController.loadAllModels).toHaveBeenCalled();
    expect(modelsLibrariesController.uploadingModel).toBe(false);
  });

  it('should createErrorPopupwhen failing to setCustomModel', function() {
    spyOn(window, 'FileReader').and.returnValue({
      readAsArrayBuffer: function() {
        this.onload({ target: { result: 'fakeZip' } });
      }
    });
    spyOn(modelsLibrariesService, 'getCustomModels').and.returnValue(
      $q.resolve()
    );
    spyOn(modelsLibrariesController, 'existsModelCustom').and.returnValue(
      $q.resolve()
    );
    spyOn(modelsLibrariesController, 'createErrorPopup').and.returnValue(
      $q.resolve()
    );
    modelsLibrariesService.setCustomModel = jasmine
      .createSpy()
      .and.returnValue($q.reject({}));
    const entityType = 'entityType';
    modelsLibrariesController.uploadModelZip(
      { type: 'application/zip' },
      entityType
    );
    $rootScope.$digest();
    expect(modelsLibrariesService.getCustomModels).toHaveBeenCalledWith(
      entityType
    );
    expect(modelsLibrariesController.createErrorPopup).toHaveBeenCalled();
    expect(modelsLibrariesService.setCustomModel).toHaveBeenCalled();
  });

  it('should call uploadModelZip when uploading a model', () => {
    const inputMock = [];
    inputMock.on = jasmine.createSpy();
    inputMock.click = jasmine.createSpy();
    inputMock.push({ files: [{ type: 'application/zip' }] });
    spyOn(window, '$').and.returnValue(inputMock);
    spyOn(document.body, 'appendChild');
    spyOn(document.body, 'removeChild');

    spyOn(modelsLibrariesController, 'uploadModelZip');
    const modelType = 'modelType';
    modelsLibrariesController.uploadModel(modelType);

    expect(window.$).toHaveBeenCalled();
    expect(inputMock.on).toHaveBeenCalledTimes(1);
    expect(inputMock.click).toHaveBeenCalled();
    expect(inputMock.on.calls.count()).toBe(1);
    const uploadCallback = inputMock.on.calls.argsFor(0)[1];
    uploadCallback({ target: { files: [] } });
    expect(modelsLibrariesController.uploadModelZip).toHaveBeenCalled();
    expect(modelsLibrariesController.uploadingModel).toBe(true);
  });

  it('should check if a custom model already exists: wrong owner ', function(
    done
  ) {
    spyOn(clbConfirm, 'open').and.returnValue($q.resolve());
    spyOn(clbErrorDialog, 'open').and.returnValue($q.resolve());
    modelsLibrariesController.owner = 'the_owner';
    let filename = 'some_suitable_filename';
    modelsLibrariesController
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

  it('should check if a custom model already exists: correct owner ', () => {
    spyOn(clbConfirm, 'open').and.returnValue($q.resolve());
    modelsLibrariesController.owner = 'the_owner';
    let filename = 'some_suitable_filename';
    modelsLibrariesController
      .checkIfAppendExistsModelCustom([{ userId: 'the_owner' }], filename)
      .then(() => {
        expect(clbConfirm.open).toHaveBeenCalledWith({
          title: `One of your custom models already has the name: ${filename}`,
          confirmLabel: 'Yes',
          cancelLabel: 'No',
          template: 'Are you sure you would like to upload the file again?',
          closable: true
        });
      });
    $rootScope.$apply();
  });

  it('should check if a custom model with a given filename exists', () => {
    spyOn(
      modelsLibrariesController,
      'checkIfAppendExistsModelCustom'
    ).and.returnValue($q.resolve());
    let filename = 'some_suitable_filename';
    let customModels = [{ fileName: [filename] }];
    modelsLibrariesController
      .existsModelCustom(customModels, filename)
      .then(() => {
        expect(
          modelsLibrariesController.checkIfAppendExistsModelCustom
        ).toHaveBeenCalledWith(
          { fileName: ['some_suitable_filename'] },
          'some_suitable_filename'
        );
      });
    $rootScope.$apply();

    customModels = [{ fileName: [] }];
    modelsLibrariesController.checkIfAppendExistsModelCustom.calls.reset();
    modelsLibrariesController
      .existsModelCustom(customModels, filename)
      .then(() => {
        expect(
          modelsLibrariesController.checkIfAppendExistsModelCustom
        ).not.toHaveBeenCalledWith(customModels, filename);
      });
    $rootScope.$apply();
  });
});
