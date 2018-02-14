'use strict';

describe('Services: nrpUser', function() {
  var $rootScope, nrpUser, storageServer;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(module('storageServerMock'));

  beforeEach(
    inject(function(_$rootScope_, $httpBackend, _nrpUser_, _storageServer_) {
      $rootScope = _$rootScope_;
      nrpUser = _nrpUser_;
      storageServer = _storageServer_;

      storageServer.reset();
      nrpUser.getCurrentUserInfo.cache.clear();
      nrpUser.getCurrentUser.cache.clear();
    })
  );

  it('should call storageServer.getUser', function() {
    nrpUser.getOwnerDisplayName('theOwnerName');
    nrpUser.getOwnerDisplayName('theOwnerName'); //second call should not increase underlying service call count due to memoization
    $rootScope.$digest();
    expect(storageServer.getUser).toHaveBeenCalledWith('theOwnerName');
    expect(storageServer.getUser.calls.count()).toBe(1);
  });

  it('should call storageServer.getCurrentUser and storageServer.getCurrentUserGroups', function() {
    storageServer.reset();
    nrpUser.getCurrentUserInfo();
    nrpUser.getCurrentUserInfo(); //second call should not increase underlying service call count due to memoization
    $rootScope.$digest();
    expect(storageServer.getCurrentUser.calls.count()).toBe(1);
    expect(storageServer.getCurrentUserGroups.calls.count()).toBe(1);
  });

  it('should call storageServer.getCurrentUserGroups ', function() {
    nrpUser.isMemberOfClusterReservationGroup();
    expect(storageServer.getCurrentUserGroups).toHaveBeenCalled();
  });

  it('should call getReservation whith the correct argument', function() {
    var sessionStorageKey = 'clusterReservation';
    spyOn(window.sessionStorage, 'getItem').and.returnValue(sessionStorageKey);
    expect(nrpUser.getReservation()).toBe('clusterReservation');
    expect(window.sessionStorage.getItem).toHaveBeenCalledWith(
      sessionStorageKey
    );
  });
});
