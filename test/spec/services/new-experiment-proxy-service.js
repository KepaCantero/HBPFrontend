'use strict';

describe('Services: new-experiment-proxy-service', function() {
  var httpBackend, bbpConfig, newExperimentProxyService, proxyUrl, $rootScope;
  // load the service to test and mock the necessary service
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(
    inject(function(
      _$httpBackend_,
      _bbpConfig_,
      _newExperimentProxyService_,
      _$rootScope_
    ) {
      httpBackend = _$httpBackend_;
      bbpConfig = _bbpConfig_;
      newExperimentProxyService = _newExperimentProxyService_;
      $rootScope = _$rootScope_;
      proxyUrl = bbpConfig.get('api.proxy.url');
    })
  );

  it('should make sure the get proxy url returns the correct url', function() {
    spyOn(bbpConfig, 'get').and.callThrough();
    var testProxyUrl = newExperimentProxyService.getProxyUrl();
    expect(bbpConfig.get).toHaveBeenCalledWith('api.proxy.url');
    expect(testProxyUrl).toEqual(proxyUrl);
  });

  it('should fetch the correct data from the backend', function() {
    var reponseData = [
      {
        name: 'Arm robot force based version',
        description:
          'Modified Hollie arm model for force based index finger movements.\n      In contrast to the first Hollie arm model it was required to remove the\n      PID control of the index finger joints to allow force control for this\n      particular finger.',
        thumbnail: null
      },
      {
        name: 'Arm robot',
        description: 'First Hollie arm model.',
        thumbnail: null
      }
    ];
    var mockResponse = {
      data: reponseData
    };
    httpBackend.expectGET(proxyUrl + '/models/robots').respond(mockResponse);
    var responsePromise = newExperimentProxyService.getTemplateModels('robots');
    httpBackend.flush();
    responsePromise.then(function(response) {
      expect(response.data.data).toEqual(reponseData);
    });
    $rootScope.$digest();
  });
});
