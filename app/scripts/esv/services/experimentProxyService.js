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

  angular
    .module('experimentServices', [
      'environmentServiceModule',
      'slurminfoService'
    ])
    .service('experimentProxyService', [
      '$http',
      '$q',
      'bbpConfig',
      'serverError',
      function($http, $q, bbpConfig, serverError) {
        var getProxyUrl = function() {
          return bbpConfig.get('api.proxy.url');
        };

        return {
          getExperiments: getExperiments,
          getImage: getImage,
          getServerConfig: _.memoize(getServerConfig),
          getAvailableServers: getAvailableServers,
          getSharedExperiments: getSharedExperiments,
          submitJob: submitJob,
          getPizDaintJobs: getPizDaintJobs,
          getJobStatus: getJobStatus,
          getJobOutcome: getJobOutcome,
          getServersWithNoBackend: getServersWithNoBackend
        };
        function getSharedExperiments() {
          var url = getProxyUrl() + '/sharedExperiments';
          return $http.get(url).then(function(response) {
            return response.data;
          });
        }
        function getServerConfig(serverId) {
          return $http
            .get(getProxyUrl() + '/server/' + serverId)
            .then(function(response) {
              return response.data;
            })
            .catch(serverError.displayHTTPError);
        }

        function getImage(experimentId) {
          return $q.when(getProxyUrl() + '/experimentImage/' + experimentId);
        }

        function getExperiments() {
          var url = getProxyUrl() + '/experiments';
          return $http.get(url).then(function(response) {
            return response.data;
          });
        }

        function getAvailableServers() {
          return $http
            .get(getProxyUrl() + '/availableServers')
            .then(response => response.data)
            .catch(serverError.displayHTTPError);
        }

        function getPizDaintJobs() {
          return $http
            .get(getProxyUrl() + '/getjobs')
            .then(function(response) {
              return response.data;
            })
            .catch(serverError.displayHTTPError);
        }

        function getServersWithNoBackend() {
          return $http
            .get(getProxyUrl() + '/serversWithNoBackend')
            .then(response => response.data)
            .catch(serverError.displayHTTPError);
        }

        function submitJob(server) {
          return $http({
            url: getProxyUrl() + '/submitjob',
            method: 'GET',
            params: { server: server }
          })
            .then(function(response) {
              return response.data;
            })
            .catch(serverError.displayHTTPError);
        }
        function getJobStatus(jobUrl) {
          return $http({
            url: getProxyUrl() + '/getjobinfo',
            method: 'GET',
            params: { jobUrl: jobUrl }
          })
            .then(function(response) {
              return response.data;
            })
            .catch(serverError.displayHTTPError);
        }
        function getJobOutcome(jobUrl) {
          return $http({
            url: getProxyUrl() + '/getjoboutcome',
            method: 'GET',
            params: { jobUrl: jobUrl }
          })
            .then(function(response) {
              return response.data;
            })
            .catch(serverError.displayHTTPError);
        }
      }
    ]);
})();
