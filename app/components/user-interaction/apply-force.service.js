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
  'stateService',
  'dynamicViewOverlayService',
  'userNavigationService',
  'clientLoggerService',
  'DYNAMIC_VIEW_CHANNELS',
  'STATE',
  'LOG_TYPE',
  function(
    gz3d,
    roslib,
    contextMenuState,
    simulationInfo,
    stateService,
    dynamicViewOverlayService,
    userNavigationService,
    clientLoggerService,
    DYNAMIC_VIEW_CHANNELS,
    STATE,
    LOG_TYPE
  ) {
    function ApplyForceService() {
      var that = this;

      this.forceVector = new THREE.Vector3(0, 0, 1);
      this.forceStrength = 1000; // assume newton as unit

      this.initialize = () => {
        this.contextMenuItem = {
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
            dynamicViewOverlayService
              .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION)
              .then(isOpen => {
                if (isOpen) {
                  dynamicViewOverlayService.closeAllOverlaysOfType(
                    DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION
                  );
                  if (that.targetModel !== undefined) {
                    that.targetModel.remove(that.widgetRoot);
                    gz3d.scene.refresh3DViews();
                  }
                }
              });

            this.visible = this.items[0].visible = !model.userData.is_static;
            if (this.visible) {
              that.targetModel = model;
            }

            return true;
          }
        };

        let rosBridgeURL = simulationInfo.serverConfig.rosbridge.websocket;
        this.rosConnection = roslib.getOrCreateConnectionTo(rosBridgeURL);
        this.rosServiceApplyBodyWrench = new ROSLIB.Service({
          ros: this.rosConnection,
          name: '/gazebo/apply_body_wrench',
          serviceType: 'gazebo_msgs/ApplyBodyWrench'
        });
      };

      var enableApplyForceMode = () => {
        contextMenuState.hideMenu();
        attachEventListeners();
        stateService.setCurrentState(STATE.PAUSED);
        clientLoggerService.logMessage(
          'click model to choose force application point',
          LOG_TYPE.ADVERTS,
          5000
        );
      };

      this.disableApplyForceMode = () => {
        detachEventListeners();
        dynamicViewOverlayService
          .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION)
          .then(isOpen => {
            if (isOpen)
              dynamicViewOverlayService.closeAllOverlaysOfType(
                DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION
              );
          });
        this.OnApplyForce = undefined;

        this.targetModel && this.targetModel.remove(this.widgetRoot);
        gz3d.scene && gz3d.scene.refresh3DViews();
      };

      this.RotationChanged = () => {
        update3DWidgetForceDirection(this.forceVector);
      };

      let create3DWidget = () => {
        this.widgetRoot = new THREE.Object3D();
        this.widgetRoot.visible = true;
        this.widgetRoot.up = new THREE.Vector3(0, 0, 1);

        this.widgetToruses = new THREE.Object3D();
        this.widgetRoot.add(this.widgetToruses);
        let geometry = new THREE.TorusBufferGeometry(0.5, 0.01, 16, 100);
        let material = new THREE.MeshBasicMaterial({
          color: 0x777777,
          opacity: 0.6
        });
        material.transparent = true;
        material.color.setRGB(0, 0, 0.5);
        let torus2 = new THREE.Mesh(geometry, material.clone());
        material.color.setRGB(0, 1, 0);
        torus2.rotateOnAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        torus2.scale.multiplyScalar(1.05);
        this.widgetToruses.add(torus2);

        material.color.setRGB(0, 0.5, 0);
        let torus3 = new THREE.Mesh(geometry, material.clone());
        torus3.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        torus3.scale.multiplyScalar(1.1);
        this.widgetToruses.add(torus3);

        // vector indicator
        let vectorGeometry = new THREE.ConeBufferGeometry(0.05, 0.5, 32);
        let vectorMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          opacity: 0.6
        });
        vectorMaterial.transparent = true;
        this.widgetVector = new THREE.Mesh(vectorGeometry, vectorMaterial);
        this.widgetRoot.add(this.widgetVector);
        this.widgetVector.position.sub(new THREE.Vector3(0, 0, 0.25));
        this.widgetVector.quaternion.setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          Math.PI / 2
        );
      };
      create3DWidget();

      let update3DWidget = (forceVectorWorld, applyPointLocal) => {
        this.widgetRoot.position.set(
          applyPointLocal.x,
          applyPointLocal.y,
          applyPointLocal.z
        );

        update3DWidgetForceDirection(forceVectorWorld);
      };

      let update3DWidgetForceDirection = forceVectorWorld => {
        let widgetOrientation = new THREE.Quaternion();
        widgetOrientation.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          forceVectorWorld.clone().normalize()
        );
        let rootOrientation = this.targetModel.quaternion
          .clone()
          .inverse()
          .multiply(widgetOrientation);
        this.widgetRoot.quaternion.set(
          rootOrientation.x,
          rootOrientation.y,
          rootOrientation.z,
          rootOrientation.w
        );
        gz3d.scene.refresh3DViews();
      };

      this.applyForceToLink = mousePos => {
        let linkIntersection = this.getLinkRayCastIntersection(mousePos);
        if (linkIntersection) {
          let link = linkIntersection.link;

          const forceVector = this.forceVector
            .clone()
            .normalize()
            .multiplyScalar(this.forceStrength);

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
            duration: { secs: 0, nsecs: 100000000 /*0.1s*/ }
          });
          /* eslint-enable camelcase */

          this.rosServiceApplyBodyWrench.callService(request);
        }
      };

      const getViewportRaycastIntersections = mousePos => {
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

        return intersections;
      };

      this.getLinkRayCastIntersection = mousePos => {
        let intersections = getViewportRaycastIntersections(mousePos);

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

      let isIntersectionWithin = (intersections, lookForObject) => {
        if (intersections !== undefined && intersections.length > 0) {
          for (let i = 0; i < intersections.length; ++i) {
            let object = intersections[i].object;
            while (object.parent !== gz3d.scene.scene) {
              if (object === lookForObject) {
                return true;
              } else {
                object = object.parent;
              }
            }
          }
        }
        return false;
      };

      let cancelOnStateChange = undefined;
      var attachEventListeners = () => {
        var userViewDOM = gz3d.scene.viewManager.mainUserView.container;
        this.domElementPointerBindings = userViewDOM ? userViewDOM : document;
        this.domElementKeyboardBindings = document;

        this.domElementPointerBindings.addEventListener(
          'mouseup',
          onMouseUp,
          false
        );
        this.domElementPointerBindings.addEventListener(
          'mousedown',
          onMouseDown,
          false
        );
        cancelOnStateChange = stateService.addStateCallback(newState => {
          // cancel apply force if experiment is continued
          if (newState === STATE.STARTED) {
            stateService.removeStateCallback(cancelOnStateChange);

            dynamicViewOverlayService
              .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION)
              .then(isOpen => {
                if (isOpen)
                  dynamicViewOverlayService.closeAllOverlaysOfType(
                    DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION
                  );
              });
          }
        });
      };

      let detachEventListeners = () => {
        if (this.domElementPointerBindings) {
          this.domElementPointerBindings.removeEventListener(
            'mouseup',
            onMouseUp,
            false
          );
          this.domElementPointerBindings.removeEventListener(
            'mouseup',
            onMouseDown,
            false
          );
        }
      };

      let activeDragRotation = false;
      //let mouseDragRotationAxis = new THREE.Vector3(0, 0, 1);
      let mouseLastPos = undefined;
      const stopDragRotation = () => {
        this.domElementPointerBindings.removeEventListener(
          'mousemove',
          onMouseMove,
          false
        );
        activeDragRotation = false;
        userNavigationService.controls.enabled = true;
      };
      const onMouseDown = event => {
        const mousePos = { x: event.clientX, y: event.clientY };
        const intersections = getViewportRaycastIntersections(mousePos);
        const intersectsWithWidget = isIntersectionWithin(
          intersections,
          this.widgetToruses
        );
        if (intersectsWithWidget) {
          // torus objects
          activeDragRotation = true;
          mouseLastPos = mousePos;

          userNavigationService.controls.enabled = false;

          this.domElementPointerBindings.addEventListener(
            'mousemove',
            onMouseMove,
            false
          );

          this.domElementPointerBindings.addEventListener(
            'mouseup',
            stopDragRotation,
            false
          );
        }
      };

      let onMouseMove = event => {
        const mousePos = { x: event.clientX, y: event.clientY };
        // check if we have to apply a rotation on the force vector
        if (activeDragRotation) {
          const mouseLast = new THREE.Vector2(mouseLastPos.x, mouseLastPos.y);
          const mouse = new THREE.Vector2(mousePos.x, mousePos.y);
          const dist = new THREE.Vector2().subVectors(mouse, mouseLast);

          let cam = gz3d.scene.viewManager.mainUserView.camera;
          let vecCamRightWorld = new THREE.Vector3(
            cam.matrixWorldInverse.elements[0],
            cam.matrixWorldInverse.elements[4],
            cam.matrixWorldInverse.elements[8]
          ).normalize();
          let rotation = new THREE.Quaternion().setFromAxisAngle(
            vecCamRightWorld,
            0.015 * dist.y
          );

          let vecCamUpWorld = new THREE.Vector3(
            cam.matrixWorldInverse.elements[1],
            cam.matrixWorldInverse.elements[5],
            cam.matrixWorldInverse.elements[9]
          ).normalize();
          rotation.multiply(
            new THREE.Quaternion().setFromAxisAngle(
              vecCamUpWorld,
              0.015 * dist.x
            )
          );

          this.forceVector.applyQuaternion(rotation);
          this.RotationChanged();
          gz3d.scene.refresh3DViews();

          mouseLastPos = mousePos;
        }
      };

      var onMouseUp = event => {
        var mousePos = { x: event.clientX, y: event.clientY };

        dynamicViewOverlayService
          .isOverlayOpen(DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION)
          .then(isOpen => {
            if (isOpen) {
              dynamicViewOverlayService.closeAllOverlaysOfType(
                DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION
              );
              this.disableApplyForceMode();
            }

            const linkIntersection = this.getLinkRayCastIntersection(mousePos);
            if (linkIntersection !== undefined) {
              dynamicViewOverlayService
                .createDynamicOverlay(
                  DYNAMIC_VIEW_CHANNELS.APPLY_FORCE_CONFIGURATION
                )
                .then(() => {
                  this.targetModel.add(this.widgetRoot);
                  this.targetPointLocal = this.targetModel.worldToLocal(
                    linkIntersection.intersection.point.clone()
                  );
                  const viewDir = linkIntersection.intersection.point
                    .clone()
                    .sub(gz3d.scene.viewManager.mainUserView.camera.position);
                  this.forceVector.set(viewDir.x, viewDir.y, viewDir.z);
                  this.forceVector.normalize();
                  update3DWidget(this.forceVector, this.targetPointLocal);
                  detachEventListeners();

                  this.OnApplyForce = () => {
                    this.applyForceToLink(mousePos);
                    this.disableApplyForceMode();
                  };
                });
            }
          });
      };
    }

    let service = new ApplyForceService();
    service.initialize();

    return service;
  }
]);
