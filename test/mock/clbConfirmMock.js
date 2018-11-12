(function() {
  'use strict';

  angular.module('clbConfirmMock', []).service('clbConfirm', function() {
    this.openCallSuccess = true;

    this.open = jasmine.createSpy('open').and.returnValue({
      then: jasmine.createSpy('then').and.callFake((success, failure) => {
        if (this.openCallSuccess) {
          success();
        } else {
          failure();
        }
      })
    });
  });
})();
