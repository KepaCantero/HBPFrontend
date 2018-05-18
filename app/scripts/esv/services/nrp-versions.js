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

  var parseBackendVersion = function(data) {
    var result = {};
    var versionString = 'Backend:\n';
    angular.forEach(angular.fromJson(data), function(value, key) {
      versionString += '\t' + key + ': ' + value + '\n';
    });
    result.toString = versionString;
    return result;
  };
  var parseFrontendVersion = function(data) {
    var result = {};
    result.toString = 'Frontend: ' + angular.fromJson(data).version + '\n';
    return result;
  };
  angular
    .module('nrpBackendAbout', ['ngResource', 'nrpErrorHandlers'])
    // This service provides the versions of the Frontend and backend as a string
    .factory('nrpBackendVersions', [
      '$resource',
      'serverError',
      function($resource, serverError) {
        return function(baseUrl) {
          return $resource(
            baseUrl + '/version',
            {},
            {
              get: {
                method: 'GET',
                interceptor: { responseError: serverError.displayHTTPError },
                transformResponse: parseBackendVersion
              }
            }
          );
        };
      }
    ])
    .factory('nrpFrontendVersion', [
      '$resource',
      'serverError',
      function($resource, serverError) {
        return $resource(
          'package.json',
          {},
          {
            get: {
              method: 'GET',
              interceptor: { responseError: serverError.displayHTTPError },
              transformResponse: parseFrontendVersion
            }
          }
        );
      }
    ]);
})();
