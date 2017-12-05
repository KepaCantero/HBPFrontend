(function() {
  'use strict';

  angular
    .module('contextMenuStateMock', [])
    .service('contextMenuState', function() {
      this.toggleContextMenu = jasmine.createSpy('toggleContextMenu');
      this.pushItemGroup = jasmine.createSpy('pushItemGroup');
      this.hideMenu = jasmine.createSpy('hideMenu');
    });
})();
