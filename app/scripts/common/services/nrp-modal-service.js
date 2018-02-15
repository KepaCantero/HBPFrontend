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

  angular.module('modal', []).service('nrpModalService', [
    '$uibModal',
    function($uibModal) {
      var modal;
      return {
        createModal: createModal,
        destroyModal: destroyModal
      };

      /**
             * Creates a modal (UI dialog) object on top of the current view
             * The templateUrl object must hold the html template Url itself,
             * the scope, the closable option and, optionally, parameters
             * for the size and the css styling class. Example usage:
             *
             *  var templateUrl = {
             *                      templateUrl: 'views/esv/robot-upload-dialog.html',
             *                      closable: true,
             *                      scope: $scope
             *                      windowClass: 'modal-window',
             *                      size:'lg'
             *                     };
             *  nrpModalService.createModal(templateUrl)
             *
             * @param  templateUrl an object containing the Url,the scope and
             *                     the closable option for the modal
             */
      function createModal(templateUrl) {
        if (angular.isDefined(modal)) {
          modal.close();
        }

        modal = $uibModal.open({
          templateUrl: templateUrl.templateUrl,
          show: true,
          backdrop: 'static',
          scope: templateUrl.scope,
          keyboard: templateUrl.keyboard || templateUrl.closable,
          windowClass: templateUrl.windowClass,
          size: templateUrl.size
        });

        return modal.result.finally(
          (function(destModal) {
            return function() {
              destroyModal(destModal);
            };
          })(modal)
        );
      }

      /**
             * Destroys the modal object
             */
      function destroyModal(destModal) {
        destModal = destModal || modal;
        if (angular.isDefined(destModal)) {
          destModal.close();
          if (destModal === modal) {
            modal = undefined;
          }
        }
      }
    }
  ]);
})();
