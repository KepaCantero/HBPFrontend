'use strict';

describe('Panel directives', function() {
  var PANEL_DIRECTIVES = [
    'brainvisualizer-panel',
    'editor-panel',
    'environment-settings-panel'
  ];
  var $rootScope, $compile, httpBackend;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('gz3dMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('userInteractionSettingsServiceMock'));
  beforeEach(module('sceneInfoMock'));
  beforeEach(
    inject(function(_$rootScope_, _$compile_, _$httpBackend_) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;

      httpBackend = _$httpBackend_;
      httpBackend.whenGET(new RegExp('.*')).respond('');
    })
  );

  it('should create child scope', function() {
    PANEL_DIRECTIVES.forEach(function(directive) {
      var directiveScope = $rootScope.$new();
      expect(directiveScope.$$childTail).toBe(null);
      $compile('<' + directive + '/>')(directiveScope);
      directiveScope.$digest();
      expect(directiveScope.$$childTail).toBeDefined();
    });
  });
});
