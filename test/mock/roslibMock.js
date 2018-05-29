(function() {
  'use strict';

  angular.module('roslibMock', []).service('roslib', [
    function() {
      this.getOrCreateConnectionTo = jasmine.createSpy(
        'getOrCreateConnectionTo'
      );
      this.Service = jasmine.createSpy('Service');
      this.ServiceRequest = jasmine.createSpy('ServiceRequest');
      this.createService = jasmine.createSpy('createService');
    }
  ]);
})();
