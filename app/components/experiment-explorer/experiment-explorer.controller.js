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

  class ExperimentExplorerController {
    constructor(
      $scope,
      $element,
      $window,
      $location,
      $stateParams,
      $q,
      $log,
      $uibModal,
      clbErrorDialog,
      storageServer,
      clbConfirm,
      experimentsFactory,
      tipTooltipService,
      baseEventHandler
    ) {
      this.$scope = $scope;
      this.$window = $window;
      this.$location = $location;
      this.$stateParams = $stateParams;
      this.storageServer = storageServer;
      this.$q = $q;
      this.$log = $log;
      this.$uibModal = $uibModal;
      this.clbErrorDialog = clbErrorDialog;
      this.clbConfirm = clbConfirm;
      this.tipTooltipService = tipTooltipService;

      this.experimentInput = $element.find('#experiment-input');
      this.experimentInput.on('change', e => this.uploadFile(e));
      this.experimentsFactory = experimentsFactory;

      $scope.$on('$destroy', () => this.experimentInput.off('change'));
      this.baseEventHandler = baseEventHandler;
      this.resourcesFolder = {};
    }

    loadPrivateExperimentList() {
      var experimentsService = this.experimentsFactory.createExperimentsService(
        true
      );
      experimentsService.initialize();
      experimentsService
        .getExperiments()
        .then(experiments => {
          this.privateExperiments = experiments;
        })
        .catch(err => this.onError('Failed to load Private Experiments', err));
    }

    isPrivateExperimentRunning(experiment) {
      this.isExperimentRunning = false;
      _.forEach(this.privateExperiments, privateExperiment => {
        if (experiment.uuid == privateExperiment.id) {
          this.isExperimentRunning =
            privateExperiment.private &&
            privateExperiment.joinableServers.length > 0;
          if (this.isExperimentRunning) {
            this.clbErrorDialog.open({
              type: 'Error.',
              message:
                'A Simulation based on this experiment is already running, cannot delete the experiment '
            });
          }
        }
      });
      return this.isExperimentRunning;
    }

    $onInit() {
      this.loadExperiments();
    }
    loadExperiments() {
      this.loadExperimentList();
      this.loadPrivateExperimentList();
    }
    loadResources(experimentid) {
      this.selectedParent = {};
      this.selectedParent.uuid = experimentid;
      this.resourcesFolder = this.selectedParent;
      this.loadParentFileList();
    }
    suppressKeyPress(event) {
      this.baseEventHandler.suppressAnyKeyPress(event);
    }
    loadExperimentList() {
      this.storageServer
        .getExperiments()
        .then(exps => (this.experimentList = exps))
        .catch(err => this.onError('Failed to load experiments', err))
        .finally(() => (this.experimentsLoaded = true));
    }

    loadParentFileList() {
      let selectedParent = this.selectedParent;
      this.storageServer
        .getExperimentFiles(selectedParent.uuid)
        .then(files => {
          files.forEach(f => {
            f.extension = this.getFileExtension(f);
            f.typeDescription = this.getFileType(f);
            f.icon = this.getFileIcon(f);
            f.modifiedDate = this.getFileModifiedDate(f);
          });
          return files;
        })
        .then(files => {
          selectedParent.files = files.filter(f => f.type === 'file');
          selectedParent.folders = files.filter(f => f.type === 'folder');
          selectedParent.folders.forEach(
            f => (f.parentFolder = selectedParent)
          );
        })
        .catch(err => this.onError('Failed to load experiment files', err))
        .finally(() => (selectedParent.loadingFiles = false));
    }

    onError(msg, err) {
      this.clbErrorDialog.open({ type: 'Error.', message: msg, data: err });
      this.$log.error(msg);
      this.$log.error(err);
    }

    selectExperiment(experiment) {
      this.selectedExperiment = experiment;
      this.selectedFileId = null;
      this.experimentList.forEach(e => {
        e.files = [];
        e.folders = [];
      });
      if (!this.experimentList.deleting) {
        this.selectParent(experiment);
      }
    }

    selectParent(parent) {
      parent.files = parent.files || [];
      parent.folders = parent.folders || [];

      let currentParent = parent;
      while (currentParent.parentFolder)
        currentParent = currentParent.parentFolder;

      let unselectChildren = parent => {
        parent.folders &&
          parent.folders.forEach(f => {
            f.selected = false;
            unselectChildren(f);
          });
      };

      unselectChildren(currentParent);

      currentParent = parent;
      while (currentParent.parentFolder) {
        currentParent.parentFolder.selected = true;
        currentParent = currentParent.parentFolder;
      }

      this.selectedParent = parent;

      parent.selected = true;
      parent.loadingFiles = true;
      this.loadParentFileList();
    }

    selectFile(fileId) {
      this.selectedFileId = fileId;
    }

    createFolder() {
      this.$uibModal
        .open({
          templateUrl: 'experiment-explorer-folder-name.html',
          show: true,
          backdrop: 'static',
          scope: this.$scope,
          keyboard: true,
          windowClass: 'modal-window'
          //size: 'lg'
        })
        .result.then(newfolder => {
          if (!newfolder) return;
          let parent = this.selectedParent;
          parent.creating = true;
          this.storageServer
            .createFolder(parent.uuid, newfolder)
            .then(() => this.selectParent(parent))
            .catch(err => this.onError('Failed to create folder', err))
            .finally(() => (parent.creating = false));
        });
    }

    deleteFolder(folder) {
      folder.deleting = true;
      let parent = folder.parentFolder;
      this.storageServer
        .deleteFolder(this.selectedParent.uuid, folder.uuid)
        .then(() => this.selectParent(parent))
        .catch(err => this.onError('Failed to delete folder', err))
        .finally(() => (folder.deleting = false));
    }

    deleteExperiment(experiment) {
      this.clbConfirm
        .open({
          title: 'Delete experiment?',
          confirmLabel: 'Yes',
          cancelLabel: 'No',
          template: 'Are you sure you would like to delete this experiment?',
          closable: true
        })
        .then(() => {
          this.experimentList.deleting = true;
          this.storageServer
            .deleteExperiment(experiment.uuid)
            .then(() => {
              this.selectedParent = undefined;
              this.loadExperimentList();
            })
            .catch(err => this.onError('Failed to delete experiment', err))
            .finally(() => (this.experimentList.deleting = false));
        });
    }

    deleteFile(file) {
      file.deleting = true;
      this.storageServer
        .deleteFile(this.selectedParent.uuid, file.uuid)
        .then(() => this.loadParentFileList())
        .catch(err => this.onError('Failed to delete file', err))
        .finally(() => (file.deleting = false));
    }

    downloadFile(file) {
      file.downloading = true;
      this.storageServer
        .getBlobContent(this.selectedParent.uuid, file.uuid)
        .then(response => {
          let link = document.createElement('a');
          link.style.display = 'none';
          document.body.appendChild(link);
          link.href = URL.createObjectURL(response.data);
          link.download = response.filename;
          link.click();
          document.body.removeChild(link);
        })
        .catch(err => this.onError('Failed to download file', err))
        .finally(() => (file.downloading = false));
    }

    uploadFileClick() {
      this.experimentInput.click();
    }

    uploadFile(e) {
      let selectedParent = this.selectedParent;
      selectedParent.uploading = true;
      let filesData = [...e.target.files].map(f =>
        this.$q(resolve => {
          let textReader = new FileReader();
          textReader.onload = e => resolve([f.name, e.target.result]);
          textReader.readAsArrayBuffer(f);
        }).then(([filename, filecontent]) =>
          this.storageServer
            .getExperimentFiles(this.selectedParent.uuid)
            .then(files => {
              return (files.filter(file => file.name == filename).length
                ? this.clbConfirm
                    .open({
                      title: `A file with the name ${filename} exists`,
                      confirmLabel: 'Yes',
                      cancelLabel: 'No',
                      template:
                        'Are you sure you would like to upload the file again?',
                      closable: true
                    })
                    .catch(() => this.$q.resolve())
                : this.$q.resolve()
              ).then(() =>
                this.storageServer.setBlobContent(
                  this.selectedParent.uuid,
                  filename,
                  filecontent,
                  true
                )
              );
            })
        )
      );
      return this.$q.resolve(
        this.$q
          .all(filesData)
          .then(() => this.loadParentFileList())
          .catch(err => this.onError('Failed to upload file', err))
          .finally(() => {
            e.target.value = null;
            selectedParent.uploading = false;
          })
      );
    }

    static get FILE_TYPES() {
      return [
        [/^experiment_configuration\.exc$/i, 'Experiment configuration'],
        [/.*\.exc$/i, 'An experiment configuration'],
        [/^env_editor\.autosaved$/i, 'Editor temporary work'],
        [/.*\.py$/i, 'Python script'],
        [/.*\.bibi$/i, 'Brain configuration'],
        [/.*\.3ds$/i, '3d settings'],
        [/.*\.js$/i, 'Javascript file'],
        [/.*\.sdf$/i, 'Model file'],
        [/.*\.json$/i, 'Configuration file'],
        [/.*\.png$/i, 'PNG image'],
        [/.*\.jpe?g$/i, 'JPEG image']
      ];
    }

    getFileExtension(f) {
      let parts = f.name.split('.');
      return parts[parts.length - 1].toLocaleLowerCase();
    }

    getFileType(f) {
      if (f.type === 'folder') return 'folder';

      for (let [regexp, desc] of ExperimentExplorerController.FILE_TYPES)
        if (regexp.test(f.name)) return desc;

      return `${f.extension} file`;
    }

    getFileModifiedDate(f) {
      return moment(f.modifiedOn).format('YYYY-MM-DD hh:mm:ss');
    }

    static get FILE_ICONS() {
      return {
        py: 'file-code-o',
        folder: 'folder-o',
        js: 'file-code-o',
        png: 'file-image-o',
        jpg: 'file-image-o',
        jpeg: 'file-image-o',
        json: 'file-text-o',
        '3ds': 'file-text-o',
        ini: 'file-text-o',
        bibi: 'file-text-o',
        sdf: 'file-text-o',
        exc: 'file-text-o'
      };
    }

    getFileIcon(f) {
      return ExperimentExplorerController.FILE_ICONS[f.extension] || 'file-o';
    }

    directToClonePage() {
      let clonePagePath = 'esv-private';
      this.$location.path(clonePagePath);
    }
  }

  ExperimentExplorerController.$$ngIsClass = true;
  ExperimentExplorerController.$inject = [
    '$scope',
    '$element',
    '$window',
    '$location',
    '$stateParams',
    '$q',
    '$log',
    '$uibModal',
    'clbErrorDialog',
    'storageServer',
    'clbConfirm',
    'experimentsFactory',
    'tipTooltipService',
    'baseEventHandler'
  ];
  class ResourcesExplorerController extends ExperimentExplorerController {
    constructor(
      $scope,
      $element,
      $window,
      $location,
      $stateParams,
      $q,
      $log,
      $uibModal,
      clbErrorDialog,
      storageServer,
      clbConfirm,
      experimentsFactory,
      tipTooltipService,
      simulationInfo,
      baseEventHandler,
      backendInterfaceService
    ) {
      super(
        $scope,
        $element,
        $window,
        $location,
        $stateParams,
        $q,
        $log,
        $uibModal,
        clbErrorDialog,
        storageServer,
        clbConfirm,
        experimentsFactory,
        tipTooltipService,
        baseEventHandler
      );

      this.$scope = $scope;
      this.storageServer = storageServer;
      this.simulationInfo = simulationInfo;
      this.resourcesFolder = {};
      this.selectedParent = {};
      this.backendInterfaceService = backendInterfaceService;
    }
    $onInit() {
      this.loadResourceFolderUuid(this.simulationInfo.experimentID);
    }

    uploadFile(e) {
      super.uploadFile(e).then(() => {
        this.backendInterfaceService.cloneFileResources();
      });
    }
    loadResourceFolderUuid(experiment) {
      this.storageServer
        .getExperimentFiles(experiment)
        .then(files => {
          this.resourcesFolder = files.filter(f => f.name === 'resources');
          super.loadResources(this.resourcesFolder[0].uuid);
        })
        .catch(err => this.onError('Failed to load Resources folder', err));
    }
    suppressKeyPress(event) {
      this.baseEventHandler.suppressAnyKeyPress(event);
    }
  }
  ResourcesExplorerController.$$ngIsClass = true;
  ResourcesExplorerController.$inject = [
    '$scope',
    '$element',
    '$window',
    '$location',
    '$stateParams',
    '$q',
    '$log',
    '$uibModal',
    'clbErrorDialog',
    'storageServer',
    'clbConfirm',
    'experimentsFactory',
    'tipTooltipService',
    'simulationInfo',
    'baseEventHandler',
    'backendInterfaceService'
  ];
  //window.ExperimentExplorerController = ExperimentExplorerController;
  angular
    .module('experimentExplorer', ['storageServer'])
    .controller('ExperimentExplorerController', ExperimentExplorerController)
    .controller('ResourcesExplorerController', ResourcesExplorerController);
})();
