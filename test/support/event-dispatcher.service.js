(function() {
  'use strict';

  angular
    .module('eventDispatcherModule', [])
    .service('eventDispatcherService', [
      function() {
        var that = this;

        this.createKeyEvent = function(eventType, code) {
          var event = document.createEvent('Event');
          event.code = code;
          event.shiftKey = false;
          event.initEvent(eventType, true, true);
          return event;
        };

        this.createKeyEventWithShift = function(eventType, code) {
          var event = that.createKeyEvent(eventType, code);
          event.shiftKey = true;
          return event;
        };

        this.createMouseEvent = function(eventType, button, pageX, pageY) {
          var event = document.createEvent('Event');
          event.button = button;
          // -1 means: no button was pressed
          if (button === -1) {
            event.button = 0;
            event.buttons = 0;
          }
          event.pageX = event.clientX = pageX;
          event.pageY = event.clientY = pageY;
          event.initEvent(eventType, true, true);

          return event;
        };

        this.createZeroTouchEvent = function(targetElement, eventType) {
          var event = document.createEvent('Event');
          event.initEvent(eventType, true, true);
          event.touches = [];
          return event;
        };

        this.createOneTouchEvent = function(
          targetElement,
          eventType,
          pageX,
          pageY
        ) {
          var event = document.createEvent('Event');
          event.initEvent(eventType, true, true);
          event.touches = [{ pageX: pageX, pageY: pageY }];
          return event;
        };

        this.createTwoTouchEvent = function(
          targetElement,
          eventType,
          pageX1,
          pageY1,
          pageX2,
          pageY2
        ) {
          var event = document.createEvent('Event');
          event.initEvent(eventType, true, true);
          event.touches = [
            { pageX: pageX1, pageY: pageY1 },
            { pageX: pageX2, pageY: pageY2 }
          ];
          return event;
        };

        this.triggerKeyEvent = function(targetElement, eventType, code) {
          var event = that.createKeyEvent(eventType, code);
          targetElement.dispatchEvent(event);
        };

        this.triggerKeyEventWithShift = function(
          targetElement,
          eventType,
          key
        ) {
          var event = that.createKeyEventWithShift(eventType, key);
          targetElement.dispatchEvent(event);
        };

        this.triggerMouseEvent = function(
          targetElement,
          eventType,
          button,
          x,
          y
        ) {
          var event = that.createMouseEvent(eventType, button, x, y);
          targetElement.dispatchEvent(event);
        };

        this.triggerZeroTouchEvent = function(targetElement, eventType) {
          var event = that.createZeroTouchEvent(targetElement, eventType);
          targetElement.dispatchEvent(event);
        };

        this.triggerOneTouchEvent = function(targetElement, eventType, x, y) {
          var event = that.createOneTouchEvent(targetElement, eventType, x, y);
          targetElement.dispatchEvent(event);
        };

        this.triggerTwoTouchEvent = function(
          targetElement,
          eventType,
          x1,
          y1,
          x2,
          y2
        ) {
          var event = that.createTwoTouchEvent(
            targetElement,
            eventType,
            x1,
            y1,
            x2,
            y2
          );
          targetElement.dispatchEvent(event);
        };
      }
    ]);
})();
