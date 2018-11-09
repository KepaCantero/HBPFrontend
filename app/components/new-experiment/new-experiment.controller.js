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

  class NewExperimentController {
    constructor(
      $scope,
      $window,
      $location,
      $timeout,
      $q,
      tipTooltipService,
      newExperimentProxyService,
      storageServer,
      clbConfirm,
      clbErrorDialog,
      $stateParams,
      experimentsFactory,
      nrpUser
    ) {
      this.$scope = $scope;
      this.$window = $window;
      this.$location = $location;
      this.$timeout = $timeout;
      this.clbConfirm = clbConfirm;
      this.clbErrorDialog = clbErrorDialog;
      this.$q = $q;
      this.tipTooltipService = tipTooltipService;
      this.newExperimentProxyService = newExperimentProxyService;
      this.storageServer = storageServer;
      this.experimentName = '';
      this.loadEnvironments();
      this.$stateParams = $stateParams;
      this.experimentsFactory = experimentsFactory;
      this.nrpUser = nrpUser;
    }

    parseEnvList(envArray) {
      return envArray.map(env => {
        return {
          id: env.id,
          path: env.path ? env.path : undefined,
          name: env.name,
          custom: env.custom ? env.custom : false,
          description: env.description,
          thumbnail: env.thumbnail
        };
      });
    }

    selectEnvironment(environment) {
      this.environment = environment;
    }

    loadEnvironments() {
      this.newExperimentProxyService
        .getTemplateModels('environments')
        .then(envs => {
          this.environments = [
            { name: 'Private', environments: [] },
            { name: 'Public', environments: [] }
          ];

          this.environments[1].environments = this.parseEnvList(envs.data);

          this.storageServer
            .getCustomModels('environments')
            .then(environments => {
              environments.map(env => {
                env.path = decodeURIComponent(env.path);
                env.custom = true;
              });

              this.environments[0].environments = this.environments[0].environments.concat(
                this.parseEnvList(environments)
              );
            });
        });
    }

    uploadEnvironment() {
      var input = $('<input type="file" style="display:none;" accept:".zip">');
      document.body.appendChild(input[0]);
      input.on('change', e => this.uploadModelZip(e.target.files[0]));
      input.click();
      $(window).one('focus', () => {
        if (input[0].files.length) this.uploadingModel = true;
      });
      document.body.removeChild(input[0]);
    }

    checkModelExists(customModels, filename) {
      return customModels.filter(customModel =>
        customModel.fileName.includes(filename)
      ).length
        ? this.clbConfirm
            .open({
              title: `A file with the name ${filename} exists`,
              confirmLabel: 'Yes',
              cancelLabel: 'No',
              template: 'Are you sure you would like to upload the file again?',
              closable: true
            })
            .catch(() => this.$q.resolve())
        : this.$q.resolve();
    }

    uploadModelZip(zip) {
      return this.$timeout(() => {
        if (zip.type !== 'application/zip') {
          this.createErrorPopup(
            'The file you uploaded is not a zip. Please provide a zipped model'
          );
          return this.$q.reject();
        }
        return this.$q(resolve => {
          let textReader = new FileReader();
          textReader.onload = e => resolve([zip.name, e.target.result]);
          textReader.readAsArrayBuffer(zip);
        })
          .then(([filename, filecontent]) =>
            this.storageServer
              .getCustomModels('environments')
              .then(customModels =>
                this.checkModelExists(customModels, filename)
              )
              .then(() =>
                this.storageServer.setCustomModel(
                  filename,
                  'environments',
                  filecontent
                )
              )
              .catch(
                err => this.createErrorPopup(err.data) && this.$q.reject(err)
              )
              .then(() => this.loadEnvironments())
              .finally(() => (this.uploadingModel = false))
          )
          .catch(() => (this.uploadingModel = false))
          .finally(() => (this.uploadingModel = false));
      });
    }

    launchExperiment(experiment, launchSingleMode) {
      this.storageServer.logActivity('simulation_start', {
        experiment: experiment
      });

      this.experimentsService = this.experimentsFactory.createExperimentsService(
        true
      );

      this.experimentsService.initialize();

      this.launchingExperiment = true;
      this.launchingExperimentText = 'Launching an experiment...';

      this.experimentsService
        .getExperiments()
        .then(experiments => {
          var elements = experiments.filter(e => e.id == experiment);
          if (elements.length > 0) {
            experiment = elements[0];

            this.experimentsService
              .startExperiment(
                experiment,
                launchSingleMode,
                this.nrpUser.getReservation()
              )
              .then(
                path => {
                  this.tipTooltipService.hidden = true;
                  this.$location.path(path);
                },
                msg => {
                  this.launchingExperiment = false;
                  this.createErrorPopup('Failed to launch experiments: ' + msg);
                },
                msg => {
                  this.launchingExperimentText = msg.sub ? msg.sub : msg.main;
                }
              ); //in progress
          }
        })
        .catch(err =>
          this.createErrorPopup('Failed to load experiments:' + err)
        );
    }

    cloneAndLaunch() {
      var paths = {
        environmentPath: {
          path: this.environment.path,
          custom: this.environment.custom ? this.environment.custom : false,
          name: this.environment.name
        }
      };

      this.isCloneRequested = true;

      this.storageServer.logActivity('create_experiment', {
        template: this.environment.id,
        experiment: this.experimentName
      });

      this.storageServer
        .cloneNew(paths, this.$stateParams.ctx, this.experimentName)
        .then(exp => {
          this.isCloneRequested = false;
          this.launchExperiment(exp.newExperiment, false);
        })
        .catch(err => this.createErrorPopup(err.data))
        .finally(() => (this.isCloneRequested = false));
    }

    createErrorPopup(errorMessage) {
      this.clbErrorDialog.open({
        type: 'Error.',
        message: errorMessage
      });
    }
  }

  NewExperimentController.$$ngIsClass = true;
  NewExperimentController.$inject = [
    '$scope',
    '$window',
    '$location',
    '$timeout',
    '$q',
    'tipTooltipService',
    'newExperimentProxyService',
    'storageServer',
    'clbConfirm',
    'clbErrorDialog',
    '$stateParams',
    'experimentsFactory',
    'nrpUser'
  ];

  angular
    .module('newExperiment')
    .controller('NewExperimentController', NewExperimentController);
})();
