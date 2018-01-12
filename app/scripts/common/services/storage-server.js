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

  class StorageServer {
    constructor(
      $resource,
      $window,
      $q,
      $stateParams,
      bbpConfig,
      storageServerTokenManager
    ) {
      this.$resource = $resource;
      this.$window = $window;
      this.$q = $q;
      this.$stateParams = $stateParams;
      this.storageServerTokenManager = storageServerTokenManager;

      this.CLIENT_ID = bbpConfig.get('auth.clientId');
      this.PROXY_URL = bbpConfig.get('api.proxy.url');
      this.STORAGE_BASE_URL = `${this.PROXY_URL}/storage`;
      this.IDENTITY_BASE_URL = `${this.PROXY_URL}/identity`;
      this.CUSTOM_MODELS_URL = `/custommodels`;

      this.buildStorageResource();
    }

    buildStorageResource() {
      const FILE_REGEXP = /attachment; filename=(.*)/;
      let buildAction = action =>
        angular.merge(action, {
          headers: { 'Context-Id': () => this.$stateParams.ctx },
          interceptor: {
            responseError: err => this.$q.reject(this.onError(err))
          }
        });

      let transformFileResponse = (data, header) => {
        let uuid = header('uuid');
        let filename = header('content-disposition');
        filename = filename && FILE_REGEXP.exec(filename);
        filename = filename && filename[1];
        return {
          found: !!uuid,
          uuid,
          filename,
          data
        };
      };

      this.proxyRsc = this.$resource(
        this.STORAGE_BASE_URL,
        {},
        {
          getExperiments: buildAction({
            method: 'GET',
            isArray: true,
            url: `${this.STORAGE_BASE_URL}/experiments`
          }),
          getFile: buildAction({
            method: 'GET',
            transformResponse: transformFileResponse,
            url: `${this.STORAGE_BASE_URL}/:experimentId/:filename`,
            responseType: 'text'
          }),
          getUserInfo: buildAction({
            method: 'GET',
            url: `${this.IDENTITY_BASE_URL}/:userid`
          }),
          getCurrentUserGroups: buildAction({
            method: 'GET',
            isArray: true,
            url: `${this.IDENTITY_BASE_URL}/me/groups`
          }),
          getExperimentFiles: buildAction({
            method: 'GET',
            isArray: true,
            url: `${this.STORAGE_BASE_URL}/:experimentId`
          }),
          getBlob: buildAction({
            method: 'GET',
            responseType: 'blob',
            transformResponse: transformFileResponse,
            url: `${this.STORAGE_BASE_URL}/:experimentId/:filename`
          }),
          deleteFile: buildAction({
            method: 'DELETE',
            isArray: true,
            url: `${this.STORAGE_BASE_URL}/:experimentId/:filename`
          }),
          deleteExperiment: buildAction({
            method: 'DELETE',
            url: `${this.STORAGE_BASE_URL}/:experimentId`
          }),
          setFile: buildAction({
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            url: `${this.STORAGE_BASE_URL}/:experimentId/:filename`
          }),
          setBlob: buildAction({
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            url: `${this.STORAGE_BASE_URL}/:experimentId/:filename`,
            transformRequest: []
          }),
          getCustomModels: buildAction({
            method: 'GET',
            isArray: true,
            url: `${this.STORAGE_BASE_URL}/custommodels/:modelType`
          })
        }
      );
    }

    onError(err) {
      let absoluteUrl = /^https?:\/\//i;
      if (err.status === 302) {
        //redirect
        let url = err.data;
        if (!absoluteUrl.test(url)) url = `${this.PROXY_URL}${url}`;
        localStorage.removeItem(this.STORAGE_KEY);
        this.$window.location.href = `${url}&client_id=${this
          .CLIENT_ID}&redirect_uri=${encodeURIComponent(location.href)}`;
      }
      return this.$q.reject(err);
    }

    getCustomModels(modelType) {
      return this.proxyRsc.getCustomModels({ modelType }).$promise;
    }

    getExperiments(filter) {
      return this.proxyRsc.getExperiments({ filter }).$promise;
    }

    getExperimentFiles(experimentId) {
      return this.proxyRsc.getExperimentFiles({ experimentId }).$promise;
    }

    getFileContent(experimentId, filename, byname = false) {
      return this.proxyRsc.getFile({ experimentId, filename, byname }).$promise;
    }

    getBlobContent(experimentId, filename, byname = false) {
      return this.proxyRsc.getBlob({ experimentId, filename, byname }).$promise;
    }

    getBase64Content(experimentId, filename, byname = false) {
      return this.proxyRsc
        .getBlob({ experimentId, filename, byname })
        .$promise.then(response =>
          this.$q((resolve, reject) => {
            let reader = new FileReader();
            reader.addEventListener('loadend', e => {
              if (e.target.result !== 'data:')
                resolve(e.target.result.replace(/data:[^;]*;base64,/g, ''));
              else reject();
            });
            reader.readAsDataURL(response.data);
          })
        );
    }

    deleteEntity(experimentId, filename, byname = false, type = 'file') {
      return this.proxyRsc.deleteFile({ experimentId, filename, byname, type })
        .$promise;
    }

    deleteFile(experimentId, filename, byname = false) {
      return this.deleteEntity(experimentId, filename, byname, 'file');
    }

    deleteFolder(experimentId, folderName, byname = false) {
      return this.deleteEntity(experimentId, folderName, byname, 'folder');
    }

    deleteExperiment(experimentId) {
      return this.proxyRsc.deleteExperiment({ experimentId }).$promise;
    }

    setFileContent(experimentId, filename, fileContent, byname = false) {
      return this.proxyRsc.setFile(
        { experimentId, filename, byname },
        fileContent
      ).$promise;
    }

    createFolder(experimentId, folderName) {
      return this.proxyRsc.setFile(
        { experimentId, filename: folderName, type: 'folder' },
        null
      ).$promise;
    }

    setBlobContent(experimentId, filename, fileContent, byname = false) {
      return this.proxyRsc.setBlob(
        { experimentId, filename, byname },
        new Uint8Array(fileContent)
      ).$promise;
    }

    getCurrentUser() {
      return (
        this.proxyRsc
          // similarly to the oidc api, the storage server 'identity/me' endpoint returns information about the current user
          .getUserInfo({ userid: 'me' }).$promise
      );
    }

    getUser(userid) {
      return this.proxyRsc.getUserInfo({ userid }).$promise;
    }

    getCurrentUserGroups() {
      return this.proxyRsc.getCurrentUserGroups().$promise;
    }
  }

  StorageServer.$$ngIsClass = true;
  StorageServer.$inject = [
    '$resource',
    '$window',
    '$q',
    '$stateParams',
    'bbpConfig',
    'storageServerTokenManager'
  ];

  class StorageServerTokenManager {
    constructor($location, bbpConfig) {
      this.$location = $location;
      this.CLIENT_ID = bbpConfig.get('auth.clientId');
      this.STORAGE_KEY = `tokens-${this
        .CLIENT_ID}@https://services.humanbrainproject.eu/oidc`;

      this.checkForNewTokenToStore();
    }

    checkForNewTokenToStore() {
      const path = this.$location.url();
      const accessTokenMatch = /&access_token=([^&]*)/.exec(path);

      if (!accessTokenMatch || !accessTokenMatch[1]) return;

      let accessToken = accessTokenMatch[1];

      localStorage.setItem(
        this.STORAGE_KEY,
        //eslint-disable-next-line camelcase
        JSON.stringify([{ access_token: accessToken }])
      );
      const pathMinusAccessToken = path.substr(
        0,
        path.indexOf('&access_token=')
      );
      this.$location.url(pathMinusAccessToken);
    }

    getStoredToken() {
      let storedItem = localStorage.getItem(this.STORAGE_KEY);
      if (!storedItem) {
        // this token will be rejected by the server and the client will get a proper auth error
        return 'no-token';
      }

      try {
        let tokens = JSON.parse(storedItem);
        return tokens[tokens.length - 1].access_token;
      } catch (e) {
        // this token will be rejected by the server and the client will get a proper auth error
        return 'malformed-token';
      }
    }
  }

  StorageServerTokenManager.$$ngIsClass = true;
  StorageServerTokenManager.$inject = ['$location', 'bbpConfig'];

  angular
    .module('storageServer', ['ngResource', 'bbpConfig', 'ui.router'])
    .service('storageServer', StorageServer)
    .service('storageServerTokenManager', StorageServerTokenManager)
    .factory('storageServerRequestInterceptor', [
      'storageServerTokenManager',
      storageServerTokenManager => ({
        request: function(requestConfig) {
          var token = storageServerTokenManager.getStoredToken();
          requestConfig.headers.Authorization = 'Bearer ' + token;
          return requestConfig;
        }
      })
    ])
    .config([
      '$httpProvider',
      $httpProvider =>
        $httpProvider.interceptors.push('storageServerRequestInterceptor')
    ]);
})();
