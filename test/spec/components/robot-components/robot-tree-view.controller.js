/* global THREE: false */

'use strict';

describe('Controller: RobotTreeViewController', function() {
  var robotTreeViewController;

  var $controller, $rootScope, $scope;
  var gz3d, roslib;

  var mockRobot, mockCamera;
  var mockServiceSuccess,
    mockServiceSuccessResponse,
    mockServiceFailureResponse;

  beforeEach(module('robotComponentsModule'));

  beforeEach(module('gz3dMock'));
  beforeEach(module('roslibMock'));
  beforeEach(module('simulationInfoMock'));

  beforeEach(
    inject(function(_$controller_, _$rootScope_, _gz3d_, _roslib_) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();

      gz3d = _gz3d_;
      roslib = _roslib_;
    })
  );

  beforeEach(function() {
    // robot in scene
    mockRobot = new THREE.Object3D();
    mockRobot.name = 'robot';
    var mockLink = new THREE.Object3D();
    mockLink.userData = {
      gazeboType: 'link'
    };
    mockRobot.add(mockLink);
    gz3d.scene.scene.add(mockRobot);

    // mock camera sensor
    mockCamera = new THREE.Object3D();
    mockCamera.name = 'my_camera';
    mockRobot.add(mockCamera);

    // ros service for robot model properties
    /* eslint-disable camelcase */
    mockServiceSuccess = true;
    mockServiceSuccessResponse = {
      sensor_names: ['default::robot::some_link::my_camera'],
      sensor_types: ['camera'],
      camera_names: ['camera_01'],
      rostopic_camera_urls: ['camera_01/camera_image']
    };
    mockServiceFailureResponse = 'default failure';
    /* eslint-enable camelcase */
    mockServiceSuccess = true;
    roslib.Service.and.returnValue({
      callService: jasmine
        .createSpy('callService')
        .and.callFake(function(request, fnSuccess, fnFailure) {
          if (mockServiceSuccess) {
            fnSuccess(mockServiceSuccessResponse);
          } else {
            fnFailure(mockServiceFailureResponse);
          }
        })
    });
  });

  beforeEach(function() {
    robotTreeViewController = $controller('RobotTreeViewController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
  });

  it(' - initialization', function() {
    expect(robotTreeViewController.robot).toBe(mockRobot);
    expect($scope.treeData).toBe(gz3d.scene.scene);
    expect($scope.treeOptions).toBeDefined();
    expect(robotTreeViewController.cameras.length).toBe(1);
    expect(robotTreeViewController.cameras[0].cameraName).toBe(
      mockServiceSuccessResponse.camera_names[0]
    );
  });

  it(' - filterThreeJSTree()', function() {
    expect($scope.filterThreeJSTree).toBeDefined();

    console.info(robotTreeViewController.robot);
    var mockNode = new THREE.Object3D();
    // an empty node
    expect($scope.filterThreeJSTree(mockNode)).toBe(false);

    // the node is the robot
    robotTreeViewController.robot = mockRobot;
    expect($scope.filterThreeJSTree(mockRobot)).toBe(true);

    // the node is a sensor
    mockNode.userData.gazeboType = 'sensor';
    expect($scope.filterThreeJSTree(mockNode)).toBe(true);

    // the node is a topic
    mockNode.userData.gazeboType = 'topic';
    expect($scope.filterThreeJSTree(mockNode)).toBe(true);

    // the node is a link belonging to the robot
    mockNode.userData.gazeboType = 'link';
    mockNode.parent = mockRobot;
    expect($scope.filterThreeJSTree(mockNode)).toBe(true);

    // the node is an info node
    mockNode.userData.gazeboType = 'info';
    mockNode.parent = mockRobot;
    expect($scope.filterThreeJSTree(mockNode)).toBe(true);

    // the node does not fit the criteria
    mockNode.userData.gazeboType = '';
    expect($scope.filterThreeJSTree(mockNode)).toBe(false);
  });
});
