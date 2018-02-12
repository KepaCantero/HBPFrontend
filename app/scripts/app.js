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

  /**
     * @ngdoc overview
     * @name exdFrontendApp
     * @description
     * # exdFrontendApp
     *
     * Main module of the application.
     */
  angular
    .module('exdFrontendApp', [
      'ngAnimate',
      'ngCookies',
      'ngResource',
      'n3-line-chart',
      'ngSanitize',
      'ngTouch',
      'ui.router',
      'ui.bootstrap',
      'ui.bootstrap.modal',
      'ui.codemirror',
      'angular.panels',
      'angular-toArrayFilter',
      'angulartics',
      'angulartics.google.analytics',
      'bbpConfig',
      'gzangular',
      'gz3dModule',
      'simulationControlServices',
      'colorableObjectModule',
      'simulationStateServices',
      'contextMenuStateService',
      'objectInspectorModule',
      'performanceMonitorModule',
      'userNavigationModule',
      'userContextModule',
      'environmentRenderingModule',
      'pythonCodeHelperServices',
      'simulationInfoService',
      'slurminfoService',
      'exdFrontendApp.Constants',
      'exdFrontendFilters',
      'nrpErrorHandlers',
      'nrpBackendAbout',
      'nrpAngulartics',
      'ngFileUpload',
      'environmentServiceModule',
      'experimentServices',
      'browserSupport',
      'vButton',
      'nrpUser',
      'editorToolbarModule',
      'editorsPanelModule',
      'experimentModule',
      'jointPlotModule',
      'simulationConfigModule',
      'spikeTrainModule',
      'spikeListenerModule',
      'collabExperimentLockModule',
      'roslibModule',
      'helpTooltipModule',
      'dynamicViewModule',
      'dynamicViewOverlayModule',
      'videoStreamModule',
      'showOnTop',
      'clientLoggerModule',
      'environmentRenderingModule',
      'storageServer',
      'clusterReservation',
      'demoCarousel',
      'experimentExplorer',
      'tipTooltipModule',
      'experimentList',
      'rosTerminalModule',
      'userInteractionModule',
      'robotDocumentation',
      'adminModule'
    ])
    // Routes
    .config([
      '$stateProvider',
      '$urlRouterProvider',
      'environmentServiceProvider',
      function($stateProvider, $urlRouterProvider, environmentServiceProvider) {
        // Configuring routes using `angular-ui-router` states.
        // (See https://github.com/angular-ui/ui-router/wiki)

        var homeState = {
          name: 'home',
          url: '/',
          templateUrl: 'views/common/home.html',
          controller: 'MainCtrl'
        };

        var experimentViewState = {
          name: 'experiment-view',
          url:
            '/esv-private/experiment-view/:serverID/:experimentID/:privateExperiment/:simulationID?ctx',
          templateUrl: 'views/esv/experiment-view.html',
          controller: 'experimentViewController as vm',
          controllerAs: 'vm',
          onEnter: [
            '$document',
            function($document) {
              $document.find('body').addClass('experiment-view-route');
            }
          ],
          onExit: [
            '$document',
            function($document) {
              $document.find('body').removeClass('experiment-view-route');
            }
          ],
          resolve: {
            setCollabState: [
              'environmentService',
              '$stateParams',
              function(environmentService, $stateParams) {
                return environmentService.setPrivateExperiment(
                  $stateParams.privateExperiment === 'true'
                );
              }
            ],
            siminfo: [
              'simulationInfo',
              '$stateParams',
              function(simulationInfo, $stateParams) {
                return simulationInfo.initialize(
                  $stateParams.serverID,
                  $stateParams.experimentID,
                  $stateParams.simulationID,
                  $stateParams.ctx
                );
              }
            ],
            initUserContextService: [
              'userContextService',
              function(userContextService) {
                return userContextService.initialized;
              }
            ]
          }
        };

        var robotDocumentation = {
          name: 'robot-doc',
          url: '/robot-doc?config',
          templateUrl: 'views/common/robot-documentation.html',
          resolve: {
            config: [
              '$location',
              '$http',
              function($location, $http) {
                return $http({
                  url: $location.search().config,
                  method: 'GET',
                  transformResponse: function(xml) {
                    return new X2JS().xml_str2json(xml);
                  }
                });
              }
            ]
          }
        };

        var esvWegStateDebug = {
          name: 'esv-webdebug',
          url: '/esv-webdebug?ctx',
          templateUrl: 'views/esv/esv-experiments.html',
          controller: 'esvExperimentsCtrl',
          resolve: {
            setCollabState: [
              'environmentService',
              function(environmentService) {
                return environmentService.setPrivateExperiment(false);
              }
            ]
          }
        };

        var esvDemoWaiting = {
          name: 'esv-demo-wait',
          url: '/esv-demo-wait',
          templateUrl: 'views/esv/demo-waiting-message.html',
          controller: 'DemoAutorunExperimentController',
          resolve: {
            setCollabState: [
              'environmentService',
              function(environmentService) {
                return environmentService.setPrivateExperiment(false);
              }
            ]
          }
        };
        var esvDemoIntroState = {
          name: 'esv-demo',
          url: '/esv-demo',
          templateUrl: 'views/esv/demo-experiments.html',
          controller: 'demoExperimentsController',
          resolve: {
            maintenanceMode: [
              'storageServer',
              function(storageServer) {
                return storageServer.getMaintenanceMode();
              }
            ],
            setCollabState: [
              'environmentService',
              function(environmentService) {
                return environmentService.setPrivateExperiment(false);
              }
            ]
          }
        };

        var esvPrivateState = {
          name: 'esv-private',
          url: '/esv-private?ctx',
          templateUrl: 'views/esv/esv-experiments.html',
          controller: 'esvExperimentsCtrl',
          resolve: {
            currentUser: [
              'storageServer',
              function(storageServer) {
                return storageServer.getCurrentUser();
              }
            ],
            setCollabState: [
              'environmentService',
              function(environmentService) {
                return environmentService.setPrivateExperiment(true);
              }
            ]
          }
        };

        var experimentExplorerState = {
          name: 'esv-files',
          url: '/experiment-explorer?ctx',
          templateUrl: 'views/common/experiment-explorer.html',
          resolve: {
            setCollabState: [
              'environmentService',
              function(environmentService) {
                return environmentService.setPrivateExperiment(true);
              }
            ]
          }
        };
        var supportState = {
          name: 'support',
          url: '/support',
          templateUrl: 'views/common/support.html'
        };

        var adminState = {
          name: 'admin',
          url: '/admin',
          templateUrl: 'views/admin/admin.html',
          controller: 'adminPageCtrl',
          controllerAs: '$ctrl'
        };

        var maintenanceState = {
          name: 'maintenance',
          url: '/maintenance',
          templateUrl: 'views/common/maintenance.html'
        };

        var newCollabOverviewState = {
          name: 'create-collab-overview',
          url: '/create-collab-overview',
          templateUrl: 'views/common/create-collab-overview.html'
        };

        if (
          window.bbpConfig.demomode &&
          window.bbpConfig.demomode.demoCarousel
        ) {
          esvPrivateState.controller = 'demoExperimentsController';
          esvPrivateState.templateUrl = 'views/esv/demo-experiments.html';
        }

        var home = $stateProvider.state(homeState);
        home.state(esvDemoWaiting);
        home.state(esvDemoIntroState);
        home.state(esvPrivateState);
        home.state(experimentViewState);
        home.state(supportState);
        home.state(newCollabOverviewState);
        home.state(experimentExplorerState);

        home.state(adminState);
        home.state(maintenanceState);

        home.state(robotDocumentation);
        home.state(esvWegStateDebug);

        // Provide a default route.
        // (See https://github.com/angular-ui/ui-router/wiki/URL-Routing)
        $urlRouterProvider.when('/esv-web', '/esv-private').otherwise('/');

        environmentServiceProvider.$get().initialize();
      }
    ])
    .config([
      '$compileProvider',
      '$logProvider',
      'environmentServiceProvider',
      function($compileProvider, $logProvider, environmentServiceProvider) {
        if (environmentServiceProvider.$get().isDevMode()) return;
        $compileProvider.debugInfoEnabled(false);
        $logProvider.debugEnabled(false);
      }
    ])
    .run([
      '$rootScope',
      '$log',
      'baseEventHandler',
      'environmentService',
      function($rootScope, $log, baseEventHandler, environmentService) {
        $rootScope.suppressKeyPress = baseEventHandler.suppressAnyKeyPress;
        if (environmentService.isDevMode()) return;
        window.console.debug = $log.debug;
      }
    ])
    .factory('timeoutHttpInterceptor', function() {
      // Here we specify a global http request timeout value for all requests, for all browsers
      return {
        request: function(config) {
          // config.timeout = 120 * 1000; //request timeout in milliseconds
          return config;
        }
      };
    })
    .config([
      '$httpProvider',
      function($httpProvider) {
        $httpProvider.interceptors.push('timeoutHttpInterceptor');
      }
    ])
    .run([
      '$rootScope',
      '$location',
      function($rootScope, $location) {
        $rootScope.$on('$stateChangeSuccess', function() {
          var currentPath = $location.path();
          window.parent.postMessage(
            {
              eventName: 'workspace.context',
              data: {
                state: JSON.stringify({
                  path: currentPath
                })
              }
            },
            '*'
          );
        });

        var ctxstate = $location.search().ctxstate;
        if (ctxstate) {
          ctxstate = JSON.parse(ctxstate);
          var currentPath = $location.path();
          if (ctxstate.path !== currentPath) {
            $location.path(ctxstate.path);
          }
        }
      }
    ])
    .run([
      'storageServer',
      function() {
        // storageServer.getExperiments();
      }
    ]);

  // load the configuration used by bbpConfig
  // and then bootstrap the application.
  angular.bootstrap().invoke([
    '$http',
    function($http) {
      var boot = function() {
        // Google Analytics
        if (angular.isDefined(window.bbpConfig.environment)) {
          var stage = window.bbpConfig.environment;
          if (stage === 'development') {
            /* global ga: false */
            ga('create', 'UA-62512653-1', 'auto');
          } else if (stage === 'staging') {
            /* global ga: false */
            ga('create', 'UA-62512653-2', 'auto');
          } else if (stage === 'production') {
            /* global ga: false */
            ga('create', 'UA-62512653-3', 'auto');
          }
        }

        angular.element(document).ready(function() {
          angular.bootstrap(document, ['exdFrontendApp'], { strictDi: true });
        });
      };

      if (window.bbpConfig) {
        boot();
      } else {
        $http
          .get('./config.json')
          .then(function(res) {
            window.bbpConfig = res.data;
          })
          .then(boot);
      }
    }
  ]);

  // Create the constant modules at the beginning so everyone can access it and
  // use it to define its own constants.
  angular.module('exdFrontendApp.Constants', []);
})();

// These are the two functions of JQuery mobile used by GZWeb. We deliberately
// chose to redeclare them as empty and not to include JQuery mobile. The
// reason is that JQuery mobile along with angular and the bootstrap based hbp template
// result in quite a layout mess. JQuery "improves" the layout by adding some divs and
// some css styles that try to make the page full screen but rather fail at this job in
// our case.

/* global $: false */
$.fn.buttonMarkup = function() {};
$.fn.popup = function() {};
$.fn.checkboxradio = function() {};
$.fn.touchstart = function() {};
$.fn.touchend = function() {};
