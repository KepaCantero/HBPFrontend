(function() {
  'use strict';

  describe('Directive: EditorToolbar', function() {

    var $compile, $rootScope, $scope;
    var editorToolbarService, clientLoggerService;
    var element;

    beforeEach(module('editorToolbarModule'));
    beforeEach(module('exd.templates')); // import html template
    beforeEach(module('contextMenuStateServiceMock'));
    beforeEach(module('dynamicViewModule'));

    beforeEach(module('stateServiceMock'));
    beforeEach(module('gz3dMock'));
    beforeEach(module('splashMock'));
    beforeEach(module('backendInterfaceServiceMock'));
    beforeEach(module('objectInspectorServiceMock'));
    beforeEach(module('userNavigationServiceMock'));
    beforeEach(module('userContextServiceMock'));
    beforeEach(module('editorsPanelServiceMock'));
    beforeEach(module('environmentRenderingServiceMock'));
    beforeEach(module('simulationInfoMock'));
    beforeEach(module('videoStreamServiceMock'));
    beforeEach(module('dynamicViewOverlayServiceMock'));
    beforeEach(module('clientLoggerServiceMock'));
    beforeEach(module('gz3dViewsServiceMock'));

    beforeEach(inject(function(_$rootScope_, _$compile_, _editorToolbarService_, _clientLoggerService_) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      editorToolbarService = _editorToolbarService_;
      clientLoggerService = _clientLoggerService_;
    }));

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
}());
