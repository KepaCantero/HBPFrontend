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

  angular.module('nrpUser', ['bbpConfig', 'storageServer']).service('nrpUser', [
    '$window',
    '$q',
    'storageServer',
    'bbpConfig',
    function($window, $q, storageServer) {
      var getCurrentUser = () => storageServer.getCurrentUser();

      var getCurrentUserGroups = _.memoize(() =>
        storageServer.getCurrentUserGroups()
      );

      var getReservation = () =>
        $window.sessionStorage.getItem('clusterReservation');

      let isGroupMember = group =>
        getCurrentUserGroups().then(groups =>
          groups.some(g => g.name === group)
        );

      var getOwnerName = userId =>
        storageServer
          .getUser(userId)
          .then(({ displayName }) => displayName)
          .catch(() => 'Unkwown');

      let getCurrentUserInfo = () =>
        $q.all([storageServer.getCurrentUser()]).then(([{ id }]) => ({
          userID: id
        }));

      return {
        getCurrentUser: _.memoize(getCurrentUser),
        getReservation: getReservation,
        isMemberOfClusterReservationGroup: () =>
          isGroupMember('hbp-sp10-cluster-reservation'),
        isAdministrator: () => isGroupMember('hbp-sp10-administrators'),
        getOwnerDisplayName: _.memoize(getOwnerName),
        getCurrentUserInfo: _.memoize(getCurrentUserInfo)
      };
    }
  ]);
})();
