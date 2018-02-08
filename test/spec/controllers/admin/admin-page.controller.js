'use strict';

describe('Controller: admin-page.controller', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('bbpStubFactory'));

  var $rootScope, $httpBackend, adminPageCtrl;

  beforeEach(
    inject(function(_$rootScope_, _$httpBackend_, $controller) {
      $rootScope = _$rootScope_;
      $httpBackend = _$httpBackend_;

      $httpBackend.whenGET('http://proxy/identity/me/groups').respond([]);

      $httpBackend
        .whenGET('http://proxy/admin/status')
        .respond({ maintenance: false });

      adminPageCtrl = $controller('adminPageCtrl', {
        $scope: $rootScope
      });
    })
  );

  it('should call backend when setting status', function() {
    $httpBackend.expectPOST('http://proxy/admin/status/true').respond({});
    adminPageCtrl.setMaintenanceMode(true);
    $rootScope.$apply();

    $httpBackend.flush();
    $httpBackend.verifyNoOutstandingExpectation();
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

  it('should unsubscribe on controller destroy', function() {
    spyOn(adminPageCtrl.serversPolling$, 'unsubscribe');
    $rootScope.$destroy();
    $rootScope.$apply();
    expect(adminPageCtrl.serversPolling$.unsubscribe).toHaveBeenCalled();
  });
});
