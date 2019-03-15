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
  class ModelsLibrariesController {
    constructor(
      modelsLibrariesService,
      clbErrorDialog,
      nrpUser,
      clbConfirm,
      $q,
      nrpModalService
    ) {
      this.modelsLibrariesService = modelsLibrariesService;
      this.clbErrorDialog = clbErrorDialog;
      this.clbConfirm = clbConfirm;
      this.$q = $q;
      this.nrpModalService = nrpModalService;
      nrpUser.getOwnerDisplayName('me').then(owner => (this.owner = owner));
      this.models = [
        {
          name: 'robots',
          visible: false,
          data: undefined,
          loading: false
        },
        {
          name: 'environments',
          visible: false,
          data: undefined,
          loading: false
        },
        {
          name: 'brains',
          visible: false,
          data: undefined,
          loading: false
        }
      ];
      this.loadAllModels();
      this.query = '';
    }

    loadAllModels() {
      return this.$q.all(
        this.models.map(category =>
          this.modelsLibrariesService
            .generateModels(category.name)
            .then(models => {
              category.data = models;
              category.data.map(model => {
                model.isSelected = false;
                if (category.name === 'robots')
                  model.configpath = this.modelsLibrariesService.getRobotConfig(
                    model
                  );
              });
            })
        )
      );
    }

    findCategory(categoryName) {
      return this.models.find(category => category.name == categoryName);
    }

    toggleVisibility(categoryName) {
      this.models.forEach(category => {
        // if user clicks on category which is visible just set it to non visible
        category.name === categoryName && category.visible
          ? (category.visible = !category.visible)
          : // if user clicks on a category which is not visible then make this one visible
            category.name === categoryName
            ? (category.visible = true)
            : (category.visible = false);
      });
    }

    selectEntity(path) {
      this.models.forEach(category =>
        category.data.forEach(
          model =>
            model.path == path
              ? (model.isSelected = true)
              : (model.isSelected = false)
        )
      );
    }

    deleteModel(path) {
      return this.clbConfirm
        .open({
          title: 'Delete Model?',
          confirmLabel: 'Yes',
          cancelLabel: 'No',
          template: 'Are you sure you would like to delete this model?',
          closable: true
        })
        .then(() =>
          this.modelsLibrariesService
            .deleteCustomModel(path)
            .then(() => this.loadAllModels())
            .catch(err => this.createErrorPopup(err))
        );
    }

    createErrorPopup(errorMessage) {
      this.clbErrorDialog.open({
        type: 'Error.',
        message: errorMessage
      });
    }

    existsModelCustom(customModels, filename) {
      var customModelFound = customModels.find(customModel =>
        customModel.fileName.includes(filename)
      );
      if (customModelFound)
        return this.checkIfAppendExistsModelCustom(customModelFound, filename);
      else return this.$q.resolve();
    }

    checkIfAppendExistsModelCustom(customModelFound, filename) {
      if (customModelFound.userId == this.owner) {
        return this.clbConfirm
          .open({
            title: `One of your custom models already has the name: ${filename}`,
            confirmLabel: 'Yes',
            cancelLabel: 'No',
            template: 'Are you sure you would like to upload the file again?',
            closable: true
          })
          .catch(() => this.$q.resolve());
      } else {
        this.clbErrorDialog.open({
          type: `A Custom Model already exists with the name ${filename}`,
          message:
            'The model you tried to upload already exists in the database. Rename it and try uploading it again.'
        });
        return this.$q.reject();
      }
    }

    uploadModelZip(zip, entityType) {
      if (zip.type !== 'application/zip') {
        this.clbErrorDialog.open({
          type: 'Error.',
          message:
            'The file you uploaded is not a zip. Please provide a zipped model'
        });
        return this.$q.reject();
      }
      return this.$q(resolve => {
        let textReader = new FileReader();
        textReader.onload = e => resolve([zip.name, e.target.result]);
        textReader.readAsArrayBuffer(zip);
      }).then(([filename, filecontent]) => {
        this.modelsLibrariesService
          .getCustomModels(entityType)
          .then(customModels =>
            this.existsModelCustom(customModels, filename).then(() =>
              this.modelsLibrariesService
                .setCustomModel(filename, entityType, filecontent)
                .catch(err => {
                  this.nrpModalService.destroyModal();
                  this.createErrorPopup(err.data);
                  return this.$q.reject(err);
                })
                .then(() => {
                  this.loadAllModels().then(() =>
                    this.selectEntity(
                      this.findCategory(entityType).data.find(model =>
                        model.path.includes(filename)
                      ).path
                    )
                  );
                })
                .finally(() => (this.uploadingModel = false))
            )
          );
      });
    }

    uploadModel(modelType /*i.e. Robot , Brain*/) {
      var input = $('<input type="file" style="display:none;" accept:".zip">');
      document.body.appendChild(input[0]);
      input.click();
      input.on('change', e => {
        if (
          input[0].files.length &&
          input[0].files[0].type === 'application/zip'
        ) {
          this.uploadingModel = true;
          return this.uploadModelZip(e.target.files[0], modelType);
        }
      });
      document.body.removeChild(input[0]);
    }
  }

  ModelsLibrariesController.$$ngIsClass = true;
  ModelsLibrariesController.$inject = [
    'modelsLibrariesService',
    'clbErrorDialog',
    'nrpUser',
    'clbConfirm',
    '$q',
    'nrpModalService'
  ];

  angular
    .module('modelsLibraries')
    .controller('modelsLibrariesController', ModelsLibrariesController);
})();
