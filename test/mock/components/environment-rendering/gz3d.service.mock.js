(function() {
  'use strict';

  angular.module('gz3dMock', []).service('gz3d', function() {
    this.Initialize = jasmine.createSpy('Initialize');
    this.deInitialize = jasmine.createSpy('deInitialize');
    this.setLightHelperVisibility = jasmine.createSpy(
      'setLightHelperVisibility'
    );
    this.isGlobalLightMinReached = jasmine.createSpy('isGlobalLightMinReached');
    this.isGlobalLightMaxReached = jasmine.createSpy('isGlobalLightMaxReached');
    this.getRayCastIntersections = jasmine.createSpy('getRayCastIntersections');
    this.getRayCastModel = jasmine.createSpy('getRayCastModel');
    this.getLinkFromIntersections = jasmine.createSpy(
      'getLinkFromIntersections'
    );
    this.getNormalizedScreenCoords = jasmine.createSpy(
      'getNormalizedScreenCoords'
    );

    this.gui = {
      emitter: {
        emit: jasmine.createSpy('emit'),
        on: jasmine.createSpy('on')
      },
      guiEvents: new window.EventEmitter2({ verbose: true }),
      canModelBeDuplicated: jasmine
        .createSpy('canModelBeDuplicated')
        .and.returnValue(true)
    };

    var views = [
      {
        name: 'main_view',
        type: 'camera',
        active: true,
        container: document.createElement('div'), //{ style: { visibility: 'visible' } }
        renderer: {
          domElement: {}
        },
        camera: new THREE.PerspectiveCamera()
      },
      {
        name: 'robot_view',
        type: 'camera',
        active: false,
        container: document.createElement('div'), //{ style: { visibility: 'hidden' } }
        renderer: {
          domElement: {}
        },
        camera: new THREE.PerspectiveCamera()
      }
    ];

    this.scene = {
      composerSettings: {
        pbrMaterial: true
      },
      composer: {
        currentMasterSettings: {}
      },
      defaultComposerSettings: {},
      render: jasmine.createSpy('render'),
      resetView: jasmine.createSpy('resetView'),
      refresh3DViews: jasmine.createSpy('refresh3DViews'),
      setDefaultCameraPose: jasmine.createSpy('setDefaultCameraPose'),
      setRobotInfoVisible: jasmine.createSpy('setRobotInfoVisible'),
      hasSkin: jasmine.createSpy('hasSkin').and.returnValue(false),
      skinVisible: jasmine.createSpy('skinVisible').and.returnValue(false),
      container: {
        addEventListener: jasmine.createSpy('addEventListener'),
        removeEventListener: jasmine.createSpy('removeEventListener')
      },
      radialMenu: {
        showing: false
      },
      modelManipulator: {
        isSelected: jasmine.createSpy('isSelected').and.returnValue(false),
        highlightPicker: jasmine.createSpy('highlightPicker'),
        onPointerMove: {},
        selected: '',
        handleAxisLockEnd: jasmine.createSpy('handleAxisLockEnd'),
        selectPicker: jasmine.createSpy('selectPicker'),
        pickerNames: '',
        space: 'world',
        snapDist: 0,
        object: {}
      },
      naturalAutoAlignMode: {
        onKeyUp: jasmine.createSpy('onKeyUp'),
        onKeyDown: jasmine.createSpy('onKeyDown')
      },
      updateMoveNaturalManipulation: jasmine.createSpy(
        'updateMoveNaturalManipulation'
      ),
      emitter: {
        emit: jasmine.createSpy('emit')
      },
      setManipulationMode: jasmine
        .createSpy('setManipulationMode')
        .and.callFake(function(m) {
          this.manipulationMode = m;
        }),
      selectedEntity: undefined,
      manipulationMode: undefined,
      setViewAs: jasmine.createSpy('setViewAs'),
      setLabelInfoVisible: jasmine.createSpy('setLabelInfoVisible'),

      controls: {
        onMouseDownManipulator: jasmine.createSpy('onMouseDownManipulator'),
        onMouseUpManipulator: jasmine.createSpy('onMouseUpManipulator'),
        update: jasmine.createSpy('update')
      },
      gui: {
        emitter: {}
      },
      setShadowMaps: jasmine.createSpy('setShadowMaps'),
      renderer: {
        shadowMapEnabled: false
      },
      viewManager: {
        views: views,
        mainUserView: views[0],
        setViewContainerElement: jasmine.createSpy('setViewContainerElement')
      },
      scene: new THREE.Scene(),
      selectEntity: jasmine.createSpy('selectEntity'),
      applyComposerSettings: jasmine.createSpy('applyComposerSettings'),
      getByName: jasmine.createSpy('getByName'),
      toggleScreenChangeMenu: jasmine.createSpy('toggleScreenChangeMenu'),
      attachEventListeners: jasmine.createSpy('attachEventListeners'),
      getRayCastModel: jasmine.createSpy('getRayCastModel'),
      setSkinVisible: jasmine.createSpy('setSkinVisible'),
      spawnModel: {
        start: jasmine.createSpy('start')
      }
    };

    this.iface = {
      addCanDeletePredicate: jasmine.createSpy('addCanDeletePredicate'),
      addOnDeleteEntityCallbacks: jasmine.createSpy(
        'addOnDeleteEntityCallbacks'
      ),
      addOnCreateEntityCallbacks: jasmine.createSpy(
        'addOnCreateEntityCallbacks'
      ),
      setAssetProgressCallback: jasmine.createSpy('setAssetProgressCallback'),
      loadCollisionVisuals: jasmine.createSpy('loadCollisionVisuals'),
      registerWebSocketConnectionCallback: jasmine.createSpy(
        'registerWebSocketConnectionCallback'
      ),
      webSocket: {
        close: jasmine.createSpy('close'),
        disableRebirth: jasmine.createSpy('disableRebirth')
      },
      gui: {
        emitter: {
          _events: { entityCreated: jasmine.createSpy('entityCreated') },
          on: jasmine.createSpy('on')
        }
      },
      emitter: {
        on: jasmine.createSpy('on').and.callFake(function(event, fn) {
          fn();
        })
      },
      modelInfoTopic: {
        subscribe: jasmine.createSpy('subscribe')
      }
    };
  });
})();
