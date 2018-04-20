/**
 * Make sure that debugging information is availbakle in the unit testing
 */
(function() {
  'use strict';

  beforeEach(module('exd.templates')); // import html template
  beforeEach(module('$windowMock'));

  angular
    .module('exdFrontendApp')
    .config([
      '$compileProvider',
      '$logProvider',
      function($compileProvider, $logProvider) {
        $compileProvider.debugInfoEnabled(true);
        $logProvider.debugEnabled(true);
      }
    ])
    .run([
      '$httpBackend',
      '$q',
      function($httpBackend, $q) {
        window.$q = $q;

        if (!$httpBackend.whenGET) {
          return;
        }

        $httpBackend.whenGET(/\/identity\/?[^/]*$/).respond({
          id: 'vonarnim',
          username: 'cmartins',
          displayName: 'Claudio Sousa'
        });

        $httpBackend
          .whenGET(/\/api\/identity\/me\/groups$/)
          .respond({ result: ['hbp-sp10-user-edit-rights'] });
        $httpBackend.whenGET('views/common/home.html').respond(200);
      }
    ]);
})();
