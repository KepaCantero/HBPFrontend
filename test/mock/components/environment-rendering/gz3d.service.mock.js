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

    this.gui = {
      emitter: {
        emit: jasmine.createSpy('emit')
      },
      guiEvents: new window.EventEmitter2({ verbose: true }),
      canModelBeDuplicated: jasmine
        .createSpy('canModelBeDuplicated')
        .and.returnValue(true)
    };

    var views = [
      {
        type: 'camera',
        active: true,
        container: document.createElement('div'), //{ style: { visibility: 'visible' } }
        renderer: {
          domElement: {}
        },
        camera: new THREE.PerspectiveCamera()
      },
      {
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
      render: jasmine.createSpy('render'),
      resetView: jasmine.createSpy('resetView'),
      refresh3DViews: jasmine.createSpy('refresh3DViews'),
      setDefaultCameraPose: jasmine.createSpy('setDefaultCameraPose'),
      setRobotInfoVisible: jasmine.createSpy('setRobotInfoVisible'),
      container: {
        addEventListener: jasmine.createSpy('addEventListener')
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
        snapDist: 0
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
      attachEventListeners: jasmine.createSpy('attachEventListeners')
    };

    this.iface = {
      addCanDeletePredicate: jasmine.createSpy('addCanDeletePredicate'),
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
          _events: { entityCreated: jasmine.createSpy('entityCreated') }
        }
      }
    };
  });
})();
