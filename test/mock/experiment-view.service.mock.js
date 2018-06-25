(function() {
  'use strict';

  angular
    .module('experimentViewServiceMock', [])
    .service('experimentViewService', function() {
      this.setSimulationState = jasmine.createSpy('setSimulationState');
      this.isInSimulationView = jasmine.createSpy('isInSimulationView');
      this.resetSimulation = jasmine.createSpy('resetSimulation');
      this.openExitDialog = jasmine.createSpy('openExitDialog');
      this.exitSimulation = jasmine.createSpy('exitSimulation');
    });
})();
