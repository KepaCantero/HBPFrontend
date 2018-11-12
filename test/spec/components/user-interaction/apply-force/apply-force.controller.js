'use strict';

describe('Controller: ApplyForceController', function() {
  beforeEach(module('userInteractionModule'));

  beforeEach(module('baseEventHandlerMock'));
  beforeEach(module('pullForceServiceMock'));
  beforeEach(module('pushForceServiceMock'));

  var applyForceViewController;
  var $rootScope, $scope;
  var pullForceService, pushForceService, baseEventHandler;

  beforeEach(
    inject(function(
      _$rootScope_,
      $controller,
      _baseEventHandler_,
      _pullForceService_,
      _pushForceService_
    ) {
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      baseEventHandler = _baseEventHandler_;
      pullForceService = _pullForceService_;
      pushForceService = _pushForceService_;

      applyForceViewController = $controller('ApplyForceController', {
        $scope: $scope
      });
    })
  );

  it('should init correctly', function(done) {
    expect(applyForceViewController.pushForceService).toBe(pushForceService);
    done();
  });

  it('should exit apply force mode on destroy', function(done) {
    $scope.$emit('$destroy');
    expect(pushForceService.disableApplyForceMode).toHaveBeenCalled();
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

  it(' - toggleMode()', function(done) {
    applyForceViewController.advancedMode = false;

    applyForceViewController.toggleMode();

    expect(applyForceViewController.advancedMode).toBe(true);
    expect(pullForceService.Deactivate).toHaveBeenCalled();
    expect(pushForceService.enterModeApplyForce).toHaveBeenCalled();

    applyForceViewController.toggleMode();

    expect(applyForceViewController.advancedMode).toBe(false);
    expect(pullForceService.Activate).toHaveBeenCalled();
    expect(pushForceService.disableApplyForceMode).toHaveBeenCalled();
    expect(pushForceService.detachGizmo).toHaveBeenCalled();

    done();
  });

  it(' - updateForceAmplifier()', function(done) {
    applyForceViewController.updateForceAmplifier();
    expect(pullForceService.SetForceAmplifier).toHaveBeenCalledWith(
      applyForceViewController.forceAmplifier
    );
    done();
  });
});
