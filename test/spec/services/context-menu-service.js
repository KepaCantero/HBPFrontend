'use strict';

describe('Services: contextMenuState', function() {
  var contextMenuState, gz3d;
  var dummyModel, dummyItemGroup;
  var gzInitializationMock = {};
  gzInitializationMock.Initialize = jasmine.createSpy('Initialize');
  gzInitializationMock.deInitialize = jasmine.createSpy('deInitialize');

  //mock gz3d
  beforeEach(
    module(function($provide) {
      $provide.value('gz3d', gzInitializationMock);

      gzInitializationMock.Initialize.calls.reset();
      gzInitializationMock.deInitialize.calls.reset();
    })
  );

  // excuted before each "it" is run.
  beforeEach(function() {
    // load the module.
    module('contextMenuStateService');

    // inject service for testing.
    inject(function(_contextMenuState_, _gz3d_) {
      contextMenuState = _contextMenuState_;
      gz3d = _gz3d_;
    });

    gz3d.scene = {};
    gz3d.scene.radialMenu = {};
    gz3d.scene.radialMenu.showing = false;

    dummyModel = { name: 'dummyModel' };

    dummyItemGroup = {
      label: 'Sample',
      visible: false,
      items: [
        {
          text: 'sampleButton1',
          callback: function() {
            return true;
          },
          visible: true
        }
      ],
      show: function() {
        this.visible = true;
        return true;
      }
    };
  });

  // check to see if it has the expected function
  it('should have an toggleContextMenu function', function() {
    expect(angular.isFunction(contextMenuState.toggleContextMenu)).toBe(true);
  });

  it('should hide menu when calling toggleContextMenu(false)', function() {
    spyOn(contextMenuState, 'hideMenu').and.callThrough();

    contextMenuState.toggleContextMenu(false);

    expect(contextMenuState.hideMenu).toHaveBeenCalled();
    expect(contextMenuState.isShown).toBe(false);
    expect(gz3d.scene.radialMenu.showing).toBe(false);
  });

  it('should show menu when calling toggleContextMenu(true)', function() {
    contextMenuState.pushItemGroup(dummyItemGroup); //add a menuItem

    var dummyEvent = {
      clientX: 0,
      clientY: 0,
      view: { innerWidth: 1024, innerHeight: 800 }
    };

    spyOn(contextMenuState, '_getModelUnderMouse').and.returnValue(dummyModel);

    gz3d.scene.selectEntity = jasmine.createSpy('selectEntity');

    spyOn(document, 'getElementById').and.callFake(function() {
      var newElement = document.createElement('div');
      newElement.style.width = '200px';
      newElement.style.height = '200px';
      document.body.appendChild(newElement);

      return newElement;
    });

    //call the function under test
    contextMenuState.toggleContextMenu(true, dummyEvent);

    expect(gz3d.scene.selectEntity).toHaveBeenCalled();
    expect(contextMenuState.isShown).toBe(true);
    expect(gz3d.scene.radialMenu.showing).toBe(true);

    expect(contextMenuState.contextMenuTop).toBe(dummyEvent.offsetY);
    expect(contextMenuState.contextMenuLeft).toBe(dummyEvent.offsetX);
  });

  it('should align menu when near the right/bottom of container', function() {
    contextMenuState.pushItemGroup(dummyItemGroup); //add a menuItem

    var dummyEvent = {
      offsetX: 0,
      offsetY: 0,
      view: { innerWidth: 0, innerHeight: 0 }
    };

    spyOn(contextMenuState, '_getModelUnderMouse').and.returnValue(dummyModel);

    gz3d.scene.selectEntity = jasmine.createSpy('selectEntity');

    spyOn(document, 'getElementById').and.callFake(function() {
      var newElement = document.createElement('div');
      newElement.style.width = '200px';
      newElement.style.height = '200px';
      document.body.appendChild(newElement);

      return newElement;
    });

    //call the function under test
    contextMenuState.toggleContextMenu(true, dummyEvent);

    expect(contextMenuState.contextMenuTop).toBe(-200);
    expect(contextMenuState.contextMenuLeft).toBe(-200);
  });

  it('should get the model under the current mouse position', function() {
    gz3d.scene.getRayCastModel = jasmine.createSpy('getRayCastModel');
    spyOn(contextMenuState, 'axisSelected').and.returnValue(false);
    var event = { clientX: 10, clientY: 10 };
    contextMenuState._getModelUnderMouse(event);
    expect(gz3d.scene.getRayCastModel).toHaveBeenCalled();
  });
});
