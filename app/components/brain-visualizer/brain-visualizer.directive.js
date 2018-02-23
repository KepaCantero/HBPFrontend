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
  /* global BRAIN3D: false */
  angular.module('exdFrontendApp').directive('brainvisualizer', [
    'simulationConfigService',
    'backendInterfaceService',
    'RESET_TYPE',
    'spikeListenerService',
    function(
      simulationConfigService,
      backendInterfaceService,
      RESET_TYPE,
      spikeListenerService
    ) {
      return {
        templateUrl:
          'components/brain-visualizer/brain-visualizer.template.html',
        restrict: 'E',
        scope: {
          data: '='
        },
        link: function(scope, element) {
          var brain3D;
          var brainContainer = element.find('.esv-brainvisualizer-main');

          scope.initializing = true;
          scope.minMaxClippingSliderValue = 0;
          scope.pointSizeSliderValue = 0;
          scope.populations = [];
          scope.colorMaps = [
            BRAIN3D.COLOR_MAP_POLULATIONS,
            BRAIN3D.COLOR_MAP_USER
          ];
          scope.spikeScaler = 0;
          scope.shapes = [
            BRAIN3D.REP_SHAPE_SPHERICAL,
            BRAIN3D.REP_SHAPE_CUBIC,
            BRAIN3D.REP_SHAPE_FLAT,
            BRAIN3D.REP_SHAPE_CLOUD
          ];
          scope.distributions = [
            BRAIN3D.REP_DISTRIBUTION_OVERLAP,
            BRAIN3D.REP_DISTRIBUTION_DISTRIBUTE,
            BRAIN3D.REP_DISTRIBUTION_SPLIT
          ];
          scope.displays = [
            BRAIN3D.DISPLAY_TYPE_POINT,
            BRAIN3D.DISPLAY_TYPE_BLENDED
          ];
          scope.currentValues = {
            currentShape: BRAIN3D.REP_SHAPE_SPHERICAL,
            currentDistribution: BRAIN3D.REP_DISTRIBUTION_OVERLAP,
            currentDisplay: BRAIN3D.DISPLAY_TYPE_POINT,
            currentColorMap: BRAIN3D.COLOR_MAP_POLULATIONS,
            displayColorMaps: false,
            userCoordMode: false
          };

          //------------------------------------------------
          // Init brain 3D visualizer when the panel is open

          scope.initBrainContainer = function(data) {
            if (brain3D) {
              brain3D.updateData(data);
            } else {
              brain3D = new BRAIN3D.MainView(
                brainContainer[0],
                data,
                'img/brainvisualizer/brain3dballsimple256.png',
                'img/brainvisualizer/brain3dballglow256.png'
              );

              // Update UI with default brain 3D visualizer

              scope.minMaxClippingSliderValue = [
                brain3D.minRenderDist,
                brain3D.maxRenderDist
              ];
              scope.pointSizeSliderValue = brain3D.ptsize;
            }

            scope.initializing = false;
          };

          scope.initWithPopulations = function() {
            backendInterfaceService.getPopulations(function(response) {
              if (response.populations) {
                var data = { populations: {} };
                scope.populations = [];

                data.userData = scope.userFile;

                for (var i in response.populations) {
                  if (response.populations.hasOwnProperty(i)) {
                    var pop = response.populations[i];
                    var newPop = {};
                    newPop.list = pop.indices;
                    newPop.gids = pop.gids;

                    newPop.color =
                      'hsl(' +
                      i / (response.populations.length + 1) * 360.0 +
                      ',100%,80%)';
                    newPop.name = pop.name;
                    newPop.visible = true;

                    scope.populations.push(newPop);
                    data.populations[pop.name] = newPop;
                  }
                }

                scope.initBrainContainer(data);

                scope.userFile = brain3D.userData;

                if (scope.userFile) {
                  if (
                    scope.shapes[scope.shapes.length - 1] !==
                    BRAIN3D.REP_SHAPE_USER
                  ) {
                    scope.shapes.push(BRAIN3D.REP_SHAPE_USER);
                  }

                  scope.currentValues.currentShape = BRAIN3D.REP_SHAPE_USER;

                  if (scope.userFile.populations) {
                    scope.currentValues.userCoordMode = true;
                  } else {
                    if (scope.userFile.colors) {
                      scope.currentValues.displayColorMaps = true;
                      scope.currentValues.userColorsMode = true;
                      scope.currentValues.userCoordMode = true;
                      scope.currentValues.currentColorMap =
                        BRAIN3D.COLOR_MAP_USER;
                    }
                  }
                }
              }
            });
          };

          scope.initContent = function() {
            var brainVisualizationDataExists = simulationConfigService.doesConfigFileExist(
              'brainvisualizer'
            );
            brainVisualizationDataExists
              .then(function(exists) {
                if (exists) {
                  simulationConfigService
                    .loadConfigFile('brainvisualizer')
                    .then(function(file) {
                      var brainVisualizerUserData = JSON.parse(file);
                      scope.userFile = brainVisualizerUserData;

                      scope.initWithPopulations();
                    })
                    .catch(function() {
                      scope.initWithPopulations();
                    });
                } else {
                  scope.initWithPopulations();
                }
              })
              .catch(function() {
                scope.initWithPopulations();
              });
          };

          scope.togglePopulationVisibility = function(pop) {
            pop.visible = !pop.visible;
            brain3D.updatePopulationVisibility();
          };

          scope.initContent();

          var onNewSpikesMessageReceived = function(message) {
            brain3D.displaySpikes(message.spikes);
          };

          if (scope.spikeScaler > 0) {
            spikeListenerService.startListening(onNewSpikesMessageReceived);
          }

          scope.updateSpikeScaler = function() {
            if (brain3D) {
              if (scope.spikeScaler > 0) {
                spikeListenerService.startListening(onNewSpikesMessageReceived);
              } else {
                spikeListenerService.stopListening(onNewSpikesMessageReceived);
                if (brain3D) {
                  brain3D.flushPendingSpikes();
                }
              }

              brain3D.setSpikeScaleFactor(scope.spikeScaler);
            }
          };

          scope.update = function() {
            if (brain3D) {
              scope.initializing = true;
              scope.initContent();
            }
          };

          scope.setDisplay = function(display) {
            if (brain3D) {
              scope.currentValues.currentDisplay = display;
              brain3D.setDisplayType(display);
            }
          };

          scope.setShape = function(shape) {
            if (brain3D) {
              scope.currentValues.userCoordMode =
                shape === BRAIN3D.REP_SHAPE_USER;

              if (scope.currentValues.userCoordMode) {
                if (scope.userFile.populations) {
                  if (
                    scope.currentValues.currentDistribution !==
                    BRAIN3D.REP_DISTRIBUTION_DISTRIBUTE
                  ) {
                    this.setDistribution(BRAIN3D.REP_DISTRIBUTION_DISTRIBUTE);
                  }
                } else if (
                  scope.currentValues.currentDistribution !==
                  BRAIN3D.REP_DISTRIBUTION_OVERLAP
                ) {
                  scope.setDistribution(BRAIN3D.REP_DISTRIBUTION_OVERLAP);
                }
              }

              scope.currentValues.currentShape = shape;
              brain3D.setShape(shape);
            }
          };

          scope.setDistribution = function(distribution) {
            if (brain3D) {
              scope.currentValues.currentDistribution = distribution;
              brain3D.setDistribution(distribution);
            }
          };

          scope.setColorMap = function(cmap) {
            if (brain3D) {
              scope.currentValues.currentColorMap = cmap;
              scope.currentValues.userColorsMode =
                cmap === BRAIN3D.COLOR_MAP_USER;
              brain3D.setColorMap(cmap);
            }
          };

          scope.$on('RESET', function(event, resetType) {
            if (
              resetType === RESET_TYPE.RESET_FULL ||
              resetType === RESET_TYPE.RESET_BRAIN
            ) {
              scope.update();
            }
          });

          // Population changed update
          scope.$on('pynn.populationsChanged', function() {
            scope.update();
          });

          // Clean up on leaving
          scope.$on('$destroy', function() {
            brain3D && brain3D.terminate();

            spikeListenerService.stopListening(onNewSpikesMessageReceived);
          });
        }
      };
    }
  ]);
})();
