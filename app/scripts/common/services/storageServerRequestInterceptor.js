/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file is part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
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
 * ---LICENSE-END **/
(function() {
  'use strict';

  class StorageServerRequestInterceptor {
    constructor(storageServerTokenManager, $window, $q, $location, bbpConfig) {
      this.storageServerTokenManager = storageServerTokenManager;
      this.PROXY_URL = bbpConfig.get('api.proxy.url');
      this.$window = $window;
      this.$q = $q;
      this.$location = $location;

      this.request = requestConfig => this.requestFn(requestConfig);
      this.responseError = err => this.responseErrorFn(err);
    }

    requestFn(requestConfig) {
      var token = this.storageServerTokenManager.getStoredToken();
      requestConfig.headers.Authorization = 'Bearer ' + token;
      return requestConfig;
    }

    responseErrorFn(err) {
      let absoluteUrl = /^https?:\/\//i;
      if (err.status === 477) {
        //redirect
        let url = err.data;
        if (!absoluteUrl.test(url)) url = `${this.PROXY_URL}${url}`;
        localStorage.removeItem(this.storageServerTokenManager.STORAGE_KEY);
        this.$window.location.href = `${url}&client_id=${this
          .storageServerTokenManager
          .CLIENT_ID}&redirect_uri=${encodeURIComponent(location.href)}`;
      } else if (err.status === 478) {
        this.$location.path('maintenance');
        return this.$q.resolve({});
      }
      return this.$q.reject(err);
    }
  }

  angular
    .module('storageServer')
    .factory('storageServerRequestInterceptor', [
      'storageServerTokenManager',
      '$window',
      '$q',
      '$location',
      'bbpConfig',
      (...args) => new StorageServerRequestInterceptor(...args)
    ])
    .config([
      '$httpProvider',
      $httpProvider =>
        $httpProvider.interceptors.push('storageServerRequestInterceptor')
    ]);
})();
