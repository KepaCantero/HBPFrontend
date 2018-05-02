(function() {
  'use strict';

  describe('Directive: EditorToolbar', function() {
    var $compile, $rootScope, $scope;
    var element;

    beforeEach(module('tipTooltipModule'));
    beforeEach(module('editorToolbarModule'));
    beforeEach(module('exd.templates')); // import html template
    beforeEach(module('contextMenuStateServiceMock'));
    beforeEach(module('dynamicViewModule'));
    beforeEach(module('exdFrontendApp'));

    beforeEach(module('stateServiceMock'));
    beforeEach(module('gz3dMock'));
    beforeEach(module('splashMock'));
    beforeEach(module('backendInterfaceServiceMock'));
    beforeEach(module('objectInspectorServiceMock'));
    beforeEach(module('performanceMonitorServiceMock'));
    beforeEach(module('userNavigationServiceMock'));
    beforeEach(module('userContextServiceMock'));
    beforeEach(module('editorsPanelServiceMock'));
    beforeEach(module('environmentRenderingServiceMock'));
    beforeEach(module('simulationInfoMock'));
    beforeEach(module('videoStreamServiceMock'));
    beforeEach(module('dynamicViewOverlayServiceMock'));
    beforeEach(module('clientLoggerServiceMock'));
    beforeEach(module('gz3dViewsServiceMock'));
    beforeEach(module('pullForceServiceMock'));

    beforeEach(
      inject(function(_$rootScope_, _$compile_) {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
      })
    );

    beforeEach(function() {
      element = $compile('<editor-toolbar></editor-toolbar>')($rootScope);
      document.createElement('div').appendChild(element[0]);
      $rootScope.$digest();
      $scope = element.scope();
    });

    it('should have a controller defined as vm', function() {
      expect($scope.vm).toBeDefined();
    });
  });
})();
