'use strict';

describe('Directive: environment-rendering-options', () => {
  beforeEach(() => {
    module('exdFrontendApp');
    module('environmentRenderingModule');
    module('gz3dMock');
  });

  it(
    'onButtonLightIntensity()',
    inject(($compile, $rootScope) => {
      const element = $compile(
        '<environment-rendering-options></environment-rendering-options>'
      )($rootScope);

      $rootScope.$digest();

      const vm = element.scope().vm;
      const gz3d = vm.gz3d;

      gz3d.isGlobalLightMinReached.and.returnValue(false);
      gz3d.isGlobalLightMaxReached.and.returnValue(false);

      // increase
      vm.onButtonLightIntensity(1);
      expect(gz3d.scene.emitter.emit).toHaveBeenCalledWith('lightChanged', 0.1);
      // decrease
      vm.onButtonLightIntensity(-1);
      expect(gz3d.scene.emitter.emit).toHaveBeenCalledWith(
        'lightChanged',
        -0.1
      );

      gz3d.scene.emitter.emit.calls.reset();

      // at max
      gz3d.isGlobalLightMaxReached.and.returnValue(true);
      vm.onButtonLightIntensity(1);
      expect(gz3d.scene.emitter.emit).not.toHaveBeenCalled();
      // at min
      gz3d.isGlobalLightMinReached.and.returnValue(true);
      vm.onButtonLightIntensity(-1);
      expect(gz3d.scene.emitter.emit).not.toHaveBeenCalled();
    })
  );
});
