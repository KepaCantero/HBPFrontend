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

angular.module('userInteractionModule').service('pushForceService', [
  'gz3d',
  'roslib',
  'simulationInfo',
  'stateService',
  'userNavigationService',
  'clientLoggerService',
  'STATE',
  'LOG_TYPE',
  function(
    gz3d,
    roslib,
    simulationInfo,
    stateService,
    userNavigationService,
    clientLoggerService,
    STATE,
    LOG_TYPE
  ) {
    function PushForceService() {
      this.forceVector = new THREE.Vector3(0, 0, 1);
      this.forceStrength = 1000; // assume newton as unit

      this.floatPrecision = 2;

      this.initialize = () => {
        let rosBridgeURL = simulationInfo.serverConfig.rosbridge.websocket;
        this.rosConnection = roslib.getOrCreateConnectionTo(rosBridgeURL);
        this.rosServiceApplyBodyWrench = new ROSLIB.Service({
          ros: this.rosConnection,
          name: '/gazebo/apply_body_wrench',
          serviceType: 'gazebo_msgs/ApplyBodyWrench'
        });
      };

      this.enterModeApplyForce = () => {
        this.targetModel = null;

        var userViewDOM = gz3d.scene.viewManager.mainUserView.container;
        this.domElementPointerBindings = userViewDOM ? userViewDOM : document;
        this.domElementKeyboardBindings = document;

        attachEventListenersChooseForcePoint();
        stateService.setCurrentState(STATE.PAUSED);
        clientLoggerService.logMessage(
          'click model to choose force application point',
          LOG_TYPE.ADVERTS,
          5000
        );
      };

      this.disableApplyForceMode = () => {
        this.detachGizmo();
        detachEventListenersChooseForcePoint();
        detachEventListenersDefineForceVector();

        gz3d.scene && gz3d.scene.refresh3DViews();

        if (userNavigationService.controls) {
          userNavigationService.controls.enabled = true;
        }
      };

      let roundFloat = number => {
        return parseFloat(number.toFixed(this.floatPrecision));
      };

      let roundVector3 = vector3 => {
        vector3.x = roundFloat(vector3.x);
        vector3.y = roundFloat(vector3.y);
        vector3.z = roundFloat(vector3.z);
        return vector3;
      };

      this.onUIChangeForceVector = () => {
        updateGizmoForceDirection(this.forceVector);
      };

      let createGizmo = () => {
        this.gizmoRoot = new THREE.Object3D();
        this.gizmoRoot.visible = true;
        this.gizmoRoot.up = new THREE.Vector3(0, 0, 1);

        this.gizmoToruses = new THREE.Object3D();
        this.gizmoRoot.add(this.gizmoToruses);
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
        this.gizmoToruses.add(torus2);

        material.color.setRGB(0, 0.5, 0);
        let torus3 = new THREE.Mesh(geometry, material.clone());
        torus3.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        torus3.scale.multiplyScalar(1.1);
        this.gizmoToruses.add(torus3);

        // vector indicator
        let vectorGeometry = new THREE.ConeBufferGeometry(0.05, 0.5, 32);
        let vectorMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          opacity: 0.6
        });
        vectorMaterial.transparent = true;
        this.gizmoVector = new THREE.Mesh(vectorGeometry, vectorMaterial);
        this.gizmoRoot.add(this.gizmoVector);
        this.gizmoVector.position.sub(new THREE.Vector3(0, 0, 0.25));
        this.gizmoVector.quaternion.setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          Math.PI / 2
        );
      };
      createGizmo();

      let updateGizmo = (forceVectorWorld, applyPointLocal) => {
        this.gizmoRoot.position.set(
          applyPointLocal.x,
          applyPointLocal.y,
          applyPointLocal.z
        );

        updateGizmoForceDirection(forceVectorWorld);
      };

      this.attachGizmo = targetModel => {
        targetModel.add(this.gizmoRoot);
      };

      this.detachGizmo = () => {
        if (this.gizmoRoot.parent) {
          this.gizmoRoot.parent.remove(this.gizmoRoot);
        }
      };

      const updateGizmoForceDirection = forceVectorWorld => {
        roundVector3(forceVectorWorld);
        let gizmoOrientation = new THREE.Quaternion();
        gizmoOrientation.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          forceVectorWorld.clone().normalize()
        );
        let rootOrientation = this.targetModel.quaternion
          .clone()
          .inverse()
          .multiply(gizmoOrientation);
        this.gizmoRoot.quaternion.set(
          rootOrientation.x,
          rootOrientation.y,
          rootOrientation.z,
          rootOrientation.w
        );
        gz3d.scene.refresh3DViews();
      };

      this.applyForceToLink = (link, forceVector, forceStrength) => {
        const f = forceVector
          .clone()
          .normalize()
          .multiplyScalar(forceStrength);

        /* eslint-disable camelcase */
        var request = new ROSLIB.ServiceRequest({
          body_name: link.name,
          reference_frame: '',
          reference_point: { x: 0.0, y: 0.0, z: 0.0 },
          wrench: {
            force: { x: f.x, y: f.y, z: f.z },
            torque: { x: 0.0, y: 0.0, z: 0.0 }
          },
          start_time: { secs: 0, nsecs: 0 },
          duration: { secs: 0, nsecs: 100000000 /*0.1s*/ }
        });
        /* eslint-enable camelcase */

        this.rosServiceApplyBodyWrench.callService(request);
      };

      let isIntersectionWithin = (intersections, lookForObject) => {
        if (intersections !== undefined && intersections.length > 0) {
          for (let i = 0; i < intersections.length; ++i) {
            let object = intersections[i].object;
            while (object.parent && object.parent !== gz3d.scene.scene) {
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

      this.OnApplyForce = () => {
        this.applyForceToLink(
          this.targetLink,
          this.forceVector,
          this.forceStrength
        );
        detachEventListenersDefineForceVector();
        stateService.setCurrentState(STATE.STARTED);

        this.targetModel = null;
        attachEventListenersChooseForcePoint();
      };

      let cancelOnStateChange = undefined;
      let attachEventListenersChooseForcePoint = () => {
        this.domElementPointerBindings.addEventListener(
          'click',
          onMouseClick,
          false
        );
        this.domElementKeyboardBindings.addEventListener(
          'keyup',
          onKeyUpGeneral,
          false
        );
        this.domElementPointerBindings.style.cursor = 'crosshair';

        cancelOnStateChange = stateService.addStateCallback(newState => {
          // cancel apply force if experiment is continued
          if (newState === STATE.STARTED) {
            stateService.removeStateCallback(cancelOnStateChange);
            this.detachGizmo();
          }
        });
      };

      let detachEventListenersChooseForcePoint = () => {
        if (this.domElementPointerBindings) {
          this.domElementPointerBindings.removeEventListener(
            'click',
            onMouseClick,
            false
          );
          this.domElementPointerBindings.removeEventListener(
            'mousedown',
            onMouseDown,
            false
          );
        }
      };

      let attachEventListenersDefineForceVector = () => {
        this.domElementPointerBindings.style.cursor = 'default';
        this.domElementPointerBindings.addEventListener(
          'mousemove',
          onMouseOverTorus,
          false
        );
        this.domElementPointerBindings.addEventListener(
          'mousedown',
          onMouseDown,
          false
        );
      };

      let detachEventListenersDefineForceVector = () => {
        if (this.domElementPointerBindings) {
          this.domElementPointerBindings.style.cursor = 'default';
          this.domElementPointerBindings.removeEventListener(
            'mousemove',
            onMouseOverTorus,
            false
          );
        }
        if (this.domElementKeyboardBindings) {
          this.domElementKeyboardBindings.removeEventListener(
            'keyup',
            onKeyUpGeneral,
            false
          );
        }
      };

      let activeDragRotation = false;
      let mouseLastPos = undefined;
      let stopDragRotation = () => {
        this.domElementPointerBindings.removeEventListener(
          'mousemove',
          onMouseMove,
          false
        );
        this.domElementPointerBindings.removeEventListener(
          'mouseup',
          stopDragRotation,
          false
        );
        activeDragRotation = false;
        userNavigationService.controls.enabled = true;
        this.domElementPointerBindings.style.cursor = 'default';
        // indicate that we can drag the gizmo again
        this.domElementPointerBindings.addEventListener(
          'mousemove',
          onMouseOverTorus,
          false
        );
      };
      let onMouseDown = event => {
        const mousePos = { x: event.clientX, y: event.clientY };
        const intersections = gz3d.getRayCastIntersections(mousePos);
        const intersectsWithGizmo = isIntersectionWithin(
          intersections,
          this.gizmoToruses
        );
        if (intersectsWithGizmo) {
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
          // prevent cursor from beeing set to point/default
          this.domElementPointerBindings.removeEventListener(
            'mousemove',
            onMouseOverTorus,
            false
          );
          this.domElementPointerBindings.style.cursor = 'move';
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
          this.onUIChangeForceVector();
          gz3d.scene.refresh3DViews();

          mouseLastPos = mousePos;
        }
      };

      let onMouseClick = event => {
        var mousePos = { x: event.clientX, y: event.clientY };

        if (!this.targetModel) {
          this.setTargetModel(gz3d.getRayCastModel(mousePos));
        }

        let intersections = gz3d.getRayCastIntersections(mousePos);
        const linkIntersection = gz3d.getLinkFromIntersections(
          intersections,
          this.targetModel
        );

        if (linkIntersection !== undefined) {
          this.targetLink = linkIntersection.link;
          this.attachGizmo(this.targetModel);
          this.targetPointLocal = this.targetModel.worldToLocal(
            linkIntersection.intersection.point.clone()
          );

          const viewDir = linkIntersection.intersection.point
            .clone()
            .sub(gz3d.scene.viewManager.mainUserView.camera.position);
          this.forceVector.set(viewDir.x, viewDir.y, viewDir.z);
          this.forceVector.normalize();
          updateGizmo(this.forceVector, this.targetPointLocal);
          detachEventListenersChooseForcePoint();
          attachEventListenersDefineForceVector();

          stateService.setCurrentState(STATE.PAUSED);
        }
      };

      let onMouseOverTorus = event => {
        const mousePos = { x: event.clientX, y: event.clientY };
        // check if mousing over toruses, change cursor icon if so
        const intersections = gz3d.getRayCastIntersections(mousePos);
        const intersectsWithGizmo = isIntersectionWithin(
          intersections,
          this.gizmoToruses
        );
        if (intersectsWithGizmo) {
          this.domElementPointerBindings.style.cursor = 'pointer';
        } else {
          this.domElementPointerBindings.style.cursor = 'default';
        }
      };

      let onKeyUpGeneral = event => {
        switch (event.code) {
          case 'Escape':
            this.disableApplyForceMode();
            this.detachGizmo();
            break;
        }
      };

      this.setTargetModel = model => {
        if (model.userData && model.userData.is_static) {
          clientLoggerService.logMessage(
            "Can't apply forces to static models",
            LOG_TYPE.ADVERTS,
            5000
          );
          return;
        }

        this.targetModel = gz3d.scene.selectedEntity = model;
      };
    }

    let service = new PushForceService();
    service.initialize();

    return service;
  }
]);
