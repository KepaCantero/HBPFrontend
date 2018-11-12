'use strict';

describe('Controller: brainvisualizerPanelCtrl', function() {
  // load the controller's module
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template
  beforeEach(module('gz3dMock'));
  beforeEach(module('simulationInfoMock'));

  let scope, rootScope, controller, $timeout;

  // Initialize the controller and a mock scope
  beforeEach(
    inject(function($controller, $rootScope, _$timeout_) {
      rootScope = $rootScope;
      $timeout = _$timeout_;
      scope = $rootScope.$new();

      controller = $controller('brainvisualizerPanelCtrl', {
        $rootScope: rootScope,
        $scope: scope
      });
    })
  );

  it('initialized correctly', function() {
    expect(scope.simulationID).toBeDefined();
    expect(scope.serverBaseUrl).toBeDefined();
  });

  it('Notify editor toolbar service if view is closed', function() {
    rootScope.$broadcast('$destroy');
    rootScope.$digest();
  });

  it('Should toggle showBrainVisualiser value', () => {
    expect(controller.showBrainVisualiser).toBe(true);
    controller.reloadBrainVisuzalizer();
    expect(controller.showBrainVisualiser).toBe(false);

    $timeout.flush();
    expect(controller.showBrainVisualiser).toBe(true);
  });
});
