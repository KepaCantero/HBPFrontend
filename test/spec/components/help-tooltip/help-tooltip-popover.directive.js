(function() {
  'use strict';

  describe('Directive: help-tooltip-popover', function() {
    beforeEach(module('simulationConfigServiceMock'));
    beforeEach(module('helpTooltipPopoverModule'));
    beforeEach(module('exd.templates')); // import html template

    beforeEach(module('tipTooltipServiceMock'));

    let $rootScope;
    var scope, helpTooltipService, STATE, stateService;

    beforeEach(
      inject(function(
        _$rootScope_,
        $compile,
        $httpBackend,
        _helpTooltipService_,
        _STATE_,
        _stateService_
      ) {
        $rootScope = _$rootScope_;

        helpTooltipService = _helpTooltipService_;
        STATE = _STATE_;
        stateService = _stateService_;

        $httpBackend.whenGET(/.*/).respond(200);

        var element = $compile('<help-tooltip-popover></help-tooltip-popover>')(
          $rootScope
        );
        $rootScope.$digest();
        scope = element.isolateScope();
      })
    );

    it('should expose services', function() {
      expect(scope.helpTooltipService).toBe(helpTooltipService);
      expect(scope.STATE).toBe(STATE);
      expect(scope.stateService).toBe(stateService);
    });

    it(' - showLatestChangeLog()', function() {
      spyOn($rootScope, '$emit').and.callThrough();
      scope.showLatestChangeLog();
      expect($rootScope.$emit).toHaveBeenCalledWith('SHOW_CHANGE_LOG');
    });
  });
})();
