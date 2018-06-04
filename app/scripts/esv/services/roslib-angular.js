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
/* global console: false */

// we are using the module pattern here, also see
// http://www.adequatelygood.com/JavaScript-Module-Pattern-In-Depth.html
(function() {
  'use strict';

  // We don't want to have ROSLIB on the global scope (ie. window), but we want to rely on dependency injection.
  // This allows our components to be intuitive, predictable, and testable. Hence we "wrap" this library here.
  // http://www.bennadel.com/blog/2720-creating-and-extending-a-lodash-underscore-service-in-angularjs.htm
  var app = angular.module('roslibModule', []);
  app.factory('roslib', [
    '$window',
    'bbpConfig',
    '$rootScope',
    function($window, bbpConfig, $rootScope) {
      // Get a local handle on the global ROSLIB reference
      var ROSLIB = $window.ROSLIB;

      // Delete the global reference to make sure
      // that no one on the team gets lazy and tried to reference the library
      // without injecting it. It's an easy mistake to make, and one that won't
      // throw an error (since the core library is globally accessible).
      // delete($window.ROSLIB); // Unfortunately we cannot delete it, since gz3d.js is relying on it :(

      // custom ROSLIB methods
      ROSLIB.getOrCreateConnectionTo = function(url) {
        var token = [];
        var clientID = bbpConfig.get('auth.clientId', '');
        var localStorageTokenKey =
          'tokens-' + clientID + '@https://services.humanbrainproject.eu/oidc';
        if (localStorage.getItem(localStorageTokenKey)) {
          try {
            token = JSON.parse(localStorage.getItem(localStorageTokenKey));
          } catch (e) {
            // this token will be rejected by the server and the client will get a proper auth error
            //eslint-disable-next-line camelcase
            token[0] = { access_token: 'malformed-token' };
          }
        } else {
          // this token will be rejected by the server and the client will get a proper auth error
          //eslint-disable-next-line camelcase
          token[0] = { access_token: 'no-token' };
        }
        url = url + '?token=' + token[0].access_token;

        return new ROSLIB.PhoenixRos({ url: url });
      };

      ROSLIB.createTopic = function(
        connection,
        topicName,
        messageType,
        additionalOptions
      ) {
        return new ROSLIB.Topic(
          _.extend(
            {
              ros: connection,
              name: topicName,
              messageType: messageType
            },
            additionalOptions
          )
        );
      };

      ROSLIB.createStringTopic = function(connection, topicName) {
        return new ROSLIB.Topic({
          ros: connection,
          name: topicName,
          messageType: 'std_msgs/String'
        });
      };

      // overwrite subscribe function of topics to add the parameter makeAngularAware
      // when makeAngularAware is true, the callback is called within a $rootScope.$apply()
      // optimally all ros callbacks should be wrapped in a $rootScope.$apply()
      // but some topics publish at too high frequency which degrades performances a lot (eg, spikes)
      ROSLIB.Topic.prototype.subscribe = (function(originalSub) {
        return function(callback, makeAngularAware) {
          var that = this;
          var finalCb = callback;
          if (makeAngularAware) {
            finalCb = function(message) {
              $rootScope.$apply(function() {
                callback(message);
              });
            };
          }
          originalSub && originalSub.call(that, finalCb);
          return finalCb;
        };
      })(ROSLIB.Topic.prototype.subscribe);

      ROSLIB.createService = function(
        connection,
        serviceName,
        serviceType,
        additionalOptions
      ) {
        return new ROSLIB.Service(
          _.extend(
            {
              ros: connection,
              name: serviceName,
              serviceType: serviceName
            },
            additionalOptions
          )
        );
      };

      // Return the (formerly global) reference so that it can be injected
      // into other aspects of the AngularJS application.
      return ROSLIB;
    }
  ]);
})();
