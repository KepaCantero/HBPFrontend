'use strict';

describe('Controller: NewExperimentController', function() {
  let newExperimentController;

  let $controller,
    $rootScope,
    $scope,
    newExperimentProxyService,
    $q,
    storageServer,
    $httpBackend,
    $timeout,
    experimentsFactory,
    $location;

  var MOCKED_EXPERIMENT = [
    {
      availableServers: [],
      configuration: [],
      id: 'experiment_id',
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

  var experimentsService = {
    rejectStartExperiment: false,
    initialize: function() {
      return;
    },

    getExperiments: function() {
      var deferred = $q.defer();
      deferred.resolve(MOCKED_EXPERIMENT);
      return deferred.promise;
    },

    startExperiment: function() {
      var deferred = $q.defer();
      if (this.rejectStartExperiment) deferred.reject('cannot start');
      else deferred.resolve('experimentpath');
      return deferred.promise;
    }
  };

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('experimentServiceMock'));

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _newExperimentProxyService_,
      _$q_,
      _storageServer_,
      _$httpBackend_,
      _$timeout_,
      _experimentsFactory_,
      _$location_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $httpBackend = _$httpBackend_;
      newExperimentProxyService = _newExperimentProxyService_;
      $q = _$q_;
      $timeout = _$timeout_;
      storageServer = _storageServer_;
      experimentsFactory = _experimentsFactory_;
      $location = _$location_;
    })
  );

  beforeEach(function() {
    $httpBackend.whenGET('http://proxy/models/environments').respond({});

    $scope = $rootScope.$new();
    newExperimentController = $controller('NewExperimentController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
  });

  it('should select environment', function() {
    newExperimentController.selectEnvironment({ id: 'test_experiment' });
    expect(newExperimentController.environment.id).toBe('test_experiment');
  });

  it('should load environment', function() {
    var mockProxyResponse = {
      data: [
        {
          name: 'Arm robot force based version',
          description:
            'Modified Hollie arm model for force based index finger movements.\n      In contrast to the first Hollie arm model it was required to remove the\n      PID control of the index finger joints to allow force control for this\n      particular finger.',
          thumbnail: '',
          path: 'robots/icub_model/model.config'
        },
        {
          name: 'Arm robot',
          description: 'First Hollie arm model.',
          thumbnail: ''
        },
        {
          name: 'HBP Clearpath Robotics Husky A200',
          description: 'Clearpath Robotics Husky A200 - Extended HBP Model',
          thumbnail: ''
        },
        {
          name: 'iCub HBP ros',
          description:
            'Model for the iCub humanoid robot. For more information check icub.org .',
          thumbnail: ''
        }
      ]
    };

    spyOn(
      newExperimentProxyService,
      'getTemplateModels'
    ).and.callFake(function() {
      var deferred = $q.defer();
      deferred.resolve(mockProxyResponse);
      return deferred.promise;
    });

    spyOn(storageServer, 'getCustomModels').and.callFake(function() {
      var deferred = $q.defer();
      deferred.resolve(mockProxyResponse.data);
      return deferred.promise;
    });

    newExperimentController.loadEnvironments();
    $scope.$digest();
  });

  it('should check that upload file click function works ok', function() {
    var fakeInput = $(
      '<input type="file"  style=" display:none;" accept:".zip">'
    );
    fakeInput.on = function(arg1, callback) {
      try {
        callback();
      } catch (err) {
        return err;
      }
    };
    fakeInput.click = function() {};
    fakeInput.one = function(arg1, callback) {
      try {
        callback();
      } catch (err) {
        return err;
      }
    };
    spyOn(window, '$').and.callFake(function() {
      return fakeInput;
    });
    spyOn(document.body, 'removeChild');
    spyOn(document.body, 'appendChild');
    newExperimentController.uploadEnvironment();
    expect(document.body.removeChild).toHaveBeenCalled();
    expect(document.body.appendChild).toHaveBeenCalled();
  });

  it('should check that upload environment zip function works ok', function() {
    function blobToFile(theBlob, fileName) {
      theBlob.lastModifiedDate = new Date();
      theBlob.name = fileName;
      return theBlob;
    }
    var fakeZip = new Blob([3, 7426, 78921], { type: 'application/zip' });
    spyOn(window, 'FileReader').and.returnValue({
      readAsArrayBuffer: function() {
        this.onload({
          target: {
            result: fakeZip
          }
        });
      }
    });
    spyOn(storageServer, 'setCustomModel').and.returnValue($q.when({}));
    spyOn(storageServer, 'getCustomModels').and.returnValue(
      $q.when([
        {
          name: 'testEnv',
          custom: true,
          path: 'testPath',
          description: 'testDescription',
          thumbnail: 'testThumbnail',
          fileName: 'test'
        }
      ])
    );
    newExperimentController.uploadEnvironment();
    var res = newExperimentController.uploadModelZip(
      blobToFile(fakeZip, 'test.zip')
    );
    $timeout.flush();
    $timeout.verifyNoPendingTasks();
    res.then(function() {
      expect(newExperimentController.uploadingModel).toBe(false);
    });
  });

  it('should launch an experiment', function() {
    spyOn(storageServer, 'logActivity');

    spyOn(experimentsFactory, 'createExperimentsService').and.returnValue(
      experimentsService
    );
    spyOn($location, 'path');

    newExperimentController.launchExperiment('experiment_id');
    $scope.$digest();
    expect($location.path.calls.mostRecent().args[0]).toEqual('experimentpath');
  });

  it('should handle launch experiment error', function() {
    spyOn(storageServer, 'logActivity');
    spyOn(experimentsFactory, 'createExperimentsService').and.returnValue(
      experimentsService
    );
    spyOn($location, 'path');

    experimentsService.rejectStartExperiment = true;
    newExperimentController.launchExperiment('experiment_id');
    $scope.$digest();
    expect(newExperimentController.launchingExperiment).toEqual(false);
  });

  it('should clone an experiment', function() {
    $httpBackend
      .whenPOST('http://proxy/activity_log/create_experiment')
      .respond({});
    spyOn(storageServer, 'cloneNew').and.returnValue($q.when({}));
    spyOn(newExperimentController, 'launchExperiment').and.returnValue(
      $q.when({})
    );
    newExperimentController.environment = {};
    newExperimentController.cloneAndLaunch();
    $scope.$digest();
    expect(newExperimentController.isCloneRequested).toEqual(false);
  });
});
