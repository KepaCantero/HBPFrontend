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
  angular.module('exdFrontendApp').service('newExperimentProxyService', [
    '$http',
    'bbpConfig',
    function($http, bbpConfig) {
      /**
               *  Fetches the proxyUrl
               *  
               *  Example usage : 
               *  var proxyUrl = newExperimentProxyService.getProxyUrl();
               *  which will fetch the proxy url to use in subsequent HTTP requests
               *
               *  @return the proxy Url, as appears in the config.json file
              **/
      this.getProxyUrl = function() {
        return bbpConfig.get('api.proxy.url');
      };
      /**
               *  Performs an HTTP request to the proxy to fetch the list of  template models
               *  (i.e. robot, environment, brain etc).
               *  
               *  Example usage : 
               *  var robotsJSONPromise = newExperimentProxyService.getEntity('robots');
               *  which will fetch a promise containing the JSON with the response
               *
               *  @return a promise containing the JSON with the response from the proxy. The 
               *  promise itself contains an array of entities. 
              **/
      this.getTemplateModels = function(entityName) {
        return $http({
          url: this.getProxyUrl() + '/models/' + entityName,
          method: 'GET'
        });
      };
    }
  ]);
})();
