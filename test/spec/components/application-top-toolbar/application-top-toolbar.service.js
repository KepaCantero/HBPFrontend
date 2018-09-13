'use strict';

describe('Controller: ApplicationTopToolbarService', function() {
  let applicationTopToolbarService;

  beforeEach(module('applicationTopToolbarModule'));

  beforeEach(
    inject(function(_applicationTopToolbarService_) {
      applicationTopToolbarService = _applicationTopToolbarService_;
    })
  );

  it(' - isInSimulationView()', function() {
    applicationTopToolbarService.$window = {
      location: {
        href: 'http://not/inside/simulation'
      }
    };
    expect(applicationTopToolbarService.isInSimulationView()).toBe(false);

    applicationTopToolbarService.$window.location.href =
      'http://this/is/an/experiment-view/with/extra';
    expect(applicationTopToolbarService.isInSimulationView()).toBe(true);
  });
});
