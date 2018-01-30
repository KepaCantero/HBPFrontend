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
    .module('exdFrontendApp.Constants')
    // constants for CLE error types
    .constant('TRANSFER_FUNCTION_TYPE', {
      ROBOT2NEURON: 1,
      NEURON2ROBOT: 2,
      NEURONMONITOR: 3
    });

  angular.module('exdFrontendApp').directive('graphicalEditor', [
    '$log',
    'backendInterfaceService',
    'STATE',
    'stateService',
    'pythonCodeHelper',
    'roslib',
    'serverError',
    '$timeout',
    'documentationURLs',
    'SIMULATION_FACTORY_CLE_ERROR',
    'SOURCE_TYPE',
    'TRANSFER_FUNCTION_TYPE',
    'simulationInfo',
    'codeEditorsServices',
    'environmentService',
    function(
      $log,
      backendInterfaceService,
      STATE,
      stateService,
      pythonCodeHelper,
      roslib,
      serverError,
      $timeout,
      documentationURLs,
      SIMULATION_FACTORY_CLE_ERROR,
      SOURCE_TYPE,
      TRANSFER_FUNCTION_TYPE,
      simulationInfo,
      codeEditorsServices,
      environmentService
    ) {
      return {
        templateUrl:
          'components/editors/transfer-function-editor/graphical-editor.template.html',
        restrict: 'E',
        scope: {
          control: '='
        },
        link: function(scope, element, attrs) {
          var ScriptObject = pythonCodeHelper.ScriptObject;

          scope.populations = [];
          scope.topics = [];
          scope.transferFunctions = [];
          scope.devMode = environmentService.isDevMode();

          scope.transferFunction = null;
          scope.selectedTF = null;
          scope.centerPanelTabSelection = 'script';

          scope.selectedTopic = null;
          scope.selectedPopulation = null;
          scope.isNeuronsSelected = false;
          scope.addMode = null;
          scope.newVariableName = '';

          scope.stateService = stateService;
          scope.STATE = STATE;
          scope.ERROR = SIMULATION_FACTORY_CLE_ERROR;
          scope.SOURCE_TYPE = SOURCE_TYPE;
          scope.TRANSFER_FUNCTION_TYPE = TRANSFER_FUNCTION_TYPE;

          scope.editorOptions = codeEditorsServices.getDefaultEditorOptions();
          scope.editorOptions = codeEditorsServices.ownerOnlyOptions(
            scope.editorOptions
          );

          scope.onNewErrorMessageReceived = function(msg) {
            if (
              msg.severity < 2 &&
              msg.sourceType === scope.SOURCE_TYPE.TRANSFER_FUNCTION
            ) {
              // Error message is not critical and can be fixed
              var flawedTransferFunction = _.find(scope.transferFunctions, {
                id: msg.functionName
              });
              if (flawedTransferFunction === undefined) {
                // if we couldn't find the tf from the id, try against the name
                flawedTransferFunction = _.find(scope.transferFunctions, {
                  name: msg.functionName
                });
              }
              if (flawedTransferFunction !== undefined) {
                // Remove error line highlighting if a new compile error is received
                if (msg.errorType === scope.ERROR.COMPILE) {
                  scope.cleanCompileError(flawedTransferFunction);
                }
                flawedTransferFunction.error[msg.errorType] = msg;
                // do not show error message in code block, because the line numbers probably do not match
              }
            }
          };
          var rosConnection = roslib.getOrCreateConnectionTo(attrs.server);
          scope.errorTopicSubscriber = roslib.createTopic(
            rosConnection,
            attrs.topic,
            'cle_ros_msgs/CLEError'
          );
          scope.errorTopicSubscriber.subscribe(
            scope.onNewErrorMessageReceived,
            true
          );

          scope.centerPanelTabChanged = function(newtab) {
            scope.centerPanelTabSelection = newtab;
          };

          scope.cleanCompileError = function(transferFunction) {
            delete transferFunction.error[scope.ERROR.COMPILE];
            delete transferFunction.error[scope.ERROR.NO_OR_MULTIPLE_NAMES];
          };

          scope.getFriendlyPopulationName = function(neurons) {
            if (neurons.type === 1) {
              if (neurons.step === 1) {
                return (
                  neurons.name + '[' + neurons.start + ':' + neurons.stop + ']'
                );
              } else {
                return (
                  neurons.name +
                  '[' +
                  neurons.start +
                  ':' +
                  neurons.step +
                  ':' +
                  neurons.stop +
                  ']'
                );
              }
            } else if (neurons.type === 2) {
              return neurons.name + '[' + neurons.gids + ']';
            } else {
              return neurons.name;
            }
          };

          scope.setDirty = function(transferFunction) {
            transferFunction.dirty = true;
          };

          scope.getFriendlyTopicName = function(topic) {
            if (topic.publishing) {
              return 'publishes on ' + topic.topic;
            } else {
              return 'subscribes to ' + topic.topic;
            }
          };

          scope.loadPopulations = function(response) {
            scope.populations = [];
            scope.isNeuronsSelected = false;
            response.populations.forEach(function(population) {
              var p = {};
              p.name = population.name;
              // eslint-disable-next-line camelcase
              p.neuron_model = population.neuron_model;
              p.tooltip = '';
              p.gids = [];
              population.gids.forEach(function(id) {
                var gid = {};
                gid.id = id;
                gid.selected = false;
                p.gids.push(gid);
              });
              population.parameters.forEach(function(par) {
                p.tooltip += par.parameterName + ': ' + par.value + '\n';
              });
              scope.populations.push(p);
            });
          };

          scope.loadTopics = function(response) {
            scope.topics = [];
            scope.topics = response.topics;
          };

          let refreshEditor = reset => {
            var editor = codeEditorsServices.getEditorChild(
              'codeEditor',
              element[0]
            );
            codeEditorsServices.refreshEditor(editor);
            if (reset) codeEditorsServices.resetEditor(editor);
          };

          scope.applyEditorOptions = function() {
            var editor = codeEditorsServices.getEditorChild(
              'codeEditor',
              element[0]
            );

            for (let opt in scope.editorOptions) {
              editor.setOption(opt, scope.editorOptions[opt]);
            }
          };

          scope.refresh = function() {
            refreshEditor();
          };

          // only start watching for changes after a little timeout
          // the flood of changes during compilation will cause angular to throw digest errors when watched
          $timeout(() => {
            // refresh on resize
            scope.unbindWatcherResize = scope.$watch(
              () => {
                if (element[0].offsetParent) {
                  return [
                    element[0].offsetParent.offsetWidth,
                    element[0].offsetParent.offsetHeight
                  ].join('x');
                } else {
                  return '';
                }
              },
              () => {
                refreshEditor();
              }
            );
            refreshEditor();
            scope.applyEditorOptions();
          }, 100);

          // update UI
          scope.unbindListenerUpdatePanelUI = scope.$on(
            'UPDATE_PANEL_UI',
            function() {
              // prevent calling the select functions of the tabs
              scope.refresh();
            }
          );

          scope.$on('$destroy', () => {
            scope.unbindWatcherResize && scope.unbindWatcherResize();
            scope.unbindListenerUpdatePanelUI();
          });

          scope.control.refresh = function() {
            backendInterfaceService.getStructuredTransferFunctions(
              scope.loadTransferFunctions
            );
            backendInterfaceService.getPopulations(scope.loadPopulations);
            backendInterfaceService.getTopics(scope.loadTopics);
            refreshEditor();
          };

          scope.setTFtype = function(tf) {
            var counter = 0;
            _.forEach(tf.devices, function(dev) {
              if (
                dev.type === 'LeakyIntegratorAlpha' ||
                dev.type === 'LeakyIntegratorExp' ||
                dev.type === 'SpikeRecorder'
              ) {
                counter += 1;
              } else {
                counter -= 1;
              }
            });
            _.forEach(tf.topics, function(top) {
              if (top.publishing) {
                if (top.name === '__return__') {
                  tf.type = TRANSFER_FUNCTION_TYPE.NEURON2ROBOT;
                } else {
                  counter++;
                }
              } else {
                counter--;
              }
            });
            if (tf.type) {
              return;
            }
            if (counter > 0) {
              tf.type = TRANSFER_FUNCTION_TYPE.NEURON2ROBOT;
            } else {
              tf.type = TRANSFER_FUNCTION_TYPE.ROBOT2NEURON;
            }
          };

          scope.apply = function() {
            if (scope.transferFunction) {
              var transferFunction = scope.transferFunction;
              scope.setTFtype(transferFunction);
              delete transferFunction.error[scope.ERROR.RUNTIME];
              delete transferFunction.error[scope.ERROR.LOADING];
              backendInterfaceService.setStructuredTransferFunction(
                transferFunction,
                function() {
                  transferFunction.dirty = false;
                  transferFunction.local = false;
                  scope.cleanCompileError(transferFunction);
                },
                function(data) {
                  serverError.displayHTTPError(data);
                }
              );
            }
          };

          scope.selectTransferFunction = function(transferFunction) {
            scope.selectedTF = transferFunction;
            var nextTF = null;
            for (var i = 0; i < scope.transferFunctions.length; ) {
              if (transferFunction === scope.transferFunctions[i].name) {
                nextTF = scope.transferFunctions[i];
                break;
              }
              i += 1;
            }
            if (nextTF === null) {
              if (scope.transferFunction) {
                scope.transferFunction.name = transferFunction;
              }
            } else {
              if (
                scope.transferFunction &&
                scope.transferFunction.oldName !== scope.transferFunction.name
              ) {
                scope.transferFunction.name = scope.transferFunction.oldName;
              }
              scope.transferFunction = nextTF;
            }
          };

          scope.createNewTF = function() {
            if (scope.transferFunction && scope.transferFunction.oldName) {
              if (scope.transferFunction.oldName !== scope.selectedTF) {
                scope.transferFunction.name = scope.transferFunction.oldName;
              } else {
                scope.selectedTF = getFreeName(
                  scope.transferFunctions,
                  'transferFunction'
                );
              }
            }
            var tf = new ScriptObject(scope.selectedTF, '');
            tf.type = undefined;
            tf.name = scope.selectedTF;
            tf.oldName = tf.name;
            tf.devices = [];
            tf.topics = [];
            tf.variables = [];
            tf.local = true;
            scope.transferFunctions.push(tf);
            scope.selectTransferFunction(tf.name);
          };

          scope.createNewMonitor = function() {
            if (!scope.selectedPopulation) {
              return;
            }
            if (scope.transferFunction && scope.transferFunction.oldName) {
              if (scope.transferFunction.oldName !== scope.selectedTF) {
                scope.transferFunction.name = scope.transferFunction.oldName;
              } else {
                scope.selectedTF = getFreeName(
                  scope.transferFunctions,
                  'monitor'
                );
              }
            }
            var tf = new ScriptObject(scope.selectedTF, 'return True');
            tf.type = TRANSFER_FUNCTION_TYPE.NEURONMONITOR;
            tf.name = scope.selectedTF;
            tf.oldName = tf.name;
            tf.devices = [];
            tf.topics = [
              {
                name: 'publisher',
                topic: 'a monitoring topic',
                type: 'monitor topic',
                publishing: true
              }
            ];
            tf.variables = [];
            tf.local = true;
            scope.transferFunctions.push(tf);
            scope.selectTransferFunction(tf.name);
            scope.createDevice();
            tf.devices[0].name = 'device';

            scope.addMode = null;
          };

          var detectDefaultTopic = function(t) {
            t.isDefault = t.name === '__return__';
          };

          scope.loadTransferFunctions = function(response) {
            _.forEach(response.transferFunctions, function(remoteTf, id) {
              var transferFunction = new ScriptObject(id, remoteTf.code);
              transferFunction.type = remoteTf.type;
              transferFunction.name = remoteTf.name;
              transferFunction.oldName = remoteTf.name;
              transferFunction.local = false;
              transferFunction.dirty = false;
              transferFunction.devices = remoteTf.devices;
              transferFunction.topics = remoteTf.topics;
              transferFunction.variables = remoteTf.variables;
              _.forEach(
                transferFunction.variables,
                scope.parseFilenameAndHeaders
              );
              _.forEach(transferFunction.topics, detectDefaultTopic);
              // If we already have local changes, we do not update
              var tf = _.find(scope.transferFunctions, { name: remoteTf.name });
              var found = angular.isDefined(tf);
              if (found && !tf.dirty) {
                tf.code = transferFunction.code;
                tf.devices = transferFunction.devices;
                tf.variables = transferFunction.variables;
                tf.topics = transferFunction.topics;
              } else if (!found) {
                scope.transferFunctions.push(transferFunction);
              }
            });
            if (scope.transferFunction) {
              scope.selectTransferFunction(scope.transferFunction.name);
            } else {
              scope.selectTransferFunction(scope.transferFunctions[0].name);
            }
          };

          var getFreeName = function(set, prefix) {
            var check = function(item) {
              if (item.name === prefix + counter) {
                found = true;
              }
            };
            var counter = 0;
            var found = true;
            while (found) {
              counter++;
              found = false;
              _.forEach(set, check);
            }
            return prefix + counter;
          };

          scope.addNewVariable = function(variableBaseName) {
            var variable = {};
            variable.name = getFreeName(
              scope.transferFunction.variables,
              variableBaseName
            );
            //eslint-disable-next-line camelcase
            variable.initial_value = '0';
            variable.type = 'int';
            variable.showDetails = true;

            scope.transferFunction.variables.push(variable);
            scope.setDirty(scope.transferFunction);

            scope.addMode = '';
          };

          scope.createTopicChannel = function(publishing) {
            if (scope.selectedTopic) {
              var top = {};
              top.name = getFreeName(scope.transferFunction.topics, 'topic');
              top.topic = scope.selectedTopic.topic;
              top.type = scope.selectedTopic.topicType;
              top.publishing = publishing;
              scope.transferFunction.topics.push(top);
              scope.setDirty(scope.transferFunction);
            }

            scope.addMode = null;
          };

          scope.setTopicName = function(top) {
            if (top.isDefault) {
              top.name = '__return__';
              scope.setDirty(scope.transferFunction);
            } else if (top.name === '__return__') {
              top.name = getFreeName(scope.transferFunction.topics, 'topic');
              scope.setDirty(scope.transferFunction);
            }
          };

          scope.createDevice = function() {
            if (scope.selectedPopulation) {
              var first;
              var step;
              var stop;
              var gids = [];
              for (var i = 0; i < scope.selectedPopulation.gids.length; i++) {
                if (scope.selectedPopulation.gids[i].selected) {
                  if (first === undefined) {
                    first = i;
                  } else {
                    if (step === undefined) {
                      step = i - first;
                    } else if (step !== i - stop) {
                      step = -1;
                    }
                  }
                  stop = i;
                  gids.push(i);
                }
              }
              if (first === undefined) return;
              var dev = {};
              dev.name = getFreeName(scope.transferFunction.devices, 'device');
              dev.type = 'LeakyIntegratorAlpha';
              var neurons = {};
              neurons.name = scope.selectedPopulation.name;
              neurons.start = first;
              neurons.stop = stop + 1;
              if (step === undefined) {
                step = 1;
              }
              neurons.step = step;
              neurons.ids = [];
              if (
                first === 0 &&
                step === 1 &&
                stop === scope.selectedPopulation.gids.length - 1
              ) {
                neurons.type = 0;
              } else {
                if (step !== -1) {
                  neurons.type = 1;
                } else {
                  neurons.type = 2;
                  neurons.ids = gids;
                  neurons.step = undefined;
                }
              }
              dev.neurons = neurons;
              scope.transferFunction.devices.push(dev);
              scope.setDirty(scope.transferFunction);
            }

            scope.addMode = null;
          };

          scope.deleteFrom = function(array, element) {
            var index = array.indexOf(element);
            if (index > -1) {
              array.splice(index, 1);
            }
            scope.setDirty(scope.transferFunction);
          };

          scope.deleteDevice = function(dev) {
            scope.deleteFrom(scope.transferFunction.devices, dev);
          };

          scope.deleteTopic = function(top) {
            scope.deleteFrom(scope.transferFunction.topics, top);
          };

          scope.deleteVariable = function(v) {
            scope.deleteFrom(scope.transferFunction.variables, v);
          };

          scope.parseFilenameAndHeaders = function(v) {
            if (v.type === 'csv') {
              if (v.initial_value) {
                var parsed = JSON.parse(v.initial_value);
                v.filename = parsed.filename;
                v.headers = parsed.headers;
              }
              if (v.headers === undefined) v.headers = [];
            } else {
              v.filename = undefined;
              v.headers = undefined;
            }
          };

          scope.deleteHeader = function(v, head) {
            scope.deleteFrom(v.headers, head);
            scope.updateCSV(v);
          };

          scope.addHeader = function(v, header) {
            v.headers.push(header);
            scope.updateCSV(v);
          };

          scope.updateCSV = function(v) {
            //eslint-disable-next-line camelcase
            v.initial_value = JSON.stringify({
              headers: v.headers,
              filename: v.filename
            });
            scope.setDirty(scope.transferFunction);
          };

          scope.toggleNeuron = function(neuron, toggle) {
            if (toggle) {
              neuron.selected = !neuron.selected;
            }
            if (neuron.selected) {
              scope.isNeuronsSelected = true;
            } else {
              var selectionFound = false;
              _.forEach(scope.selectedPopulation.gids, function(n) {
                if (n.selected) {
                  selectionFound = true;
                }
              });
              scope.isNeuronsSelected = selectionFound;
            }
          };

          var deleteInternal = function(scope, index) {
            scope.transferFunctions.splice(index, 1);
            if (scope.transferFunctions.length > 0) {
              scope.selectTransferFunction(scope.transferFunctions[0].name);
            } else {
              scope.transferFunction = null;
            }
          };

          scope.delete = function() {
            if (scope.transferFunction) {
              var transferFunction = scope.transferFunction;
              var index = scope.transferFunctions.indexOf(transferFunction);
              if (transferFunction.local) {
                deleteInternal(scope, index);
              } else {
                backendInterfaceService.deleteTransferFunction(
                  transferFunction.name,
                  function() {}
                );
                deleteInternal(scope, index);
              }
            }
          };
        }
      };
    }
  ]);
})();
