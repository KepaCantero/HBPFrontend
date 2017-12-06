(function() {
  'use strict';

  angular
    .module('baseEventHandlerMock', [])
    .service('baseEventHandler', function() {
      this.suppressAnyKeyPress = jasmine.createSpy('suppressAnyKeyPress');
    });
})();
