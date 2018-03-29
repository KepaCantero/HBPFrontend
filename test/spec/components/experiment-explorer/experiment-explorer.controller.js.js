'use strict';

describe('Controller: ExperimentExplorerController', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  var STORAGE_URL = 'http://proxy/storage/';

  var $httpBackend, $rootScope, $log, element, storageServer;

  var experimentProxyService, $q, experimentsFactory;

  var MOCKED_EXPERIMENT = [
    {
      availableServers: [],
      configuration: [],
      id: 'Experiment_0',
      uuid: 'Experiment_0',
      joinableServers: [
        {
          runningSimulation: [],
          server: 'localhost'
        }
      ],
      private: true
    }
  ];

  var privateExperimentsService = {
    initialize: function() {
      return;
    },
    getExperiments: function() {
      var deferred = $q.defer();
      deferred.resolve(MOCKED_EXPERIMENT);
      return deferred.promise;
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

  beforeEach(
    module(function($provide) {
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
      _$httpBackend_,
      _$log_,
      _storageServer_,
      _experimentProxyService_,
      _$q_,
      _experimentsFactory_
    ) {
      $rootScope = _$rootScope_;
      $httpBackend = _$httpBackend_;
      $log = _$log_;
      storageServer = _storageServer_;
      element = $compile('<experiment-explorer></experiment-explorer>')(
        $rootScope
      );
      experimentsFactory = _experimentsFactory_;
      $q = _$q_;
      experimentProxyService = _experimentProxyService_;
    })
  );

  var loadExperiments = function() {
    $httpBackend
      .whenGET(STORAGE_URL + 'experiments')
      .respond(MOCKED_DATA.experiments);

    spyOn(experimentProxyService, 'getAvailableServers').and.returnValue(
      $q.when([])
    );
    spyOn(experimentProxyService, 'getJoinableServers').and.returnValue(
      $q.when([])
    );
    spyOn(storageServer, 'getFileContent').and.returnValue(window.$q.when({}));

    $rootScope.$digest();
    var controller = element.scope().vm;
    controller.loadExperiments();
    $rootScope.$digest();
    $httpBackend.flush();

    return controller;
  };

  it('should retrieve experiments', function() {
    var controller = loadExperiments();

    expect(controller.experimentList).toContain(
      jasmine.objectContaining(MOCKED_DATA.experiments[0])
    );
  });

  var selectExperiment = function(controller) {
    $httpBackend
      .whenGET(STORAGE_URL + controller.experimentList[0].uuid)
      .respond(MOCKED_DATA.experimentFiles);

    controller.selectExperiment(controller.experimentList[0]);
    $rootScope.$digest();
    $httpBackend.flush();
  };

  var selectFolder = function(controller) {
    $httpBackend
      .expectGET(STORAGE_URL + '207a87c9-78d9-4504-bde7-6919feaac12b')
      .respond(MOCKED_DATA.folderFiles);

    controller.selectParent(controller.experimentList[0].folders[0]);

    $rootScope.$digest();
    $httpBackend.flush();
  };

  it('should retrieve folder files', function() {
    var controller = loadExperiments();
    selectExperiment(controller);

    selectFolder(controller);

    expect(controller.experimentList[0].folders[0].files).toContain(
      jasmine.objectContaining(MOCKED_DATA.folderFiles[0])
    );
  });

  it('should select experiment', function() {
    var controller = loadExperiments();
    selectExperiment(controller);

    expect(controller.experimentList[0].files).toContain(
      jasmine.objectContaining(MOCKED_DATA.experimentFiles[0])
    );
  });

  it('should createFolder experiment', function() {
    var controller = loadExperiments();
    selectExperiment(controller);

    $httpBackend
      .expectPOST(
        STORAGE_URL +
          '758096b6-e500-452b-93e1-ba2bba203844/folder_name?type=folder'
      )
      .respond(200);

    spyOn(controller, 'selectParent');
    controller.createFolder();
    $rootScope.$digest();
    $httpBackend.flush();

    expect(controller.selectParent).toHaveBeenCalled();
  });

  it('should set selected file', function() {
    var controller = loadExperiments();
    controller.selectFile(MOCKED_DATA.experimentFiles[0].uuid);

    expect(controller.selectedFileId).toBe(MOCKED_DATA.experimentFiles[0].uuid);
  });

  it('should delete file', function() {
    var controller = loadExperiments();

    selectExperiment(controller);

    $httpBackend
      .expectDELETE(
        STORAGE_URL +
          controller.experimentList[0].uuid +
          '/' +
          MOCKED_DATA.experimentFiles[0].uuid +
          '?byname=false&type=file'
      )
      .respond(200);

    controller.deleteFile(MOCKED_DATA.experimentFiles[0]);

    $rootScope.$digest();
    $httpBackend.flush();
  });

  it('should delete folder', function() {
    var controller = loadExperiments();

    selectExperiment(controller);

    selectFolder(controller);

    $httpBackend
      .expectDELETE(
        STORAGE_URL +
          '207a87c9-78d9-4504-bde7-6919feaac12b/207a87c9-78d9-4504-bde7-6919feaac12b?byname=false&type=folder'
      )
      .respond(200);

    controller.deleteFolder(controller.experimentList[0].folders[0]);

    $rootScope.$digest();
    $httpBackend.flush();
  });

  it('should delete experiment', function() {
    var controller = loadExperiments();

    selectExperiment(controller);

    selectFolder(controller);

    $httpBackend
      .expectDELETE(STORAGE_URL + '207a87c9-78d9-4504-bde7-6919feaac12b')
      .respond(200);

    controller.deleteExperiment(controller.experimentList[0].folders[0]);

    $rootScope.$digest();
    $httpBackend.flush();
  });

  it('should throw when deleting experiment', function() {
    var controller = loadExperiments();

    selectExperiment(controller);

    selectFolder(controller);

    $httpBackend
      .expectDELETE(STORAGE_URL + '207a87c9-78d9-4504-bde7-6919feaac12b')
      .respond(500);

    controller.deleteExperiment(controller.experimentList[0].folders[0]);

    $rootScope.$digest();
    $httpBackend.flush();
  });

  it('should download file', function() {
    var controller = loadExperiments();

    selectExperiment(controller);

    $httpBackend
      .expectGET(
        STORAGE_URL +
          controller.experimentList[0].uuid +
          '/' +
          MOCKED_DATA.experimentFiles[0].uuid +
          '?byname=false'
      )
      .respond(new Blob());

    controller.downloadFile(MOCKED_DATA.experimentFiles[0]);

    $rootScope.$digest();
    $httpBackend.flush();
  });

  it('should uploadFile on experimentInput change event', function() {
    var controller = loadExperiments();
    spyOn(controller, 'uploadFile');
    $(controller.experimentInput).trigger('change');
    expect(controller.uploadFile).toHaveBeenCalled();
  });

  it('should de-register change event on scope destroy', function() {
    var controller = loadExperiments();
    spyOn(controller.experimentInput, 'off');
    element.scope().$emit('$destroy');
    $rootScope.$digest();
    expect(controller.experimentInput.off).toHaveBeenCalledWith('change');
  });

  it('should trigger file input click when uploadFileClick is called', function() {
    var controller = loadExperiments();
    spyOn(controller.experimentInput, 'click');
    controller.uploadFileClick();
    expect(controller.experimentInput.click).toHaveBeenCalled();
  });

  it('should uploadFile file', function() {
    var controller = loadExperiments();

    selectExperiment(controller);
    spyOn(storageServer, 'setBlobContent');

    var fileReaderMock = { readAsArrayBuffer: angular.noop };
    spyOn(window, 'FileReader').and.returnValue(fileReaderMock);
    spyOn(storageServer, 'getExperimentFiles').and.returnValue(
      window.$q.when([{ name: 'myFile.txt' }])
    );
    controller.uploadFile({ target: { files: [{ name: 'myfile.txt' }] } });

    fileReaderMock.onload({ target: { result: 'content' } });
    $rootScope.$digest();

    expect(storageServer.setBlobContent).toHaveBeenCalled();
  });

  it('should handle get experiments exception', function() {
    $httpBackend.whenGET(STORAGE_URL + 'experiments').respond(500);

    $rootScope.$digest();

    var controller = element.scope().vm;
    spyOn(controller, 'onError').and.callThrough();
    spyOn($log, 'error');
    controller.loadExperimentList();
    $rootScope.$digest();
    $httpBackend.flush();

    expect(controller.onError).toHaveBeenCalled();
    expect($log.error).toHaveBeenCalled();
  });

  it('should handle get experiment files exception', function() {
    var controller = loadExperiments();

    spyOn(controller, 'onError');

    $httpBackend
      .whenGET(STORAGE_URL + controller.experimentList[0].uuid)
      .respond(500);

    controller.selectExperiment(controller.experimentList[0]);
    $rootScope.$digest();
    $httpBackend.flush();

    expect(controller.onError).toHaveBeenCalled();
  });

  it('should handle delete file exception', function() {
    var controller = loadExperiments();

    selectExperiment(controller);

    $httpBackend
      .expectDELETE(
        STORAGE_URL +
          controller.experimentList[0].uuid +
          '/' +
          MOCKED_DATA.experimentFiles[0].uuid +
          '?byname=false&type=file'
      )
      .respond(500);

    spyOn(controller, 'onError');

    controller.deleteFile(MOCKED_DATA.experimentFiles[0]);

    $rootScope.$digest();
    $httpBackend.flush();

    expect(controller.onError).toHaveBeenCalled();
  });

  it('should handle download file exception', function() {
    var controller = loadExperiments();

    selectExperiment(controller);

    spyOn(controller, 'onError');

    $httpBackend
      .expectGET(
        STORAGE_URL +
          controller.experimentList[0].uuid +
          '/' +
          MOCKED_DATA.experimentFiles[0].uuid +
          '?byname=false'
      )
      .respond(500);

    controller.downloadFile(MOCKED_DATA.experimentFiles[0]);

    $rootScope.$digest();
    $httpBackend.flush();

    expect(controller.onError).toHaveBeenCalled();
  });

  it('should handle upload file exception', function() {
    var controller = loadExperiments();

    selectExperiment(controller);

    spyOn(controller, 'onError');
    spyOn(storageServer, 'getExperimentFiles').and.returnValue(
      window.$q.when([{ name: 'myFile.txt' }])
    );
    spyOn(storageServer, 'setBlobContent').and.returnValue(window.$q.reject());

    var fileReaderMock = { readAsArrayBuffer: angular.noop };
    spyOn(window, 'FileReader').and.returnValue(fileReaderMock);

    controller.uploadFile({ target: { files: [{ name: 'myfile.txt' }] } });
    fileReaderMock.onload({ target: { result: 'content' } });

    $rootScope.$digest();

    expect(controller.onError).toHaveBeenCalled();
  });

  it('should find file type for folder to be folder', function() {
    var controller = loadExperiments();
    var fileType = controller.getFileType({ type: 'folder' });

    expect(fileType).toBe('folder');
  });

  it('should find file type for unknown type to be extention + file', function() {
    var controller = loadExperiments();
    var fileType = controller.getFileType({ extension: 'myExt' });

    expect(fileType).toBe('myExt file');
  });

  var loadControllerwithRunningExperiment = function(data) {
    spyOn(storageServer, 'getExperiments').and.returnValue($q.when(data));

    spyOn(experimentsFactory, 'createExperimentsService').and.returnValue(
      privateExperimentsService
    );

    $rootScope.$digest();
    var controller = element.scope().vm;
    controller.loadExperimentList();
    controller.loadPrivateExperimentList();
    $rootScope.$digest();
    return controller;
  };

  it('should not delete experiments while is running', function() {
    var ExperimentsLoaded = loadControllerwithRunningExperiment(
      MOCKED_EXPERIMENT
    );
    ExperimentsLoaded.isPrivateExperimentRunning(MOCKED_EXPERIMENT[0]);
    expect(ExperimentsLoaded.isExperimentRunning).toBe(true);
  });

  it('should delete experiments while is running', function() {
    MOCKED_EXPERIMENT[0].private = false;
    var ExperimentsLoaded = loadControllerwithRunningExperiment(
      MOCKED_EXPERIMENT
    );
    ExperimentsLoaded.isPrivateExperimentRunning(MOCKED_EXPERIMENT[0]);
    expect(ExperimentsLoaded.isExperimentRunning).toBe(false);
  });

  it('should retrieve the private experiments', function() {
    var ExperimentsLoaded = loadControllerwithRunningExperiment(
      MOCKED_EXPERIMENT
    );
    expect(ExperimentsLoaded.privateExperiments[0].id).toBe('Experiment_0');
  });
});
