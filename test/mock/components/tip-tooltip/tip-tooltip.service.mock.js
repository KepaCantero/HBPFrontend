(function() {
  'use strict';

  angular
    .module('tipTooltipServiceMock', [])
    .service('tipTooltipService', function() {
      this.setCurrentTip = jasmine.createSpy('setCurrentTip');
      this.startShowingTipIfRequired = jasmine.createSpy(
        'startShowingTipIfRequired'
      );
    });
})();
