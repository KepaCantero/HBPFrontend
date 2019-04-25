(function() {
  'use strict';

  describe('Directive: joint-plot', function() {
    var scope, parentscope, controller, element, RESET_TYPE;

    var messageMock = {
      name: ['jointa', 'jointb', 'jointc'],
      position: [1, 2, 3],
      velocity: [4, 5, 6],
      effort: [7, 8, 9],
      header: { stamp: { secs: 1, nsecs: 500000000 } }
    };

    var messageMockFar = _.cloneDeep(messageMock);
    messageMockFar.header.stamp.secs += 1;

    beforeEach(module('exdFrontendApp'));
    beforeEach(module('jointPlotServiceModuleMock'));
    beforeEach(module('jointPlotModule'));
    beforeEach(module('exd.templates')); // import html template

    var robotJointService = null;

    beforeEach(
      inject(function(
        $rootScope,
        $compile,
        _RESET_TYPE_,
        sceneInfo,
        jointService
      ) {
        RESET_TYPE = _RESET_TYPE_;

        robotJointService = jointService.robotJointService;
        robotJointService.subscribe.calls.reset();
        parentscope = $rootScope.$new();
        parentscope.showJointPlot = true;
        sceneInfo.robots = [{ robotId: 'robotId' }];
        element = $compile('<joint-plot ng-show="showJointPlot"></joint-plot>')(
          parentscope
        );
        parentscope.$digest();

        scope = element.isolateScope();
        controller = element.controller('jointPlot');
        controller.selectedProperty.name = 'position';
      })
    );

    function checkSeriesVisibility() {
      controller.plot.options.series.forEach(function(serie) {
        expect(serie.visible).toBe(
          serie.prop === controller.selectedProperty.name &&
            !!serie.joint.selected
        );
      });
    }

    function triggerMessage(msg) {
      robotJointService.subscribe.calls.first().args[0](msg);
    }

    it('should register selected curves properly', function() {
      triggerMessage(messageMock);

      expect(controller.plot.curves.jointa_position[0].time).toBe(1.5);

      //test values
      messageMock.name.forEach(function(jointName, iJoint) {
        ['position', 'velocity', 'effort'].forEach(function(propName) {
          expect(controller.plot.curves[jointName + '_' + propName][0].y).toBe(
            messageMock[propName][iJoint]
          );
        });
      });

      //test visibility
      checkSeriesVisibility();
    });

    it('should register 2 datapoints that are sufficiently far in time', function() {
      triggerMessage(messageMock);
      triggerMessage(messageMockFar);
      expect(controller.plot.curves.jointa_position.length).toBe(2);
    });

    it('should unsusbscribe when destroyed', function() {
      parentscope.$destroy();
      parentscope.$digest();
      scope.$digest();

      expect(robotJointService.unsubscribe).toHaveBeenCalled();
    });

    it('should make new joint visible', function() {
      triggerMessage(messageMock);
      controller.allJoints[2].selected = true;
      controller.updateVisibleSeries();
      checkSeriesVisibility();
    });

    it('should make new property visible', function() {
      triggerMessage(messageMock);
      controller.selectedProperty.name = 'effort';
      controller.updateVisibleSeries();
      checkSeriesVisibility();
    });

    it('should color series per joint name', function() {
      triggerMessage(messageMock);
      var colorScale = d3.scale.category10();

      controller.plot.options.series.forEach(function(serie) {
        expect(serie.color).toBe(
          colorScale(controller.allJoints.indexOf(serie.joint))
        );
      });
    });

    it('should pop datapoints when they are too old', function() {
      var messageMockClose = _.cloneDeep(messageMock);
      messageMockClose.header.stamp.secs += 0.5;

      var messageMockReallyFar1 = _.cloneDeep(messageMock);
      messageMockReallyFar1.header.stamp.secs += 1000;
      var messageMockReallyFar2 = _.cloneDeep(messageMock);
      messageMockReallyFar1.header.stamp.secs += 1000.5;

      triggerMessage(messageMock);
      triggerMessage(messageMockClose);
      triggerMessage(messageMockReallyFar1);
      // two first messages are filtered out, too old
      expect(controller.plot.curves.jointa_position.length).toBe(1);
      triggerMessage(messageMockReallyFar2);
      expect(controller.plot.curves.jointa_position.length).toBe(2);
    });

    it('should clear the plot on RESET event', function() {
      triggerMessage(messageMock);

      _.forOwn(controller.plot.curves, function(values) {
        expect(values.length).toBe(1);
      });
      scope.$broadcast('RESET', RESET_TYPE.RESET_FULL);
      scope.$digest();

      _.forOwn(controller.plot.curves, function(values) {
        expect(values.length).toBe(0);
      });
    });

    it('should NOT clear the plot on RESET event: RESET_CAMERA_VIEW', function() {
      triggerMessage(messageMock);

      _.forOwn(controller.plot.curves, function(values) {
        expect(values.length).toBe(1);
      });
      scope.$broadcast('RESET', RESET_TYPE.RESET_CAMERA_VIEW);
      scope.$digest();

      _.forOwn(controller.plot.curves, function(values) {
        expect(values.length).toBe(1);
      });
    });

    it('should when ROBOT_LIST_UPDATED is triggered, robots should be reload while keeping the selected robot', function() {
      const previouslySelectedRobotId = controller.selectedRobot.robotId;
      scope.$broadcast('ROBOT_LIST_UPDATED');
      scope.$digest();

      expect(controller.selectedRobot.robotId).toBe(previouslySelectedRobotId);
    });
  });
})();
