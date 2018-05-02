(function() {
  'use strict';

  angular
    .module('editorToolbarServiceMock', [])
    .service('editorToolbarService', function() {
      this.disableForceApplyMode = jasmine.createSpy('disableForceApplyMode');
      this.toggleForceApplyMode = jasmine.createSpy('toggleForceApplyMode');
      this.isEnvironmentSettingsPanelActive = jasmine.createSpy(
        'isEnvironmentSettingsPanelActive'
      );
    });
})();
