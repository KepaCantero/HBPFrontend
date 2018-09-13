'use strict';

describe('Directive: object-inspector', function() {
  var $rootScope, $compile, $scope, getFileContentDefer, storageServer;
  var gz3d;
  var elementScope;
  var dynamicViewOverlayService;
  var overlayWrapperMock, objectInspectorService;

  var baseEventHandlerMock = {
    suppressAnyKeyPress: jasmine.createSpy('suppressAnyKeyPress')
  };

  beforeEach(module('objectInspectorModule'));
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('dynamicViewOverlayServiceMock'));
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
      _dynamicViewOverlayService_,
      _objectInspectorService_,
      _backendInterfaceService_,
      _storageServer_
    ) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      gz3d = _gz3d_;
      dynamicViewOverlayService = _dynamicViewOverlayService_;
      objectInspectorService = _objectInspectorService_;
      storageServer = _storageServer_;

      spyOn(gz3d.gui.guiEvents, 'on').and.callThrough();
      spyOn(gz3d.gui.guiEvents, 'removeListener').and.callThrough();
      overlayWrapperMock = {
        style: {
          minWidth: '',
          minHeight: '',
          width: '',
          height: ''
        }
      };
      dynamicViewOverlayService.getParentOverlayWrapper.and.returnValue(
        overlayWrapperMock
      );
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

  it('should resolve old robot path format', function() {
    getFileContentDefer.resolve({
      uuid: 'uuid',
      data: '<ExD><bibiConf src="bibifile" /></ExD>'
    });

    storageServer.getFileContent.and.returnValue({
      uuid: 'uuid',
      data: '<ExD><bodyModel></bodyModel></ExD>'
    });
    $rootScope.$digest();
    expect(elementScope.robotConfigPath).toBe(
      'http://proxy/storage/experimentID/robot.config?byname=true'
    );
  });

  it('should resolve cloned experiment robot path', function() {
    getFileContentDefer.resolve({
      uuid: 'uuid',
      data: '<ExD><bibiConf src="bibifile" /></ExD>'
    });
    storageServer.getFileContent.and.returnValue({
      uuid: 'uuid',
      data:
        '<ExD><bodyModel customAsset="false" assetPath="robots/myrobot"/></ExD>'
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
      data: '<ExD><bodyModel customAsset="true" assetPath="robot.zip"/></ExD>'
    });
    $rootScope.$digest();
    expect(elementScope.robotConfigPath).toBe(
      'http://proxy/storage/custommodelconfig/robots/robot.zip'
    );
  });

  it('should create a new TF on createTopicTF', function() {
    spyOn(storageServer, 'saveTransferFunctions').and.returnValue(
      window.$q.resolve()
    );
    spyOn(storageServer, 'getTransferFunctions').and.returnValue(
      window.$q.resolve({ data: {} })
    );
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
  });
});
