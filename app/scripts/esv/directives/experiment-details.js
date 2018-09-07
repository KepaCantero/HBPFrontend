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

  angular.module('exdFrontendApp').directive('experimentDetails', [
    '$interval',
    'experimentProxyService',
    'nrpFrontendVersion',
    'nrpBackendVersions',
    'slurminfoService',
    'uptimeFilter',
    'CLUSTER_THRESHOLDS',
    'STATE',
    function(
      $interval,
      experimentProxyService,
      nrpFrontendVersion,
      nrpBackendVersions,
      slurminfoService,
      uptimeFilter,
      CLUSTER_THRESHOLDS,
      STATE
    ) {
      return {
        scope: true,
        link: function(scope, el, attrs) {
          scope.STATE = STATE;
          scope.CLUSTER_THRESHOLDS = CLUSTER_THRESHOLDS;
          scope.clusterAvailability = { free: 'N/A', total: 'N/A' };

          let slurminfoSubscription;
          scope.$watch(attrs.experimentDetails, exp => {
            if (slurminfoSubscription || !exp || exp.onlyLocalServers) return;

            slurminfoSubscription = slurminfoService.subscribe(
              availability => (scope.clusterAvailability = availability)
            );
          });

          scope.isCollapsed = true;
          scope.softwareVersions = '';

          scope.$watch('pageState.selected', () => (scope.isCollapsed = true));

          scope.setCollapsed = function(newState) {
            scope.isCollapsed = newState;
          };

          scope.getSoftwareVersions = function(server) {
            if (scope.isCollapsed) return;
            scope.softwareVersions = '';
            nrpFrontendVersion.get(
              ({ version }) =>
                (scope.softwareVersions += 'Frontend: ' + version + '\n')
            );

            if (!server) return;

            experimentProxyService
              .getServerConfig(server)
              .then(serverConfig => {
                nrpBackendVersions(serverConfig.gzweb['nrp-services']).get(
                  result => (scope.softwareVersions += result.toString)
                );
              });
          };

          let updateUptime = $interval(
            () =>
              scope.exp.joinableServers.forEach(
                s => (s.uptime = uptimeFilter(s.runningSimulation.creationDate))
              ),
            1000
          );

          scope.$on('$destroy', () => {
            $interval.cancel(updateUptime);
            slurminfoSubscription && slurminfoSubscription.unsubscribe();
          });
        }
      };
    }
  ]);
})();
