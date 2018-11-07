'use strict';

describe('Service isARobotPredicate', function() {
  var isARobotPredicate;

  beforeEach(module('exdFrontendApp'));
  beforeEach(module('sceneInfoMock'));
  beforeEach(
    inject(function(_isARobotPredicate_) {
      isARobotPredicate = _isARobotPredicate_;
    })
  );

  // Check simulationInfoMock to get the list of defined robot names
  it('should detect a robot entity', function() {
    expect(isARobotPredicate({ name: 'robot' })).toBe(true);
  });

  it('should detect non robots entities as such', function() {
    expect(isARobotPredicate({ name: 'some entity' })).toBe(false);
    expect(isARobotPredicate({ name: 'some robot entity' })).toBe(false);
  });
});
