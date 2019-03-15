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

  class ModelsLibrariesService {
    constructor($q, storageServer, newExperimentProxyService) {
      this.$q = $q;
      this.newExperimentProxyService = newExperimentProxyService;
      this.storageServer = storageServer;
    }

    generateModels(modelType) {
      return this.$q
        .all([
          this.newExperimentProxyService.getTemplateModels(modelType),
          this.storageServer.getCustomModels(modelType)
        ])
        .then(res => {
          res[0].data.map(model => (model.public = true));
          res[1].map(model => (model.private = true));
          return [...res[0].data, ...res[1]];
        });
    }

    getCustomModels(entityType) {
      return this.storageServer.getAllCustomModels(entityType);
    }

    setCustomModel(filename, entityType, filecontent) {
      return this.storageServer.setCustomModel(
        filename,
        entityType,
        filecontent
      );
    }

    deleteCustomModel(path) {
      return this.storageServer.deleteCustomModel(decodeURIComponent(path));
    }

    getRobotConfig(robot) {
      return `${this.newExperimentProxyService.getModelUrl(
        'robots'
      )}/${robot.id}/config`;
    }
  }

  ModelsLibrariesService.$$ngIsClass = true;
  ModelsLibrariesService.$inject = [
    '$q',
    'storageServer',
    'newExperimentProxyService'
  ];

  angular
    .module('modelsLibraries')
    .service('modelsLibrariesService', ModelsLibrariesService);
})();
