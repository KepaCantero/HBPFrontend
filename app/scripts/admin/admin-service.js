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

  class AdminService {
    constructor($resource, bbpConfig) {
      const STORAGE_BASE_URL = bbpConfig.get('api.proxy.url');

      this.proxyRsc = $resource(
        STORAGE_BASE_URL,
        {},
        {
          setStatus: {
            method: 'POST',
            url: `${STORAGE_BASE_URL}/admin/status/:maintenance`
          },
          getStatus: {
            method: 'GET',
            url: `${STORAGE_BASE_URL}/admin/status`
          },
          getServers: {
            method: 'GET',
            isArray: true,
            url: `${STORAGE_BASE_URL}/admin/servers`
          },
          restartServer: {
            method: 'POST',
            url: `${STORAGE_BASE_URL}/admin/restart/:server`
          },
          retrieveServerLogs: {
            method: 'POST',
            isArray: false,
            responseType: 'blob',
            transformResponse: data => ({ data }),
            url: `${STORAGE_BASE_URL}/admin/backendlogs/:server`
          }
        }
      );
    }

    setStatus(maintenance) {
      return this.proxyRsc.setStatus({ maintenance }, null).$promise;
    }

    getStatus() {
      return this.proxyRsc.getStatus();
    }

    getServers() {
      return this.proxyRsc.getServers().$promise;
    }

    restartServer(serverStatus) {
      serverStatus.busy = true;
      return this.proxyRsc.restartServer({ server: serverStatus.server }, null)
        .$promise;
    }

    downloadBlob(blob, fineName) {
      const link = document.createElement('a');
      link.style.display = 'none';
      document.body.appendChild(link);
      link.href = URL.createObjectURL(blob);
      link.download = fineName;
      link.click();
      window.URL.revokeObjectURL && window.URL.revokeObjectURL(link.href);
      document.body.removeChild(link);
    }
    retrieveServerLogs(serverStatus) {
      serverStatus.busy = true;
      return this.proxyRsc
        .retrieveServerLogs({ server: serverStatus.server }, null)
        .$promise.then(response =>
          this.downloadBlob(
            response.data,
            `log_${serverStatus.server}_${new Date().toISOString()}.tar.gz`
          )
        );
    }
  }

  AdminService.$inject = ['$resource', 'bbpConfig'];

  angular.module('adminModule').service('adminService', AdminService);
})();
