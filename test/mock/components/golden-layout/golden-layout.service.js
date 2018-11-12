(function() {
  'use strict';

  angular
    .module('goldenLayoutServiceMock', [])
    .service('goldenLayoutService', function() {
      this.layout = {
        root: {
          getItemsById: jasmine.createSpy('getItemsById')
        }
      };

      this.createLayout = jasmine.createSpy('createLayout');
      this.openTool = jasmine.createSpy('openTool');
      this.createDragSource = jasmine.createSpy('createDragSource');
      this.refreshSize = jasmine.createSpy('refreshSize');
    });
})();
