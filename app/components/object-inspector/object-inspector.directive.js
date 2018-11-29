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
    .module('objectInspectorModule', [
      'exdFrontendApp.Constants',
      'dynamicViewModule',
      'gz3dModule',
      'simulationStateServices',
      'colorableObjectModule',
      'userNavigationModule',
      'noiseModelModule',
      'baseEventHandlerModule',
      'robotComponentsModule'
    ])
    .directive('objectInspector', [
      'OBJECT_VIEW_MODE',
      '$timeout',
      'objectInspectorService',
      'baseEventHandler',
      'gz3d',
      'EDIT_MODE',
      'simulationInfo',
      'serverError',
      'tipTooltipService',
      'TIP_CODES',
      'storageServer',
      'robotComponentsService',
      'goldenLayoutService',
      'TOOL_CONFIGS',
      'backendInterfaceService',
      '$rootScope',
      function(
        OBJECT_VIEW_MODE,
        $timeout,
        objectInspectorService,
        baseEventHandler,
        gz3d,
        EDIT_MODE,
        simulationInfo,
        serverError,
        tipTooltipService,
        TIP_CODES,
        storageServer,
        robotComponentsService,
        goldenLayoutService,
        TOOL_CONFIGS,
        backendInterfaceService,
        $rootScope
      ) {
        return {
          templateUrl:
            'components/object-inspector/object-inspector.template.html',
          restrict: 'E',
          scope: true,
          link: function(scope) {
            tipTooltipService.setCurrentTip(TIP_CODES.OBJECT_INSPECTOR);

            scope.minimized = false;
            scope.collapsedTransform = false;
            scope.collapsedVisuals = false;
            scope.objectInspectorService = objectInspectorService;
            scope.gz3d = gz3d;
            scope.robotComponentsService = robotComponentsService;

            scope.EDIT_MODE = EDIT_MODE;
            scope.OBJECT_VIEW_MODE = OBJECT_VIEW_MODE;

            storageServer
              .getRobotConfigPath(simulationInfo.experimentID)
              .then(
                robotConfigPath => (scope.robotConfigPath = robotConfigPath)
              )
              .catch(angular.noop);

            scope.suppressKeyPress = function(event) {
              baseEventHandler.suppressAnyKeyPress(event);
            };
            $timeout(objectInspectorService.update, 0);

            const setTreeSelected = function() {
              $timeout(objectInspectorService.update, 0); //force scope.$apply
            };
            gz3d.gui.guiEvents.on('setTreeSelected', setTreeSelected);

            const deleteEntity = function() {
              $timeout(objectInspectorService.update, 0); //force scope.$apply
            };
            gz3d.gui.guiEvents.on('delete_entity', deleteEntity);

            scope.cleanup = function() {
              // remove the callback
              objectInspectorService.setManipulationMode(EDIT_MODE.VIEW);
              objectInspectorService.setRobotMode(false);
              gz3d.gui.guiEvents.removeListener(
                'setTreeSelected',
                setTreeSelected
              );
              gz3d.gui.guiEvents.removeListener('delete_entity', deleteEntity);
            };

            const DECORATOR_BY_TYPE = {
              sensor: userData => {
                let topicId = userData.rosTopic.split('/').pop();
                return [
                  [topicId],
                  `@nrp.MapRobotSubscriber('${topicId}', Topic('${userData.rosTopic}', ${userData.rosType}))
@nrp.Robot2Neuron()`
                ];
              },
              actuator: userData => [
                [],
                `@nrp.Neuron2Robot(Topic('${userData.rosTopic}', ${userData.rosType}))`
              ]
            };

            scope.createTopicTF = () => {
              return storageServer
                .getTransferFunctions(simulationInfo.experimentID)
                .then(({ data: tfs }) => {
                  let selectedData =
                    objectInspectorService.selectedRobotComponent.userData;
                  let topicName = selectedData.rosTopic;
                  topicName = topicName.substr(1).replace(/\//g, '_');
                  let tfname = topicName;
                  let postfix = 2;
                  while (tfs[tfname]) tfname = topicName + '_' + postfix++;

                  let [parameters, decorator] = DECORATOR_BY_TYPE[
                    selectedData.type
                  ](selectedData);

                  let newTF = `${decorator}
def ${tfname}(${['t', ...parameters].join(', ')}):
    # Auto generated TF for ${topicName}
    if t % 2 < 0.02:
        clientLogger.info('TF ${topicName}:', t)`;

                  storageServer
                    .saveTransferFunctions(simulationInfo.experimentID, [
                      ..._.values(tfs),
                      newTF
                    ])
                    .then(() =>
                      backendInterfaceService.editTransferFunction(
                        tfname,
                        newTF
                      )
                    )
                    .then(() => {
                      // Notify the components which display transfer functions info (e.g., the Transfer Functions editor) that an update is required
                      $rootScope.$broadcast('TRANSFER_FUNCTIONS_CHANGED');
                      goldenLayoutService.openTool(
                        TOOL_CONFIGS.TRANSFER_FUNCTION_EDITOR
                      );
                    })
                    .catch(err => serverError.displayHTTPError(err));
                });
            };

            scope.$on('$destroy', function() {
              scope.cleanup();
            });
          }
        };
      }
    ]);
})();
