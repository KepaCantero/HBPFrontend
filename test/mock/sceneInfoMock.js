(function() {
  'use strict';

  angular.module('sceneInfoMock', []).service('sceneInfo', [
    '$q',
    function($q) {
      this.robots = [
        { robotId: 'robot' },
        { robotId: 'icub' },
        { robotId: 'husky' }
      ];
      this.refreshRobotsList = $q.when();
      this.initialized = $q.when();
    }
  ]);
})();
