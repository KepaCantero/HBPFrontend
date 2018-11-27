'use strict';

describe('Services: server-info-service', function() {
  var sceneInfo, simulationInfo, httpBackend;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(module('simulationInfoMock'));

  beforeEach(
    inject(function(_sceneInfo_, _simulationInfo_, _$httpBackend_) {
      sceneInfo = _sceneInfo_;
      simulationInfo = _simulationInfo_;
      httpBackend = _$httpBackend_;
    })
  );

  it("should initialize and update sceneInfo's robots list", function(done) {
    var url =
      simulationInfo.serverBaseUrl +
      '/simulation/' +
      simulationInfo.simulationID +
      '/robots';
    httpBackend.expectGET(url).respond({ robots: ['robot', 'icub'] });
    spyOn(sceneInfo, 'refreshRobotsList').and.callThrough();
    sceneInfo.initialize().then(function() {
      expect(sceneInfo.refreshRobotsList).toHaveBeenCalled();
      expect(sceneInfo.robots).toEqual(['robot', 'icub']);
      done();
    });
    httpBackend.flush();

    httpBackend.expectGET(url).respond({ robots: ['robot'] });
    sceneInfo.refreshRobotsList().then(function() {
      expect(sceneInfo.robots).toEqual(['robot']);
      done();
    });
  });
});
