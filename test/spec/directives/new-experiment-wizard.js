(function() {
  'use strict';

  describe('Directive: newExperimentWizard', function() {
    var $httpBackend,
      $rootScope,
      $compile,
      nrpModalService,
      storageServer,
      $q,
      scope,
      clbErrorDialog,
      newExperimentProxyService,
      $timeout;

    beforeEach(module('exdFrontendApp'));
    beforeEach(module('exd.templates'));
    beforeEach(module('hbpCollaboratoryCore'));

    beforeEach(
      inject(function(
        _$rootScope_,
        _$httpBackend_,
        _$compile_,
        _nrpModalService_,
        _storageServer_,
        _$q_,
        _clbErrorDialog_,
        _newExperimentProxyService_,
        _$timeout_
      ) {
        $httpBackend = _$httpBackend_;
        $rootScope = _$rootScope_;
        $compile = _$compile_;
        nrpModalService = _nrpModalService_;
        storageServer = _storageServer_;
        $q = _$q_;
        clbErrorDialog = _clbErrorDialog_;
        newExperimentProxyService = _newExperimentProxyService_;
        $timeout = _$timeout_;

        $compile('<new-experiment-wizard></new-experiment-wizard>')($rootScope);
        $rootScope.$digest();
        scope = $rootScope.$$childHead;
        spyOn(nrpModalService, 'createModal').and.callFake(function() {
          return;
        });
      })
    );

    afterEach(function() {
      $httpBackend.verifyNoOutstandingExpectation();
      $httpBackend.verifyNoOutstandingRequest();
      scope.destroyDialog();
    });

    it('should check successful upload from private storage for the robot', function() {
      spyOn(storageServer, 'getCustomModels').and.callFake(function() {
        var deferred = $q.defer();
        deferred.resolve([
          {
            name: 'fakeICub',
            description: 'fakeICub',
            id: 'fakeICub',
            thumbnail: ''
          },
          {
            name: 'fakeHusky',
            description: 'fakeHuskyDescription',
            id: 'fakeHusky',
            thumbnail: ''
          }
        ]);
        return deferred.promise;
      });

      scope.uploadRobotDialog();
      scope.uploadEntity('PrivateStorage');
      scope.$digest();
      expect(scope.entities[0]).toEqual({
        id: 'fakeICub',
        name: 'fakeICub',
        description: 'fakeICub',
        thumbnail: '',
        path: 'undefined',
        configpath:
          'http%3A%2F%2Fproxy%2Fstorage%2Fcustommodelconfig%2Fundefined',
        custom: true
      });
      expect(scope.entities[1].name).toBe('fakeHusky');
    });

    it('should check successful upload from private storage for the environment', function() {
      spyOn(storageServer, 'getCustomModels').and.callFake(function() {
        var deferred = $q.defer();
        deferred.resolve([
          {
            id: 'fake3DSpace',
            name: 'fake3DSpace',
            description: 'fake3DSpace',
            thumbnail: ''
          },
          {
            id: 'fakeFZIGround',
            name: 'fakeFZIGround',
            description: 'fakeFZIGround',
            thumbnail: ''
          }
        ]);
        return deferred.promise;
      });
      scope.uploadEnvironmentDialog();
      scope.uploadEntity('PrivateStorage');
      scope.$digest();
      expect(scope.entities[0]).toEqual({
        id: 'fake3DSpace',
        name: 'fake3DSpace',
        description: 'fake3DSpace',
        thumbnail: '',
        path: 'undefined',
        custom: true
      });
      expect(scope.entities[1].name).toBe('fakeFZIGround');
    });

    it('should check successful upload from private storage for the brain', function() {
      spyOn(storageServer, 'getCustomModels').and.callFake(function() {
        var deferred = $q.defer();
        deferred.resolve([
          {
            id: 'fakeBraitenberg',
            name: 'fakeBraitenberg',
            description: 'fakeBraitenberg',
            thumbnail: ''
          },
          {
            id: 'fakeIdleBrain',
            name: 'fakeIdleBrain',
            description: 'fakeIdleBrain',
            thumbnail: ''
          }
        ]);
        return deferred.promise;
      });

      scope.uploadBrainDialog();
      scope.uploadEntity('PrivateStorage');
      scope.$digest();
      expect(scope.entities[0]).toEqual({
        id: 'fakeBraitenberg',
        name: 'fakeBraitenberg',
        description: 'fakeBraitenberg',
        thumbnail: '',
        custom: true,
        path: 'undefined'
      });
      expect(scope.entities[1].name).toBe('fakeIdleBrain');
    });

    it('should check unsuccessful upload from private storage for the robot', function() {
      spyOn(scope, 'createErrorPopup').and.callFake(function() {
        return;
      });
      spyOn(storageServer, 'getCustomModels').and.returnValue(
        window.$q.reject()
      );
      scope.uploadRobotDialog();
      scope.uploadEntity('PrivateStorage');
      scope.$digest();
      expect(scope.entities).toBe(undefined);
      expect(scope.createErrorPopup).toHaveBeenCalled();
    });

    it('should check unsuccessful upload from private storage for the environment', function() {
      spyOn(scope, 'createErrorPopup').and.callFake(function() {
        return;
      });
      spyOn(storageServer, 'getCustomModels').and.returnValue(
        window.$q.reject()
      );
      scope.uploadEnvironmentDialog();
      scope.uploadEntity('PrivateStorage');
      scope.$digest();
      expect(scope.entities).toBe(undefined);
      expect(scope.createErrorPopup).toHaveBeenCalled();
    });

    it('should check unsuccessful upload from private storage for the brain', function() {
      spyOn(scope, 'createErrorPopup').and.callFake(angular.noop);
      spyOn(storageServer, 'getCustomModels').and.returnValue(
        window.$q.reject()
      );
      scope.uploadBrainDialog();
      scope.uploadEntity('PrivateStorage');
      scope.$digest();
      expect(scope.entities).toBe(undefined);
      expect(scope.createErrorPopup).toHaveBeenCalled();
    });

    it('should call the create upload from private storage function', function() {
      var mockBrainUploader = {
        name: 'FakeRobot',
        fakeFunction: function() {}
      };
      scope.uploadEntityDialog(mockBrainUploader);
      expect(nrpModalService.createModal).toHaveBeenCalled();
      expect(scope.entityName).toEqual('FakeRobot');
    });

    it('should call the upload from public env for the robot', function() {
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
      spyOn(scope, 'createUploadModal').and.callThrough();
      scope.selectedRobot = 'RobotTest';
      scope.uploadRobotDialog();
      scope.uploadEntity('PublicEnv');
      scope.$digest();
      expect(scope.createUploadModal).toHaveBeenCalled();
      expect(scope.entityName).toEqual('Robot');
      expect(scope.entityPageState.selected).toEqual('RobotTest');
      expect(scope.entities[0].name).toEqual('Arm robot force based version');
      expect(scope.entities[1].description).toEqual('First Hollie arm model.');
      expect(scope.entities[2].thumbnail).toBe('');
      expect(scope.entities.length).toBe(4);
      var mockSelectedEntity = mockProxyResponse.data[0];
      scope.completeUploadEntity(mockSelectedEntity);
      expect(scope.robotUploaded).toBe(true);
    });

    it('should call the upload from public env for the environments', function() {
      var mockProxyResponse = {
        data: [
          {
            name: 'Fake environment1',
            description: 'Fake Description1',
            thumbnail: '',
            path: 'environments/virtual_world/model.config'
          },
          {
            name: 'Fake environment2',
            description: 'Fake Description2',
            thumbnail: ''
          },
          {
            name: 'Fake environment3',
            description: 'Fake Description3',
            thumbnail: ''
          },
          {
            name: 'Fake environment4',
            description: 'Fake Description5', //ha
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
      spyOn(scope, 'createUploadModal').and.callThrough();
      scope.selectedEnvironment = 'EnvironmentTest';
      scope.uploadEnvironmentDialog();
      scope.uploadEntity('PublicEnv');
      scope.$digest();
      expect(scope.createUploadModal).toHaveBeenCalled();
      expect(scope.entityPageState.selected).toEqual('EnvironmentTest');
      expect(scope.entityName).toEqual('Environment');
      expect(scope.entities[0].name).toEqual('Fake environment1');
      expect(scope.entities[1].description).toEqual('Fake Description2');
      expect(scope.entities[2].thumbnail).toBe('');
      expect(scope.entities.length).toBe(4);
      var mockSelectedEntity = mockProxyResponse.data[0];
      scope.completeUploadEntity(mockSelectedEntity);
      expect(scope.environmentUploaded).toBe(true);
    });

    it('should call the upload from public env for the brain', function() {
      var mockProxyResponse = {
        data: [
          {
            name: 'FakeBrain1',
            description:
              'This brain is fake, which means that a zombie can get confused while trying to eat it',
            thumbnail: '',
            path: 'brains/braitenberg.py'
          },
          {
            name: 'FakeBrain2',
            description: 'FakeBrain2Description',
            thumbnail: '',
            path: 'fakePath2/fakePath2.sdf'
          },
          {
            name: 'FakeBrain3',
            description: 'FakeBrain3Description',
            thumbnail: '',
            path: 'fakePath3/fakePath3.sdf'
          },
          {
            name: 'FakeBrain4',
            description: 'FakeBrain4Description',
            thumbnail: '',
            path: 'fakePath4/fakePath4.sdf'
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
      spyOn(scope, 'createUploadModal').and.callThrough();
      scope.selectedBrain = 'BrainTest';
      scope.uploadBrainDialog();
      scope.uploadEntity('PublicEnv');
      scope.$digest();
      expect(scope.createUploadModal).toHaveBeenCalled();
      expect(scope.entityPageState.selected).toEqual('BrainTest');
      expect(scope.entityName).toEqual('Brain');
      expect(scope.entities[0].description).toEqual(
        'This brain is fake, which means that a zombie can get confused while trying to eat it'
      );
      expect(scope.entities[1].name).toEqual('FakeBrain2');
      expect(scope.entities[1].thumbnail).toBe('');
      expect(scope.entities.length).toBe(4);
      var mockSelectedEntity = mockProxyResponse.data[0];
      scope.completeUploadEntity(mockSelectedEntity);
      expect(scope.brainUploaded).toBe(true);
    });

    it('should test the createErrorPopup function', function() {
      spyOn(clbErrorDialog, 'open').and.callFake(function() {
        return;
      });
      scope.createErrorPopup();
      expect(clbErrorDialog.open).toHaveBeenCalled();
    });

    it('should test the retrieveImageFileContent function', function() {
      spyOn(storageServer, 'getBase64Content').and.returnValue(
        window.$q.when([])
      );
      scope.retrieveImageFileContent();
      expect(storageServer.getBase64Content).toHaveBeenCalled();
    });

    it('should test the retrieveConfigFileContent function', function() {
      spyOn(storageServer, 'getFileContent').and.callFake(function() {
        var xmlVersionString = '<?xml version="1.0"?>';
        var xmlModelString = '<model>';
        var xmlNameString = '<name>iCub HBP ros</name>';
        var xmlDescritptionString =
          '<description>Model for the iCub humanoid robot. For more information check icub.org.</description>';
        var xmlModelTerminateString = '</model>';
        var xml = xmlVersionString
          .concat(xmlModelString)
          .concat(xmlNameString)
          .concat(xmlDescritptionString)
          .concat(xmlModelTerminateString);
        return $q.when({
          uuid: 'fakeuuid',
          data: xml
        });
      });
      scope.retrieveConfigFileContent();
      expect(storageServer.getFileContent).toHaveBeenCalled();
    });

    it('should select new experiment', function() {
      scope.selectEntity({ id: 1 });
      expect(scope.entityPageState.selected).toEqual({ id: 1 });
    });

    it('should check that upload file click function works ok', function() {
      scope.entityType = 'Robot';
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
      scope.uploadFileClick('Robots');
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
      spyOn(scope, 'destroyDialog');
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
      scope.uploadEnvironmentDialog();
      var res = scope.uploadModelZip(
        blobToFile(fakeZip, 'test.zip'),
        'Environments'
      );
      $timeout.flush();
      $timeout.verifyNoPendingTasks();
      res.then(function() {
        expect(scope.destroyDialog).toHaveBeenCalled();
        expect(scope.uploadingModel).toBe(false);
        expect(scope.entityName).toContain('Environments');
      });
    });

    it('should check that upload robot zip function works ok', function() {
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
      spyOn(scope, 'destroyDialog');
      spyOn(storageServer, 'getCustomModels').and.returnValue(
        $q.when([
          {
            name: 'testRobot',
            custom: true,
            path: 'testPath',
            description: 'testDescription',
            thumbnail: 'testThumbnail',
            fileName: 'test'
          }
        ])
      );
      scope.uploadRobotDialog();
      var res = scope.uploadModelZip(blobToFile(fakeZip, 'test.zip'), 'Robots');
      $timeout.flush();
      $timeout.verifyNoPendingTasks();
      res.then(function() {
        expect(scope.destroyDialog).toHaveBeenCalled();
        expect(scope.uploadingModel).toBe(false);
        expect(scope.entityName).toContain('Robots');
      });
    });

    it('should check that upload brain zip function works ok', function() {
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
      spyOn(scope, 'destroyDialog');
      spyOn(storageServer, 'getCustomModels').and.returnValue(
        $q.when([
          {
            name: 'testBrain',
            custom: true,
            path: 'testPath',
            description: 'testDescription',
            thumbnail: 'testThumbnail',
            fileName: 'test'
          }
        ])
      );
      scope.uploadBrainDialog();
      var res = scope.uploadModelZip(blobToFile(fakeZip, 'test.zip'), 'Brains');
      $timeout.flush();
      $timeout.verifyNoPendingTasks();
      res.then(function() {
        expect(scope.destroyDialog).toHaveBeenCalled();
        expect(scope.uploadingModel).toBe(false);
        expect(scope.entityName).toContain('Brains');
      });
    });

    it('should check that upload model zip handles errors', function() {
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
      spyOn(storageServer, 'getCustomModels').and.returnValue($q.resolve([]));
      spyOn(storageServer, 'setCustomModel').and.returnValue(
        $q.reject({ data: 'Custom Model Failed' })
      );
      spyOn(scope, 'createErrorPopup');
      var res = scope.uploadModelZip(blobToFile(fakeZip), 'Robots');
      $timeout.flush();
      $timeout.verifyNoPendingTasks();
      res.then(function() {
        expect(scope.createErrorPopup).toHaveBeenCalledWith(
          'Custom Model Failed'
        );
        expect(scope.uploadingModel).toBe(false);
      });
    });

    it('should throw if the zip we provide to the upload function is corrupted', function() {
      spyOn(scope, 'createErrorPopup');
      scope.uploadModelZip('fakeZip');
      $timeout.flush();
      $timeout.verifyNoPendingTasks();
      expect(scope.createErrorPopup).toHaveBeenCalled();
    });

    it('should test the clone new experiment function', function() {
      spyOn(storageServer, 'cloneNew').and.returnValue($q.resolve());
      scope.cloneNewExperiment();
      expect(storageServer.cloneNew).toHaveBeenCalled();
      expect(scope.isCloneRequested).toBeFalsy;
    });

    it('should handle the error in the clone new experiment function', function() {
      spyOn(scope, 'createErrorPopup');
      spyOn(storageServer, 'cloneNew').and.returnValue(
        $q.reject({ data: 'Error' })
      );
      scope.cloneNewExperiment();
      expect(storageServer.cloneNew).toHaveBeenCalled();
      expect(scope.isCloneRequested).toBeFalsy;
    });
  });
})();
