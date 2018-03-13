'use strict';

describe('Controller: admin-page.controller', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('bbpStubFactory'));

  let $rootScope, $httpBackend, adminPageCtrl, adminService;

  beforeEach(
    inject(function(_$rootScope_, _$httpBackend_, $controller, _adminService_) {
      $rootScope = _$rootScope_;
      $httpBackend = _$httpBackend_;
      adminService = _adminService_;

      $httpBackend.whenGET('http://proxy/identity/me/groups').respond([]);

      $httpBackend
        .whenGET('http://proxy/admin/status')
        .respond({ maintenance: false });

      $httpBackend.whenGET('http://proxy/admin/servers').respond([]);

      adminPageCtrl = $controller('adminPageCtrl', {
        $scope: $rootScope
      });
      $httpBackend.flush();
      $rootScope.$apply();
    })
  );

  it('should call backend when setting status', function() {
    $httpBackend.expectPOST('http://proxy/admin/status/true').respond({});
    adminPageCtrl.setMaintenanceMode(true);
    $rootScope.$apply();

    $httpBackend.flush();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  it('should show error msg when failed to setting status', () => {
    spyOn(adminService, 'setStatus').and.returnValue(window.$q.reject());
    spyOn(adminPageCtrl.clbErrorDialog, 'open');
    adminPageCtrl.setMaintenanceMode(true);
    $rootScope.$apply();
    expect(adminPageCtrl.clbErrorDialog.open).toHaveBeenCalled();
  });

  it('should call backend when restarting server', function() {
    $httpBackend
      .expectPOST('http://proxy/admin/restart/funky-server')
      .respond({});
    adminPageCtrl.restartServer({ server: 'funky-server' });
    $rootScope.$apply();

    $httpBackend.flush();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  it('should show error msg when failed to restart server', () => {
    spyOn(adminService, 'restartServer').and.returnValue(window.$q.reject());
    spyOn(adminPageCtrl.clbErrorDialog, 'open');
    adminPageCtrl.restartServer();
    $rootScope.$apply();
    expect(adminPageCtrl.clbErrorDialog.open).toHaveBeenCalled();
  });

  it('should unsubscribe on controller destroy', function() {
    spyOn(adminPageCtrl.serversPolling$, 'unsubscribe');
    $rootScope.$destroy();
    $rootScope.$apply();
    expect(adminPageCtrl.serversPolling$.unsubscribe).toHaveBeenCalled();
  });
});
