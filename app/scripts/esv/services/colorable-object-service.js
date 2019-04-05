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

  angular
    .module('colorableObjectModule', ['simulationControlServices'])
    .constant('COLORABLE_VISUAL_REGEXP', {
      EMISSIVE: /::.+::screen_glass$/,
      NORMAL: /(::.+::COLORABLE_VISUAL)|((cylinder|box|sphere)_[0-9]+::link::visual)$/i
    })
    .factory('colorableObjectService', [
      'objectControl',
      'COLORABLE_VISUAL_REGEXP',
      function(objectControl, COLORABLE_VISUAL_REGEXP) {
        var EMISSIVE_COLOR_POSTFIX = 'Glow';

        //returns a node matching the regexp in parameter
        var getNode = function(entity, regexp) {
          var foundNode;
          entity.traverse(function(node) {
            // Check whether the current node name matches the regexp condition
            if (regexp.test(node.name)) {
              return (foundNode = node);
            }
          });
          return foundNode;
        };

        var setEntityMaterial = function(simulationInfo, entity, material) {
          var colorableNode = getNode(entity, COLORABLE_VISUAL_REGEXP.NORMAL);
          if (!colorableNode) {
            colorableNode = getNode(entity, COLORABLE_VISUAL_REGEXP.EMISSIVE);
            material += EMISSIVE_COLOR_POSTFIX;
          }
          var materialChange = {
            //eslint-disable-next-line camelcase
            visual_path: colorableNode.name,
            material: material
          };
          // Request color change through RESTful call
          objectControl(simulationInfo.serverBaseUrl).updateMaterial(
            // eslint-disable-next-line camelcase
            { sim_id: simulationInfo.simulationID },
            materialChange
          );
        };

        //determines if entity has a colorable node
        var isColorableEntity = function(selectedEntity) {
          return !!(
            getNode(selectedEntity, COLORABLE_VISUAL_REGEXP.EMISSIVE) ||
            getNode(selectedEntity, COLORABLE_VISUAL_REGEXP.NORMAL)
          );
        };

        return {
          isColorableEntity: isColorableEntity,
          setEntityMaterial: setEntityMaterial
        };
      }
    ]);
})();
