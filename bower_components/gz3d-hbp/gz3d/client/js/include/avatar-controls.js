/**
 * Avatar controls for the gz3d camera/scene.
 */

/* global THREE: true */
/* global console: false */

THREE.AvatarControls = function(userNavigationService, gz3d)
{
  'use strict';

  var that = this;

  this.userNavigationService = userNavigationService;

  this.gz3d = gz3d;

  // hardcoded values, should be requestable from model at some point
  this.avatarRadius = 0.15;
  this.avatarEyeHeight = 1.6;

  // Set to false to disable this control
  this.enabled = false;
  this.keyboardBindingsEnabled = true;
  this.mouseBindingsEnabled = true;

  this.lockVerticalMovement = false;

  this.MOVEMENT_SPEED = 2.5;
  this.MOUSE_ROTATION_SPEED = 0.01;
  this.KEYBOARD_ROTATION_SPEED = 0.05;
  this.SHIFT_SPEEDUP_FACTOR = 3.0;
  this.ALT_SPEEDUP_FACTOR = 0.1;
  this.TOUCH_ROTATION_SPEED = 0.01;
  this.TOUCH_MOVE_THRESHOLD = 20;

  this.lookVertical = true;
  this.thirdPerson = false;

  this.azimuth = 0.0;
  this.zenith = 0.0;
  this.zenithMin = Math.PI;
  this.zenithMax = 2*Math.PI;
  this.azimuthOnRotStart = this.azimuth;
  this.zenithOnRotStart = this.zenith;

  this.shiftHold = false;
  this.altHold = false;
  this.moveForward = false;
  this.moveBackward = false;
  this.moveLeft = false;
  this.moveRight = false;
  this.moveUp = false;
  this.moveDown = false;

  this.keyboardRotateLeft = false;
  this.keyboardRotateRight = false;
  this.keyboardRotateUp = false;
  this.keyboardRotateDown = false;

  this.freeze = false;

  this.mouseRotationEnabled = false;
  this.touchRotationEnabled = false;

  this.mousePosOnKeyDown = new THREE.Vector2();
  this.mousePosCurrent = new THREE.Vector2();

  this.singleTouchPosOnStart = new THREE.Vector2();
  this.singleTouchPosCurrent = new THREE.Vector2();
  this.doubleTouchDistanceOnStart = new THREE.Vector2();
  this.doubleTouchDistanceCurrent = new THREE.Vector2();
  this.doubleTouchMidPosOnStart = new THREE.Vector2();
  this.doubleTouchMidPosCurrent = new THREE.Vector2();

  this.cameraLookDirection = new THREE.Vector3();

  // init ROS velocity topic for avatar movement
  this.rosConnection = this.userNavigationService.roslib.getOrCreateConnectionTo(this.userNavigationService.rosbridgeWebsocketUrl);

  this.linearVelocity = new THREE.Vector3();

  this.avatarRotation = new THREE.Quaternion();

  this.init = function(avatar, camera) {
    this.avatar = avatar;
    this.camera = camera;

    // attach camera to avatar object
    this.avatar.add(this.camera);
    this.camera.position.set(0, this.avatarRadius, this.avatarEyeHeight);
    this.camera.quaternion.set(0, 0, 0, 1);
    this.camera.updateMatrixWorld();
  };

  this.createAvatarTopics = function(avatarName) {
    this.linearVelocityTopicName = '/' + avatarName + '/user_avatar_basic/body/cmd_vel';
    this.linearVelocityTopic = this.userNavigationService.roslib.createTopic(
    this.rosConnection,
    this.linearVelocityTopicName,
    'geometry_msgs/Vector3'
    );

    this.avatarRotationTopicName = '/' + avatarName + '/cmd_rot';
    this.avatarRotationTopic = this.userNavigationService.roslib.createTopic(
    this.rosConnection,
    this.avatarRotationTopicName,
    'geometry_msgs/Quaternion'
    );
  };

  this.onMouseDown = function (event) {
    // HBP-NRP: The next three lines are commented since this leads to problems in chrome with respect
    // to AngularJS, also see: [NRRPLT-1992]
    //if (this.domElementPointerBindings !== document) {
    //  this.domElementPointerBindings.focus();
    //}

    $(document.activeElement).blur();

    event.preventDefault();

    if (!that.mouseBindingsEnabled) {
      return;
    }

    switch (event.button) {
      case 0:
        that.mousePosOnKeyDown.set(event.pageX, event.pageY);
        that.mousePosCurrent.copy(that.mousePosOnKeyDown);
        that.azimuthOnRotStart = that.azimuth;
        that.zenithOnRotStart = that.zenith;
        that.mouseRotationEnabled = true;
        break;
    }
  };

  this.onMouseUp = function (event) {
    event.preventDefault();

    // We do not stop the event propagation here, since there may be other
    // components sitting on top, which also may have registered a handler
    // and expect the event to be fired.
    //event.stopPropagation();

    if (!that.mouseBindingsEnabled) {
      return;
    }

    switch (event.button) {
      case 0:
        that.mouseRotationEnabled = false;
        //that.azimuthOnRotStart = that.azimuth;
        //that.zenithOnRotStart = that.zenith;
        break;
    }
  };

  this.onMouseMove = function (event) {
    // only update the position, when a mouse button is pressed
    // else end the lookAround-mode

    if (!that.mouseBindingsEnabled) {
      return;
    }

    if (event.buttons !== 0) {
      that.mousePosCurrent.set(event.pageX, event.pageY);
    } else {
      that.endLookAround();
    }
  };

  this.onTouchStart = function (event) {
    switch (event.touches.length) {
      case 1:
        // look around
        event.preventDefault();
        event.stopPropagation();

        if (!that.mouseBindingsEnabled) {
          return;
        }

        that.singleTouchPosOnStart.set(event.touches[0].pageX, event.touches[0].pageY);
        that.singleTouchPosCurrent.copy(that.singleTouchPosOnStart);
        that.azimuthOnRotStart = that.azimuth;
        that.zenithOnRotStart = that.zenith;
        that.touchRotationEnabled = true;

        break;

      case 2:
        // move
        that.endLookAround();

        var touch1 = new THREE.Vector2(event.touches[0].pageX, event.touches[0].pageY);
        var touch2 = new THREE.Vector2(event.touches[1].pageX, event.touches[1].pageY);

        // Compute distance of both touches when they start touching the display
        that.doubleTouchDistanceOnStart = touch1.distanceTo(touch2);

        // Compute the mid of both touches
        that.doubleTouchMidPosOnStart.addVectors(touch1, touch2).divideScalar(2.0);

        break;
    }
  };

  this.onTouchMove = function (event) {
    event.preventDefault();
    switch (event.touches.length) {
      case 1:
        // look around
        that.singleTouchPosCurrent.set(event.touches[0].pageX, event.touches[0].pageY);
        break;

      case 2:
        // move
        that.endLookAround();

        // Compute distance of both touches
        var touch1 = new THREE.Vector2(event.touches[0].pageX, event.touches[0].pageY);
        var touch2 = new THREE.Vector2(event.touches[1].pageX, event.touches[1].pageY);

        //TODO: this could become relative to the magnitude of the delta later
        that.doubleTouchDistanceCurrent = touch1.distanceTo(touch2);
        var distanceDelta = that.doubleTouchDistanceCurrent - that.doubleTouchDistanceOnStart;
        // move forward / backward
        if (distanceDelta > that.TOUCH_MOVE_THRESHOLD) {
          that.moveForward = true;
        } else if (distanceDelta < -that.TOUCH_MOVE_THRESHOLD) {
          that.moveBackward = true;
        } else {
          that.moveForward = false;
          that.moveBackward = false;
        }

        that.doubleTouchMidPosCurrent.addVectors(touch1, touch2).divideScalar(2.0);
        var posDelta = new THREE.Vector2().sub(that.doubleTouchMidPosCurrent, that.doubleTouchMidPosOnStart);
        // move up / down
        if (posDelta.y > that.TOUCH_MOVE_THRESHOLD) {
          that.moveDown = true;
        } else if (posDelta.y < -that.TOUCH_MOVE_THRESHOLD) {
          that.moveUp = true;
        } else {
          that.moveUp = false;
          that.moveDown = false;
        }
        // move right / left
        if (posDelta.x > that.TOUCH_MOVE_THRESHOLD) {
          that.moveLeft = true;
        } else if (posDelta.x < -that.TOUCH_MOVE_THRESHOLD) {
          that.moveRight = true;
        } else {
          that.moveRight = false;
          that.moveLeft = false;
        }

        break;
    }
  };

  this.onTouchEnd = function (event) {
    switch (event.touches.length) {
      case 0:
        that.endLookAround();
        that.endMovement();
        break;
      case 1:
        // move ends, one finger still down for rotation
        that.endMovement();
        break;
    }
  };

  this.endLookAround = function() {
    this.mouseRotationEnabled = false;
    this.touchRotationEnabled = false;
    this.azimuthOnRotStart = this.azimuth;
    this.zenithOnRotStart = this.zenith;
  };

  this.endMovement = function() {
    this.moveForward = false;
    this.moveBackward = false;
    this.moveRight = false;
    this.moveLeft = false;
    this.moveUp = false;
    this.moveDown = false;
  };

  this.onKeyDown = function (event) {
    if(that.keyboardBindingsEnabled === false || event.metaKey || event.ctrlKey) {
      return;
    }
    that.shiftHold = event.shiftKey;
    that.altHold = event.altKey;
    switch(event.code) {
      case "ArrowUp":
        that.keyboardRotateUp = true; break;
      case "KeyW":
        that.moveForward = true; break;

      case "ArrowLeft":
        that.keyboardRotateLeft = true; break;
      case "KeyA":
        that.moveLeft = true; break;

      case "ArrowDown":
        that.keyboardRotateDown = true; break;
      case "KeyS":
        that.moveBackward = true; break;

      case "ArrowRight":
        that.keyboardRotateRight = true; break;
      case "KeyD":
        that.moveRight = true; break;

      case "PageUp":
      case "KeyR":
        that.moveUp = true; break;

      case "PageDown":
      case "KeyF":
        that.moveDown = true; break;
    }

    event.preventDefault();
  };

  this.onKeyUp = function (event) {
    if(that.keyboardBindingsEnabled === false) {
      return;
    }
    that.shiftHold = event.shiftKey;
    that.altHold = event.altKey;
    switch(event.code) {
      case "ArrowUp":
        that.keyboardRotateUp = false; break;
      case "KeyW":
        that.moveForward = false; break;

      case "ArrowLeft":
        that.keyboardRotateLeft = false; break;
      case "KeyA":
        that.moveLeft = false; break;

      case "ArrowDown":
        that.keyboardRotateDown = false; break;
      case "KeyS":
        that.moveBackward = false; break;

      case "ArrowRight":
        that.keyboardRotateRight = false; break;
      case "KeyD":
        that.moveRight = false; break;

      case "PageUp":
      case "KeyR":
        that.moveUp = false; break;

      case "PageDown":
      case "KeyF":
        that.moveDown = false; break;

      case "KeyT":
      {
        that.thirdPerson = !that.thirdPerson;
        if (that.thirdPerson) {
          that.camera.position.set(0, -5, that.avatarEyeHeight + 1);
        } else {
          that.camera.position.set(0, that.avatarRadius, that.avatarEyeHeight);
        }
        that.camera.updateMatrixWorld();
        break;
      }
    }

    event.preventDefault();
  };

  this.keyboardRotate = function(rightAmount, upAmount) {
    // rotate left/right
    // rotation happens around the world up axis so up remains up (no upside-down)
    this.azimuth += rightAmount;
    this.zenith = Math.max(this.zenithMin, Math.min(this.zenithMax, this.zenith - upAmount));
  };

  /**
   * Applies a pose during next update
   * @param position
   * @param lookAt
   */
  this.applyPose = function(position, lookAt) {
    this.applyPosePosition = position;
    this.applyPoseLookAt = lookAt;
    this.applyPoseDuringUpdate = true;
  }

  /**
   * set pose from a position and point to look at
   * @param position THREE.Vector3 position
   * @param lookAt THREE.Vector3 point to look at (world coordinates)
   */
  this.setPose = function(position, lookAt) {
    if (!(position instanceof THREE.Vector3) || !(lookAt instanceof THREE.Vector3)) {
      return;
    }

    // update position
    var posOnGround = this.projectOntoGround(position);
    if (angular.isDefined(posOnGround)) {
      //TODO: animate "fall down"
      this.avatar.position.copy(posOnGround);
      this.avatar.updateMatrixWorld();
    }
    else {
      this.avatar.position.copy(position);
      this.avatar.updateMatrixWorld();
    }

    // update orientation
    var camWorldPosition = this.camera.getWorldPosition();
    var vecForward = new THREE.Vector3().add(lookAt).sub(camWorldPosition).normalize();
    this.updateSphericalAnglesFromForwardVector(vecForward);
  };

  /**
   * Take a point in space and project it onto a mesh below/above
   * @param position THREE.Vector3 position in space
   * @returns {*}
   */
  this.projectOntoGround = function(position) {
    var that = this;
    var isObjectPartOfAvatar = function(object) {
      var partOfAvatar = false;
      object.traverseAncestors(function(node) {
        if (node.name && node.name === that.avatar.name) {
          partOfAvatar = true;
        }
      });

      return partOfAvatar;
    };

    // check for intersection below position
    var upVector = this.camera.up.clone();
    var raycaster = new THREE.Raycaster(position, upVector.negate());
    var intersects = raycaster.intersectObjects(gz3d.scene.scene.children, true);
    for (var i=0; i < intersects.length; i=i+1) {
      // check that we hit some actual geometry and it is not our own avatar
      if (intersects[i].object instanceof THREE.Mesh && !isObjectPartOfAvatar(intersects[i].object)) {
        return intersects[i].point;
      }
    }

    // if no hits below, check if avatar can be placed above
    raycaster.set(position, upVector.negate());
    intersects = raycaster.intersectObjects(gz3d.scene.scene.children, true);
    for (var j=0; j < intersects.length; j=j+1) {
      if (intersects[i].object instanceof THREE.Mesh && !isObjectPartOfAvatar(intersects[i].object)) {
        return intersects[i].point;
      }
    }

    return undefined;
  };

  /**
   * update spherical angles by a world forward vector
   * @param vecForward
   */
  this.updateSphericalAnglesFromForwardVector = function(vecForward) {
    vecForward.normalize();

    this.azimuth = Math.atan2(vecForward.y, vecForward.x) - 0.5 * Math.PI;
    this.azimuthOnRotStart = this.azimuth;

    this.zenith = Math.max(this.zenithMin, Math.min(this.zenithMax, Math.acos(vecForward.z) + Math.PI));
    this.zenithOnRotStart = this.zenith;
  };

  this.updateSphericalAnglesFromUserInput = function(timeDelta, rotationSensitivity) {
    /* --- rotation by means of a manipulator --- */
    var speedup ;

    if (this.shiftHold) speedup = 2.0;
    else if (this.altHold) speedup = 0.3;
    else speedup = 1.0;

    var keyboardRotationSpeed = speedup * this.KEYBOARD_ROTATION_SPEED * rotationSensitivity;
    if (this.keyboardRotateUp || this.keyboardRotateDown) {
      var sign = this.keyboardRotateUp ? 1.0 : -1.0;
      this.keyboardRotate(0.0, sign * keyboardRotationSpeed);
    }
    if (this.keyboardRotateRight) {
      this.keyboardRotate(-keyboardRotationSpeed, 0.0);
    }
    if (this.keyboardRotateLeft) {
      this.keyboardRotate(keyboardRotationSpeed, 0.0);
    }

    /* --- rotation by means of a mouse drag --- */
    if (this.mouseRotationEnabled) {
      var actualLookSpeed = this.MOUSE_ROTATION_SPEED * rotationSensitivity;
      if (!this.mouseBindingsEnabled) {
        actualLookSpeed = 0;
      }

      var mouseDelta = new THREE.Vector2().subVectors(this.mousePosCurrent, this.mousePosOnKeyDown);

      this.azimuth = this.azimuthOnRotStart - mouseDelta.x * actualLookSpeed;

      // horizontally rotate the whole user object instead of only camera/"head" for now

      if (this.lookVertical) {
        this.zenith = this.zenithOnRotStart + mouseDelta.y * actualLookSpeed;
        this.zenith = Math.max(this.zenithMin, Math.min(this.zenithMax, this.zenith));
      } else {
        this.zenith = Math.PI / 2;
      }
    }

    /* --- rotation by means of touch --- */
    if (this.touchRotationEnabled) {
      var actualLookSpeed = this.TOUCH_ROTATION_SPEED * rotationSensitivity;
      if (!this.mouseBindingsEnabled) {
        actualLookSpeed = 0;
      }

      var touchDelta = new THREE.Vector2().subVectors(this.singleTouchPosCurrent, this.singleTouchPosOnStart);

      this.azimuth = this.azimuthOnRotStart + touchDelta.x * actualLookSpeed;

      // horizontally rotate the whole user object instead of only camera/"head" for now

      if (this.lookVertical) {
        this.zenith = this.zenithOnRotStart - touchDelta.y * actualLookSpeed;
        this.zenith = Math.max(this.zenithMin, Math.min(this.zenithMax, this.zenith));
      } else {
        this.zenith = Math.PI / 2;
      }
    }
  };

  /**
   * Update avatar quaternion from current azimuth
   */
  this.updateAvatarRotation = function() {
    /*if (this.azimuth > Math.PI) {
     this.azimuth -= 2 * Math.PI;
     } else if (this.azimuth < -Math.PI) {
     this.azimuth += 2 * Math.PI;
     }*/

    this.avatarRotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.azimuth);
    this.avatarRotation.normalize();
  };

  /**
   * Update avatar quaternion from current azimuth
   */
  this.publishAvatarRotation = function() {
    var rotationMsg = new ROSLIB.Message({
      x: this.avatarRotation.x,
      y: this.avatarRotation.y,
      z: this.avatarRotation.z,
      w: this.avatarRotation.w
    });

    this.avatarRotationTopic.publish(rotationMsg);
  };

  /**
   * Update camera quaternion from current azimuth and zenith
   */
  this.updateCameraRotation = function() {
    var rotation = new THREE.Quaternion();
    rotation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-1, 0, 0), this.zenith));
    this.camera.quaternion.copy(rotation);
    this.camera.updateMatrixWorld();
  };

  this.updateLinearVelocity = function(delta, translationSensitivity) {

    var speedFactor;

    if (this.shiftHold) {
      speedFactor =  this.SHIFT_SPEEDUP_FACTOR;
    }
    else if (this.altHold)
    {
      speedFactor = this.ALT_SPEEDUP_FACTOR;
    }
    else
    {
      speedFactor = 1.0;
    }

    var speed = this.MOVEMENT_SPEED * translationSensitivity * speedFactor;

    this.linearVelocity.set(0, 0, 0);
    if (this.moveForward) {
      this.linearVelocity.y = 1;
    }
    if (this.moveBackward) {
      this.linearVelocity.y = -1;
    }
    if (this.moveLeft) {
      this.linearVelocity.x = -1;
    }
    if (this.moveRight) {
      this.linearVelocity.x = 1;
    }
    if (!(this.lockVerticalMovement)) {
      if (this.moveUp) {
        this.linearVelocity.z = 1;
      }
      if (this.moveDown) {
        this.linearVelocity.z = -1;
      }
    }
    this.linearVelocity.normalize().multiplyScalar(speed);
    this.linearVelocity.applyQuaternion(this.avatar.quaternion);
  };

  this.publishLinearVelocity = function() {
    var velocityMsg = new ROSLIB.Message({
      x: this.linearVelocity.x,
      y: this.linearVelocity.y,
      z: this.linearVelocity.z
    });

    this.linearVelocityTopic.publish(velocityMsg);
  };

  /**
   * Method to be called during render cycles for updates between frames.
   * @param delta Time passed since last frame
   */
  this.update = function(delta, translationSensitivity, rotationSensitivity) {
    if (!this.enabled) {
      if (this.mouseRotationEnabled || this.touchRotationEnabled)
      {
        this.endLookAround();
      }
      return;
    }

    if (delta === undefined) {
      delta = 1.0;
    }

    if (this.applyPoseDuringUpdate) {
      this.setPose(this.applyPosePosition, this.applyPoseLookAt);
      gz3d.scene.emitter.emit('entityChanged', this.avatar);

      var vecForward = new THREE.Vector3().subVectors(this.applyPoseLookAt, this.applyPosePosition).normalize();
      this.updateSphericalAnglesFromForwardVector(vecForward);

      this.applyPoseDuringUpdate = false;
    }
    else {
      if (!this.freeze) {
        this.updateLinearVelocity(delta, translationSensitivity);
        this.publishLinearVelocity();

        this.updateSphericalAnglesFromUserInput(delta, rotationSensitivity);
      }
    }

    this.updateAvatarRotation();
    this.publishAvatarRotation();

    this.updateCameraRotation();
  };

  this.onMouseDownManipulator = function(action) {
    this[action] = true;
  };

  this.onMouseUpManipulator = function(action) {
    this[action] = false;
  };

  this.attachEventListeners = function() {
    var userViewDOM = this.gz3d.scene.viewManager.mainUserView.container;
    this.domElementPointerBindings = userViewDOM ? userViewDOM : document;
    this.domElementKeyboardBindings = document;

    this.domElementPointerBindings.addEventListener('mousedown', this.onMouseDown, false);
    this.domElementPointerBindings.addEventListener('mousemove', this.onMouseMove, false);
    this.domElementPointerBindings.addEventListener('mouseup', this.onMouseUp, false);
    this.domElementPointerBindings.addEventListener('touchstart', this.onTouchStart, false);
    this.domElementPointerBindings.addEventListener('touchmove', this.onTouchMove, false);
    this.domElementPointerBindings.addEventListener('touchend', this.onTouchEnd, false);

    this.domElementKeyboardBindings.addEventListener('keydown', this.onKeyDown, false);
    this.domElementKeyboardBindings.addEventListener('keyup',  this.onKeyUp, false);
  };

  this.detachEventListeners = function() {
    if (this.domElementPointerBindings) {
      this.domElementPointerBindings.removeEventListener('mousedown', this.onMouseDown, false);
      this.domElementPointerBindings.removeEventListener('mousemove', this.onMouseMove, false);
      this.domElementPointerBindings.removeEventListener('mouseup', this.onMouseUp, false);
      this.domElementPointerBindings.removeEventListener('touchstart', this.onTouchStart, false);
      this.domElementPointerBindings.removeEventListener('touchmove', this.onTouchMove, false);
      this.domElementPointerBindings.removeEventListener('touchend', this.onTouchEnd, false);
    }

    if (this.domElementKeyboardBindings) {
      this.domElementKeyboardBindings.removeEventListener('keydown', this.onKeyDown, false);
      this.domElementKeyboardBindings.removeEventListener('keyup', this.onKeyUp, false);
    }
  };

};

THREE.AvatarControls.prototype = Object.create(THREE.EventDispatcher.prototype);
