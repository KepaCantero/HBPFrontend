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

  angular.module('exdFrontendApp').directive('smachEditor', [
    '$q',
    'backendInterfaceService',
    'pythonCodeHelper',
    'documentationURLs',
    'roslib',
    'serverError',
    'STATE',
    'stateService',
    'SIMULATION_FACTORY_CLE_ERROR',
    'SOURCE_TYPE',
    '$timeout',
    'simulationInfo',
    'clbConfirm',
    'autoSaveFactory',
    'downloadFileService',
    'RESET_TYPE',
    'codeEditorsServices',
    'saveErrorsService',
    'environmentService',
    'userContextService',
    'bbpConfig',
    'storageServer',
    'baseEventHandler',
    function(
      $q,
      backendInterfaceService,
      pythonCodeHelper,
      documentationURLs,
      roslib,
      serverError,
      STATE,
      stateService,
      SIMULATION_FACTORY_CLE_ERROR,
      SOURCE_TYPE,
      $timeout,
      simulationInfo,
      clbConfirm,
      autoSaveFactory,
      downloadFileService,
      RESET_TYPE,
      codeEditorsServices,
      saveErrorsService,
      environmentService,
      userContextService,
      bbpConfig,
      storageServer,
      baseEventHandler
    ) {
      var DIRTY_TYPE = 'SM';

      return {
        templateUrl:
          'components/editors/state-machine-editor/smach-editor.template.html',
        restrict: 'E',
        scope: {},
        link: function(scope, element) {
          scope.baseEventHandler = baseEventHandler;

          scope.isPrivateExperiment = environmentService.isPrivateExperiment();

          scope.editorOptions = codeEditorsServices.getDefaultEditorOptions();
          scope.editorOptions = codeEditorsServices.ownerOnlyOptions(
            scope.editorOptions
          );

          scope.STATE = STATE;
          scope.ERROR = SIMULATION_FACTORY_CLE_ERROR;
          scope.SOURCE_TYPE = SOURCE_TYPE;
          scope.stateMachines = [];
          var ScriptObject = pythonCodeHelper.ScriptObject;
          var addedStateMachineCount = 0;

          let autoSaveService = autoSaveFactory.createService('State machines');
          autoSaveService.onsave(() => scope.saveSMIntoCollabStorage());

          var docs = documentationURLs.getDocumentationURLs();
          scope.backendDocumentationURL = docs.backendDocumentationURL;
          scope.platformDocumentationURL = docs.platformDocumentationURL;
          scope.nStateMachineDirty = 0;

          scope.$on('$destroy', () => {
            scope.resetListenerUnbindHandler();
            scope.unbindWatcherResize && scope.unbindWatcherResize();
            scope.unbindListenerUpdatePanelUI();
          });

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

          scope.selectStateMachine = function(stateMachine) {
            scope.stateMachine = stateMachine;
          };

          scope.applyEditorOptions = function() {
            var editor = codeEditorsServices.getEditorChild(
              'smachCodeEditor',
              element[0]
            );

            for (let opt in scope.editorOptions) {
              editor.setOption(opt, scope.editorOptions[opt]);
            }
          };

          function loadStateMachines() {
            return storageServer
              .getStateMachines(simulationInfo.experimentID)
              .then(response => {
                _.forEach(response.data, (code, id) => {
                  var stateMachine = new ScriptObject(id, code);
                  stateMachine.name = scope.getStateMachineName(id);
                  // If we already have local changes, we do not update
                  var sm = _.find(scope.stateMachines, { id: id });
                  var found = angular.isDefined(sm);
                  if (found && !sm.dirty) {
                    sm = stateMachine;
                  } else if (!found) {
                    scope.stateMachines.unshift(stateMachine);
                  }
                });
                return scope.stateMachines;
              });
          }

          let refreshEditor = () => {
            var editor = codeEditorsServices.getEditorChild(
              'smachCodeEditor',
              element[0]
            );
            codeEditorsServices.refreshEditor(editor);

            if (scope.stateMachines.length && !scope.stateMachine)
              scope.selectStateMachine(scope.stateMachines[0]);

            scope.updateNStateMachineDirty();
          };

          scope.updateNStateMachineDirty = function() {
            scope.nStateMachineDirty = 0;
            _.forEach(scope.stateMachines, function(sm) {
              if (sm.dirty) {
                scope.nStateMachineDirty++;
              }
            });
          };

          scope.refresh = function() {
            if (autoSaveService.isDirty()) {
              refreshEditor();
              return;
            }
            loadStateMachines().then(function() {
              refreshEditor();
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
                scope.refresh();
              }
            );
            scope.refresh();
          }, 300);

          scope.update = function(stateMachines) {
            var restart = stateService.currentState === STATE.STARTED;
            stateService.ensureStateBeforeExecuting(STATE.PAUSED, function(cb) {
              //if not an array, convert it to one
              stateMachines = [].concat(stateMachines);

              $q
                .all(
                  stateMachines.map(function(stateMachine) {
                    delete stateMachine.error[scope.ERROR.RUNTIME];
                    delete stateMachine.error[scope.ERROR.LOADING];
                    return backendInterfaceService.setStateMachine(
                      stateMachine.id,
                      stateMachine.code,
                      function() {
                        stateMachine.dirty = false;
                        stateMachine.local = false;
                        scope.cleanCompileError(stateMachine);
                        scope.updateNStateMachineDirty();
                      }
                    );
                  })
                )
                .then(function() {
                  if (restart) stateService.setCurrentState(STATE.STARTED);
                })
                .catch(function(err) {
                  serverError.displayHTTPError(err);
                  if (restart) stateService.setCurrentState(STATE.STARTED);
                })
                .finally(cb);
            });
          };

          scope.resetListenerUnbindHandler = scope.$on('RESET', function(
            event,
            resetType
          ) {
            if (resetType === RESET_TYPE.RESET_FULL) {
              scope.stateMachines = [];
            }
          });

          scope.onStateMachineChange = function(stateMachine) {
            stateMachine.dirty = true;
            scope.updateNStateMachineDirty();
            autoSaveService.setDirty();
          };

          scope.create = function(code) {
            var count = addedStateMachineCount;
            var defaultCode =
              'import hbp_nrp_excontrol.nrp_states as states\n' +
              'from smach import StateMachine\n\n' +
              "FINISHED = 'FINISHED'\n" +
              "ERROR = 'ERROR'\n" +
              "PREEMPTED = 'PREEMPTED'\n\n" +
              'sm = StateMachine(outcomes=[FINISHED, ERROR, PREEMPTED])\n\n' +
              'import hbp_nrp_excontrol.nrp_states as states\n' +
              '\n' +
              'with sm:\n' +
              '    # Waits until a simulation time of 20s is reached\n' +
              '    StateMachine.add(\n' +
              '     "timeline_condition",\n' +
              '     states.WaitToClockState(20),\n' +
              '     transitions = {"valid": "timeline_condition",\n' +
              '                    "invalid": "set_left_screen_red",\n' +
              '                    "preempted": PREEMPTED}\n' +
              '    )\n' +
              '    StateMachine.add(\n' +
              '      "set_left_screen_red",\n' +
              '      states.SetMaterialColorServiceState("left_vr_screen",\n' +
              '                                          "body",\n' +
              '                                          "screen_glass",\n' +
              '                                          "Gazebo/RedGlow"),\n' +
              '      transitions = {"succeeded": "delay_set_left_screen_blue",\n' +
              '                     "aborted": FINISHED,\n' +
              '                     "preempted": "set_left_screen_green"}\n' +
              '    )\n' +
              '    StateMachine.add(\n' +
              '      "set_left_screen_blue",\n' +
              '      states.SetMaterialColorServiceState("left_vr_screen",\n' +
              '                                          "body",\n' +
              '                                          "screen_glass",\n' +
              '                                          "Gazebo/BlueGlow"),\n' +
              '      transitions = {"succeeded": "delay_set_left_screen_red",\n' +
              '                     "aborted": FINISHED,\n' +
              '                     "preempted": "set_left_screen_green"}\n' +
              '    )\n' +
              '    StateMachine.add(\n' +
              '      "delay_set_left_screen_blue",\n' +
              '      states.ClockDelayState(5),\n' +
              '      transitions = {"invalid": "set_left_screen_blue",\n' +
              '                     "valid": "delay_set_left_screen_blue",\n' +
              '                     "preempted": "set_left_screen_green"}\n' +
              '    )\n' +
              '    StateMachine.add(\n' +
              '      "delay_set_left_screen_red",\n' +
              '      states.ClockDelayState(5),\n' +
              '      transitions = {"invalid": "set_left_screen_red",\n' +
              '                     "valid": "delay_set_left_screen_red",\n' +
              '                     "preempted": "set_left_screen_green"}\n' +
              '    )\n' +
              '    StateMachine.add(\n' +
              '      "set_left_screen_green",\n' +
              '      states.SetMaterialColorServiceState("left_vr_screen",\n' +
              '                                          "body",\n' +
              '                                          "screen_glass",\n' +
              '                                          "Gazebo/GreenGlow"),\n' +
              '      transitions = {"succeeded": FINISHED,\n' +
              '                     "aborted": FINISHED,\n' +
              '                     "preempted": PREEMPTED}\n' +
              '    )\n\n';

            code = code ? code : defaultCode;
            var id = scope.generateID(count);
            var stateMachine = new ScriptObject(id, code);
            stateMachine.dirty = true;
            stateMachine.local = true;
            stateMachine.name = scope.getStateMachineName(id);
            scope.stateMachines.unshift(stateMachine);
            addedStateMachineCount = addedStateMachineCount + 1;
            scope.update(stateMachine);
            autoSaveService.setDirty();

            scope.selectStateMachine(stateMachine);

            return stateMachine;
          };

          scope.delete = function(stateMachines) {
            //make sure stateMachines is an array
            stateMachines = [].concat(stateMachines);
            return $q
              .all(
                stateMachines.map(function(stateMachine) {
                  var index = scope.stateMachines.indexOf(stateMachine);
                  if (stateMachine.local) {
                    scope.stateMachines.splice(index, 1);
                  } else {
                    return backendInterfaceService.deleteStateMachine(
                      stateMachine.id,
                      function() {
                        scope.stateMachines.splice(index, 1);
                        scope.stateMachine = undefined;
                        refreshEditor();
                      }
                    );
                  }
                })
              )
              .then(() => autoSaveService.setDirty());
          };

          scope.getStateMachineName = function(id) {
            var stateMachineIDRegExp = /^(statemachine_[0-9]+)_[0-9]+_front-?end_generated$/;
            var matches = stateMachineIDRegExp.exec(id);
            if (matches) {
              // The state machine ID was generated by the frontend.
              // Returns a simplified string ID of the form statemachine_<int>
              return matches[1];
            }
            // The state machine ID was originally set in the backend.
            // Hopefully, it is a meaningful name
            return id;
          };

          scope.generateID = function(count) {
            // Check if it does not already exists

            do {
              var found = true;
              var id =
                'statemachine_' +
                count +
                '_' +
                Date.now() +
                '_frontend_generated';
              for (let sm of scope.stateMachines) {
                if (
                  scope.getStateMachineName(sm.id) ===
                  scope.getStateMachineName(id)
                ) {
                  found = false;
                  count++;
                  break;
                }
              }
            } while (!found);

            return id;
          };

          scope.save = function() {
            if (scope.stateMachine) {
              var file = new Blob([scope.stateMachine.code], {
                type: 'plain/text',
                endings: 'native'
              });
              var href = URL.createObjectURL(file);
              downloadFileService.downloadFile(
                href,
                scope.getStateMachineName(scope.stateMachine.id) + '.exd'
              );
            }
          };

          scope.loadStateMachine = function(file) {
            if (file && !file.$error) {
              var textReader = new FileReader();
              textReader.onload = function(e) {
                $timeout(function() {
                  // Check if we have a state machine with the same name

                  let smFound;

                  _.forEach(scope.stateMachines, stateMachine => {
                    if (
                      scope.getStateMachineName(stateMachine.id) ===
                      file.name.replace(/\.[^/.]+$/, '')
                    )
                      smFound = stateMachine;
                  });

                  if (smFound) {
                    clbConfirm
                      .open({
                        title: 'Uploading State Machine',
                        confirmLabel: 'Add',
                        cancelLabel: 'Replace',
                        template:
                          'Add to the current state machines or replace the one with the same name ?',
                        closable: false
                      })
                      .then(
                        () => {
                          scope.create(e.target.result);
                        },
                        () => {
                          smFound.code = e.target.result;
                          smFound.dirty = true;
                          autoSaveService.setDirty();
                        }
                      );
                  } else scope.create(e.target.result);
                });
              };
              textReader.readAsText(file);
            }
          };

          scope.saveSMIntoCollabStorage = function() {
            var stateMachines = {};
            _.forEach(scope.stateMachines, function(stateMachine) {
              stateMachines[stateMachine.id] = stateMachine.code;
            });

            return storageServer
              .saveStateMachines(simulationInfo.experimentID, stateMachines)
              .then(() => {
                // Success callback
                autoSaveService.reset();
                saveErrorsService.clearDirty(DIRTY_TYPE);
              });
          };

          scope.onNewErrorMessageReceived = function(msg) {
            if (
              msg.severity < 2 &&
              msg.sourceType === scope.SOURCE_TYPE.STATE_MACHINE
            ) {
              // Error message is not critical and can be fixed
              var flawedStateMachine = _.find(scope.stateMachines, {
                id: msg.functionName
              });
              if (flawedStateMachine === undefined) {
                // if we couldn't find the sm from the id, try against the name
                flawedStateMachine = _.find(scope.stateMachines, {
                  name: msg.functionName
                });
              }
              // Remove error line highlighting if a new compile error is received
              if (msg.errorType === scope.ERROR.COMPILE) {
                scope.cleanCompileError(flawedStateMachine);
              }
              flawedStateMachine.error[msg.errorType] = msg;
              if (msg.lineNumber >= 0) {
                // Python Syntax Error
                // Error line highlighting
                var editor = codeEditorsServices.getEditor(
                  'state-machine-' + flawedStateMachine.id
                );
                var codeMirrorLineNumber = msg.lineNumber - 1; // 0-based line numbering
                msg.lineHandle = codeMirrorLineNumber;
                editor.addLineClass(
                  codeMirrorLineNumber,
                  'background',
                  'alert-danger'
                );
              }
            }
          };

          scope.cleanCompileError = function(stateMachine) {
            var compileError = stateMachine.error[scope.ERROR.COMPILE];
            var lineHandle = compileError ? compileError.lineHandle : undefined;
            if (angular.isDefined(lineHandle)) {
              var editor = codeEditorsServices.getEditor(
                'state-machine-' + stateMachine.id
              );
              editor.removeLineClass(lineHandle, 'background', 'alert-danger');
            }
            delete stateMachine.error[scope.ERROR.COMPILE];
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

          saveErrorsService.registerCallback(DIRTY_TYPE, function(newSMs) {
            scope.stateMachines = newSMs;
          });
        }
      };
    }
  ]);
})();
