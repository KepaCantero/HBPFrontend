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

  it('should make a PUT request on /experiment/:context_id/sdf_world', function() {
    $httpBackend
      .expectPOST(
        simulationInfo.serverBaseUrl +
          '/experiment/' +
          simulationInfo.experimentID +
          '/sdf_world'
      )
      .respond(200);
    backendInterfaceService.saveSDF(simulationInfo.experimentID);
    $httpBackend.flush();
  });

  it('should make a PUT request on /experiment/:context_id/brain', function() {
    var somePopulations = { population1: [1, 2, 3], population2: [3, 4, 5] };
    var contextObject = {
      data: 'some source',
      //eslint-disable-next-line camelcase
      additional_populations: somePopulations
    };
    $httpBackend
      .expectPUT(
        simulationInfo.serverBaseUrl +
          '/experiment/' +
          simulationInfo.experimentID +
          '/brain',
        contextObject
      )
      .respond(200);
    backendInterfaceService.saveBrain('some source', somePopulations);
    $httpBackend.flush();
  });

  it('should call serverError.displayHTTPError when the saveSDF PUT request fails', function() {
    $httpBackend.whenPOST(urlRegex).respond(500);
    backendInterfaceService.saveSDF(simulationInfo.experimentID);
    $httpBackend.flush();
    expect(serverError.displayHTTPError).toHaveBeenCalled();
  });

  it('should make a PUT request on /experiment/:context_id/transfer_functions', function() {
    var tfMock = ['someTF1', 'someTF2'];
    $httpBackend
      .expectPUT(
        simulationInfo.serverBaseUrl +
          '/experiment/' +
          simulationInfo.experimentID +
          '/transfer-functions'
      )
      .respond(200);
    backendInterfaceService.saveTransferFunctions(tfMock);
    $httpBackend.flush();
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

  it('should call the success callback when the addTransferFunction POST request succeeds', function() {
    $httpBackend.whenPOST(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.addTransferFunction({}, callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
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

  it('should call the failure callback when the addTransferFunction POST request fails', function() {
    $httpBackend.whenPOST(urlRegex).respond(500);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.addTransferFunction({}, function() {}, callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the success callback when the setStructuredTransferFunction PUT request succeeds', function() {
    $httpBackend.whenPUT(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.setStructuredTransferFunction({}, callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });

  it('should call the failure callback when the setStructuredTransferFunction PUT request fails', function() {
    $httpBackend.whenPUT(urlRegex).respond(500);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.setStructuredTransferFunction(
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

  it('should call the success callback when the getStructuredTransferFunctions GET request succeeds', function() {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.getStructuredTransferFunctions(callback);
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

  it('should call serverError.displayHTTPError when the saveTransferFunctions PUT request fails', function() {
    $httpBackend.whenPUT(urlRegex).respond(500);
    backendInterfaceService.saveTransferFunctions(
      '97923877-13ea-4b43-ac31-6b79e130d344'
    );
    $httpBackend.flush();
    expect(serverError.displayHTTPError).toHaveBeenCalled();
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

  it('should make a PUT request on /experiment/:context_id/state_machines', function() {
    var smMock = ['someSM1', 'someSM2'];
    var successCallback = jasmine.createSpy('callback');
    var failureCallback = jasmine.createSpy('callback');
    $httpBackend
      .expectPUT(
        simulationInfo.serverBaseUrl +
          '/experiment/' +
          simulationInfo.experimentID +
          '/state-machines'
      )
      .respond(200);
    backendInterfaceService.saveStateMachines(
      smMock,
      successCallback,
      failureCallback
    );
    $httpBackend.flush();

    expect(successCallback).toHaveBeenCalled();
    expect(failureCallback).not.toHaveBeenCalled();
  });

  it('should call failure callback when PUT state-machines fails', function() {
    $httpBackend.whenPUT(urlRegex).respond(500);
    var successCallback = jasmine.createSpy('callback');
    var failureCallback = jasmine.createSpy('callback');
    backendInterfaceService.saveStateMachines(
      ['someSM1', 'someSM2'],
      successCallback,
      failureCallback
    );
    $httpBackend.flush();

    expect(successCallback).not.toHaveBeenCalled();
    expect(failureCallback).toHaveBeenCalled();
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

  it('should call the success callback when the reloadBrain GET request succeeds', function() {
    $httpBackend.whenGET(urlRegex).respond(200);
    var callback = jasmine.createSpy('callback');
    backendInterfaceService.reloadBrain(callback);
    $httpBackend.flush();
    expect(callback).toHaveBeenCalled();
  });
});
