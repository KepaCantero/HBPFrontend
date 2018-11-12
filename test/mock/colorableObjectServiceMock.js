(function() {
  'use strict';

  angular
    .module('colorableObjectServiceMock', [])
    .service('colorableObjectService', function() {
      this.setEntityMaterial = jasmine.createSpy('setEntityMaterial');
      this.isColorableEntity = jasmine.createSpy('isColorableEntity');
    });
})();
