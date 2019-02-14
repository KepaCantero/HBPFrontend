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

        this.getCurrentUser = jasmine
          .createSpy('storageServerMock.getCurrentUser')
          .and.callFake(function() {
            return $q.when(currentUser);
          });

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
