'use strict';

describe('Service isNotARobotPredicate', function() {
  var isNotARobotPredicate;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(
    inject(function(_isNotARobotPredicate_) {
      isNotARobotPredicate = _isNotARobotPredicate_;
    })
  );

  // Check simulationInfoMock to get the list of defined robot names
  it('should detect a robot entity', function() {
    expect(isNotARobotPredicate({ name: 'robot' })).toBe(false);
  });

  it('should detect non robots entities as such', function() {
    expect(isNotARobotPredicate({ name: 'some entity' })).toBe(true);
    expect(isNotARobotPredicate({ name: 'some robot entity' })).toBe(true);
  });
});
