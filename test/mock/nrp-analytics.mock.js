(function() {
  'use strict';

  angular.module('nrpAnalyticsMock', []).service('nrpAnalytics', function() {
    this.durationEventTrack = jasmine.createSpy('durationEventTrack');
    this.tickDurationEvent = jasmine.createSpy('tickDurationEvent');
    this.eventTrack = jasmine.createSpy('eventTrack');
  });
})();
