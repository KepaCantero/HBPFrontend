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
    .constant('SIMULATION_FACTORY_CLE_ERROR', {
      COMPILE: 'Compile',
      RUNTIME: 'Runtime',
      LOADING: 'Loading',
      NO_OR_MULTIPLE_NAMES: 'NoOrMultipleNames'
    });

  angular
    .module('exdFrontendApp.Constants')
    // constants for CLE error types
    .constant('FRONTEND_ERROR', {
      INPUT: 'Input'
    });

  angular
    .module('exdFrontendApp.Constants')
    // Constants for CLE error source types
    .constant('SOURCE_TYPE', {
      TRANSFER_FUNCTION: 'Transfer Function',
      STATE_MACHINE: 'State Machine'
    });

  angular
    .module('exdFrontendApp.Constants')
    // constants for CLE error types
    .constant('TRANSFER_FUNCTION_TYPE', {
      ROBOT2NEURON: 1,
      NEURON2ROBOT: 2,
      NEURONMONITOR: 3
    });

  angular
    .module('exdFrontendApp')
    .constant(
      'DEFAULT_TF_CODE',
      `@nrp.Robot2Neuron()
def {0}(t):
    #log the first timestep (20ms), each couple of seconds
    if t % 2 < 0.02:
        clientLogger.info('Time: ', t)`
    )
    .directive('transferFunctionEditor', [
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
      'editorsPanelService',
      'clbErrorDialog',
      'RESET_TYPE',
      'autoSaveService',
      'saveErrorsService',
      'clbConfirm',
      'downloadFileService',
      'DEFAULT_TF_CODE',
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
        environmentService,
        editorsPanelService,
        clbErrorDialog,
        RESET_TYPE,
        autoSaveService,
        saveErrorsService,
        clbConfirm,
        downloadFileService,
        DEFAULT_TF_CODE
      ) {
        return {
          templateUrl:
            'components/editors/transfer-function-editor/transfer-function-editor.template.html',
          restrict: 'E',
          scope: {
            control: '='
          },
          link: function(scope, element, attrs) {
            var ScriptObject = pythonCodeHelper.ScriptObject;

            var DIRTY_TYPE = 'TF';

            scope.populations = [];
            scope.topics = [];
            scope.transferFunctions = [];
            scope.devMode = environmentService.isDevMode();
            scope.isPrivateExperiment = environmentService.isPrivateExperiment();

            scope.transferFunction = null;
            scope.selectedTF = null;
            scope.centerPanelTabSelection = 'script';
            scope.isSavingToCollab = false;

            scope.selectedTopic = null;
            scope.selectedPopulation = null;
            scope.isNeuronsSelected = false;
            scope.addMode = null;
            scope.newVariableName = '';
            scope.nTransferFunctionDirty = 0;
            scope.collabDirty = false;

            scope.stateService = stateService;
            scope.STATE = STATE;
            scope.ERROR = SIMULATION_FACTORY_CLE_ERROR;
            scope.SOURCE_TYPE = SOURCE_TYPE;
            scope.TRANSFER_FUNCTION_TYPE = TRANSFER_FUNCTION_TYPE;

            scope.editorOptions = codeEditorsServices.getDefaultEditorOptions();
            scope.editorOptions = codeEditorsServices.ownerOnlyOptions(
              scope.editorOptions
            );

            let docs = documentationURLs.getDocumentationURLs();
            scope.cleDocumentationURL = docs.cleDocumentationURL;
            scope.platformDocumentationURL = docs.platformDocumentationURL;

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

            scope.updateCurrentTFContent = function() {
              if (scope.centerPanelTabSelection == 'rawscript') {
                scope.populateTransferFunctionsWithRawCode().then(function() {
                  scope.refresh();
                });
              } else {
                scope.populateStructuredTransferFunctions();
                scope.refresh();
              }
            };

            scope.centerPanelTabChanged = function(newtab) {
              if (scope.nTransferFunctionDirty) {
                scope.applyAllDirtyScripts(() => {
                  scope.centerPanelTabSelection = newtab;
                  scope.updateCurrentTFContent();
                });
              } else {
                scope.centerPanelTabSelection = newtab;
                scope.updateCurrentTFContent();
              }
            };

            scope.cleanCompileError = function(transferFunction) {
              delete transferFunction.error[scope.ERROR.COMPILE];
              delete transferFunction.error[scope.ERROR.NO_OR_MULTIPLE_NAMES];
            };

            scope.getFriendlyPopulationName = function(neurons) {
              if (neurons.type === 1) {
                if (neurons.step === 1) {
                  return (
                    neurons.name +
                    '[' +
                    neurons.start +
                    ':' +
                    neurons.stop +
                    ']'
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
              scope.nTransferFunctionDirty++;
              scope.collabDirty = true;
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
                p.gids = [];
                p.rawInfo = population;
                population.gids.forEach(function(id) {
                  var gid = {};
                  gid.id = id;
                  gid.selected = false;
                  p.gids.push(gid);
                });

                p.parameters = population.parameters;

                scope.populations.push(p);
              });
            };

            scope.resetListenerUnbindHandler = scope.$on('RESET', function(
              event,
              resetType
            ) {
              if (resetType === RESET_TYPE.RESET_FULL) {
                scope.populations = [];
                scope.topics = [];
                scope.transferFunctions = [];
                scope.transferFunction = null;
                scope.selectedTF = null;
                scope.centerPanelTabSelection = 'script';
                scope.selectedTopic = null;
                scope.selectedPopulation = null;
                scope.isNeuronsSelected = false;
                scope.nTransferFunctionDirty = 0;
              }
            });

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

              editor = codeEditorsServices.getEditorChild(
                'rawCodeEditor',
                element[0]
              );
              codeEditorsServices.refreshEditor(editor);
              if (reset) codeEditorsServices.resetEditor(editor);

              scope.updateNTransferFunctionDirty();
            };

            scope.applyEditorOptions = function() {
              var editor = codeEditorsServices.getEditorChild(
                'codeEditor',
                element[0]
              );

              for (let opt in scope.editorOptions) {
                editor.setOption(opt, scope.editorOptions[opt]);
              }

              editor = codeEditorsServices.getEditorChild(
                'rawCodeEditor',
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
              scope.resetListenerUnbindHandler();
              scope.unbindWatcherResize && scope.unbindWatcherResize();
              scope.unbindListenerUpdatePanelUI();
            });

            scope.populateStructuredTransferFunctions = function() {
              backendInterfaceService.getStructuredTransferFunctions(
                scope.loadTransferFunctions
              );
              let tf2select =
                editorsPanelService.openOptions &&
                editorsPanelService.openOptions.selectTF;
              backendInterfaceService
                .getPopulations(scope.loadPopulations)
                .then(() => {
                  tf2select && scope.selectTransferFunction(tf2select);
                });
              backendInterfaceService.getTopics(scope.loadTopics);
              refreshEditor();
            };

            scope.control.refresh = function() {
              scope.populateStructuredTransferFunctions();
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

            scope.applyAllDirtyScripts = function(doneCallback) {
              var oneFound = false;
              _.forEach(scope.transferFunctions, function(transferFunction) {
                if (transferFunction.dirty) {
                  scope.applyScript(transferFunction, doneCallback);
                  oneFound = true;
                }
              });

              if (!oneFound) doneCallback();
            };

            scope.applyScript = function(transferFunction, doneCallback) {
              if (transferFunction) {
                if (scope.centerPanelTabSelection === 'script') {
                  if (transferFunction.code === '') {
                    transferFunction.code = 'return';
                  }
                  scope.setTFtype(transferFunction);
                  delete transferFunction.error[scope.ERROR.RUNTIME];
                  delete transferFunction.error[scope.ERROR.LOADING];
                  backendInterfaceService.setStructuredTransferFunction(
                    transferFunction,
                    function() {
                      transferFunction.dirty = false;
                      transferFunction.local = false;
                      scope.cleanCompileError(transferFunction);
                      if (doneCallback) doneCallback();
                      scope.updateNTransferFunctionDirty();
                    },
                    function(data) {
                      serverError.displayHTTPError(data);
                      if (doneCallback) doneCallback();
                    }
                  );
                } else {
                  // Make sure we don't have duplicated names
                  var tfNames = scope.transferFunctions.map(function(tf) {
                    var tfName = pythonCodeHelper.getFunctionName(tf.rawCode);
                    return tfName;
                  });

                  if (new Set(tfNames).size !== tfNames.length) {
                    clbErrorDialog.open({
                      type: 'Duplicate definition names',
                      message: `There is already a transfer function with the same name. Please use another name.`
                    });

                    if (doneCallback) doneCallback();
                    return;
                  }

                  scope.cleanCompileError(transferFunction);

                  backendInterfaceService.editTransferFunction(
                    transferFunction.name,
                    transferFunction.rawCode,
                    function() {
                      transferFunction.dirty = false;
                      transferFunction.local = false;
                      scope.updateNTransferFunctionDirty();
                      transferFunction.oldName = transferFunction.name = pythonCodeHelper.getFunctionName(
                        transferFunction.rawCode
                      );

                      if (
                        scope.transferFunction.name === transferFunction.name
                      ) {
                        scope.selectTransferFunction(transferFunction.name);
                      }

                      if (doneCallback) doneCallback();
                    },
                    function(data) {
                      serverError.displayHTTPError(data);
                      if (doneCallback) doneCallback();
                    }
                  );
                }
              }
            };

            scope.apply = function(doneCallback) {
              scope.applyScript(scope.transferFunction, doneCallback);
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

              var rawcode = DEFAULT_TF_CODE.replace('{0}', scope.selectedTF);

              var tf = new ScriptObject(
                scope.selectedTF,
                scope.centerPanelTabSelection === 'script' ? '' : rawcode
              );
              tf.type = undefined;
              tf.name = scope.selectedTF;
              tf.oldName = tf.name;
              tf.devices = [];
              tf.topics = [];
              tf.variables = [];
              tf.local = true;
              tf.dirty = true;
              tf.rawCode = rawcode;
              tf.active = true;

              scope.nTransferFunctionDirty++;
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

            scope.populateTransferFunctionsWithRawCode = function() {
              return backendInterfaceService.getTransferFunctions(function(
                response
              ) {
                _.forEach(response.data, function(code, id) {
                  // If we already have local changes, we do not update

                  var tf = _.find(scope.transferFunctions, { name: id });

                  var found = angular.isDefined(tf);
                  if (found) {
                    tf.rawCode = code;
                    tf.active = response.active[tf.name];
                  }
                });
              });
            };

            scope.toggleActive = function(tf) {
              tf.active = !tf.active;

              backendInterfaceService.setActivateTransferFunction(
                tf.name,
                null,
                tf.active,
                function() {},
                function(data) {
                  tf.active = !tf.active;
                  serverError.displayHTTPError(data);
                }
              );
            };

            scope.updateNTransferFunctionDirty = function() {
              scope.nTransferFunctionDirty = 0;
              _.forEach(scope.transferFunctions, function(tf) {
                if (tf.dirty) {
                  scope.nTransferFunctionDirty++;
                }
              });
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
                var tf = _.find(scope.transferFunctions, {
                  name: remoteTf.name
                });
                var found = angular.isDefined(tf);
                if (found && !tf.dirty) {
                  tf.code = transferFunction.code;
                  tf.oldName = transferFunction.name;
                  tf.devices = transferFunction.devices;
                  tf.variables = transferFunction.variables;
                  tf.topics = transferFunction.topics;
                } else if (!found) {
                  scope.transferFunctions.push(transferFunction);
                }
              });
              if (scope.transferFunction) {
                scope.selectTransferFunction(scope.transferFunction.name);
              } else if (scope.transferFunctions.length) {
                scope.selectTransferFunction(scope.transferFunctions[0].name);
              }

              scope.populateTransferFunctionsWithRawCode().then(function() {
                scope.refresh();
              });
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
                dev.name = getFreeName(
                  scope.transferFunction.devices,
                  'device'
                );
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

            scope.buildTransferFunctionFile = function(transferFunctions) {
              return _.map(transferFunctions, 'rawCode').join('\n');
            };

            scope.doDownload = function() {
              var file = new Blob(
                [scope.buildTransferFunctionFile(scope.transferFunctions)],
                { type: 'plain/text', endings: 'native' }
              );
              var href = URL.createObjectURL(file);
              downloadFileService.downloadFile(href, 'transferFunctions.py');
            };

            scope.download = function() {
              if (scope.centerPanelTabSelection === 'rawscript') {
                // In raw script I don't have to force an apply to save data
                scope.doDownload();
              } else {
                scope.applyAllDirtyScripts(() => {
                  scope.updateNTransferFunctionDirty();
                  if (scope.nTransferFunctionDirty === 0) {
                    scope
                      .populateTransferFunctionsWithRawCode()
                      .then(function() {
                        scope.doDownload();
                      });
                  }
                });
              }
            };

            var insertIfTransferFunction = function(list, tfCode) {
              // check whether code contains a tf definition
              var isTFRegex = /^(@nrp[^\n]+\s+)+(#[^\n]*\n|\/\*(.|\n)*\*\/|\s)*def \w+/m;
              if (isTFRegex.exec(tfCode) !== null) {
                list.push(new ScriptObject('', tfCode));
              }
            };

            var splitCodeFile = function(content) {
              // matches a python unindent
              var regexCode = /^\s{2}[^\n]*\n+(?:\S)/gm;

              // slice the codefile into separate functions
              var match = regexCode.exec(content);
              var previousMatchIdx = 0;
              var loadedTransferFunctions = [];
              while (match !== null) {
                // regular expressions in JavaScript are completely messed up
                insertIfTransferFunction(
                  loadedTransferFunctions,
                  content
                    .slice(previousMatchIdx, regexCode.lastIndex - 1)
                    .trim()
                );
                previousMatchIdx = regexCode.lastIndex - 1;
                match = regexCode.exec(content);
              }
              // get the last code match
              insertIfTransferFunction(
                loadedTransferFunctions,
                content.slice(previousMatchIdx).trim()
              );

              return loadedTransferFunctions;
            };

            scope.deleteTFunctions = function(transferFunctions) {
              if (transferFunctions === undefined) return;

              //make sure transferFunctions is an array
              transferFunctions = [].concat(transferFunctions);
              transferFunctions.map(function(transferFunction) {
                var index = scope.transferFunctions.indexOf(transferFunction);
                if (transferFunction.local) {
                  return scope.transferFunctions.splice(index, 1);
                } else {
                  backendInterfaceService.deleteTransferFunction(
                    transferFunction.name,
                    function() {}
                  );
                  scope.transferFunctions.splice(index, 1);
                  scope.collabDirty = environmentService.isPrivateExperiment();
                }
              });
            };

            function applyUploadedTransferFunctions(tfs) {
              // Make sure uploaded file doesn't contain duplicate definition names
              var tfNames = tfs.map(function(tf) {
                var tfName = pythonCodeHelper.getFunctionName(tf.code);
                return tfName;
              });
              if (new Set(tfNames).size !== tfNames.length) {
                serverError.displayError({
                  title: 'Duplicate definition names',
                  template: `Uploaded Transfer Function file contains duplicate definition names. Fix file locally and upload again`,
                  label: 'OK'
                });
                return;
              }

              scope.deleteTFunctions(scope.transferFunctions);
              scope.transferFunctions = [];
              scope.selectedTF = '';
              scope.transferFunction = null;
              scope.nTransferFunctionDirty = 0;

              _.forEach(tfs, function(transferFunction) {
                var tf = new ScriptObject(
                  scope.selectedTF,
                  transferFunction.code
                );
                tf.type = undefined;
                tf.name = pythonCodeHelper.getFunctionName(tf.code);
                tf.oldName = tf.name;
                tf.devices = [];
                tf.topics = [];
                tf.variables = [];
                tf.local = true;
                tf.dirty = true;
                tf.rawCode = transferFunction.code;
                tf.active = true;
                scope.nTransferFunctionDirty++;
                scope.transferFunctions.push(tf);
              });

              if (scope.transferFunctions.length > 0) {
                scope.selectTransferFunction(scope.transferFunctions[0].name);
              }
            }

            scope.upload = function(file) {
              if (file && !file.$error) {
                scope.centerPanelTabSelection = 'rawscript';
                var textReader = new FileReader();
                textReader.onload = function(e) {
                  applyUploadedTransferFunctions(
                    splitCodeFile(e.target.result)
                  );
                };
                textReader.readAsText(file);
              }
            };

            scope.saveTFIntoCollabStorage = function() {
              if (scope.centerPanelTabSelection === 'rawscript') {
                // In raw script I don't have to force an apply to save data
                scope.doSaveTFIntoCollabStorage();
              } else {
                scope.applyAllDirtyScripts(() => {
                  scope.updateNTransferFunctionDirty();
                  if (scope.nTransferFunctionDirty === 0) {
                    scope
                      .populateTransferFunctionsWithRawCode()
                      .then(function() {
                        scope.doSaveTFIntoCollabStorage();
                      });
                  }
                });
              }
            };

            scope.doSaveTFIntoCollabStorage = function() {
              scope.isSavingToCollab = true;
              var errors = false;
              scope.transferFunctions.forEach(function(tf) {
                if (Object.keys(tf.error).length !== 0) {
                  errors = true;
                }
              });
              if (errors) {
                clbConfirm
                  .open({
                    title: 'Transfer Function errors.',
                    template:
                      'There are errors inside your Transfer Functions. Are you sure you want to save?',
                    confirmLabel: 'Yes',
                    cancelLabel: 'No',
                    closable: false
                  })
                  .then(function() {
                    return saveErrorsService
                      .saveDirtyData(DIRTY_TYPE, scope.transferFunctions)
                      .then(function() {
                        return autoSaveService.clearDirty(DIRTY_TYPE);
                      });
                  })
                  .finally(function() {
                    scope.isSavingToCollab = false;
                  });
                return;
              }
              backendInterfaceService.saveTransferFunctions(
                _.map(scope.transferFunctions, 'rawCode'),
                function() {
                  // Success callback
                  scope.isSavingToCollab = false;
                  scope.collabDirty = false;
                  autoSaveService.clearDirty(DIRTY_TYPE);
                  saveErrorsService.clearDirty(DIRTY_TYPE);
                },
                function() {
                  // Failure callback
                  clbErrorDialog.open({
                    type: 'BackendError.',
                    message:
                      'Error while saving transfer functions to the Storage.'
                  });
                  scope.isSavingToCollab = false;
                }
              );
            };

            scope.saveCSVIntoCollabStorage = function() {
              scope.isSavingCSVToCollab = true;
              backendInterfaceService.saveCSVRecordersFiles(
                function() {
                  // Success callback
                  scope.isSavingCSVToCollab = false;
                },
                function() {
                  // Failure callback
                  clbErrorDialog.open({
                    type: 'BackendError.',
                    message:
                      'Error while saving recorded CSV files to the Storage.'
                  });
                  scope.isSavingCSVToCollab = false;
                }
              );
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
