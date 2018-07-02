'use strict';

describe('Directive: pullForceService', function() {
  var $rootScope, element;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template

  // load modules that are can be used without mocking them
  beforeEach(module('eventDispatcherModule'));
  beforeEach(module('userInteractionModule'));
  beforeEach(module('applyForceServiceMock'));
  beforeEach(module('pullForceServiceMock'));
  beforeEach(module('clientLoggerServiceMock'));

  beforeEach(function() {
    // inject service for testing.
    inject(function(_$rootScope_, $compile) {
      $rootScope = _$rootScope_;
      element = $compile('<pull-force></pull-force>')($rootScope);
      $rootScope.$digest();
    });
  });

  it(' - compile element', function() {
    $rootScope.$digest();
    expect(element).toBeDefined();
  });
});

describe('Services: pullForceService', function() {
  // our service that should be tested
  let myService;

  let container;
  let eventDispatcherService;
  let gz3d,
    environmentRenderingService,
    applyForceService,
    contextMenuState,
    stateService;
  let STATE;

  // load the module our service is located in
  beforeEach(module('userInteractionModule'));
  beforeEach(module('exd.templates')); // import html template
  beforeEach(module('exdFrontendApp'));

  beforeEach(module('dynamicViewOverlayModule'));
  // load mocks for all services that are used
  beforeEach(module('gz3dMock'));
  beforeEach(module('contextMenuStateServiceMock'));
  beforeEach(module('userNavigationServiceMock'));
  beforeEach(module('applyForceServiceMock'));
  beforeEach(module('environmentRenderingServiceMock'));
  beforeEach(module('dynamicViewOverlayServiceMock'));
  beforeEach(module('editorToolbarServiceMock'));
  beforeEach(module('stateServiceMock'));

  // load modules that are can be used without mocking them
  beforeEach(module('eventDispatcherModule'));

  // inject all used services
  beforeEach(
    inject(function(
      _pullForceService_,
      _gz3d_,
      _environmentRenderingService_,
      _eventDispatcherService_,
      _contextMenuState_,
      _applyForceService_,
      _stateService_,
      _STATE_
    ) {
      myService = _pullForceService_;
      gz3d = _gz3d_;
      environmentRenderingService = _environmentRenderingService_;
      eventDispatcherService = _eventDispatcherService_;
      contextMenuState = _contextMenuState_;
      applyForceService = _applyForceService_;
      stateService = _stateService_;
      STATE = _STATE_;
    })
  );

  // do some initialization stuff that should be configured for all tests inside this describe block
  beforeEach(function() {
    container = gz3d.scene.viewManager.mainUserView.container = document.createElement(
      'div'
    );
    spyOn(container, 'addEventListener').and.callThrough();
    spyOn(container, 'removeEventListener').and.callThrough();
    myService.domElementPointerBindings = container;
  });

  it('PullForce service is created correctly', function(done) {
    expect(myService.Activate).toBeDefined();
    expect(myService.Deactivate).toBeDefined();
    done();
  });

  // start with the first test
  it('Calling activate should add start event listener to mouse events', function(
    done
  ) {
    myService.Activate();

    expect(container.addEventListener).toHaveBeenCalled();

    done();
  });

  it('Calling deactivate should remove all possible event listeners', function(
    done
  ) {
    myService.Deactivate();

    expect(container.removeEventListener).toHaveBeenCalledTimes(4);
    expect(
      environmentRenderingService.removeOnUpdateRenderingCallback
    ).toHaveBeenCalled();

    done();
  });

  describe('service got activated -> test start pulling:', function() {
    beforeEach(function() {
      myService.Activate();
    });

    /* eslint-disable camelcase */
    var mockModelStatic = {
      userData: {
        is_static: true
      }
    };

    var mockModel = {
      userData: {
        is_static: false
      },
      worldToLocal: jasmine.createSpy('worlToLocal'),
      add: jasmine.createSpy('add')
    };
    var mockIntersection = {
      link: {},
      intersection: {
        point: new THREE.Vector3(2, 2, 2)
      }
    };
    /* eslint-enable camelcase */

    it('model is undefined == no intersection returnd by raycasting', function(
      done
    ) {
      expect(myService.pullForceGizmos.length).toBe(0);
      gz3d.scene.getRayCastModel.and.returnValue(undefined);

      // trigger onStartPulling and check expected behavior
      eventDispatcherService.triggerMouseEvent(container, 'mousedown', 0, 0, 0);

      expect(container.addEventListener).not.toHaveBeenCalledWith(
        'mouseup',
        _,
        false
      );
      expect(container.addEventListener).not.toHaveBeenCalledWith(
        'mousemove',
        _,
        false
      );
      expect(
        environmentRenderingService.addOnUpdateRenderingCallback
      ).not.toHaveBeenCalled();
      expect(myService.pullForceGizmos.length).toBe(0);
      done();
    });

    it('do not pull if it is a static model', function(done) {
      expect(myService.pullForceGizmos.length).toBe(0);

      gz3d.scene.getRayCastModel.and.returnValue(mockModelStatic);
      contextMenuState.axisSelected.and.returnValue(false);

      eventDispatcherService.triggerMouseEvent(container, 'mousedown', 0, 0, 0);

      expect(myService.pullForceGizmos.length).toBe(0);
      done();
    });

    it('hit model but without valid link intersection', function(done) {
      expect(myService.pullForceGizmos.length).toBe(0);

      gz3d.scene.getRayCastModel.and.returnValue(mockModel);
      contextMenuState.axisSelected.and.returnValue(false);
      applyForceService.getLinkRayCastIntersection.and.returnValue(undefined);

      eventDispatcherService.triggerMouseEvent(container, 'mousedown', 0, 0, 0);

      expect(myService.pullForceGizmos.length).toBe(0);
      done();
    });

    it('hit model with valid link intersection', function(done) {
      expect(myService.pullForceGizmos.length).toBe(0);
      expect(container.addEventListener).toHaveBeenCalledTimes(1);

      mockModel.worldToLocal.and.returnValue(new THREE.Vector3(0, 0, 0));
      gz3d.scene.getRayCastModel.and.returnValue(mockModel);
      contextMenuState.axisSelected.and.returnValue(false);
      applyForceService.getLinkRayCastIntersection.and.returnValue(
        mockIntersection
      );

      eventDispatcherService.triggerMouseEvent(container, 'mousedown', 0, 0, 0);

      expect(myService.pullForceGizmos.length).toBe(1);
      expect(container.addEventListener).toHaveBeenCalledTimes(4);
      expect(
        environmentRenderingService.addOnUpdateRenderingCallback
      ).toHaveBeenCalled();
      done();
    });

    it('hit model with valid link intersection', function(done) {
      expect(myService.pullForceGizmos.length).toBe(0);
      expect(container.addEventListener).toHaveBeenCalledTimes(1);

      mockModel.worldToLocal.and.returnValue(new THREE.Vector3(0, 0, 0));
      gz3d.scene.getRayCastModel.and.returnValue(mockModel);
      gz3d.scene.modelManipulator.object = mockModel;
      contextMenuState.axisSelected.and.returnValue(true);
      applyForceService.getLinkRayCastIntersection.and.returnValue(
        mockIntersection
      );

      eventDispatcherService.triggerMouseEvent(container, 'mousedown', 0, 0, 0);

      expect(myService.pullForceGizmos.length).toBe(1);
      expect(container.addEventListener).toHaveBeenCalledTimes(4);
      expect(
        environmentRenderingService.addOnUpdateRenderingCallback
      ).toHaveBeenCalled();
      done();
    });

    describe('service got activated -> test on pulling:', function() {
      /* eslint-disable camelcase */
      var mockModel = new THREE.Object3D();
      var mockIntersection = {
        link: {},
        intersection: {
          point: new THREE.Vector3(0, 0, -2) // is somewhere in front of the camera
        }
      };
      /* eslint-enable camelcase */

      beforeEach(function() {
        myService.Activate();
        gz3d.scene.viewManager.mainUserView.container = {
          clientWidth: 200,
          clientHeight: 200
        };
        gz3d.scene.getRayCastModel.and.returnValue(mockModel);
        gz3d.scene.viewManager.mainUserView.renderer.domElement = {
          offsetLeft: 0,
          offsetTop: 0
        };
        contextMenuState.axisSelected.and.returnValue(false);
        applyForceService.getLinkRayCastIntersection.and.returnValue(
          mockIntersection
        );

        eventDispatcherService.triggerMouseEvent(
          container,
          'mousedown',
          0,
          100,
          100
        );
      });

      it('move event should change dist value', function(done) {
        expect(myService.dist).toBeDefined();

        eventDispatcherService.triggerMouseEvent(
          container,
          'mousemove',
          0,
          100,
          100
        );

        expect(myService.dist.x).toBe(0);
        expect(myService.dist.y).toBe(0);
        expect(myService.dist.z).toBe(0);

        eventDispatcherService.triggerMouseEvent(
          container,
          'mousemove',
          0,
          -10,
          10
        );

        expect(myService.dist.x).toBeCloseTo(-1.0258768);
        expect(myService.dist.y).toBeCloseTo(0.8393537846789976);
        expect(myService.dist.z).toBe(0);
        done();
      });
    });
    describe('service got activated -> test apply pulling:', function() {
      var mockModel = new THREE.Object3D();
      var mockIntersection = {
        link: {},
        intersection: {
          point: new THREE.Vector3(0, 0, -2)
        }
      };

      beforeEach(function() {
        myService.Activate();
        gz3d.scene.viewManager.mainUserView.container = {
          clientWidth: 200,
          clientHeight: 200
        };
        gz3d.scene.getRayCastModel.and.returnValue(mockModel);
        gz3d.scene.viewManager.mainUserView.renderer.domElement = {
          offsetLeft: 0,
          offsetTop: 0
        };
        spyOn(mockModel, 'worldToLocal').and.returnValue(
          new THREE.Vector3(0, 0, 0)
        );
        gz3d.scene.getRayCastModel.and.returnValue(mockModel);
        contextMenuState.axisSelected.and.returnValue(false);
        applyForceService.getLinkRayCastIntersection.and.returnValue(
          mockIntersection
        );
        environmentRenderingService.addOnUpdateRenderingCallback.and.callFake(
          function(callback) {
            environmentRenderingService.renderingCallback = callback;
          }
        );

        eventDispatcherService.triggerMouseEvent(
          container,
          'mousedown',
          0,
          100,
          100
        );
      });

      it('handle frame before mouse has moved', function(done) {
        environmentRenderingService.fakeRenderingUpdate(0);

        expect(applyForceService.applyForceToLink).not.toHaveBeenCalled();
        done();
      });

      it('handle frame after mouse has moved', function(done) {
        eventDispatcherService.triggerMouseEvent(
          container,
          'mousemove',
          0,
          10,
          10
        );
        environmentRenderingService.fakeRenderingUpdate(0);

        expect(applyForceService.applyForceToLink).toHaveBeenCalledTimes(1);

        stateService.currentState = STATE.PAUSED;

        eventDispatcherService.triggerMouseEvent(
          container,
          'mousemove',
          0,
          5,
          5
        );
        environmentRenderingService.fakeRenderingUpdate(0);
        // When the simulation is paused, apply the force only when pulling is over (mouse out/mouse up)
        expect(applyForceService.applyForceToLink).toHaveBeenCalledTimes(1);

        done();
      });
    });

    describe('service got activated -> test stop pulling:', function() {
      /* eslint-disable camelcase */
      var mockModel = {
        userData: {
          is_static: false
        },
        worldToLocal: jasmine.createSpy('worlToLocal'),
        add: jasmine.createSpy('add')
      };
      var mockIntersection = {
        link: {},
        intersection: {
          point: new THREE.Vector3(0, 0, -2)
        }
      };
      /* eslint-enable camelcase */

      beforeEach(function() {
        stateService.currentState = STATE.STARTED;
        myService.Activate();
        mockModel.worldToLocal.and.returnValue(new THREE.Vector3(0, 0, 0));
        gz3d.scene.getRayCastModel.and.returnValue(mockModel);
        contextMenuState.axisSelected.and.returnValue(false);
        applyForceService.getLinkRayCastIntersection.and.returnValue(
          mockIntersection
        );

        // trigger onStartPulling and check expected behavior
        eventDispatcherService.triggerMouseEvent(
          container,
          'mousedown',
          0,
          0,
          0
        );

        eventDispatcherService.triggerMouseEvent(
          container,
          'mousemove',
          0,
          0,
          0
        );
      });

      it('remove last gizmo and detach event listeners after finishing', function(
        done
      ) {
        myService.pullForceGizmos = [
          {
            getWorldPosition: function() {
              return new THREE.Vector3();
            }
          },
          { parent: { remove: jasmine.createSpy('remove') } }
        ];

        eventDispatcherService.triggerMouseEvent(container, 'mouseup', 0, 0, 0);

        expect(myService.pullForceGizmos.length).toBe(1);
        expect(container.removeEventListener).toHaveBeenCalledTimes(4);
        expect(
          environmentRenderingService.removeOnUpdateRenderingCallback
        ).toHaveBeenCalled();
        done();
      });

      it('CurrentModel should be returned', function(done) {
        var mockModel = { name: 'testModel' };
        myService.targetModel = mockModel;

        expect(myService.currentModel()).toBe(mockModel);

        done();
      });

      it('do not remove gizmos if state is stopped', function(done) {
        stateService.currentState = STATE.PAUSED;
        const getWorldPosition = function() {
          return new THREE.Vector3();
        };
        myService.pullForceGizmos = [
          { getWorldPosition: getWorldPosition },
          {
            parent: { remove: jasmine.createSpy('remove') },
            getWorldPosition: getWorldPosition
          }
        ];

        eventDispatcherService.triggerMouseEvent(container, 'mouseup', 0, 0, 0);

        // If the simulation is paused, we release the force on mouseup/mouseout event
        expect(applyForceService.applyForceToLink).toHaveBeenCalledTimes(1);

        expect(myService.pullForceGizmos.length).toBe(2);
        expect(container.removeEventListener).toHaveBeenCalledTimes(4);
        expect(
          environmentRenderingService.removeOnUpdateRenderingCallback
        ).toHaveBeenCalled();
        done();
      });

      it('remove all gizmos if state is changed to started', function(done) {
        let stateCallback = undefined;
        stateService.addStateCallback.and.callFake(fn => {
          stateCallback = fn;
        });
        stateService.currentState = STATE.PAUSED;
        const getWorldPosition = function() {
          return new THREE.Vector3();
        };
        myService.pullForceGizmos = [
          {
            parent: { remove: jasmine.createSpy('remove') },
            getWorldPosition: getWorldPosition
          },
          {
            parent: { remove: jasmine.createSpy('remove') },
            getWorldPosition: getWorldPosition
          }
        ];

        eventDispatcherService.triggerMouseEvent(container, 'mouseup', 0, 0, 0);

        expect(myService.pullForceGizmos.length).toBe(2);
        expect(container.removeEventListener).toHaveBeenCalledTimes(4);
        expect(
          environmentRenderingService.removeOnUpdateRenderingCallback
        ).toHaveBeenCalled();

        stateService.currentState = STATE.STARTED;
        stateCallback(stateService.currentState);

        expect(myService.pullForceGizmos.length).toBe(0);
        done();
      });
    });
  });
});
