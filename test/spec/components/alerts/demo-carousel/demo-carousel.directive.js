(function() {
  'use strict';

  describe('Directive: demo-carousel-alert', function() {
    beforeEach(module('demoCarousel'));
    beforeEach(module('exd.templates'));

    var scope, $window;

    beforeEach(
      inject(function($rootScope, $compile, _$window_) {
        $window = _$window_;
        spyOn($window.sessionStorage, 'getItem').and.returnValue(null);
        spyOn($window.sessionStorage, 'setItem');

        var element = $compile('<demo-carousel-alert></demo-carousel-alert>')(
          $rootScope
        );
        $rootScope.$digest();
        scope = element.scope();
      })
    );

    it('check demo banner is still disabled', function() {
      expect(scope.displayWatchDemosButton).toBe(false);
    });
  });
})();
