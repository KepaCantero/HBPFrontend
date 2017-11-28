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
  angular.module('exdFrontendApp').controller('esvExperimentsCtrl', [
    '$scope',
    '$location',
    '$timeout',
    'environmentService',
    'storageServer',
    'clbErrorDialog',
    function(
      $scope,
      $location,
      $timeout,
      environmentService,
      storageServer,
      clbErrorDialog
    ) {
      $scope.reloadExperiments = privateExperiment => {
        $scope.showExperiments = false;
        $scope.loadPrivateExperiments = privateExperiment;
        if (privateExperiment) $scope.cloningAnotherExperiement = false;
        $timeout(() => ($scope.showExperiments = true));
      };

      $scope.reinit = () => {
        if (environmentService.isPrivateExperiment()) {
          storageServer
            .getExperiments()
            .then(response => $scope.reloadExperiments(!!response.length))
            .catch(() =>
              clbErrorDialog.open({
                type: 'Private experiment error',
                message: 'Failed to retrieve private experiments'
              })
            );
        } else $scope.reloadExperiments(false);
      };

      $scope.reinit();

      $scope.cloneAnotherExperiment = () => {
        $scope.reloadExperiments(false);
        $scope.cloningAnotherExperiement = true;
      };

      $scope.directToExperimentsExplorer = () => {
        let experimentExplorerPath = 'experiment-explorer';
        $location.path(experimentExplorerPath);
      };
    }
  ]);
})();
