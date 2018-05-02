'use strict';

describe('Directive: noise-model', function() {
  beforeEach(module('noiseModelModule'));
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));

  beforeEach(module('roslibMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('baseEventHandlerMock'));

  var $rootScope, baseEventHandler;
  var roslib, $compile, $scope, elementScope;

  var mockServiceSuccess,
    mockServiceSuccessResponse,
    mockServiceFailureResponse;

  beforeEach(
    inject(function(
      _$rootScope_,
      _$compile_,
      _noiseModelService_,
      _baseEventHandler_,
      _roslib_
    ) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;

      baseEventHandler = _baseEventHandler_;
      roslib = _roslib_;
    })
  );

  beforeEach(function() {
    /* eslint-disable camelcase */
    mockServiceSuccess = true;
    mockServiceSuccessResponse = {
      model_name: 'robot',
      sensor_name: 'default::robot::some_link::my_camera'
    };
    mockServiceFailureResponse = 'default failure';
    /* eslint-enable camelcase */
    roslib.Service.and.returnValue({
      callService: jasmine
        .createSpy('callService')
        .and.callFake(function(request, fnSuccess, fnFailure) {
          if (mockServiceSuccess) {
            fnSuccess(mockServiceSuccessResponse);
          } else {
            fnFailure(mockServiceFailureResponse);
          }
        })
    });
  });

  beforeEach(function() {
    $scope = $rootScope.$new();
    var element = $compile('<noise-model></noise-model>')($scope);
    $scope.$digest();
    elementScope = element.isolateScope();
  });

  it('should suppress key events when entering numerals', function() {
    var mockEvent = {};
    elementScope.suppressKeyPress(mockEvent);
    expect(baseEventHandler.suppressAnyKeyPress).toHaveBeenCalledWith(
      mockEvent
    );
  });

  it(' - onMeanParameterChanged ', function() {
    elementScope.selNoiseType = 'gaussian';
    elementScope.mean = -1;
    elementScope.onMeanParameterChanged();
    expect(elementScope.selectedStyleMean).toEqual('background-color:red;');

    elementScope.mean = 0.1;
    elementScope.onMeanParameterChanged();
    expect(elementScope.selectedStyleMean).toEqual('');
  });

  it(' - onStdDevParameterChanged ', function() {
    elementScope.selNoiseType = 'gaussian';
    elementScope.stddev = -1;
    elementScope.onStdDevParameterChanged();
    expect(elementScope.selectedStyleStddev).toEqual('background-color:red;');

    elementScope.stddev = 0.1;
    elementScope.onStdDevParameterChanged();
    expect(elementScope.selectedStyleStddev).toEqual('');
  });

  it(' - setNoiseModel ', function() {
    var Mockmode = 'gaussian';
    elementScope.setNoiseModel(Mockmode);
    expect(elementScope.selNoiseType).toEqual(Mockmode);

    Mockmode = 'gamma';
    elementScope.setNoiseModel(Mockmode);
    expect(elementScope.selNoiseType).toEqual(Mockmode);
  });

  it(' - resetValueClicked ', function() {
    elementScope.originalvalue = [
      0.1,
      0.1,
      'gaussian',
      'default::robot::some_link::my_camera'
    ];
    elementScope.resetValueClicked();
    expect(elementScope.mean).toEqual(elementScope.originalvalue[1]);
  });
});
