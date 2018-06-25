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

        this.reset = function() {
          this.getCurrentUser.calls.reset();
          this.getUser.calls.reset();
          this.getCurrentUserGroups.calls.reset();
        };
      }
    ])
    .service('storageServerTokenManager', [
      function() {
        this.clearStoredToken = jasmine.createSpy('clearStoredToken');
        this.getStoredToken = jasmine.createSpy('getStoredToken');
      }
    ]);
})();
