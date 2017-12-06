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
      'FRONTEND_ERROR',
      'SOURCE_TYPE',
      'simulationInfo',
      'clbConfirm',
      'clbErrorDialog',
      'autoSaveService',
      'DEFAULT_TF_CODE',
      'downloadFileService',
      'RESET_TYPE',
      'codeEditorsServices',
      '$q',
      'saveErrorsService',
      'environmentService',
      'userContextService',
      'bbpConfig',
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
        FRONTEND_ERROR,
        SOURCE_TYPE,
        simulationInfo,
        clbConfirm,
        clbErrorDialog,
        autoSaveService,
        DEFAULT_TF_CODE,
        downloadFileService,
        RESET_TYPE,
        codeEditorsServices,
        $q,
        saveErrorsService,
        environmentService,
        userContextService,
        bbpConfig
      ) {
        var DIRTY_TYPE = 'TF';

        return {
          templateUrl:
            'components/editors/transfer-function-editor/transfer-function-editor.template.html',
          restrict: 'E',
          scope: {
            control: '='
          },
          link: function(scope, element) {
            scope.isPrivateExperiment = environmentService.isPrivateExperiment();
            scope.isSavingToCollab = false;
            scope.collabDirty = false;

            scope.isMultipleBrains = function() {
              return simulationInfo.experimentDetails.brainProcesses > 1;
            };

            scope.editorOptions = angular.extend(
              {},
              codeEditorsServices.getDefaultEditorOptions(),
              {
                readOnly: scope.isMultipleBrains() && 'nocursor'
              }
            );

            scope.editorOptions = codeEditorsServices.ownerOnlyOptions(
              scope.editorOptions
            );

            scope.stateService = stateService;
            scope.STATE = STATE;
            scope.ERROR = SIMULATION_FACTORY_CLE_ERROR;
            scope.SOURCE_TYPE = SOURCE_TYPE;
            var ScriptObject = pythonCodeHelper.ScriptObject;

            scope.populations = [];

            scope.showPopulations = false;
            scope.togglePopulations = function() {
              scope.showPopulations = !scope.showPopulations;
              refreshPopulations();
            };
            scope.togglePopulationParameters = function(population) {
              population.showDetails = !population.showDetails;
            };
            scope.onPopulationsReceived = function(population) {
              var p = _.find(scope.populations, { name: population.name });
              var found = angular.isDefined(p);
              if (!found) {
                population.showDetails = false;
                scope.populations.unshift(population);
              }
            };

            var refreshPopulations = function() {
              if (scope.showPopulations) {
                scope.populations = [];
                backendInterfaceService.getPopulations(function(response) {
                  _.forEach(response.populations, scope.onPopulationsReceived);
                });
              }
            };

            scope.transferFunctions = [];
            var addedTransferFunctionCount = 0;
            var docs = documentationURLs.getDocumentationURLs();
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
                  if (msg.lineNumber >= 0) {
                    // There is a line information for the error
                    // Error line highlighting
                    var editor = codeEditorsServices.getEditor(
                      'transfer-function-' + flawedTransferFunction.id
                    );
                    var codeMirrorLineNumber = msg.lineNumber - 1; // 0-based line numbering
                    flawedTransferFunction.error[
                      msg.errorType
                    ].lineHandle = codeMirrorLineNumber;
                    editor.addLineClass(
                      codeMirrorLineNumber,
                      'background',
                      'alert-danger'
                    );
                  }
                }
                if (_.isNull(element[0].offsetParent)) {
                  // the editor is currently hidden: we have to display the error in a popup
                  var nrpError = {
                    type: 'TransferFunctionError',
                    message:
                      msg.functionName +
                      ':' +
                      msg.lineNumber +
                      ': ' +
                      msg.message,
                    label: 'OK'
                  };
                  serverError.displayError(nrpError);
                }
              }
            };

            var rosConnection = roslib.getOrCreateConnectionTo(
              simulationInfo.serverConfig.rosbridge.websocket
            );
            scope.errorTopicSubscriber = roslib.createTopic(
              rosConnection,
              bbpConfig.get('ros-topics').cleError,
              'cle_ros_msgs/CLEError'
            );
            scope.errorTopicSubscriber.subscribe(
              scope.onNewErrorMessageReceived,
              true
            );

            scope.resetListenerUnbindHandler = scope.$on('RESET', function(
              event,
              resetType
            ) {
              if (resetType === RESET_TYPE.RESET_FULL) {
                scope.collabDirty = false;
                scope.transferFunctions = [];
              }
            });

            function loadTFs() {
              return backendInterfaceService.getTransferFunctions(function(
                response
              ) {
                _.forEach(scope.transferFunctions, function(tf) {
                  tf.local = true;
                });
                _.forEach(response.data, function(code, id) {
                  var transferFunction = new ScriptObject(id, code);
                  // If we already have local changes, we do not update
                  var tf = _.find(scope.transferFunctions, { name: id });
                  var found = angular.isDefined(tf);
                  if (found) {
                    tf.local = false;
                    if (tf.dirty) {
                      tf.code = transferFunction.code;
                      codeEditorsServices.resetEditor(
                        codeEditorsServices.getEditor(
                          'transfer-function-' + transferFunction.id
                        )
                      );
                    }
                  } else {
                    scope.transferFunctions.unshift(transferFunction);
                    transferFunction.local = false;
                  }
                });
                for (var i = scope.transferFunctions.length - 1; i >= 0; i--) {
                  var tf = scope.transferFunctions[i];
                  if (tf.local && !tf.dirty) {
                    scope.transferFunctions.splice(i, 1);
                  }
                }

                scope.updateRegexPatterns();
              });
            }

            let refreshEditors = () => {
              codeEditorsServices.refreshAllEditors(
                scope.transferFunctions.map(function(tf) {
                  return 'transfer-function-' + tf.id;
                })
              );
            };

            scope.refresh = function() {
              if (scope.collabDirty) {
                refreshEditors();
              } else {
                loadTFs().then(function() {
                  refreshEditors();
                  refreshPopulations();
                });
              }
            };

            scope.control.refresh = scope.refresh;

            // update UI
            scope.unbindListenerUpdatePanelUI = scope.$on(
              'UPDATE_PANEL_UI',
              function() {
                // prevent calling the select functions of the tabs
                scope.refresh();
              }
            );

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
                  refreshEditors();
                }
              );
              refreshEditors();
            }, 300);

            scope.$on('$destroy', () => {
              scope.resetListenerUnbindHandler();
              scope.unbindWatcherResize();
              scope.unbindListenerUpdatePanelUI();
            });

            function cleanError(transferFunction, errorType) {
              var error = transferFunction.error[errorType];
              if (error && error.lineHandle) {
                var editor = codeEditorsServices.getEditor(
                  'transfer-function-' + transferFunction.id
                );
                editor.removeLineClass(
                  error.lineHandle,
                  'background',
                  'alert-danger'
                );
              }
              delete transferFunction.error[errorType];
            }

            scope.onTransferFunctionChange = function(transferFunction) {
              transferFunction.name = pythonCodeHelper.getFunctionName(
                transferFunction.code
              );
              transferFunction.dirty = true;
              scope.collabDirty = environmentService.isPrivateExperiment();
              autoSaveService.setDirty(DIRTY_TYPE, scope.transferFunctions);
              if (transferFunction.local) {
                transferFunction.id = transferFunction.name;
              }
              scope.updateRegexPatterns();
            };

            scope.cleanCompileError = function(transferFunction) {
              cleanError(transferFunction, scope.ERROR.COMPILE);

              delete transferFunction.error[scope.ERROR.COMPILE];
              delete transferFunction.error[scope.ERROR.NO_OR_MULTIPLE_NAMES];
            };

            scope.update = function(transferFunction, newTf) {
              cleanError(transferFunction, scope.ERROR.RUNTIME);
              delete transferFunction.error[scope.ERROR.LOADING];

              scope.updateRegexPatterns();

              if (newTf) {
                backendInterfaceService.addTransferFunction(
                  transferFunction.code,
                  function() {
                    transferFunction.dirty = false;
                    transferFunction.local = false;
                    transferFunction.id = pythonCodeHelper.getFunctionName(
                      transferFunction.code
                    );
                    scope.cleanCompileError(transferFunction);
                  },
                  function(data) {
                    serverError.displayHTTPError(data);
                  }
                );
              } else {
                backendInterfaceService.editTransferFunction(
                  transferFunction.id,
                  transferFunction.code,
                  function() {
                    transferFunction.dirty = false;
                    transferFunction.local = false;
                    transferFunction.id = pythonCodeHelper.getFunctionName(
                      transferFunction.code
                    );
                    scope.cleanCompileError(transferFunction);
                  },
                  function(data) {
                    serverError.displayHTTPError(data);
                  }
                );
              }
            };

            scope.onTransferFunctionChange = function(transferFunction) {
              transferFunction.name = pythonCodeHelper.getFunctionName(
                transferFunction.code
              );
              transferFunction.dirty = true;
              scope.collabDirty = environmentService.isPrivateExperiment();
              autoSaveService.setDirty(DIRTY_TYPE, scope.transferFunctions);
              if (transferFunction.local) {
                transferFunction.id = transferFunction.name;
              }

              scope.updateRegexPatterns();
            };

            scope.delete = function(transferFunctions) {
              if (transferFunctions === undefined) return;

              //make sure transferFunctions is an array
              transferFunctions = [].concat(transferFunctions);
              return $q.all(
                transferFunctions.map(function(transferFunction) {
                  var index = scope.transferFunctions.indexOf(transferFunction);
                  if (transferFunction.local) {
                    return scope.transferFunctions.splice(index, 1);
                  } else {
                    backendInterfaceService.deleteTransferFunction(
                      transferFunction.id,
                      function() {}
                    );
                    scope.transferFunctions.splice(index, 1);
                  }
                })
              );
            };

            scope.create = function(appendAtEnd) {
              var id = 'transferfunction_' + addedTransferFunctionCount;
              var tf = _.find(scope.transferFunctions, { name: id });
              while (angular.isDefined(tf)) {
                addedTransferFunctionCount = addedTransferFunctionCount + 1;
                id = 'transferfunction_' + addedTransferFunctionCount;
                tf = _.find(scope.transferFunctions, { name: id });
              }
              var code = DEFAULT_TF_CODE.replace('{0}', id);
              var transferFunction = new ScriptObject(id, code);
              transferFunction.dirty = true;
              transferFunction.local = true;
              if (appendAtEnd) {
                scope.transferFunctions.push(transferFunction);
              } else {
                scope.transferFunctions.unshift(transferFunction);
              }
              addedTransferFunctionCount = addedTransferFunctionCount + 1;

              scope.update(transferFunction, true);
              scope.collabDirty = environmentService.isPrivateExperiment();
              autoSaveService.setDirty(DIRTY_TYPE, scope.transferFunctions);
            };

            scope.buildTransferFunctionFile = function(transferFunctions) {
              return _.map(transferFunctions, 'code').join('\n');
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

            scope.download = function() {
              var file = new Blob(
                [scope.buildTransferFunctionFile(scope.transferFunctions)],
                { type: 'plain/text', endings: 'native' }
              );
              var href = URL.createObjectURL(file);
              downloadFileService.downloadFile(href, 'transferFunctions.py');
            };

            scope.saveTFIntoCollabStorage = function() {
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
                _.map(scope.transferFunctions, 'code'),
                function() {
                  // Success callback
                  scope.isSavingToCollab = false;
                  scope.collabDirty = false;
                  autoSaveService.clearDirty(DIRTY_TYPE);
                  saveErrorsService.clearDirty(DIRTY_TYPE);
                  if (stateService.currentState !== STATE.STOPPED) {
                    // update all transfer functions
                    _.forEach(scope.transferFunctions, tf => scope.update(tf));
                  }
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

            function applyTransferFunctions(tfs) {
              var deferred = $q.defer();
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
                return deferred.promise;
              }
              // Removes all TFs
              return scope.delete(scope.transferFunctions).then(function() {
                // Upload new TFs to back-end
                scope.transferFunctions = tfs;
                return $q.all(
                  scope.transferFunctions.map(function(tf) {
                    scope.onTransferFunctionChange(tf);
                    tf.id = tf.name;
                    tf.local = true;
                    return scope.update(tf, true);
                  })
                );
              });
            }

            function tfNames() {
              var names = scope.transferFunctions.map(function(obj) {
                return obj.name;
              });
              return names;
            }

            function generateRegexPattern(currentTransferFunctionNames, index) {
              var pattern = '([A-z_]+[\\w_]*)$';
              var tfNames = angular.copy(currentTransferFunctionNames);
              tfNames.splice(index, 1);
              tfNames = tfNames.filter(function(item) {
                return item !== undefined;
              });
              if (tfNames.length === 0) {
                return pattern;
              } else {
                var exclude = '^\\b(?!\\b' + tfNames.join('\\b|\\b') + '\\b)';
                return exclude + pattern;
              }
            }

            scope.updateRegexPatterns = function() {
              for (var i = 0; i < scope.transferFunctions.length; i++) {
                scope.transferFunctions[i].regex = generateRegexPattern(
                  tfNames(),
                  i
                );
                if (
                  !new RegExp(scope.transferFunctions[i].regex).test(
                    scope.transferFunctions[i].name
                  )
                ) {
                  scope.transferFunctions[i].error[FRONTEND_ERROR.INPUT] = {
                    message: 'Duplicate transfer function names'
                  };
                } else {
                  delete scope.transferFunctions[i].error.Input;
                }
              }
            };

            scope.loadTransferFunctions = function(file) {
              if (file && !file.$error) {
                var deferred = $q.defer();
                var textReader = new FileReader();
                textReader.onload = function(e) {
                  applyTransferFunctions(splitCodeFile(e.target.result)).then(
                    deferred.resolve
                  );
                };
                textReader.readAsText(file);
                return deferred.promise;
              }
            };

            saveErrorsService.registerCallback(DIRTY_TYPE, function(newTFs) {
              scope.transferFunctions = newTFs;
            });

            userContextService.isOwner() &&
              autoSaveService.registerFoundAutoSavedCallback(
                DIRTY_TYPE,
                function(autoSaved, applyChanges) {
                  scope.collabDirty = true;
                  if (applyChanges)
                    loadTFs().then(function() {
                      applyTransferFunctions(autoSaved);
                    });
                  else scope.transferFunctions = autoSaved;
                }
              );

            scope.refresh();
          }
        };
      }
    ]);
})();
