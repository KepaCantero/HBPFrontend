(function() {
  'use strict';

  angular
    .module('robotComponentsServiceMock', [])
    .service('robotComponentsService', function() {
      this.robot = new THREE.Object3D();
      this.initialize = jasmine.createSpy('initialize');
      this.getRobot = jasmine.createSpy('getRobot').and.returnValue(this.robot);
    });
})();
