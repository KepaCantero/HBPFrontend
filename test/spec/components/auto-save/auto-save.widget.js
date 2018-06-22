'use strict';

describe('Service: auto-save.factory', function() {
  beforeEach(module('exdFrontendApp'));

  let $rootScope, $compile, element, $timeout;

  let autoSaveFactory = {
    onSaving: cb => (autoSaveFactory.cb = cb)
  };

  beforeEach(
    module(function($provide) {
      $provide.value('autoSaveFactory', autoSaveFactory);
    })
  );

  beforeEach(
    inject(function(_$rootScope_, _$compile_, _$timeout_) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      $timeout = _$timeout_;
    })
  );

  beforeEach(function() {
    var $scope = $rootScope.$new();
    element = $compile('<auto-save-widget></auto-save-widget>')($scope);
    $scope.$digest();

    //elementScope = element.isolateScope();
  });

  it('should set show on saving', function() {
    expect(element.find('.fa-spin').length).toBe(0);

    autoSaveFactory.cb('State Machines'); // saving state machines
    $rootScope.$digest();
    expect(element.find('.fa-spin').length).toBe(1);

    autoSaveFactory.cb(); //no saving
    // spin still visible for some animation delay
    expect(element.find('.fa-spin').length).toBe(1);
    $timeout.flush();
    $rootScope.$digest();
    // spin no longer visible
    expect(element.find('.fa-spin').length).toBe(0);
  });
});
