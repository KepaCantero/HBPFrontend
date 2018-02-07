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

  class AdminPageCtrl {
    static get SERVER_POLL_INTERVAL() {
      return 5000;
    }

    constructor($scope, adminService, nrpUser) {
      this.adminService = adminService;
      this.adminRights = false;
      nrpUser.isAdministrator().then(res => (this.adminRights = res));
      this.status = adminService.getStatus();

      this.serversPolling$ = Rx.Observable
        .timer(0, AdminPageCtrl.SERVER_POLL_INTERVAL)
        .subscribe(() => (this.servers = adminService.getServers()));

      // work around a but that prevents the $onDestroy from beeing called for controllers  instanticated by the router
      //ie: https://github.com/angular/angular.js/issues/14376
      $scope.$on('$destroy', () => this.$onDestroy());
    }

    setMaintenanceMode(maintenance) {
      console.log(`maintenance: ${maintenance}`);
      this.adminService.setStatus(maintenance);
    }

    restartServer(server) {
      this.adminService.restartServer(server);
    }

    $onDestroy() {
      this.serversPolling$.unsubscribe();
    }
  }

  AdminPageCtrl.$inject = ['$scope', 'adminService', 'nrpUser'];

  angular.module('adminModule', []).controller('adminPageCtrl', AdminPageCtrl);
})();
