/* global GZ3D: true */
'use strict';

describe('Directive: environment settings master', function() {
  var $rootScope,
    gz3dMock,
    clbConfirmMock,
    reloadPage = false;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(module('editorToolbarServiceMock'));

  beforeEach(
    module(function($provide) {
      GZ3D.MASTER_QUALITY_BEST = 'Best';
      GZ3D.MASTER_QUALITY_MIDDLE = 'Middle';
      GZ3D.MASTER_QUALITY_LOW = 'Low';
      GZ3D.MASTER_QUALITY_MINIMAL = 'Minimal';

      clbConfirmMock = {
        open: function() {
          return {
            then: function(success, failure) {
              if (reloadPage === true) {
                success();
              } else {
                failure();
              }
            }
          };
        }
      };

      gz3dMock = {
        scene: {
          composer: { currentMasterSettings: GZ3D.MASTER_QUALITY_MIDDLE }
        }
      };
      gz3dMock.scene.setMasterSettings = function(n, apply) {
        this.composer.currentMasterSettings = n;
        this.composer.applied = apply;
      };

      $provide.value('gz3d', gz3dMock);
      $provide.value('clbConfirm', clbConfirmMock);
    })
  );

  beforeEach(
    inject(function(_$rootScope_, $compile) {
      $rootScope = _$rootScope_;
      $compile(
        '<environment-settings-master></environment-settings-master>'
      )($rootScope);
      $rootScope.$digest();
    })
  );

  it('should initialize default values', function() {
    $rootScope.showEnvironmentSettingsPanel = true;
    $rootScope.$digest();

    expect(gz3dMock.scene.composer.currentMasterSettings).toBeDefined();
  });

  it('should update values to scene', function() {
    $rootScope.$$childTail.setMasterSettings(GZ3D.MASTER_QUALITY_MINIMAL);
    expect(gz3dMock.scene.composer.currentMasterSettings).toBe(
      GZ3D.MASTER_QUALITY_MINIMAL
    );
  });

  it('should ask to reload the page when switching to best', function() {
    reloadPage = false;
    $rootScope.$$childTail.setMasterSettings(GZ3D.MASTER_QUALITY_BEST);
    expect(gz3dMock.scene.composer.currentMasterSettings).toBe(
      GZ3D.MASTER_QUALITY_BEST
    );
  });

  it('should ask to reload the page when switching to best without applying', function() {
    reloadPage = true;
    $rootScope.$$childTail.setMasterSettings(GZ3D.MASTER_QUALITY_BEST);
    expect(gz3dMock.scene.composer.applied).toBe(false);
  });
});
