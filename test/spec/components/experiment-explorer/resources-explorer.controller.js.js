'use strict';

describe('Controller: ResourcesExplorerController', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));

  var $rootScope, element, storageServer, backendInterfaceService;
  var $q;

  var uploadFiles = {
    target: {
      files: []
    }
  };

  var MOCKED_DATA = {
    experiments: [
      {
        uuid: '758096b6-e500-452b-93e1-ba2bba203844',
        name: 'New experiment',
        parent: '89857775-6215-4d53-94ee-fb6c18b9e2f8'
      }
    ],
    experimentFiles: [
      {
        uuid: '207a87c9-78d9-4504-bde7-6919feaac12a',
        name: 'all_neurons_spike_monitor.py',
        parent: '758096b6-e500-452b-93e1-ba2bba203844',
        contentType: 'text/plain',
        type: 'file',
        modifiedOn: '2017-08-07T07:59:35.837002Z'
      },
      {
        uuid: '207a87c9-78d9-4504-bde7-6919feaac12b',
        name: 'test',
        parent: '758096b6-e500-452b-93e1-ba2bba203844',
        type: 'folder',
        modifiedOn: '2017-08-07T07:59:35.837002Z'
      },
      {
        uuid: '207a87c9-78d9-4504-bde7-6919feaac13b',
        name: 'resources',
        parent: '758096b6-e500-452b-93e1-ba2bba203844',
        type: 'folder',
        modifiedOn: '2017-08-07T07:59:35.837002Z'
      }
    ],
    folderFiles: [
      {
        uuid: '207a87c9-78d9-4504-bde7-6919feaac12c',
        name: 'file2',
        parent: '207a87c9-78d9-4504-bde7-6919feaac12b',
        type: 'file',
        modifiedOn: '2017-08-07T07:59:35.837002Z'
      }
    ]
  };

  var baseEventHandlerMock = {
    suppressAnyKeyPress: jasmine.createSpy('suppressAnyKeyPress')
  };

  beforeEach(
    module(function($provide) {
      $provide.value('baseEventHandler', baseEventHandlerMock);
      $provide.value('slurminfoService', { subscribe: angular.noop });
      $provide.value('$uibModal', {
        open: function() {
          return { result: window.$q.resolve('folder_name') };
        }
      });
    })
  );

  beforeEach(
    inject(function(
      $controller,
      $compile,
      _$rootScope_,
      _storageServer_,
      _$q_,
      _backendInterfaceService_
    ) {
      $rootScope = _$rootScope_;
      backendInterfaceService = _backendInterfaceService_;
      storageServer = _storageServer_;
      element = $compile('<resources-editor></resources-editor>')($rootScope);
      $q = _$q_;
    })
  );
  var loadResourceFolderUuid = function() {
    spyOn(storageServer, 'getExperimentFiles').and.returnValue(
      $q.when(MOCKED_DATA.experimentFiles)
    );
    $rootScope.$digest();
    var controller = element.scope().vm;
    controller.loadResourceFolderUuid();
    $rootScope.$digest();
    return controller;
  };
  var suppressKeyPress = function() {
    spyOn(storageServer, 'getExperimentFiles').and.returnValue(
      $q.when(MOCKED_DATA.experimentFiles)
    );
    $rootScope.$digest();
    var controller = element.scope().vm;
    controller.suppressKeyPress();
    $rootScope.$digest();
    return controller;
  };
  var uploadFile = function() {
    spyOn(storageServer, 'getExperimentFiles').and.returnValue(
      $q.when(MOCKED_DATA.experimentFiles)
    );
    $rootScope.$digest();
    var controller = element.scope().vm;
    controller.uploadFile(uploadFiles);
    $rootScope.$digest();
    return controller;
  };
  it('Experiments should have a resources folder', function() {
    var controller = loadResourceFolderUuid();
    expect(controller.resourcesFolder.uuid).toBe(
      '207a87c9-78d9-4504-bde7-6919feaac13b'
    );
  });

  it('should call suppressAnyKeyPress from baseEventHandler service', function() {
    suppressKeyPress();
    expect(baseEventHandlerMock.suppressAnyKeyPress).toHaveBeenCalled();
  });

  it('should Clone Files Resources after uploading a file', function() {
    spyOn(backendInterfaceService, 'cloneFileResources').and.returnValue(
      window.$q.resolve()
    );
    uploadFile();
    expect(backendInterfaceService.cloneFileResources).toHaveBeenCalled();
  });
});
