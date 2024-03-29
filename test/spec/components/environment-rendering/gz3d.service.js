'use strict';

/* global GZ3D: true */
/* global THREE: true */
/* global Detector: true */
/* global document: true */

describe('testing the gz3d service', function() {
  var gz3d;

  //Mock the javascript document
  document.getElementById = function() {
    var element = {};
    element.appendChild = function() {};
    element.offsetHeight = 100;
    element.offsetWidth = 200;
    return element;
  };

  Detector = {};
  Detector.webgl = true;
  var cameraHelper = { visible: false };
  var SceneObject = {
    scene: new THREE.Scene(),
    render: jasmine.createSpy('render'),
    viewManager: {
      setCallbackCreateRenderContainer: jasmine.createSpy(
        'setCallbackCreateRenderContainer'
      ),
      getViewByName: function() {
        return { camera: { cameraHelper: cameraHelper } };
      }
    },
    getDomElement: jasmine.createSpy('getDomElement').and.returnValue({}),
    setWindowSize: jasmine.createSpy('setWindowSize'),
    refresh3DViews: jasmine.createSpy('refresh3DViews'),
    prepareModelsForRaycast: jasmine.createSpy('prepareModelsForRaycast')
  };
  var GuiObject = {};
  var GZIfaceObject = {
    addCanDeletePredicate: angular.noop,
    addOnDeleteEntityCallbacks: jasmine.createSpy('addOnDeleteEntityCallbacks'),
    addOnCreateEntityCallbacks: jasmine.createSpy('addOnCreateEntityCallbacks')
  };
  var SdfParserObject = {};
  GZ3D = {};
  GZ3D.Scene = jasmine.createSpy('Scene').and.returnValue(SceneObject);
  GZ3D.Gui = jasmine.createSpy('Gui').and.returnValue(GuiObject);
  GZ3D.GZIface = jasmine.createSpy('GZIface').and.returnValue(GZIfaceObject);
  GZ3D.SdfParser = jasmine
    .createSpy('SdfParser')
    .and.returnValue(SdfParserObject);

  var bbpConfig = {};
  bbpConfig.get = jasmine.createSpy('get').and.returnValue('toto');

  beforeEach(module('gz3dModule'));
  beforeEach(module('sceneInfoMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('backendInterfaceServiceMock'));
  beforeEach(
    module(function($provide) {
      $provide.value('bbpConfig', bbpConfig);
    })
  );

  beforeEach(
    inject(function($rootScope, _gz3d_) {
      gz3d = _gz3d_;

      // create a mock for console
      spyOn(console, 'error');

      // Always initialize first
      gz3d.Initialize();
    })
  );

  let correctModel, correctChildLink, wrongModel, wrongChildLink, lineSegment;
  let mockIntersections;
  beforeEach(function() {
    correctModel = new THREE.Object3D();
    correctChildLink = new THREE.Object3D();
    wrongModel = new THREE.Object3D();
    wrongChildLink = new THREE.Object3D();
    lineSegment = new THREE.Object3D();

    correctChildLink.userData = {
      gazeboType: 'link'
    };
    correctModel.add(correctChildLink);
    gz3d.scene.scene.add(correctModel);

    wrongChildLink.userData = {
      gazeboType: 'link'
    };
    wrongModel.add(wrongChildLink);

    lineSegment.type = 'LineSegments';

    mockIntersections = [
      {
        object: wrongModel
      },
      {
        object: lineSegment
      },
      {
        object: correctChildLink
      },
      {
        object: wrongChildLink
      }
    ];
  });

  it('checks if all the GZ3D constructors have been called', function() {
    expect(GZ3D.Scene).toHaveBeenCalled();
    expect(GZ3D.Gui).toHaveBeenCalledWith(SceneObject);
    expect(GZ3D.GZIface).toHaveBeenCalledWith(SceneObject, GuiObject);
    expect(GZ3D.SdfParser).toHaveBeenCalledWith(
      SceneObject,
      GuiObject,
      GZIfaceObject
    );
  });

  it('should Initialize', function() {
    expect(gz3d.sdfParser).toBeDefined();
    expect(gz3d.iface).toBeDefined();
    expect(gz3d.gui).toBeDefined();
    expect(gz3d.scene).toBeDefined();
    expect(gz3d.MODEL_LIBRARY).toBeDefined();
  });

  it('should register callbacks for createEntity and modelUpdate events', function() {
    expect(gz3d.iface.addOnDeleteEntityCallbacks).toHaveBeenCalled();
    expect(gz3d.iface.addOnCreateEntityCallbacks).toHaveBeenCalled();
  });

  it('should not initialize when already initialized', function() {
    gz3d.sdfParser = undefined;
    // initialize a second time
    gz3d.Initialize('fakeserverID', 'fakeSimID');
    expect(gz3d.sdfParser).not.toBeDefined();
  });

  it('should deinitialize', function() {
    gz3d.deInitialize();
    expect(gz3d.sdfParser).not.toBeDefined();
    expect(gz3d.iface).not.toBeDefined();
    expect(gz3d.gui).not.toBeDefined();
    expect(gz3d.scene).not.toBeDefined();
    expect(gz3d.container).not.toBeDefined();
    expect(gz3d.stats).not.toBeDefined();
  });

  it('isGlobalLightMin/MaxReached should return false if gz3d.scene is undefined', function() {
    gz3d.scene = undefined;
    expect(gz3d.isGlobalLightMinReached()).toBe(false);
    expect(gz3d.isGlobalLightMaxReached()).toBe(false);
  });

  it('isGlobalLightMin/MaxReached should return true or false depending on light intensity information', function() {
    var lightInfoReturnValue = { max: 0.1 };
    gz3d.scene.findLightIntensityInfo = function() {
      return lightInfoReturnValue;
    };
    expect(gz3d.isGlobalLightMinReached()).toBe(true);
    expect(gz3d.isGlobalLightMaxReached()).toBe(false);
    lightInfoReturnValue.max = 1.0;
    expect(gz3d.isGlobalLightMinReached()).toBe(false);
    expect(gz3d.isGlobalLightMaxReached()).toBe(true);
  });

  it(' - setLightHelperVisibility() should work', function() {
    // set up test lightHelper object
    var testLightHelper = new THREE.Object3D();
    testLightHelper.name = 'test_lightHelper';
    testLightHelper.visible = false;
    gz3d.scene.scene.showLightHelpers = true;
    gz3d.scene.scene.add(testLightHelper);

    expect(gz3d.scene.scene.getObjectByName('test_lightHelper').visible).toBe(
      false
    );

    gz3d.scene.showLightHelpers = true;

    gz3d.setLightHelperVisibility();

    expect(gz3d.scene.scene.getObjectByName('test_lightHelper').visible).toBe(
      true
    );
  });

  it(' - getRayCastModel()', function() {
    spyOn(gz3d, 'getRayCastIntersections').and.returnValue(mockIntersections);

    expect(gz3d.getRayCastModel({ x: 1, y: 1 })).toBe(correctModel);
  });

  it(' - getRayCastLink()', function() {
    spyOn(gz3d, 'getRayCastIntersections').and.returnValue([]);
    expect(gz3d.getRayCastLink(correctModel, { x: 1, y: 1 })).toBe(null);

    gz3d.getRayCastIntersections.and.returnValue(mockIntersections);

    expect(gz3d.getRayCastLink(wrongModel, { x: 1, y: 1 })).toBe(
      wrongChildLink
    );
    expect(gz3d.getRayCastLink(correctModel, { x: 1, y: 1 })).toBe(
      correctChildLink
    );
  });

  it(' - getRayCastIntersections()', function() {
    let mockRaycaster = {
      setFromCamera: jasmine.createSpy('setFromCamera'),
      intersectObjects: jasmine.createSpy('intersectObjects')
    };
    spyOn(THREE, 'Raycaster').and.returnValue(mockRaycaster);

    let clickPos = { x: 10, y: 10 };
    let boundingClientRect = {
      x: 0,
      y: 0,
      width: 40,
      height: 20
    };
    let view = {
      container: {
        getBoundingClientRect: jasmine
          .createSpy('getBoundingClientRect')
          .and.returnValue(boundingClientRect)
      },
      camera: {}
    };
    gz3d.getRayCastIntersections(clickPos, view);

    expect(mockRaycaster.setFromCamera).toHaveBeenCalledWith(
      new THREE.Vector2(-0.5, 0),
      view.camera
    );
    expect(mockRaycaster.intersectObjects).toHaveBeenCalledWith(
      gz3d.scene.scene.children,
      true
    );
  });

  it(' - getLinkFromIntersections()', function() {
    expect(gz3d.getLinkFromIntersections(mockIntersections, null)).toBe(
      undefined
    );

    expect(
      gz3d.getLinkFromIntersections(mockIntersections, wrongModel).link
    ).toBe(wrongChildLink);
    expect(
      gz3d.getLinkFromIntersections(mockIntersections, wrongModel).intersection
    ).toBe(mockIntersections[3]);

    expect(
      gz3d.getLinkFromIntersections(mockIntersections, correctModel).link
    ).toBe(correctChildLink);
    expect(
      gz3d.getLinkFromIntersections(mockIntersections, correctModel)
        .intersection
    ).toBe(mockIntersections[2]);
  });

  it(' - getNormalizedScreenCoords()', function() {
    let mockView = {
      container: {
        getBoundingClientRect: jasmine
          .createSpy('getBoundingClientRect')
          .and.returnValue({
            x: 0,
            y: 0,
            width: 200,
            height: 100
          })
      }
    };

    let normalized = gz3d.getNormalizedScreenCoords(mockView, 100, 50);
    expect(normalized.x).toBe(0);
    expect(normalized.y).toBe(0);

    normalized = gz3d.getNormalizedScreenCoords(mockView, 0, 0);
    expect(normalized.x).toBe(-1);
    expect(normalized.y).toBe(1);

    normalized = gz3d.getNormalizedScreenCoords(mockView, 200, 0);
    expect(normalized.x).toBe(1);
    expect(normalized.y).toBe(1);

    normalized = gz3d.getNormalizedScreenCoords(mockView, 0, 100);
    expect(normalized.x).toBe(-1);
    expect(normalized.y).toBe(-1);

    normalized = gz3d.getNormalizedScreenCoords(mockView, 200, 100);
    expect(normalized.x).toBe(1);
    expect(normalized.y).toBe(-1);

    normalized = gz3d.getNormalizedScreenCoords(mockView, 150, 75);
    expect(normalized.x).toBe(0.5);
    expect(normalized.y).toBe(-0.5);
  });
});
