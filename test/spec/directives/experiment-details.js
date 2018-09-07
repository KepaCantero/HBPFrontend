'use strict';

describe('Directive: experiment-details', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));

  var nrpBackendVersionsObject = {
    get: jasmine.createSpy('get')
  };

  var nrpFrontendVersion = {
    get: jasmine.createSpy('get')
  };

  beforeEach(
    module(function($provide) {
      $provide.value(
        'nrpBackendVersions',
        jasmine
          .createSpy('nrpBackendVersions')
          .and.returnValue(nrpBackendVersionsObject)
      );
      $provide.value('nrpFrontendVersion', nrpFrontendVersion);
    })
  );

  var scope, $httpBackend;
  beforeEach(
    inject(function($compile, $rootScope, _$httpBackend_) {
      $httpBackend = _$httpBackend_;

      var element = $compile('<experiment-details/>')($rootScope);
      $rootScope.$digest();
      scope = element.scope();
    })
  );

  it('should set scope.softwareVersions with Frontend version when backend returns error ', function() {
    scope.setCollapsed(false);
    $httpBackend
      .whenGET('http://proxy/server/normalServer')
      .respond(500, 'Error');
    scope.getSoftwareVersions('normalServer');
    $httpBackend.flush();
    var frontendData = { version: '0.0.1' };
    nrpFrontendVersion.get.calls.mostRecent().args[0](frontendData);
    expect(scope.softwareVersions).toBe('Frontend: 0.0.1\n');
  });

  it('should set scope.softwareVersions when backend returns normally', function() {
    scope.setCollapsed(false);
    $httpBackend
      .whenGET('http://proxy/server/normalServer')
      .respond(200, { gzweb: {} });
    scope.getSoftwareVersions('normalServer');
    $httpBackend.flush();
    var frontendData = { version: '0.0.1' };
    var backendObj = {};
    backendObj.toJSON = function() {
      return backendObj.data;
    };
    backendObj.toString =
      'Backend:\nhbp_nrp_cle: 0.0.5.dev0\nhbp_nrp_backend: 0.0.4\n';
    nrpFrontendVersion.get.calls.mostRecent().args[0](frontendData);
    nrpBackendVersionsObject.get.calls.mostRecent().args[0](backendObj);
    expect(scope.softwareVersions).toBe(
      'Frontend: 0.0.1\n' + backendObj.toString
    );
  });
});
