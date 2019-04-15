(function() {
  'use strict';

  angular
    .module('downloadFileServiceMock', [])
    .service('downloadFileService', function() {
      this.downloadFile = jasmine.createSpy('downloadFileService.downloadFile');
    });
})();
