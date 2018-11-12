(function() {
  'use strict';

  angular
    .module('gz3dViewsServiceMock', [])
    .service('gz3dViewsService', function() {
      this.views = [];
      this.hasCameraView = jasmine.createSpy('hasCameraView');
      this.toggleCameraHelper = jasmine.createSpy('toggleCameraHelper');
      this.assignView = jasmine.createSpy('assignView');
      this.isUserView = jasmine.createSpy('isUserView');
    });
})();
