'use strict';
(function() {
  angular
    .module('storageServerMock', [])
    .service('storageServer', [
      '$q',
      function($q) {
        var currentUser = (this.currentUser = {
          id: 'theUserID',
          displayName: 'theOwnerName'
        });

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

        this.getCurrentUser = jasmine
          .createSpy('storageServerMock.getCurrentUser')
          .and.callFake(function() {
            return $q.when(currentUser);
          });

        this.getCustomModels = jasmine
          .createSpy('storageServerMock.getCustomModels')
          .and.returnValue($q.resolve(customModels));

        this.getAllCustomModels = jasmine
          .createSpy('storageServerMock.getAllCustomModels')
          .and.returnValue($q.resolve(customModels));

        this.setCustomModel = jasmine
          .createSpy('storageServerMock.setCustomModel')
          .and.returnValue($q.resolve());

        this.deleteCustomModel = jasmine
          .createSpy('storageServerMock.deleteCustomModel')
          .and.returnValue($q.resolve());

        this.getUser = jasmine
          .createSpy('storageServerMock.getUser')
          .and.callFake(function() {
            return $q.when(currentUser);
          });

        this.getCurrentUserGroups = jasmine
          .createSpy('storageServerMock.getCurrentUserGroups')
          .and.callFake(function() {
            return $q.when([{ name: 'hbp-sp10-user-edit-rights' }]);
          });

        this.cloneTemplate = jasmine
          .createSpy('storageServerMock.cloneTemplate')
          .and.callFake(function() {
            return $q.when([{ name: 'hbp-sp10-user-edit-rights' }]);
          });

        this.getTransferFunctions = jasmine
          .createSpy('getTransferFunctions')
          .and.returnValue(
            $q.resolve({ data: { tfname: 'def tf:\n\tbrain.index=0' } })
          );

        this.saveTransferFunctions = jasmine
          .createSpy('saveTransferFunctions')
          .and.returnValue($q.resolve());

        this.getRobotConfigPath = jasmine
          .createSpy('storageServerMock.getRobotConfigPath')
          .and.callFake(function() {
            return $q.when('robotpath');
          });

        this.getFileContent = jasmine.createSpy('getFileContent');
        this.setFileContent = jasmine.createSpy('setFileContent');
        this.getBrain = jasmine
          .createSpy('getBrain')
          .and.callFake(() => window.$q.resolve({}));
        this.saveBrain = jasmine
          .createSpy('saveBrain')
          .and.callFake(() => window.$q.resolve());
        this.reset = function() {
          this.getCurrentUser.calls.reset();
          this.getUser.calls.reset();
          this.getCurrentUserGroups.calls.reset();
        };

        this.logActivity = jasmine.createSpy('logActivity');
      }
    ])
    .service('storageServerTokenManager', [
      function() {
        this.clearStoredToken = jasmine.createSpy('clearStoredToken');
        this.getStoredToken = jasmine.createSpy('getStoredToken');
      }
    ]);
})();
