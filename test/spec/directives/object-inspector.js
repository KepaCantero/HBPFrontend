'use strict';

describe('Directive: object-inspector', function() {
  var $rootScope,
    $compile,
    $scope,
    getFileContentDefer,
    storageServer,
    backendInterfaceService;
  var gz3d, serverError;
  var elementScope;
  var objectInspectorService;

  var baseEventHandlerMock = {
    suppressAnyKeyPress: jasmine.createSpy('suppressAnyKeyPress')
  };

  beforeEach(module('objectInspectorModule'));
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(module('goldenLayoutServiceMock'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('userNavigationServiceMock'));
  beforeEach(
    module(function($provide) {
      $provide.value('baseEventHandler', baseEventHandlerMock);
    })
  );

  beforeEach(
    inject(function(
      _$rootScope_,
      _$compile_,
      _gz3d_,
      _objectInspectorService_,
      _storageServer_,
      _backendInterfaceService_,
      _serverError_
    ) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      gz3d = _gz3d_;
      objectInspectorService = _objectInspectorService_;
      storageServer = _storageServer_;
      backendInterfaceService = _backendInterfaceService_;
      serverError = _serverError_;

      spyOn(gz3d.gui.guiEvents, 'on').and.callThrough();
      spyOn(gz3d.gui.guiEvents, 'removeListener').and.callThrough();
      spyOn(angular, 'isDefined').and.returnValue(true);

      getFileContentDefer = window.$q.defer();
      spyOn(storageServer, 'getFileContent').and.returnValue(
        getFileContentDefer.promise
      );
    })
  );

  beforeEach(function() {
    $scope = $rootScope.$new();
    $compile('<object-inspector></object-inspector>')($scope);
    $scope.$digest();

    elementScope = $scope.$$childTail;
  });

  it('should call baseEventHandler.suppressAnyKeyPress on suppressKeyPress', function() {
    elementScope.suppressKeyPress();
    expect(baseEventHandlerMock.suppressAnyKeyPress).toHaveBeenCalled();
  });

  it('should register guiEvents has to be removed on destroy', function() {
    expect(gz3d.gui.guiEvents.on).toHaveBeenCalledTimes(2);

    elementScope.cleanup();
    expect(gz3d.gui.guiEvents.removeListener).toHaveBeenCalledTimes(2);
  });

  it('should resolve manually created (legacy) experiment robot path for custom robot', function() {
    getFileContentDefer.resolve({
      uuid: 'uuid',
      data: '<ExD><bibiConf src="bibifile" /></ExD>'
    });
    spyOn(storageServer, 'getCustomModels').and.returnValue(
      window.$q.resolve([{ fileName: 'robots/robot.zip' }])
    );
    storageServer.getFileContent.and.returnValue({
      uuid: 'uuid',
      data:
        '<ExD><bodyModel customAsset="true" assetPath="robot.zip">myrobot/model.sdf</bodyModel></ExD>'
    });
    $rootScope.$digest();
    expect(elementScope.robotConfigPath).toBe(
      'http://proxy/storage/custommodelconfig/robots/robot.zip'
    );
  });

  it('should resolve manually created (legacy) experiment robot path for template robot', function() {
    getFileContentDefer.resolve({
      uuid: 'uuid',
      data: '<ExD><bibiConf src="bibifile" /></ExD>'
    });
    storageServer.getFileContent.and.returnValue({
      uuid: 'uuid',
      data:
        '<ExD><bodyModel customAsset="false" assetPath="robots/myrobot">myrobot/model.sdf</bodyModel></ExD>'
    });
    $rootScope.$digest();
    expect(elementScope.robotConfigPath).toBe(
      'http://proxy/models/robots/myrobot/config'
    );
  });

  it('should resolve old template bodyModel (without robotId) path format', function() {
    getFileContentDefer.resolve({
      uuid: 'uuid',
      data: '<ExD><bibiConf src="bibifile" /></ExD>'
    });

    storageServer.getFileContent.and.returnValue({
      uuid: 'uuid',
      data: '<ExD><bodyModel>myrobot/robot.sdf</bodyModel></ExD>'
    });
    $rootScope.$digest();
    expect(elementScope.robotConfigPath).toBe(
      'http://proxy/models/robots/myrobot/config'
    );
  });

  it('should resolve experiment created from custom model robot fileName', function() {
    getFileContentDefer.resolve({
      uuid: 'uuid',
      data: '<ExD><bibiConf src="bibifile" /></ExD>'
    });
    spyOn(storageServer, 'getCustomModels').and.returnValue(
      window.$q.resolve([{ fileName: 'robots/robot.zip' }])
    );
    storageServer.getFileContent.and.returnValue({
      uuid: 'uuid',
      data:
        '<ExD><bodyModel customAsset="true" assetPath="robot.zip">myrobot/model.sdf</bodyModel></ExD>'
    });
    $rootScope.$digest();
    expect(elementScope.robotConfigPath).toBe(
      'http://proxy/storage/custommodelconfig/robots/robot.zip'
    );
  });

  it('should resolve path for the template robot added from the frontend', function() {
    getFileContentDefer.resolve({
      uuid: 'uuid',
      data: '<ExD><bibiConf src="bibifile" /></ExD>'
    });
    storageServer.getFileContent.and.returnValue({
      uuid: 'uuid',
      data:
        '<ExD><bodyModel customAsset="false">myrobot/model.sdf</bodyModel></ExD>'
    });
    $rootScope.$digest();
    expect(elementScope.robotConfigPath).toBe(
      'http://proxy/models/robots/myrobot/config'
    );
  });

  it('should create a new TF on createTopicTF', function() {
    spyOn(storageServer, 'saveTransferFunctions').and.returnValue(
      window.$q.resolve()
    );
    spyOn(storageServer, 'getTransferFunctions').and.returnValue(
      window.$q.resolve({ data: {} })
    );

    spyOn(backendInterfaceService, 'addTransferFunction').and.returnValue(
      window.$q.resolve()
    );

    spyOn($rootScope, '$broadcast').and.callThrough();

    objectInspectorService.selectedRobotComponent = {
      userData: {
        rosType: 'sometype',
        type: 'sensor',
        rosTopic: 'topic'
      }
    };
    elementScope.createTopicTF();
    elementScope.$digest();
    expect(storageServer.saveTransferFunctions).toHaveBeenCalled();
    expect(backendInterfaceService.addTransferFunction).toHaveBeenCalled();
    expect($rootScope.$broadcast).toHaveBeenCalledWith(
      'TRANSFER_FUNCTIONS_CHANGED'
    );
  });

  it('should throw when createTopicTF and backend service fails', function() {
    spyOn(storageServer, 'saveTransferFunctions').and.returnValue(
      window.$q.resolve()
    );
    spyOn(storageServer, 'getTransferFunctions').and.returnValue(
      window.$q.resolve({ data: {} })
    );

    spyOn(backendInterfaceService, 'addTransferFunction').and.returnValue(
      window.$q.reject('error')
    );

    spyOn(serverError, 'displayHTTPError');

    objectInspectorService.selectedRobotComponent = {
      userData: {
        rosType: 'sometype',
        type: 'sensor',
        rosTopic: 'topic'
      }
    };
    elementScope.createTopicTF();
    elementScope.$digest();
    expect(storageServer.saveTransferFunctions).toHaveBeenCalled();
    expect(backendInterfaceService.addTransferFunction).toHaveBeenCalled();
    expect(serverError.displayHTTPError).toHaveBeenCalledWith('error');
  });
});
