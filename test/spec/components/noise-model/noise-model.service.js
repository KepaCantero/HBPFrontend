'use strict';

describe('Services: noise-model-service', function() {
  var dynamicViewOverlayService, DYNAMIC_VIEW_CHANNELS, noiseModelService;
  beforeEach(module('noiseModelModule'));
  beforeEach(module('dynamicViewModule'));
  beforeEach(module('dynamicViewOverlayServiceMock'));
  beforeEach(module('editorsPanelServiceMock'));
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(
    inject(function(
      _dynamicViewOverlayService_,
      _DYNAMIC_VIEW_CHANNELS_,
      _noiseModelService_
    ) {
      dynamicViewOverlayService = _dynamicViewOverlayService_;
      DYNAMIC_VIEW_CHANNELS = _DYNAMIC_VIEW_CHANNELS_;
      noiseModelService = _noiseModelService_;
    })
  );
  var modelname, sensorname, sensortype;
  it('- test for setDataNoiseModel', function() {
    spyOn(dynamicViewOverlayService, 'createDynamicOverlay');
    var mockModelName = 'robot';
    var mockSensorName = 'default::robot::some_link::my_camera';
    var mockSensorType = 'camera';
    noiseModelService.setDataNoiseModel(
      mockModelName,
      mockSensorName,
      mockSensorType
    );
    expect(dynamicViewOverlayService.createDynamicOverlay).toHaveBeenCalledWith(
      DYNAMIC_VIEW_CHANNELS.MODEL_VIEWER
    );
    expect(noiseModelService.modelname).toEqual(mockModelName);
    expect(noiseModelService.sensorname).toEqual(mockSensorName);
    expect(noiseModelService.sensortype).toEqual(mockSensorType);
  });

  it('- getModelNameNoiseModel', function() {
    modelname = noiseModelService.getModelNameNoiseModel();
    sensorname = noiseModelService.getSensorNameNoiseModel();
    sensortype = noiseModelService.getSensorTypeNoiseModel();
    expect(modelname).toEqual(noiseModelService.modelname);
    expect(sensorname).toEqual(noiseModelService.sensorname);
    expect(sensortype).toEqual(noiseModelService.sensortype);
  });

  it('- setOriginalValue and getOriginalValue', function() {
    var mockmean = 0.1;
    var mockstddev = 0.1;
    var mockselNoiseType = 'gaussian';
    var mockselSensorName = 'default::robot::some_link::my_camera';
    noiseModelService.setOriginalValue(
      mockmean,
      mockstddev,
      mockselNoiseType,
      mockselSensorName
    );
    expect(noiseModelService.originalvalue[0]).toEqual(mockmean);
    expect(noiseModelService.originalvalue[1]).toEqual(mockstddev);
    expect(noiseModelService.originalvalue[2]).toEqual(mockselNoiseType);
    expect(noiseModelService.originalvalue[3]).toEqual(mockselSensorName);

    noiseModelService.setOriginalValue(
      mockmean,
      mockstddev,
      mockselNoiseType,
      mockselSensorName
    );
    var mockvalue = noiseModelService.getOriginalValue(mockselSensorName);
    expect(mockvalue[0]).toEqual(noiseModelService.originalvalue[0]);
    expect(mockvalue[1]).toEqual(noiseModelService.originalvalue[1]);
    expect(mockvalue[2]).toEqual(noiseModelService.originalvalue[2]);
    expect(mockvalue[3]).toEqual(noiseModelService.originalvalue[3]);
  });
});
