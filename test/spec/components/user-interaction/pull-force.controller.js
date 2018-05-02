'use strict';

describe('Controller: pullForceController', function() {
  beforeEach(module('userInteractionModule'));

  beforeEach(module('applyForceServiceMock'));
  beforeEach(module('pullForceServiceMock'));
  beforeEach(module('baseEventHandlerMock'));
  beforeEach(module('editorToolbarServiceMock'));
  beforeEach(module('clientLoggerServiceMock'));

  var $rootScope, $scope, pullForceCntrl;
  var editorToolbarService, applyForceService, pullForceService;
  let element;

  beforeEach(
    inject(function(
      $compile,
      _$rootScope_,
      $controller,
      _baseEventHandler_,
      _pullForceService_,
      _editorToolbarService_,
      _applyForceService_
    ) {
      $rootScope = _$rootScope_;
      editorToolbarService = _editorToolbarService_;
      applyForceService = _applyForceService_;
      pullForceService = _pullForceService_;

      $scope = $rootScope.$new();
      element = $compile('<pull-force></pull-force>')($scope);
      $rootScope.$digest();
      pullForceCntrl = element.controller('pullForce');
    })
  );

  it('should deactivate pull force mode on destroy', function(done) {
    $scope.$destroy();
    expect(editorToolbarService.disableForceApplyMode).toHaveBeenCalled();
    done();
  });

  it('should have been initialized correctly', function(done) {
    expect(pullForceCntrl.UseAdancedMode).toBeDefined();
    pullForceService.currentModel.and.returnValue({ dummy: 'object' });

    pullForceCntrl.UseAdancedMode();

    expect(applyForceService.ActivateForTarget).toHaveBeenCalledWith({
      dummy: 'object'
    });
    expect(editorToolbarService.disableForceApplyMode).toHaveBeenCalled();
    done();
  });

  it('should not activate advanced mode if no object was selected', function(
    done
  ) {
    expect(pullForceCntrl.UseAdancedMode).toBeDefined();

    pullForceCntrl.UseAdancedMode();

    expect(applyForceService.ActivateForTarget).not.toHaveBeenCalled();
    expect(editorToolbarService.disableForceApplyMode).not.toHaveBeenCalled();
    done();
  });

  it('pullForce Service should update the force multiplier', function(done) {
    expect(pullForceCntrl.updateForceAmplifier).toBeDefined();

    pullForceCntrl.forceAmplifier = 10;
    pullForceCntrl.updateForceAmplifier();

    expect(pullForceService.SetForceAmplifier).toHaveBeenCalledWith(10);
    done();
  });
});
