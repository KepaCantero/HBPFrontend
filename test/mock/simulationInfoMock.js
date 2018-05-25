(function() {
  'use strict';

  angular.module('simulationInfoMock', []).service('simulationInfo', [
    '$q',
    '$httpBackend',
    '$rootScope',
    function($q, $httpBackend) {
      this.serverConfig = {
        gzweb: { assets: 'assets' },
        rosbridge: {
          topics: {
            cleError: {}
          }
        },
        experimentDetails: {
          brainProcesses: 1
        }
      };
      this.serverID = 'bbpce016';
      this.simulationID = 'mocked_simulation_id';
      this.serverBaseUrl = 'http://bbpce016.epfl.ch:8080';
      this.Initialize = jasmine.createSpy('Initialize');
      this.mode = undefined;
      this.contextID = '97923877-13ea-4b43-ac31-6b79e130d344';
      this.experimentDetails = {
        description: 'The Husky robot plays chess with Icub',
        name: 'TrueBlue',
        cameraPose: { x: 1.0, y: 2.0, z: 3.0 }
      };
      this.experimentID = 'experimentID';

      $httpBackend.whenGET(/.*\/version/).respond({});
      $httpBackend.whenGET('package.json').respond({});
      $httpBackend.whenGET(/.*\/simulation\/mocked_simulation_id/).respond(200);

      this.initialized = $q.when();
    }
  ]);
})();
