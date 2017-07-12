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
(function ()
{
  'use strict';

  angular.module('simulationConfigModule', ['collabServices']).service('simulationConfigService',
    ['$resource', 'simulationInfo', 'serverError', '$q', 'collabFolderAPIService', '$http', 'environmentService',
      function ($resource, simulationInfo, serverError, $q, collabFolderAPIService, $http, environmentService)
      {
        return {
          initConfigFiles: initConfigFiles,
          doesConfigFileExist: doesConfigFileExist,
          loadConfigFile: loadConfigFile,
          saveConfigFile: saveConfigFile,
        };


        //-------------------------------------------------------
        // Get file from collab if available, if not try to get it directly from backend

        function doesConfigFileExist(configType)
        {
          return getBackendConfigFileNames(configType).then(function (response)
          {
            return !!response;
          });
        }

        function loadConfigFile(configType)
        {
          return getBackendConfigFileNames(configType).then(function (response)
          {
            if (response)
            {
              if (environmentService.isPrivateExperiment())
              {
                return collabFolderAPIService.getExperimentFolderId(simulationInfo.contextID)
                  .then(function (folderId)
                  {


                    var filename = response.file.substr(response.file.lastIndexOf('/') + 1);

                    return collabFolderAPIService.getFolderFile(folderId, filename)
                      .then(function (fileData)
                      {
                        if (fileData)
                        {
                          return collabFolderAPIService.downloadFile(fileData.uuid)
                            .then(function (fileContent)
                            {
                              if (fileContent)
                              {
                                return fileContent;
                              }
                              else
                              {
                                return getBackendConfigFile(response.file);
                              }
                            });
                        }
                        else
                        {
                          return getBackendConfigFile(response.file);
                        }
                      });
                  });
              }
              else
              {
                return getBackendConfigFile(response.file);
              }
            }

            return $q.reject();
          });
        }

        function saveConfigFile(configType, data)
        {
          if (environmentService.isPrivateExperiment())  // A config file can be saved only in collab mode
          {

            collabFolderAPIService.getExperimentFolderId(simulationInfo.contextID).then(function (folderId)
            {
              if (folderId)
              {
                return getBackendConfigFileNames(configType).then(function (response)
                {
                  if (response)
                  {

                    var filename = response.file.substr(response.file.lastIndexOf('/') + 1);

                    collabFolderAPIService.getFolderFile(folderId, filename)
                      .then(function (fileData)
                      {
                        if (fileData)
                        {
                          // File exists

                          collabFolderAPIService.deleteFile(folderId, filename)
                            .then(function (result)
                            {
                              if (result)
                              {
                                collabFolderAPIService.createFolderFile(folderId, filename, data).then(
                                  function (result)
                                  {
                                    return result;
                                  });
                              }
                            });
                        }
                        else
                        {
                          collabFolderAPIService.createFolderFile(folderId, filename, data).then(
                            function (result)
                            {
                              return result;
                            }
                          );
                        }
                      });
                  }
                });
              }
            });
          }
        }

        //-------------------------------------------------------
        // Direct backend access functions

        var cachedConfigFiles;

        function initConfigFiles(serverBaseUrl,simulationID)
        {
          cachedConfigFiles = $resource(serverBaseUrl + '/simulation/:sim_id/resources', {}, {
            get: {
              method: 'GET',
              interceptor: { responseError: serverError.displayHTTPError }
            }
          }).get({ sim_id: simulationID }).$promise
            .then(function (response)
            {
              return response && response.resources;
            });

            return cachedConfigFiles;
        }

        function findConfigFileName(configType, cachedConfigFiles)
        {
          for(var i=0;i<cachedConfigFiles.length;i++)
          {
            var r = cachedConfigFiles[i];

            if (r.type === configType) return r;
          }

          return null;
        }

        function getBackendConfigFileNames(configType)
        {
          if (!cachedConfigFiles)
          {
            return initConfigFiles(simulationInfo.serverBaseUrl,simulationInfo.simulationID).then(function()
            {
              return cachedConfigFiles.then(function (cachedConfigFiles)
              {
                return findConfigFileName(configType,cachedConfigFiles);
              });
            });
          }
          else
          {
            return cachedConfigFiles.then(function (cachedConfigFiles)
            {
                return findConfigFileName(configType,cachedConfigFiles);
            });
          }
        }

        function getBackendConfigFile(configFileName)
        {
          return $http({
            url: simulationInfo.serverBaseUrl + configFileName,
            method: 'GET',
            transformResponse: function (value)
            {
              return value;
            }
          }).then(function (response)
          {
            return response && response.data;
          });
        }
      }
    ]);
} ());
