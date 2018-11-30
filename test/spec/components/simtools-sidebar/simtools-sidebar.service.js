'use strict';

describe('Service: SimToolsSidebarService', function() {
  let simToolsSidebarService;

  beforeEach(module('simToolsSidebarModule'));

  beforeEach(
    inject(function(_simToolsSidebarService_) {
      simToolsSidebarService = _simToolsSidebarService_;
    })
  );

  it(' - toggleSidebar()', function() {
    let mdSidenavSimTools = {
      toggle: jasmine.createSpy('toggle')
    };
    spyOn(simToolsSidebarService, '$mdSidenav').and.returnValue(
      mdSidenavSimTools
    );
    simToolsSidebarService.toggleSidebar();
    expect(simToolsSidebarService.$mdSidenav).toHaveBeenCalledWith(
      'simtools-sidebar'
    );
    expect(mdSidenavSimTools.toggle).toHaveBeenCalled();
  });

  it(' - isOverflowingY()', function() {
    spyOn(document, 'getElementById').and.returnValue(undefined);
    expect(simToolsSidebarService.isOverflowingY('mockElementID')).toBe(false);

    let mockElement = {
      clientHeight: 10,
      scrollHeight: 20
    };
    document.getElementById.and.returnValue(mockElement);

    expect(simToolsSidebarService.isOverflowingY('mockElementID')).toBe(true);
  });
});
