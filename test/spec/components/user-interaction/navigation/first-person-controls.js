'use strict';

/* global THREE: true */

function createKeyEvent(eventType, code) {
  var event = document.createEvent('Event');
  event.code = code;
  event.shiftKey = false;
  event.initEvent(eventType, true, true);
  return event;
}

function createKeyEventWithShift(eventType, code) {
  var event = createKeyEvent(eventType, code);
  event.shiftKey = true;
  return event;
}

function createMouseEvent(eventType, button, pageX, pageY) {
  var event = document.createEvent('Event');
  event.button = button;
  // -1 means: no button was pressed
  if (button === -1) {
    event.button = 0;
    event.buttons = 0;
  }
  event.pageX = pageX;
  event.pageY = pageY;
  event.initEvent(eventType, true, true);

  return event;
}

function createZeroTouchEvent(targetElement, eventType) {
  var event = document.createEvent('Event');
  event.initEvent(eventType, true, true);
  event.touches = [];
  return event;
}

function createOneTouchEvent(targetElement, eventType, pageX, pageY) {
  var event = document.createEvent('Event');
  event.initEvent(eventType, true, true);
  event.touches = [{ pageX: pageX, pageY: pageY }];
  return event;
}

function createTwoTouchEvent(
  targetElement,
  eventType,
  pageX1,
  pageY1,
  pageX2,
  pageY2
) {
  var event = document.createEvent('Event');
  event.initEvent(eventType, true, true);
  event.touches = [
    { pageX: pageX1, pageY: pageY1 },
    { pageX: pageX2, pageY: pageY2 }
  ];
  return event;
}

function triggerKeyEvent(targetElement, eventType, code) {
  var event = createKeyEvent(eventType, code);
  targetElement.dispatchEvent(event);
}

function triggerKeyEventWithShift(targetElement, eventType, key) {
  var event = createKeyEventWithShift(eventType, key);
  targetElement.dispatchEvent(event);
}

function triggerMouseEvent(targetElement, eventType, button, x, y) {
  var event = createMouseEvent(eventType, button, x, y);
  targetElement.dispatchEvent(event);
}

function triggerZeroTouchEvent(targetElement, eventType) {
  var event = createZeroTouchEvent(targetElement, eventType);
  targetElement.dispatchEvent(event);
}

function triggerOneTouchEvent(targetElement, eventType, x, y) {
  var event = createOneTouchEvent(targetElement, eventType, x, y);
  targetElement.dispatchEvent(event);
}

function triggerTwoTouchEvent(targetElement, eventType, x1, y1, x2, y2) {
  var event = createTwoTouchEvent(targetElement, eventType, x1, y1, x2, y2);
  targetElement.dispatchEvent(event);
}

describe('FirstPersonControls', function() {
  var userView;
  var firstPersonControls;

  var gz3d;

  beforeEach(module('gz3dMock'));

  beforeEach(
    inject(function(_gz3d_) {
      gz3d = _gz3d_;
    })
  );

  beforeEach(function() {
    userView = gz3d.scene.viewManager.mainUserView;

    spyOn(userView.container, 'addEventListener').and.callThrough();
    spyOn(userView.container, 'setAttribute').and.callThrough();
    spyOn(document, 'addEventListener').and.callThrough();

    firstPersonControls = new THREE.FirstPersonControls(gz3d);
    firstPersonControls.attachEventListeners();

    spyOn(firstPersonControls, 'onKeyDown').and.callThrough();
    spyOn(firstPersonControls, 'onKeyUp').and.callThrough();
    spyOn(firstPersonControls, 'onMouseDown').and.callThrough();
    spyOn(firstPersonControls, 'onMouseUp').and.callThrough();
    spyOn(firstPersonControls, 'onMouseMove').and.callThrough();
    spyOn(firstPersonControls, 'onTouchStart').and.callThrough();
    spyOn(firstPersonControls, 'onTouchMove').and.callThrough();
    spyOn(firstPersonControls, 'onTouchEnd').and.callThrough();
  });

  it(
    'should get initialized',
    inject(function() {
      /* normal init from beforeEach */
      expect(firstPersonControls.camera).toEqual(userView.camera);
      expect(firstPersonControls.domElementPointerBindings).toEqual(
        userView.container
      );
      expect(firstPersonControls.domElementKeyboardBindings).toEqual(document);

      /* undefined element */
      userView.container = undefined;
      firstPersonControls = new THREE.FirstPersonControls(gz3d);
      firstPersonControls.attachEventListeners();
      expect(firstPersonControls.domElementPointerBindings).toEqual(document);
    })
  );

  it(
    'should register all relevant event listeners',
    inject(function() {
      expect(userView.container.addEventListener.calls.argsFor(0)[0]).toMatch(
        /contextmenu/
      );
      expect(userView.container.addEventListener.calls.argsFor(1)[0]).toMatch(
        /mousedown/
      );
      expect(userView.container.addEventListener.calls.argsFor(2)[0]).toMatch(
        /mousemove/
      );
      expect(userView.container.addEventListener.calls.argsFor(3)[0]).toMatch(
        /mouseup/
      );
      expect(userView.container.addEventListener.calls.argsFor(4)[0]).toMatch(
        /touchstart/
      );
      expect(userView.container.addEventListener.calls.argsFor(5)[0]).toMatch(
        /touchmove/
      );
      expect(userView.container.addEventListener.calls.argsFor(6)[0]).toMatch(
        /touchend/
      );
      expect(document.addEventListener.calls.argsFor(0)[0]).toMatch(/keydown/);
      expect(document.addEventListener.calls.argsFor(1)[0]).toMatch(/keyup/);
    })
  );

  it(
    's for W/A/S/D/R/F',
    inject(function() {
      triggerKeyEvent(document, 'keydown', 'KeyW');
      triggerKeyEvent(document, 'keydown', 'KeyA');
      triggerKeyEvent(document, 'keydown', 'KeyS');
      triggerKeyEvent(document, 'keydown', 'KeyD');
      triggerKeyEvent(document, 'keydown', 'KeyR');
      triggerKeyEvent(document, 'keydown', 'KeyF');

      //expect(firstPersonControls.onKeyDown.calls.count()).toEqual(7);
      expect(firstPersonControls.moveForward).toBe(true);
      expect(firstPersonControls.moveLeft).toBe(true);
      expect(firstPersonControls.moveBackward).toBe(true);
      expect(firstPersonControls.moveRight).toBe(true);
      expect(firstPersonControls.moveUp).toBe(true);
      expect(firstPersonControls.moveDown).toBe(true);

      triggerKeyEvent(document, 'keyup', 'KeyW');
      triggerKeyEvent(document, 'keyup', 'KeyA');
      triggerKeyEvent(document, 'keyup', 'KeyS');
      triggerKeyEvent(document, 'keyup', 'KeyD');
      triggerKeyEvent(document, 'keyup', 'KeyR');
      triggerKeyEvent(document, 'keyup', 'KeyF');

      expect(firstPersonControls.moveForward).toBe(false);
      expect(firstPersonControls.moveLeft).toBe(false);
      expect(firstPersonControls.moveBackward).toBe(false);
      expect(firstPersonControls.moveRight).toBe(false);
      expect(firstPersonControls.moveUp).toBe(false);
      expect(firstPersonControls.moveDown).toBe(false);
    })
  );

  it(
    'should handle key events for up/left/down/right/pageup/pagedown',
    inject(function() {
      //spyOn(firstPersonControls, 'onKeyDown').and.callThrough();

      triggerKeyEvent(document, 'keydown', 'ArrowUp');
      triggerKeyEvent(document, 'keydown', 'ArrowLeft');
      triggerKeyEvent(document, 'keydown', 'ArrowDown');
      triggerKeyEvent(document, 'keydown', 'ArrowRight');
      triggerKeyEvent(document, 'keydown', 'PageUp');
      triggerKeyEvent(document, 'keydown', 'PageDown');
      expect(firstPersonControls.input.keyboard.shift).toEqual(false);
      expect(firstPersonControls.rotateUp).toEqual(true);
      expect(firstPersonControls.rotateLeft).toEqual(true);
      expect(firstPersonControls.rotateDown).toEqual(true);
      expect(firstPersonControls.rotateRight).toEqual(true);
      expect(firstPersonControls.moveUp).toEqual(true);
      expect(firstPersonControls.moveDown).toEqual(true);

      triggerKeyEvent(document, 'keyup', 'ArrowUp');
      triggerKeyEvent(document, 'keyup', 'ArrowLeft');
      triggerKeyEvent(document, 'keyup', 'ArrowDown');
      triggerKeyEvent(document, 'keyup', 'ArrowRight');
      triggerKeyEvent(document, 'keyup', 'PageUp');
      triggerKeyEvent(document, 'keyup', 'PageDown');

      expect(firstPersonControls.rotateUp).toEqual(false);
      expect(firstPersonControls.rotateLeft).toEqual(false);
      expect(firstPersonControls.rotateDown).toEqual(false);
      expect(firstPersonControls.rotateRight).toEqual(false);
      expect(firstPersonControls.moveUp).toEqual(false);
      expect(firstPersonControls.moveDown).toEqual(false);
    })
  );

  it(
    'should handle key events for up/left/down/right/pageup/pagedown with Shift modifier',
    inject(function() {
      //spyOn(firstPersonControls, 'onKeyDown').and.callThrough();

      triggerKeyEventWithShift(document, 'keydown', 'ArrowUp');
      triggerKeyEventWithShift(document, 'keydown', 'ArrowLeft');
      triggerKeyEventWithShift(document, 'keydown', 'ArrowDown');
      triggerKeyEventWithShift(document, 'keydown', 'ArrowRight');
      triggerKeyEventWithShift(document, 'keydown', 'PageUp');
      triggerKeyEventWithShift(document, 'keydown', 'PageDown');

      expect(firstPersonControls.input.keyboard.shift).toEqual(true);
      expect(firstPersonControls.rotateUp).toEqual(true);
      expect(firstPersonControls.rotateLeft).toEqual(true);
      expect(firstPersonControls.rotateDown).toEqual(true);
      expect(firstPersonControls.rotateRight).toEqual(true);
      expect(firstPersonControls.moveUp).toEqual(true);
      expect(firstPersonControls.moveDown).toEqual(true);

      triggerKeyEvent(document, 'keyup', 'ArrowUp');
      triggerKeyEvent(document, 'keyup', 'ArrowLeft');
      triggerKeyEvent(document, 'keyup', 'ArrowDown');
      triggerKeyEvent(document, 'keyup', 'ArrowRight');
      triggerKeyEvent(document, 'keyup', 'PageUp');
      triggerKeyEvent(document, 'keyup', 'PageDown');

      expect(firstPersonControls.input.keyboard.shift).toEqual(false);
      expect(firstPersonControls.rotateUp).toEqual(false);
      expect(firstPersonControls.rotateLeft).toEqual(false);
      expect(firstPersonControls.rotateDown).toEqual(false);
      expect(firstPersonControls.rotateRight).toEqual(false);
      expect(firstPersonControls.moveUp).toEqual(false);
      expect(firstPersonControls.moveDown).toEqual(false);
    })
  );

  it(
    'should navigate faster with Shift modifier and according key pressed',
    inject(function() {
      userView.camera.position.set(0, 0, 10);
      userView.camera.lookAt(new THREE.Vector3(0, 0, 0));
      var posStart = new THREE.Vector3();

      expect(firstPersonControls.input.mouse.enabled).toBe(true);

      posStart.copy(userView.camera.position);
      firstPersonControls.moveForward = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.moveForward = false;
      var posDiffNoShift = Math.abs(userView.camera.position.z - posStart.z);

      posStart.copy(userView.camera.position);
      firstPersonControls.moveForward = true;
      firstPersonControls.input.keyboard.shift = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.moveForward = false;
      firstPersonControls.input.keyboard.shift = false;
      var posDiffWithShift = Math.abs(userView.camera.position.z - posStart.z);

      expect(posDiffWithShift / posDiffNoShift).toBeCloseTo(
        firstPersonControls.speedFactors.shift
      );
    })
  );

  it(
    'should translate according to the keys pressed',
    inject(function() {
      userView.camera.position.set(0, 0, 10);
      userView.camera.lookAt(new THREE.Vector3(0, 0, 0));
      var posStart = new THREE.Vector3(),
        posEnd = new THREE.Vector3();

      expect(firstPersonControls.input.mouse.enabled).toBe(true);

      posStart.copy(userView.camera.position);
      firstPersonControls.moveForward = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.moveForward = false;
      posEnd.copy(userView.camera.position);
      expect(posEnd.z - posStart.z < 0).toBe(true);

      posStart.copy(userView.camera.position);
      firstPersonControls.moveBackward = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.moveBackward = false;
      posEnd.copy(userView.camera.position);
      expect(posEnd.z - posStart.z > 0).toBe(true);

      posStart.copy(userView.camera.position);
      firstPersonControls.moveLeft = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.moveLeft = false;
      posEnd.copy(userView.camera.position);
      expect(posEnd.x - posStart.x < 0).toBe(true);

      posStart.copy(userView.camera.position);
      firstPersonControls.moveRight = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.moveRight = false;
      posEnd.copy(userView.camera.position);
      expect(posEnd.x - posStart.x > 0).toBe(true);

      posStart.copy(userView.camera.position);
      firstPersonControls.moveUp = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.moveUp = false;
      posEnd.copy(userView.camera.position);
      expect(posEnd.y - posStart.y > 0).toBe(true);

      posStart.copy(userView.camera.position);
      firstPersonControls.moveDown = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.moveDown = false;
      posEnd.copy(userView.camera.position);
      expect(posEnd.y - posStart.y < 0).toBe(true);
    })
  );

  it(
    'should rotate according to the inputs',
    inject(function() {
      userView.camera.position.set(0, 0, 10);
      userView.camera.lookAt(new THREE.Vector3(0, 0, 0));
      var rotStart = new THREE.Euler(),
        rotEnd = new THREE.Euler();

      expect(firstPersonControls.input.mouse.enabled).toBe(true);

      rotStart.copy(userView.camera.rotation);
      firstPersonControls.rotateUp = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.rotateUp = false;
      rotEnd.copy(userView.camera.rotation);
      expect(rotEnd.x - rotStart.x > 0).toBe(true);

      rotStart.copy(userView.camera.rotation);
      firstPersonControls.rotateDown = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.rotateDown = false;
      rotEnd.copy(userView.camera.rotation);
      expect(rotEnd.x - rotStart.x < 0).toBe(true);

      rotStart.copy(userView.camera.rotation);
      firstPersonControls.rotateRight = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.rotateRight = false;
      rotEnd.copy(userView.camera.rotation);
      expect(rotEnd.z - rotStart.z < 0).toBe(true);

      rotStart.copy(userView.camera.rotation);
      firstPersonControls.rotateLeft = true;
      firstPersonControls.update(undefined, 1, 1);
      firstPersonControls.rotateLeft = false;
      rotEnd.copy(userView.camera.rotation);
      expect(rotEnd.z - rotStart.z > 0).toBe(true);
    })
  );

  it(
    'should set direction variables accordingly',
    inject(function() {
      firstPersonControls.rotateLeft = false;
      firstPersonControls.onMouseDownManipulator('rotateLeft');
      expect(firstPersonControls.rotateLeft).toBe(true);
      firstPersonControls.onMouseUpManipulator('rotateLeft');
      expect(firstPersonControls.rotateLeft).toBe(false);
    })
  );

  it(
    'should handle mousedown events',
    inject(function() {
      spyOn(firstPersonControls, 'updateSphericalAngles').and.callThrough();

      // disabled mouse controls
      firstPersonControls.input.mouse.enabled = false;
      triggerMouseEvent(userView.container, 'mousedown', 0, 10, 20);
      expect(firstPersonControls.updateSphericalAngles).not.toHaveBeenCalled();

      // enabled mouse controls
      firstPersonControls.input.mouse.enabled = true;
      userView.camera.position.copy(new THREE.Vector3(0, 0, 0));
      userView.camera.lookAt(new THREE.Vector3(1, 0, 0));
      userView.camera.up = new THREE.Vector3(0, 0, 1);
      userView.camera.updateMatrix();

      triggerMouseEvent(userView.container, 'mousedown', 0, 10, 20);

      expect(firstPersonControls.updateSphericalAngles).toHaveBeenCalled();
      expect(firstPersonControls.azimuth.current).toEqual(Math.PI * 2);
      expect(firstPersonControls.zenith.current).toBeCloseTo(Math.PI / 2, 5);
      expect(firstPersonControls.azimuth.atPointerDown).toEqual(
        firstPersonControls.azimuth.current
      );
      expect(firstPersonControls.zenith.atPointerDown).toBeCloseTo(
        firstPersonControls.zenith.current,
        5
      );
      expect(firstPersonControls.pointerPos.atPointerDown.x).toEqual(10);
      expect(firstPersonControls.pointerPos.atPointerDown.y).toEqual(20);
      expect(firstPersonControls.mouseRotate).toEqual(true);
    })
  );

  it(
    'should handle mouseup events',
    inject(function() {
      firstPersonControls.mouseRotate = true;

      // disabled mouse
      firstPersonControls.input.mouse.enabled = false;
      triggerMouseEvent(userView.container, 'mouseup', 0, 10, 20);
      expect(firstPersonControls.mouseRotate).toEqual(true);

      // enabled mouse
      firstPersonControls.input.mouse.enabled = true;
      triggerMouseEvent(userView.container, 'mouseup', 0, 10, 20);
      expect(firstPersonControls.mouseRotate).toEqual(false);
    })
  );

  it(
    'should handle mousemove events',
    inject(function() {
      firstPersonControls.pointerPos.current.x = 0;
      firstPersonControls.pointerPos.current.y = 0;

      // disabled mouse
      firstPersonControls.input.mouse.enabled = false;
      triggerMouseEvent(userView.container, 'mousemove', 0, 10, 20);
      expect(firstPersonControls.pointerPos.current.x).toEqual(0);
      expect(firstPersonControls.pointerPos.current.y).toEqual(0);

      // enabled mouse
      firstPersonControls.input.mouse.enabled = true;
      triggerMouseEvent(userView.container, 'mousemove', 0, 10, 20);

      expect(firstPersonControls.pointerPos.current.x).toEqual(10);
      expect(firstPersonControls.pointerPos.current.y).toEqual(20);
    })
  );

  it(
    'should handle mousemove events when no button was pressed',
    inject(function() {
      firstPersonControls.pointerPos.current.x = 0;
      firstPersonControls.pointerPos.current.y = 0;

      triggerMouseEvent(userView.container, 'mousemove', -1, 10, 20);

      expect(firstPersonControls.pointerPos.current.x).toEqual(0);
      expect(firstPersonControls.pointerPos.current.y).toEqual(0);
    })
  );

  it(
    'should rotate according to mouse movement',
    inject(function() {
      userView.camera.position.copy(new THREE.Vector3(0, 0, 0));
      userView.camera.lookAt(new THREE.Vector3(1, 0, 0));
      userView.camera.up = new THREE.Vector3(0, 0, 1);
      userView.camera.updateMatrix();
      firstPersonControls.updateSphericalAngles();

      var startAzimuth = Math.PI;
      var startZenith = Math.PI / 2;
      expect(firstPersonControls.azimuth.current).toEqual(startAzimuth * 2);
      expect(firstPersonControls.zenith.current).toBeCloseTo(startZenith, 5);

      var mouseDeltaX = Math.PI / 4;
      var mouseDeltaY = Math.PI / 8;
      firstPersonControls.mouseRotate = true;
      firstPersonControls.pointerPos.atPointerDown = new THREE.Vector2(0, 0);
      firstPersonControls.pointerPos.current = new THREE.Vector2(
        mouseDeltaX,
        mouseDeltaY
      );

      firstPersonControls.update(undefined, 1, 1);

      var expectedAzimuth =
        (firstPersonControls.azimuth.atPointerDown -
          mouseDeltaX * firstPersonControls.speedFactors.baseMouseRotation) %
        (2 * Math.PI);
      expect(firstPersonControls.azimuth.current).toBeCloseTo(
        expectedAzimuth,
        5
      );
      var expectedZenith =
        firstPersonControls.zenith.atPointerDown +
        mouseDeltaY * firstPersonControls.speedFactors.baseMouseRotation;
      expect(firstPersonControls.zenith.current).toBeCloseTo(expectedZenith, 5);
    })
  );

  //#######################
  // Touch with one finger
  //#######################
  it(
    'should handle touchstart events',
    inject(function() {
      spyOn(firstPersonControls, 'updateSphericalAngles').and.callThrough();

      userView.camera.position.copy(new THREE.Vector3(0, 0, 0));
      userView.camera.lookAt(new THREE.Vector3(1, 0, 0));
      userView.camera.up = new THREE.Vector3(0, 0, 1);
      userView.camera.updateMatrix();

      triggerOneTouchEvent(userView.container, 'touchstart', 10, 20);

      expect(firstPersonControls.updateSphericalAngles).toHaveBeenCalled();
      expect(firstPersonControls.azimuth.current).toEqual(Math.PI * 2);
      expect(firstPersonControls.zenith.current).toBeCloseTo(Math.PI / 2, 5);
      expect(firstPersonControls.azimuth.atPointerDown).toEqual(
        firstPersonControls.azimuth.current
      );
      expect(firstPersonControls.zenith.atPointerDown).toBeCloseTo(
        firstPersonControls.zenith.current,
        5
      );
      expect(firstPersonControls.pointerPos.atPointerDown.x).toEqual(10);
      expect(firstPersonControls.pointerPos.atPointerDown.y).toEqual(20);
      expect(firstPersonControls.touchRotate).toEqual(true);
    })
  );

  it(
    'should handle touchend events',
    inject(function() {
      firstPersonControls.touchRotate = true;

      triggerZeroTouchEvent(userView.container, 'touchend');

      expect(firstPersonControls.touchRotate).toEqual(false);
    })
  );

  it(
    'should handle touchmove events',
    inject(function() {
      triggerOneTouchEvent(userView.container, 'touchmove', 20, 30);

      expect(firstPersonControls.pointerPos.current.x).toEqual(20);
      expect(firstPersonControls.pointerPos.current.y).toEqual(30);
    })
  );

  it(
    'should rotate according to touch movement',
    inject(function() {
      userView.camera.position.copy(new THREE.Vector3(0, 0, 0));
      userView.camera.lookAt(new THREE.Vector3(1, 0, 0));
      userView.camera.up = new THREE.Vector3(0, 0, 1);
      userView.camera.updateMatrix();

      triggerOneTouchEvent(userView.container, 'touchstart', 0, 0);

      var mouseDeltaX = Math.PI / 2;
      var mouseDeltaY = Math.PI / 4;

      triggerOneTouchEvent(
        userView.container,
        'touchmove',
        mouseDeltaX,
        mouseDeltaY
      );

      firstPersonControls.update(undefined, 1, 1);

      var expectedAzimuth =
        (Math.PI * 2 +
          mouseDeltaX * firstPersonControls.speedFactors.baseMouseRotation) %
        (2 * Math.PI);
      expect(firstPersonControls.azimuth.current).toBeCloseTo(
        expectedAzimuth,
        5
      );
      var expectedZenith =
        Math.PI / 2 -
        mouseDeltaY * firstPersonControls.speedFactors.baseMouseRotation;
      expect(firstPersonControls.zenith.current).toBeCloseTo(expectedZenith, 5);
    })
  );

  //#######################
  // Touch with two fingers
  //#######################
  it(
    'should handle touchstart events 2 touches',
    inject(function() {
      spyOn(firstPersonControls, 'updateSphericalAngles').and.callThrough();

      userView.camera.position.copy(new THREE.Vector3(0, 0, 0));
      userView.camera.lookAt(new THREE.Vector3(1, 0, 0));
      userView.camera.up = new THREE.Vector3(0, 0, 1);
      userView.camera.updateMatrix();

      firstPersonControls.touchRotate = true;

      triggerTwoTouchEvent(userView.container, 'touchstart', 10, 20, 20, 30);

      expect(firstPersonControls.touchRotate).toEqual(false);
      expect(firstPersonControls.startTouchDistance).toBeCloseTo(
        Math.sqrt(10 * 10 + 10 * 10),
        5
      );
      expect(firstPersonControls.startTouchMid).toEqual(
        new THREE.Vector2(15, 25)
      );
      expect(firstPersonControls.startCameraPosition).toEqual(
        new THREE.Vector3(0, 0, 0)
      );
    })
  );

  it(
    'should handle touchend events 2 touches',
    inject(function() {
      firstPersonControls.mouseDragOn = true;

      triggerOneTouchEvent(userView.container, 'touchend');

      expect(firstPersonControls.startTouchDistance).toEqual(
        new THREE.Vector2()
      );
      expect(firstPersonControls.startTouchMid).toEqual(new THREE.Vector2());
      expect(firstPersonControls.startCameraPosition).toEqual(
        new THREE.Vector3()
      );
    })
  );

  it(
    'should handle move forward/backward touch gesture',
    inject(function() {
      userView.camera.position.copy(new THREE.Vector3(0, 0, 0));
      userView.camera.lookAt(new THREE.Vector3(1, 0, 0));
      userView.camera.up = new THREE.Vector3(0, 0, 1);
      userView.camera.updateMatrix();
      firstPersonControls.cameraLookDirection = new THREE.Vector3(1, 0, 0);

      triggerTwoTouchEvent(
        userView.container,
        'touchstart',
        100,
        100,
        100,
        110
      );
      // Move both touches 50 pixels to each side
      triggerTwoTouchEvent(userView.container, 'touchmove', 100, 50, 100, 160);

      expect(firstPersonControls.touchRotate).toEqual(false);
      expect(userView.camera.position).toEqual(
        new THREE.Vector3(
          (100 - 10) * firstPersonControls.speedFactors.baseTouch,
          0,
          0
        )
      );
    })
  );

  it(
    'should handle move sidewards/upwards touch gesture',
    inject(function() {
      userView.camera.position.copy(new THREE.Vector3(0, 0, 0));
      userView.camera.lookAt(new THREE.Vector3(1, 0, 0));
      userView.camera.up = new THREE.Vector3(0, 0, 1);
      userView.camera.updateMatrix();
      firstPersonControls.cameraLookDirection = new THREE.Vector3(1, 0, 0);

      triggerTwoTouchEvent(
        userView.container,
        'touchstart',
        100,
        100,
        100,
        110
      );
      // Move both touches 50 pixels = 0.5m to one side
      triggerTwoTouchEvent(userView.container, 'touchmove', 100, 150, 100, 160);

      expect(firstPersonControls.touchRotate).toEqual(false);
      expect(userView.camera.position).toEqual(
        new THREE.Vector3(
          0,
          +50 * firstPersonControls.speedFactors.baseTouch,
          0
        )
      );
    })
  );

  it(
    'should ignore everything when disabled or frozen',
    inject(function() {
      userView.camera.position.set(0, -1, 0);
      userView.camera.lookAt(new THREE.Vector3(0, 0, 0));
      //firstPersonControls.mouseDragOn = true;
      firstPersonControls.pointerPos.atPointerDown = new THREE.Vector2(0, 0);
      firstPersonControls.pointerPos.current = new THREE.Vector2(
        Math.PI / 2,
        Math.PI / 4
      );
      firstPersonControls.moveForward = true;
      firstPersonControls.moveLeft = true;
      firstPersonControls.moveUp = true;

      var cameraPos = new THREE.Vector3().copy(userView.camera.position);
      var cameraQuat = new THREE.Quaternion().copy(userView.camera.quaternion);

      /* disable */
      firstPersonControls.enabled = false;
      firstPersonControls.update();

      expect(userView.camera.position.x).toEqual(cameraPos.x);
      expect(userView.camera.position.y).toEqual(cameraPos.y);
      expect(userView.camera.position.z).toEqual(cameraPos.z);
      expect(userView.camera.quaternion.x).toEqual(cameraQuat.x);
      expect(userView.camera.quaternion.y).toEqual(cameraQuat.y);
      expect(userView.camera.quaternion.z).toEqual(cameraQuat.z);
      expect(userView.camera.quaternion.w).toEqual(cameraQuat.w);
    })
  );

  it('should detach event listeners correctly', function() {
    firstPersonControls.domElementPointerBindings = {
      removeEventListener: jasmine.createSpy('removeEventListener')
    };
    firstPersonControls.detachEventListeners();
    expect(
      firstPersonControls.domElementPointerBindings.removeEventListener
    ).toHaveBeenCalled();
  });
});
