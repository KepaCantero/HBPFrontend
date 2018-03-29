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

  class TipTooltipService {
    constructor(TIP_CODES, $sce) {
      this.TIP_CODES = TIP_CODES;

      this.hidden = true;
      this.visibleTips = [];
      this.$sce = $sce;
      this.ready = false;
    }

    showPrevious(tip) {
      if (tip.tipListPos > 0) {
        tip.tipListPos--;
      }
    }

    showNext(tip) {
      if (tip.tipListPos < tip.tipList.length - 1) {
        tip.tipListPos++;
      }
    }

    firstVisible(tip) {
      if (tip.hidden) return false;

      for (var i = 0; i < this.visibleTips.length; i++) {
        if (this.visibleTips[i] === tip) return true;
        else if (!this.visibleTips[i].hidden) return false;
      }
    }

    setCurrentTip(tip) {
      if (tip.displayed) return;

      if (!tip.stackMode) {
        _.forEach(this.visibleTips, function(tip) {
          tip.displayed = false;
        });

        this.visibleTips = _.filter(this.visibleTips, t => t.stackMode);
      }

      tip.displayed = true;
      tip.tipListPos = 0;

      var alreadyAdded = false;

      _.forEach(this.visibleTips, function(itip) {
        if (itip === tip) alreadyAdded = true;
      });

      if (!alreadyAdded) this.visibleTips.unshift(tip);
    }

    startShowingTipIfRequired() {
      this.hidden = localStorage.getItem('TIP_TOOLTIP_HIDDEN') === 'true';

      _.forEach(this.TIP_CODES, function(tip, tipType) {
        tip.hidden =
          localStorage.getItem('TIP_TOOLTIP_HIDDEN_' + tipType) === 'true';
      });

      this.ready = true;
    }

    tipToType(tip) {
      var tipType = '';

      _.forEach(this.TIP_CODES, function(itip, type) {
        if (itip === tip) tipType = type;
      });

      return tipType;
    }

    hideTip(tip) {
      tip.displayed = false;
      tip.hidden = true;

      localStorage.setItem(
        'TIP_TOOLTIP_HIDDEN_' + this.tipToType(tip),
        tip.hidden ? 'true' : 'false'
      );
    }

    someTipsAreHidden() {
      if (this.hidden) return true;

      var oneHidden = false;

      _.forEach(this.visibleTips, function(tip) {
        if (tip.hidden) oneHidden = true;
      });

      return oneHidden;
    }

    toggleTip(forceHide) {
      if (this.someTipsAreHidden() && !forceHide) {
        this.hidden = false;
        _.forEach(this.TIP_CODES, tip => {
          tip.hidden = false;
          localStorage.setItem(
            'TIP_TOOLTIP_HIDDEN_' + this.tipToType(tip),
            tip.hidden ? 'true' : 'false'
          );
        });
      } else {
        this.hidden = true;
        _.forEach(this.TIP_CODES, function(tip) {
          tip.displayed = false;
        });
      }

      localStorage.setItem(
        'TIP_TOOLTIP_HIDDEN',
        this.hidden ? 'true' : 'false'
      );
    }
  }

  TipTooltipService.$$ngIsClass = true;
  TipTooltipService.$inject = ['TIP_CODES', '$sce'];

  angular
    .module('tipTooltipModule')
    .service('tipTooltipService', TipTooltipService);
})();
