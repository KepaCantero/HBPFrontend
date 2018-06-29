(function() {
  'use strict';

  angular
    .module('dynamicViewOverlayServiceMock', [])
    .service('dynamicViewOverlayService', function() {
      this.createOverlay = jasmine.createSpy('createOverlay');
      this.removeOverlay = jasmine.createSpy('removeOverlay');
      this.getController = jasmine.createSpy('getController').and.returnValue({
        then: jasmine.createSpy('then')
      });
      this.isOverlayOpen = jasmine.createSpy('isOverlayOpen').and.returnValue({
        then: jasmine.createSpy('then')
      });
      this.getParentOverlayWrapper = jasmine.createSpy(
        'getParentOverlayWrapper'
      );
      this.getOverlayParentElement = jasmine.createSpy(
        'getOverlayParentElement'
      );
      this.closeAllOverlaysOfType = jasmine.createSpy('closeAllOverlaysOfType');
      this.createDynamicOverlay = jasmine
        .createSpy('createDynamicOverlay')
        .and.returnValue({
          then: jasmine.createSpy('then').and.callFake(function(fn) {
            fn();
          })
        });
      this.toggleDynamicViewOverlay = jasmine.createSpy(
        'toggleDynamicViewOverlay'
      );
    });
})();
