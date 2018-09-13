(function() {
  'use strict';

  angular
    .module('applicationTopToolbarServiceMock', [])
    .service('applicationTopToolbarService', function() {
      this.isInSimulationView = jasmine.createSpy('isInSimulationView');
    });
})();
