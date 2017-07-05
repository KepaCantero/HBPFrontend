/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file is part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
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
 * ---LICENSE-END **/
/* global console: false */
/* global GZ3D: false */
/* global Detector: false */
/* global Stats: false */

/* global self: false */


(function () {
  'use strict';

  var gz3dModule = angular.module('gz3dModule');

  gz3dModule.factory('gz3d', [
    '$rootScope', '$window', '$compile', 'simulationInfo', 'bbpConfig',
    function ($rootScope, $window, $compile, simulationInfo, bbpConfig) {

      /* moved from the gz3d-view.html*/
      if (!Detector.webgl) {
        Detector.addGetWebGLMessage();
      }

      function GZ3DService() {

        var that = this;
        var isInitialized = false;

        this.isGlobalLightMaxReached = function () {
          if (that.scene === undefined) {
            return false;
          }

          var linfo = this.scene.findLightIntensityInfo();

          if (linfo.max >= 1.0) {
            return true;
          }
          else {
            return false;
          }
        };

        this.isGlobalLightMinReached = function () {
          if (that.scene === undefined) {
            return false;
          }

          var linfo = this.scene.findLightIntensityInfo();
          if (linfo.max <= 0.1) {
            return true;
          }
          else {
            return false;
          }
        };

        this.setLightHelperVisibility = function () {
          that.scene.scene.traverse(function (node) {
            if (node.name.indexOf('_lightHelper') > -1) {
              node.visible = that.scene.showLightHelpers;  //TODO: showLightHelpers should be part of this service?
            }
          });
        };

        this.Initialize = function() {
          if (isInitialized) {
            return;
          }

          GZ3D.assetsPath = simulationInfo.serverConfig.gzweb.assets;
          GZ3D.webSocketUrl = simulationInfo.serverConfig.gzweb.websocket;
          GZ3D.animatedModel = simulationInfo.animatedModel;

          if (!bbpConfig.get('localmode.forceuser', false)) {
            var token;
            var clientID = bbpConfig.get('auth.clientId', '');
            var localStorageTokenKey = 'tokens-' + clientID + '@https://services.humanbrainproject.eu/oidc';
            if (localStorage.getItem(localStorageTokenKey)) {
              try {
                token = JSON.parse(localStorage.getItem(localStorageTokenKey))[0].access_token;
              } catch(e) {
                // this token will be rejected by the server and the client will get a proper auth error
                token = 'malformed-token';
              }
            } else {
              // this token will be rejected by the server and the client will get a proper auth error
              token = 'no-token';
            }
            GZ3D.webSocketToken = token;
          }

          this.scene = new GZ3D.Scene();

          this.gui = new GZ3D.Gui(this.scene);
          this.iface = new GZ3D.GZIface(this.scene, this.gui);
          this.sdfParser = new GZ3D.SdfParser(this.scene, this.gui, this.iface);

          isInitialized = true;
        };

        this.deInitialize = function() {
          delete that.sdfParser;
          delete that.iface;
          delete that.gui;
          delete that.scene;

          delete that.stats;

          isInitialized = false;
        };
      }

      return new GZ3DService();
  }]);
}());
