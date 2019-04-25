'use strict';

describe('Services: userInteractionSettingsService', function() {
  let userInteractionSettingsService;

  let CAMERA_SENSITIVITY_RANGE, UIS_DEFAULTS;
  let simulationConfigService, simulationInfo, storageServer;

  beforeEach(module('userInteractionModule'));
  beforeEach(module('userNavigationModule'));

  beforeEach(module('autoSaveFactoryMock'));
  beforeEach(module('nrpUserMock'));
  beforeEach(module('simulationConfigServiceMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('storageServerMock'));
  beforeEach(module('userContextServiceMock'));

  beforeEach(function() {});

  beforeEach(function() {
    // inject service for testing.
    inject(function(
      _userInteractionSettingsService_,
      _CAMERA_SENSITIVITY_RANGE_,
      _UIS_DEFAULTS_,
      _nrpUser_,
      _simulationConfigService_,
      _simulationInfo_,
      _storageServer_
    ) {
      userInteractionSettingsService = _userInteractionSettingsService_;

      CAMERA_SENSITIVITY_RANGE = _CAMERA_SENSITIVITY_RANGE_;
      UIS_DEFAULTS = _UIS_DEFAULTS_;
      simulationConfigService = _simulationConfigService_;
      simulationInfo = _simulationInfo_;
      storageServer = _storageServer_;
    });
  });

  it(' - loadSettings()', function() {
    spyOn(
      userInteractionSettingsService,
      'clampCameraSensitivity'
    ).and.callThrough();

    // mock config file
    let mockConfig =
      '{"camera": {"sensitivity": {"translation": 0.1, "rotation": 1.2}}}';
    let mockConfigPromise = {
      then: jasmine.createSpy('then').and.callFake(function(cb) {
        cb(mockConfig);
        return mockConfigPromise;
      }),
      catch: jasmine.createSpy('catch').and.callFake(function() {
        return mockConfigPromise;
      }),
      finally: jasmine.createSpy('finally').and.callFake(function(cb) {
        cb();
        return mockConfigPromise;
      })
    };
    simulationConfigService.loadConfigFile = jasmine
      .createSpy('loadConfigFile')
      .and.returnValue(mockConfigPromise);

    // mock config filename
    /*eslint-disable camelcase*/
    let mockFilename = {
      file: 'mock-config.uis',
      file_offset: 0
    };
    /*eslint-enable camelcase*/
    simulationConfigService.getBackendConfigFileNames.and.returnValue({
      then: jasmine.createSpy('then').and.callFake(cb => {
        cb(mockFilename);
      })
    });

    // mock exc file content
    let mockExcContent = {
      data: '<ExD></ExD>'
    };
    storageServer.getFileContent.and.returnValue({
      then: jasmine.createSpy('then').and.callFake(cb => {
        cb(mockExcContent);
      })
    });

    userInteractionSettingsService.loadSettings();
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.translation
    ).toBe(0.1);
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.rotation
    ).toBe(1.2);

    // test config above max values
    mockConfig =
      '{"camera": {"sensitivity": {"translation": ' +
      (CAMERA_SENSITIVITY_RANGE.TRANSLATION_MAX + 1.234) +
      ', "rotation": ' +
      (CAMERA_SENSITIVITY_RANGE.ROTATION_MAX + 2.345) +
      '}}}';
    userInteractionSettingsService.loadSettings();
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.translation
    ).toBe(CAMERA_SENSITIVITY_RANGE.TRANSLATION_MAX);
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.rotation
    ).toBe(CAMERA_SENSITIVITY_RANGE.ROTATION_MAX);

    // test config below min values
    mockConfig =
      '{"camera": {"sensitivity": {"translation": ' +
      (CAMERA_SENSITIVITY_RANGE.TRANSLATION_MIN - 0.01) +
      ', "rotation": ' +
      (CAMERA_SENSITIVITY_RANGE.ROTATION_MIN - 0.02) +
      '}}}';
    userInteractionSettingsService.loadSettings();
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.translation
    ).toBe(CAMERA_SENSITIVITY_RANGE.TRANSLATION_MIN);
    expect(
      userInteractionSettingsService.settingsData.camera.sensitivity.rotation
    ).toBe(CAMERA_SENSITIVITY_RANGE.ROTATION_MIN);

    // test error/catch case
    mockConfigPromise.catch.and.callFake(function(cb) {
      cb();
      return mockConfigPromise;
    });
    userInteractionSettingsService.loadSettings();
    expect(userInteractionSettingsService.settingsData).toEqual(UIS_DEFAULTS);
  });

  it(' - saveSettings()', function() {
    /*simulationConfigService.saveConfigFile = jasmine
      .createSpy('saveConfigFile')
      .and.returnValue(window.$q.resolve(mockConfig));*/
    userInteractionSettingsService.configFilename = 'testConfig.uis';
    userInteractionSettingsService.settingsData = UIS_DEFAULTS;
    userInteractionSettingsService.saveSettings();

    expect(storageServer.setFileContent).toHaveBeenCalledWith(
      simulationInfo.experimentID,
      userInteractionSettingsService.configFilename,
      jasmine.any(String),
      false
    );
  });

  it(' - GETTER settings()', function(done) {
    expect(userInteractionSettingsService.settingsData).not.toBeDefined();
    spyOn(userInteractionSettingsService, 'loadSettings').and.returnValue({
      then: jasmine.createSpy('then').and.callFake(function(cb) {
        cb();
      })
    });

    userInteractionSettingsService.settings.then(() => {
      expect(userInteractionSettingsService.loadSettings).toHaveBeenCalled();

      userInteractionSettingsService.settingsData = UIS_DEFAULTS;
      userInteractionSettingsService.loadSettings.calls.reset();
      userInteractionSettingsService.settings.then(function(settings) {
        expect(settings).toBe(UIS_DEFAULTS);
        expect(
          userInteractionSettingsService.loadSettings
        ).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it(' - persistToFile()', function(done) {
    let mockData = {
      a: true,
      b: 'true',
      c: 1
    };
    simulationConfigService.saveConfigFile.and.returnValue({
      then: jasmine.createSpy('then').and.callFake(cb => {
        cb();
      })
    });

    userInteractionSettingsService._persistToFile(mockData);

    expect(userInteractionSettingsService.lastSavedSettingsData.a).toBe(
      mockData.a
    );
    expect(userInteractionSettingsService.lastSavedSettingsData.b).toBe(
      mockData.b
    );
    expect(userInteractionSettingsService.lastSavedSettingsData.c).toBe(
      mockData.c
    );

    done();
  });

  it(' - saveSetting(), with specific types', function(done) {
    spyOn(userInteractionSettingsService, '_persistToFile');
    userInteractionSettingsService.lastSavedSettingsData = {};
    userInteractionSettingsService.settingsData = {
      typeA: true,
      typeB: 'true',
      typeC: 1
    };

    userInteractionSettingsService.saveSetting('typeA', 'typeB');

    expect(userInteractionSettingsService._persistToFile).toHaveBeenCalledWith({
      typeA: true,
      typeB: 'true'
    });

    done();
  });

  it('should define proper autoSaveService', function() {
    expect(userInteractionSettingsService.autoSaveService).toBeDefined();

    spyOn(userInteractionSettingsService, 'saveSettings');
    let callbackOnSave = userInteractionSettingsService.autoSaveService.onsave.calls.mostRecent()
      .args[0];
    callbackOnSave();
    expect(userInteractionSettingsService.saveSettings).toHaveBeenCalled();
  });

  it('GETTER workspaces()', function(done) {
    userInteractionSettingsService.settingsData = {};

    userInteractionSettingsService.workspaces.then(workspaces => {
      expect(workspaces).toBe(
        userInteractionSettingsService.settingsData.workspaces
      );
      expect(workspaces.custom).toEqual([]);
      done();
    });
  });

  it('saveCustomWorkspace() - new workspace', function(done) {
    userInteractionSettingsService.settingsData = {};

    // save new workspace
    let name = 'MyWorkspace',
      config = {};
    userInteractionSettingsService
      .saveCustomWorkspace(name, config)
      .then(() => {
        let customWorkspaces =
          userInteractionSettingsService.settingsData.workspaces.custom;
        expect(customWorkspaces.length).toBe(1);
        expect(customWorkspaces).toContain({
          id: name.toLowerCase(),
          name: name,
          layout: config
        });
        expect(
          userInteractionSettingsService.autoSaveService.setDirty
        ).toHaveBeenCalled();

        // overwrite existing workspace
        config = { element: [] };
        userInteractionSettingsService
          .saveCustomWorkspace(name, config)
          .then(() => {
            let customWorkspaces =
              userInteractionSettingsService.settingsData.workspaces.custom;
            expect(customWorkspaces.length).toBe(1);
            expect(customWorkspaces[0].layout).toBe(config);
            expect(
              userInteractionSettingsService.autoSaveService.setDirty
            ).toHaveBeenCalled();

            done();
          });
      });
  });

  it('deleteCustomWorkspace()', function(done) {
    userInteractionSettingsService.settingsData = {
      workspaces: {
        custom: [{ id: 'my-other-workspace' }]
      }
    };

    let customWorkspaces =
      userInteractionSettingsService.settingsData.workspaces.custom;

    // no editing rights

    // try to delete non-existing workspace
    let id = 'my-workspace';
    userInteractionSettingsService.deleteCustomWorkspace(id).then(() => {
      expect(customWorkspaces.length).toBe(1);
      expect(
        userInteractionSettingsService.autoSaveService.setDirty
      ).not.toHaveBeenCalled();

      // delete existing workspace
      id = 'my-other-workspace';
      userInteractionSettingsService.deleteCustomWorkspace(id).then(() => {
        expect(customWorkspaces.length).toBe(0);
        expect(
          userInteractionSettingsService.autoSaveService.setDirty
        ).toHaveBeenCalled();

        done();
      });
    });
  });

  it('autosaveLayout()', function(done) {
    let layout = { id: 'my-workspace', config: {} };
    userInteractionSettingsService.settingsData = {
      workspaces: {
        autosave: { id: 'my-workspace', config: {} }
      }
    };

    // try autosave for unchanged layout
    userInteractionSettingsService.autosaveLayout(layout).then(() => {
      expect(
        userInteractionSettingsService.autoSaveService.setDirty
      ).not.toHaveBeenCalled();

      // autosave changed layout
      layout.id = 'changed-workspace';
      userInteractionSettingsService.autosaveLayout(layout).then(() => {
        expect(
          userInteractionSettingsService.settingsData.workspaces.autosave
        ).toEqual(layout);
        expect(
          userInteractionSettingsService.autoSaveService.setDirty
        ).toHaveBeenCalled();

        done();
      });
    });
  });

  it('addUISConfigFileReference()', function() {
    let mockExcContent = {
      data: '<ExD><configuration type="3d-settings"/></ExD>'
    };
    storageServer.getFileContent.and.returnValue({
      then: jasmine.createSpy('then').and.callFake(cb => {
        cb(mockExcContent);
      })
    });
    let filename = 'test-config.uis';
    let expectedNewExcContent =
      '<ExD><configuration type="3d-settings"/>\n  <configuration type="' +
      userInteractionSettingsService.configType +
      '" src="' +
      filename +
      '"/></ExD>';

    userInteractionSettingsService.addUISConfigFileReference(filename);

    expect(storageServer.setFileContent).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.any(String),
      expectedNewExcContent,
      true
    );
  });

  it('createUISConfigFile()', function() {
    let fileExists = true;
    simulationConfigService.doesConfigFileExist = jasmine
      .createSpy('doesConfigFileExist')
      .and.returnValue({
        then: jasmine.createSpy('then').and.callFake(cb => {
          cb(fileExists);
        })
      });
    let filename = 'test-config.uis';

    // test for already existing file
    userInteractionSettingsService.createUISConfigFile(filename);
    expect(storageServer.setFileContent).not.toHaveBeenCalled();

    // test for non-existing file
    fileExists = false;
    userInteractionSettingsService.settingsData = UIS_DEFAULTS;
    userInteractionSettingsService.createUISConfigFile(filename);
    expect(storageServer.setFileContent).toHaveBeenCalledWith(
      jasmine.any(String),
      filename,
      jasmine.any(String),
      false
    );
  });
});
