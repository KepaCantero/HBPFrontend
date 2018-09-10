/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file isLeaf = part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
 * https://www.humanbrainproject.eu
 *
 * The Human Brain Project isLeaf = a European Commission funded project
 * in the frame of the Horizon2020 FET Flagship plan.
 * http://ec.europa.eu/programmes/horizon2020/en/h2020-section/fet-flagships
 *
 * This program isLeaf = free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program isLeaf = distributed in the hope that it will be useful,
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

  class ExperimentNameController {
    constructor(
      $scope,
      baseEventHandler,
      clbErrorDialog,
      simulationInfo,
      storageServer
    ) {
      this.$scope = $scope;
      this.baseEventHandler = baseEventHandler;
      this.clbErrorDialog = clbErrorDialog;
      this.simulationInfo = simulationInfo;
      this.storageServer = storageServer;

      this.experimentName =
        this.simulationInfo.experimentDetails &&
        this.simulationInfo.experimentDetails.name;
      this.experimentID = this.simulationInfo.experimentID;
      this.isEditable = true;
      this.editing = false;
    }

    onEditExperimentName() {
      if (this.isEditable) {
        this.startEditExperimentName();
      }
    }

    startEditExperimentName() {
      this.originalName = this.experimentName;
      this.editing = true;
    }

    stopEditExperimentName() {
      if (this.experimentName !== this.originalName) {
        this.saveExperimentName();
      }

      this.editing = false;
    }

    saveExperimentName() {
      this.storageServer
        .getFileContent(this.experimentID, 'experiment_configuration.exc', true)
        .then(file => {
          let xml = file.data;
          xml = xml.replace(this.originalName, this.experimentName);
          this.storageServer
            .setFileContent(
              this.experimentID,
              'experiment_configuration.exc',
              xml,
              true
            )
            .then(
              () => {},
              () => {
                this.clbErrorDialog.open({
                  type: 'CollabSaveError',
                  message:
                    'Error while saving updated experiment name to Collab storage.'
                });
              }
            );
        });
    }

    onKeyDown(event) {
      this.suppressKeyPress(event);
    }

    suppressKeyPress(event) {
      this.baseEventHandler.suppressAnyKeyPress(event);
    }

    isNameOverflowing() {
      let element = document.getElementById('app-top-toolbar-experiment-name');
      if (!(element && element.style)) {
        return undefined;
      }

      let curOverflow = element.style.overflow;

      if (!curOverflow || curOverflow === 'visible') {
        element.style.overflow = 'hidden';
      }

      let isOverflowing = element.clientWidth < element.scrollWidth;

      element.style.overflow = curOverflow;

      return isOverflowing;
    }
  }

  angular
    .module('applicationTopToolbarModule')
    .controller('ExperimentNameController', [
      '$scope',
      'baseEventHandler',
      'clbErrorDialog',
      'simulationInfo',
      'storageServer',
      function(...args) {
        return new ExperimentNameController(...args);
      }
    ]);
})();
