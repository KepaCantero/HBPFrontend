(function() {
  'use strict';

  angular.module('roslibMock', []).service('roslib', [
    function() {
      this.getOrCreateConnectionTo = jasmine.createSpy(
        'getOrCreateConnectionTo'
      );
    }
  ]);
})();
