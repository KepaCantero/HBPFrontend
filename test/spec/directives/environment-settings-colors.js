'use strict';

describe('Directive: environment settings colors', function() {
  var $rootScope, gz3dMock, editorToolbarService;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(module('editorToolbarServiceMock'));

  beforeEach(
    module(function($provide) {
      gz3dMock = { scene: { composerSettings: {} } };

      gz3dMock.scene.composerSettings.rgbCurve = {
        red: [],
        green: [],
        blue: []
      }; // Color correction, disabled by default

      gz3dMock.scene.composerSettings.levelsInBlack = 0.0; // Color levels
      gz3dMock.scene.composerSettings.levelsInGamma = 1.0;
      gz3dMock.scene.composerSettings.levelsInWhite = 1.0;
      gz3dMock.scene.composerSettings.levelsOutBlack = 0.0;
      gz3dMock.scene.composerSettings.levelsOutWhite = 1.0;

      gz3dMock.scene.applyComposerSettings = function() {};

      $provide.value('gz3d', gz3dMock);
    })
  );

  beforeEach(
    inject(function(_$rootScope_, $compile, _editorToolbarService_) {
      $rootScope = _$rootScope_;
      editorToolbarService = _editorToolbarService_;
      $compile(
        '<environment-settings-colors></environment-settings-colors>'
      )($rootScope);
      $rootScope.$digest();
    })
  );

  it('should initialize default values', function() {
    editorToolbarService.isEnvironmentSettingsPanelActive.and.returnValue(true);
    $rootScope.$digest();

    expect($rootScope.$$childTail.inGamma).toBeDefined();
  });

  it('should update values to scene', function() {
    $rootScope.$$childTail.inGamma = 1.0;
    $rootScope.$$childTail.updateEnvColorSettings();

    expect(gz3dMock.scene.composerSettings.levelsInGamma).toBe(1.0);
  });

  it('should update the curve', function() {
    spyOn(gz3dMock.scene, 'applyComposerSettings');

    gz3dMock.scene.composerSettings.rgbCurve = undefined;
    $rootScope.$$childTail.onRGBCurveChanged();

    expect(gz3dMock.scene.applyComposerSettings).toHaveBeenCalled();
  });

  it('should reset the curve', function() {
    $rootScope.$$childTail.resetCurve();
    expect(gz3dMock.scene.composerSettings.rgbCurve.red.length).toBe(0);
  });

  it('should reset the levels', function() {
    spyOn(gz3dMock.scene, 'applyComposerSettings');
    $rootScope.$$childTail.resetLevels();
    expect(gz3dMock.scene.applyComposerSettings).toHaveBeenCalled();
  });
});
