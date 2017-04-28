/* global THREE: false */

'use strict';

describe('Services: userNavigationService', function () {

  var userNavigationService;
  var NAVIGATION_MODES, STATE;

  var gz3d, camera, avatar, avatarControls, firstPersonControls,lookatRobotControls;
  var hbpIdentityUserDirectory, userProfile, hbpIdentityUserDirectoryPromise, simulationInfo, roslib, stateService;

  // provide mock objects
  beforeEach(module(function ($provide) {
    // gz3d mock
    var gz3dMock = {
      iface: {
        modelInfoTopic: {
          subscribe: jasmine.createSpy('subscribe')
        },
        emitter: {
          on: jasmine.createSpy('on').and.callFake(function (event, fn) {fn();})
        }
      },
      scene: {
        scene: new THREE.Scene(),
        getByName:function(){return null;},
        viewManager: {
          mainUserView: {
            camera: new THREE.PerspectiveCamera()
          }
        },
        controls: {},
        emitter: {
          emit: jasmine.createSpy('emit')
        }
      },
      gui: {
        emitter: {
          emit: jasmine.createSpy('emit')
        }
      },
      container: {},
      controls: {}
    };
    $provide.value('gz3d', gz3dMock);
    $provide.value('camera', gz3dMock.scene.viewManager.mainUserView.camera);

    // avatar mocks
    var avatarMock = new THREE.Object3D();
    $provide.value('avatar', avatarMock);

    var avatarControlsMock = {
      enabled: false,
      avatar: null,
      avatarRadius: 0.15,
      avatarEyeHeight: 1.6,
      init: jasmine.createSpy('init'),
      createAvatarTopics: jasmine.createSpy('createAvatarTopics'),
      applyPose: jasmine.createSpy('applyPose'),
      setPose: jasmine.createSpy('setPose'),
      attachEventListeners: jasmine.createSpy('attachEventListeners'),
      detachEventListeners: jasmine.createSpy('detachEventListeners')
    };
    $provide.value('avatarControls', avatarControlsMock);

    // look at robot mocks

    var lookatRobotControlsMock = {
      enabled: false,
      domElement: {
        addEventListener: jasmine.createSpy('addEventListener'),
        removeEventListener: jasmine.createSpy('removeEventListener')
      },
      attachEventListeners: jasmine.createSpy('attachEventListeners'),
      detachEventListeners: jasmine.createSpy('detachEventListeners')
    };
    $provide.value('lookatRobotControls', lookatRobotControlsMock);


    // free camera mocks
    var firstPersonControlsMock = {
      enabled: false,
      domElement: {
        addEventListener: jasmine.createSpy('addEventListener'),
        removeEventListener: jasmine.createSpy('removeEventListener')
      },
      attachEventListeners: jasmine.createSpy('attachEventListeners'),
      detachEventListeners: jasmine.createSpy('detachEventListeners')
    };
    $provide.value('firstPersonControls', firstPersonControlsMock);

    // hbpIdentityUserDirectory mock
    var userProfileMock = {
      id: 'mock_id',
      displayName: 'mock_displayname'
    };
    $provide.value('userProfile', userProfileMock);

    var hbpIdentityUserDirectoryPromiseMock = {
      //then: jasmine.createSpy('then').and.returnValue({ then: jasmine.createSpy('then')})};
      then: jasmine.createSpy('then').and.callFake(function (callback) {
        callback(userProfileMock);
      })
    };
    $provide.value('hbpIdentityUserDirectoryPromise', hbpIdentityUserDirectoryPromiseMock);

    var hbpIdentityUserDirectoryMock = {
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(hbpIdentityUserDirectoryPromiseMock)
    };
    $provide.value('hbpIdentityUserDirectory', hbpIdentityUserDirectoryMock);

    var simulationInfoMock = {
      serverConfig: {
        rosbridge: {
          websocket: 'mock_rosbridge_websocket_url'
        }
      }
    };
    $provide.value('simulationInfo', simulationInfoMock);

    var roslibMock = {};
    $provide.value('roslib', roslibMock);

    var stateServiceMock = {
      getCurrentState: jasmine.createSpy('getCurrentState').and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function (fn) { fn(); })})
    };
    $provide.value('stateService', stateServiceMock);
  }));

  beforeEach(function () {
    module('userNavigationModule');
    module('exdFrontendApp.Constants');

    // inject service for testing.
    inject(function (_userNavigationService_, _NAVIGATION_MODES_, _STATE_, _gz3d_, _camera_, _avatar_, _avatarControls_,
                     _firstPersonControls_,_lookatRobotControls_, _userProfile_, _hbpIdentityUserDirectory_,
                     _hbpIdentityUserDirectoryPromise_, _simulationInfo_, _roslib_, _stateService_) {
      userNavigationService = _userNavigationService_;
      NAVIGATION_MODES = _NAVIGATION_MODES_;
      STATE = _STATE_;
      gz3d = _gz3d_;
      hbpIdentityUserDirectory = _hbpIdentityUserDirectory_;

      camera = _camera_;
      avatar = _avatar_;
      avatarControls = _avatarControls_;
      firstPersonControls = _firstPersonControls_;
      lookatRobotControls = _lookatRobotControls_;
      userProfile = _userProfile_;
      hbpIdentityUserDirectoryPromise = _hbpIdentityUserDirectoryPromise_;
      simulationInfo = _simulationInfo_;
      roslib = _roslib_;
      stateService = _stateService_;
    });

    spyOn(THREE, 'FirstPersonControls').and.returnValue(firstPersonControls);
    spyOn(THREE, 'AvatarControls').and.returnValue(avatarControls);
    spyOn(THREE, 'LookatRobotControls').and.returnValue(lookatRobotControls);

    spyOn(gz3d.scene.scene, 'add').and.callThrough();

    spyOn(camera.position, 'set').and.callThrough();
    spyOn(camera.position, 'copy').and.callThrough();
    spyOn(camera, 'lookAt').and.callThrough();
    spyOn(camera, 'updateMatrixWorld').and.callThrough();
    spyOn(camera, 'getWorldPosition').and.callThrough();
    spyOn(camera, 'getWorldDirection').and.callThrough();

    spyOn(userNavigationService, 'removeAvatar').and.callThrough();
    spyOn(userNavigationService, 'createAvatar').and.callThrough();
    spyOn(userNavigationService, 'setModeFreeCamera').and.callThrough();
    spyOn(userNavigationService, 'setLookatRobotCamera').and.callThrough();
    spyOn(userNavigationService, 'setUserData').and.callThrough();
    spyOn(userNavigationService, 'saveCurrentPose').and.callThrough();
  });


  it(' - init()', function () {
    // check initial values
    expect(userNavigationService.avatarNameBase).toBe('user_avatar');
    expect(userNavigationService.avatarInitialized).toBe(false);
    expect(userNavigationService.avatarModelPathWithCollision).toBe('user_avatar_basic');
    expect(userNavigationService.avatarModelPathNoCollision).toBe('user_avatar_basic_no-collision');
    stateService.currentSate = STATE.STARTED;
    console.info(stateService.currentSate);

    userNavigationService.init();

    expect(userNavigationService.rosbridgeWebsocketUrl).toBe(simulationInfo.serverConfig.rosbridge.websocket);
    expect(userNavigationService.roslib).toBe(roslib);

    expect(userNavigationService.userCamera).toBe(camera);

    expect(gz3d.iface.modelInfoTopic.subscribe).toHaveBeenCalledWith(jasmine.any(Function));

    expect(hbpIdentityUserDirectory.getCurrentUser).toHaveBeenCalled();
    expect(hbpIdentityUserDirectoryPromise.then).toHaveBeenCalledWith(jasmine.any(Function));
    expect(userNavigationService.setUserData).toHaveBeenCalledWith(userProfile);
    expect(userNavigationService.avatarObjectName).toBe(userNavigationService.avatarNameBase + '_' + userProfile.id);
    expect(userNavigationService.userDisplayName).toBe(userProfile.displayName);

    expect(userNavigationService.removeAvatar).toHaveBeenCalled();

    // check free camera control settings are set as default
    expect(userNavigationService.freeCameraControls).toBe(firstPersonControls);
    expect(THREE.FirstPersonControls).toHaveBeenCalledWith(userNavigationService.userCamera, gz3d.scene.container, jasmine.any(Object));
    expect(THREE.AvatarControls).toHaveBeenCalledWith(userNavigationService, gz3d, gz3d.scene.container, jasmine.any(Object));
    expect(userNavigationService.avatarControls).toBe(avatarControls);
    expect(userNavigationService.setModeFreeCamera).toHaveBeenCalled();
    expect(userNavigationService.navigationMode).toBe(NAVIGATION_MODES.FREE_CAMERA);
    expect(userNavigationService.freeCameraControls.enabled).toBe(true);
    expect(gz3d.scene.controls).toBe(userNavigationService.freeCameraControls);
  });

  it(' - deinit()', function () {

    userNavigationService.deinit();

    expect(userNavigationService.removeAvatar).toHaveBeenCalled();
  });

  it(' - setUserData()', function () {
    userNavigationService.setUserData(userProfile);

    expect(userNavigationService.userID).toBe(userProfile.id);
    expect(userNavigationService.userReferenceROSCompliant).toBe(userProfile.id);
    expect(userNavigationService.userDisplayName).toBe(userProfile.displayName);
    expect(userNavigationService.avatarObjectName).toBe(userNavigationService.avatarNameBase + '_' + userProfile.id);

    // check with userID not fit for ROS topics
    userProfile.id = 'test-problematic*user?ID+01';
    var validROSString = 'test_problematic_user_ID_01';
    userNavigationService.setUserData(userProfile);
    expect(userNavigationService.userID.match(/([^a-zA-Z0-9]+)/gi).length).toBeGreaterThan(0);
    expect(userNavigationService.userReferenceROSCompliant).toBe(validROSString);
    expect(userNavigationService.avatarObjectName).toBe(userNavigationService.avatarNameBase + '_' + userNavigationService.userReferenceROSCompliant);
  });

  it(' - onModelInfo()', function () {
    spyOn(userNavigationService, 'initAvatar');

    var avatarName = 'avatarMock';
    userNavigationService.avatarObjectName = avatarName;
    var modelMessageMock = {
      name: avatarName
    };

    userNavigationService.navigationMode = NAVIGATION_MODES.FREE_CAMERA;
    userNavigationService.onModelInfo({});
    expect(userNavigationService.initAvatar).not.toHaveBeenCalled();

    userNavigationService.onModelInfo(modelMessageMock);
    expect(userNavigationService.initAvatar).not.toHaveBeenCalled();

    userNavigationService.navigationMode = NAVIGATION_MODES.HUMAN_BODY;
    userNavigationService.onModelInfo(modelMessageMock);
    expect(userNavigationService.initAvatar).toHaveBeenCalled();
  });

  it(' - getUserAvatar()', function () {
    spyOn(gz3d.scene.scene, 'traverse').and.callThrough();

    // test for existing avatar
    var avatarName = 'avatarMock';
    userNavigationService.avatarObjectName = avatar.name = avatarName;
    gz3d.scene.scene.add(avatar);

    var returnedAvatar = userNavigationService.getUserAvatar();

    expect(returnedAvatar).toBe(avatar);

    // test for missing scene
    gz3d.scene = undefined;
    returnedAvatar = userNavigationService.getUserAvatar();
    expect(returnedAvatar).not.toBeDefined();
  });

  it(' - createAvatar()', function () {
    userNavigationService.userCamera = camera;
    userNavigationService.currentPosition = null;
    userNavigationService.defaultPosition = new THREE.Vector3();
    userNavigationService.defaultLookAt = new THREE.Vector3();
    userNavigationService.avatarControls = avatarControls;

    var hasCollision = false;
    userNavigationService.createAvatar(hasCollision);

    expect(userNavigationService.avatarControls.avatar).toBeDefined();
    expect(userNavigationService.avatarControls.setPose).toHaveBeenCalledWith(userNavigationService.defaultPosition, userNavigationService.defaultLookAt);
    expect(gz3d.gui.emitter.emit).toHaveBeenCalledWith('entityCreated', jasmine.any(Object), userNavigationService.avatarModelPathNoCollision);

    THREE.AvatarControls.calls.reset();
    userNavigationService.currentPosition = new THREE.Vector3();
    userNavigationService.currentDirection = new THREE.Vector3();
    userNavigationService.currentLookAt = new THREE.Vector3();
    hasCollision = true;
    expect(angular.isDefined(userNavigationService.avatarControls)).toBe(true);

    userNavigationService.createAvatar(hasCollision);

    expect(THREE.AvatarControls).not.toHaveBeenCalled();
    expect(userNavigationService.avatarControls.setPose).toHaveBeenCalledWith(userNavigationService.currentPosition, userNavigationService.currentLookAt);
    expect(gz3d.gui.emitter.emit).toHaveBeenCalledWith('entityCreated', jasmine.any(Object), userNavigationService.avatarModelPathWithCollision);
  });

  it(' - initAvatar()', function () {
    spyOn(userNavigationService, 'getUserAvatar').and.callThrough();
    userNavigationService.freeCameraControls = firstPersonControls;
    userNavigationService.lookatRobotControls = lookatRobotControls;
    userNavigationService.avatarControls = avatarControls;
    userNavigationService.navigationMode = NAVIGATION_MODES.HUMAN_BODY;

    // test for missing avatar
    userNavigationService.initAvatar();
    expect(userNavigationService.avatarInitialized).toBe(false);


    // test for existing avatar
    var avatarName = 'avatarMock';
    userNavigationService.avatarObjectName = avatar.name = avatarName;
    gz3d.scene.scene.add(avatar);
    userNavigationService.userCamera = camera;

    userNavigationService.initAvatar();

    expect(userNavigationService.getUserAvatar).toHaveBeenCalled();
    expect(userNavigationService.avatarObject).toBe(avatar);
    expect(userNavigationService.freeCameraControls.enabled).toBe(false);
    expect(avatarControls.init).toHaveBeenCalledWith(avatar, camera);
    expect(avatarControls.lockVerticalMovement).toBe(true);
    expect(gz3d.scene.controls).toBe(avatarControls);
    expect(avatarControls.enabled).toBe(true);
    expect(avatarControls.attachEventListeners).toHaveBeenCalled();
    expect(userNavigationService.avatarInitialized).toBe(true);
  });

  it(' - removeAvatar()', function () {
    spyOn(userNavigationService, 'getUserAvatar').and.callThrough();
    // add avatar
    var avatarName = 'avatarMock';
    userNavigationService.avatarObjectName = avatar.name = avatarName;
    gz3d.scene.scene.add(avatar);

    userNavigationService.removeAvatar();

    expect(userNavigationService.getUserAvatar).toHaveBeenCalled();
    expect(gz3d.gui.emitter.emit).toHaveBeenCalledWith('deleteEntity', avatar);
    expect(userNavigationService.avatarInitialized).toBe(false);
  });

  it(' - setDefaultPose()', function () {
    var mockPosition = new THREE.Vector3(1,2,3);
    var mockLookAt = new THREE.Vector3(4,5,6);

    userNavigationService.setDefaultPose(mockPosition.x, mockPosition.y, mockPosition.z, mockLookAt.x, mockLookAt.y, mockLookAt.z);

    expect(userNavigationService.defaultPosition.x).toBe(1);
    expect(userNavigationService.defaultPosition.y).toBe(2);
    expect(userNavigationService.defaultPosition.z).toBe(3);
    expect(userNavigationService.defaultLookAt.x).toBe(4);
    expect(userNavigationService.defaultLookAt.y).toBe(5);
    expect(userNavigationService.defaultLookAt.z).toBe(6);
  });

  it(' - saveCurrentPose()', function () {
    // test for missing camera
    userNavigationService.saveCurrentPose();
    expect(userNavigationService.currentPosition).not.toBeDefined();
    expect(userNavigationService.currentDirection).not.toBeDefined();

    var mockPosition = new THREE.Vector3(1,2,3);
    var mockLookAt = new THREE.Vector3(4,5,6);
    camera.position.copy(mockPosition);
    camera.lookAt(mockLookAt);
    camera.updateMatrixWorld();
    var cameraWorldPosition = camera.getWorldPosition();
    var cameraWorldDirection = camera.getWorldDirection();
    camera.updateMatrixWorld.calls.reset();
    camera.getWorldPosition.calls.reset();
    camera.getWorldDirection.calls.reset();

    userNavigationService.userCamera = camera;
    userNavigationService.saveCurrentPose();

    expect(camera.updateMatrixWorld).toHaveBeenCalled();
    expect(camera.getWorldPosition).toHaveBeenCalled();
    expect(camera.getWorldDirection).toHaveBeenCalled();
    expect(userNavigationService.currentPosition.x).toBe(cameraWorldPosition.x);
    expect(userNavigationService.currentPosition.y).toBe(cameraWorldPosition.y);
    expect(userNavigationService.currentPosition.z).toBe(cameraWorldPosition.z);
    expect(userNavigationService.currentDirection.x).toBe(cameraWorldDirection.x);
    expect(userNavigationService.currentDirection.y).toBe(cameraWorldDirection.y);
    expect(userNavigationService.currentDirection.z).toBe(cameraWorldDirection.z);
  });

  it(' - setModeHumanBody()', function () {
    // test for already in HUMAN_BODY mode
    userNavigationService.navigationMode = NAVIGATION_MODES.HUMAN_BODY;

    userNavigationService.setModeHumanBody();

    expect(userNavigationService.removeAvatar).not.toHaveBeenCalled();
    expect(userNavigationService.createAvatar).not.toHaveBeenCalled();

    // test for switching modes
    userNavigationService.navigationMode = NAVIGATION_MODES.FREE_CAMERA;
    userNavigationService.freeCameraControls = firstPersonControls;
    userNavigationService.lookatRobotControls = lookatRobotControls;
    userNavigationService.avatarControls = avatarControls;
    userNavigationService.userCamera = camera;

    userNavigationService.setModeHumanBody();

    expect(userNavigationService.saveCurrentPose).toHaveBeenCalled();
    expect(gz3d.scene.scene.add).toHaveBeenCalledWith(camera);
    expect(camera.parent).toBe(gz3d.scene.scene);
    expect(userNavigationService.navigationMode).toBe(NAVIGATION_MODES.HUMAN_BODY);
    expect(userNavigationService.freeCameraControls.enabled).toBe(false);
    expect(gz3d.scene.controls).not.toBeDefined();
    expect(userNavigationService.removeAvatar).toHaveBeenCalled();
    expect(userNavigationService.createAvatar).toHaveBeenCalledWith(true);
    expect(firstPersonControls.detachEventListeners).toHaveBeenCalled();
  });

  it(' - setModeFreeCamera()', function () {
    userNavigationService.avatarControls = avatarControls;
    // test for already in FREE_CAMERA mode
    userNavigationService.navigationMode = NAVIGATION_MODES.FREE_CAMERA;

    userNavigationService.setModeFreeCamera();

    expect(userNavigationService.saveCurrentPose).not.toHaveBeenCalled();
    expect(userNavigationService.removeAvatar).not.toHaveBeenCalled();

    // test for switching modes
    userNavigationService.freeCameraControls = firstPersonControls;
    userNavigationService.userCamera = camera;
    userNavigationService.lookatRobotControls = lookatRobotControls;
    userNavigationService.navigationMode = NAVIGATION_MODES.HUMAN_BODY;
    var positionMock = new THREE.Vector3(1, 2, 3);
    userNavigationService.currentPosition = positionMock;
    var directionMock =  new THREE.Vector3(4, 5, 6);
    userNavigationService.currentDirection = directionMock;

    userNavigationService.setModeFreeCamera();

    expect(userNavigationService.navigationMode).toBe(NAVIGATION_MODES.FREE_CAMERA);
    expect(userNavigationService.saveCurrentPose).toHaveBeenCalled();
    expect(camera.parent).toBe(gz3d.scene.scene);
    expect(userNavigationService.removeAvatar).toHaveBeenCalled();
    expect(camera.position.copy).toHaveBeenCalled();
    expect(camera.updateMatrixWorld).toHaveBeenCalled();
    expect(camera.lookAt).toHaveBeenCalled();
    expect(avatarControls.detachEventListeners).toHaveBeenCalled();
    expect(firstPersonControls.attachEventListeners).toHaveBeenCalled();

    expect(userNavigationService.freeCameraControls.enabled).toBe(true);
    expect(gz3d.scene.controls).toBe(firstPersonControls);
  });

 it(' - setLookatRobotCamera()', function () {
    // test for already in LOOKAT_ROBOT mode
    userNavigationService.navigationMode = NAVIGATION_MODES.FREE_CAMERA;
    userNavigationService.lookatRobotControls = lookatRobotControls;
    userNavigationService.freeCameraControls = firstPersonControls;

    userNavigationService.setLookatRobotCamera();

    expect(userNavigationService.navigationMode).toBe(NAVIGATION_MODES.LOOKAT_ROBOT);

    expect(gz3d.scene.controls).toBe(lookatRobotControls);
  });

});
