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
      storageServerTokenManager,
      newExperimentProxyService
    ) {
      this.$resource = $resource;
      this.$window = $window;
      this.$q = $q;
      this.$stateParams = $stateParams;
      this.storageServerTokenManager = storageServerTokenManager;
      this.bbpConfig = bbpConfig;
      this.newExperimentProxyService = newExperimentProxyService;

      this.CLIENT_ID = bbpConfig.get('auth.clientId');
      this.PROXY_URL = bbpConfig.get('api.proxy.url');
      this.STORAGE_BASE_URL = `${this.PROXY_URL}/storage`;
      this.EXPERIMENT_BASE_URL = `${this.PROXY_URL}/experiment`;
      this.IDENTITY_BASE_URL = `${this.PROXY_URL}/identity`;
      this.CUSTOM_MODELS_URL = `/custommodels`;

      this.buildStorageResource();
    }

    buildStorageResource() {
      const FILE_REGEXP = /attachment; filename=(.*)/;
      let buildAction = action =>
        angular.merge(action, {
          headers: { 'Context-Id': () => this.$stateParams.ctx }
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
          setClonedExperiment: buildAction({
            method: 'POST',
            url: `${this.STORAGE_BASE_URL}/clone/:experiment`,
            transformRequest: []
          }),
          getCustomModels: buildAction({
            method: 'GET',
            isArray: true,
            url: `${this.STORAGE_BASE_URL}/custommodels/:modelType`
          }),
          cloneTemplate: buildAction({
            method: 'POST',
            url: `${this.STORAGE_BASE_URL}/clone/`
          }),
          cloneNew: buildAction({
            method: 'POST',
            url: `${this.STORAGE_BASE_URL}/clonenew/`
          }),
          getMaintenanceMode: buildAction({
            method: 'GET',
            url: `${this.PROXY_URL}/maintenancemode`
          }),
          setCustomModel: buildAction({
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            url: `${this.STORAGE_BASE_URL}/custommodels/:modelType/:modelName`,
            transformRequest: []
          }),
          logActivity: buildAction({
            method: 'POST',
            url: `${this.PROXY_URL}/activity_log/:activity`,
            transformRequest: []
          }),
          getBrain: buildAction({
            url: `${this.EXPERIMENT_BASE_URL}/:experimentId/brain`
          }),
          saveBrain: buildAction({
            method: 'PUT',
            url: `${this.EXPERIMENT_BASE_URL}/:experimentId/brain`,
            transformRequest: []
          }),
          getStateMachines: buildAction({
            url: `${this.EXPERIMENT_BASE_URL}/:experimentId/stateMachines`
          }),
          saveStateMachines: buildAction({
            method: 'PUT',
            url: `${this.EXPERIMENT_BASE_URL}/:experimentId/stateMachines`,
            transformRequest: []
          }),
          getTransferFunctions: buildAction({
            url: `${this.EXPERIMENT_BASE_URL}/:experimentId/transferFunctions`
          }),
          saveTransferFunctions: buildAction({
            method: 'PUT',
            url: `${this.EXPERIMENT_BASE_URL}/:experimentId/transferFunctions`,
            transformRequest: []
          }),
          getExperimentConfig: buildAction({
            method: 'GET',
            url: `${this.EXPERIMENT_BASE_URL}/:experimentId/config`
          })
        }
      );
    }

    getCustomModels(modelType) {
      return this.proxyRsc.getCustomModels({ modelType }).$promise;
    }

    setCustomModel(modelName, modelType, fileContent) {
      return this.proxyRsc.setCustomModel({ modelName, modelType }, fileContent)
        .$promise;
    }

    getExperiments(filter) {
      return this.proxyRsc.getExperiments({ filter }).$promise;
    }

    getExperimentConfig(experimentId) {
      return this.proxyRsc.getExperimentConfig({ experimentId }).$promise;
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

    cloneClonedExperiment(experiment) {
      return this.proxyRsc.setClonedExperiment({ experiment }, null).$promise;
    }

    cloneTemplate(expPath, contextId) {
      return this.proxyRsc.cloneTemplate({ expPath, contextId }).$promise;
    }

    cloneNew(modelsPaths, contextId, experimentName) {
      return this.proxyRsc.cloneNew({ modelsPaths, contextId, experimentName })
        .$promise;
    }

    getMaintenanceMode() {
      return this.proxyRsc.getMaintenanceMode().$promise;
    }

    logActivity(activity, logObject) {
      return this.proxyRsc.logActivity({ activity }, JSON.stringify(logObject))
        .$promise;
    }

    getBrain(experimentId) {
      return this.proxyRsc.getBrain({ experimentId }).$promise;
    }

    saveBrain(experimentId, brain, populations) {
      return this.proxyRsc.saveBrain(
        { experimentId },
        JSON.stringify({ brain, populations })
      ).$promise;
    }

    getStateMachines(experimentId) {
      return this.proxyRsc.getStateMachines({ experimentId }).$promise;
    }

    saveStateMachines(experimentId, stateMachines) {
      return this.proxyRsc.saveStateMachines(
        { experimentId },
        JSON.stringify({ stateMachines })
      ).$promise;
    }

    getTransferFunctions(experimentId) {
      return this.proxyRsc.getTransferFunctions({ experimentId }).$promise;
    }

    saveTransferFunctions(experimentId, transferFunctions) {
      return this.proxyRsc.saveTransferFunctions(
        { experimentId },
        JSON.stringify({ transferFunctions })
      ).$promise;
    }

    getRobotConfigPath(experimentID) {
      return this.getFileContent(
        experimentID,
        'experiment_configuration.exc',
        true
      )
        .then(exc => {
          const xml = $.parseXML(exc.data);
          const bibiConf = xml.getElementsByTagNameNS('*', 'bibiConf')[0];

          return this.getFileContent(
            experimentID,
            bibiConf.attributes.src.value,
            true
          );
        })
        .then(bibi => {
          const xml = $.parseXML(bibi.data);
          const bodyModel = xml.getElementsByTagNameNS('*', 'bodyModel')[0];

          if (!bodyModel.attributes.customAsset) {
            //no custom asset attribute => backwards compatbility mode
            return (
              this.bbpConfig.get('api.proxy.url') +
              `/storage/${experimentID}/robot.config?byname=true`
            );
          }

          if (bodyModel.attributes.customAsset.value == 'true') {
            //robot is a custom model
            return this.getCustomModels('robots')
              .then(robots =>
                robots.find(robot =>
                  robot.path.endsWith(
                    window.encodeURIComponent(
                      `/robots/${bodyModel.attributes.assetPath.value}`
                    )
                  )
                )
              )
              .then(robot =>
                window.encodeURIComponent(
                  `${this.STORAGE_BASE_URL}/custommodelconfig/${robot.path}`
                )
              );
          } else {
            //robot comes from the templates
            let robotId = bodyModel.attributes.assetPath.value
              .split('/')
              .slice(-1)
              .pop();

            return `${this.newExperimentProxyService.getModelUrl(
              'robots'
            )}/${robotId}/config`;
          }
        });
    }
  }

  StorageServer.$inject = [
    '$resource',
    '$window',
    '$q',
    '$stateParams',
    'bbpConfig',
    'storageServerTokenManager',
    'newExperimentProxyService'
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

    clearStoredToken() {
      localStorage.removeItem(this.STORAGE_KEY);
    }

    getStoredToken() {
      let storedItem = localStorage.getItem(this.STORAGE_KEY);
      if (!storedItem) {
        // this token will be rejected by the server and the client will get a proper auth error
        return 'no-token';
      }

      try {
        let tokens = JSON.parse(storedItem);
        return tokens.length ? tokens[tokens.length - 1].access_token : null;
      } catch (e) {
        // this token will be rejected by the server and the client will get a proper auth error
        return 'malformed-token';
      }
    }
  }

  StorageServerTokenManager.$$ngIsClass = true;
  StorageServerTokenManager.$inject = ['$location', 'bbpConfig'];

  angular
    .module('storageServer', [
      'ngResource',
      'bbpConfig',
      'ui.router',
      'newExperiment'
    ])
    .service('storageServer', StorageServer)
    .service('storageServerTokenManager', StorageServerTokenManager);
})();
