(function() {
  'use strict';

  angular
    .module('goldenLayoutServiceMock', [])
    .service('goldenLayoutService', function() {
      this.layout = {
        root: {
          getItemsById: jasmine.createSpy('getItemsById')
        },
        toConfig: jasmine.createSpy('toConfig'),
        on: jasmine.createSpy('on')
      };

      this.createLayout = jasmine.createSpy('createLayout');
      this.openTool = jasmine.createSpy('openTool');
      this.toggleTool = jasmine.createSpy('toggleTool');
      this.createDragSource = jasmine.createSpy('createDragSource');
      this.refreshSize = jasmine.createSpy('refreshSize');
      this.isLayoutInitialised = jasmine
        .createSpy('isLayoutInitialised')
        .and.returnValue({
          then: jasmine.createSpy('then').and.callFake(cb => cb())
        });
    });
})();
