/**
 * Look at robot controls for the gz3d camera/scene.
 *
 */

/* global THREE: true */
/* global console: false */

THREE.LookatRobotControls = function (camera, robot, domElement, domElementForKeyBindings)
{
  'use strict';

  var that = this;

  this.robot = robot;
  this.camera = camera;
  this.activeLook = true;
  this.domElement = angular.isDefined(domElement) ? domElement : document;
  this.domElementForKeyBindings = angular.isDefined(domElementForKeyBindings) ? domElementForKeyBindings : document;

  if (this.domElement !== document)
  {
    this.domElement.setAttribute('tabindex', -1);
  }

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

  this.mouseWheelSensitivity = 0.25;

  this.shiftHold = false;
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

    event.preventDefault();
    event.stopPropagation();

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
    window.lookatRobotControls.distanceDelta += delta * window.lookatRobotControls.mouseWheelSensitivity;
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
    switch (event.code)
    {
      case "KeyW":
        that.moveForward = true; break;

      case "KeyS":
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

      case "PageUp":
      case "KeyR":
        that.moveUp = true; break;

      case "PageDown":
      case "KeyF":
        that.moveDown = true; break;
    }
  };

  this.onKeyUp = function (event)
  {
    if (that.keyBindingsEnabled === false)
    {
      return;
    }
    that.shiftHold = event.shiftKey;
    switch (event.code)
    {

      case "KeyW":
        that.moveForward = false; break;

      case "KeyS":
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

      case "PageUp":
      case "KeyR":
        that.moveUp = false; break;

      case "PageDown":
      case "KeyF":
        that.moveDown = false; break;
    }
  };

  this.update = function (elapsed)
  {
    if (!elapsed)
    {
      elapsed = 0;
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

    this.currentVector = this.camera.position.clone();
    this.currentVector.sub(this.robot.position);
    currentDistance = this.currentVector.length();
    this.currentVector.normalize();

    if (this.distanceDelta)
    {
      currentDistance += this.distanceDelta;
      this.distanceDelta = 0;

      this.averageDistance = currentDistance = Math.max(Math.min(currentDistance, 20.0), 1.0);
    }

    if (this.averageDistance <= 0)
    {
      this.averageDistance = currentDistance;
    }

    currentDistance = Math.min(currentDistance, this.averageDistance*1.2);

    if (this.moveUp)
    {
      currentDistance -= elapsed *0.004;
      currentDistance = Math.max(Math.min( currentDistance, 20.0), 1.0);
    }

    if (this.moveDown)
    {
      currentDistance += elapsed *0.004;
      currentDistance = Math.max(Math.min( currentDistance, 20.0), 1.0);
    }

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
      this.currentVector.applyAxisAngle(new THREE.Vector3(0, 0, -1), delta.x * 0.01);

      this.currentVector.z += delta.y * 0.01;
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
    v.add(this.robot.position);
    this.camera.position.copy(v);
    this.camera.lookAt(this.robot.position);
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
    this.domElement.addEventListener('contextmenu', function (event) { event.preventDefault(); }, false);
    this.domElement.addEventListener('mousedown', this.onMouseDown, false);
    this.domElement.addEventListener('mousemove', this.onMouseMove, false);
    this.domElement.addEventListener('mouseup', this.onMouseUp, false);
    this.domElement.addEventListener('touchstart', this.onTouchStart, false);
    this.domElement.addEventListener('touchmove', this.onTouchMove, false);
    this.domElement.addEventListener('touchend', this.onTouchEnd, false);

    this.domElementForKeyBindings.addEventListener('keydown', this.onKeyDown, false);
    this.domElementForKeyBindings.addEventListener('keyup', this.onKeyUp, false);

    this.domElement.addEventListener('mousewheel', this.onMouseWheel, false);
    this.domElement.addEventListener('DOMMouseScroll', this.onMouseWheel, false);
  };

  this.detachEventListeners = function ()
  {
    this.domElement.removeEventListener('contextmenu', function (event) { event.preventDefault(); }, false);
    this.domElement.removeEventListener('mousedown', this.onMouseDown, false);
    this.domElement.removeEventListener('mousemove', this.onMouseMove, false);
    this.domElement.removeEventListener('mouseup', this.onMouseUp, false);
    this.domElement.removeEventListener('touchstart', this.onTouchStart, false);
    this.domElement.removeEventListener('touchmove', this.onTouchMove, false);
    this.domElement.removeEventListener('touchend', this.onTouchEnd, false);

    this.domElementForKeyBindings.removeEventListener('keydown', this.onKeyDown, false);
    this.domElementForKeyBindings.removeEventListener('keyup', this.onKeyUp, false);

    this.domElement.removeEventListener('mousewheel', this.onMouseWheel, false);
    this.domElement.removeEventListener('DOMMouseScroll', this.onMouseWheel, false);
  };

  function bind(scope, fn)
  {
    return function ()
    {
      fn.apply(scope, arguments);
    };
  }

};

THREE.LookatRobotControls.prototype = Object.create(THREE.EventDispatcher.prototype);