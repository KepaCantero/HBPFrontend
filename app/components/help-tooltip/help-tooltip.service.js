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

  class HelpTooltipService {
    get HELP() {
      return 'HELP';
    }
    get INFO() {
      return 'INFO';
    }

    constructor(HELP_CODES, nrpAnalytics) {
      this.HELP_CODES = HELP_CODES;
      this.nrpAnalytics = nrpAnalytics;

      this.visible = false;

      $(window).on('keydown', e => {
        if (e.keyCode !== 27)
          /*!=escape key*/
          return;
        this.visible = false;
        this.logAnalytics();
      });
    }

    displayHelp(helpCode) {
      if (this.visible !== this.HELP) return;

      if (this.helpCode === helpCode || !helpCode) {
        this.helpCode = this.helpDescription = null;
        return;
      }

      this.helpDescription = this.HELP_CODES[helpCode];
      this.helpCode = helpCode;

      this.nrpAnalytics.eventTrack('Help', {
        category: 'Simulation',
        value: helpCode
      });
    }

    toggleHelp() {
      //something else than HELP visible
      if (this.visible && this.visible !== this.HELP) return;

      this.visible = this.visible ? false : this.HELP;

      this.logAnalytics();
    }

    toggleInfo() {
      //something else than INFO visible
      if (this.visible && this.visible !== this.INFO) return;

      this.visible = this.visible ? false : this.INFO;

      this.logAnalytics();
    }

    logAnalytics() {
      this.helpCode = this.helpDescription = null;

      this.nrpAnalytics.eventTrack('Toggle-help-mode', {
        category: 'Simulation-GUI',
        value: this.visible
      });
    }
  }

  HelpTooltipService.$$ngIsClass = true;
  HelpTooltipService.$inject = ['HELP_CODES', 'nrpAnalytics'];

  angular
    .module('helpTooltipModule')
    .service('helpTooltipService', HelpTooltipService);
})();
