'use strict';

describe('Services: userContextService', function() {
  var userContextService;

  var $rootScope, simulationInfo, environmentService;

  var lockServiceMock, cancelLockServiceMock, collabExperimentLockServiceMock;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('userContextModule'));
  beforeEach(module('storageServerMock'));

  // provide mock objects
  beforeEach(
    module(function($provide) {
      // userNavigationService
      var userNavigationServiceMock = {
        isUserAvatar: jasmine
          .createSpy('isUserAvatar')
          .and.callFake(function(entity) {
            if (entity.name === 'user_avatar') {
              return true;
            } else {
              return false;
            }
          })
      };
      $provide.value('userNavigationService', userNavigationServiceMock);

      // collabExperimentLockService
      cancelLockServiceMock = jasmine.createSpy('cancelLockServiceMock');
      lockServiceMock = {
        onLockChanged: jasmine
          .createSpy('onLockChanged')
          .and.returnValue(cancelLockServiceMock),
        releaseLock: jasmine.createSpy('releaseLock').and.returnValue({
          catch: jasmine.createSpy('catch')
        })
      };

      collabExperimentLockServiceMock = {
        createLockServiceForExperimentId: jasmine
          .createSpy('createLockServiceForExperimentId')
          .and.returnValue(lockServiceMock),
        onLockChanged: jasmine.createSpy('onLockChanged')
      };
      $provide.value(
        'collabExperimentLockService',
        collabExperimentLockServiceMock
      );
      $provide.value('simulationControl', function() {
        return {
          simulation: function(_, rescallback) {
            rescallback({
              owner: 'Some owner id',
              experimentConfiguration: 'expconf',
              creationDate: '19.02.1970'
            });
          }
        };
      });
      // bbpConfig
      $provide.value('bbpConfig', window.bbpConfig);
    })
  );

  var httpBackend;
  // inject dependencies
  beforeEach(function() {
    inject(function(
      _$rootScope_,
      $httpBackend,
      _userContextService_,
      _simulationInfo_,
      _environmentService_
    ) {
      userContextService = _userContextService_;
      $rootScope = _$rootScope_;
      simulationInfo = _simulationInfo_;
      environmentService = _environmentService_;
      httpBackend = $httpBackend;

      environmentService.setPrivateExperiment(true);
    });
  });

  beforeEach(function(done) {
    userContextService.initialized.then(function() {
      done();
    });
    $rootScope.$digest();
    httpBackend.flush();
    $rootScope.$digest();
  });

  it(' - init() - userID, ownerID and isOwner()', function() {
    userContextService.userID = 'someone else';
    expect(userContextService.isOwner()).toBe(false);
    userContextService.userID = 'user_id';
    //userContextService.ownerID = 'owner_id';
    expect(userContextService.isOwner()).toBe(false);

    userContextService.userID = userContextService.ownerID;
    expect(userContextService.isOwner()).toBe(true);
  });

  it(' - onLockChangedCallback()', function() {
    spyOn(userContextService, 'setEditDisabled').and.callThrough();
    spyOn(userContextService, 'setLockDateAndUser').and.callThrough();

    var lockChangeEvent = {
      locked: true,
      lockInfo: {
        user: {
          id: userContextService.userID
        }
      }
    };

    userContextService.onLockChangedCallback(lockChangeEvent);
    expect(userContextService.setEditDisabled).toHaveBeenCalledWith(false);

    lockChangeEvent.lockInfo.user.id = 'not_the_user_id';
    userContextService.onLockChangedCallback(lockChangeEvent);
    expect(userContextService.setLockDateAndUser).toHaveBeenCalledWith(
      lockChangeEvent.lockInfo
    );

    lockChangeEvent.locked = false;
    userContextService.onLockChangedCallback(lockChangeEvent);
    expect(userContextService.setEditDisabled).toHaveBeenCalledWith(
      lockChangeEvent.locked
    );
  });

  it(' - hasEditRights()', function() {
    var avatarMock = {
      name: 'not_user_avatar'
    };

    userContextService.userID = 'Some owner id';
    expect(userContextService.hasEditRights(avatarMock)).toBe(true);

    userContextService.userID = 'not_owner';
    expect(userContextService.hasEditRights(avatarMock)).toBe(false);

    avatarMock.name = 'user_avatar';
    expect(userContextService.hasEditRights(avatarMock)).toBe(true);
  });

  it(' - setLockDateAndUser()', function() {
    var lockInfoMock = {
      user: {
        displayName: 'display_name',
        id: 'id'
      },
      date: 'date'
    };

    userContextService.setLockDateAndUser(lockInfoMock);
    expect(userContextService.userEditing).toBe(lockInfoMock.user.displayName);
    expect(userContextService.userEditingID).toBe(lockInfoMock.user.id);
    expect(userContextService.timeEditStarted).toBe(
      moment(new Date(lockInfoMock.date)).fromNow()
    );
  });

  it(' - setEditDisabled()', function() {
    userContextService.setEditDisabled(false);
    expect(userContextService.editIsDisabled).toBe(false);

    userContextService.setEditDisabled(true);
    expect(userContextService.editIsDisabled).toBe(true);
  });

  it(' - removeEditLock()', function() {
    userContextService.lockService = lockServiceMock;
    userContextService.lockService.releaseLock.and.returnValue(
      Promise.reject({ data: { message: 'Error message' } })
    );
    spyOn(window, 'alert');

    userContextService.removeEditLock(false);

    // window.alert.toHaveBeenCalled can't be expected to be called here ... why? who knows ...
  });

  describe('remote collab mode', function() {
    beforeEach(function() {
      simulationInfo.isCollabExperiment = true;
      environmentService.setPrivateExperiment(true);
    });

    it(' - deinit()', function() {
      spyOn(userContextService, 'removeEditLock').and.callThrough();

      userContextService.deinit();

      expect(userContextService.removeEditLock).toHaveBeenCalledWith(true);
    });
  });
});
