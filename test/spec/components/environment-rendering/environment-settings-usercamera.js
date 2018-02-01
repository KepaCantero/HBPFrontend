'use strict';

describe('Directive: render settings user camera frustum', function() {
  var $rootScope, gz3dMock, editorToolbarService;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));

  beforeEach(module('userInteractionSettingsServiceMock'));

  beforeEach(
    module(function($provide) {
      gz3dMock = { scene: { composerSettings: {} } };

      gz3dMock.scene.composerSettings.verticalFOV = 60.0; // Default user camera frustum parameters
      gz3dMock.scene.composerSettings.nearClippingDistance = 0.15;
      gz3dMock.scene.composerSettings.farClippingDistance = 100.0;
      gz3dMock.scene.composerSettings.showCameraHelper = false;

      gz3dMock.scene.applyComposerSettings = function() {};

      $provide.value('gz3d', gz3dMock);
    })
  );

  beforeEach(
    inject(function(_$rootScope_, $compile, _editorToolbarService_) {
      $rootScope = _$rootScope_;
      editorToolbarService = _editorToolbarService_;
      $compile(
        '<environment-settings-usercamera></environment-settings-usercamera>'
      )($rootScope);
      $rootScope.$digest();
    })
  );

  it('should initialize default user camera frustum values', function() {
    editorToolbarService.showEnvironmentSettingsPanel = true;
    $rootScope.$digest();

    expect(gz3dMock.scene.composerSettings.verticalFOV).toBeDefined();
    expect(gz3dMock.scene.composerSettings.nearClippingDistance).toBeDefined();
    expect(gz3dMock.scene.composerSettings.farClippingDistance).toBeDefined();
    expect(gz3dMock.scene.composerSettings.showCameraHelper).toBeDefined();
  });

  it('should update user camera frustum values to scene', function() {
    spyOn(gz3dMock.scene, 'applyComposerSettings');
    $rootScope.$$childTail.updateFrustumSettings();

    expect(gz3dMock.scene.applyComposerSettings).toHaveBeenCalled();
  });
});
