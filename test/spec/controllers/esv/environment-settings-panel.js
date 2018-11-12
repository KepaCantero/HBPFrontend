'use strict';

describe('Controller: environmentSettingsPanelCtrl', function() {
  // load the controller's module
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('gz3dModule'));

  beforeEach(module('simulationInfoMock'));

  var scope, rootScope, gz3d;

  var simulationInfo;

  var baseEventHandlerMock = {
    suppressAnyKeyPress: jasmine.createSpy('suppressAnyKeyPress')
  };

  beforeEach(
    module(function($provide) {
      $provide.value('baseEventHandler', baseEventHandlerMock);
    })
  );

  /*beforeEach(module(function ($provide) {
    $provide.value('simulationInfo', simulationInfo);
  }));*/

  // Initialize the controller and a mock scope
  beforeEach(
    inject(function(
      $controller,
      $rootScope,
      _bbpConfig_,
      _gz3d_,
      _simulationInfo_
    ) {
      rootScope = $rootScope;
      scope = $rootScope.$new();
      gz3d = _gz3d_;
      simulationInfo = _simulationInfo_;

      // Mock the scene controls object
      gz3d.scene = {};
      gz3d.scene.controls = {};
      gz3d.scene.controls.keyboardBindingsEnabled = true;

      $controller('environmentSettingsPanelCtrl', {
        $rootScope: rootScope,
        $scope: scope,
        simulationInfo: simulationInfo
      });

      // create mock for console
      spyOn(console, 'error');
      spyOn(console, 'log');
    })
  );

  it('should call suppressAnyKeyPress from baseEventHandler service', function() {
    scope.suppressKeyPress();
    expect(baseEventHandlerMock.suppressAnyKeyPress).toHaveBeenCalled();
  });
});
