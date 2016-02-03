'use strict';

describe('Services: backendInterfaceService', function () {
  var backendInterfaceService, simulationInfo, $httpBackend, serverError;
  var urlRegex;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template
  beforeEach(module(function ($provide) {
    $provide.value('simulationInfo', { serverBaseUrl: 'server-base-url'});
    $provide.value('serverError', {display: jasmine.createSpy('display')});
  }));
  beforeEach(inject(function (
    _backendInterfaceService_,
    _simulationInfo_,
    _$httpBackend_,
    _serverError_) {
    backendInterfaceService = _backendInterfaceService_;
    simulationInfo = _simulationInfo_;
    $httpBackend = _$httpBackend_;
    serverError = _serverError_;
    simulationInfo.serverBaseUrl = 'http://bbpce014.epfl.ch:8080';
    urlRegex = /^http:\/\/bbpce014\.epfl\.ch:8080/;
  }));

  it('should set the server base URL correctly', function () {
    expect(backendInterfaceService.getServerBaseUrl()).toEqual(simulationInfo.serverBaseUrl);
  });

  it('should make a PUT request on /experiment/:context_id/sdf_world', function () {
    $httpBackend.whenPUT(urlRegex).respond(200);
    var contextID = '97923877-13ea-4b43-ac31-6b79e130d344';
    backendInterfaceService.saveSDF(contextID);
    $httpBackend.flush();
    /*jshint camelcase: false */
    var contextObject = {context_id: contextID};
    $httpBackend.expectPUT(
      simulationInfo.serverBaseUrl + '/experiment/' +
      contextID + '/sdf_world', contextObject , contextObject
    );
  });

  it('should make a PUT request on /experiment/:context_id/brain', function () {
    $httpBackend.whenPUT(urlRegex).respond(200);
    var contextID = '97923877-13ea-4b43-ac31-6b79e130d344';
    var somePopulations = {'population1': [1, 2, 3], 'population2': [3, 4, 5] };
    backendInterfaceService.saveBrain(contextID, 'some source', somePopulations);
    $httpBackend.flush();
    /*jshint camelcase: false */
    var contextObject = {context_id: contextID};
    $httpBackend.expectPUT(
      simulationInfo.serverBaseUrl + '/experiment/' +
      contextID + '/brain', contextObject , contextObject
    );
  });

  it('should call serverError.display when the saveSDF PUT request fails', function () {
    $httpBackend.whenPUT(urlRegex).respond(500);
    backendInterfaceService.saveSDF('97923877-13ea-4b43-ac31-6b79e130d344');
    $httpBackend.flush();
    expect(serverError.display).toHaveBeenCalled();
  });

  it('should make a PUT request on /experiment/:context_id/transfer_functions', function () {
    var tfMock = [ 'someTF1', 'someTF2' ];
    $httpBackend.whenPUT(urlRegex).respond(200);
    var contextID = '97923877-13ea-4b43-ac31-6b79e130d344';

    backendInterfaceService.saveTransferFunctions(contextID, tfMock);
    $httpBackend.flush();
    /*jshint camelcase: false */
    var contextObject = {context_id: contextID};
    var tfObject = { transfer_functions: tfMock };

    $httpBackend.expectPUT(
      simulationInfo.serverBaseUrl + '/experiment/' +
        contextID + '/tf_world', contextObject , angular.extend(contextObject, tfObject)
    );
  });

  it('should call the success callback when the setTransferFunction PUT request succeeds', function () {
    $httpBackend.whenPUT(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.setTransferFunction('transferFunctionName', {}, callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the failure callback when the setTransferFunction PUT request fails', function () {
    $httpBackend.whenPUT(urlRegex).respond(500);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.setTransferFunction('transferFunctionName', {}, function(){}, callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the getTransferFunctions GET request succeeds', function () {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.getTransferFunctions(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call serverError.display when the saveTransferFunctions PUT request fails', function () {
    $httpBackend.whenPUT(urlRegex).respond(500);
    backendInterfaceService.saveTransferFunctions('97923877-13ea-4b43-ac31-6b79e130d344');
    $httpBackend.flush();
    expect(serverError.display).toHaveBeenCalled();
  });

  it('should call /simulation/:sim_id/reset with the right params when calling reset from a given simulation', function() {
    $httpBackend.whenPUT(urlRegex).respond(200);
    simulationInfo.simulationID = 1;
    var resetParams = {checkbox1: true, checkbox2: false};
    backendInterfaceService.reset(resetParams);
    $httpBackend.expectPUT(simulationInfo.serverBaseUrl + '/simulation/' +
      simulationInfo.simulationID + '/reset', resetParams);
    $httpBackend.flush();
  });

  it('should call the success callback when the getStateMachines GET request succeeds', function () {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.getStateMachines(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call serverError.display when the setStateMachine PUT request fails', function () {
    $httpBackend.whenPUT(urlRegex).respond(500);
    backendInterfaceService.setStateMachine('setStateMachineName', {}, function() {});
    $httpBackend.flush();
    expect(serverError.display).toHaveBeenCalled();
  });

  it('should call the success callback when the setStateMachine PUT request succeeds', function () {
    $httpBackend.whenPUT(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.setStateMachine('setStateMachineName', {}, callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the deleteStateMachine DELETE request succeeds', function () {
    $httpBackend.whenDELETE(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.deleteStateMachine('StateMachine1', callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the getBrain GET request succeeds', function () {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.getBrain(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the setBrain PUT request succeeds', function () {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.getBrain(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the failure callback when the setBrain PUT request fails', function () {
    $httpBackend.whenPUT(urlRegex).respond(500);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.setBrain(undefined, undefined, undefined, undefined, function(){}, callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the reloadBrain GET request succeeds', function () {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.reloadBrain(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

});
