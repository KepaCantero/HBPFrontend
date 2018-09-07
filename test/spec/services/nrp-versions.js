'use strict';

describe('Services: nrp-versions', function() {
  var nrpBackendVersions, nrpFrontendVersion;
  var serverError;
  var httpBackend;
  var serverURL = 'http://bbpce014.epfl.ch:8080';
  var serverErrorMock = {};
  serverErrorMock.displayHTTPError = jasmine.createSpy('displayHTTPError');

  beforeEach(module('nrpBackendAbout'));

  beforeEach(
    module(function($provide) {
      $provide.value('serverError', serverErrorMock);
    })
  );

  beforeEach(
    inject(function(
      $httpBackend,
      _serverError_,
      _nrpBackendVersions_,
      _nrpFrontendVersion_
    ) {
      httpBackend = $httpBackend;
      serverError = _serverError_;
      nrpBackendVersions = _nrpBackendVersions_;
      nrpFrontendVersion = _nrpFrontendVersion_;
      serverError.displayHTTPError.calls.reset();
    })
  );

  afterEach(function() {
    httpBackend.verifyNoOutstandingExpectation();
    httpBackend.verifyNoOutstandingRequest();
  });

  it('should retrieve the versions of the CLosed Loop Engine and the Experiment Designer Back-Ends', function() {
    nrpBackendVersions(serverURL).get();
    httpBackend.expectGET(serverURL + '/version').respond(200);
    httpBackend.flush();
    expect(serverError.displayHTTPError.calls.count()).toBe(0);
  });

  it('should parse properly the versions', function() {
    var response = nrpBackendVersions(serverURL).get();
    var softwareAVersion = '1.2.3';
    var softwareBVersion = '1.3.4.dev4';
    var softwareCVersion = 'Not_a_standard_version';

    var serverResponse = {
      softwareA: softwareAVersion,
      softwareB: softwareBVersion,
      softwareC: softwareCVersion
    };
    httpBackend.expectGET(serverURL + '/version').respond(200, serverResponse);
    httpBackend.flush();
    expect(response.toString).toEqual(
      'Backend:\n\tsoftwareA: 1.2.3\n\tsoftwareB: 1.3.4.dev4\n\tsoftwareC: Not_a_standard_version\n'
    );
  });

  it('should call once serverError when the service call fails', function() {
    var response = nrpBackendVersions(serverURL).get();
    httpBackend.expectGET(serverURL + '/version').respond(400);
    httpBackend.flush();
    expect(serverError.displayHTTPError.calls.count()).toBe(1);
    response = serverError.displayHTTPError.calls.mostRecent().args[0];
    expect(response.status).toBe(400);
  });

  it('should parse the frontend version', function() {
    inject($rootScope => {
      httpBackend.expectGET('package.json').respond(200, { version: '1' });
      var response = nrpFrontendVersion.get();
      httpBackend.flush();
      response.$promise.then(res => {
        expect(res.version).toBe('1');
      });
      $rootScope.$digest();
    });
  });
});
