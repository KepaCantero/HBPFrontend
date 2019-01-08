(function() {
  'use strict';

  class AutoSaveFactoryMock {
    constructor() {
      this.createService = jasmine.createSpy('createService').and.returnValue({
        onsave: jasmine.createSpy('onsave'),
        setDirty: jasmine.createSpy('setDirty')
      });
    }
  }

  angular
    .module('autoSaveFactoryMock', [])
    .factory('autoSaveFactory', AutoSaveFactoryMock);
})();
