(function() {
  'use strict';

  describe('Service: StorageServerRequestInterceptor', function() {
    beforeEach(module('storageServer'));
    let windowMock = {
      location: {
        href: null
      }
    };

    beforeEach(
      module(function($provide) {
        $provide.value('$window', windowMock);
      })
    );

    let storageServerRequestInterceptor;
    beforeEach(
      inject(function(_storageServerRequestInterceptor_) {
        storageServerRequestInterceptor = _storageServerRequestInterceptor_;
      })
    );

    it('should handle maintenance mode', function() {
      spyOn(storageServerRequestInterceptor.$location, 'path');
      storageServerRequestInterceptor.responseError({ status: 478 });
      expect(
        storageServerRequestInterceptor.$location.path
      ).toHaveBeenCalledWith('maintenance');
    });

    it('should handle login url', function() {
      storageServerRequestInterceptor.responseError({ status: 477 });
      expect(storageServerRequestInterceptor.$window.location.href).toContain(
        'http://proxyundefined&client_id=test-client-id&redirect_uri='
      );
    });
  });
})();
