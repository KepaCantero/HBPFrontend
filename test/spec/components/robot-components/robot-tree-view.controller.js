/* global THREE: false */

'use strict';

describe('Controller: RobotTreeViewController', function() {
  var robotTreeViewController;

  var $controller, $rootScope, $scope;
  var gz3d, robotComponentsService;

  beforeEach(module('robotComponentsModule'));

  beforeEach(module('gz3dMock'));
  beforeEach(module('robotComponentsServiceMock'));

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _gz3d_,
      _robotComponentsService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();

      gz3d = _gz3d_;
      robotComponentsService = _robotComponentsService_;
    })
  );

  beforeEach(function() {
    robotTreeViewController = $controller('RobotTreeViewController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
  });

  it(' - setTreeSelection()', function() {
    gz3d.scene.robotInfoObject = {
      _labelOwner: { children: [{ userData: { gazeboType: 'rostopic' } }] }
    };

    $scope.onSelectionChange = jasmine.createSpy('onSelectionChange');
    $scope.setTreeSelection();

    expect(robotTreeViewController.selectedObject).toBe(
      gz3d.scene.robotInfoObject
    );
  });

  it(' - onNodeSelection()', function() {
    $scope.onSelectionChange = jasmine.createSpy('onSelectionChange');

    // select
    $scope.onNodeSelection({}, true);
    expect($scope.onSelectionChange.calls.count()).toBe(1);

    // deselect
    $scope.onNodeSelection({}, false);
    expect($scope.onSelectionChange.calls.count()).toBe(1);
  });

  it(' - filterThreeJSTree()', function() {
    expect($scope.filterThreeJSTree).toBeDefined();

    var mockNode = new THREE.Object3D();
    // an empty node
    expect($scope.filterThreeJSTree(mockNode)).toBe(false);

    // the node is the robot
    expect($scope.filterThreeJSTree(robotComponentsService.robot)).toBe(true);

    // the node is a sensor
    mockNode.userData.gazeboType = 'sensor';
    expect($scope.filterThreeJSTree(mockNode)).toBe(true);

    // the node is a topic
    mockNode.userData.gazeboType = 'rostopic';
    expect($scope.filterThreeJSTree(mockNode)).toBe(true);

    // the node is a link belonging to the robot
    mockNode.userData.gazeboType = 'link';
    mockNode.parent = robotComponentsService.robot;
    expect($scope.filterThreeJSTree(mockNode)).toBe(true);

    // the node is an info node
    mockNode.userData.gazeboType = 'robotComponentsTreeInfo';
    mockNode.parent = robotComponentsService.robot;
    expect($scope.filterThreeJSTree(mockNode)).toBe(true);

    // the node does not fit the criteria
    mockNode.userData.gazeboType = '';
    expect($scope.filterThreeJSTree(mockNode)).toBe(false);
  });

  it(' - check treeOptions', function() {
    var mockNode = new THREE.Object3D();
    mockNode.userData.gazeboType = 'rostopic';
    expect($scope.treeOptions.isLeaf(mockNode)).toBe(true);
  });
});
