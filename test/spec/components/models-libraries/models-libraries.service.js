'use strict';

describe('Services: modelsLibraries', function() {
  var modelsLibrariesService,
    $q,
    newExperimentProxyService,
    $rootScope,
    storageServer;
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('modelsLibraries'));
  beforeEach(module('storageServerMock'));

  beforeEach(
    inject(function(
      _nrpUser_,
      _modelsLibrariesService_,
      _$q_,
      _newExperimentProxyService_,
      _$rootScope_,
      _storageServer_
    ) {
      modelsLibrariesService = _modelsLibrariesService_;
      $q = _$q_;
      newExperimentProxyService = _newExperimentProxyService_;
      $rootScope = _$rootScope_;
      storageServer = _storageServer_;
    })
  );

  it('should generate all the models correctly', () => {
    const templateModels = {
      data: [
        {
          description:
            'Modified Hollie arm model for force based index finger movements.↵      In contrast to the first Hollie arm model it was required to remove the↵      PID control of the index finger joints to allow force control for this↵      particular finger.',
          id: 'arm_robot_force',
          maturity: 'production',
          name: 'Arm robot force based version',
          path: 'arm_robot_force / model.config',
          sdf: 'arm_robot_force.sdf',
          thumbnail: 'thumbnail.png'
        },
        {
          description:
            'Model of an idustrial arm and hand robot.↵        The arm: Schunk Powerball Lightweight Arm LWA 4P↵        The hand: Schunk SVH 5-finger hand.',
          id: 'arm_robot',
          maturity: 'development',
          name: 'Arm robot',
          path: 'arm_robot/model.config',
          sdf: 'arm_robot.sdf',
          thumbnail: 'thumbnail.png'
        }
      ]
    };

    spyOn(newExperimentProxyService, 'getTemplateModels').and.returnValue(
      $q.resolve(templateModels)
    );
    modelsLibrariesService.generateModels('robots').then(res => {
      expect(res[0].sdf).toBe(templateModels.data[0].sdf);
      expect(res[2].path).toBe('robots%2Fp3dx.zip');
      expect(newExperimentProxyService.getTemplateModels).toHaveBeenCalledWith(
        'robots'
      );
      expect(storageServer.getCustomModels).toHaveBeenCalledWith('robots');
    });
    $rootScope.$apply();
  });

  it('should generate all the models correctly', () => {
    modelsLibrariesService.getCustomModels('robots').then(res => {
      expect(res[0].path).toBe('robots%2Fp3dx.zip');
      expect(storageServer.getAllCustomModels).toHaveBeenCalledWith('robots');
    });
    $rootScope.$apply();
  });

  it('should set a custom model correctly', () => {
    modelsLibrariesService
      .setCustomModel('p3dx.zip', 'robots', 'fakeContent')
      .then(() =>
        expect(storageServer.setCustomModel).toHaveBeenCalledWith(
          'p3dx.zip',
          'robots',
          'fakeContent'
        )
      );
    $rootScope.$apply();
  });

  it('should delete a custom model correctly', () => {
    modelsLibrariesService
      .deleteCustomModel('/robots%2Fp3dx.zip')
      // uri gets decoded
      .then(() =>
        expect(storageServer.deleteCustomModel).toHaveBeenCalledWith(
          '/robots/p3dx.zip'
        )
      );
    $rootScope.$apply();
  });

  it('should get the config of a robot correctly', () => {
    expect(modelsLibrariesService.getRobotConfig({ id: 'p3dx' })).toBe(
      'http://proxy/models/robots/p3dx/config'
    );
  });
});
