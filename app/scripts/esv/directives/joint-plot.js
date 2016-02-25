(function () {
  'use strict';
  var pointFrequency = 5.0; // number of points per seconds
  var topicSubCb;

  function configureJointPlot(scope, roslib) {
    scope.curves = [];
    scope.allJoints = [];
    scope.selectedJoints = {};
    scope.selectedProperty = { name: "position" };
    scope.indexToColor = d3.scale.category10();
    scope.curveToColorIdx = {};
    scope.timeWindow = 10;
    scope.minYIntervalWidth = 1.0;

    scope.getCurveColor = function(joint) {
      var cssRet = {};
      if (scope.selectedJoints[joint]) {
        var colorIdx = scope.curveToColorIdx[joint + '_' + scope.selectedProperty.name];
        if (!_.isUndefined(colorIdx)) {
          cssRet.color = scope.indexToColor(scope.curveToColorIdx[joint + '_' + scope.selectedProperty.name]);
        }
        else {
          // this curve is selected but it may not have been assigned a color yet
          cssRet.color = "#8A8A8A";
        }
      }
      return cssRet;
    };

    scope.updateSerieRequired = true;
    var requireUpdateSerie = function() {
      scope.updateSerieRequired = true;
    };

    // get first available index in colormap and save it: [0, 1, 2, 4, 5] ---> 3
    var findColorForCurve = function(curveName) {
      var colorIdx = _.chain(scope.curveToColorIdx)
        .map(_.identity) //get all taken color index
        .sortBy(_.lt)
        .reduce(function(previous, n) {
          // return the first available index
          return (previous === n) ? n+1 : previous;
        }, 0)
        .value();

      scope.curveToColorIdx[curveName] = colorIdx;
      return colorIdx;
    };

    // return concatenation of all jointNames with name of selected property
    function getCurveNamesToPlot(jointNames, propertyName) {
      var jointToPlot =  _.pickBy(jointNames, _.identity); // filter out falsy values
      var curveNamesToPlot = [];

      _.forOwn(jointToPlot, function(trueBool, joint) {
        curveNamesToPlot.push(joint + '_' + propertyName);
      });
      return curveNamesToPlot;
    }


    var updateSeries = function() {
      var curveNamesToPlot = getCurveNamesToPlot(scope.selectedJoints, scope.selectedProperty.name);

      // unregister curve in colormap if not selected for plotting
      _.forOwn(scope.curveToColorIdx, function(colorIdx, curveName) {
        if (!_.includes(curveNamesToPlot,curveName)) {
          delete scope.curveToColorIdx[curveName];
        }
      });


      // finally copy the colored curves we plot in series
      var newSeries = [];
      _.forEach(curveNamesToPlot, function(curveName) {
        var curveColor = scope.curveToColorIdx.hasOwnProperty(curveName) ?
          scope.curveToColorIdx[curveName] : findColorForCurve(curveName);

        newSeries.push({
          y: curveName,
          color: scope.indexToColor(curveColor)
        });
      });

      scope.plotOptions.series = newSeries;
    };

    scope.updateVerticalInterval = function() {
      var curveNamesToPlot = getCurveNamesToPlot(scope.selectedJoints, scope.selectedProperty.name);

      // find min and max yValue in all our datapoints
      var targetYInterval = _.reduce(scope.curves, function(interval, point) {
        var ret = interval.slice(); // copy original interval
        _.forEach(curveNamesToPlot, function(key) {
          var yVal = point[key];
          if (_.isNumber(yVal) && !_.isNaN(yVal)) {
            ret[0] = Math.min(ret[0], yVal);
            ret[1] = Math.max(ret[1], yVal);
          }
        });
        return ret;
      }, [Infinity, -Infinity]);

      if (targetYInterval[0] === Infinity) {
        // no yValues in our curves: don't adjust the interval
        return;
      }

      var intervalWidth = targetYInterval[1] - targetYInterval[0];
      var padding = scope.minYIntervalWidth - intervalWidth;
      if (padding > 0) {
        // the intervalWidth is too small: we add some padding
        targetYInterval[0] -= padding/2.0;
        targetYInterval[1] += padding/2.0;
      }

      scope.plotOptions.axes.y.min = targetYInterval[0];
      scope.plotOptions.axes.y.max = targetYInterval[1];
    };

    scope.$watch('selectedProperty.name', requireUpdateSerie);
    scope.$watch('selectedJoints', requireUpdateSerie, true);

    // Subscribe to the ROS topic
    scope.startJointDisplay = function () {
      var rosConnection = roslib.getOrCreateConnectionTo(scope.server);
      scope.jointTopicSubscriber = scope.jointTopicSubscriber || roslib.createTopic(rosConnection,
                                                                                    scope.topic,
                                                                                    'sensor_msgs/JointState', {
                                                                                      throttle_rate: 1.0 / pointFrequency * 1000.0
                                                                                    });
      topicSubCb = scope.jointTopicSubscriber.subscribe(scope.onNewJointMessageReceived, true);
    };

    scope.onNewJointMessageReceived = function (message) {
      scope.allJoints = message.name;
      var currentTime = message.header.stamp.secs + message.header.stamp.nsecs * 0.000000001;
      if (currentTime > scope.plotOptions.axes.x.max) {
        scope.plotOptions.axes.x.max = currentTime;
        scope.plotOptions.axes.x.min = currentTime - scope.timeWindow;
      }

      scope.curves = _.filter(scope.curves, function(point) {
        return point.time >= scope.plotOptions.axes.x.min;
      });

      var newDataPoint = {
        time: currentTime
      };

      var messageByJoint = [];
      _.forEach(message.name, function(name, idx) {
        messageByJoint.push({
          name: name,
          position: message.position[idx],
          velocity: message.velocity[idx],
          effort: message.effort[idx]
        });
      });

      _.forEach(messageByJoint, function (joint) {
        if (scope.selectedJoints[joint.name]) {
          // that joint is selected: set its yValue
          newDataPoint[joint.name + '_' + scope.selectedProperty.name] = joint[scope.selectedProperty.name];
        }
      });

      scope.curves.push(newDataPoint);

      if (scope.updateSerieRequired) {
        scope.updateSerieRequired = false;
        updateSeries();
      }

      scope.updateVerticalInterval();
    };

    // Unsubscribe to the ROS topic
    scope.stopJointDisplay = function () {
      if (scope.jointTopicSubscriber) {
        // One has to be careful here: it is not sufficient to only call unsubscribe but you have to
        // put in the function as an argument, otherwise your function will be called twice!
        scope.jointTopicSubscriber.unsubscribe(topicSubCb);
      }
    };
  }

  angular.module('exdFrontendApp').directive('jointPlot', ['$log', '$window', '$filter', 'roslib', 'stateService', 'STATE', '$timeout', function ($log, $window, $filter, roslib, stateService, STATE, $timeout) {
    return {
      templateUrl: 'views/esv/joint-plot.html',
      restrict: 'E',
      replace: true,
      scope: {
        server: '@',
        topic: '@',
        // see https://github.com/angular/angular.js/issues/2500
        ngShow: '='
      },
      link: function (scope, element, attrs) {
        scope.chartHeight = 400;

        if(angular.isUndefined(scope.server)) {
          $log.error('The server URL was not specified!');
        }

        if(angular.isUndefined(scope.topic)) {
          $log.error('The topic for the joints was not specified!');
        }
        var lineChartWrapper = angular.element(element[0].childNodes[1].childNodes[5]);
        configureJointPlot(scope, roslib);

        scope.onResizeBegin = function() {
          lineChartWrapper.css('visibility', 'hidden');
        };
        scope.onResizeEnd = function() {
          // the chart needs a bit of time to adjust its size
          $timeout(function() {
            lineChartWrapper.css('visibility', 'visible');
          }, 200);
        };


        scope.plotOptions = {
          tooltip: {
            mode: 'none'
          },
          axes: {
            x: {
              key: 'time',
              ticks: 10,
              min: 0,
              max: scope.timeWindow
            }
          },
          series: []
        };

        // When starting to display (or hide) the canvas, we need to subscribe (or unsubscribe) to the
        // ROS topic.
        if (attrs.hasOwnProperty('ngShow')) {
          scope.$watch("ngShow", function (visible) {
            if (visible) {
              element.show();
              scope.startJointDisplay();
            }
            else {
              element.hide();
              scope.stopJointDisplay();
            }
          });
        }

        var parent = angular.element(element[0].childNodes[1]);
        scope.$watch(function() {
          return parent.height();
        }, function(newHeight) {
          if (scope.ngShow) {
            scope.chartHeight = Math.max(newHeight,80);
          }
        });

        // clean plot when reinitialize the simulation
        var onStateChangedCallback = function(newState) {
          if (newState === STATE.INITIALIZED){
            // clear the jointplot
            scope.curves.length = 0;
            scope.plotOptions.axes.x.min = 0;
            scope.plotOptions.axes.x.max = scope.timeWindow;
          }
        };

        stateService.addStateCallback(onStateChangedCallback);

        // clean up on leaving
        scope.$on("$destroy", function() {
          // remove the callback
          stateService.removeStateCallback(onStateChangedCallback);
        });
      }

    };
  }]);
}());
