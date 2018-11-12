/**
 * First person controls for the gz3d camera/scene.
 * Adapted from https://threejsdoc.appspot.com/doc/three.js/src.source/extras/controls/FirstPersonControls.js.html.
 *
 * Note that there is a third parameter now, called 'domElementForKeyBindings' which specifies to which element in
 * the DOM the key strokes are bound. (Before they were automatically bound to the parameter 'domElement').
 */

/* global THREE: true */
/* global console: false */

THREE.FirstPersonControls = function(gz3d) {
  'use strict';

  this.gz3d = gz3d;
  this.camera = this.gz3d.scene.viewManager.mainUserView.camera;
  this.initialPosition = this.camera.position.clone();
  this.initialRotation = this.camera.quaternion.clone();

  this.enabled = true;
  this.input = {
    keyboard: {
      enabled: true,
      shift: false,
      alt: false
    },
    mouse: {
      enabled: true
    }
  };
  this.sensitivity = {
    translation: 1.0,
    rotation: 1.0
  };

  this.speedFactors = {
    baseKeyboardTranslation: 0.002,
    baseKeyboardRotation: 0.002,
    baseMouseRotation: 0.01,
    baseTouch: 0.01,
    baseMouseWheel: 0.25,
    shift: 3.0,
    alt: 0.1
  };

  this.target = new THREE.Vector3();

  this.azimuth = {
    current: 0.0,
    atPointerDown: 0.0
  };
  this.zenith = {
    current: 0.0,
    atPointerDown: 0.0,
    min: 0.0,
    max: Math.PI
  };

  this.moveForward = false;
  this.moveBackward = false;
  this.moveLeft = false;
  this.moveRight = false;
  this.moveUp = false;
  this.moveDown = false;
  this.initPosition = false;

  this.rotateLeft = false;
  this.rotateRight = false;
  this.rotateUp = false;
  this.rotateDown = false;
  this.initRotation = false;

  this.mouseRotate = false;
  this.touchRotate = false;
  this.pointerPos = {
    current: new THREE.Vector2(),
    atPointerDown: new THREE.Vector2()
  };

  this.startTouchDistance = new THREE.Vector2();
  this.startTouchMid = new THREE.Vector2();
  this.startCameraPosition = new THREE.Vector3();
  this.cameraLookDirection = new THREE.Vector3();

  this.onMouseDown = function(event) {
    if (!this.input.mouse.enabled) {
      return;
    }

    // HBP-NRP: The next three lines are commented since this leads to problems in chrome with respect
    // to AngularJS, also see: [NRRPLT-1992]
    //if (this.domElement !== document) {
    //  this.domElement.focus();
    //}

    $(document.activeElement).blur();

    event.preventDefault();

    switch (event.button) {
      case 0: {
        this.updateSphericalAngles();
        this.pointerPos.atPointerDown.set(event.pageX, event.pageY);
        this.pointerPos.current.copy(this.pointerPos.atPointerDown);
        this.azimuth.atPointerDown = this.azimuth.current;
        this.zenith.atPointerDown = this.zenith.current;
        this.mouseRotate = true;
        break;
      }
    }
  };

  this.onMouseUp = function(event) {
    if (!this.input.mouse.enabled) {
      return;
    }

    event.preventDefault();

    // We do not stop the event propagation here, since there may be other
    // components sitting on top, which also may have registered a handler
    // and expect the event to be fired.
    //event.stopPropagation();
    switch (event.button) {
      case 0: {
        this.mouseRotate = false;
        break;
      }
    }
  };

  this.onMouseMove = function(event) {
    if (!this.input.mouse.enabled) {
      return;
    }

    // only update the position, when a mouse button is pressed
    // else end the lookAround-mode
    if (event.buttons !== 0) {
      this.pointerPos.current.set(event.pageX, event.pageY);
    } else {
      this.endLookAround();
    }
  };

  this.onMouseWheel = function(event) {
    if (!this.input.mouse.enabled) {
      return;
    }

    var delta = Math.max(-1, Math.min(1, -event.wheelDelta || event.detail));
    this.camera.translateZ(
      delta * this.speedFactors.baseMouseWheel * this.sensitivity.translation
    );
  };

  this.onTouchStart = function(event) {
    switch (event.touches.length) {
      case 1: {
        // look around
        this.updateSphericalAngles();
        this.pointerPos.atPointerDown.set(
          event.touches[0].pageX,
          event.touches[0].pageY
        );
        this.pointerPos.current.copy(this.pointerPos.atPointerDown);
        this.azimuth.atPointerDown = this.azimuth.current;
        this.zenith.atPointerDown = this.zenith.current;
        this.touchRotate = true;
        break;
      }
      case 2: {
        this.endLookAround();

        var touch1 = new THREE.Vector2(
          event.touches[0].pageX,
          event.touches[0].pageY
        );
        var touch2 = new THREE.Vector2(
          event.touches[1].pageX,
          event.touches[1].pageY
        );

        // Compute distance of both touches when they start touching the display
        this.startTouchDistance = touch1.distanceTo(touch2);

        // Compute the mid of both touches
        this.startTouchMid.addVectors(touch1, touch2).divideScalar(2.0);

        this.startCameraPosition.copy(this.camera.position);
        break;
      }
    }
  };

  this.onTouchMove = function(event) {
    event.preventDefault();
    switch (event.touches.length) {
      case 1: {
        // look around
        this.pointerPos.current.set(
          event.touches[0].pageX,
          event.touches[0].pageY
        );
        break;
      }
      case 2: {
        this.endLookAround();

        // Compute distance of both touches
        var touch1 = new THREE.Vector2(
          event.touches[0].pageX,
          event.touches[0].pageY
        );
        var touch2 = new THREE.Vector2(
          event.touches[1].pageX,
          event.touches[1].pageY
        );
        var distance = touch1.distanceTo(touch2);

        // How much did the touches moved compared to the initial touch distances
        var delta = distance - this.startTouchDistance;
        var forwardDirection = new THREE.Vector3();
        var straveDirection = new THREE.Vector3();

        // Only do something when the change is above a threshold. This prevents unwanted movements
        if (Math.abs(delta) >= 10) {
          forwardDirection = this.cameraLookDirection
            .clone()
            .setLength((delta - 10) * this.speedFactors.baseTouch);
        }

        // Compute the mid of both touches
        var touchMid = new THREE.Vector2()
          .addVectors(touch1, touch2)
          .divideScalar(2.0);
        var touchMidDistance = touchMid.distanceTo(this.startTouchMid);

        // Only strave when the change is above a threshold. This prevents unwanted movements
        if (Math.abs(touchMidDistance) >= 10) {
          var touchMidDelta = new THREE.Vector2()
            .subVectors(touchMid, this.startTouchMid)
            .multiplyScalar(this.speedFactors.baseTouch);
          straveDirection
            .set(-touchMidDelta.x, touchMidDelta.y, 0.0)
            .applyQuaternion(this.camera.quaternion);
        }

        this.camera.position
          .addVectors(this.startCameraPosition, forwardDirection)
          .add(straveDirection);

        break;
      }
    }
  };

  this.onTouchEnd = function(event) {
    switch (event.touches.length) {
      case 0: {
        // look around
        this.endLookAround();
        break;
      }
      case 1: {
        // Reset the start distance
        this.startTouchDistance = new THREE.Vector2();
        this.startCameraPosition = new THREE.Vector3();
        this.startTouchMid = new THREE.Vector2();
        break;
      }
    }
  };

  this.endLookAround = function() {
    this.mouseRotate = false;
    this.touchRotate = false;
  };

  this.onKeyDown = function(event) {
    if (!this.input.keyboard.enabled || event.metaKey || event.ctrlKey) {
      return;
    }

    this.input.keyboard.shift = event.shiftKey;
    this.input.keyboard.alt = event.altKey;
    switch (event.code) {
      case 'KeyW': {
        this.moveForward = true;
        break;
      }
      case 'KeyS': {
        this.moveBackward = true;
        break;
      }
      case 'KeyA': {
        this.moveLeft = true;
        break;
      }
      case 'KeyD': {
        this.moveRight = true;
        break;
      }
      case 'ArrowUp': {
        this.rotateUp = true;
        break;
      }
      case 'ArrowLeft': {
        this.rotateLeft = true;
        break;
      }
      case 'ArrowDown': {
        this.rotateDown = true;
        break;
      }
      case 'ArrowRight': {
        this.rotateRight = true;
        break;
      }
      case 'PageUp':
      case 'KeyR': {
        this.moveUp = true;
        break;
      }
      case 'PageDown':
      case 'KeyF': {
        this.moveDown = true;
        break;
      }
    }

    event.preventDefault();
  };

  this.onKeyUp = function(event) {
    if (!this.input.keyboard.enabled) {
      return;
    }
    this.input.keyboard.shift = event.shiftKey;
    this.input.keyboard.alt = event.altKey;
    switch (event.code) {
      case 'KeyW': {
        this.moveForward = false;
        break;
      }
      case 'KeyS': {
        this.moveBackward = false;
        break;
      }
      case 'KeyA': {
        this.moveLeft = false;
        break;
      }
      case 'KeyD': {
        this.moveRight = false;
        break;
      }
      case 'ArrowUp': {
        this.rotateUp = false;
        break;
      }
      case 'ArrowLeft': {
        this.rotateLeft = false;
        break;
      }
      case 'ArrowDown': {
        this.rotateDown = false;
        break;
      }
      case 'ArrowRight': {
        this.rotateRight = false;
        break;
      }
      case 'PageUp':
      case 'KeyR': {
        this.moveUp = false;
        break;
      }
      case 'PageDown':
      case 'KeyF': {
        this.moveDown = false;
        break;
      }
    }

    event.preventDefault();
  };

  this.fpRotate = function(rightAmount, upAmount) {
    // rotate left/right
    // rotation happens around the world up axis so up remains up (no upside-down)
    //var camera = this.userView.camera;
    var q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(0.0, 0.0, 1.0), -rightAmount);
    this.camera.quaternion.multiplyQuaternions(q, this.camera.quaternion);
    // rotate up/down
    this.camera.rotateX(upAmount);
  };

  this.update = function(delta, translationSensitivity, rotationSensitivity) {
    if (!this.enabled) {
      if (this.mouseRotate || this.touchRotate) {
        this.endLookAround();
      }
      return;
    }

    if (delta === undefined) {
      delta = 1.0;
    }

    var speed = 0.0;
    var speedModifier = 1.0;

    if (this.input.keyboard.shift) {
      speedModifier = this.speedFactors.shift;
    } else if (this.input.keyboard.alt) {
      speedModifier = this.speedFactors.alt;
    }

    this.sensitivity.translation = translationSensitivity;
    this.sensitivity.rotation = rotationSensitivity;

    /* --- translation --- */
    if (this.initPosition) {
      this.camera.position.copy(this.initialPosition);
    }

    speed =
      delta *
      this.speedFactors.baseKeyboardTranslation *
      this.sensitivity.translation *
      speedModifier;

    if (this.moveForward) {
      this.camera.translateZ(-speed);
    }
    if (this.moveBackward) {
      this.camera.translateZ(speed);
    }
    if (this.moveLeft) {
      this.camera.translateX(-speed);
    }
    if (this.moveRight) {
      this.camera.translateX(speed);
    }
    if (this.moveUp) {
      this.camera.translateY(speed);
    }
    if (this.moveDown) {
      this.camera.translateY(-speed);
    }

    /* --- rotation by means of a manipulator --- */
    var keyboardRotationSpeed =
      this.speedFactors.baseKeyboardRotation *
      delta *
      this.sensitivity.rotation *
      speedModifier;
    if (this.rotateUp || this.rotateDown) {
      var sign = this.rotateUp ? 1.0 : -1.0;
      this.fpRotate(0.0, sign * keyboardRotationSpeed);
    }
    if (this.rotateRight) {
      this.fpRotate(keyboardRotationSpeed, 0.0);
    }
    if (this.rotateLeft) {
      this.fpRotate(-keyboardRotationSpeed, 0.0);
    }
    if (this.initRotation) {
      this.camera.quaternion.copy(this.initialRotation);
    }

    var actualLookSpeed = 0;
    var targetPosition, position;
    /* --- rotation by means of a mouse drag --- */
    if (this.mouseRotate) {
      actualLookSpeed =
        this.speedFactors.baseMouseRotation * this.sensitivity.rotation;

      var mouseDelta = new THREE.Vector2();
      mouseDelta.x =
        this.pointerPos.current.x - this.pointerPos.atPointerDown.x;
      mouseDelta.y =
        this.pointerPos.current.y - this.pointerPos.atPointerDown.y;

      this.azimuth.current =
        this.azimuth.atPointerDown - mouseDelta.x * actualLookSpeed;
      this.azimuth.current = this.azimuth.current % (2 * Math.PI);

      this.zenith.current =
        this.zenith.atPointerDown + mouseDelta.y * actualLookSpeed;
      this.zenith.current = Math.max(
        this.zenith.min,
        Math.min(this.zenith.max, this.zenith.current)
      );

      (targetPosition = this.target), (position = this.camera.position);

      targetPosition.x =
        position.x +
        Math.sin(this.zenith.current) * Math.cos(this.azimuth.current);
      targetPosition.y =
        position.y +
        Math.sin(this.zenith.current) * Math.sin(this.azimuth.current);
      targetPosition.z = position.z + Math.cos(this.zenith.current);

      this.camera.lookAt(targetPosition);
      this.cameraLookDirection = new THREE.Vector3().subVectors(
        targetPosition,
        this.camera.position
      );
    }

    /* --- rotation by means of a touch drag --- */
    if (this.touchRotate) {
      actualLookSpeed = this.speedFactors.baseTouch * this.sensitivity.rotation;

      var touchDelta = new THREE.Vector2();
      touchDelta.x =
        this.pointerPos.current.x - this.pointerPos.atPointerDown.x;
      touchDelta.y =
        this.pointerPos.current.y - this.pointerPos.atPointerDown.y;

      this.azimuth.current =
        this.azimuth.atPointerDown + touchDelta.x * actualLookSpeed;
      this.azimuth.current = this.azimuth.current % (2 * Math.PI);

      this.zenith.current =
        this.zenith.atPointerDown - touchDelta.y * actualLookSpeed;
      this.zenith.current = Math.max(
        this.zenith.min,
        Math.min(this.zenith.max, this.zenith.current)
      );

      (targetPosition = this.target), (position = this.camera.position);

      targetPosition.x =
        position.x +
        Math.sin(this.zenith.current) * Math.cos(this.azimuth.current);
      targetPosition.y =
        position.y +
        Math.sin(this.zenith.current) * Math.sin(this.azimuth.current);
      targetPosition.z = position.z + Math.cos(this.zenith.current);

      this.camera.lookAt(targetPosition);
      this.cameraLookDirection = new THREE.Vector3().subVectors(
        targetPosition,
        this.camera.position
      );
    }

    this.camera.updateMatrixWorld(); // I need to add this to get the camera working with the new ThreeJS version
  };

  this.onMouseDownManipulator = function(action) {
    this[action] = true;
  };

  this.onMouseUpManipulator = function(action) {
    this[action] = false;
  };

  this.updateSphericalAngles = function() {
    var vecForward = new THREE.Vector3();
    vecForward.set(
      this.camera.matrix.elements[8],
      this.camera.matrix.elements[9],
      this.camera.matrix.elements[10]
    );
    vecForward.normalize();

    this.zenith.current = Math.acos(-vecForward.z);
    this.azimuth.current = Math.atan2(vecForward.y, vecForward.x) + Math.PI;
  };

  this.attachEventListeners = function() {
    var userViewDOM = this.gz3d.scene.viewManager.mainUserView.container;
    this.domElementPointerBindings = userViewDOM ? userViewDOM : document;
    this.domElementKeyboardBindings = document;

    this.domElementPointerBindings.addEventListener(
      'contextmenu',
      function(event) {
        event.preventDefault();
      },
      false
    );
    this.domElementPointerBindings.addEventListener(
      'mousedown',
      this.onMouseDown.bind(this),
      false
    );
    this.domElementPointerBindings.addEventListener(
      'mousemove',
      this.onMouseMove.bind(this),
      false
    );
    this.domElementPointerBindings.addEventListener(
      'mouseup',
      this.onMouseUp.bind(this),
      false
    );
    this.domElementPointerBindings.addEventListener(
      'touchstart',
      this.onTouchStart.bind(this),
      false
    );
    this.domElementPointerBindings.addEventListener(
      'touchmove',
      this.onTouchMove.bind(this),
      false
    );
    this.domElementPointerBindings.addEventListener(
      'touchend',
      this.onTouchEnd.bind(this),
      false
    );

    this.domElementKeyboardBindings.addEventListener(
      'keydown',
      this.onKeyDown.bind(this),
      false
    );
    this.domElementKeyboardBindings.addEventListener(
      'keyup',
      this.onKeyUp.bind(this),
      false
    );

    this.domElementPointerBindings.addEventListener(
      'mousewheel',
      this.onMouseWheel.bind(this),
      false
    );
    this.domElementPointerBindings.addEventListener(
      'DOMMouseScroll',
      this.onMouseWheel.bind(this),
      false
    );
  };

  this.detachEventListeners = function() {
    if (this.domElementPointerBindings) {
      this.domElementPointerBindings.removeEventListener(
        'contextmenu',
        function(event) {
          event.preventDefault();
        },
        false
      );
      this.domElementPointerBindings.removeEventListener(
        'mousedown',
        this.onMouseDown.bind(this),
        false
      );
      this.domElementPointerBindings.removeEventListener(
        'mousemove',
        this.onMouseMove.bind(this),
        false
      );
      this.domElementPointerBindings.removeEventListener(
        'mouseup',
        this.onMouseUp.bind(this),
        false
      );
      this.domElementPointerBindings.removeEventListener(
        'touchstart',
        this.onTouchStart.bind(this),
        false
      );
      this.domElementPointerBindings.removeEventListener(
        'touchmove',
        this.onTouchMove.bind(this),
        false
      );
      this.domElementPointerBindings.removeEventListener(
        'touchend',
        this.onTouchEnd.bind(this),
        false
      );

      this.domElementKeyboardBindings.removeEventListener(
        'keydown',
        this.onKeyDown.bind(this),
        false
      );
      this.domElementKeyboardBindings.removeEventListener(
        'keyup',
        this.onKeyUp.bind(this),
        false
      );

      this.domElementPointerBindings.removeEventListener(
        'mousewheel',
        this.onMouseWheel.bind(this),
        false
      );
      this.domElementPointerBindings.removeEventListener(
        'DOMMouseScroll',
        this.onMouseWheel.bind(this),
        false
      );
    }
  };
};

THREE.FirstPersonControls.prototype = Object.create(
  THREE.EventDispatcher.prototype
);
