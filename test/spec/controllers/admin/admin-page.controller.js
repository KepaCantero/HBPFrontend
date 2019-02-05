'use strict';

describe('Controller: admin-page.controller', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('bbpStubFactory'));

  let $rootScope, $httpBackend, adminPageCtrl, adminService, scheduler;

  beforeEach(
    inject(function(_$rootScope_, _$httpBackend_, $controller, _adminService_) {
      $rootScope = _$rootScope_;
      $httpBackend = _$httpBackend_;
      adminService = _adminService_;

      $httpBackend.whenGET('http://proxy/identity/me/groups').respond([]);

      $httpBackend
        .whenGET('http://proxy/admin/status')
        .respond({ maintenance: false });

      $httpBackend
        .whenGET('http://proxy/admin/servers')
        .respond([{ server: 'server1' }, { server: 'server2' }]);

      scheduler = new Rx.TestScheduler();

      const originalTimer = Rx.Observable.timer;
      spyOn(Rx.Observable, 'timer').and.callFake((initialDelay, dueTime) =>
        originalTimer(initialDelay, dueTime, scheduler)
      );

      adminPageCtrl = $controller('adminPageCtrl', {
        $scope: $rootScope
      });
      $httpBackend.flush();
      $rootScope.$apply();
    })
  );

  it('should update ctrl servers when new servers received', function() {
    expect(adminPageCtrl.servers).toEqual({});

    spyOn(adminPageCtrl, 'updateServerVersions');
    scheduler.flush();
    $httpBackend.flush();

    expect(adminPageCtrl.servers).toEqual({
      server1: { server: 'server1' },
      server2: { server: 'server2' }
    });
  });

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

  it('should fill-in versions in existing server objects', () => {
    /* eslint-disable camelcase */
    const versions = {
      hbp_nrp_backend: 1.1,
      hbp_nrp_common: 1.2
    };
    $httpBackend.whenGET(/server[12]\/version/).respond(versions);

    adminPageCtrl.servers = {
      server1: { api: 'server1' },
      server2: { api: 'server2' }
    };

    adminPageCtrl.updateServerVersions();

    $rootScope.$apply();
    $httpBackend.flush();
    expect(_.map(adminPageCtrl.servers, s => s.mainVersion)).toEqual([
      1.1,
      1.1
    ]);
    const mappedVersions = [
      { name: 'hbp_nrp_backend', version: 1.1 },
      { name: 'hbp_nrp_common', version: 1.2 }
    ];
    expect(_.map(adminPageCtrl.servers, s => s.versions)).toEqual([
      mappedVersions,
      mappedVersions
    ]);
    /* eslint-enable camelcase */
  });

  it('should show error when failing to retrieve server logs', () => {
    const filereaderMock = {
      readAsText: jasmine.createSpy()
    };
    spyOn(window, 'FileReader').and.returnValue(filereaderMock);
    spyOn(adminPageCtrl.clbErrorDialog, 'open');

    const serverObj = { server: 'localhost' };
    $httpBackend
      .whenPOST('http://proxy/admin/backendlogs/localhost')
      .respond(500, new Blob(['error']));
    adminPageCtrl.retrieveServerLogs(serverObj);
    $rootScope.$apply();
    expect(serverObj.busy).toBe(true);
    $httpBackend.flush();
    $rootScope.$apply();
    expect(filereaderMock.readAsText).toHaveBeenCalled();
    filereaderMock.onload();
    expect(adminPageCtrl.clbErrorDialog.open).toHaveBeenCalled();
  });

  it('should retrieve server logs', () => {
    const dummyAnchorElement = {
      style: {},
      click: jasmine.createSpy('click')
    };

    spyOn(document, 'createElement').and.returnValue(dummyAnchorElement);
    spyOn(document.body, 'appendChild').and.stub();
    spyOn(document.body, 'removeChild').and.stub();
    const serverObj = { server: 'localhost' };
    $httpBackend
      .whenPOST('http://proxy/admin/backendlogs/localhost')
      .respond('serverlogs');
    adminPageCtrl.retrieveServerLogs(serverObj);
    $rootScope.$apply();
    expect(serverObj.busy).toBe(true);
    $httpBackend.flush();
    expect(dummyAnchorElement.click).toHaveBeenCalled();
  });

  it('should unsubscribe on controller destroy', function() {
    spyOn(adminPageCtrl.serversPolling$, 'unsubscribe');
    $rootScope.$destroy();
    $rootScope.$apply();
    expect(adminPageCtrl.serversPolling$.unsubscribe).toHaveBeenCalled();
  });
});
