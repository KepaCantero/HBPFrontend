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

  angular.module('exdFrontendApp.Constants').constant('PYNN_ERROR', {
    COMPILE: 'Compile'
  });

  angular
    .module('exdFrontendApp')
    .directive('customAutofocus', [
      '$timeout',
      function($timeout) {
        return {
          restrict: 'A',
          link: function(scope, element) {
            $timeout(function() {
              // use a timout to foucus outside this digest cycle!
              element[0].focus();
            }, 0);
          }
        };
      }
    ])
    .directive('pynnEditor', [
      '$timeout',
      '$rootScope',
      'backendInterfaceService',
      'pythonCodeHelper',
      'documentationURLs',
      'clbErrorDialog',
      'clbConfirm',
      'simulationInfo',
      'STATE',
      'PYNN_ERROR',
      'stateService',
      'autoSaveFactory',
      'RESET_TYPE',
      'codeEditorsServices',
      'environmentService',
      'downloadFileService',
      'baseEventHandler',
      'storageServer',
      'tipTooltipService',
      'TIP_CODES',
      function(
        $timeout,
        $rootScope,
        backendInterfaceService,
        pythonCodeHelper,
        documentationURLs,
        clbErrorDialog,
        clbConfirm,
        simulationInfo,
        STATE,
        PYNN_ERROR,
        stateService,
        autoSaveFactory,
        RESET_TYPE,
        codeEditorsServices,
        environmentService,
        downloadFileService,
        baseEventHandler,
        storageServer,
        tipTooltipService,
        TIP_CODES
      ) {
        return {
          templateUrl:
            'components/editors/brain-editor/pynn-editor.template.html',
          restrict: 'E',
          scope: {
            control: '='
          },
          replace: true,
          link: function(scope, element) {
            let messageCallbackHandler = stateService.addMessageCallback(
              message => {
                if (message.action === 'setbrain')
                  if (element.is(':visible')) scope.refresh();
              }
            );
            tipTooltipService.setCurrentTip(TIP_CODES.BRAIN_EDITOR);
            scope.isPrivateExperiment = environmentService.isPrivateExperiment();
            scope.loading = false;
            scope.simulationInfo = simulationInfo;
            scope.localBrainDirty = false;
            scope.localHelpVisible = {
              populations: false
            };

            var ScriptObject = pythonCodeHelper.ScriptObject;
            scope.pynnScript = new ScriptObject(0, 'empty');

            scope.editorOptions = codeEditorsServices.getDefaultEditorOptions();

            scope.editorOptions = codeEditorsServices.ownerOnlyOptions(
              scope.editorOptions
            );
            let autoSaveService = autoSaveFactory.createService('Brain');
            autoSaveService.onsave(() => scope.saveIntoStorage());

            scope.resetListenerUnbindHandler = scope.$on('RESET', function(
              event,
              resetType
            ) {
              if (
                resetType === RESET_TYPE.RESET_FULL ||
                resetType === RESET_TYPE.RESET_BRAIN
              ) {
                autoSaveService.reset();
                scope.localBrainDirty = false;
                scope.pynnScript.error = {};
              }
            });

            scope.$on('$destroy', () => {
              scope.resetListenerUnbindHandler();
              scope.unbindWatcherResize && scope.unbindWatcherResize();
              scope.unbindListenerUpdatePanelUI();
              stateService.removeMessageCallback(messageCallbackHandler);
            });

            let refreshEditor = (reset = false) => {
              var editor = codeEditorsServices.getEditorChild(
                'pynnEditor',
                element[0]
              );
              codeEditorsServices.refreshEditor(editor);
              if (reset) codeEditorsServices.resetEditor(editor);
            };
            scope.applyEditorOptions = function() {
              var editor = codeEditorsServices.getEditorChild(
                'pynnEditor',
                element[0]
              );
              _.forOwn(scope.editorOptions, function(value, key) {
                editor.setOption(key, value);
              });
            };

            $rootScope.$on('BRAIN_SCRIPT_UPDATED', function() {
              scope.refresh(true);
            });
            //TODO: get this mess of upwards-downwards intertwined scope definition out and handle refreshing in here alone
            // refresh is called on:
            // * resize
            // * brain reset
            // * simulation reset
            // * env poses reset
            scope.refresh = function(forceRefresh = false) {
              refreshEditor();
              scope.loading = true;
              storageServer
                .getBrain(simulationInfo.experimentID)
                .then(response => {
                  scope.loading = false;
                  if (!forceRefresh && autoSaveService.isDirty()) return; // Don't overwrite populations, they have been changed!
                  if (response.brainType === 'py') {
                    scope.pynnScript.code = response.brain;
                    let previousPopulations = scope.populations
                      ? objectifyPopulations(scope.populations)
                      : undefined;
                    scope.populations = scope.preprocessPopulations(
                      response.populations
                    );

                    if (previousPopulations)
                      for (let pop of scope.populations)
                        if (previousPopulations[pop.name])
                          pop.showDetails =
                            previousPopulations[pop.name].showDetails;

                    for (let p of scope.populations) {
                      if (!p.previousName) p.previousName = p.name;
                    }

                    refreshEditor();
                    setTimeout(function() {
                      refreshEditor(true);
                      scope.searchToken('si');
                    }, 100);
                  } else {
                    scope.pynnScript.code = '# Write brain script here';
                    scope.populations = [];
                    refreshEditor();
                  }
                  $timeout(() => (scope.localBrainDirty = false));
                });
            };
            $timeout(() => {
              scope.refresh();
            }, 100);

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
                  refreshEditor();
                }
              );
              refreshEditor();
              scope.applyEditorOptions();
            }, 300);

            /** Convert Populations Object into array and create for each population a unique
             * regular expression to avoid duplicate names.
             */
            scope.preprocessPopulations = function(neuronPopulations) {
              if (neuronPopulations === null) return undefined;

              var populationNames = Object.keys(neuronPopulations);
              var populationsArray = populationNames.map(function(name, index) {
                var populationObject = neuronPopulations[name];
                populationObject.name = name;
                var isSlice = scope.isSlice(populationObject);
                populationObject.displayMode = isSlice ? 'range' : 'list';
                if (isSlice && !populationObject.step) {
                  populationObject.step = 1;
                }
                if (!isSlice) {
                  var str = populationObject.list.toString();
                  populationObject = {
                    list: str,
                    name: name
                  };
                }
                populationObject.regex = generateRegexPattern(
                  populationNames,
                  index
                );
                return populationObject;
              });
              return populationsArray;
            };

            scope.suppressKeyPress = function(event) {
              baseEventHandler.suppressAnyKeyPress(event);
            };

            function objectifyPopulations(neuroPopulations) {
              var populations = angular.copy(neuroPopulations);
              var populationsObject = {};
              angular.forEach(populations, function(population) {
                var name = population.name;
                delete population.name;
                populationsObject[name] = population;
              });
              return populationsObject;
            }

            function populationNames() {
              var names = scope.populations.map(function(obj) {
                return obj.name;
              });
              return names;
            }

            function generateRegexPattern(currentPopulationNames, index) {
              var pattern = '([A-z_]+[\\w_]*)$';
              var populationNames = angular.copy(currentPopulationNames);
              populationNames.splice(index, 1);
              populationNames = populationNames.filter(function(item) {
                return item !== undefined;
              });
              if (populationNames.length === 0) {
                return pattern;
              } else {
                var exclude =
                  '^\\b(?!\\b' + populationNames.join('\\b|\\b') + '\\b)';
                return exclude + pattern;
              }
            }

            scope.updateRegexPatterns = function() {
              for (var i = 0; i < scope.populations.length; i++) {
                scope.populations[i].regex = generateRegexPattern(
                  populationNames(),
                  i
                );
              }
            };

            scope.stringsToLists = function(neuronPopulations) {
              var populations = angular.copy(neuronPopulations);
              angular.forEach(populations, function(population, name) {
                var isList = !scope.isSlice(population);
                if (isList) {
                  var stringList = population.list.split(',');
                  populations[name].list = _.map(stringList, Number);
                }
              });
              return populations;
            };

            scope.updatePopulationBackend = function(options) {
              var restart = stateService.currentState === STATE.STARTED;
              scope.loading = true;
              let hastoDeletePopulation =
                options &&
                options.hasOwnProperty('populationToDeleteIndex') &&
                options.populationToDeleteIndex > -1;
              if (hastoDeletePopulation)
                scope.populations.splice(options.populationToDeleteIndex, 1);
              var populations = objectifyPopulations(scope.populations);

              for (let popk in populations) {
                let pop = populations[popk];
                delete pop.editing;
                delete pop.displayMode;
              }
              backendInterfaceService.updatePopulations(
                'py',
                scope.stringsToLists(populations),
                'text',
                options.changePopulations,
                function() {
                  autoSaveService.setDirty();
                  $rootScope.$broadcast('pynn.populationsChanged');
                  scope.loading = false;
                  if (restart) {
                    stateService.setCurrentState(STATE.STARTED);
                  }
                },
                function(result) {
                  scope.loading = false;
                  scope.refresh(true);
                  clbErrorDialog.open({
                    type: 'Impossible to update population',
                    message: result.data.error_message
                  });
                }
              );
            };

            scope.updateBrainBackend = function() {
              var restart = stateService.currentState === STATE.STARTED;
              var populations = objectifyPopulations(scope.populations);

              backendInterfaceService
                .setBrain(
                  'py',
                  'text',
                  scope.pynnScript.code,
                  scope.stringsToLists(populations)
                )
                .then(() => {
                  scope.loading = false;
                  codeEditorsServices.getEditor('pynnEditor').markClean();
                  scope.clearError();
                  scope.localBrainDirty = false;
                  if (restart) {
                    stateService.setCurrentState(STATE.STARTED);
                  }
                })
                .catch(result => {
                  scope.loading = false;
                  scope.clearError();
                  if (
                    result.data.error_line === -2 &&
                    result.data.error_column === -2
                  ) {
                    // if error_line == error_column == -2 then show the error message returned from the backend
                    clbErrorDialog.open({
                      type: 'Impossible to apply changes',
                      message: result.data.error_message
                    });
                  } else {
                    scope.markError(
                      result.data.error_message,
                      result.data.error_line,
                      result.data.error_column
                    );
                  }
                });
            };
            // Generate a regexp that will use to check if a population is used by a transfer function
            let populationRegExp = function(populationName) {
              return new RegExp('\\W' + populationName + '(?=\\W)', 'gm');
            };
            // Check if a given population is used by some transfer function
            let aPopulationNeedsToBeReplaced = function(
              transferFunctions,
              options
            ) {
              const aPopulationNeedsToBeDeleted =
                options && options.hasOwnProperty('populationToDeleteIndex');
              const populationToDelete = aPopulationNeedsToBeDeleted
                ? scope.populations[options.populationToDeleteIndex].name
                : undefined;
              for (let tf in transferFunctions) {
                if (
                  populationToDelete &&
                  transferFunctions[tf].match(
                    populationRegExp(populationToDelete)
                  )
                )
                  return true;
                if (!aPopulationNeedsToBeDeleted) {
                  for (let p of scope.populations) {
                    if (
                      p.previousName !== p.name &&
                      transferFunctions[tf].match(
                        populationRegExp(p.previousName)
                      )
                    ) {
                      return true;
                    }
                  }
                }
              }
              return false;
            };

            scope.renamePopulations = function(options) {
              options.changePopulations = true;
              storageServer
                .getTransferFunctions(simulationInfo.experimentID)
                .then(result => {
                  let tfs = result.data;
                  clbConfirm
                    .open({
                      title: 'Confirm changing neural network',
                      confirmLabel: 'Yes',
                      cancelLabel: 'Cancel',
                      template:
                        'Applying your changes will update population references of your transfer functions. Do you wish to continue?',
                      closable: false
                    })
                    .then(() => {
                      // Find and replace former population names in transfer functions
                      let tflist = [];
                      for (let tf in tfs) {
                        for (let p of scope.populations)
                          if (p.previousName !== p.name)
                            tfs[tf] = tfs[tf].replace(
                              populationRegExp(p.previousName),
                              p.name
                            );
                        tflist.push(tfs[tf]);
                      }
                      storageServer
                        .saveTransferFunctions(
                          simulationInfo.experimentID,
                          tflist
                        )
                        .then(() => scope.updatePopulationBackend(options))
                        .catch(() =>
                          clbErrorDialog.open({
                            type: 'BackendError.',
                            message:
                              'Error while saving transfer functions to the Storage.'
                          })
                        )
                        .finally(() => (scope.loading = false));
                    });
                });
            };

            scope.updatePopulations = function(options) {
              // If editing populations are valid first
              scope.loading = true;
              for (let p of scope.populations) p.editing = false;
              storageServer
                .getTransferFunctions(simulationInfo.experimentID)
                .then(result => {
                  let tfs = result.data;
                  // We check if we need to do some find and replace first.
                  // The case of deleted population is a special case.
                  const aPopulationNeedsToBeDeleted =
                    options &&
                    options.hasOwnProperty('populationToDeleteIndex');
                  const aPopNeedsToBeReplaced = aPopulationNeedsToBeReplaced(
                    tfs,
                    options
                  );
                  if (aPopulationNeedsToBeDeleted && aPopNeedsToBeReplaced) {
                    clbErrorDialog.open({
                      // The delete operation will be cancelled; no DELETE request will be sent to the back-end.
                      type: 'Population referred by Transfer Functions',
                      message:
                        'This population is referred to by transfer functions. ' +
                        'Please remove all references to this population in your transfer functions and try again.'
                    });
                    return;
                  }
                  scope.updatePopulationBackend(options);
                })
                .finally(() => {
                  for (let p of scope.populations) {
                    p.previousName = p.name;
                  }
                });
            };

            scope.saveIntoStorage = function() {
              return storageServer
                .saveBrain(
                  simulationInfo.experimentID,
                  scope.pynnScript.code,
                  scope.stringsToLists(scope.populations),
                  false
                )
                .catch(() => {
                  clbErrorDialog.open({
                    type: 'BackendError.',
                    message: 'Error while saving brain script to the Storage.'
                  });
                });
            };

            scope.editingPopulation = function() {
              for (let pop of scope.populations) if (pop.editing) return true;

              return false;
            };

            scope.applyEditingPopulation = function() {
              if (scope.editingPopulation())
                scope.updatePopulations({ changePopulations: true });
            };

            scope.editingFocusLost = function(pop) {
              $timeout(() => {
                if (!pop.editingHasFocus)
                  scope.updatePopulations({ changePopulations: true });
              });
            };

            scope.startEditing = function(pop) {
              scope.applyEditingPopulation();
              pop.editing = true;
            };

            scope.showLocalHelp = function(show, category) {
              scope.localHelpVisible[category] = show;
            };

            scope.searchToken = function(name) {
              var lines = scope.pynnScript.code.split('\n');
              var l = 0;
              var ret = { line: 0, ch: 0 };
              var found = false;

              lines.forEach(function(line) {
                if (found) {
                  return;
                }
                var c = -2;
                while (c !== -1 && !found) {
                  c = line.indexOf(name, c + 1);
                  if (c !== -1) {
                    var token = codeEditorsServices
                      .getEditor('pynnEditor')
                      .getTokenAt({ line: l, ch: c + 1 });
                    if (token.type !== 'string' && token.string === name) {
                      ret = { line: l, ch: c };
                      found = true;
                    }
                  }
                }
                l += 1;
              });
              return ret;
            };

            scope.isSlice = function(population) {
              return (
                population.hasOwnProperty('from') &&
                population.hasOwnProperty('to')
              );
            };

            scope.deletePopulation = function(index) {
              var options = {
                populationToDeleteIndex: index,
                changePopulations: true
              };
              scope.updatePopulations(options);
              scope.updateRegexPatterns();
            };

            scope.onPopulationDefineModeChange = function(pop) {
              if (pop.displayMode === 'range') {
                delete pop.list;
                pop.from = 0;
                pop.to = 1;
                pop.step = 1;
              } else if (pop.displayMode === 'list') {
                delete pop.from;
                delete pop.to;
                delete pop.step;
                pop.list = '';
              }
            };

            scope.onPynnChange = function() {
              scope.localBrainDirty = true;
              autoSaveService.setDirty();
            };

            scope.$watch('pynnScript.code', function(after, before) {
              if (
                before !== 'empty' &&
                before.replace(/\r/g, '') !== after.replace(/\r/g, '')
              )
                scope.onPynnChange(true);
            });

            scope.$watchCollection('populations', function(after, before) {
              if (before && angular.toJson(after) != angular.toJson(before))
                scope.onPynnChange();
            });

            scope.closeAllPopulations = function() {
              for (let pop of scope.populations) pop.showDetails = false;
            };

            scope.addList = function() {
              scope.closeAllPopulations();

              var regex = generateRegexPattern(
                populationNames(),
                scope.populations.length
              );
              scope.populations.push({
                name: scope.generatePopulationName(),
                list: '0, 1, 2',
                regex: regex,
                editing: true,
                showDetails: true,
                displayMode: 'list'
              });
              scope.updateRegexPatterns();
            };

            scope.addSlice = function() {
              scope.closeAllPopulations();

              var regex = generateRegexPattern(
                populationNames(),
                scope.populations.length
              );
              scope.populations.push({
                name: scope.generatePopulationName(),
                from: 0,
                to: 1,
                step: 1,
                regex: regex,
                editing: true,
                showDetails: true,
                displayMode: 'range'
              });
              scope.updateRegexPatterns();
              var options = { changePopulations: true };
              scope.updatePopulationBackend(options);
            };

            scope.generatePopulationName = function() {
              var prefix = 'population_';
              var suffix = 0;
              var existingNames = populationNames();
              while (existingNames.indexOf(prefix + suffix) >= 0) {
                suffix += 1;
              }
              return prefix + suffix;
            };

            scope.parseName = function(error) {
              if (error.search('is not defined') > 0) {
                var start = error.search("name '");
                var end = error.search("' is not defined");
                return error.substring(start + 6, end);
              } else {
                return false;
              }
            };

            scope.markError = function(errorMessage, line, column) {
              var editor = codeEditorsServices.getEditor('pynnEditor');
              if (isNaN(line) || isNaN(column)) {
                return;
              }
              if (line === 0 && column === 0) {
                var tokenname = scope.parseName(errorMessage);
                if (!tokenname) {
                  return;
                }
                var lc = scope.searchToken(tokenname);
                line = lc.line;
                column = lc.ch;
              } else {
                line -= 1;
                column -= 2;
                if (line < 0) {
                  line = 0;
                }
                if (column < 0) {
                  column = 0;
                }
              }

              var err = ' '.repeat(column) + '^\n' + errorMessage;
              var htmlNode = document.createElement('pre');
              var text = document.createTextNode(err);
              htmlNode.appendChild(text);
              var compileError = {
                message: errorMessage,
                errorType: PYNN_ERROR.COMPILE
              };
              scope.pynnScript.error[PYNN_ERROR.COMPILE] = compileError;
              scope.lineHandle = editor.addLineClass(
                line,
                'background',
                'alert-danger'
              );
              editor.scrollIntoView({ line: line, ch: 1 });
            };

            scope.clearError = function() {
              if (scope.lineHandle) {
                codeEditorsServices
                  .getEditor('pynnEditor')
                  .removeLineClass(scope.lineHandle, 'background');
              }
              if (scope.lineWidget) {
                scope.lineWidget.clear();
              }
              delete scope.pynnScript.error[PYNN_ERROR.COMPILE];
            };

            var docs = documentationURLs.getDocumentationURLs();
            scope.backendDocumentationURL = docs.backendDocumentationURL;
            scope.platformDocumentationURL = docs.platformDocumentationURL;

            scope.download = function() {
              var href = URL.createObjectURL(
                new Blob([scope.pynnScript.code], {
                  type: 'plain/text',
                  endings: 'native'
                })
              );
              downloadFileService.downloadFile(href, 'pynnBrain.py');
            };

            scope.uploadFile = function(file) {
              if (!file || file.$error) return;

              var textReader = new FileReader();
              textReader.onload = function(e) {
                scope.pynnScript.code = e.target.result;
                scope.updateBrainBackend();
              };
              textReader.readAsText(file);
            };

            scope.refresh();
          }
        };
      }
    ]);
})();
