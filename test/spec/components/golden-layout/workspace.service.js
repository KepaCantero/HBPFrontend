'use strict';

describe('Service: GoldenLayoutService', function() {
  let workspaceService;

  let $mdPanel;

  beforeEach(function() {
    module('goldenLayoutModule');

    //mocks
    module('$mdPanelMock');
  });

  beforeEach(
    inject(function(_$mdPanel_, _workspaceService_) {
      $mdPanel = _$mdPanel_;

      workspaceService = _workspaceService_;
    })
  );

  it(' - openConfigPanel()', function() {
    let event = {
      currentTarget: {
        id: 'event-id'
      }
    };

    workspaceService.openConfigPanel(event);

    expect($mdPanel.open).toHaveBeenCalled();
    expect(workspaceService.panel).toBe($mdPanel.panel);
  });

  it(' - closeConfigPanel()', function() {
    workspaceService.panel = {
      close: jasmine.createSpy('close')
    };
    workspaceService.closeConfigPanel();

    expect(workspaceService.panel.close).toHaveBeenCalled();
  });
});
