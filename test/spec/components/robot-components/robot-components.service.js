'use strict';

describe('Services: robotComponentsService', function() {
  var robotComponentsService;

  var gz3d, roslib;

  var mockRobot, mockCamera;
  var mockRosService,
    mockServiceSuccess,
    mockServiceSuccessResponse,
    mockServiceFailureResponse;

  beforeEach(module('robotComponentsModule'));

  beforeEach(module('gz3dMock'));
  beforeEach(module('roslibMock'));
  beforeEach(module('simulationInfoMock'));

  beforeEach(
    inject(function(_robotComponentsService_, _gz3d_, _roslib_) {
      robotComponentsService = _robotComponentsService_;

      gz3d = _gz3d_;
      roslib = _roslib_;
    })
  );

  beforeEach(function() {
    // robot in scene
    mockRobot = new THREE.Object3D();
    mockRobot.name = 'robot';
    gz3d.scene.scene.add(mockRobot);

    var mockLink1 = new THREE.Object3D();
    mockLink1.userData = {
      gazeboType: 'link'
    };
    mockRobot.add(mockLink1);

    var mockLink2 = new THREE.Object3D();
    mockLink2.userData = {
      gazeboType: 'link'
    };
    mockRobot.add(mockLink2);

    var mockSensor = new THREE.Object3D();
    mockSensor.userData = {
      gazeboType: 'sensor'
    };
    mockLink2.add(mockSensor);

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
      sensor_names_ROS: ['camera_01'],
      rostopic_sensor_urls: ['camera_01/camera_image'],
      rostopic_actuator_urls: ['actuator_01'],
      sensor_ros_message_type: ['sensor_msgs/Image']
    };
    mockServiceFailureResponse = 'default failure';
    /* eslint-enable camelcase */
    mockServiceSuccess = true;
    mockRosService = {
      callService: jasmine
        .createSpy('callService')
        .and.callFake(function(request, fnSuccess, fnFailure) {
          if (mockServiceSuccess) {
            fnSuccess(mockServiceSuccessResponse);
          } else {
            fnFailure(mockServiceFailureResponse);
          }
        })
    };
    roslib.Service.and.returnValue(mockRosService);
  });

  it(' - initialization', function() {
    spyOn(robotComponentsService, 'getRobotModelProperties');
    var mockRosWebsocket = {};
    roslib.getOrCreateConnectionTo.and.returnValue(mockRosWebsocket);

    robotComponentsService.initialize();

    // should not initialize twice
    expect(robotComponentsService.getRobotModelProperties.calls.count()).toBe(
      1
    );
    robotComponentsService.initialize();
    expect(robotComponentsService.getRobotModelProperties.calls.count()).toBe(
      1
    );

    expect(robotComponentsService.rosWebsocket).toBe(mockRosWebsocket);
    expect(robotComponentsService.rosModelPropertyService).toBeDefined();
  });

  it(' - getRobotModelProperties', function() {
    robotComponentsService.rosModelPropertyService = mockRosService;
    spyOn(robotComponentsService, 'parseRobotModelProperties');

    // success
    robotComponentsService.getRobotModelProperties();

    expect(mockRosService.callService).toHaveBeenCalled();
    expect(robotComponentsService.parseRobotModelProperties).toHaveBeenCalled();

    // failure
    mockServiceSuccess = false;
    robotComponentsService.parseRobotModelProperties.calls.reset();
    robotComponentsService.getRobotModelProperties();
    expect(
      robotComponentsService.parseRobotModelProperties
    ).not.toHaveBeenCalled();
  });

  it(' - parseRobotModelProperties', function() {
    robotComponentsService.robot = mockRobot;

    robotComponentsService.parseRobotModelProperties(
      mockServiceSuccessResponse
    );
    expect(robotComponentsService.sensors.length).toBe(1);
    expect(robotComponentsService.sensors[0]).toBe(mockCamera);
    expect(robotComponentsService.sensors[0].children[0].userData.rosType).toBe(
      'sensor_msgs.msg.Image'
    );

    expect(robotComponentsService.robotControllers).toBeDefined();
    expect(robotComponentsService.actuators.length).toBe(1);
    expect(robotComponentsService.actuators[0].userData.rosTopic).toBe(
      '/' + mockServiceSuccessResponse.rostopic_actuator_urls[0]
    );
    expect(robotComponentsService.actuators[0].parent).toBe(
      robotComponentsService.robotControllers
    );
  });

  it(' - isCameraComponentTopic', function() {
    let mockComponent = {};
    expect(
      robotComponentsService.isCameraComponentTopic(mockComponent)
    ).toBeFalsy();

    mockComponent.userData = {
      gazeboType: 'rostopic',
      rosTopic: 'mockROSTopic'
    };
    expect(
      robotComponentsService.isCameraComponentTopic(mockComponent)
    ).toBeFalsy();

    mockComponent.sensortype = 'camera';
    expect(robotComponentsService.isCameraComponentTopic(mockComponent)).toBe(
      true
    );
  });
});
