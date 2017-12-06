'use strict';

describe('Controller: ApplyForceViewController', function() {
  beforeEach(module('userInteractionModule'));

  beforeEach(module('baseEventHandlerMock'));
  beforeEach(module('applyForceServiceMock'));

  var applyForceViewController;
  var $rootScope, $scope;
  var applyForceService, baseEventHandler;

  beforeEach(
    inject(function(
      _$rootScope_,
      $controller,
      _baseEventHandler_,
      _applyForceService_
    ) {
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      baseEventHandler = _baseEventHandler_;
      applyForceService = _applyForceService_;

      applyForceViewController = $controller('ApplyForceViewController', {
        $scope: $scope
      });
    })
  );

  it('should init correctly', function(done) {
    expect(applyForceViewController.applyForceService).toBe(applyForceService);
    done();
  });

  it('should exit apply force mode on destroy', function(done) {
    $scope.$emit('$destroy');
    expect(applyForceService.disableApplyForceMode).toHaveBeenCalled();
    done();
  });

  it('should suppress key events when entering numerals', function(done) {
    var mockEvent = {};
    $scope.suppressKeyPress(mockEvent);
    expect(baseEventHandler.suppressAnyKeyPress).toHaveBeenCalledWith(
      mockEvent
    );
    done();
  });
});
