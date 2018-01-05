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
    .module('exdFrontendApp.Constants')
    .constant('SERVER_POLL_INTERVAL', 10 * 1000)
    .constant('CLUSTER_THRESHOLDS', {
      UNAVAILABLE: 2,
      AVAILABLE: 4
    });

  angular
    .module('experimentServices')
    .constant('FAIL_ON_ALL_SERVERS_ERROR', {
      type: 'ServerError',
      message:
        'No server can handle your simulation at the moment. Please try again later'
    })
    .constant('FAIL_ON_SELECTED_SERVER_ERROR', {
      type: 'ServerError',
      message:
        'The selected server cannot handle your simulation at the moment. Please try again later'
    })
    .factory('experimentsFactory', [
      '$q',
      '$interval',
      '$log',
      'experimentProxyService',
      'uptimeFilter',
      'experimentSimulationService',
      'clbErrorDialog',
      'SERVER_POLL_INTERVAL',
      'nrpUser',
      'environmentService',
      'FAIL_ON_SELECTED_SERVER_ERROR',
      'FAIL_ON_ALL_SERVERS_ERROR',
      'CLUSTER_THRESHOLDS',
      'storageServer',
      '$stateParams',
      function(
        $q,
        $interval,
        $log,
        experimentProxyService,
        uptimeFilter,
        experimentSimulationService,
        clbErrorDialog,
        SERVER_POLL_INTERVAL,
        nrpUser,
        environmentService,
        FAIL_ON_SELECTED_SERVER_ERROR,
        FAIL_ON_ALL_SERVERS_ERROR,
        CLUSTER_THRESHOLDS,
        storageServer,
        $stateParams
      ) {
        const baseDependecies = [
          SERVER_POLL_INTERVAL,
          experimentSimulationService,
          uptimeFilter,
          nrpUser,
          clbErrorDialog,
          FAIL_ON_SELECTED_SERVER_ERROR,
          FAIL_ON_ALL_SERVERS_ERROR,
          $interval,
          $q
        ];
        return {
          createExperimentsService: loadPrivateExperiments => {
            /*global PrivateExperimentsService,TemplateExperimentsService */
            if (loadPrivateExperiments)
              return new PrivateExperimentsService(
                storageServer,
                $stateParams,
                experimentProxyService,
                ...baseDependecies
              );
            else
              return new TemplateExperimentsService(
                experimentProxyService,
                $q,
                ...baseDependecies
              );
          }
        };
      }
    ]);
})();
