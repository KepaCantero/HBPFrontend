'use strict';

describe('Directive: golden-layout', function() {
  let $compile, $rootScope, $scope;
  let element;

  beforeEach(function() {
    module('goldenLayoutModule');

    module('goldenLayoutServiceMock');
  });

  beforeEach(
    inject(function(_$rootScope_, _$compile_) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
    })
  );

  beforeEach(function() {
    $scope = $rootScope.$new();
    element = $compile('<golden-layout></golden-layout>')($scope);
    $scope.$digest();
  });

  it(' - compilation', function() {
    expect(element).toBeDefined();
  });
});
