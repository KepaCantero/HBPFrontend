(function() {
  'use strict';

  angular
    .module('experimentViewServiceMock', [])
    .service('experimentViewService', function() {
      this.setSimulationState = jasmine.createSpy('setSimulationState');
      this.isInSimulationView = jasmine.createSpy('isInSimulationView');
      this.resetSimulation = jasmine.createSpy('resetSimulation');
      this.openExitDialog = jasmine.createSpy('openExitDialog');
      this.exitDemo = jasmine.createSpy('exitDemo');
      this.exitSimulation = jasmine.createSpy('exitSimulation');
      this.broadcastEnterSimulation = jasmine.createSpy(
        'broadcastEnterSimulation'
      );
    });
})();
