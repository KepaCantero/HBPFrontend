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
      'DEFAULT_RAW_TF_CODE',
      `@nrp.Robot2Neuron()
def {0}(t):
    #log the first timestep (20ms), each couple of seconds
    if t % 2 < 0.02:
        clientLogger.info('Time: ', t)`
    )
    .constant('TF_CONFIG', {
      selectTF: null
    })
    .factory('structuredTransferFunctionToRaw', [
      '$resource',
      'serverError',
      function($resource, serverError) {
        return function(baseUrl) {
          return $resource(
            baseUrl + '/convert-structured-tf-to-raw',
            {},
            {
              put: {
                method: 'PUT',
                interceptor: { responseError: serverError.displayHTTPError }
              }
            }
          );
        };
      }
    ])
    .factory('rawTransferFunctionToStructured', [
      '$resource',
      'serverError',
      function($resource, serverError) {
        return function(baseUrl) {
          return $resource(
            baseUrl + '/convert-raw-tf-to-structured',
            {},
            {
              put: {
                method: 'PUT',
                interceptor: { responseError: serverError.displayHTTPError }
              }
            }
          );
        };
      }
    ])
    .directive('transferFunctionEditor', [
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
      'clbErrorDialog',
      'RESET_TYPE',
      'autoSaveFactory',
      'saveErrorsService',
      'clbConfirm',
      'downloadFileService',
      'DEFAULT_RAW_TF_CODE',
      '$q',
      'structuredTransferFunctionToRaw',
      'rawTransferFunctionToStructured',
      'storageServer',
      'baseEventHandler',
      'bbpConfig',
      'TF_CONFIG',
      function(
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
        clbErrorDialog,
        RESET_TYPE,
        autoSaveFactory,
        saveErrorsService,
        clbConfirm,
        downloadFileService,
        DEFAULT_RAW_TF_CODE,
        $q,
        structuredTransferFunctionToRaw,
        rawTransferFunctionToStructured,
        storageServer,
        baseEventHandler,
        bbpConfig,
        TF_CONFIG
      ) {
        return {
          templateUrl:
            'components/editors/transfer-function-editor/transfer-function-editor.template.html',
          restrict: 'E',
          scope: {},
          link: function(scope, element) {
            /**************************************/
            // Initialize

            var ScriptObject = pythonCodeHelper.ScriptObject;

            const DIRTY_TYPE = 'TF';

            scope.populations = [];
            scope.topics = [];
            scope.transferFunctions = [];
            scope.devMode = environmentService.isDevMode();
            scope.isPrivateExperiment = environmentService.isPrivateExperiment();

            scope.transferFunction = null;
            scope.selectedTF = null;

            scope.dirtyTFNames = new Set();

            scope.selectedTopic = null;
            scope.selectedPopulation = null;
            scope.isNeuronsSelected = false;
            scope.addMode = null;
            scope.newVariableName = '';
            scope.nTransferFunctionDirty = 0;
            scope.lastTFupdated = null;
            scope.localHelpVisible = {
              populations: false,
              connectToBrain: false,
              connectToRobot: false,
              globalVariables: false
            };

            scope.stateService = stateService;
            scope.baseEventHandler = baseEventHandler;
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

            const cleError = bbpConfig.get('ros-topics').cleError;

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

            scope.unbindListenerUpdatePanelUI = scope.$on(
              'UPDATE_PANEL_UI',
              function() {
                // prevent calling the select functions of the tabs
                scope.refresh();
              }
            );

            scope.applyEditorOptions = function() {
              var editor = codeEditorsServices.getEditorChild(
                'codeEditor',
                element[0]
              );

              for (let opt in scope.editorOptions) {
                editor.setOption(opt, scope.editorOptions[opt]);
              }

              editor.on('update', scope.contentChanged);
            };

            let autoSaveService = autoSaveFactory.createService(
              'Tranfer functions'
            );
            autoSaveService.onsave(() => scope.saveTFIntoCollabStorage());

            /**************************************/
            // Cleanup

            scope.$on('$destroy', () => {
              scope.resetListenerUnbindHandler();
              scope.unbindWatcherResize && scope.unbindWatcherResize();
              scope.unbindListenerUpdatePanelUI();
              autoSaveService.dispose();
            });

            /**************************************/
            // Error from backend

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
                  if (msg.lineNumber >= 0) {
                    // There is a line information for the error
                    // Error line highlighting
                    var codeMirrorLineNumber = msg.lineNumber - 1; // 0-based line numbering
                    flawedTransferFunction.error[
                      msg.errorType
                    ].lineHandle = codeMirrorLineNumber;

                    const rawEditor = codeEditorsServices.getEditor(
                      'codeEditor'
                    );
                    rawEditor.addLineClass(
                      codeMirrorLineNumber,
                      'background',
                      'alert-danger'
                    );
                  }
                  if (flawedTransferFunction.active) {
                    flawedTransferFunction.active = false;
                    backendInterfaceService.setActivateTransferFunction(
                      flawedTransferFunction.name,
                      null,
                      flawedTransferFunction.active,
                      function() {},
                      function(data) {
                        flawedTransferFunction.active = !flawedTransferFunction.active;
                        serverError.displayHTTPError(data);
                      }
                    );
                  }
                }
              }
            };
            var rosConnection = roslib.getOrCreateConnectionTo(
              simulationInfo.serverConfig.rosbridge.websocket
            );
            scope.errorTopicSubscriber = roslib.createTopic(
              rosConnection,
              cleError,
              'cle_ros_msgs/CLEError'
            );
            scope.errorTopicSubscriber.subscribe(
              scope.onNewErrorMessageReceived,
              true
            );

            function cleanEditorErrors() {
              let editor = codeEditorsServices.getEditor('codeEditor');
              if (editor) {
                for (let i = 0; i < editor.lineCount(); i++)
                  editor.removeLineClass(i, 'background', 'alert-danger');
              }
            }

            scope.cleanCompileError = function(transferFunction) {
              cleanEditorErrors();
              if (transferFunction && transferFunction.error) {
                if (transferFunction.error[scope.ERROR.COMPILE])
                  delete transferFunction.error[scope.ERROR.COMPILE];

                if (transferFunction.error[scope.ERROR.NO_OR_MULTIPLE_NAMES])
                  delete transferFunction.error[
                    scope.ERROR.NO_OR_MULTIPLE_NAMES
                  ];
              }
            };

            /**************************************/
            // Converting TF from UI helper to script decorator

            scope.rawToStructured = function(tf, callback) {
              var url =
                simulationInfo.serverBaseUrl +
                '/simulation/' +
                simulationInfo.simulationID;
              rawTransferFunctionToStructured(url).put(
                {},
                { name: tf.name, source: tf.rawCode },
                data => {
                  var tf;
                  if (!data.error && data.structuredScript) {
                    var tfs = data.structuredScript;
                    tf = _.find(scope.transferFunctions, { name: tfs.name });

                    var found = angular.isDefined(tf);
                    if (found) {
                      scope.cleanCompileError(tf);
                      if (tf.error && tf.error[scope.ERROR.LOADING])
                        delete tf.error[scope.ERROR.LOADING];

                      tf.code = tfs.code;
                      tf.oldName = tfs.name;
                      tf.devices = tfs.devices;
                      tf.variables = tfs.variables;
                      tf.topics = tfs.topics;
                    }
                  }

                  if (callback) callback(tf, data.error);
                },
                () => {
                  if (callback) callback(tf, true);
                }
              );
            };

            scope.structuredToRaw = function(tf, callback) {
              var url =
                simulationInfo.serverBaseUrl +
                '/simulation/' +
                simulationInfo.simulationID;
              structuredTransferFunctionToRaw(url).put(
                {},
                tf,
                data => {
                  if (callback) callback(data.rawScript);
                },
                () => {
                  if (callback) callback(null);
                }
              );
            };

            scope.updateScriptFromStructured = function() {
              var tf = scope.transferFunction;

              scope.structuredToRaw(tf, script => {
                if (!script) return;

                // We use a regexp to extract the line which contains the function defintion of the TF,
                // so we can track argument or name changes in the definition
                var findFunctionDefLineRegExp = new RegExp(
                  '^def*.' + tf.name + '.*',
                  'gm'
                );

                if (!tf.rawCode) {
                  tf.rawCode = script;
                  tf.decorators = extractTFDecoratorFromTF(script);
                  tf.functionDef = (script.match(findFunctionDefLineRegExp) || [
                    ''
                  ])[0];
                  return;
                }

                let currentScript = tf.rawCode;

                // Update the function definition first

                var newDef = script.match(findFunctionDefLineRegExp);
                var oldDef = currentScript.match(findFunctionDefLineRegExp);

                if (newDef && oldDef) {
                  currentScript = currentScript.replace(oldDef, newDef);
                }

                // Take care of decorators now

                let oldDecorators = extractTFDecoratorFromTF(currentScript);
                let newDecorators = extractTFDecoratorFromTF(script);

                currentScript = currentScript.replace(
                  oldDecorators.pop(),
                  newDecorators.pop()
                );

                var tempOldDecorators = oldDecorators.filter(function(val) {
                  return newDecorators.indexOf(val) == -1;
                });

                newDecorators = newDecorators.filter(function(val) {
                  return oldDecorators.indexOf(val) == -1;
                });

                oldDecorators = tempOldDecorators;

                if (oldDecorators.length === newDecorators.length) {
                  // Exactly the same size, simply replace the new one by the old ones

                  for (let i = 0; i < oldDecorators.length; i++) {
                    currentScript = currentScript.replace(
                      oldDecorators[i],
                      newDecorators[i]
                    );
                  }
                } else {
                  for (let i = 0; i < oldDecorators.length; i++) {
                    let idx = currentScript.indexOf(oldDecorators[i]);
                    if (idx >= 0)
                      currentScript = [
                        currentScript.slice(0, idx),
                        currentScript.slice(idx + oldDecorators[i].length + 1)
                      ].join('');
                  }

                  let idx = currentScript.search(/^@/gm);
                  if (idx >= 0) {
                    for (let i = 0; i < newDecorators.length; i++) {
                      currentScript = [
                        currentScript.slice(0, idx),
                        newDecorators[i] + '\n',
                        currentScript.slice(idx)
                      ].join('');
                    }
                  }
                }

                tf.rawCode = currentScript;

                tf.decorators = extractTFDecoratorFromTF(currentScript);
                tf.functionDef = (scope.transferFunction.rawCode.match(
                  new RegExp(
                    '^def*.' + scope.transferFunction.name + '.*',
                    'gm'
                  )
                ) || [''])[0];
              });
            };

            /**************************************/
            // Help bubble

            scope.showLocalHelp = function(show, category) {
              scope.localHelpVisible[category] = show;
            };

            /**************************************/
            // Structured decorator UI

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

            scope.getFriendlyTopicName = function(topic) {
              if (topic.publishing) {
                return 'publishes on ' + topic.topic;
              } else {
                return 'subscribes to ' + topic.topic;
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

            /**************************************/
            // TF editing

            scope.setDirty = function(transferFunction) {
              transferFunction.dirty = true;
              scope.dirtyTFNames.add(getTfCodeName(transferFunction.rawCode));
              autoSaveService.setDirty();
              scope.updateNTransferFunctionDirty();
            };

            /**************************************/
            // Managing reset

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
                scope.selectedTopic = null;
                scope.selectedPopulation = null;
                scope.isNeuronsSelected = false;
                scope.nTransferFunctionDirty = 0;
              }
            });

            /**************************************/
            // Refreshing TF

            scope.loadTopics = function(response) {
              scope.topics = [];
              scope.topics = response.topics;
            };

            let structureTfCode = (tfName, tfCode) => {
              return rawTransferFunctionToStructured(
                simulationInfo.serverBaseUrl +
                  '/simulation/' +
                  simulationInfo.simulationID
              )
                .put({}, { name: tfName, source: tfCode })
                .$promise.then(res => {
                  if (res.error) return {};
                  return res.structuredScript;
                });
            };

            let createTf = (name, code, active) => {
              let newTFId = scope.transferFunctions.length;

              let tf = new ScriptObject(newTFId);
              tf.name = tf.oldName = name;
              tf.rawCode = code;
              tf.active = active !== false;
              tf.local = false;
              tf.devices = [];
              tf.variables = [];
              tf.topics = [];
              tf.dirty = scope.dirtyTFNames.has(name);
              tf.decorators = extractTFDecoratorFromTF(code);
              tf.functionDef = (code.match(
                new RegExp('^def*.' + tf.name + '.*', 'gm')
              ) || [''])[0];

              return tf;
            };

            let decorateTf = (tf, structured) => {
              if (!structured) return;
              tf.type = structured.type;
              tf.code = structured.code;
              tf.devices = structured.devices || [];
              tf.variables = structured.variables || [];
              tf.topics = structured.topics || [];
              _.forEach(tf.variables, scope.parseFilenameAndHeaders);
            };

            let getTfCodeName = tfCode => {
              let tfName = /def +([^\\( ]*)/gm.exec(tfCode);
              if (tfName) tfName = tfName[1];
              return tfName;
            };

            let addNewTf = (tfName, tfCode, active) => {
              let tf = createTf(tfName, tfCode, active && active[tfName]);
              scope.transferFunctions.push(tf);
              return $q
                .all([tf, structureTfCode(tfName, tfCode)])
                .then(args => decorateTf(...args));
            };

            let reloadTfs = () => {
              scope.transferFunctions = [];

              return $q
                .all([
                  backendInterfaceService.getTransferFunctions(),
                  storageServer.getTransferFunctions(
                    simulationInfo.experimentID
                  )
                ])
                .then(([simulationTfs, experimentTfs]) => {
                  let structuredTfs = $q.all(
                    _.map(experimentTfs.data, tfCode => {
                      let tfName = getTfCodeName(tfCode);

                      return addNewTf(tfName, tfCode, simulationTfs.active);
                    })
                  );
                  if (scope.transferFunction) {
                    scope.selectTransferFunction(scope.transferFunction.name);
                  } else if (scope.transferFunctions.length) {
                    scope.selectTransferFunction(
                      scope.transferFunctions[0].name
                    );
                  }
                  return structuredTfs;
                })
                .then(() => {
                  refreshEditor();
                })
                .catch(err => console.error('Failed to load TFS:\n' + err));
            };

            let reloadPopulations = () => {
              let tf2select = TF_CONFIG.selectTF;

              backendInterfaceService
                .getPopulations(scope.loadPopulations)
                .then(() => {
                  tf2select && scope.selectTransferFunction(tf2select);
                });
            };

            let reloadTopics = () => {
              backendInterfaceService.getTopics(scope.loadTopics);
            };

            let refreshEditor = () => {
              var editor = codeEditorsServices.getEditorChild(
                'codeEditor',
                element[0]
              );
              codeEditorsServices.refreshEditor(editor);

              scope.updateNTransferFunctionDirty();
            };

            scope.refresh = function() {
              if (autoSaveService.isDirty()) {
                refreshEditor();
              } else {
                reloadTfs();
                reloadPopulations();
                reloadTopics();
                refreshEditor();
              }
            };
            // refresh editor on startup
            $timeout(() => {
              scope.refresh();
            }, 100);

            // refresh the editor if the transfer functions list
            // has been changed by another component, e.g., the object inspector
            scope.$on('TRANSFER_FUNCTIONS_CHANGED', () => {
              scope.refresh();
            });

            // refresh the editor if the populations list
            // has been changed by another component, e.g., the brain file editor
            scope.$on('pynn.populationsChanged', () => {
              scope.refresh();
            });

            /**************************************/
            // Loading TF content

            function extractTFDecoratorFromTF(code) {
              var decorators = code.match(/^@.*/gm);
              return decorators || [];
            }

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

            scope.parseFilenameAndHeaders = function(v) {
              if (v.type === 'csv') {
                if (v.initial_value) {
                  try {
                    var parsed = JSON.parse(v.initial_value);
                    v.filename = parsed.filename;
                    v.headers = parsed.headers;
                  } catch (err) {
                    v.filename = undefined;
                    v.headers = undefined;
                  }
                }
                if (v.headers === undefined) v.headers = [];
              } else {
                v.filename = undefined;
                v.headers = undefined;
              }
            };

            /**************************************/
            // Handling script changes

            scope.preprocessDecoratorsForErrors = function(
              name,
              code,
              decorators
            ) {
              // Check that we have at least the minimal standard decorators

              if (decorators.length === 0) return false;

              if (
                (code.match(/^@nrp.Neuron2Robot/gm) || []).length !== 1 &&
                (code.match(/^@nrp.Robot2Neuron/gm) || []).length !== 1 &&
                (code.match(/^@nrp.NeuronMonitor/gm) || []).length !== 1
              )
                return false;

              if (!code.match(new RegExp('^def*.' + name + '.*', 'gm')))
                return false;

              return true;
            };

            scope.checkNameChangedFromScript = function() {
              var nameFromScript = pythonCodeHelper.getFunctionName(
                scope.transferFunction.rawCode
              );
              if (scope.transferFunction.name === nameFromScript) return false;

              if (scope.lastNameChangeUpdate) {
                $timeout.cancel(scope.lastNameChangeUpdate);
              }

              scope.lastNameChangeUpdate = $timeout(() => {
                var name = pythonCodeHelper.getFunctionName(
                  scope.transferFunction.rawCode
                );

                if (name && name !== 'undefined') {
                  scope.transferFunction.editName = true;
                  scope.transferFunction.name = name;
                  scope.setNameTf();
                }
              }, 1000);

              return true;
            };

            scope.contentChanged = function() {
              if (
                !scope.renamingTF &&
                scope.transferFunction &&
                scope.transferFunction.rawCode
              ) {
                var decorators = extractTFDecoratorFromTF(
                  scope.transferFunction.rawCode
                );

                var functionDef = (scope.transferFunction.rawCode.match(
                  new RegExp(
                    '^def*.' + scope.transferFunction.name + '.*',
                    'gm'
                  )
                ) || [''])[0];

                if (functionDef === '') {
                  functionDef = (scope.transferFunction.rawCode.match(
                    new RegExp(
                      '^def*.' +
                        pythonCodeHelper.getFunctionName(
                          scope.transferFunction.rawCode
                        ) +
                        '.*',
                      'gm'
                    )
                  ) || [''])[0];
                }

                if (
                  !scope.transferFunction.decorators ||
                  functionDef !== scope.transferFunction.functionDef ||
                  JSON.stringify(decorators) !==
                    JSON.stringify(scope.transferFunction.decorators)
                ) {
                  if (!scope.checkNameChangedFromScript()) {
                    if (
                      scope.preprocessDecoratorsForErrors(
                        scope.transferFunction.name,
                        scope.transferFunction.rawCode,
                        decorators
                      )
                    ) {
                      if (scope.lastDecoratorUpdate) {
                        $timeout.cancel(scope.lastDecoratorUpdate);
                      }

                      scope.lastDecoratorUpdate = $timeout(() => {
                        scope.lastDecoratorUpdate = undefined;
                        scope.addMode = null;

                        scope.rawToStructured(
                          scope.transferFunction,
                          (tf, error) => {
                            if (!tf) tf = scope.transferFunction;
                            tf.decoratorDirty = !!error;
                          }
                        );
                      }, 1000);
                    } else {
                      scope.transferFunction.decoratorDirty = true;
                      scope.addMode = null;
                    }
                    scope.transferFunction.decorators = decorators;
                    scope.transferFunction.functionDef = functionDef;
                  }
                }
              }
            };

            /**************************************/
            // Handling UI decorator editor changes

            var getFreeName = function(set, prefix) {
              var check = function(item) {
                if (item.name === prefix + counter) {
                  found = true;
                }
              };
              var counter = '';
              var found = true;

              for (;;) {
                found = false;
                _.forEach(set, check);

                if (!found) break;
                counter = counter === '' ? 2 : counter + 1;
              }
              return prefix + counter;
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
              scope.updateScriptFromStructured();
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
              scope.updateScriptFromStructured();
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
              scope.updateScriptFromStructured();
            };

            scope.decoratorsChangedFromUI = function(tf) {
              scope.updateScriptFromStructured();
              scope.setDirty(tf);
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

            /**************************************/
            // Applying changes

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
              let _doneCallback = doneCallback || angular.noop;
              if (transferFunction) {
                // Make sure we don't have duplicated names
                let tfNames = scope.transferFunctions.map(function(tf) {
                  let tfName = pythonCodeHelper.getFunctionName(tf.rawCode);
                  return tfName;
                });

                if (new Set(tfNames).size !== tfNames.length) {
                  const err = {
                    type: 'Duplicate definition names',
                    message: `There is already a transfer function with the same name. Please use another name.`
                  };
                  clbErrorDialog.open(err);

                  _doneCallback(null, err);
                  return;
                }

                scope.cleanCompileError(transferFunction);
                delete transferFunction.error[scope.ERROR.RUNTIME];
                delete transferFunction.error[scope.ERROR.LOADING];

                transferFunction.decorators = extractTFDecoratorFromTF(
                  transferFunction.rawCode
                );
                transferFunction.functionDef = (transferFunction.rawCode.match(
                  new RegExp('^def*.' + transferFunction.name + '.*', 'gm')
                ) || [''])[0];

                if (transferFunction.functionDef === '') {
                  transferFunction.functionDef = (transferFunction.rawCode.match(
                    new RegExp(
                      '^def*.' +
                        pythonCodeHelper.getFunctionName(
                          scope.transferFunction.rawCode
                        ) +
                        '.*',
                      'gm'
                    )
                  ) || [''])[0];
                }

                //ADD new TFs and EDIT the already existing ones
                let successCallback = function() {
                  transferFunction.dirty = false;
                  scope.dirtyTFNames.delete(transferFunction.name);
                  transferFunction.local = false;

                  scope.updateNTransferFunctionDirty();
                  transferFunction.oldName = transferFunction.name = pythonCodeHelper.getFunctionName(
                    transferFunction.rawCode
                  );

                  if (
                    scope.transferFunction &&
                    scope.transferFunction.name === transferFunction.name
                  ) {
                    scope.selectTransferFunction(transferFunction.name);
                  }

                  _doneCallback();
                  $timeout(() => {
                    if ($.isEmptyObject(transferFunction.error)) {
                      transferFunction.decoratorDirty = false;
                    }
                  }, 1.0);
                };

                let failCallback = function(error) {
                  serverError.displayHTTPError(error);
                  _doneCallback(null, error);
                };

                if (transferFunction.local) {
                  // new TF
                  backendInterfaceService
                    .addTransferFunction(transferFunction.rawCode)
                    .then(successCallback)
                    .catch(failCallback);
                } else {
                  backendInterfaceService
                    .editTransferFunction(
                      transferFunction.name,
                      transferFunction.rawCode
                    )
                    .then(successCallback)
                    .catch(failCallback);
                }
              }
            };

            scope.apply = function(doneCallback) {
              scope.applyScript(scope.transferFunction, doneCallback);
            };

            /**************************************/
            // Transfer function list management

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
              if (
                scope.transferFunction &&
                scope.transferFunction.oldName &&
                scope.transferFunction.oldName !== scope.selectedTF
              ) {
                scope.transferFunction.name = scope.transferFunction.oldName;
              } else {
                scope.selectedTF = getFreeName(
                  scope.transferFunctions,
                  'transferFunction'
                );
              }

              var rawcode = DEFAULT_RAW_TF_CODE.replace(
                '{0}',
                scope.selectedTF
              );
              var tf = new ScriptObject(scope.selectedTF, rawcode);
              tf.type = 1;
              tf.name = scope.selectedTF;
              tf.oldName = tf.name;
              tf.devices = [];
              tf.topics = [];
              tf.variables = [];
              tf.local = true;
              tf.dirty = true;
              scope.dirtyTFNames.add(tf.name);
              tf.rawCode = rawcode;
              tf.active = true;
              tf.editName = true;

              scope.setDirty(tf);
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
              scope.setDirty(tf);
              tf.devices[0].name = 'device';

              scope.updateScriptFromStructured();
              scope.addMode = null;
            };

            scope.setNameTf = function() {
              scope.renamingTF = true;
              var active = scope.transferFunction.active;
              scope.transferFunction.rawCode = pythonCodeHelper.setFunctionName(
                scope.transferFunction.rawCode,
                scope.transferFunction.name
              );

              scope.transferFunction.decorators = extractTFDecoratorFromTF(
                scope.transferFunction.rawCode
              );
              scope.transferFunction.functionDef = (scope.transferFunction.rawCode.match(
                new RegExp('^def*.' + scope.transferFunction.name + '.*', 'gm')
              ) || [''])[0];

              scope.transferFunction.editName = !scope.transferFunction
                .editName;
              scope.transferFunction.name = scope.transferFunction.oldName;
              scope.applyScript(scope.transferFunction, () => {
                scope.transferFunction.active = !active;
                scope.toggleActive(scope.transferFunction);
                scope.renamingTF = false;
              });

              autoSaveService.setDirty();
            };

            /**
             * Toggles the TF active status
             * If TF status is set to 'active', first it tries to apply it in the backend
             *  - If the TF apply succeeds, then it makes sure the 'active' status
             *    is synchronized to the backend
             *  - If the TF apply fails, then the active status is set back to 'inactive'
             * Otherwise, if the TF status is set to disabled, it simply syncs it to the backend
             * */
            scope.toggleActive = function(tf) {
              const activeOriginalState = tf.active;
              tf.active = !tf.active;

              const setBackendTFStatus = tf => {
                //syncs the tf active status to the backend
                backendInterfaceService.setActivateTransferFunction(
                  tf.name,
                  null,
                  tf.active,
                  angular.noop,
                  () => (tf.active = activeOriginalState)
                );
              };

              if (!tf.active) {
                //TF disabled: sync backend active status
                setBackendTFStatus(tf);
              } else {
                //TF enabled: make sure TF is valid before synching the active status to the backend
                scope.applyScript(tf, (res, err) => {
                  if (err) tf.active = false;
                  else setBackendTFStatus(tf);
                });
              }
            };

            scope.updateNTransferFunctionDirty = function() {
              scope.nTransferFunctionDirty = 0;
              _.forEach(scope.transferFunctions, function(tf) {
                if (tf.dirty) {
                  scope.nTransferFunctionDirty++;
                }
              });
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
                    angular.noop
                  );
                  scope.transferFunctions.splice(index, 1);
                }
              });
              autoSaveService.setDirty();
            };

            var deleteInternal = function(scope, index) {
              scope.transferFunctions.splice(index, 1);
              autoSaveService.setDirty();
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
                    angular.noop
                  );
                  deleteInternal(scope, index);
                }

                autoSaveService.setDirty();
              }
            };

            /**************************************/
            // CSV

            scope.updateCSV = function(v) {
              //eslint-disable-next-line camelcase
              v.initial_value = JSON.stringify({
                headers: v.headers,
                filename: v.filename
              });
              scope.setDirty(scope.transferFunction);
            };

            /**************************************/
            // Import / Export

            scope.buildTransferFunctionFile = function(transferFunctions) {
              return _.map(transferFunctions, 'rawCode').join('\n');
            };

            scope.downloadTFFile = function(selectedOnly) {
              var file = new Blob(
                [
                  selectedOnly
                    ? scope.transferFunction.rawCode
                    : scope.buildTransferFunctionFile(scope.transferFunctions)
                ],
                { type: 'plain/text', endings: 'native' }
              );

              var href = URL.createObjectURL(file);
              downloadFileService.downloadFile(
                href,
                selectedOnly
                  ? scope.transferFunction.name + '.py'
                  : 'transferFunctions.py'
              );
            };

            scope.download = function() {
              clbConfirm
                .open({
                  title: 'Downloading Transfer Functions',
                  confirmLabel: 'All',
                  cancelLabel: 'Selected Only',
                  template:
                    'Download all transfer functions or only the selected one ?',
                  closable: false
                })
                .then(
                  () => {
                    scope.downloadTFFile(false);
                  },
                  () => {
                    scope.downloadTFFile(true);
                  }
                );
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
              var regexCode = /^( {2}|\t)[^\n]*\n+(?:\S)/gm;
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

            function findUniqueNameFromTFCode(code) {
              var newName = getTfCodeName(code);
              var baseName = newName;

              var count = 2;

              do {
                var nameFound = false;
                _.forEach(scope.transferFunctions, function(transferFunction) {
                  if (transferFunction.name === newName) nameFound = true;
                });

                if (nameFound) {
                  newName = baseName + '_' + count;
                  count++;
                }
              } while (nameFound);

              return newName;
            }

            function addUploadedTransferFunctions(tfs, replace) {
              if (replace) {
                scope.deleteTFunctions(scope.transferFunctions);
                scope.transferFunctions = [];
                scope.selectedTF = '';
                scope.transferFunction = null;
                scope.nTransferFunctionDirty = 0;
              }

              _.forEach(tfs, function(transferFunction) {
                let tfName = getTfCodeName(transferFunction.code);
                let tfNewName = findUniqueNameFromTFCode(transferFunction.code);
                scope.dirtyTFNames.add(tfNewName);
                transferFunction.code =
                  tfName === tfNewName
                    ? transferFunction.code
                    : transferFunction.code.replace(
                        new RegExp('def +' + tfName, 'gm'),
                        'def ' + tfNewName
                      );
                addNewTf(tfNewName, transferFunction.code);
                scope.nTransferFunctionDirty++;
              });

              if (
                (replace || !scope.transferFunction) &&
                scope.transferFunctions.length > 0
              ) {
                scope.selectTransferFunction(scope.transferFunctions[0].name);
              }

              autoSaveService.setDirty();
            }

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

              if (scope.transferFunctions.length === 0)
                addUploadedTransferFunctions(tfs, false);
              else
                clbConfirm
                  .open({
                    title: 'Uploading Transfer Functions',
                    confirmLabel: 'Add',
                    cancelLabel: 'Replace',
                    template:
                      'Add to the current transfer functions or replace then with the new ones ?',
                    closable: false
                  })
                  .then(
                    () => {
                      addUploadedTransferFunctions(tfs, false);
                    },
                    () => {
                      addUploadedTransferFunctions(tfs, true);
                    }
                  );
            }

            scope.upload = function(file) {
              if (file && !file.$error) {
                var textReader = new FileReader();
                textReader.onload = function(e) {
                  applyUploadedTransferFunctions(
                    splitCodeFile(e.target.result)
                  );
                };
                textReader.readAsText(file);
              }
            };

            /**************************************/
            // Saving

            scope.saveTFIntoCollabStorage = function() {
              return storageServer
                .saveTransferFunctions(
                  simulationInfo.experimentID,
                  _.map(scope.transferFunctions, 'rawCode')
                )
                .then(() => saveErrorsService.clearDirty(DIRTY_TYPE))
                .catch(() =>
                  clbErrorDialog.open({
                    type: 'BackendError.',
                    message:
                      'Error while saving transfer functions to the Storage.'
                  })
                );
            };
          }
        };
      }
    ]);
})();
