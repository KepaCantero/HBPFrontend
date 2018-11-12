'use strict';

describe('Services: userInteractionSettingsService', function() {
  //var $rootScope, element;

  var userInteractionSettingsService;

  var $rootScope;
  var CAMERA_SENSITIVITY_RANGE, UIS_DEFAULTS;
  var simulationConfigService;

  /*beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template

  beforeEach(module('dynamicViewOverlayModule'));
  beforeEach(module('clientLoggerServiceMock'));
  beforeEach(module('simulationInfoMock'));*/

  beforeEach(module('userInteractionModule'));
  beforeEach(module('userNavigationModule'));

  beforeEach(module('simulationConfigServiceMock'));

  beforeEach(function() {});

  beforeEach(function() {
    // inject service for testing.
    inject(function(
      _userInteractionSettingsService_,
      _$rootScope_,
      _CAMERA_SENSITIVITY_RANGE_,
      _UIS_DEFAULTS_,
      _simulationConfigService_
    ) {
      userInteractionSettingsService = _userInteractionSettingsService_;

      $rootScope = _$rootScope_;
      CAMERA_SENSITIVITY_RANGE = _CAMERA_SENSITIVITY_RANGE_;
      UIS_DEFAULTS = _UIS_DEFAULTS_;
      simulationConfigService = _simulationConfigService_;
    });
  });

  it(' - loadSettings()', function() {
    spyOn(
      userInteractionSettingsService,
      'clampCameraSensitivity'
    ).and.callThrough();

    var mockConfig =
      '{"camera": {"sensitivity": {"translation": 0.1, "rotation": 1.2}}}';
    var mockConfigPromise = {
      then: jasmine.createSpy('then').and.callFake(function(cb) {
        cb(mockConfig);
        return mockConfigPromise;
      }),
      catch: jasmine.createSpy('catch').and.callFake(function() {
        return mockConfigPromise;
      }),
      finally: jasmine.createSpy('finally').and.callFake(function(cb) {
        cb();
        return mockConfigPromise;
      })
    };
    simulationConfigService.loadConfigFile = jasmine
      .createSpy('test')
      .and.returnValue(mockConfigPromise);

    userInteractionSettingsService.loadSettings();
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.translation
    ).toBe(0.1);
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.rotation
    ).toBe(1.2);

    // test config above max values
    mockConfig =
      '{"camera": {"sensitivity": {"translation": ' +
      (CAMERA_SENSITIVITY_RANGE.TRANSLATION_MAX + 1.234) +
      ', "rotation": ' +
      (CAMERA_SENSITIVITY_RANGE.ROTATION_MAX + 2.345) +
      '}}}';
    userInteractionSettingsService.loadSettings();
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.translation
    ).toBe(CAMERA_SENSITIVITY_RANGE.TRANSLATION_MAX);
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.rotation
    ).toBe(CAMERA_SENSITIVITY_RANGE.ROTATION_MAX);

    // test config below min values
    mockConfig =
      '{"camera": {"sensitivity": {"translation": ' +
      (CAMERA_SENSITIVITY_RANGE.TRANSLATION_MIN - 0.01) +
      ', "rotation": ' +
      (CAMERA_SENSITIVITY_RANGE.ROTATION_MIN - 0.02) +
      '}}}';
    userInteractionSettingsService.loadSettings();
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.translation
    ).toBe(CAMERA_SENSITIVITY_RANGE.TRANSLATION_MIN);
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.rotation
    ).toBe(CAMERA_SENSITIVITY_RANGE.ROTATION_MIN);

    // test error/catch case
    mockConfigPromise.catch.and.callFake(function(cb) {
      cb();
      return mockConfigPromise;
    });
    userInteractionSettingsService.loadSettings();
    expect(userInteractionSettingsService.settingsData).toEqual(UIS_DEFAULTS);
  });

  it(' - saveSettings()', function() {
    var mockConfig =
      '{"camera": {"sensitivity": {"translation": 0.1, "rotation": 1.2}}}';
    simulationConfigService.saveConfigFile = jasmine
      .createSpy('saveConfigFile')
      .and.returnValue(window.$q.resolve(mockConfig));
    userInteractionSettingsService.settingsData = UIS_DEFAULTS;
    userInteractionSettingsService.saveSettings();

    expect(simulationConfigService.saveConfigFile).toHaveBeenCalledWith(
      'user-interaction-settings',
      jasmine.any(String)
    );
  });

  it(' - GETTER settings()', function(done) {
    expect(userInteractionSettingsService.settingsData).not.toBeDefined();
    spyOn(userInteractionSettingsService, 'loadSettings').and.returnValue({
      then: jasmine.createSpy('then').and.callFake(function(cb) {
        cb();
      })
    });

    var result = userInteractionSettingsService.settings;
    expect(userInteractionSettingsService.loadSettings).toHaveBeenCalled();

    userInteractionSettingsService.settingsData = UIS_DEFAULTS;
    userInteractionSettingsService.loadSettings.calls.reset();
    userInteractionSettingsService.settings.then(function(settings) {
      result = settings;
    });
    $rootScope.$digest();
    expect(result).toBe(UIS_DEFAULTS);
    expect(userInteractionSettingsService.loadSettings).not.toHaveBeenCalled();
    done();
  });

  it(' - persistToFile()', function(done) {
    let mockData = {
      a: true,
      b: 'true',
      c: 1
    };
    simulationConfigService.saveConfigFile.and.returnValue({
      then: jasmine.createSpy('then').and.callFake(cb => {
        cb();
      })
    });

    userInteractionSettingsService._persistToFile(mockData);

    expect(userInteractionSettingsService.lastSavedSettingsData.a).toBe(
      mockData.a
    );
    expect(userInteractionSettingsService.lastSavedSettingsData.b).toBe(
      mockData.b
    );
    expect(userInteractionSettingsService.lastSavedSettingsData.c).toBe(
      mockData.c
    );

    done();
  });

  it(' - saveSetting(), with specific types', function(done) {
    spyOn(userInteractionSettingsService, '_persistToFile');
    userInteractionSettingsService.lastSavedSettingsData = {};
    userInteractionSettingsService.settingsData = {
      typeA: true,
      typeB: 'true',
      typeC: 1
    };

    userInteractionSettingsService.saveSetting('typeA', 'typeB');

    expect(userInteractionSettingsService._persistToFile).toHaveBeenCalledWith({
      typeA: true,
      typeB: 'true'
    });

    done();
  });
});
