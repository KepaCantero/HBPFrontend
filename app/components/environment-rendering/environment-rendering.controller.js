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
/* global console: false */
/* global THREE: false */

(function() {
  'use strict';

  class EnvironmentRenderingContextmenu {
    constructor(
      environmentRenderingController,
      $compile,
      $scope,
      TOOL_CONFIGS,
      backendInterfaceService,
      colorableObjectService,
      goldenLayoutService,
      gz3d,
      sceneInfo,
      userNavigationService
    ) {
      this.options = [
        // selection name
        {
          html: () => {
            let title;
            if (gz3d.scene.selectedEntity) {
              title = gz3d.scene.selectedEntity.name;
            } else {
              title = 'No Selection';
            }
            return '<div class="contextmenu-title">' + title + '</div>';
          },
          enabled: false
        },
        null, // divider
        // inspect
        {
          text: 'Inspect',
          click: () => {
            goldenLayoutService.openTool(TOOL_CONFIGS.OBJECT_INSPECTOR);
          }
        },
        // look at
        {
          text: 'Look At',
          click: () => {
            userNavigationService.setLookatCamera();
          }
        },
        // duplicate
        {
          text: 'Duplicate',
          displayed: () => {
            return (
              gz3d.scene.selectedEntity &&
              gz3d.gui.canModelBeDuplicated(gz3d.scene.selectedEntity.name)
            );
          },
          click: () => {
            gz3d.gui.guiEvents.emit('duplicate_entity');
          }
        },
        // show/hide skin
        {
          text: () => {
            return gz3d.scene.skinVisible(gz3d.scene.selectedEntity)
              ? 'Hide Skin'
              : 'Show Skin';
          },
          displayed: () => {
            return (
              gz3d.scene.selectedEntity &&
              gz3d.scene.hasSkin(gz3d.scene.selectedEntity)
            );
          },
          click: () => {
            if (gz3d.scene.selectedEntity) {
              gz3d.scene.setSkinVisible(
                gz3d.scene.selectedEntity,
                !gz3d.scene.skinVisible(gz3d.scene.selectedEntity)
              );
            }
          }
        },
        // delete
        {
          enabled: () =>
            gz3d.scene.selectedEntity &&
            !sceneInfo.isRobot(gz3d.scene.selectedEntity),
          text: 'Delete',
          displayed: () => {
            return Boolean(gz3d.scene.selectedEntity);
          },
          click: () => {
            gz3d.gui.emitter.emit('deleteEntity', gz3d.scene.selectedEntity);
            gz3d.scene.selectEntity(null);
          }
        },
        {
          text: 'Set as Initial Pose',
          displayed: () => {
            return (
              gz3d.scene.selectedEntity &&
              sceneInfo.isRobot(gz3d.scene.selectedEntity)
            );
          },
          click: () => {
            let {
              name,
              position: { x, y, z },
              rotation: { _x: roll, _y: pitch, _z: yaw }
            } = gz3d.scene.selectedEntity;

            backendInterfaceService.setRobotInitialPose(name, {
              x,
              y,
              z,
              roll,
              pitch,
              yaw
            });
          }
        },
        // material color picker
        {
          html: () => {
            return $compile('<materials-chooser />')($scope.$new());
          },
          displayed: () => {
            return (
              gz3d.scene.selectedEntity &&
              colorableObjectService.isColorableEntity(
                gz3d.scene.selectedEntity
              )
            );
          }
        }
      ];
    }
  }

  class EnvironmentRenderingController {
    constructor(
      $compile,
      $scope,
      $element,
      TOOL_CONFIGS,
      backendInterfaceService,
      colorableObjectService,
      userContextService,
      experimentService,
      userNavigationService,
      environmentRenderingService,
      goldenLayoutService,
      gz3d,
      gz3dViewsService,
      sceneInfo,
      stateService,
      videoStreamService
    ) {
      this.backendInterfaceService = backendInterfaceService;
      this.stateService = stateService;
      this.userContextService = userContextService;
      this.experimentService = experimentService;
      this.userNavigationService = userNavigationService;
      this.environmentRenderingService = environmentRenderingService;
      this.gz3d = gz3d;
      this.gz3dViewsService = gz3dViewsService;
      this.videoStreamService = videoStreamService;

      this.view = undefined;
      this.videoUrl = undefined;
      this.reconnectTrials = 0;

      $scope.$on('$destroy', () => this.onDestroy());

      /* initialization */
      this.gz3dContainerElement = $element[0].getElementsByClassName(
        'gz3d-webgl'
      )[0];

      this.contextmenu = new EnvironmentRenderingContextmenu(
        this,
        $compile,
        $scope,
        TOOL_CONFIGS,
        backendInterfaceService,
        colorableObjectService,
        goldenLayoutService,
        gz3d,
        sceneInfo,
        userNavigationService
      );

      this.environmentRenderingService.sceneInitialized().then(() => {
        // assign a view which doesn't have a displaying container yet for now
        this.gz3dViewsService
          .assignView(this.gz3dContainerElement)
          .then(view => {
            this.view = view;
            if (this.view.type === 'camera') {
              // set up server video stream
              this.videoStreamService
                .getStreamingUrlForTopic(this.view.topic)
                .then(streamUrl => {
                  this.videoUrl = streamUrl;
                });
            }

            if (
              gz3dViewsService.isUserView(this.view) &&
              userNavigationService.controls
            ) {
              userNavigationService.controls.detachEventListeners();
              userNavigationService.controls.attachEventListeners();
            }
          });
      });
    }

    onDestroy() {
      /* de-initialization */
      if (
        this.view &&
        this.view.camera &&
        this.view.camera.cameraHelper &&
        this.view.camera.cameraHelper.visible
      ) {
        this.gz3dViewsService.toggleCameraHelper(this.view);
      }

      if (this.view) {
        this.view.container = undefined;
      }
    }

    isCameraView() {
      return this.view && this.view.type && this.view.type === 'camera';
    }

    onClickFrustumIcon() {
      this.gz3dViewsService.toggleCameraHelper(this.view);
    }

    onClickCameraStream() {
      this.showServerStream = !this.showServerStream;
      this.reconnectTrials++;
    }

    getVideoUrlSource() {
      return this.showServerStream
        ? this.videoUrl +
            '&t=' +
            this.stateService.currentState +
            this.reconnectTrials
        : '';
    }

    onMouseDown(event) {
      switch (event.button) {
        case 2: {
          let model = this.gz3d.scene.getRayCastModel(
            new THREE.Vector2(event.offsetX, event.offsetY),
            new THREE.Vector3()
          );
          this.gz3d.scene.selectEntity(model);
          break;
        }
      }
    }
  }

  EnvironmentRenderingController.$$ngIsClass = true;
  EnvironmentRenderingController.$inject = [
    '$compile',
    '$scope',
    '$element',
    'TOOL_CONFIGS',
    'backendInterfaceService',
    'colorableObjectService',
    'userContextService',
    'experimentService',
    'userNavigationService',
    'environmentRenderingService',
    'goldenLayoutService',
    'gz3d',
    'gz3dViewsService',
    'sceneInfo',
    'stateService',
    'videoStreamService',
    'dynamicViewOverlayService'
  ];

  /**
   * @ngdoc function
   * @name environmentRenderingModule.controller:EnvironmentRenderingController
   * @description
   * # EnvironmentRenderingController
   * Controller of the environmentRenderingModule
   */
  angular
    .module('environmentRenderingModule')
    .controller(
      'EnvironmentRenderingController',
      EnvironmentRenderingController
    );
})();
