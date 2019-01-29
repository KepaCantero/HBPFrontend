'use strict';

describe('Controller: recorder-panel', function() {
  var $rootScope, $scope;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('backendInterfaceServiceMock'));
  beforeEach(module('simulationInfoMock'));

  var controller;

  beforeEach(
    inject(function(_$rootScope_, $compile) {
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      $scope.visible = false;
      var element = $compile(
        '<recorder-panel ng-show="visible"></recorder-panel>'
      )($scope);
      document.createElement('div').appendChild(element[0]);
      $scope.$digest();
      controller = element.controller('recorderPanel');
    })
  );

  it('should link to recorderPanelService', function() {
    expect(controller.recorderPanelService).not.toBe(null);
  });
});
