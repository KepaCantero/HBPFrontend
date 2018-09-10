'use strict';

describe('Controller: ApplicationTopToolbarController', function() {
  let experimentNameController;

  let $controller, $rootScope, $scope;
  let baseEventHandler, clbErrorDialog, simulationInfo, storageServer;

  beforeEach(module('exdFrontendApp'));

  beforeEach(module('baseEventHandlerMock'));
  beforeEach(module('clbErrorDialogMock'));
  beforeEach(module('simulationInfoMock'));
  beforeEach(module('storageServerMock'));

  beforeEach(
    inject(function(
      _$controller_,
      _$rootScope_,
      _$window_,
      _baseEventHandler_,
      _clbErrorDialog_,
      _simulationInfo_,
      _storageServer_
    ) {
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      baseEventHandler = _baseEventHandler_;
      clbErrorDialog = _clbErrorDialog_;
      simulationInfo = _simulationInfo_;
      storageServer = _storageServer_;
    })
  );

  beforeEach(function() {
    $scope = $rootScope.$new();
    experimentNameController = $controller('ExperimentNameController', {
      $rootScope: $rootScope,
      $scope: $scope
    });
  });

  it(' - constructor()', function() {
    expect(experimentNameController.experimentName).toBe(
      simulationInfo.experimentDetails.name
    );
    expect(experimentNameController.experimentID).toBe(
      simulationInfo.experimentID
    );
    expect(experimentNameController.editing).toBe(false);
    expect(experimentNameController.isEditable).toBe(true);
  });

  it(' - onEditExperimentName()', function() {
    spyOn(experimentNameController, 'startEditExperimentName');

    experimentNameController.onEditExperimentName();
    expect(experimentNameController.startEditExperimentName).toHaveBeenCalled();
  });

  it(' - startEditExperimentName()', function() {
    expect(experimentNameController.originalName).not.toBeDefined();
    experimentNameController.startEditExperimentName();
    expect(experimentNameController.originalName).toBe(
      experimentNameController.experimentName
    );
    expect(experimentNameController.editing).toBe(true);
  });

  it(' - stopEditExperimentName()', function() {
    spyOn(experimentNameController, 'saveExperimentName');
    experimentNameController.originalName = 'original_name';
    experimentNameController.experimentName = 'new_name';

    experimentNameController.stopEditExperimentName();

    expect(experimentNameController.saveExperimentName).toHaveBeenCalled();
    expect(experimentNameController.editing).toBe(false);
  });

  it(' - saveExperimentName(), storageServer.setFileContent() successful', function() {
    let mockExperimentConfig = {
      data: 'original_name'
    };
    storageServer.getFileContent.and.returnValue({
      then: callback => {
        callback(mockExperimentConfig);
      }
    });

    let setFileContentSuccessful = true;
    storageServer.setFileContent.and.returnValue({
      then: (callbackSuccess, callbackFailure) => {
        if (setFileContentSuccessful) {
          callbackSuccess();
        } else {
          callbackFailure();
        }
      }
    });

    experimentNameController.originalName = 'original_name';
    experimentNameController.experimentName = 'new_name';

    experimentNameController.saveExperimentName();
    expect(storageServer.getFileContent).toHaveBeenCalled();
    expect(storageServer.setFileContent).toHaveBeenCalledWith(
      experimentNameController.experimentID,
      'experiment_configuration.exc',
      'new_name',
      true
    );
  });

  it(' - saveExperimentName(), storageServer.setFileContent() fails', function() {
    let mockExperimentConfig = {
      data: 'original_name'
    };
    storageServer.getFileContent.and.returnValue({
      then: callback => {
        callback(mockExperimentConfig);
      }
    });

    let setFileContentSuccessful = false;
    storageServer.setFileContent.and.returnValue({
      then: (callbackSuccess, callbackFailure) => {
        if (setFileContentSuccessful) {
          callbackSuccess();
        } else {
          callbackFailure();
        }
      }
    });

    experimentNameController.originalName = 'original_name';
    experimentNameController.experimentName = 'new_name';

    experimentNameController.saveExperimentName();
    expect(storageServer.getFileContent).toHaveBeenCalled();
    expect(storageServer.setFileContent).toHaveBeenCalledWith(
      experimentNameController.experimentID,
      'experiment_configuration.exc',
      'new_name',
      true
    );
    expect(clbErrorDialog.open).toHaveBeenCalled();
  });

  it(' - onKeyDown()', function() {
    spyOn(experimentNameController, 'suppressKeyPress');

    experimentNameController.onKeyDown();

    expect(experimentNameController.suppressKeyPress).toHaveBeenCalled();
  });

  it(' - suppressKeyPress()', function() {
    let mockEvent = {};
    experimentNameController.suppressKeyPress(mockEvent);

    expect(baseEventHandler.suppressAnyKeyPress).toHaveBeenCalledWith(
      mockEvent
    );
  });

  it(' - isNameOverflowing()', function() {
    let mockElement = {
      clientWidth: 9,
      scrollWidth: 10,
      style: {
        overflow: 'hidden'
      }
    };
    spyOn(document, 'getElementById').and.returnValue(mockElement);

    expect(experimentNameController.isNameOverflowing()).toBe(true);

    mockElement.clientWidth = 11;
    expect(experimentNameController.isNameOverflowing()).toBe(false);
  });
});
