'use strict';

describe('Service: auto-save.factory', function() {
  beforeEach(module('exdFrontendApp'));

  let autoSaveFactory, $rootScope;
  beforeEach(
    inject((_autoSaveFactory_, _$rootScope_) => {
      autoSaveFactory = _autoSaveFactory_;
      $rootScope = _$rootScope_;
    })
  );

  it('should call callbacks on saving', function() {
    let savecb = jasmine.createSpy('savecb').and.returnValue(window.$q.when());
    let onsaving = jasmine
      .createSpy('saving')
      .and.returnValue(window.$q.when());

    autoSaveFactory.onSaving(onsaving);
    let service = autoSaveFactory.createService('test');
    service.onsave(savecb);

    service.setDirty();

    service.saveDebounced.flush();

    $rootScope.$digest();
    expect(savecb).toHaveBeenCalled();
    expect(onsaving).toHaveBeenCalled();
  });

  it('should hook page unload', function() {
    let savecb = jasmine.createSpy('savecb').and.returnValue(window.$q.when());

    let service = autoSaveFactory.createService('test');
    service.onsave(savecb);

    let res = autoSaveFactory.hookPageUnload({});

    expect(res).toBeUndefined();

    service.setDirty();
    res = autoSaveFactory.hookPageUnload({});
    expect(res).toBe(
      'Saving in progress. PLease wait a few seconds before exiting.'
    );
  });
});
