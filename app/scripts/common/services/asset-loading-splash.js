/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file is part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
 * https://www.humanbrainproject.eu
 *
 * The Human Brain Project is a European Commission funded project
 * in the frame of the Horizon2020 FET Flagship plan.
 * http://ec.europa.eu/programmes/horizon2020/en/h2020-section/fet-flagships
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 * ---LICENSE-END**/
(function() {
  'use strict';

  /* global console: false */

  // This file contains a service for the splash screen as well as a controller
  // which manages the scope of the displayed HTML. We use a simple observer here
  // in order to notify the controller whenever an update message comes in.

  var module = angular.module('exdFrontendApp');
  module.service('assetLoadingSplash', [
    '$uibModal',
    function($uibModal) {
      var myModal;
      var progressObserver;

      // We have to work around a bit here: The controller of the HTML will register
      // a function as a callback. This function will then update the contents of the
      // HTML.
      var setProgressObserver = function(callback) {
        progressObserver = callback;
      };

      var setProgress = function(data) {
        // Notify our controller that we have an update!
        if (progressObserver) {
          progressObserver(data);
        }
      };

      var open = function(callbackOnClose) {
        this.callbackOnClose = callbackOnClose;
        if (angular.isDefined(myModal)) {
          myModal.close();
        }
        myModal = $uibModal.open({
          backdrop: false,
          controller: 'AssetLoadingSplashCtrl',
          templateUrl: 'views/splash/asset-loading-splash.html',
          windowTemplateUrl: 'views/splash/index.html'
        });
        return myModal;
      };

      var close = function() {
        if (angular.isDefined(myModal)) {
          myModal.close();
        }
        if (angular.isDefined(this.callbackOnClose)) {
          this.callbackOnClose();
        }
        myModal = undefined;
      };

      return {
        open: open,
        close: close,
        setProgress: setProgress,
        setProgressObserver: setProgressObserver
      };
    }
  ]);

  module.controller('AssetLoadingSplashCtrl', [
    '$scope',
    '$timeout',
    'assetLoadingSplash',
    function($scope, $timeout, assetLoadingSplash) {
      $scope.progressData = {};
      $scope.isError = false;
      $scope.loadedAssets = 0;
      $scope.totalAssets = 0;

      $scope.close = function() {
        assetLoadingSplash.close();
      };

      assetLoadingSplash.setProgressObserver(function(data) {
        var isDone = true;
        var loadedAssets = 0;

        angular.forEach(data.assets, function(element, index) {
          loadedAssets += element.done ? 1 : 0;
          isDone = isDone && element.done;
          $scope.isError = $scope.isError || element.error;
        });
        if (data.prepared && isDone && !$scope.isError) {
          // if there were errors, a button is showed for the user to explicitly close the splash
          assetLoadingSplash.close();
        }

        // We use $timeout to prevent "digest already in progress" error.
        $timeout(function() {
          $scope.progressData = data;
          $scope.loadedAssets = loadedAssets;
          $scope.totalAssets = data.assets.length;
        });
      });
      // Give 15 seconds for asset loading progress to be received
      $timeout(function() {
        if ($scope.totalAssets === 0) {
          console.error('Asset loading timeout occured.');
          $scope.isError = true;
        }
      }, 15000);
    }
  ]);
})();
