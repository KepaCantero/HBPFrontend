'use strict';

describe('Directive: object-inspector', function() {
  var $rootScope, $compile, $scope;
  var gz3d;
  var elementScope;
  var dynamicViewOverlayService;
  var overlayWrapperMock;

  var baseEventHandlerMock = {
    suppressAnyKeyPress: jasmine.createSpy('suppressAnyKeyPress')
  };

  beforeEach(module('objectInspectorModule'));
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('dynamicViewOverlayServiceMock'));
  beforeEach(module('userNavigationServiceMock'));
  beforeEach(
    module(function($provide) {
      $provide.value('baseEventHandler', baseEventHandlerMock);
    })
  );

  beforeEach(
    inject(function(
      _$rootScope_,
      _$compile_,
      _gz3d_,
      _dynamicViewOverlayService_
    ) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      gz3d = _gz3d_;
      dynamicViewOverlayService = _dynamicViewOverlayService_;

      spyOn(gz3d.gui.guiEvents, 'on').and.callThrough();
      spyOn(gz3d.gui.guiEvents, 'removeListener').and.callThrough();
      overlayWrapperMock = {
        style: {
          minWidth: '',
          minHeight: '',
          width: '',
          height: ''
        }
      };
      dynamicViewOverlayService.getParentOverlayWrapper.and.returnValue(
        overlayWrapperMock
      );
      spyOn(angular, 'isDefined').and.returnValue(true);
    })
  );

  beforeEach(function() {
    $scope = $rootScope.$new();
    $compile('<object-inspector></object-inspector>')($scope);
    $scope.$digest();

    elementScope = $scope.$$childTail;
  });

  it('should call baseEventHandler.suppressAnyKeyPress on suppressKeyPress', function() {
    elementScope.suppressKeyPress();
    expect(baseEventHandlerMock.suppressAnyKeyPress).toHaveBeenCalled();
  });

  it('should register guiEvents has to be removed on destroy', function() {
    expect(gz3d.gui.guiEvents.on).toHaveBeenCalledTimes(3);

    elementScope.cleanup();
    expect(gz3d.gui.guiEvents.removeListener).toHaveBeenCalledTimes(2);
  });
});
