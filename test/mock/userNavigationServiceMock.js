(function() {
  'use strict';

  angular
    .module('userNavigationServiceMock', [])
    .service('userNavigationService', function() {
      this.init = jasmine.createSpy('init');
      this.deinit = jasmine.createSpy('deinit');
      this.setDefaultPose = jasmine.createSpy('setDefaultPose');
      this.isUserAvatar = jasmine
        .createSpy('isUserAvatar')
        .and.callFake(function(entity) {
          return entity.name === 'user-avatar';
        });
      this.setModeFreeCamera = jasmine.createSpy('setModeFreeCamera');
      this.setModeGhost = jasmine.createSpy('setModeGhost');
      this.setModeHumanBody = jasmine.createSpy('setModeHumanBody');
      this.setLookatRobotCamera = jasmine.createSpy('setLookatRobotCamera');
      this.update = jasmine.createSpy('update');
      this.userCamera = {
        updateMatrixWorld: jasmine.createSpy('updateMatrixWorld'),
        position: {
          clone: jasmine.createSpy('clonePosition'),
          copy: jasmine.createSpy('copyPosition')
        },
        rotation: {
          clone: jasmine.createSpy('cloneRotation'),
          copy: jasmine.createSpy('copyRotation')
        }
      };
      this.controls = {
        enabled: false
      };
      this.lookatRobotControls = {
        setLookatTarget: jasmine.createSpy('setLookatTarget'),
        setDistance: jasmine.createSpy('setDistance')
      };
      this.navigationMode = 'FreeCamera';
    })
    .constant('NAVIGATION_MODES', {
      FREE_CAMERA: 'FreeCamera',
      GHOST: 'Ghost',
      HUMAN_BODY: 'HumanBody',
      LOOKAT_ROBOT: 'LookatRobot'
    });
})();
