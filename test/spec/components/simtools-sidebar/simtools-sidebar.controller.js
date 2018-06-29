/* global THREE: false */

'use strict';

describe('Controller: SimToolsSidebarController', function() {
  let simToolsSidebarController;

  let $controller, $rootScope, $scope, $timeout;
  let DYNAMIC_VIEW_CHANNELS;
  let dynamicViewOverlayService,
    editorsPanelService,
    gz3d,
    simToolsSidebarService,
    userContextService,
    userNavigationService,
    videoStreamService;

  beforeEach(module('simToolsSidebarModule'));
  beforeEach(module('dynamicViewModule'));

  beforeEach(module('dynamicViewOverlayServiceMock'));
  beforeEach(module('editorsPanelServiceMock'));
  beforeEach(module('editorToolbarServiceMock'));
  beforeEach(module('environmentRenderingServiceMock'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('gz3dViewsServiceMock'));
  beforeEach(module('helpTooltipServiceMock'));
  beforeEach(module('nrpAnalyticsMock'));
  beforeEach(module('userContextServiceMock'));
  beforeEach(module('userNavigationServiceMock'));
  beforeEach(module('videoStreamServiceMock'));

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _$timeout_,
      _DYNAMIC_VIEW_CHANNELS_,
      _dynamicViewOverlayService_,
      _editorsPanelService_,
      _gz3d_,
      _simToolsSidebarService_,
      _userContextService_,
      _userNavigationService_,
      _videoStreamService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $timeout = _$timeout_;

      DYNAMIC_VIEW_CHANNELS = _DYNAMIC_VIEW_CHANNELS_;

      dynamicViewOverlayService = _dynamicViewOverlayService_;
      editorsPanelService = _editorsPanelService_;
      gz3d = _gz3d_;
      simToolsSidebarService = _simToolsSidebarService_;
      userContextService = _userContextService_;
      userNavigationService = _userNavigationService_;
      videoStreamService = _videoStreamService_;
    })
  );

  beforeEach(function() {
    $scope = $rootScope.$new();
    simToolsSidebarController = $controller('SimToolsSidebarController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
  });

  it(' - constructor()', function() {
    expect(simToolsSidebarController.isSubmenuSceneNavigationOpen).toBe(false);
    expect(simToolsSidebarController.isSubmenuLightingOpen).toBe(false);
  });

  it(' - on event ASSETS_LOADED', function() {
    expect(simToolsSidebarController.show).toBe(false);

    $rootScope.$broadcast('ASSETS_LOADED');

    expect(simToolsSidebarController.show).toBe(true);

    spyOn(simToolsSidebarService, 'isOverflowingY').and.returnValue(true);
    $timeout.flush();
    expect(
      simToolsSidebarController.overflowing[
        simToolsSidebarController.SIMTOOLS_SIDEBAR_ID.SIDEBAR
      ]
    ).toBe(true);
  });

  it(' - onButtonLightIntensity()', function() {
    gz3d.isGlobalLightMinReached.and.returnValue(false);
    gz3d.isGlobalLightMaxReached.and.returnValue(false);

    // increase
    simToolsSidebarController.onButtonLightIntensity(1);
    expect(gz3d.scene.emitter.emit).toHaveBeenCalledWith('lightChanged', 0.1);
    // decrease
    simToolsSidebarController.onButtonLightIntensity(-1);
    expect(gz3d.scene.emitter.emit).toHaveBeenCalledWith('lightChanged', -0.1);

    gz3d.scene.emitter.emit.calls.reset();

    // at max
    gz3d.isGlobalLightMaxReached.and.returnValue(true);
    simToolsSidebarController.onButtonLightIntensity(1);
    expect(gz3d.scene.emitter.emit).not.toHaveBeenCalled();
    // at min
    gz3d.isGlobalLightMinReached.and.returnValue(true);
    simToolsSidebarController.onButtonLightIntensity(-1);
    expect(gz3d.scene.emitter.emit).not.toHaveBeenCalled();
  });

  it(' - onButtonEditors()', function() {
    userContextService.editIsDisabled = true;
    simToolsSidebarController.onButtonEditors();
    expect(editorsPanelService.toggleEditors).not.toHaveBeenCalled();

    userContextService.editIsDisabled = false;
    editorsPanelService.loadingEditPanel = true;
    simToolsSidebarController.onButtonEditors();
    expect(editorsPanelService.toggleEditors).not.toHaveBeenCalled();

    editorsPanelService.loadingEditPanel = false;
    simToolsSidebarController.onButtonEditors();
    expect(editorsPanelService.toggleEditors).toHaveBeenCalled();
  });

  it(' - onButtonToggleEditor()', function() {
    userContextService.editIsDisabled = true;
    simToolsSidebarController.onButtonToggleEditor();
    expect(
      dynamicViewOverlayService.toggleDynamicViewOverlay
    ).not.toHaveBeenCalled();

    userContextService.editIsDisabled = false;
    simToolsSidebarController.onButtonToggleEditor('my-editor-channel');
    expect(
      dynamicViewOverlayService.toggleDynamicViewOverlay
    ).toHaveBeenCalledWith('my-editor-channel');
  });

  it(' - onButtonVideoStreams()', function() {
    videoStreamService.videoStreamsAvailable = false;
    simToolsSidebarController.onButtonVideoStreams();
    expect(
      dynamicViewOverlayService.createDynamicOverlay
    ).not.toHaveBeenCalled();

    videoStreamService.videoStreamsAvailable = true;
    simToolsSidebarController.onButtonVideoStreams();
    expect(dynamicViewOverlayService.createDynamicOverlay).toHaveBeenCalledWith(
      DYNAMIC_VIEW_CHANNELS.STREAM_VIEWER
    );
  });

  it(' - onButtonExpandCategory()', function() {
    expect(simToolsSidebarController.expandedCategory).toBe(null);
    simToolsSidebarController.onButtonExpandCategory('my-category');
    expect(simToolsSidebarController.expandedCategory).toBe('my-category');
    simToolsSidebarController.onButtonExpandCategory('my-category');
    expect(simToolsSidebarController.expandedCategory).toBe(null);

    // should also close the submenus
    simToolsSidebarController.isSubmenuSceneNavigationOpen = true;
    simToolsSidebarController.isSubmenuLightingOpen = true;
    simToolsSidebarController.onButtonExpandCategory('my-category');
    expect(simToolsSidebarController.isSubmenuSceneNavigationOpen).toBe(false);
    expect(simToolsSidebarController.isSubmenuLightingOpen).toBe(false);
  });

  it(' - onButtonCameraTranslate()', function() {
    let event = {
      currentTarget: {
        getClientRects: () => {
          return [{ width: 30, height: 30 }];
        }
      }
    };
    let buttonMouseOffsets = [5, 5];
    // top left = null
    event.offsetX = 0;
    event.offsetY = 0;
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();

    // top middle = moveUp
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 10 - buttonMouseOffsets[0];
    event.offsetY = 0;
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'moveUp'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'moveUp'
    );

    // top right = moveForward
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 20 - buttonMouseOffsets[0];
    event.offsetY = 0;
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'moveForward'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'moveForward'
    );

    // middle left = moveLeft
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 0;
    event.offsetY = 10 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'moveLeft'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'moveLeft'
    );

    // middle middle = initPosition
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 10 - buttonMouseOffsets[0];
    event.offsetY = 10 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'initPosition'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'initPosition'
    );

    // middle right = moveRight
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 20 - buttonMouseOffsets[0];
    event.offsetY = 10 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'moveRight'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'moveRight'
    );

    // bottom left = moveBackward
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 0;
    event.offsetY = 20 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'moveBackward'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'moveBackward'
    );

    // bottom middle = moveDown
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 10 - buttonMouseOffsets[0];
    event.offsetY = 20 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'moveDown'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'moveDown'
    );

    // bottom right = null
    userNavigationService.requestCameraTransform.calls.reset();
    userNavigationService.releaseCameraTransform.calls.reset();
    event.offsetX = 20 - buttonMouseOffsets[0];
    event.offsetY = 20 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraTranslate(event);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();
  });

  it(' - onButtonCameraRotate()', function() {
    let event = {
      currentTarget: {
        getClientRects: () => {
          return [{ width: 30, height: 30 }];
        }
      }
    };
    let buttonMouseOffsets = [5, 5];
    // top left = null
    event.offsetX = 0;
    event.offsetY = 0;
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();

    // top middle = rotateUp
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 10 - buttonMouseOffsets[0];
    event.offsetY = 0;
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'rotateUp'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'rotateUp'
    );

    // top right = null
    userNavigationService.requestCameraTransform.calls.reset();
    userNavigationService.releaseCameraTransform.calls.reset();
    event.offsetX = 20 - buttonMouseOffsets[0];
    event.offsetY = 0;
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();

    // middle left = rotateLeft
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 0;
    event.offsetY = 10 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'rotateLeft'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'rotateLeft'
    );

    // middle middle = initRotation
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 10 - buttonMouseOffsets[0];
    event.offsetY = 10 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'initRotation'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'initRotation'
    );

    // middle right = rotateRight
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 20 - buttonMouseOffsets[0];
    event.offsetY = 10 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'rotateRight'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'rotateRight'
    );

    // bottom left = null
    userNavigationService.requestCameraTransform.calls.reset();
    userNavigationService.releaseCameraTransform.calls.reset();
    event.offsetX = 0;
    event.offsetY = 20 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();

    // bottom middle = rotateDown
    userNavigationService.requestCameraTransform.calls.reset();
    event.offsetX = 10 - buttonMouseOffsets[0];
    event.offsetY = 20 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      'rotateDown'
    );
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      'rotateDown'
    );

    // bottom right = null
    userNavigationService.requestCameraTransform.calls.reset();
    userNavigationService.releaseCameraTransform.calls.reset();
    event.offsetX = 20 - buttonMouseOffsets[0];
    event.offsetY = 20 - buttonMouseOffsets[1];
    event.type = 'mousedown';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    event.type = 'mouseup';
    simToolsSidebarController.onButtonCameraRotate(event);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();
  });
});
