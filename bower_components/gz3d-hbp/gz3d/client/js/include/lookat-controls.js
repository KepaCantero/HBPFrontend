/**
 * Look at object controls for the gz3d camera/scene.
 *
 */

/* global THREE: true */
/* global console: false */

THREE.LookatControls = function (userView)
{
  'use strict';

  var that = this;

  this.userView = userView;
  this.lookAtTarget = null;
  this.activeLook = true;
  this.minDistance = 0.25;

  // Set to false to disable this control
  this.enabled = false;
  this.keyBindingsEnabled = true;

  this.mouseDragOn = false;
  this.mousePosLast = new THREE.Vector2();
  this.mousePosCurrent = new THREE.Vector2();
  this.distanceDelta = 0;
  this.averageDistance = 0;
  this.averageZVector = 0;

  this.startTouchDistance = new THREE.Vector2();
  this.startTouchMid = new THREE.Vector2();

  this.mouseWheelSensitivity = Math.min(0.25*this.minDistance,0.25);
  this.speedUpFactor = 3.0;
  this.speedDownFactor = 0.1;

  this.shiftHold = false;
  this.altHold = false;
  this.moveForward = false;
  this.moveBackward = false;
  this.moveLeft = false;
  this.moveRight = false;
  this.moveUp = false;
  this.moveDown = false;

  this.rotateLeft = false;
  this.rotateRight = false;
  this.rotateUp = false;
  this.rotateDown = false;

  this.onMouseDown = function (event)
  {
    // HBP-NRP: The next three lines are commented since this leads to problems in chrome with respect
    // to AngularJS, also see: [NRRPLT-1992]
    //if (this.domElement !== document) {
    //  this.domElement.focus();
    //}

    $(document.activeElement).blur();

    event.preventDefault();

    if (that.activeLook)
    {
      switch (event.button)
      {
        case 0:
          that.mousePosLast.set(event.pageX, event.pageY);
          that.mousePosCurrent.copy(that.mousePosLast);
          that.mouseDragOn = true;
          break;
      }
    }
  };

  this.setLookatTarget = function (target)
  {
    this.lookAtTarget = target;

    if (this.lookAtTarget)
    {
      var bbox = new THREE.Box3().setFromObject(this.lookAtTarget);
      this.minDistance = bbox.getBoundingSphere().radius;
      if (this.minDistance === Infinity)
      {
        this.minDistance = 0.25;
      }
    }

  };

  this.onMouseUp = function (event)
  {
    event.preventDefault();

    // We do not stop the event propagation here, since there may be other
    // components sitting on top, which also may have registered a handler
    // and expect the event to be fired.
    //event.stopPropagation();

    if (that.activeLook)
    {
      switch (event.button)
      {
        case 0:
          that.mouseDragOn = false;
          break;
      }
    }
  };

  this.onMouseMove = function (event)
  {
    // only update the position, when a mouse button is pressed
    // else end the lookAround-mode
    if (event.buttons !== 0)
    {
      that.mousePosCurrent.set(event.pageX, event.pageY);
    } else
    {
      that.mouseDragOn = false;
    }
  };

  this.onMouseWheel = function (event)
  {
    var delta = Math.max(-1, Math.min(1, (-event.wheelDelta || event.detail)));
    window.lookatControls.distanceDelta += delta * window.lookatControls.mouseWheelSensitivity;
  };

  this.onTouchStart = function (event)
  {
    switch (event.touches.length)
    {
      case 1:
        // look around
        that.mousePosLast.set(event.touches[0].pageX, event.touches[0].pageY);
        that.mousePosCurrent.copy(that.mousePosLast);
        that.mouseDragOn = true;
        break;
      case 2:
        that.mouseDragOn = false;
        break;
    }
  };

  this.onTouchMove = function (event)
  {
    event.preventDefault();
    switch (event.touches.length)
    {
      case 1:
        // look around
        that.mousePosCurrent.set(event.touches[0].pageX, event.touches[0].pageY);
        break;
      case 2:
        that.mouseDragOn = false;
        break;
    }
  };

  this.onTouchEnd = function (event)
  {
    that.mouseDragOn = false;
  };

  this.onKeyDown = function (event)
  {
    if (that.keyBindingsEnabled === false || event.metaKey || event.ctrlKey)
    {
      return;
    }
    that.shiftHold = event.shiftKey;
    that.altHold = event.altKey;
    switch (event.code)
    {
      case "PageUp":
      case "KeyR":
        that.moveForward = true; break;

      case "PageDown":
      case "KeyF":
        that.moveBackward = true; break;

      case "KeyA":
        that.moveLeft = true; break;

      case "KeyD":
        that.moveRight = true; break;

      case "ArrowUp":
        that.rotateUp = true; break;

      case "ArrowLeft":
        that.rotateLeft = true; break;

      case "ArrowDown":
        that.rotateDown = true; break;

      case "ArrowRight":
        that.rotateRight = true; break;

      case "KeyW":
        that.moveUp = true; break;

      case "KeyS":
        that.moveDown = true; break;
    }

    event.preventDefault();
  };

  this.onKeyUp = function (event)
  {
    if (that.keyBindingsEnabled === false)
    {
      return;
    }
    that.shiftHold = event.shiftKey;
    that.altHold = event.altKey;
    switch (event.code)
    {

      case "PageUp":
      case "KeyR":
        that.moveForward = false; break;

      case "PageDown":
      case "KeyF":
        that.moveBackward = false; break;

      case "KeyA":
        that.moveLeft = false; break;

      case "KeyD":
        that.moveRight = false; break;

      case "ArrowUp":
        that.rotateUp = false; break;

      case "ArrowLeft":
        that.rotateLeft = false; break;

      case "ArrowDown":
        that.rotateDown = false; break;

      case "ArrowRight":
        that.rotateRight = false; break;

      case "KeyW":
        that.moveUp = false; break;

      case "KeyS":
        that.moveDown = false; break;
    }

    event.preventDefault();
  };

  this.setDistance = function (dist)
  {
    this.applyAbsDistance = dist;
  };

  this.update = function (elapsed, translationSensitivity, rotationSensitivity)
  {
    if (!elapsed)
    {
      elapsed = 0;
    }

    if (this.shiftHold)
    {
      elapsed *= this.speedUpFactor;
    }
    else if (this.altHold)
    {
      elapsed *= this.speedDownFactor;
    }

    if (!this.enabled)
    {
      if (this.mouseDragOn)
      {
        this.mouseDragOn = false;
      }
      return;
    }

    var delta = null;

    if (this.rotateLeft || this.moveLeft)
    {
      if (!delta)
      {
        delta = new THREE.Vector2(0,0);
      }
      delta.x += elapsed * 0.1;
    }

    if (this.rotateRight || this.moveRight)
    {
      if (!delta)
      {
        delta = new THREE.Vector2(0,0);
      }
      delta.x -= elapsed * 0.1;
    }

    if (this.rotateUp || this.moveForward)
    {
      if (!delta)
      {
        delta = new THREE.Vector2(0,0);
      }
      delta.y += elapsed * 0.1;
    }

    if (this.rotateDown || this.moveBackward)
    {
      if (!delta)
      {
        delta = new THREE.Vector2(0,0);
      }
      delta.y -= elapsed * 0.1;
    }

    var currentDistance;

    this.currentVector = this.userView.camera.position.clone();
    this.currentVector.sub(this.lookAtTarget.position);
    currentDistance = this.currentVector.length();
    this.currentVector.normalize();

    if (this.applyAbsDistance)
    {
      currentDistance = this.applyAbsDistance;
      this.applyAbsDistance = null;
    }

    if (this.distanceDelta)
    {
      currentDistance += this.distanceDelta * translationSensitivity;
      this.distanceDelta = 0;

      this.averageDistance = currentDistance = Math.max(Math.min(currentDistance, 20.0), this.minDistance);
    }


    if (this.moveUp)
    {
      currentDistance -= elapsed * Math.min(0.004*this.minDistance,0.004);
      currentDistance = Math.max(Math.min( currentDistance, 20.0), this.minDistance);
      this.averageDistance = currentDistance = Math.max(Math.min(currentDistance, 20.0), this.minDistance);
    }

    if (this.moveDown)
    {
      currentDistance += elapsed * Math.min(0.004*this.minDistance,0.004);
      currentDistance = Math.max(Math.min( currentDistance, 20.0), this.minDistance);
      this.averageDistance = currentDistance = Math.max(Math.min(currentDistance, 20.0), this.minDistance);
    }

    if (this.averageDistance <= 0)
    {
      this.averageDistance = currentDistance;
    }

    currentDistance = Math.min(currentDistance, this.averageDistance*1.2);


    if (this.mouseDragOn)
    {

      if (!delta)
      {
        delta = new THREE.Vector2();
      }

      delta.x = this.mousePosCurrent.x - this.mousePosLast.x;
      delta.y = this.mousePosCurrent.y - this.mousePosLast.y;

      this.mousePosLast = this.mousePosCurrent.clone();
    }

    if (delta)
    {
      this.currentVector.applyAxisAngle(new THREE.Vector3(0, 0, -1), delta.x * 0.01 * rotationSensitivity);

      this.currentVector.z += delta.y * 0.01 * rotationSensitivity;
      this.currentVector.normalize();
      this.currentVector.z = Math.max(this.currentVector.z, 0.18);
      this.currentVector.normalize();
      this.averageZVector = this.currentVector.z;
    }
    else if (this.averageZVector<=0)
    {
      this.averageZVector = this.currentVector.z;
    }

    this.currentVector.z = Math.max(this.currentVector.z, this.averageZVector*0.8);
    this.currentVector.normalize();

    var v = this.currentVector.clone();
    v.multiplyScalar(currentDistance);
    v.add(this.lookAtTarget.position);
    this.userView.camera.position.copy(v);
    this.userView.camera.lookAt(this.lookAtTarget.position);
    this.userView.camera.updateMatrixWorld();
  };

  this.onMouseDownManipulator = function (action)
  {
    that[action] = true;
  };

  this.onMouseUpManipulator = function (action)
  {
    that[action] = false;
  };

  this.attachEventListeners = function ()
  {
    var userViewDOM = this.userView.container;
    this.domElementPointerBindings = userViewDOM ? userViewDOM : document;
    this.domElementKeyboardBindings = document;

    this.domElementPointerBindings.addEventListener('contextmenu', function (event) { event.preventDefault(); }, false);
    this.domElementPointerBindings.addEventListener('mousedown', this.onMouseDown, false);
    this.domElementPointerBindings.addEventListener('mousemove', this.onMouseMove, false);
    this.domElementPointerBindings.addEventListener('mouseup', this.onMouseUp, false);
    this.domElementPointerBindings.addEventListener('touchstart', this.onTouchStart, false);
    this.domElementPointerBindings.addEventListener('touchmove', this.onTouchMove, false);
    this.domElementPointerBindings.addEventListener('touchend', this.onTouchEnd, false);

    this.domElementPointerBindings.addEventListener('mousewheel', this.onMouseWheel, false);
    this.domElementPointerBindings.addEventListener('DOMMouseScroll', this.onMouseWheel, false);

    this.domElementKeyboardBindings.addEventListener('keydown', this.onKeyDown, false);
    this.domElementKeyboardBindings.addEventListener('keyup', this.onKeyUp, false);
  };

  this.detachEventListeners = function ()
  {
    if (this.domElementPointerBindings) {
      this.domElementPointerBindings.removeEventListener('contextmenu', function (event) { event.preventDefault(); }, false);
      this.domElementPointerBindings.removeEventListener('mousedown', this.onMouseDown, false);
      this.domElementPointerBindings.removeEventListener('mousemove', this.onMouseMove, false);
      this.domElementPointerBindings.removeEventListener('mouseup', this.onMouseUp, false);
      this.domElementPointerBindings.removeEventListener('touchstart', this.onTouchStart, false);
      this.domElementPointerBindings.removeEventListener('touchmove', this.onTouchMove, false);
      this.domElementPointerBindings.removeEventListener('touchend', this.onTouchEnd, false);

      this.domElementPointerBindings.removeEventListener('mousewheel', this.onMouseWheel, false);
      this.domElementPointerBindings.removeEventListener('DOMMouseScroll', this.onMouseWheel, false);
    }

    if (this.domElementKeyboardBindings) {
      this.domElementKeyboardBindings.removeEventListener('keydown', this.onKeyDown, false);
      this.domElementKeyboardBindings.removeEventListener('keyup', this.onKeyUp, false);
    }

  };

  function bind(scope, fn)
  {
    return function ()
    {
      fn.apply(scope, arguments);
    };
  }

};

THREE.LookatControls.prototype = Object.create(THREE.EventDispatcher.prototype);
