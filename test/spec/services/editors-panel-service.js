'use strict';

describe('Services: editorsPanelService', function() {
  var editorsPanelService;
  var $window, $q;
  var environmentService, userContextService;
  var cancelLockSubscription, deferredLock;

  // provide mock objects
  beforeEach(
    module(function($provide) {
      var environmentServiceMock = {
        isPrivateExperiment: jasmine.createSpy('isPrivateExperiment')
      };
      $provide.value('environmentService', environmentServiceMock);

      cancelLockSubscription = jasmine.createSpy('cancelLockSubscription');
      var userContextServiceMock = {
        lockService: {
          onLockChanged: jasmine
            .createSpy('onLockChanged')
            .and.returnValue(cancelLockSubscription),
          tryAddLock: jasmine.createSpy('tryAddLock')
        },
        setLockDateAndUser: jasmine.createSpy('setLockDateAndUser'),
        setEditDisabled: jasmine.createSpy('setEditDisabled'),
        removeEditLock: jasmine.createSpy('removeEditLock')
      };
      $provide.value('userContextService', userContextServiceMock);

      var nrpAnalyticsMock = {
        eventTrack: jasmine.createSpy('eventTrack')
      };
      $provide.value('nrpAnalytics', nrpAnalyticsMock);
    })
  );

  beforeEach(function() {
    module('editorsPanelModule');
    module('simulationInfoMock');

    inject(function(
      _$window_,
      _$q_,
      _editorsPanelService_,
      _environmentService_,
      _userContextService_
    ) {
      $window = _$window_;
      $q = _$q_;
      editorsPanelService = _editorsPanelService_;
      environmentService = _environmentService_;
      userContextService = _userContextService_;
    });
  });

  beforeEach(function() {
    deferredLock = $q.defer();
    deferredLock.promise.then = jasmine
      .createSpy('then')
      .and.returnValue(deferredLock.promise);
    deferredLock.promise.catch = jasmine
      .createSpy('catch')
      .and.returnValue(deferredLock.promise);

    userContextService.lockService.tryAddLock.and.returnValue(
      deferredLock.promise
    );
  });

  describe(' - independent tests', function() {
    it(' - showEditorsPanel()', function() {
      expect(editorsPanelService.showEditorPanel).toBe(false);

      editorsPanelService.showEditorsPanel();

      expect(editorsPanelService.showEditorPanel).toBe(true);
    });

    it(' - onLockChanged()', function() {
      spyOn(editorsPanelService, 'toggleEditors').and.callThrough();

      var lockChange = {
        locked: false
      };
      userContextService.userEditingID = userContextService.userID = 'testID';
      editorsPanelService.showEditorPanel = true;

      editorsPanelService.onLockChanged(lockChange);

      expect($window.alert).toHaveBeenCalled();
      expect(editorsPanelService.toggleEditors).toHaveBeenCalled();
      expect(editorsPanelService.showEditorPanel).toBe(false);
    });

    it(' - onTryAddLock()', function() {
      spyOn(editorsPanelService, 'showEditorsPanel').and.callThrough();

      // test failure
      var lockResult = {
        success: false,
        lock: {
          lockInfo: {
            user: {
              id: 'lockedUser'
            }
          }
        }
      };
      userContextService.userID = 'testID';

      editorsPanelService.onTryAddLock(lockResult);

      expect($window.alert).toHaveBeenCalled();
      expect(userContextService.setEditDisabled).toHaveBeenCalledWith(true);

      // test success
      lockResult.success = true;

      editorsPanelService.onTryAddLock(lockResult);

      expect(userContextService.userEditingID).toBe(userContextService.userID);
      expect(editorsPanelService.showEditorsPanel).toHaveBeenCalled();
    });
  });

  describe(' - private experiment', function() {
    beforeEach(function() {
      environmentService.isPrivateExperiment.and.returnValue(true);
      editorsPanelService.init();
    });

    it(' - init()', function() {
      expect(userContextService.lockService.onLockChanged).toHaveBeenCalledWith(
        editorsPanelService.onLockChanged
      );
      expect(editorsPanelService.cancelLockSubscription).toBe(
        cancelLockSubscription
      );
    });

    it(' - deinit()', function() {
      editorsPanelService.deinit();

      expect(cancelLockSubscription).toHaveBeenCalled();
    });

    it(' - toggleEditors()', function() {
      spyOn(editorsPanelService, 'showEditorsPanel').and.callThrough();

      // test when not showing
      expect(editorsPanelService.showEditorPanel).toBe(false);

      editorsPanelService.toggleEditors();

      expect(userContextService.lockService.tryAddLock).toHaveBeenCalled();
      expect(deferredLock.promise.then).toHaveBeenCalledWith(
        editorsPanelService.onTryAddLock
      );
      expect(editorsPanelService.loadingEditPanel).toBe(true);

      // test when showing
      editorsPanelService.showEditorPanel = true;

      editorsPanelService.toggleEditors();

      expect(editorsPanelService.showEditorsPanel).toHaveBeenCalled();
      expect(userContextService.removeEditLock).toHaveBeenCalled();
    });
  });

  describe(' - non-private experiment', function() {
    beforeEach(function() {
      environmentService.isPrivateExperiment.and.returnValue(false);
      editorsPanelService.init();
    });

    it(' - toggleEditors()', function() {
      spyOn(editorsPanelService, 'showEditorsPanel').and.callThrough();

      expect(editorsPanelService.showEditorPanel).toBe(false);

      editorsPanelService.toggleEditors();

      expect(editorsPanelService.showEditorPanel).toBe(true);
    });
  });
});
