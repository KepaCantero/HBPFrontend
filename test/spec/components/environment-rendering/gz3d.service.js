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
    refresh3DViews: jasmine.createSpy('refresh3DViews')
  };
  var GuiObject = {};
  var GZIfaceObject = { addCanDeletePredicate: angular.noop };
  var SdfParserObject = {};
  GZ3D = {};
  GZ3D.Scene = jasmine.createSpy('Scene').and.returnValue(SceneObject);
  GZ3D.Gui = jasmine.createSpy('Gui').and.returnValue(GuiObject);
  GZ3D.GZIface = jasmine.createSpy('GZIface').and.returnValue(GZIfaceObject);
  GZ3D.SdfParser = jasmine
    .createSpy('SdfParser')
    .and.returnValue(SdfParserObject);

  var simulationInfo = {
    serverID: 'bbpce016',
    simulationID: 'mocked_simulation_id',
    serverConfig: {
      gzweb: { assets: 'https://assets', websocket: 'wss://websocket' }
    },
    Initialize: jasmine.createSpy('Initialize')
  };

  var bbpConfig = {};
  bbpConfig.get = jasmine.createSpy('get').and.returnValue('toto');

  beforeEach(module('gz3dModule'));
  beforeEach(
    module(function($provide) {
      $provide.value('simulationInfo', simulationInfo);
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
});
