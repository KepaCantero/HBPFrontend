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

/* global THREE: false */

(function() {
  'use strict';

  angular.module('userInteractionModule').service('pullForceService', [
    'gz3d',
    'userNavigationService',
    'applyForceService',
    'contextMenuState',
    'environmentRenderingService',
    'dynamicViewOverlayService',
    'stateService',
    'STATE',
    'DYNAMIC_VIEW_CHANNELS',
    function(
      gz3d,
      userNavigationService,
      applyForceService,
      contextMenuStateService,
      environmentRenderingService,
      dynamicViewOverlayService,
      stateService,
      STATE,
      DYNAMIC_VIEW_CHANNELS
    ) {
      function PullForceService() {
        this.domElementPointerBindings = undefined;

        let raycaster = new THREE.Raycaster();
        let intersectionPlane = new THREE.Plane();
        let startPullLink = undefined;
        let mouseStart = new THREE.Vector3();

        this.dist = new THREE.Vector3();
        this.pullForceGizmos = [];
        this.forceAmplifier = 1;

        this.currentModel = () => {
          return this.targetModel;
        };

        const createGizmo = (targetModel, targetPoint) => {
          let gizmoRoot = new THREE.Object3D();
          gizmoRoot.visible = true;
          gizmoRoot.up = new THREE.Vector3(0, 0, 1);
          gizmoRoot.renderOrder = 100000;
          const useMaxArrorIndicator = true;

          const coneLength = 0.25;
          let coneGeometry = new THREE.ConeBufferGeometry(
            0.15,
            coneLength * 0.75,
            8
          );
          let greenMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            opacity: 0.3,
            depthTest: false
          });
          greenMaterial.transparent = true;

          let directionArrowMax = new THREE.Mesh(coneGeometry, greenMaterial);
          directionArrowMax.renderOrder = 2;
          let tipAnchor = new THREE.Object3D();
          gizmoRoot.add(tipAnchor);
          tipAnchor.add(directionArrowMax);
          directionArrowMax.position.sub(
            new THREE.Vector3(0, 0, -coneLength * 0.75 * 0.5)
          );
          directionArrowMax.quaternion.setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            -Math.PI / 2
          );
          directionArrowMax.visible = useMaxArrorIndicator;

          let redMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            opacity: 0.8,
            depthTest: false
          });
          redMaterial.transparent = true;
          let vectorGeometryTarget = new THREE.ConeBufferGeometry(
            0.19,
            coneLength,
            8
          );
          let directionArrowTarget = new THREE.Mesh(
            vectorGeometryTarget,
            redMaterial
          );
          directionArrowTarget.renderOrder = 1;
          tipAnchor.add(directionArrowTarget);
          directionArrowTarget.position.sub(
            new THREE.Vector3(0, 0, -coneLength * 0.5)
          );
          directionArrowTarget.quaternion.setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            -Math.PI / 2
          );

          let cylinderGeo = new THREE.CylinderBufferGeometry(0.005, 0.005, 1);
          let cylinderObject = new THREE.Mesh(cylinderGeo, redMaterial);
          cylinderObject.position.set(0, 0, -0.5);
          cylinderObject.quaternion.setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            -Math.PI / 2
          );
          gizmoRoot.add(cylinderObject);
          let sphereGeo = new THREE.SphereBufferGeometry(0.02, 6, 6);
          let sphereMesh = new THREE.Mesh(sphereGeo, redMaterial);
          gizmoRoot.add(sphereMesh);

          // finalize
          const localPositon = targetModel.worldToLocal(targetPoint.clone());
          targetModel.add(gizmoRoot);
          gizmoRoot.position.set(
            localPositon.x,
            localPositon.y,
            localPositon.z
          );
          return gizmoRoot;
        };

        const onStartPulling = mouseEvent => {
          // only start polling an object if the user clicked on a valid link
          const mousePos = { x: mouseEvent.clientX, y: mouseEvent.clientY };

          // todo: move model intersection to force service?
          let intersect = new THREE.Vector3();
          let model = gz3d.scene.getRayCastModel(mousePos, intersect);
          if (model) {
            if (contextMenuStateService.axisSelected(model)) {
              model = gz3d.scene.modelManipulator.object;
            }
          }

          if (
            model !== undefined &&
            model.userData &&
            !model.userData.is_static
          ) {
            const linkIntersection = applyForceService.getLinkRayCastIntersection(
              mousePos,
              model
            );
            if (linkIntersection !== undefined) {
              userNavigationService.controls.enabled = false;
              startPullLink = linkIntersection.link;

              const userView = gz3d.scene.viewManager.mainUserView;
              const normalizedScreenCoords = new THREE.Vector2(
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
              raycaster.setFromCamera(normalizedScreenCoords, userView.camera);
              intersectionPlane.setFromNormalAndCoplanarPoint(
                userView.camera.getWorldDirection(),
                linkIntersection.intersection.point
              );
              mouseStart = raycaster.ray.intersectPlane(intersectionPlane);
              this.targetModel = model;

              this.pullForceGizmos.push(
                createGizmo(model, linkIntersection.intersection.point)
              );
              this.domElementPointerBindings.addEventListener(
                'mouseup',
                onStopPulling,
                false
              );
              this.domElementPointerBindings.addEventListener(
                'mouseout',
                onStopPulling,
                false
              );
              this.domElementPointerBindings.addEventListener(
                'mousemove',
                onDoPulling,
                false
              );
              environmentRenderingService.addOnUpdateRenderingCallback(
                onApplyPulling
              );
            }
          }
        };

        const onDoPulling = event => {
          let userView = gz3d.scene.viewManager.mainUserView;
          let normalizedScreenCoords = new THREE.Vector2(
            (event.clientX - userView.renderer.domElement.offsetLeft) /
              userView.container.clientWidth *
              2 -
              1,
            -(
              (event.clientY - userView.renderer.domElement.offsetTop) /
              userView.container.clientHeight
            ) *
              2 +
              1
          );
          raycaster.setFromCamera(normalizedScreenCoords, userView.camera);

          // world space
          intersectionPlane.setFromNormalAndCoplanarPoint(
            userView.camera.getWorldDirection(),
            mouseStart
          );
          const mouse = raycaster.ray.intersectPlane(intersectionPlane);
          this.dist.subVectors(mouse, mouseStart);
        };

        const onApplyPulling = () => {
          if (this.dist.length() === 0) return;

          const gizmo = this.pullForceGizmos[this.pullForceGizmos.length - 1];
          // update force vector in case robot moved in case of a running experiment
          mouseStart = gizmo.getWorldPosition().clone();
          const mouse = raycaster.ray.intersectPlane(intersectionPlane);
          this.dist.subVectors(mouse, mouseStart);
          const dist = this.dist;

          let forceDir = dist.clone().normalize();

          const distThreshold = 0.2;
          const distRangeLimit = 0.8;
          const forceMultiplier = 52;
          const maxForce = 150;
          const minForce = 0;
          const force = Math.max(
            minForce,
            Math.min(
              Math.log2(distThreshold + dist.length() / distRangeLimit) *
                forceMultiplier,
              maxForce
            )
          );

          // update gizmo orientation to current
          let gizmoOrientation = new THREE.Quaternion();
          gizmoOrientation.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            forceDir
              .clone()
              .multiplyScalar(-1)
              .normalize()
          );
          let rootOrientation = gizmo.parent.quaternion
            .clone()
            .inverse()
            .multiply(gizmoOrientation);
          gizmo.quaternion.set(
            rootOrientation.x,
            rootOrientation.y,
            rootOrientation.z,
            rootOrientation.w
          );

          if (force < maxForce) {
            gizmo.children[0].position.set(0, 0, -dist.length());
            gizmo.children[1].scale.set(1, dist.length() - 0.25, 1);
            gizmo.children[1].position.set(0, 0, -0.5 * dist.length() + 0.125);
          }
          let innerCone = gizmo.children[0].children[1];
          const scaleFactor = Math.max(0.03, force / maxForce);
          innerCone.scale.set(scaleFactor, 1, scaleFactor);

          // refresh scene so change of force vector is displayed
          gz3d.scene.refresh3DViews();

          // use a factor related to mass the object to provide a more general experience
          const pausedMultiplier =
            stateService.currentState === STATE.PAUSED ? 75 : 1;
          applyForceService.applyForceToLink(
            startPullLink,
            forceDir,
            force * this.forceAmplifier * pausedMultiplier
          );
        };

        const onStopPulling = () => {
          userNavigationService.controls.enabled = true;
          if (stateService.currentState === STATE.STARTED) {
            const gizmo = this.pullForceGizmos[this.pullForceGizmos.length - 1];
            // remove only if play, wait until play to remove gizmo
            gizmo.parent.remove(gizmo);
            this.pullForceGizmos.pop();
          } else {
            const stateCallback = stateService.addStateCallback(newState => {
              if (newState === STATE.STARTED) {
                stateService.removeStateCallback(stateCallback);
                while (this.pullForceGizmos.length > 0) {
                  const gizmo = this.pullForceGizmos[
                    this.pullForceGizmos.length - 1
                  ];
                  // remove only if play, wait until play to remove gizmo
                  gizmo.parent.remove(gizmo);
                  this.pullForceGizmos.pop();
                }
              }
            });
          }

          environmentRenderingService.removeOnUpdateRenderingCallback(
            onApplyPulling
          );
          this.domElementPointerBindings.removeEventListener(
            'mousemove',
            onDoPulling,
            false
          );
          this.domElementPointerBindings.removeEventListener(
            'mousedown',
            onStartPulling,
            false
          );
          this.domElementPointerBindings.removeEventListener(
            'mouseup',
            onStopPulling,
            false
          );
          this.domElementPointerBindings.removeEventListener(
            'mouseout',
            onStopPulling,
            false
          );

          // prepare for next pull action
          this.domElementPointerBindings.addEventListener(
            'mousedown',
            onStartPulling,
            false
          );
        };

        this.Activate = () => {
          applyForceService.disableApplyForceMode();
          applyForceService.detachGizmo();
          const userViewDOM = gz3d.scene.viewManager.mainUserView.container;
          this.domElementPointerBindings = userViewDOM ? userViewDOM : document;
          this.domElementPointerBindings.addEventListener(
            'mousedown',
            onStartPulling,
            false
          );
          dynamicViewOverlayService.createDynamicOverlay(
            DYNAMIC_VIEW_CHANNELS.PULL_FORCE_MODE
          );
        };

        this.Deactivate = () => {
          this.domElementPointerBindings.removeEventListener(
            'mousedown',
            onStartPulling,
            false
          );
          this.domElementPointerBindings.removeEventListener(
            'mousemove',
            onDoPulling,
            false
          );
          this.domElementPointerBindings.removeEventListener(
            'mouseup',
            onStopPulling,
            false
          );
          this.domElementPointerBindings.removeEventListener(
            'mouseout',
            onStopPulling,
            false
          );
          environmentRenderingService.removeOnUpdateRenderingCallback(
            onApplyPulling
          );
          dynamicViewOverlayService.closeAllOverlaysOfType(
            DYNAMIC_VIEW_CHANNELS.PULL_FORCE_MODE
          );
        };

        this.SetForceAmplifier = value => {
          this.forceAmplifier = value;
        };
      }

      return new PullForceService();
    }
  ]);
})();
