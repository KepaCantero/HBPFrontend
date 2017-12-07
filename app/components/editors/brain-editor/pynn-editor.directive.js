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

  angular.module('exdFrontendApp').directive('pynnEditor', [
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
    'autoSaveService',
    'RESET_TYPE',
    'codeEditorsServices',
    'environmentService',
    'downloadFileService',
    'userContextService',
    'baseEventHandler',
    'editorToolbarService',
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
      autoSaveService,
      RESET_TYPE,
      codeEditorsServices,
      environmentService,
      downloadFileService,
      userContextService,
      baseEventHandler,
      editorToolbarService
    ) {
      var DIRTY_TYPE = 'BRAIN';

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

          scope.isPrivateExperiment = environmentService.isPrivateExperiment();
          scope.loading = false;
          scope.collabDirty = false;
          scope.localBrainDirty = false;
          scope.isSavingToCollab = false;

          var ScriptObject = pythonCodeHelper.ScriptObject;
          scope.pynnScript = new ScriptObject(0, 'empty');

          scope.editorOptions = codeEditorsServices.getDefaultEditorOptions();

          scope.editorOptions = codeEditorsServices.ownerOnlyOptions(
            scope.editorOptions
          );

          scope.resetListenerUnbindHandler = scope.$on('RESET', function(
            event,
            resetType
          ) {
            if (resetType !== RESET_TYPE.RESET_CAMERA_VIEW) {
              scope.collabDirty = false;
              scope.localBrainDirty = false;
            }
          });

          scope.$on('$destroy', () => {
            scope.resetListenerUnbindHandler();
            scope.unbindWatcherResize();
            scope.unbindListenerUpdatePanelUI();
            stateService.removeMessageCallback(messageCallbackHandler);
            editorToolbarService.showPynnEditor = false;
          });

          let refreshEditor = (reset = false) => {
            var editor = codeEditorsServices.getEditorChild(
              'codeEditor',
              element[0]
            );
            codeEditorsServices.refreshEditor(editor);
            if (reset) codeEditorsServices.resetEditor(editor);
          };

          //TODO: get this mess of upwards-downwards intertwined scope definition out and handle refreshing in here alone
          // refresh is called on:
          // * resize
          // * brain reset
          // * simulation reset
          // * env poses reset
          scope.refresh = function() {
            refreshEditor();
            if (scope.collabDirty) return;
            scope.loading = true;
            backendInterfaceService.getBrain(function(response) {
              scope.loading = false;
              if (response.brain_type === 'py') {
                scope.pynnScript.code = response.data;
                scope.populations = scope.preprocessPopulations(
                  response.additional_populations
                );
                refreshEditor();
                setTimeout(function() {
                  refreshEditor(true);
                  scope.searchToken('si');
                }, 100);
              } else {
                scope.pynnScript.code = 'empty';
                scope.populations = [];
                refreshEditor();
              }
              $timeout(() => (scope.localBrainDirty = false));
            });
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
                refreshEditor();
              }
            );
            refreshEditor();
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

          scope.agreeAction = function() {
            scope.apply(1);
          };

          /**
           * @param {integer} [change_population]
           */
          scope.apply = function(changePopulation) {
            var restart = stateService.currentState === STATE.STARTED;
            scope.loading = true;
            var populations = objectifyPopulations(scope.populations);
            backendInterfaceService.setBrain(
              scope.pynnScript.code,
              scope.stringsToLists(populations),
              'py',
              'text',
              changePopulation,
              function() {
                // Success callback
                scope.loading = false;
                codeEditorsServices.getEditor('codeEditor').markClean();
                scope.clearError();
                scope.localBrainDirty = false;
                if (restart) {
                  stateService.setCurrentState(STATE.STARTED);
                }

                $rootScope.$broadcast('pynn.populationsChanged');
              },
              function(result) {
                // Failure callback
                scope.loading = false;
                scope.clearError();
                if (result.data.handle_population_change) {
                  clbConfirm
                    .open({
                      title: 'Confirm changing neural network',
                      confirmLabel: 'Yes',
                      cancelLabel: 'Cancel',
                      template:
                        'Applying your changes may update population references of your transfer functions. Do you wish to continue?',
                      closable: false
                    })
                    .then(scope.agreeAction, function() {});
                } else if (
                  result.data.error_line === -1 &&
                  result.data.error_column === -1
                ) {
                  scope.refresh();
                  clbErrorDialog.open({
                    type: 'Impossible to delete population',
                    message:
                      'Please remove all references to the population in the transfer functions and try again.',
                    data: { error: result.data.error_message }
                  });
                } else {
                  scope.markError(
                    result.data.error_message,
                    result.data.error_line,
                    result.data.error_column
                  );
                }
              }
            );
          };

          scope.saveIntoCollabStorage = function() {
            scope.isSavingToCollab = true;
            backendInterfaceService.saveBrain(
              scope.pynnScript.code,
              scope.stringsToLists(scope.populations),
              function() {
                // Success callback
                scope.isSavingToCollab = false;
                scope.collabDirty = false;
                autoSaveService.clearDirty(DIRTY_TYPE);
              },
              function() {
                // Failure callback
                clbErrorDialog.open({
                  type: 'BackendError.',
                  message: 'Error while saving pyNN script to the Storage.'
                });
                scope.isSavingToCollab = false;
              }
            );
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
                    .getEditor('codeEditor')
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
            scope.populations.splice(index, 1);
            scope.updateRegexPatterns();
          };

          scope.onPynnChange = function() {
            scope.collabDirty = environmentService.isPrivateExperiment();
            scope.localBrainDirty = true;
            autoSaveService.setDirty(DIRTY_TYPE, [
              scope.pynnScript.code,
              scope.populations
            ]);
          };

          scope.$watch('pynnScript.code', function(after, before) {
            if (
              before !== 'empty' &&
              before.replace(/\r/g, '') !== after.replace(/\r/g, '')
            )
              scope.onPynnChange(true);
          });

          scope.$watchCollection('populations', function(after, before) {
            if (before) scope.onPynnChange();
          });

          scope.addList = function() {
            var regex = generateRegexPattern(
              populationNames(),
              scope.populations.length
            );
            scope.populations.push({
              name: scope.generatePopulationName(),
              list: '0, 1, 2',
              regex: regex
            });
            scope.updateRegexPatterns();
          };

          scope.addSlice = function() {
            var regex = generateRegexPattern(
              populationNames(),
              scope.populations.length
            );
            scope.populations.push({
              name: scope.generatePopulationName(),
              from: 0,
              to: 1,
              step: 1,
              regex: regex
            });
            scope.updateRegexPatterns();
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
            var editor = codeEditorsServices.getEditor('codeEditor');
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
                .getEditor('codeEditor')
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

          userContextService.isOwner() &&
            autoSaveService.registerFoundAutoSavedCallback(DIRTY_TYPE, function(
              autoSaved,
              applyChanges
            ) {
              scope.pynnScript.code = autoSaved[0];
              scope.populations = autoSaved[1];
              scope.collabDirty = true;
              if (applyChanges) scope.agreeAction();
            });

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
              scope.apply(0);
            };
            textReader.readAsText(file);
          };

          scope.refresh();
        }
      };
    }
  ]);
})();
