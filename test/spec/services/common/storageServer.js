(function() {
  'use strict';

  describe('Service: storageServer', function() {

    var storageServer, $location, $httpBackend, $rootScope;
    var windowMock = {
      location: {
        href: null
      }
    };
    beforeEach(module(function($provide) {
      $provide.value('$window', windowMock);
    }));
    beforeEach(module('storageServer'));

    beforeEach(inject(function(_$location_, _$httpBackend_, _$rootScope_, _storageServer_) {
      $location = _$location_;
      $httpBackend = _$httpBackend_;
      $rootScope = _$rootScope_;
      storageServer = _storageServer_;
    }));

    it('should build storage resource', function() {
      storageServer.buildStorageResource();
      expect(storageServer.proxyRsc).toBeDefined();
    });

    it('should handle non specific errors correctly', function(done) {
      var throwableError = { status: 403 };
      storageServer.onError(throwableError)
        .catch(done);
      $rootScope.$digest();
    });

    it('should handle redirect errors correctly', function() {
      var moveError = { status: 302, data: 'myloginpage' };
      storageServer.onError(moveError);
      expect(windowMock.location.href).toMatch('http://proxymyloginpage&client_id=test-client-id&redirect_uri=http%3A%2F%2Flocalhost%3A900');
    });


    it('should retrieve experiments', function(done) {
      var experiments = ['exp1', 'exp2'];
      $httpBackend.expectGET(/storage\/experiments/).respond(200, angular.copy(experiments, []));
      storageServer.getExperiments().then(function(res) {
        expect(res[0]).toBe(experiments[0]);
        expect(res[1]).toBe(experiments[1]);
        done();
      });
      $httpBackend.flush();
      $rootScope.$digest();
    });

    it('should set set access_token in storage when access_token in url', function() {
      spyOn($location, 'search').and.returnValue({ 'access_token': 'test' });
      spyOn(localStorage, 'setItem');
      storageServer.storageServerTokenManager.checkForNewTokenToStore();
      expect(localStorage.setItem).toHaveBeenCalledWith(storageServer.storageServerTokenManager.STORAGE_KEY, '[{"access_token":"test"}]');
    });

  });
}());
