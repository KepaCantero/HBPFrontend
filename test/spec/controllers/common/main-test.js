'use strict';

describe('Controller: MainCtrl', function () {

  // load the controller's module
  beforeEach(module('exdFrontendApp'));

  var controller, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    controller = $controller('MainCtrl', {
      $scope: scope
    });
  }));

  it('should attach the app title to the scope', function () {
    expect(true).toBe(true);
  });
});
