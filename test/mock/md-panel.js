(function() {
  'use strict';

  angular.module('$mdPanelMock', []).service('$mdPanel', function() {
    this.panel = {};
    this.xPosition = { ALIGN_END: 'end' };
    this.yPosition = { BELOW: 'below' };

    this.newPanelPosition = jasmine
      .createSpy('newPanelPosition')
      .and.returnValue(this);
    this.relativeTo = jasmine.createSpy('relativeTo').and.returnValue(this);
    this.addPanelPosition = jasmine
      .createSpy('addPanelPosition')
      .and.returnValue(this);
    this.open = jasmine.createSpy('open').and.returnValue({
      then: jasmine.createSpy('then').and.callFake(callback => {
        callback(this.panel);
      })
    });
  });
})();
