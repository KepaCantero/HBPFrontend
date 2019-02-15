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

  const RecorderState = {
    Stopped: 'stopped',
    Recording: 'recording',
    Paused: 'paused',
    WaitUserConfirm: 'waitUserConfirm',
    Saving: 'saving'
  };

  class RecorderPanelService {
    constructor(backendInterfaceService, simulationInfo, storageServer) {
      this.backendInterfaceService = backendInterfaceService;
      this.simulationInfo = simulationInfo;
      this.hidden = true;
      this.state = RecorderState.Stopped;
      this.descriptionText = '';
      this.storageServer = storageServer;

      if (simulationInfo.simulationID)
        this.backendInterfaceService.getRecording().then(response => {
          if (response.state == 'True') this.state = RecorderState.Recording;
        });
    }

    isPaused() {
      return this.state == RecorderState.Paused;
    }

    waitingForUserConfirm() {
      return this.state == RecorderState.WaitUserConfirm;
    }

    isRecording() {
      return this.state == RecorderState.Recording;
    }

    isStopped() {
      return this.state == RecorderState.Stopped;
    }

    isSaving() {
      return this.state == RecorderState.Saving;
    }

    toggleShow() {
      if (this.state == RecorderState.Stopped) this.start();
      else this.hidden = !this.hidden;
    }

    start() {
      this.backendInterfaceService.startRecording();
      this.state = RecorderState.Recording;
      this.hidden = true;
    }

    stop() {
      if (this.state != RecorderState.Paused)
        this.backendInterfaceService.stopRecording();

      this.state = RecorderState.WaitUserConfirm;
    }

    save() {
      this.state = RecorderState.Saving;
      this.backendInterfaceService.saveRecording().then(response => {
        this.state = RecorderState.Stopped;
        this.hidden = true;
        this.backendInterfaceService.resetRecording();

        if (response.filename) {
          let descFilename =
            response.filename.substr(0, response.filename.lastIndexOf('.')) +
            '.txt';
          this.storageServer.setFileContent(
            this.simulationInfo.experimentID,
            'recordings/' + descFilename,
            this.descriptionText
          );
        }
      });
    }

    cancelSave() {
      this.state = RecorderState.Stopped;
      this.hidden = true;
      this.backendInterfaceService.resetRecording();
    }

    pause(doPause) {
      this.hidden = true;
      this.state = doPause ? RecorderState.Paused : RecorderState.Recording;
      if (doPause) this.backendInterfaceService.stopRecording();
      else this.backendInterfaceService.startRecording();
    }
  }

  RecorderPanelService.$$ngIsClass = true;
  RecorderPanelService.$inject = [
    'backendInterfaceService',
    'simulationInfo',
    'storageServer'
  ];

  angular
    .module('recorderPanelModule')
    .service('recorderPanelService', RecorderPanelService);
})();
