'use strict';

describe('Services: applyForceService', function() {
  var $rootScope, element;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template

  beforeEach(module('dynamicViewOverlayModule'));
  beforeEach(module('clientLoggerServiceMock'));
  beforeEach(module('simulationInfoMock'));

  beforeEach(function() {
    var mockRosService = {
      callService: jasmine.createSpy('callService')
    };
    window.ROSLIB.Service = jasmine
      .createSpy('Service')
      .and.callFake(function() {
        return mockRosService;
      });
  });

  beforeEach(function() {
    // inject service for testing.
    inject(function(_$rootScope_, $compile) {
      $rootScope = _$rootScope_;
      element = $compile('<apply-force-view></apply-force-view>')($rootScope);
      $rootScope.$digest();
    });
  });

  it(' - compile element', function() {
    $rootScope.$digest();
    expect(element).toBeDefined();
  });
});

describe('Services: applyForceService', function() {
  var applyForceService;

  var mockEvent, mockContainer, mockRosService;
  var eventDispatcherService;

  var contextMenuState,
    gz3d,
    userNavigationService,
    dynamicViewOverlayService,
    stateService;
  var DYNAMIC_VIEW_CHANNELS, STATE;

  //var mockModel = {
  //  /* eslint-disable camelcase */
  //  userData: {
  //    is_static: false
  //  },
  //  add: jasmine.createSpy('add'),
  //  remove: jasmine.createSpy('remove'),
  //  worldToLocal: jasmine
  //    .createSpy('worldToLocal')
  //    .and.returnValue(new THREE.Vector3(0, 0, 0)),
  //  quaternion: new THREE.Quaternion(0, 0, 0, 1)
  //};
  var mockModel = new THREE.Object3D();
  /* eslint-disable camelcase */
  mockModel.userData = {
    is_static: false
  };
  /* eslint-enable camelcase */

  beforeEach(module('userInteractionModule'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('roslibMock'));
  beforeEach(module('contextMenuStateMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('dynamicViewModule'));
  beforeEach(module('dynamicViewOverlayServiceMock'));
  beforeEach(module('exdFrontendApp.Constants'));
  beforeEach(module('stateServiceMock'));
  beforeEach(module('userNavigationServiceMock'));
  beforeEach(module('clientLoggerServiceMock'));

  beforeEach(module('eventDispatcherModule'));

  beforeEach(
    inject(function(
      _applyForceService_,
      _contextMenuState_,
      _gz3d_,
      _eventDispatcherService_,
      _stateService_,
      _STATE_,
      _dynamicViewOverlayService_,
      _DYNAMIC_VIEW_CHANNELS_,
      _userNavigationService_
    ) {
      applyForceService = _applyForceService_;

      contextMenuState = _contextMenuState_;
      gz3d = _gz3d_;
      dynamicViewOverlayService = _dynamicViewOverlayService_;
      DYNAMIC_VIEW_CHANNELS = _DYNAMIC_VIEW_CHANNELS_;

      eventDispatcherService = _eventDispatcherService_;
      stateService = _stateService_;
      STATE = _STATE_;
      userNavigationService = _userNavigationService_;
    })
  );

  beforeEach(function() {
    mockRosService = {
      callService: jasmine.createSpy('callService')
    };
    window.ROSLIB.Service = jasmine
      .createSpy('Service')
      .and.callFake(function() {
        return mockRosService;
      });
    window.ROSLIB.ServiceRequest = jasmine.createSpy('ServiceRequest');

    mockEvent = {
      stopPropagation: jasmine.createSpy('stopPropagation')
    };

    mockContainer = {};
    gz3d.scene.viewManager.mainUserView.container = mockContainer;
  });

  it('should add a working context menu item', function(done) {
    //applyForceService.initialize();

    expect(applyForceService.contextMenuItem).toBeDefined();
    expect(applyForceService.contextMenuItem.visible).toBe(false);
    expect(applyForceService.contextMenuItem.items[0].visible).toBe(false);

    // Fake open overlay view
    dynamicViewOverlayService
      .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION)
      .then.and.callFake(function(fn) {
        fn(true); // over lay view open
      });

    // show()
    /* eslint-disable camelcase */
    // only show for non-static models
    var mockModel = {
      userData: {
        is_static: true
      }
    };
    applyForceService.contextMenuItem.show(mockModel);
    expect(applyForceService.contextMenuItem.visible).toBe(false);
    expect(
      dynamicViewOverlayService.closeAllOverlaysOfType
    ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION);
    expect(applyForceService.targetModel).not.toBeDefined();
    // test with non-static model
    mockModel.userData.is_static = false;
    applyForceService.contextMenuItem.show(mockModel);
    expect(applyForceService.contextMenuItem.visible).toBe(true);
    expect(applyForceService.targetModel).toBe(mockModel);
    // check with already defined target model
    spyOn(applyForceService, 'detachGizmo').and.callThrough();
    applyForceService.contextMenuItem.show(mockModel);
    expect(applyForceService.detachGizmo).toHaveBeenCalled();
    /* eslint-enable camelcase */

    // hide()
    applyForceService.contextMenuItem.hide();
    expect(applyForceService.contextMenuItem.visible).toBe(false);

    done();
  });

  it('should enter/exit apply force mode', function(done) {
    applyForceService.targetModel = mockModel;
    spyOn(applyForceService, 'applyForceToLink').and.callThrough();
    var container = (gz3d.scene.viewManager.mainUserView.container = document.createElement(
      'div'
    ));
    spyOn(container, 'addEventListener').and.callThrough();
    spyOn(container, 'removeEventListener').and.callThrough();

    applyForceService.initialize();

    applyForceService.contextMenuItem.items[0].callback(mockEvent);

    // entered apply force mode, added event listeners
    expect(contextMenuState.hideMenu).toHaveBeenCalled();
    expect(applyForceService.domElementPointerBindings).toBe(container);
    expect(container.addEventListener).toHaveBeenCalled();

    // Fake open overlay view and button click
    dynamicViewOverlayService
      .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION)
      .then.and.callFake(function(fn) {
        fn(false); // over lay view open
      });
    var mockIntersection = {
      link: {},
      intersection: {
        point: new THREE.Vector3(2, 2, 2)
      }
    };
    spyOn(applyForceService, 'getLinkRayCastIntersection').and.returnValue(
      mockIntersection
    );
    // clicked and released mouse 0 button, apply force called and event listeners removed
    eventDispatcherService.triggerMouseEvent(container, 'click', 0, 0, 0);
    applyForceService.OnApplyForce(); // fake that overlay button was pressed

    expect(applyForceService.applyForceToLink).toHaveBeenCalled();
    expect(container.removeEventListener).toHaveBeenCalled();

    done();
  });

  it('should exit force mode on cancel', function(done) {
    applyForceService.targetModel = mockModel;

    spyOn(applyForceService, 'applyForceToLink').and.callThrough();
    var container = (gz3d.scene.viewManager.mainUserView.container = document.createElement(
      'div'
    ));
    spyOn(container, 'addEventListener').and.callThrough();
    spyOn(container, 'removeEventListener').and.callThrough();

    applyForceService.initialize();

    applyForceService.contextMenuItem.items[0].callback(mockEvent);

    // entered apply force mode, added event listeners
    expect(contextMenuState.hideMenu).toHaveBeenCalled();
    expect(applyForceService.domElementPointerBindings).toBe(container);
    expect(container.addEventListener).toHaveBeenCalled();

    // Fake open overlay view and button click
    dynamicViewOverlayService
      .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION)
      .then.and.callFake(function(fn) {
        fn(false); // over lay view open
      });
    // clicked and released mouse 0 button, apply force called and event listeners removed
    eventDispatcherService.triggerMouseEvent(container, 'mouseup', 0, 0, 0);

    // simulate cancel
    dynamicViewOverlayService
      .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION)
      .then.and.callFake(function(fn) {
        fn(true); // over lay view open
      });
    applyForceService.disableApplyForceMode();

    expect(
      dynamicViewOverlayService.closeAllOverlaysOfType
    ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION);
    expect(applyForceService.applyForceToLink).not.toHaveBeenCalled();
    expect(container.removeEventListener).toHaveBeenCalled();

    done();
  });

  it('should detach gizmo when attached', function(done) {
    mockModel.add(applyForceService.gizmoRoot);
    applyForceService.detachGizmo();
    expect(applyForceService.gizmoRoot.parent).toBe(null);

    done();
  });

  it('should apply force when click intersects with an object', function(done) {
    var mockIntersection = {
      link: {},
      intersection: {
        point: new THREE.Vector3(2, 2, 2)
      }
    };
    spyOn(applyForceService, 'getLinkRayCastIntersection').and.returnValue(
      mockIntersection
    );
    /*gz3d.scene.viewManager.mainUserView.camera.position = new THREE.Vector3(
      1,
      1,
      1
    );*/
    gz3d.scene.viewManager.mainUserView.camera.position.set(1, 1, 1);

    applyForceService.initialize();

    var mockMousePos = { x: 3, y: 3 };
    applyForceService.applyForceToLink(mockMousePos);

    expect(mockRosService.callService).toHaveBeenCalled();

    done();
  });

  it('should check intersected objects to be valid before applying force', function(
    done
  ) {
    var mockFalseObject = {
      parent: gz3d.scene.scene
    };
    var mockIntersections = [
      {
        object: mockFalseObject
      },
      {
        object: {
          parent: mockFalseObject
        }
      },
      {
        object: {
          parent: {},
          userData: {
            gazeboType: 'link'
          }
        }
      }
    ];

    var mockRaycaster = {
      setFromCamera: jasmine.createSpy('setFromCamera'),
      intersectObjects: jasmine.createSpy('intersectObjects')
    };
    spyOn(THREE, 'Raycaster').and.returnValue(mockRaycaster);
    gz3d.scene.viewManager.mainUserView.camera.position.set(1, 1, 1);

    applyForceService.initialize();
    applyForceService.targetModel = mockIntersections[2].object.parent;

    var mockMousePos = { x: 3, y: 3 };

    // test no valid intersections
    mockRaycaster.intersectObjects.and.returnValue([]);
    var intersectionResult = applyForceService.getLinkRayCastIntersection(
      mockMousePos
    );
    expect(intersectionResult).not.toBeDefined();

    // test with valid intersection
    mockRaycaster.intersectObjects.and.returnValue(mockIntersections);
    intersectionResult = applyForceService.getLinkRayCastIntersection(
      mockMousePos
    );
    expect(intersectionResult.link).toBe(mockIntersections[2].object);

    done();
  });

  describe('open a apply force gizmo', function() {
    var container;
    var newStateCallback;

    var mockLink;

    beforeEach(function() {
      mockLink = new THREE.Object3D();
      mockLink.parent = mockModel;
      mockLink.userData = { gazeboType: 'link' };

      container = gz3d.scene.viewManager.mainUserView.container = document.createElement(
        'div'
      );

      stateService.addStateCallback.and.callFake(function(callback) {
        newStateCallback = callback;
      });

      spyOn(container, 'addEventListener').and.callThrough();
      spyOn(container, 'removeEventListener').and.callThrough();

      applyForceService.initialize();

      applyForceService.contextMenuItem.items[0].callback(mockEvent);
    });

    it('Apply should be disabled on play', function() {
      // Fake open overlay view
      dynamicViewOverlayService
        .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION)
        .then.and.callFake(function(fn) {
          fn(true); // over lay view open
        });

      expect(stateService.addStateCallback).toHaveBeenCalled();

      newStateCallback(STATE.STARTED);

      expect(
        dynamicViewOverlayService.closeAllOverlaysOfType
      ).toHaveBeenCalledWith(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION);
    });

    it(' - onUIChangeForceVector() should update 3D gizmo', function() {
      applyForceService.targetModel = mockModel;
      var preGizmoRotation = applyForceService.gizmoRoot.quaternion.clone();
      applyForceService.forceVector.set(1, 1, 1);
      applyForceService.onUIChangeForceVector();
      expect(applyForceService.gizmoRoot.quaternion).not.toEqual(
        preGizmoRotation
      );
    });

    it(' should change the cursor when hovering the gizmo toruses', function() {
      userNavigationService.controls.enabled = true;
      applyForceService.targetModel = mockModel;
      applyForceService.domElementPointerBindings = container;

      // Fake open overlay view
      dynamicViewOverlayService
        .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION)
        .then.and.callFake(function(fn) {
          fn(false); // over lay view open
        });

      var mockIntersections = [
        // model link intersection
        {
          object: mockLink,
          point: new THREE.Vector3()
        },
        // torus intersection
        {
          object: applyForceService.gizmoToruses
        }
      ];

      var mockRaycaster = {
        setFromCamera: jasmine.createSpy('setFromCamera'),
        intersectObjects: jasmine.createSpy('intersectObjects')
      };
      spyOn(THREE, 'Raycaster').and.returnValue(mockRaycaster);
      mockRaycaster.intersectObjects.and.returnValue(mockIntersections);

      eventDispatcherService.triggerMouseEvent(container, 'click', 0, 0, 0);

      // mouse move
      eventDispatcherService.triggerMouseEvent(
        container,
        'mousemove',
        0,
        100,
        100
      );
      expect(applyForceService.domElementPointerBindings.style.cursor).toBe(
        'pointer'
      );

      // mouse off toruses
      mockIntersections.pop(); // remove torus mock intersection
      // mouse move
      eventDispatcherService.triggerMouseEvent(
        container,
        'mousemove',
        0,
        100,
        100
      );
      expect(applyForceService.domElementPointerBindings.style.cursor).toBe(
        'default'
      );
    });

    it(' should trigger a drag rotation when 3D gizmo toruses are clicked', function() {
      userNavigationService.controls.enabled = true;
      applyForceService.targetModel = mockModel;
      applyForceService.domElementPointerBindings = container;

      // Fake open overlay view
      dynamicViewOverlayService
        .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION)
        .then.and.callFake(function(fn) {
          fn(false); // over lay view open
        });

      spyOn(applyForceService, 'onUIChangeForceVector').and.callThrough();
      var mockIntersections = [
        // model link intersection
        {
          object: mockLink,
          point: new THREE.Vector3()
        },
        // torus intersection
        {
          object: applyForceService.gizmoToruses
        }
      ];

      var mockRaycaster = {
        setFromCamera: jasmine.createSpy('setFromCamera'),
        intersectObjects: jasmine.createSpy('intersectObjects')
      };
      spyOn(THREE, 'Raycaster').and.returnValue(mockRaycaster);
      mockRaycaster.intersectObjects.and.returnValue(mockIntersections);

      eventDispatcherService.triggerMouseEvent(container, 'click', 0, 0, 0);

      // mouse down
      eventDispatcherService.triggerMouseEvent(container, 'mousedown', 0, 0, 0);
      expect(userNavigationService.controls.enabled).toBe(false);

      // mouse move
      applyForceService.forceVector = new THREE.Vector3(0, 0, 1);
      var preForceVector = applyForceService.forceVector.clone();
      eventDispatcherService.triggerMouseEvent(
        container,
        'mousemove',
        0,
        100,
        100
      );
      expect(applyForceService.forceVector).not.toEqual(preForceVector);
      expect(applyForceService.onUIChangeForceVector).toHaveBeenCalled();

      // mouse up
      eventDispatcherService.triggerMouseEvent(
        container,
        'mouseup',
        0,
        100,
        100
      );
      expect(userNavigationService.controls.enabled).toBe(true);
    });

    it(' - ESC should exit mode', function() {
      spyOn(applyForceService, 'disableApplyForceMode').and.callThrough();
      spyOn(applyForceService, 'detachGizmo').and.callThrough();
      eventDispatcherService.triggerKeyEvent(
        applyForceService.domElementKeyboardBindings,
        'keyup',
        'Escape'
      );
      expect(applyForceService.disableApplyForceMode).toHaveBeenCalled();
      expect(applyForceService.detachGizmo).toHaveBeenCalled();
    });
  });
});
