'use strict';

describe('Services: applyForceService', function() {
  var applyForceService;
  var contextMenuState, gz3d; //, roslib, simulationInfo;
  var mockEvent, mockContainer, mockRosService;

  var eventDispatcherService;

  //beforeEach(module('exdFrontendApp'));
  //beforeEach(module('exd.templates'));
  beforeEach(module('userInteractionModule'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('roslibMock'));
  beforeEach(module('contextMenuStateMock'));
  beforeEach(module('simulationInfoMock'));

  beforeEach(module('eventDispatcherModule'));

  beforeEach(
    inject(function(
      _applyForceService_,
      _contextMenuState_,
      _gz3d_,
      _eventDispatcherService_ /*,
      _roslib_,
      _simulationInfo_*/
    ) {
      applyForceService = _applyForceService_;
      contextMenuState = _contextMenuState_;
      gz3d = _gz3d_;
      //roslib = _roslib_;
      //simulationInfo = _simulationInfo_;

      eventDispatcherService = _eventDispatcherService_;
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
    applyForceService.initialize();

    expect(contextMenuState.pushItemGroup).toHaveBeenCalled();
    var contextMenuItem = contextMenuState.pushItemGroup.calls.mostRecent()
      .args[0];
    expect(contextMenuItem.visible).toBe(false);
    expect(contextMenuItem.items[0].visible).toBe(false);

    // show()
    /* eslint-disable camelcase */
    // only show for non-static models
    var mockModel = {
      userData: {
        is_static: true
      }
    };
    contextMenuItem.show(mockModel);
    expect(contextMenuItem.visible).toBe(false);
    expect(applyForceService.targetModel).not.toBeDefined();
    // test with non-static model
    mockModel.userData.is_static = false;
    contextMenuItem.show(mockModel);
    expect(contextMenuItem.visible).toBe(true);
    expect(applyForceService.targetModel).toBe(mockModel);
    /* eslint-enable camelcase */

    // hide()
    contextMenuItem.hide();
    expect(contextMenuItem.visible).toBe(false);

    done();
  });

  it('should enter/exit apply force mode', function(done) {
    spyOn(applyForceService, 'applyForceToLink').and.callThrough();
    var container = (gz3d.scene.viewManager.mainUserView.container = document.createElement(
      'div'
    ));
    console.info(container);
    spyOn(container, 'addEventListener').and.callThrough();
    spyOn(container, 'removeEventListener').and.callThrough();

    applyForceService.initialize();

    var contextMenuItem = contextMenuState.pushItemGroup.calls.mostRecent()
      .args[0];
    contextMenuItem.items[0].callback(mockEvent);

    // entered apply force mode, added event listeners
    expect(contextMenuState.hideMenu).toHaveBeenCalled();
    expect(applyForceService.domElementPointerBindings).toBe(container);
    expect(container.addEventListener).toHaveBeenCalled();

    // clicked and released mouse 0 button, apply force called and event listeners removed
    eventDispatcherService.triggerMouseEvent(container, 'mouseup', 0, 0, 0);
    expect(applyForceService.applyForceToLink).toHaveBeenCalled();
    expect(container.removeEventListener).toHaveBeenCalled();

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
    gz3d.scene.viewManager.mainUserView.camera.position = new THREE.Vector3(
      1,
      1,
      1
    );

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
    gz3d.scene.viewManager.mainUserView.camera.position = new THREE.Vector3(
      1,
      1,
      1
    );

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
});
