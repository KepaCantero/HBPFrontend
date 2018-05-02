(function() {
  'use strict';

  angular.module('noiseModelServiceMock', []).service('noiseModelService', [
    '$q',
    function($q) {
      this.NoiseModelService = jasmine
        .createSpy('NoiseModelService')
        .and.returnValue(
          $q.resolve({
            // return value/response from get/setNoiseProperties as JSON goes here
          })
        );
      this.setDataNoiseModel = jasmine
        .createSpy('setDataNoiseModel')
        .and.returnValue({
          then: jasmine.createSpy('then').and.callFake(function(fn) {
            fn();
          })
        });
    }
  ]);
})();
