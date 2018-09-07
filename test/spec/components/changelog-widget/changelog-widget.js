'use strict';

describe('Directive: logAdverts', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates')); // import html template

  var $rootScope, childScope;

  beforeEach(
    inject(function(_$rootScope_, $compile, $httpBackend) {
      $rootScope = _$rootScope_;
      $httpBackend
        .whenGET('package.json')
        .respond(200, JSON.stringify({ version: '1.1' }));
      $compile('<changelog-widget></changelog-widget>')($rootScope);
      $rootScope.$digest();
      childScope = $rootScope.$$childHead;
    })
  );

  it('should be invisible by default', () => {
    expect(childScope.visible).toBe(false);
  });

  it('should become visible when SHOW_CHANGE_LOG event received', () => {
    $rootScope.$emit('SHOW_CHANGE_LOG');
    $rootScope.$digest();
    expect(childScope.visible).toBe(true);
  });

  it('should become invisible when close() is called', () => {
    childScope.visible = true;
    spyOn(localStorage, 'setItem');
    childScope.close();
    expect(childScope.visible).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it(
    `should stay invisible if version matches 'last-shown-changelog-version'`,
    inject($httpBackend => {
      expect(childScope.visible).toBe(false);
      spyOn(localStorage, 'getItem').and.returnValue('1.1');
      $httpBackend.flush();
      expect(childScope.visible).toBe(false);
    })
  );

  it(
    `should become visible if version does not match 'last-shown-changelog-version'`,
    inject($httpBackend => {
      expect(childScope.visible).toBe(false);
      spyOn(localStorage, 'getItem').and.returnValue('1.0');
      $httpBackend.flush();

      expect(childScope.visible).toBe(true);
    })
  );
});
