(function() {
  'use strict';

  angular
    .module('clbErrorDialogMock', [])
    .service('clbErrorDialog', function() {
      this.open = jasmine.createSpy('open');
    });
})();
