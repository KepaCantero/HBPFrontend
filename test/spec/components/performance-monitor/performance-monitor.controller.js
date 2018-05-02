'use strict';

describe('Directive: performance-monitor', function() {
  var $rootScope, $scope;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('performanceMonitorServiceMock'));
  beforeEach(module('exd.templates'));
  beforeEach(module('editorToolbarServiceMock'));

  var elementScope, controller;

  beforeEach(
    inject(function(_$rootScope_, $compile) {
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      $scope.visible = false;
      var element = $compile(
        '<performance-monitor ng-show="visible"></performance-monitor>'
      )($scope);
      document.createElement('div').appendChild(element[0]);
      $scope.$digest();
      elementScope = element.isolateScope();
      controller = element.controller('performanceMonitor');
    })
  );

  it('should register with the performance monitor service', function() {
    expect(
      controller.performanceMonitorService.registerClient
    ).toHaveBeenCalledWith(controller.chart);
  });

  it('should unregister with the performance monitor service', function() {
    $scope.$destroy();
    $scope.$digest();
    elementScope.$digest();
    expect(
      controller.performanceMonitorService.unregisterClient
    ).toHaveBeenCalledWith(controller.chart);
  });

  it('should retrieve the default configuration', function() {
    expect(controller.performanceMonitorService.getConfig).toHaveBeenCalled();
  });
});
