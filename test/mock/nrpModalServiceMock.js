'use strict';
(function() {
  angular
    .module('nrpModalServiceMock', [])
    .service('nrpModalService', function() {
      this.createModal = jasmine
        .createSpy('nrpModalServiceMock.createModal')
        .and.returnValue('Create Modal Called');

      this.destroyModal = jasmine
        .createSpy('nrpModalServiceMock.destroyModal')
        .and.returnValue('Destroy Modal Called');
    });
})();
