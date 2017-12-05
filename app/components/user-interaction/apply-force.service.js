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

/* global ROSLIB:true */

angular.module('userInteractionModule').service('applyForceService', [
  'gz3d',
  'roslib',
  'contextMenuState',
  'simulationInfo',
  function(gz3d, roslib, contextMenuState, simulationInfo) {
    function ApplyForceService() {
      var that = this;

      this.initialize = () => {
        contextMenuState.pushItemGroup({
          id: 'Force Interaction',
          visible: false,
          items: [
            {
              text: 'Apply Force',
              callback: function(event) {
                enableApplyForceMode();
                event.stopPropagation();
              },
              visible: false
            }
          ],

          hide: function() {
            this.visible = this.items[0].visible = false;
          },

          show: function(model) {
            this.visible = this.items[0].visible = !model.userData.is_static;
            if (this.visible) {
              that.targetModel = model;
            }

            return true;
          }
        });

        let rosBridgeURL = simulationInfo.serverConfig.rosbridge.websocket;
        this.rosConnection = roslib.getOrCreateConnectionTo(rosBridgeURL);
        this.rosServiceApplyBodyWrench = new ROSLIB.Service({
          ros: this.rosConnection,
          name: '/gazebo/apply_body_wrench',
          serviceType: 'gazebo_msgs/ApplyBodyWrench'
        });
      };

      var enableApplyForceMode = function() {
        contextMenuState.hideMenu();
        attachEventListeners();
      };

      var disableApplyForceMode = function() {
        detachEventListeners();
      };

      this.applyForceToLink = mousePos => {
        let linkIntersection = this.getLinkRayCastIntersection(mousePos);
        if (linkIntersection) {
          let link = linkIntersection.link;

          var forceVector = new THREE.Vector3();
          forceVector
            .subVectors(
              linkIntersection.intersection.point,
              gz3d.scene.viewManager.mainUserView.camera.position
            )
            .normalize()
            .multiplyScalar(1000);

          /* eslint-disable camelcase */
          var request = new ROSLIB.ServiceRequest({
            body_name: link.name,
            reference_frame: '',
            reference_point: { x: 0.0, y: 0.0, z: 0.0 },
            wrench: {
              force: { x: forceVector.x, y: forceVector.y, z: forceVector.z },
              torque: { x: 0.0, y: 0.0, z: 0.0 }
            },
            start_time: { secs: 0, nsecs: 0 },
            duration: { secs: 0, nsecs: 500000000 /*0.5s*/ }
          });
          /* eslint-enable camelcase */

          this.rosServiceApplyBodyWrench.callService(request);
        }
      };

      this.getLinkRayCastIntersection = mousePos => {
        var userView = gz3d.scene.viewManager.mainUserView;
        var normalizedScreenCoords = new THREE.Vector2(
          (mousePos.x - userView.renderer.domElement.offsetLeft) /
            userView.container.clientWidth *
            2 -
            1,
          -(
            (mousePos.y - userView.renderer.domElement.offsetTop) /
            userView.container.clientHeight
          ) *
            2 +
            1
        );

        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(normalizedScreenCoords, userView.camera);

        var intersections = raycaster.intersectObjects(
          gz3d.scene.scene.children,
          true
        );

        if (intersections.length > 0) {
          for (var i = 0; i < intersections.length; ++i) {
            var object = intersections[i].object;
            while (object.parent !== gz3d.scene.scene) {
              if (
                object.userData &&
                object.userData.gazeboType === 'link' &&
                object.parent === this.targetModel
              ) {
                // we have a link and it's a child of the model that was right clicked
                return { link: object, intersection: intersections[i] };
              } else {
                object = object.parent;
              }
            }
          }
        }

        return undefined;
      };

      var attachEventListeners = () => {
        var userViewDOM = gz3d.scene.viewManager.mainUserView.container;
        this.domElementPointerBindings = userViewDOM ? userViewDOM : document;
        this.domElementKeyboardBindings = document;

        this.domElementPointerBindings.addEventListener(
          'mouseup',
          onMouseUp,
          false
        );
      };

      var detachEventListeners = () => {
        if (this.domElementPointerBindings) {
          this.domElementPointerBindings.removeEventListener(
            'mouseup',
            onMouseUp,
            false
          );
        }
      };

      var onMouseUp = event => {
        var mousePos = { x: event.clientX, y: event.clientY };
        this.applyForceToLink(mousePos);
        disableApplyForceMode();
      };
    }

    return new ApplyForceService();
  }
]);
