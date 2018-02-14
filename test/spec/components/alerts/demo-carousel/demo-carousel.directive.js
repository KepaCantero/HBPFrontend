(function() {
  'use strict';

  describe('Directive: demo-carousel-alert', function() {
    beforeEach(module('demoCarousel'));
    beforeEach(module('exd.templates'));
    beforeEach(module('nrpUserMock'));

    var scope, nrpUser, $window;

    beforeEach(
      inject(function($rootScope, $compile, _nrpUser_, _$window_) {
        nrpUser = _nrpUser_;
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

    it('should call nrpUser.getCurrentUserInfo() once', function() {
      expect(nrpUser.getCurrentUserInfo.calls.count()).toBe(1);
      expect(scope.displayWatchDemosButton).toBe(true);
    });
  });
})();
