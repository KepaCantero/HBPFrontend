'use strict';

describe('Controller: environment-rendering-options', () => {
  let $controller, $rootScope, $scope;
  let controller;
  let gz3d, userNavigationService;

  beforeEach(() => {
    module('exdFrontendApp');
    module('environmentRenderingModule');

    module('gz3dMock');
    module('userNavigationServiceMock');
  });

  beforeEach(() => {
    // inject service for testing.
    inject((_$controller_, _$rootScope_, _gz3d_, _userNavigationService_) => {
      $controller = _$controller_;
      $rootScope = _$rootScope_;

      gz3d = _gz3d_;
      userNavigationService = _userNavigationService_;
    });
  });

  beforeEach(() => {
    $scope = $rootScope.$new();
    controller = $controller('EnvironmentRenderingOptionsController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
  });

  it(' - constructor()', () => {
    expect(controller).toBeDefined();
  });

  it(' - onButtonLightIntensity()', () => {
    // min light intensity
    gz3d.isGlobalLightMinReached.and.returnValue(true);
    controller.onButtonLightIntensity(-1);
    expect(gz3d.scene.emitter.emit).not.toHaveBeenCalled();

    // max light intensity
    gz3d.isGlobalLightMaxReached.and.returnValue(true);
    controller.onButtonLightIntensity(1);
    expect(gz3d.scene.emitter.emit).not.toHaveBeenCalled();

    // call goes through
    gz3d.isGlobalLightMinReached.and.returnValue(false);
    gz3d.isGlobalLightMaxReached.and.returnValue(false);
    controller.onButtonLightIntensity(1);
    expect(gz3d.scene.emitter.emit).toHaveBeenCalledWith(
      'lightChanged',
      jasmine.any(Number)
    );
  });

  it(' - onButtonCameraTranslate()', function() {
    let event = {
      which: 1
    };

    let actions = [
      [null, 'moveUp', 'moveForward'],
      ['moveLeft', 'initPosition', 'moveRight'],
      ['moveBackward', 'moveDown', null]
    ];

    // mousedown
    event.type = 'mousedown';
    // top left = null
    controller.onButtonCameraTranslate(event, 0, 0);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    // bottom right = null
    controller.onButtonCameraTranslate(event, 2, 2);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    // top middle = moveUp
    controller.onButtonCameraTranslate(event, 0, 1);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[0][1]
    );
    // top right = moveForward
    controller.onButtonCameraTranslate(event, 0, 2);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[0][2]
    );
    // middle left = moveLeft
    controller.onButtonCameraTranslate(event, 1, 0);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][0]
    );
    // middle middle = initPosition
    controller.onButtonCameraTranslate(event, 1, 1);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][1]
    );
    // middle right = moveRight
    controller.onButtonCameraTranslate(event, 1, 2);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][2]
    );
    // bottom left = moveBackward
    controller.onButtonCameraTranslate(event, 2, 0);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[2][0]
    );
    // bottom middle = moveDown
    controller.onButtonCameraTranslate(event, 2, 1);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[2][1]
    );

    // mouseup
    event.type = 'mouseup';
    // top left = null
    controller.onButtonCameraTranslate(event, 0, 0);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();
    // bottom right = null
    controller.onButtonCameraTranslate(event, 2, 2);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();
    // top middle = moveUp
    controller.onButtonCameraTranslate(event, 0, 1);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[0][1]
    );
    // top right = moveForward
    controller.onButtonCameraTranslate(event, 0, 2);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[0][2]
    );
    // middle left = moveLeft
    controller.onButtonCameraTranslate(event, 1, 0);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][0]
    );
    // middle middle = initPosition
    controller.onButtonCameraTranslate(event, 1, 1);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][1]
    );
    // middle right = moveRight
    controller.onButtonCameraTranslate(event, 1, 2);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][2]
    );
    // bottom left = moveBackward
    controller.onButtonCameraTranslate(event, 2, 0);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[2][0]
    );
    // bottom middle = moveDown
    controller.onButtonCameraTranslate(event, 2, 1);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[2][1]
    );

    // mouseleave
    event.type = 'mouseleave';
    userNavigationService.releaseCameraTransform.calls.reset();
    controller.onButtonCameraTranslate(event, 0, 0);
    actions.forEach(actionRow => {
      actionRow.forEach(action => {
        expect(
          userNavigationService.releaseCameraTransform
        ).toHaveBeenCalledWith(event, action);
      });
    });
  });

  it(' - onButtonCameraRotate()', function() {
    let event = {
      which: 1
    };

    let actions = [
      [null, 'rotateUp', null],
      ['rotateLeft', 'initRotation', 'rotateRight'],
      [null, 'rotateDown', null]
    ];

    // mousedown
    event.type = 'mousedown';
    // top left = null
    controller.onButtonCameraRotate(event, 0, 0);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    // top right = null
    controller.onButtonCameraRotate(event, 0, 2);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    // bottom left = null
    controller.onButtonCameraRotate(event, 2, 0);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    // bottom right = null
    controller.onButtonCameraRotate(event, 2, 2);
    expect(userNavigationService.requestCameraTransform).not.toHaveBeenCalled();
    // top middle = rotateUp
    controller.onButtonCameraRotate(event, 0, 1);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[0][1]
    );
    // middle left = rotateLeft
    controller.onButtonCameraRotate(event, 1, 0);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][0]
    );
    // middle middle = initRotation
    controller.onButtonCameraRotate(event, 1, 1);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][1]
    );
    // middle right = rotateRight
    controller.onButtonCameraRotate(event, 1, 2);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][2]
    );
    // bottom middle = rotateDown
    controller.onButtonCameraRotate(event, 2, 1);
    expect(userNavigationService.requestCameraTransform).toHaveBeenCalledWith(
      event,
      actions[2][1]
    );

    // mouseup
    event.type = 'mouseup';
    // top left = null
    controller.onButtonCameraRotate(event, 0, 0);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();
    // top right = null
    controller.onButtonCameraRotate(event, 0, 2);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();
    // bottom left = null
    controller.onButtonCameraRotate(event, 2, 0);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();
    // bottom right = null
    controller.onButtonCameraRotate(event, 2, 2);
    expect(userNavigationService.releaseCameraTransform).not.toHaveBeenCalled();
    // top middle = rotateUp
    controller.onButtonCameraRotate(event, 0, 1);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[0][1]
    );
    // middle left = rotateLeft
    controller.onButtonCameraRotate(event, 1, 0);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][0]
    );
    // middle middle = initRotation
    controller.onButtonCameraRotate(event, 1, 1);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][1]
    );
    // middle right = rotateRight
    controller.onButtonCameraRotate(event, 1, 2);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[1][2]
    );
    // bottom middle = rotateDown
    controller.onButtonCameraRotate(event, 2, 1);
    expect(userNavigationService.releaseCameraTransform).toHaveBeenCalledWith(
      event,
      actions[2][1]
    );

    // mouseleave
    event.type = 'mouseleave';
    userNavigationService.releaseCameraTransform.calls.reset();
    controller.onButtonCameraRotate(event, 0, 0);
    actions.forEach(actionRow => {
      actionRow.forEach(action => {
        expect(
          userNavigationService.releaseCameraTransform
        ).toHaveBeenCalledWith(event, action);
      });
    });
  });
});
