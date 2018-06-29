(function() {
  'use strict';

  angular
    .module('simToolsSidebarServiceMock', [])
    .service('simToolsSidebarService', function() {
      this.toggleSidebar = jasmine.createSpy('toggleSidebar');
    });
})();
