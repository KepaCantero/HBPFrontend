'use strict';

describe('Service: dynamicViewOverlayService', function() {
  var $q, $rootScope;
  var dynamicViewOverlayService, nrpAnalytics;

  var TEST_DUMMY = {
    name: 'TEST',
    directive: 'test',
    isResizeable: false, // default true
    allowMultipleViews: false // default true
  };
  var TEST_DUMMY_MULTI_VIEW = {
    name: 'TEST',
    directive: 'test'
  };

  beforeEach(module('exd.templates'));
  beforeEach(module('dynamicViewOverlayModule'));
  beforeEach(module('nrpAnalyticsMock'));

  beforeEach(
    inject(function(
      _$q_,
      _$rootScope_,
      _dynamicViewOverlayService_,
      _nrpAnalytics_
    ) {
      $q = _$q_;
      $rootScope = _$rootScope_;
      dynamicViewOverlayService = _dynamicViewOverlayService_;
      nrpAnalytics = _nrpAnalytics_;
    })
  );

  it(' - constructor()', function() {
    expect(Object.keys(dynamicViewOverlayService.overlays).length).toBe(0);
    expect(dynamicViewOverlayService.overlayIDCount).toBe(0);
  });

  it(' - OVERLAY_WRAPPER_CLASS_SELECTOR (getter)', function() {
    expect(dynamicViewOverlayService.OVERLAY_WRAPPER_CLASS).toBe(
      'dynamic-view-overlay-wrapper'
    );
  });

  it(' - DYNAMIC_VIEW_CONTAINER_CLASS (getter)', function() {
    expect(dynamicViewOverlayService.DYNAMIC_VIEW_CONTAINER_CLASS).toBe(
      'dynamic-view-container'
    );
  });

  it(' - createOverlay()', function() {
    var defferedOverlayController = $q.defer();
    spyOn(dynamicViewOverlayService, 'getController').and.returnValue(
      defferedOverlayController.promise
    );
    // set up overlay controller mock
    var mockOverlayController = {
      setDynamicViewChannel: jasmine.createSpy('setDynamicViewChannel'),
      adjustSizeToContent: jasmine.createSpy('adjustSizeToContent')
    };

    var idCount = 5;
    var htmlID = 'dynamic-view-overlay-' + idCount;
    dynamicViewOverlayService.overlayIDCount = idCount;
    var parentElement = document.createElement('div');
    var channel = {
      name: 'Test Channel',
      directive: 'test-channel'
    };

    var overlay = dynamicViewOverlayService.createOverlay(
      channel,
      parentElement
    );

    defferedOverlayController.resolve(mockOverlayController);
    $rootScope.$digest();

    // check id is set correctly
    expect(overlay[0].id).toBe('dynamic-view-overlay-' + idCount);
    expect(dynamicViewOverlayService.overlays[htmlID]).toBe(overlay);
    expect(dynamicViewOverlayService.overlayIDCount).toBe(idCount + 1);

    expect(overlay[0].parentElement).toBe(parentElement);
    expect(mockOverlayController.setDynamicViewChannel).toHaveBeenCalledWith(
      channel
    );

    // check on destroy
    overlay.scope().$destroy();
    expect(nrpAnalytics.eventTrack).toHaveBeenCalledWith(
      'Toggle-' + channel.directive,
      {
        category: 'Simulation-GUI',
        value: false
      }
    );

    overlay.remove();
  });

  it(' - createOverlay(), no parentElement specified', function() {
    var mockParent = document.createElement('div');
    spyOn(
      dynamicViewOverlayService,
      'getOverlayParentElement'
    ).and.returnValue([mockParent]);

    var channelName = 'test-component';
    var overlay = dynamicViewOverlayService.createOverlay(channelName);
    // should be attached to document
    expect(overlay[0].parentElement).toBe(mockParent);
    overlay.remove();
    //dynamicViewOverlayService.removeOverlay(overlay[0].id);
  });

  it(' - removeOverlay()', function() {
    var mockID = 'test-id';
    var mockOverlayElement = {
      remove: jasmine.createSpy('remove')
    };
    dynamicViewOverlayService.overlays[mockID] = mockOverlayElement;
    spyOn(document, 'getElementById').and.returnValue(mockOverlayElement);

    dynamicViewOverlayService.removeOverlay(mockID);

    expect(document.getElementById).toHaveBeenCalledWith(mockID);
    expect(mockOverlayElement.remove).toHaveBeenCalled();
    expect(dynamicViewOverlayService.overlays[mockID]).not.toBeDefined();
  });

  it(' - closeAllOverlaysOfType()', function() {
    var defferedOverlayController = $q.defer();
    spyOn(dynamicViewOverlayService, 'getController').and.returnValue(
      defferedOverlayController.promise
    );
    // set up overlay controller mock
    var channelType = 'test-channel';
    var mockOverlayController = {
      channelType: channelType,
      closeOverlay: jasmine.createSpy('closeOverlay')
    };
    dynamicViewOverlayService.overlays['test-overlay'] = {};

    dynamicViewOverlayService.closeAllOverlaysOfType(channelType);
    expect(dynamicViewOverlayService.getController).toHaveBeenCalled();

    defferedOverlayController.resolve(mockOverlayController);
    $rootScope.$digest();
    expect(mockOverlayController.closeOverlay).toHaveBeenCalled();
  });

  it(' - applyAttributesToOverlay()', function() {
    var overlayWrapperMock = { setAttribute: function() {}, style: {} };
    var channelAttrMock = {
      isResizeable: false, // default true
      maxWidth: 100,
      maxHeight: 100,
      overflowX: 'auto',
      overflowY: 'auto'
    };

    dynamicViewOverlayService.applyAttributesToOverlay(
      overlayWrapperMock,
      channelAttrMock
    );

    expect(overlayWrapperMock.style.maxWidth).toBe(100);
  });

  it(' - getOverlayParentElement()', function() {
    spyOn(angular, 'element').and.callThrough();
    dynamicViewOverlayService.getOverlayParentElement();
    expect(angular.element).toHaveBeenCalledWith(
      dynamicViewOverlayService.OVERLAY_PARENT_SELECTOR
    );
  });

  it(' - getParentOverlayWrapper()', function() {
    var parentsArray = [{}, {}, {}];
    var mockElement = {
      parents: jasmine.createSpy('parents').and.returnValue(parentsArray)
    };

    var result = dynamicViewOverlayService.getParentOverlayWrapper(mockElement);
    expect(mockElement.parents).toHaveBeenCalledWith(
      '.' + dynamicViewOverlayService.OVERLAY_WRAPPER_CLASS
    );
    expect(result).toBe(parentsArray[0]);
  });

  it('should create a dynamic overlay for the given component', function() {
    spyOn(dynamicViewOverlayService, 'createOverlay');
    // fake no view open
    dynamicViewOverlayService.isOverlayOpen = jasmine
      .createSpy('isOverlayOpen')
      .and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          return fn(false);
        })
      });

    dynamicViewOverlayService.createDynamicOverlay(TEST_DUMMY);

    expect(dynamicViewOverlayService.createOverlay).toHaveBeenCalled();
  });

  it('should not create a dynamic overlay for the given component if it is already created', function() {
    spyOn(dynamicViewOverlayService, 'createOverlay');

    // fake view open
    dynamicViewOverlayService.isOverlayOpen = jasmine
      .createSpy('isOverlayOpen')
      .and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          return fn(true);
        })
      });

    // no new view should be created, as we already have one
    dynamicViewOverlayService.createDynamicOverlay(TEST_DUMMY);
    expect(dynamicViewOverlayService.createOverlay).not.toHaveBeenCalledWith(
      TEST_DUMMY
    );
  });

  it('should create multiple instances of a dynamic view', function() {
    spyOn(dynamicViewOverlayService, 'createOverlay');
    // fake no view open
    dynamicViewOverlayService.isOverlayOpen = jasmine
      .createSpy('isOverlayOpen')
      .and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          return fn(false);
        })
      });

    dynamicViewOverlayService.createDynamicOverlay(TEST_DUMMY_MULTI_VIEW);
    expect(dynamicViewOverlayService.createOverlay).toHaveBeenCalledTimes(1);

    // although a view is open, a new one should be created
    dynamicViewOverlayService.isOverlayOpen = jasmine
      .createSpy('isOverlayOpen')
      .and.returnValue({
        then: jasmine.createSpy('then').and.callFake(function(fn) {
          return fn(true);
        })
      });
    dynamicViewOverlayService.createDynamicOverlay(TEST_DUMMY_MULTI_VIEW);
    expect(dynamicViewOverlayService.createOverlay).toHaveBeenCalledTimes(2);
  });

  it(' - toggleDynamicViewOverlay()', function() {
    spyOn(dynamicViewOverlayService, 'createDynamicOverlay');
    spyOn(dynamicViewOverlayService, 'closeAllOverlaysOfType');
    spyOn(dynamicViewOverlayService, 'isOverlayOpen');

    let isOpen = false;
    dynamicViewOverlayService.isOverlayOpen.and.returnValue({
      then: cb => {
        cb(isOpen);
      }
    });

    dynamicViewOverlayService.toggleDynamicViewOverlay('my-overlay');
    expect(dynamicViewOverlayService.createDynamicOverlay).toHaveBeenCalledWith(
      'my-overlay'
    );

    isOpen = true;
    dynamicViewOverlayService.toggleDynamicViewOverlay('my-overlay');
    expect(
      dynamicViewOverlayService.closeAllOverlaysOfType
    ).toHaveBeenCalledWith('my-overlay');
  });

  describe(' - isOverlayOpen', function() {
    // prepare
    var defferedOverlayController;
    var idCount, htmlID;
    var overlayMock;

    beforeEach(function() {
      defferedOverlayController = $q.defer();
      spyOn(dynamicViewOverlayService, 'getController').and.returnValue(
        defferedOverlayController.promise
      );
      // set up overlay controller mock
      var channelName = 'test-channel';
      var mockOverlayController = {
        setDynamicViewChannel: jasmine.createSpy('setDynamicViewChannel'),
        channelType: channelName
      };

      defferedOverlayController.resolve(mockOverlayController);
      $rootScope.$digest();
    });

    it(' - return true if there are is one valid element', function() {
      idCount = 0;
      htmlID = 'dynamic-view-overlay-' + idCount;
      dynamicViewOverlayService.overlayIDCount = idCount;

      overlayMock = {
        id: htmlID
      };
      dynamicViewOverlayService.overlays[htmlID] = overlayMock;

      // Test the stuff
      expect(Object.keys(dynamicViewOverlayService.overlays).length).toBe(1);
      dynamicViewOverlayService
        .isOverlayOpen('test-channel')
        .then(function(result) {
          expect(result).toBeTruthy();
        });
      $rootScope.$digest();
    });

    it(' - return false if there is no element', function() {
      expect(Object.keys(dynamicViewOverlayService.overlays).length).toBe(0);

      dynamicViewOverlayService
        .isOverlayOpen('test-channel')
        .then(function(result) {
          expect(result).toBeFalsy();
        });
      $rootScope.$digest();
    });

    it(' - return false if there are only other elements', function() {
      idCount = 0;
      htmlID = 'dynamic-view-overlay-' + idCount;
      dynamicViewOverlayService.overlayIDCount = idCount;

      overlayMock = {
        id: htmlID
      };
      dynamicViewOverlayService.overlays[htmlID] = overlayMock;

      expect(Object.keys(dynamicViewOverlayService.overlays).length).toBe(1);
      dynamicViewOverlayService
        .isOverlayOpen('other-channel')
        .then(function(result) {
          expect(result).toBeFalsy();
        });
      $rootScope.$digest();
    });
  });

  describe(' - isOverlayOpen multiple entries', function() {
    // prepare
    var defferedOverlayController = {};
    var idCount, htmlID;

    beforeEach(function() {
      spyOn(dynamicViewOverlayService, 'getController').and.callFake(function(
        overlay
      ) {
        return defferedOverlayController[overlay.id].promise;
      });

      for (var overlayCounter = 0; overlayCounter < 3; overlayCounter++) {
        idCount = overlayCounter;
        htmlID = 'dynamic-view-overlay-' + idCount;
        defferedOverlayController[htmlID] = $q.defer();

        // set up overlay controller mock
        var channelName = 'test-channel-' + overlayCounter;
        var mockOverlayController = {
          setDynamicViewChannel: jasmine.createSpy('setDynamicViewChannel'),
          channelType: channelName
        };

        defferedOverlayController[htmlID].resolve(mockOverlayController);
        $rootScope.$digest();
        dynamicViewOverlayService.overlayIDCount = idCount;

        dynamicViewOverlayService.overlays[htmlID] = {
          id: htmlID
        };
      }
      expect(Object.keys(dynamicViewOverlayService.overlays).length).toBe(3);
    });

    it(' - return true if there is at least one element shown', function() {
      expect(Object.keys(dynamicViewOverlayService.overlays).length).toBe(3);
      dynamicViewOverlayService
        .isOverlayOpen('test-channel-0')
        .then(function(result) {
          expect(result).toBeTruthy();
        });
      $rootScope.$digest();
    });

    it(' - return true if there is at least one element shown', function() {
      expect(Object.keys(dynamicViewOverlayService.overlays).length).toBe(3);
      dynamicViewOverlayService
        .isOverlayOpen('test-channel-2')
        .then(function(result) {
          expect(result).toBeTruthy();
        });
      $rootScope.$digest();
    });
  });
});
