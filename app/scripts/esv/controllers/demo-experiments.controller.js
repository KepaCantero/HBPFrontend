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

  class DemoExperimentsController {
    constructor(
      scope,
      experimentsFactory,
      timeout,
      location,
      environmentService
    ) {
      scope.vm = this;

      this.demoExperiments = [
        {
          image: 'img/demo/thumbnails/ExDBraitenbergHuskySBC_Anim.gif',
          id: 0
        },
        {
          image: 'img/demo/thumbnails/ExDBraitenbergMouseLab_Anim.gif',
          id: 1
        },
        {
          image: 'img/demo/thumbnails/ExDBraitenbergMouseLab_Anim.gif',
          id: 2
        },
        {
          image: 'img/demo/thumbnails/ExDBraitenbergMouseLab_Anim.gif',
          id: 3
        }
      ];

      this.joiningExperiment = false;
      this.timeout = timeout;
      this.location = location;
      this.stopWatching = false;
      this.environmentService = environmentService;
      this.experimentsFactory = experimentsFactory;

      scope.$on('$destroy', () => {
        this.stopWatching = true;
        if (this.experimentsService) {
          this.experimentsService.destroy();
        }
      });
    }

    tryJoiningExperiment() {
      if (!this.joiningExperiment) {
        return;
      }

      if (this.experiments) {
        for (let i = 0; i < this.experiments.length; i++) {
          let exp = this.experiments[i];
          if (exp.joinableServers.length > 0) {
            // One experiment is joinable

            let simul = exp.joinableServers[0];

            let path =
              'esv-web/experiment-view/' +
              simul.server +
              '/' +
              exp.id +
              '/' +
              this.environmentService.isPrivateExperiment() +
              '/' +
              simul.runningSimulation.simulationID;
            this.location.path(path);

            return;
          }
        }
      }

      if (!this.stopWatching) {
        this.timeout(() => {
          this.tryJoiningExperiment();
        }, 1000);
      }
    }

    launchExperiment() {
      this.joiningExperiment = true;
      if (!this.experimentsService) {
        this.experimentsService = this.experimentsFactory.createExperimentsService();
        this.experimentsService.initialize();
        this.experimentsService.experiments.then(
          experiments => (this.experiments = experiments)
        );
      }

      this.tryJoiningExperiment();
    }

    cancelLaunch() {
      this.experimentsService.destroy();
      this.experimentsService = undefined;

      this.joiningExperiment = false;
    }
  }

  DemoExperimentsController.$$ngIsClass = true;
  DemoExperimentsController.$inject = [
    '$scope',
    'experimentsFactory',
    '$timeout',
    '$location',
    'environmentService'
  ];

  angular
    .module('exdFrontendApp')
    .controller('demoExperimentsController', DemoExperimentsController);
})();
