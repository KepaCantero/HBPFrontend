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

  class GZ3DViewsService {
    get views() {
      return this.gz3d.scene.viewManager.views;
    }

    constructor(
      $q,
      TOOL_CONFIGS,
      gz3d,
      environmentRenderingService,
      goldenLayoutService,
      nrpAnalytics
    ) {
      this.$q = $q;

      this.TOOL_CONFIGS = TOOL_CONFIGS;

      this.gz3d = gz3d;
      this.environmentRenderingService = environmentRenderingService;
      this.goldenLayoutService = goldenLayoutService;
      this.nrpAnalytics = nrpAnalytics;
    }

    hasCameraView() {
      return (
        this.gz3d.scene &&
        this.gz3d.scene.viewManager &&
        this.views.some(function(v) {
          return v.type && v.type === 'camera';
        })
      );
    }

    setView(view, containerElement) {
      let deferredSuccess = this.$q.defer();
      this.environmentRenderingService.sceneInitialized().then(
        // success
        () => {
          this.gz3d.scene.viewManager.setViewContainerElement(
            view,
            containerElement
          );
          deferredSuccess.resolve(true);
        },
        // failure
        () => {
          deferredSuccess.reject(false);
        }
      );

      return deferredSuccess.promise;
    }

    assignView(containerElement) {
      let deferredViewAssigned = this.$q.defer();
      this.environmentRenderingService.sceneInitialized().then(
        // success
        () => {
          for (let i = 0; i < this.views.length; i = i + 1) {
            // find the first view without a container displaying it, assign to this one
            if (this.views[i].container === undefined) {
              this.gz3d.scene.viewManager.setViewContainerElement(
                this.views[i],
                containerElement
              );

              if (this.views[i] === this.gz3d.scene.viewManager.mainUserView) {
                this.gz3d.scene.attachEventListeners();
              }

              deferredViewAssigned.resolve(this.views[i]);
              break;
            }
          }
        },
        // failure
        () => {
          deferredViewAssigned.reject('gz3d scene not initialized');
        }
      );

      return deferredViewAssigned.promise;
    }

    toggleCameraHelper(view) {
      view.camera.cameraHelper.visible = !view.camera.cameraHelper.visible;
    }

    isUserView(view) {
      return (
        view &&
        this.gz3d.scene &&
        view === this.gz3d.scene.viewManager.mainUserView
      );
    }

    // robot view
    onToggleRobotViews() {
      if (!this.hasCameraView()) {
        return;
      }

      var allHidden = true;

      this.views.forEach(view => {
        if (view.name !== 'main_view' && view.container !== undefined) {
          allHidden = false;
        }
      });

      if (allHidden) {
        // open overlays for every view that doesn't have a container
        this.views.forEach(view => {
          if (view.container === undefined) {
            this.goldenLayoutService.openTool(
              this.TOOL_CONFIGS.ROBOT_CAMERA_RENDERING
            );
          }
        });
      } else {
        this.goldenLayoutService.layout.root
          .getItemsById('robot-camera-rendering')
          .forEach(item => {
            item.remove();
          });
      }

      this.nrpAnalytics.eventTrack('Toggle-robot-view', {
        category: 'Simulation-GUI',
        value: true
      });
    }
  }

  GZ3DViewsService.$$ngIsClass = true;
  GZ3DViewsService.$inject = [
    '$q',
    'TOOL_CONFIGS',
    'gz3d',
    'environmentRenderingService',
    'goldenLayoutService',
    'nrpAnalytics'
  ];

  angular.module('gz3dModule').service('gz3dViewsService', GZ3DViewsService);
})();
