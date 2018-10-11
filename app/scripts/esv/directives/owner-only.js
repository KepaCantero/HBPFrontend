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

  angular.module('exdFrontendApp').directive('ownerOnly', [
    'userContextService',
    '$timeout',
    (userContextService, $timeout) => {
      const demoMode =
        window.bbpConfig.demomode && window.bbpConfig.demomode.demoCarousel;

      if (demoMode || !userContextService.isOwner()) {
        const disableEvent = e => {
          if (
            $(e.srcElement).is('[owner-only]') ||
            $(e.srcElement).parents('[owner-only]').length
          )
            e.stopImmediatePropagation();
        };
        window.addEventListener('click', disableEvent, true);
        window.addEventListener('mousedown', disableEvent, true);
      }

      const DISABLED_TOOTLTIP = demoMode
        ? 'Not available in demo mode'
        : 'Restricted to owner only';

      const setElementOwnerDisabled = elem => {
        elem.attr('ng-disabled', true);
        elem.attr('disabled', true);
        elem.attr('title', DISABLED_TOOTLTIP);
        elem.css('cursor', 'not-allowed');
        elem.addClass('owner-only-disabled');
      };

      return {
        restrict: 'A',
        priority: 10000,
        replace: false,
        compile: tElement => {
          if (userContextService.isOwner()) return;
          setElementOwnerDisabled(tElement);
          return (scope, elem) => {
            $timeout(() => setElementOwnerDisabled(elem));
          };
        }
      };
    }
  ]);
})();
