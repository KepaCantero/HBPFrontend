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

  class ShowOnTopService {
    static get MAX_PANEL_ZINDEX() {
      return 400;
    } //panels z-index start at this value and go down

    constructor() {
      this.panels = [];
    }

    registerPanel(panel) {
      panel.css('z-index', ShowOnTopService.MAX_PANEL_ZINDEX);
      this.panels.push(panel);
    }

    removePanel(panel) {
      this.panels.splice(this.panels.indexOf(panel), 1);
    }

    putPanelOnTop(panel) {
      //panel is already on top
      if (panel.is(this.panels[this.panels.length - 1])) return;

      //move that panel to the top of the panel stack
      var previousIndex = this.panels.indexOf(panel);
      this.panels.splice(previousIndex, 1);
      this.panels.push(panel);

      //refresh panels z-index so they match the order on the stack
      for (var i = this.panels.length - 1; i >= previousIndex; i--)
        this.panels[i].css(
          'z-index',
          ShowOnTopService.MAX_PANEL_ZINDEX - this.panels.length + 1 + i
        );
    }
  }

  angular.module('showOnTop').service('showOnTopService', ShowOnTopService);
})();
