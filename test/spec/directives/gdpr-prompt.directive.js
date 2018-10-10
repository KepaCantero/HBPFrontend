'use strict';

describe('Directive: gdpr-prompt', function() {
  beforeEach(module('exdFrontendApp'));

  beforeEach(
    module($provide => {
      $provide.value('nrpModalService', {
        createModal: jasmine.createSpy()
      });

      $provide.value('storageServer', {
        getGdprStatus: jasmine.createSpy(),
        acceptGdpr: jasmine.createSpy()
      });

      $provide.value('$window', {
        location: {
          reload: jasmine.createSpy()
        }
      });
    })
  );

  it(
    'should not show dialod if gdpr has been previously accepted',
    inject((storageServer, $rootScope, $compile, nrpModalService) => {
      storageServer.getGdprStatus.and.returnValue(
        Promise.resolve({ gdpr: true })
      );

      $compile('<gdpr-prompt/>')($rootScope);
      $rootScope.$digest();

      expect(nrpModalService.createModal).not.toHaveBeenCalled();
    })
  );

  it(
    'should clear auth token and reload page if terms of service not accepted',
    inject(
      (
        storageServer,
        $rootScope,
        $compile,
        nrpModalService,
        storageServerTokenManager,
        $window,
        $q
      ) => {
        storageServer.getGdprStatus.and.returnValue(
          $q.resolve({ gdpr: false })
        );

        nrpModalService.createModal.and.returnValue($q.resolve(false));
        $window.location.reload.calls.reset();
        spyOn(storageServerTokenManager, 'clearStoredToken');

        $compile('<gdpr-prompt/>')($rootScope);
        $rootScope.$digest();

        expect(storageServer.acceptGdpr).not.toHaveBeenCalled();
        expect($window.location.reload).toHaveBeenCalled();
        expect(storageServerTokenManager.clearStoredToken).toHaveBeenCalled();
      }
    )
  );

  it(
    'should make as gdpr accepted if terms of service accepted',
    inject(
      (
        storageServer,
        $rootScope,
        $compile,
        nrpModalService,
        storageServerTokenManager,
        $window,
        $q
      ) => {
        storageServer.getGdprStatus.and.returnValue(
          $q.resolve({ gdpr: false })
        );
        $window.location.reload.calls.reset();
        nrpModalService.createModal.and.returnValue($q.resolve(true));
        spyOn(storageServerTokenManager, 'clearStoredToken');

        $compile('<gdpr-prompt/>')($rootScope);
        $rootScope.$digest();

        expect(storageServer.acceptGdpr).toHaveBeenCalled();
        expect(
          storageServerTokenManager.clearStoredToken
        ).not.toHaveBeenCalled();
        expect($window.location.reload).not.toHaveBeenCalled();
      }
    )
  );
});
