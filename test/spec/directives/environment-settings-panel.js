/* global GZ3D: true */
'use strict';

describe('Directive: 3d settings', function() {
  var scope, gz3d, collab3DSettingsService;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));

  beforeEach(module('gz3dMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('userInteractionSettingsServiceMock'));

  beforeEach(
    module(function($provide) {
      collab3DSettingsService = {
        saveSettings: jasmine.createSpy('saveSettings'),
        setDefaultNavigationSensitivity: jasmine.createSpy(
          'setDefaultNavigationSensitivity'
        )
      };

      GZ3D.MASTER_QUALITY_BEST = 'Best';
      GZ3D.MASTER_QUALITY_MIDDLE = 'Middle';
      GZ3D.MASTER_QUALITY_LOW = 'Low';
      GZ3D.MASTER_QUALITY_MINIMAL = 'Minimal';

      $provide.value('collab3DSettingsService', collab3DSettingsService);
    })
  );

  beforeEach(
    inject(function(
      $rootScope,
      $compile,
      $httpBackend,
      SKYBOX_LIBRARY,
      _gz3d_
    ) {
      gz3d = _gz3d_;

      var element = $compile('<environment-settings-panel/>')($rootScope);
      var regex = new RegExp('.*' + SKYBOX_LIBRARY);
      $httpBackend.whenGET(regex).respond({ skyList: [], skyLabelList: [] });
      $httpBackend.whenGET('http://proxy/identity').respond(200);

      scope = element.scope();
      $rootScope.$digest();

      $httpBackend.flush();
    })
  );

  it('should reapply composer settings on resetSettings', function() {
    scope.resetSettings();
    expect(gz3d.scene.applyComposerSettings).toHaveBeenCalled();
  });

  it('should save 3d setting on environment save', function() {
    scope.saveSettings();
    expect(collab3DSettingsService.saveSettings).toHaveBeenCalled();
  });
});
