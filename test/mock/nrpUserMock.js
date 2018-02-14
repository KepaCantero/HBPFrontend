(function() {
  'use strict';

  angular.module('nrpUserMock', []).service('nrpUser', [
    '$q',
    function($q) {
      this.getCurrentUser = jasmine
        .createSpy('getCurrentUser')
        .and.returnValue($q.when('theUser'));
      this.getReservation = jasmine.createSpy('getReservation');
      this.isMemberOfClusterReservationGroup = jasmine
        .createSpy('isMemberOfClusterReservationGroup')
        .and.returnValue($q.when(true));
      this.getOwnerDisplayName = jasmine
        .createSpy('getOwnerDisplayName')
        .and.returnValue($q.when('ownerDisplayName'));
      this.getCurrentUserInfo = jasmine
        .createSpy('getCurrentUserInfo')
        .and.returnValue(
          $q.when({ userID: 'theUserID', hasEditRight: true, forceuser: false })
        );
    }
  ]);
})();
