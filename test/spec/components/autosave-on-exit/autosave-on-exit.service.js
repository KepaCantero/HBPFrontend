'use strict';

describe('Service: autosave-on-exit', function() {
  beforeEach(module('exdFrontendApp'));

  var $q, autosaveOnExitService, userInteractionSettingsService;
  beforeEach(module('userInteractionSettingsServiceMock'));
  beforeEach(
    inject(function(
      _$q_,
      _autosaveOnExitService_,
      _userInteractionSettingsService_
    ) {
      $q = _$q_;
      autosaveOnExitService = _autosaveOnExitService_;
      userInteractionSettingsService = _userInteractionSettingsService_;
    })
  );

  it('should on exit save all settings', function() {
    autosaveOnExitService.saveSettings = jasmine
      .createSpy('saveSettings')
      .and.returnValue($q.when());
    autosaveOnExitService.onExit();
    expect(autosaveOnExitService.saveSettings).toHaveBeenCalled();
  });

  it('should return the settings of the editor', function() {
    autosaveOnExitService.settings = [];
    autosaveOnExitService.settings['faketype'] = 'fakeresult';
    autosaveOnExitService.getEditorSettings();
    expect(autosaveOnExitService.settings['faketype']).toBe('fakeresult');
  });

  it('should set the editor settings', function() {
    autosaveOnExitService.settings = { transferFunctions: { CSVData: true } };
    spyOn(angular, 'isDefined').and.returnValue(true);
    autosaveOnExitService.setEditorSetting(
      'transferFunctions',
      'CSVData',
      false
    );
    expect(autosaveOnExitService.settings.transferFunctions.CSVData).toBe(
      false
    );
    expect(angular.isDefined).toHaveBeenCalled();
  });

  it('should get the editor settings', function() {
    autosaveOnExitService.settings = { transferFunctions: { CSVData: true } };
    spyOn(angular, 'isDefined').and.returnValue(true);
    autosaveOnExitService.getEditorSetting('transferFunctions');
    expect(autosaveOnExitService.settings.transferFunctions.CSVData).toBe(true);
    expect(angular.isDefined).toHaveBeenCalled();
  });

  it('should unregister the save to storage callbacks', function() {
    autosaveOnExitService.registeredSaveToStorageCallbacks[
      'transferFunctions'
    ] =
      'kepyton';
    autosaveOnExitService.unregisterSaveToStorageCallbacks('transferFunctions');
    expect(autosaveOnExitService.registeredSaveToStorageCallbacks).toEqual({});
  });

  it('should save the editor', function() {
    spyOn(window.$q, 'when');
    autosaveOnExitService.settings = { transferFunctions: { CSVData: true } };
    autosaveOnExitService.registeredSaveToStorageCallbacks[
      'transferFunctions'
    ] = { CSVData: () => 'kepyton' };
    autosaveOnExitService.saveEditor('transferFunctions');
    expect(window.$q.when).toHaveBeenCalledWith('kepyton');
  });

  it('should save all editors', function() {
    spyOn(window.$q, 'when');
    autosaveOnExitService.settings = { transferFunctions: { CSVData: true } };
    autosaveOnExitService.registeredSaveToStorageCallbacks[
      'transferFunctions'
    ] = { CSVData: () => 'kepyton' };
    autosaveOnExitService.saveAll();
    expect(window.$q.when).toHaveBeenCalledWith('kepyton');
  });

  it('should on exit save all settings', function() {
    autosaveOnExitService.saveSettings = jasmine
      .createSpy('saveSettings')
      .and.returnValue($q.when());
    autosaveOnExitService.onExit();
    expect(autosaveOnExitService.saveSettings).toHaveBeenCalled();
  });

  it(
    'should on exit save all settings',
    inject($rootScope => {
      autosaveOnExitService.saveSettings();
      $rootScope.$digest();
      expect(userInteractionSettingsService.saveSetting).toHaveBeenCalledWith(
        'autosaveOnExit'
      );
    })
  );

  it(
    'should on update seetings on ENTER_SIMULATION',
    inject($rootScope => {
      autosaveOnExitService.saveSettings();
      $rootScope.$emit('ENTER_SIMULATION');
      $rootScope.$digest();
      expect(userInteractionSettingsService.saveSetting).toHaveBeenCalled();
    })
  );
});
