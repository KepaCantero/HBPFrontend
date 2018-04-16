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

  class RobotDocViewerCtrl {
    constructor($sce) {
      this.$sce = $sce;
    }

    enforceArray(obj, fieldName) {
      if (!obj || !obj[fieldName] || Array.isArray(obj[fieldName])) return;
      obj[fieldName] = [obj[fieldName]];
    }

    $onInit() {
      if (this.config.model && this.config.model.author) {
        this.enforceArray(this.config.model.author, 'name');
        this.enforceArray(this.config.model.author, 'email');
      }

      if (this.config.model.documentation) {
        this.enforceArray(this.config.model.documentation, 'picture');
        this.enforceArray(this.config.model.documentation, 'youtube');
        this.enforceArray(this.config.model.documentation, 'publication');
        this.enforceArray(this.config.model.documentation.sensors, 'sensor');
        this.enforceArray(
          this.config.model.documentation.actuators,
          'actuator'
        );

        if (this.config.model.documentation.youtube) {
          for (let youtube of this.config.model.documentation.youtube)
            youtube.url = this.$sce.trustAsResourceUrl(
              'http://www.youtube.com/embed/' + youtube['_youtube-id']
            );
        }
      }

      this.show = true;
    }
  }

  RobotDocViewerCtrl.$inject = ['$sce'];

  angular.module('robotDocumentation', []).component('robotDocViewer', {
    templateUrl:
      'components/robot-documentation/robot-documentation.template.html',
    bindings: {
      config: '='
    },
    controller: RobotDocViewerCtrl
  });
})();
