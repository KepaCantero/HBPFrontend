(function() {
  'use strict';

  angular
    .module('contextMenuStateServiceMock', [])
    .service('contextMenuState', function() {
      this.toggleContextMenu = jasmine.createSpy('toggleContextMenu');
      this.pushItemGroup = jasmine.createSpy('pushItemGroup');
      this.hideMenu = jasmine.createSpy('hideMenu');
      this.axisSelected = jasmine.createSpy('axisSelected');
    });
})();
