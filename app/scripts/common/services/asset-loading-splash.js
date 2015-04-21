(function () {
  'use strict';

  // This file contains a service for the splash screen as well as a controller
  // which manages the scope of the displayed HTML. We use a simple observer here
  // in order to notify the controller whenever an update message comes in.

  var module = angular.module('exdFrontendApp');
  module.service('assetLoadingSplash', ['$modal', function ($modal) {
    var myModal;
    var progressObserver;

    // We have to work around a bit here: The controller of the HTML will register
    // a function as a callback. This function will then update the contents of the
    // HTML.
    var setProgressObserver = function (callback) {
      progressObserver = callback;
    };

    var setProgress = function(data) {
      // Notify our controller that we have an update!
      if (progressObserver) {
        progressObserver(data);
      }
    };

    var open = function () {
      if(angular.isDefined(myModal)){ myModal.close(); }
      myModal = $modal.open( {
        backdrop: false,
        controller: 'AssetLoadingSplashCtrl',
        templateUrl: 'views/splash/asset-loading-splash.html',
        windowTemplateUrl: 'views/splash/index.html'
      });
      return myModal;
    };

    var close = function() {
      if (angular.isDefined(myModal)) { myModal.close(); }
      myModal = undefined;
    };

    return {
      open: open,
      close: close,
      setProgress: setProgress,
      setProgressObserver: setProgressObserver
    };

  }]);

  module.controller('AssetLoadingSplashCtrl', ['$scope', '$log', '$filter', '$timeout', 'assetLoadingSplash', function ($scope, $log, $filter, $timeout, assetLoadingSplash) {
    $scope.progressData = [];
    $scope.percentage = 0;
    $scope.isError = false;

    $scope.close = function() {
      assetLoadingSplash.close();
    };

    assetLoadingSplash.setProgressObserver(function(data) {
      var totalSize = 0;
      var progress = 0;
      var isDone = true;
      var isError = false;
      angular.forEach(data, function(element, index) {
        totalSize = totalSize + element.totalSize;
        progress = progress + element.progress;
        isDone = isDone && element.done;
        $scope.isError = $scope.isError || element.error;
      });
      if (isDone && !$scope.isError ) { // if there were errors, a button is showed for the user to explicitly close the splash
          assetLoadingSplash.close();
      }
      // We use $timeout to prevent "digest already in progress" error.
      $timeout(function() {
        $scope.$apply(function () {
          $scope.progressData = data;
          $scope.percentage = $filter('number')((progress*100/totalSize),0);
        });
      });
    });
  }]);

}());
