'use strict';

describe('Services: pushForceService', function() {
  var $rootScope, element;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template

  beforeEach(module('clientLoggerServiceMock'));
  beforeEach(module('gz3dMock'));
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

describe('Services: pushForceService', function() {
  var pushForceService;

  var mockContainer, mockRosService;
  var eventDispatcherService;

  var gz3d, userNavigationService, stateService;
  var STATE;

  var mockModel = new THREE.Object3D();
  mockModel.name = 'mock-model';
  /* eslint-disable camelcase */
  mockModel.userData = {
    is_static: false
  };
  /* eslint-enable camelcase */

  beforeEach(module('userInteractionModule'));
  beforeEach(module('exdFrontendApp.Constants'));
  beforeEach(module('eventDispatcherModule'));

  beforeEach(module('gz3dMock'));
  beforeEach(module('roslibMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('stateServiceMock'));
  beforeEach(module('userNavigationServiceMock'));
  beforeEach(module('clientLoggerServiceMock'));

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
  });

  beforeEach(
    inject(function(
      _pushForceService_,
      _gz3d_,
      _eventDispatcherService_,
      _stateService_,
      _STATE_,
      _userNavigationService_
    ) {
      pushForceService = _pushForceService_;

      gz3d = _gz3d_;

      eventDispatcherService = _eventDispatcherService_;
      stateService = _stateService_;
      STATE = _STATE_;
      userNavigationService = _userNavigationService_;

      mockContainer = {};
      gz3d.scene.viewManager.mainUserView.container = mockContainer;
    })
  );

  it('should enter/exit apply force mode', function(done) {
    spyOn(pushForceService, 'applyForceToLink').and.callThrough();
    var container = (gz3d.scene.viewManager.mainUserView.container = document.createElement(
      'div'
    ));
    spyOn(container, 'addEventListener').and.callThrough();
    spyOn(container, 'removeEventListener').and.callThrough();
    gz3d.scene.selectedEntity = {};

    pushForceService.initialize();
    pushForceService.setTargetModel(mockModel);
    expect(pushForceService.targetModel).toBe(mockModel);

    var mockIntersection = {
      link: {
        name: 'mockLink'
      },
      intersection: {
        point: new THREE.Vector3(2, 2, 2)
      }
    };
    gz3d.getRayCastIntersections.and.returnValue(mockIntersection.intersection);
    gz3d.getLinkFromIntersections.and.returnValue(mockIntersection);
    pushForceService.targetLink = mockIntersection.link;
    pushForceService.domElementPointerBindings = pushForceService.domElementKeyboardBindings = container;

    // clicked and released mouse 0 button, apply force called and event listeners removed
    eventDispatcherService.triggerMouseEvent(container, 'click', 0, 0, 0);
    pushForceService.OnApplyForce(); // fake that overlay button was pressed

    expect(pushForceService.applyForceToLink).toHaveBeenCalled();
    expect(container.removeEventListener).toHaveBeenCalled();

    done();
  });

  it('should exit force mode on cancel', function(done) {
    spyOn(pushForceService, 'applyForceToLink').and.callThrough();
    var container = (gz3d.scene.viewManager.mainUserView.container = document.createElement(
      'div'
    ));
    spyOn(container, 'addEventListener').and.callThrough();
    spyOn(container, 'removeEventListener').and.callThrough();

    pushForceService.initialize();
    pushForceService.setTargetModel(mockModel);
    pushForceService.enterModeApplyForce();

    // entered apply force mode, added event listeners
    expect(pushForceService.domElementPointerBindings).toBe(container);
    expect(container.addEventListener).toHaveBeenCalled();

    // clicked and released mouse 0 button, apply force called and event listeners removed
    eventDispatcherService.triggerMouseEvent(container, 'mouseup', 0, 0, 0);

    // simulate cancel
    pushForceService.disableApplyForceMode();

    expect(pushForceService.applyForceToLink).not.toHaveBeenCalled();
    expect(container.removeEventListener).toHaveBeenCalled();

    // no navigation controls should be ok too
    userNavigationService.controls = undefined;
    expect(pushForceService.disableApplyForceMode).not.toThrow();

    done();
  });

  it('should detach gizmo when attached', function(done) {
    mockModel.add(pushForceService.gizmoRoot);
    pushForceService.detachGizmo();
    expect(pushForceService.gizmoRoot.parent).toBe(null);

    done();
  });

  it('should apply force when click intersects with an object', function(done) {
    var mockIntersection = {
      link: {},
      intersection: {
        point: new THREE.Vector3(2, 2, 2)
      }
    };
    gz3d.getLinkFromIntersections.and.returnValue(mockIntersection);
    gz3d.scene.viewManager.mainUserView.camera.position.set(1, 1, 1);

    pushForceService.initialize();

    var mockMousePos = { x: 3, y: 3 };
    var dummyForceDir = new THREE.Vector3(0, 1, 0);
    pushForceService.applyForceToLink(mockMousePos, dummyForceDir);

    expect(mockRosService.callService).toHaveBeenCalled();

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

      pushForceService.initialize();
      pushForceService.setTargetModel(mockModel);
      pushForceService.enterModeApplyForce();
    });

    it('Apply should be disabled on play', function() {
      expect(stateService.addStateCallback).toHaveBeenCalled();

      newStateCallback(STATE.STARTED);
    });

    it(' - onUIChangeForceVector() should update 3D gizmo', function() {
      pushForceService.targetModel = mockModel;
      var preGizmoRotation = pushForceService.gizmoRoot.quaternion.clone();
      pushForceService.forceVector.set(1, 1, 1);
      pushForceService.onUIChangeForceVector();
      expect(pushForceService.gizmoRoot.quaternion).not.toEqual(
        preGizmoRotation
      );
    });

    it(' should change the cursor when hovering the gizmo toruses', function() {
      userNavigationService.controls.enabled = true;
      pushForceService.targetModel = mockModel;
      pushForceService.domElementPointerBindings = container;

      var mockIntersections = [
        // model link intersection
        {
          link: mockLink,
          intersection: {
            point: new THREE.Vector3()
          }
        },
        // torus intersection
        {
          object: pushForceService.gizmoToruses
        }
      ];

      var mockRaycaster = {
        setFromCamera: jasmine.createSpy('setFromCamera'),
        intersectObjects: jasmine.createSpy('intersectObjects')
      };
      spyOn(THREE, 'Raycaster').and.returnValue(mockRaycaster);
      mockRaycaster.intersectObjects.and.returnValue(mockIntersections);

      expect(pushForceService.domElementPointerBindings.style.cursor).toBe(
        'crosshair'
      );

      // mouse off toruses
      gz3d.getLinkFromIntersections.and.returnValue(mockIntersections[0]);
      eventDispatcherService.triggerMouseEvent(container, 'click', 0);
      expect(pushForceService.domElementPointerBindings.style.cursor).toBe(
        'default'
      );
    });

    it(' should trigger a drag rotation when 3D gizmo toruses are clicked', function() {
      userNavigationService.controls.enabled = true;
      pushForceService.targetModel = mockModel;
      pushForceService.domElementPointerBindings = container;

      spyOn(pushForceService, 'onUIChangeForceVector').and.callThrough();
      var mockIntersections = [
        // model link intersection
        {
          object: mockLink,
          point: new THREE.Vector3()
        },
        // torus intersection
        {
          object: pushForceService.gizmoToruses
        }
      ];
      let mockLinkIntersection = {
        link: mockLink,
        intersection: {
          point: new THREE.Vector3()
        }
      };

      var mockRaycaster = {
        setFromCamera: jasmine.createSpy('setFromCamera'),
        intersectObjects: jasmine.createSpy('intersectObjects')
      };
      spyOn(THREE, 'Raycaster').and.returnValue(mockRaycaster);
      mockRaycaster.intersectObjects.and.returnValue(mockIntersections);

      gz3d.getLinkFromIntersections.and.returnValue(mockLinkIntersection);
      eventDispatcherService.triggerMouseEvent(container, 'click', 0);

      // mouse down
      gz3d.getRayCastIntersections.and.returnValue(mockIntersections);
      eventDispatcherService.triggerMouseEvent(container, 'mousedown', 0);
      expect(userNavigationService.controls.enabled).toBe(false);

      // mouse move
      pushForceService.forceVector = new THREE.Vector3(0, 0, 1);
      var preForceVector = pushForceService.forceVector.clone();
      eventDispatcherService.triggerMouseEvent(
        container,
        'mousemove',
        0,
        100,
        100
      );
      expect(pushForceService.forceVector).not.toEqual(preForceVector);
      expect(pushForceService.onUIChangeForceVector).toHaveBeenCalled();

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
      spyOn(pushForceService, 'disableApplyForceMode').and.callThrough();
      spyOn(pushForceService, 'detachGizmo').and.callThrough();
      eventDispatcherService.triggerKeyEvent(
        pushForceService.domElementKeyboardBindings,
        'keyup',
        'Escape'
      );
      expect(pushForceService.disableApplyForceMode).toHaveBeenCalled();
      expect(pushForceService.detachGizmo).toHaveBeenCalled();
    });

    it(' - set target model on click if not defined', function() {
      /*gz3d.getLinkFromIntersections.and.returnValue(mockLinkIntersection);*/
      pushForceService.targetModel = undefined;
      let mockModel = {};
      gz3d.getRayCastModel.and.returnValue(mockModel);
      eventDispatcherService.triggerMouseEvent(container, 'click', 0);
      expect(pushForceService.targetModel).toBe(mockModel);
    });

    it(' - click without valid link intersections', function() {
      spyOn(pushForceService, 'attachGizmo');

      pushForceService.targetModel = {};
      gz3d.getLinkFromIntersections.and.returnValue(undefined);
      eventDispatcherService.triggerMouseEvent(container, 'click', 0);
      expect(pushForceService.attachGizmo).not.toHaveBeenCalled();
    });
  });
});
