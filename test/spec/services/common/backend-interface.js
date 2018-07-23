'use strict';

describe('Services: backendInterfaceService', function() {
  var backendInterfaceService,
    simulationInfo,
    $httpBackend,
    serverError,
    RESET_TYPE;
  var urlRegex;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('exd.templates')); // import html template
  beforeEach(
    module(function($provide) {
      $provide.value('serverError', {
        displayHTTPError: jasmine.createSpy('displayHTTPError')
      });
    })
  );
  beforeEach(
    inject(function(
      _backendInterfaceService_,
      _simulationInfo_,
      _$httpBackend_,
      _serverError_,
      _RESET_TYPE_
    ) {
      backendInterfaceService = _backendInterfaceService_;
      simulationInfo = _simulationInfo_;
      $httpBackend = _$httpBackend_;
      serverError = _serverError_;
      simulationInfo.serverBaseUrl = 'http://bbpce014.epfl.ch:8080';
      urlRegex = /^http:\/\/bbpce014\.epfl\.ch:8080/;
      RESET_TYPE = _RESET_TYPE_;
    })
  );

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('should set the server base URL correctly', function() {
    expect(backendInterfaceService.getServerBaseUrl()).toEqual(
      simulationInfo.serverBaseUrl
    );
  });

  it('should call the success callback when the setTransferFunction PUT request succeeds', function() {
    $httpBackend.whenPUT(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.editTransferFunction(
      'transferFunctionName',
      {},
      callback
    );
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the setActivateTransferFunction POST request succeeds', function() {
    $httpBackend
      .expectPUT(
        simulationInfo.serverBaseUrl +
          '/simulation/' +
          simulationInfo.simulationID +
          '/transfer-functions/tfName/activation/true'
      )
      .respond(200);
    var callbackError = jasmine.createSpy('callback');
    var callbackSuccess = jasmine.createSpy('callback');
    backendInterfaceService.setActivateTransferFunction(
      'tfName',
      {},
      'true',
      callbackSuccess,
      callbackError
    );
    $httpBackend.flush();
    expect(callbackSuccess).toHaveBeenCalled();
  });

  it('should call the failure callback when the editTransferFunction PUT request fails', function() {
    $httpBackend.whenPUT(urlRegex).respond(500);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.editTransferFunction(
      'transferFunctionName',
      {},
      function() {},
      callback
    );
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the getTransferFunctions GET request succeeds', function() {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.getTransferFunctions(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the getPopulations GET request succeeds', function() {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.getPopulations(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the getTopics GET request succeeds', function() {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.getTopics(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call /simulation/:sim_id/reset with the right params when calling reset from a given simulation', function() {
    $httpBackend.whenPUT(urlRegex).respond(200);
    simulationInfo.simulationID = 1;
    var request = { resetType: RESET_TYPE.RESET_ROBOT_POSE };
    backendInterfaceService.reset(request);
    $httpBackend.expectPUT(
      simulationInfo.serverBaseUrl +
        '/simulation/' +
        simulationInfo.simulationID +
        '/reset',
      request
    );
    $httpBackend.flush();
  });

  it('should call /simulation/:sim_id/:context_id/reset with the right params when calling reset from a given simulation', function() {
    $httpBackend.whenPUT(urlRegex).respond(200);
    simulationInfo.simulationID = 1;
    var request = { resetType: RESET_TYPE.RESET_ROBOT_POSE };

    backendInterfaceService.resetCollab(request);

    $httpBackend.expectPUT(
      simulationInfo.serverBaseUrl +
        '/simulation/' +
        simulationInfo.simulationID +
        '/' +
        simulationInfo.experimentID +
        '/reset',
      request
    );
    $httpBackend.flush();
  });

  it('should call the success callback when the getStateMachines GET request succeeds', function() {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.getStateMachines(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call serverError.displayHTTPError when the setStateMachine PUT request fails', function() {
    $httpBackend.whenPUT(urlRegex).respond(500);
    backendInterfaceService.setStateMachine(
      'setStateMachineName',
      {},
      function() {}
    );
    $httpBackend.flush();
    expect(serverError.displayHTTPError).toHaveBeenCalled();
  });

  it('should call the success callback when the setStateMachine PUT request succeeds', function() {
    $httpBackend.whenPUT(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.setStateMachine(
      'setStateMachineName',
      {},
      callback
    );
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the deleteStateMachine DELETE request succeeds', function() {
    $httpBackend.whenDELETE(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.deleteStateMachine('StateMachine1', callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the getBrain GET request succeeds', function() {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.getBrain(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the setBrain PUT request succeeds', function() {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.getBrain(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the failure callback when the setBrain PUT request fails', function() {
    $httpBackend.whenPUT(urlRegex).respond(500);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.setBrain(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      function() {},
      callback
    );
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });
});
