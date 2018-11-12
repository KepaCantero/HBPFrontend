/* global THREE: false */

'use strict';

describe('Controller: SimToolsSidebarController', function() {
  let simToolsSidebarController;

  let $controller, $rootScope, $scope, $timeout;
  let gz3d, simToolsSidebarService, userNavigationService;

  // real modules
  beforeEach(() => {
    module('simToolsSidebarModule');
    module('goldenLayoutModule');
    module('tipTooltipModule');
  });

  // mock modules
  beforeEach(() => {
    module('clientLoggerServiceMock');
    module('editorToolbarServiceMock');
    module('environmentRenderingServiceMock');
    module('gz3dMock');
    module('gz3dViewsServiceMock');
    module('helpTooltipServiceMock');
    module('nrpAnalyticsMock');
    module('simulationInfoMock');
    module('userNavigationServiceMock');
    module('userContextServiceMock');
    module('videoStreamServiceMock');
    module('tipTooltipServiceMock');
  });

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _$timeout_,
      _gz3d_,
      _simToolsSidebarService_,
      _userNavigationService_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      $timeout = _$timeout_;

      gz3d = _gz3d_;
      simToolsSidebarService = _simToolsSidebarService_;
      userNavigationService = _userNavigationService_;
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
