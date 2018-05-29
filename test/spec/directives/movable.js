'use strict';

describe('Directive: Movable', function() {
  beforeEach(module('exdFrontendApp'));

  var $scope, $document, $rootScope, $compile;

  var element, elementDOM;

  function createMovableElement(useAnchor) {
    $scope = $rootScope.$new();
    element = $compile(
      '<div movable ' +
        (useAnchor ? 'movable-anchor="*"' : '') +
        '><div></div></div>'
    )($scope);
    $scope.$digest();
    element.css({
      top: '100px',
      left: '100px',
      width: '100px',
      height: '100px'
    });
    elementDOM = element[0];
    elementDOM.getBoundingClientRect = jasmine
      .createSpy('getBoundingClientRect')
      .and.returnValue({
        left: parseInt(elementDOM.style.left, 10),
        top: parseInt(elementDOM.style.top, 10)
      });
  }

  beforeEach(
    inject(function(_$rootScope_, _$compile_, _$document_) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      $document = _$document_;

      createMovableElement();
    })
  );

  it('should change the cursor to be the movable-cursor', function() {
    expect(element.css('cursor')).toBe('move');
    expect(element.css('position')).toBe('absolute');
  });

  it('should NOT move the element on just mouse move', function() {
    spyOn(element, 'css');
    element.triggerHandler({ type: 'mousemove', pageX: 110, pageY: 110 });
    expect(element.css).not.toHaveBeenCalled();
  });

  it('should move the element on mouse move', function() {
    var delta = 50;

    var initialBoundingRect = elementDOM.getBoundingClientRect();

    var expectedLeft =
      (initialBoundingRect.left + delta) / window.innerWidth * 100;
    var expectedTop =
      (initialBoundingRect.top + delta) / window.innerHeight * 100 - 5;

    // trigger mouse down
    element.triggerHandler({ type: 'mousedown', pageX: 0, pageY: 0 });
    $scope.$digest();

    // trigger mouse move
    $document.triggerHandler({ type: 'mousemove', pageX: delta, pageY: delta });
    $scope.$digest();

    expect(parseFloat(elementDOM.style.left)).toBeCloseTo(expectedLeft, 2);
    expect(parseFloat(elementDOM.style.top)).toBeCloseTo(expectedTop, 2);

    // trigger mouse up
    $document.triggerHandler({ type: 'mouseup', pageX: 0, pageY: 0 });

    // Should not move any more
    $document.triggerHandler({ type: 'mousemove', pageX: delta, pageY: delta });
    $scope.$digest();
    // should still be the same as above
    expect(parseFloat(elementDOM.style.left)).toBeCloseTo(expectedLeft, 2);
    expect(parseFloat(elementDOM.style.top)).toBeCloseTo(expectedTop, 2);
  });

  it('should move the element out of the window', function() {
    var startX = 100,
      startY = 0;
    var delta = 200;

    var initialBoundingRect = elementDOM.getBoundingClientRect();

    var expectedLeft =
      (initialBoundingRect.left + delta) / window.innerWidth * 100;
    var expectedTop =
      (initialBoundingRect.top + delta) / window.innerHeight * 100 - 5;

    element.triggerHandler({ type: 'mousedown', pageX: startX, pageY: startY });
    $scope.$digest();
    $document.triggerHandler({
      type: 'mousemove',
      pageX: startX + delta,
      pageY: startY + delta
    });
    $scope.$digest();
    expect(parseFloat(elementDOM.style.left)).toBeCloseTo(expectedLeft, 2);
    expect(parseFloat(elementDOM.style.top)).toBeCloseTo(expectedTop, 2);

    $document.triggerHandler({
      type: 'mouseup',
      pageX: startX + delta,
      pageY: startY + delta
    });
  });

  it('should move the element with a touch gesture', function() {
    var startX = 0,
      startY = 0;
    var delta = 100;

    var initialBoundingRect = elementDOM.getBoundingClientRect();

    // trigger mouse down
    element.triggerHandler({
      type: 'touchstart',
      pageX: startX,
      pageY: startY
    });
    $scope.$digest();

    var expectedLeft =
      (initialBoundingRect.left + delta) / window.innerWidth * 100;
    var expectedTop =
      (initialBoundingRect.top + delta) / window.innerHeight * 100 - 5;

    // trigger mouse move
    $document.triggerHandler({
      type: 'touchmove',
      pageX: startX + delta,
      pageY: startY + delta
    });
    $scope.$digest();

    expect(parseFloat(elementDOM.style.left)).toBeCloseTo(expectedLeft, 2);
    expect(parseFloat(elementDOM.style.top)).toBeCloseTo(expectedTop, 2);

    // trigger mouse up
    $document.triggerHandler({
      type: 'touchend',
      pageX: startX + delta,
      pageY: startY + delta
    });

    // Should not move any more
    $document.triggerHandler({ type: 'touchmove', pageX: 120, pageY: 140 });
    $scope.$digest();
    // should still be the same as above
    expect(parseFloat(elementDOM.style.left)).toBeCloseTo(expectedLeft, 2);
    expect(parseFloat(elementDOM.style.top)).toBeCloseTo(expectedTop, 2);
  });

  it('should move element using movable anchor', function() {
    createMovableElement(true);
    var delta = 112;

    var initialBoundingRect = elementDOM.getBoundingClientRect();
    var child = element.children().first();

    var expectedLeft =
      (initialBoundingRect.left + delta) / window.innerWidth * 100;
    var expectedTop =
      (initialBoundingRect.top + delta) / window.innerHeight * 100 - 5;

    child.triggerHandler({ type: 'mousedown', pageX: 0, pageY: 0 });
    $scope.$digest();
    $document.triggerHandler({ type: 'mousemove', pageX: delta, pageY: delta });
    $scope.$digest();
    expect(parseFloat(elementDOM.style.left)).toBeCloseTo(expectedLeft, 2);
    expect(parseFloat(elementDOM.style.top)).toBeCloseTo(expectedTop, 2);
  });

  it('should NOT move element using outside movable anchor', function() {
    createMovableElement(true);

    var originalTop = element.css('top');
    var originalLeft = element.css('left');
    element.triggerHandler({ type: 'mousedown', pageX: 0, pageY: 0 });
    $scope.$digest();
    $document.triggerHandler({ type: 'mousemove', pageX: 10, pageY: 10 });
    expect(element.css('top')).toBe(originalTop);
    expect(element.css('left')).toBe(originalLeft);
  });
});
