'use strict';

describe('Directive: resizeable', function() {
  var scope, compile, element, elementDOM, document, window, resizeDiv;
  var mockedMouseDownEventStopPropagation;
  var startHeight, startWidth;

  // Note that we set those two values to '0'. This is mainly due to the problem that phantomjs
  // does not eat these values for 'top' and 'left' in the CSS – they are always set to '0'.
  // So in principal this test should also work with non zero values, but due to phantomjs it does not.

  beforeEach(module('exdFrontendApp'));
  beforeEach(
    inject(function($rootScope, $compile, $document, $window) {
      scope = $rootScope.$new();
      compile = $compile;
      document = $document;
      window = $window;
      startHeight = window.innerHeight;
      startWidth = window.innerWidth;
      scope.onResizeEnd = jasmine.createSpy('onResizeEnd');
      mockedMouseDownEventStopPropagation = jasmine.createSpy(
        'stopPropagation'
      );
    })
  );

  describe('Resizing divs with the aspect ratio not taken into consideration', function() {
    beforeEach(function() {
      element = compile('<div resizeable></div>')(scope);
      element.css({
        top: '100px',
        left: '100px',
        width: '100px',
        height: '100px'
      });

      elementDOM = element[0];

      resizeDiv = angular.element(element.children()[0]);
      scope.$digest();
    });

    it('should replace the element with the appropriate content', function() {
      // Compile a piece of HTML containing the directive
      expect(element.attr('resizeable')).toBeDefined();
    });

    it('should check for the default window height and width', function() {
      // Default height and width
      expect(window.innerHeight).toBe(startHeight);
      expect(window.innerWidth).toBe(startWidth);
    });

    it('should call the onResizeEnd method', function() {
      resizeElement(
        resizeDiv,
        { x: 0, y: 0 },
        { dx: randomInt(1, 10), dy: randomInt(1, 10) }
      );
      expect(scope.onResizeEnd).toHaveBeenCalled();
    });

    it('should stop event propagation on the mousedown event', function() {
      resizeElement(
        resizeDiv,
        { x: 0, y: 0 },
        { dx: randomInt(1, 10), dy: randomInt(1, 10) }
      );
      expect(mockedMouseDownEventStopPropagation).toHaveBeenCalled();
    });

    it('should trigger onResizeBegin if existing when mousedown event occurs', function() {
      scope.onResizeBegin = jasmine.createSpy('onResizeBegin');
      resizeElement(
        resizeDiv,
        { x: 0, y: 0 },
        { dx: randomInt(1, 10), dy: randomInt(1, 10) }
      );
      expect(scope.onResizeBegin).toHaveBeenCalled();
    });

    it('should handle the resize correctly', function() {
      var mouseDownPos = { x: 0, y: 0 };
      var mouseMoveDelta = { x: 50, y: 50 };

      var initWidth = parseInt(elementDOM.style.width, 10);
      var initHeight = parseInt(elementDOM.style.height, 10);

      var expectedWidth =
        (initWidth + mouseMoveDelta.x) / window.innerWidth * 100;
      var expectedHeight =
        (initHeight + mouseMoveDelta.y) / window.innerHeight * 100;

      resizeElement(resizeDiv, mouseDownPos, mouseMoveDelta);

      expect(parseFloat(elementDOM.style.width)).toBeCloseTo(expectedWidth, 1);
      expect(parseFloat(elementDOM.style.height)).toBeCloseTo(
        expectedHeight,
        1
      );
    });
  });

  describe('Using the keep aspect ratio attribute', function() {
    beforeEach(function() {
      element = compile('<div resizeable keep-aspect-ratio="1.0"></div>')(
        scope
      );
      element.css({
        top: '0px',
        left: '0px',
        width: '100px',
        height: '100px'
      });

      elementDOM = element[0];

      resizeDiv = angular.element(element.children()[0]);
      scope.$digest();
    });

    it('it should handle the resize correctly', function() {
      var initWidth = parseInt(elementDOM.style.width, 10);
      var initHeight = parseInt(elementDOM.style.height, 10);

      var mouseDownPos = { x: 0, y: 0 };
      var mouseMoveDelta = {
        x: Math.ceil(initWidth * 0.1),
        y: Math.ceil(initHeight * 0.1)
      };

      var multiplierWidth = 1.0;
      var multiplierHeight = 1.0;

      if (window.innerWidth > window.innerHeight) {
        multiplierWidth = window.innerWidth / window.innerHeight;
      } else {
        multiplierHeight = window.innerHeight / window.innerWidth;
      }

      var expectedWidth =
        (initWidth + mouseMoveDelta.x) *
        multiplierWidth /
        window.innerWidth *
        100;
      var expectedHeight =
        (initHeight + mouseMoveDelta.y) *
        multiplierHeight /
        window.innerHeight *
        100;

      resizeElement(resizeDiv, mouseDownPos, mouseMoveDelta);

      expect(parseFloat(elementDOM.style.width)).toBeCloseTo(expectedWidth, 1);
      expect(parseFloat(elementDOM.style.height)).toBeCloseTo(
        expectedHeight,
        1
      );
    });

    it('it should respect the maximum height', function() {
      var mouseDownPos = { x: 0, y: 0 };
      var mouseMoveDelta = { x: 400, y: 0 };

      var expectedWidth = 84.17;
      var expectedHeight = 84.17;

      resizeElement(resizeDiv, mouseDownPos, mouseMoveDelta);

      expect(parseFloat(elementDOM.style.width)).toBeCloseTo(expectedWidth, -1);
      expect(parseFloat(elementDOM.style.height)).toBeCloseTo(
        expectedHeight,
        -1
      );
    });
  });

  function randomInt(lowerBound, upperBound) {
    return lowerBound + Math.floor(Math.random() * (upperBound - lowerBound));
  }

  // Helper function that emulates a whole cycle of a resizing action.
  //
  // Pass in an element which you want to resize. It will then "perform" a mousedown event on the lower right corner
  // of the element, where the handle is. Then a mousemove event with the dx, dt specified in the "mouseMove" object
  // and finally it creates a mouseup event at exactly this position.
  function resizeElement(resizeHandler, mouseDownPos, mouseUpPos) {
    // Resize by doing mousedown, mousemove and mouseup.
    resizeHandler.triggerHandler({
      type: 'mousedown',
      pageX: mouseDownPos.x,
      pageY: mouseDownPos.y,
      stopPropagation: mockedMouseDownEventStopPropagation
    });

    document.triggerHandler({
      type: 'mousemove',
      pageX: mouseUpPos.x,
      pageY: mouseUpPos.y
    });

    document.triggerHandler({
      type: 'mouseup',
      pageX: mouseUpPos.x,
      pageY: mouseUpPos.y
    });

    scope.$digest();
  }
});
