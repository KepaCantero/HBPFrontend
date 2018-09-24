'use strict';

describe('Services: update-checker', () => {
  beforeEach(module('exdFrontendApp'));

  beforeEach(
    module($provide => {
      $provide.value('nrpFrontendVersion', {
        get: jasmine.createSpy()
      });
    })
  );

  it('should handle valid cache, same version', done => {
    inject((updateChecker, $http, nrpFrontendVersion, $rootScope, $q) => {
      nrpFrontendVersion.get.and.returnValue({
        $promise: $q.resolve({ version: '1.2.3' })
      });

      localStorage.getItem = jasmine.createSpy().and.callFake(key => {
        if (key == updateChecker.constructor.LOCAL_STORAGE_KEYS.time) {
          return Date.now();
        } else {
          //LATEST_VERSION
          return '1.2.3';
        }
      });

      updateChecker.checkForNewVersion().then(res => {
        expect(res).toBeNull();
        done();
      });

      $rootScope.$digest();
      expect($http.post).not.toHaveBeenCalled();
    });
  });

  it('should handle valid cache, different version', done => {
    inject((updateChecker, $http, nrpFrontendVersion, $rootScope, $q) => {
      nrpFrontendVersion.get.and.returnValue({
        $promise: $q.resolve({ version: '1.2.3' })
      });

      localStorage.getItem = jasmine.createSpy().and.callFake(key => {
        if (key == updateChecker.constructor.LOCAL_STORAGE_KEYS.time) {
          return Date.now();
        } else {
          //LATEST_VERSION
          return '1.2.4';
        }
      });

      updateChecker.checkForNewVersion().then(res => {
        expect(res).toBe('1.2.4');
        done();
      });

      $rootScope.$digest();
      expect($http.post).not.toHaveBeenCalled();
    });
  });

  it('should handle absence of cache ', done => {
    inject(
      (
        updateChecker,
        $httpBackend,
        nrpFrontendVersion,
        $rootScope,
        $q,
        bbpConfig
      ) => {
        nrpFrontendVersion.get.and.returnValue({
          $promise: $q.resolve({ version: '1.2.3' })
        });

        $httpBackend
          .expectPOST(bbpConfig.get('api.versionCheck.checkUpdate'))
          .respond({ version: '1.2.4' });

        localStorage.getItem = jasmine.createSpy().and.returnValue(null);

        updateChecker.checkForNewVersion().then(res => {
          expect(res).toBe('1.2.4');
          done();
        });

        $httpBackend.flush();
        $rootScope.$digest();
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
      }
    );
  });
});
