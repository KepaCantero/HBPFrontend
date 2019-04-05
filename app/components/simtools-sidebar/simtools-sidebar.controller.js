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

  class SimToolsSidebarController {
    constructor(
      $rootScope,
      $timeout,
      SIMTOOLS_SIDEBAR_ID,
      gz3d,
      gz3dViewsService,
      helpTooltipService,
      simToolsSidebarService,
      videoStreamService,
      tipTooltipService,
      TIP_CODES,
      clientLoggerService,
      simulationInfo
    ) {
      this.SIMTOOLS_SIDEBAR_ID = SIMTOOLS_SIDEBAR_ID;

      this.gz3d = gz3d;
      this.gz3dViewsService = gz3dViewsService;
      this.helpTooltipService = helpTooltipService;
      this.simToolsSidebarService = simToolsSidebarService;
      this.videoStreamService = videoStreamService;
      this.simulationInfo = simulationInfo;

      this.isSubmenuSceneNavigationOpen = false;
      this.isSubmenuLightingOpen = false;

      this.show = false;
      this.overflowing = [];
      this.expandedCategory = null;

      this.tipTooltipService = tipTooltipService;
      this.tipTooltipService.setCurrentTip(TIP_CODES.SIMULATIONS_TIPS);

      this.clientLoggerService = clientLoggerService;

      $rootScope.$on('ASSETS_LOADED', () => {
        this.show = true;
        $timeout(() => {
          this.overflowing[
            this.SIMTOOLS_SIDEBAR_ID.SIDEBAR
          ] = this.simToolsSidebarService.isOverflowingY(
            this.SIMTOOLS_SIDEBAR_ID.SIDEBAR
          );
        }, 100);
      });
    }

    onButtonExpandCategory(groupID) {
      this.isSubmenuLightingOpen = this.isSubmenuSceneNavigationOpen = false;

      if (this.expandedCategory === groupID) {
        this.expandedCategory = null;
      } else {
        this.expandedCategory = groupID;
      }
    }
  }

  angular
    .module('simToolsSidebarModule')
    .controller('SimToolsSidebarController', [
      '$rootScope',
      '$timeout',
      'SIMTOOLS_SIDEBAR_ID',
      'gz3d',
      'gz3dViewsService',
      'helpTooltipService',
      'simToolsSidebarService',
      'videoStreamService',
      'tipTooltipService',
      'TIP_CODES',
      'clientLoggerService',
      'simulationInfo',
      function(...args) {
        return new SimToolsSidebarController(...args);
      }
    ]);
})();
