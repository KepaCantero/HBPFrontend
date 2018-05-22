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

  const MAX_VISIBLE_LINES = 2000;
  const MAX_CMD_HISTORY = 100;
  const AUTO_SCROLL_MAX_DISTANCE = 50;

  const AVAILABLE_COMMANDS = {
    rostopic: 'Prints information about ROS Topics.',
    rosservice: 'Prints information about ROS Services.',
    rosmsg: '\tPrints information about ROS Message types.',
    rossrv: '\tPrints information about ROS Service types.',
    rosnode: '\tPrints information about ROS Nodes.'
  };
  const HELP_COMMAND = [
    'The ROS terminal is a shell where you can execute ROS commands.',
    'Supported commands: ',
    ..._.map(AVAILABLE_COMMANDS, (desc, key) => `\t${key}\t${desc}`),
    '',
    'Example: type "rostopic" to know more about this command'
  ];

  angular.module('rosTerminalModule').directive('rosTerminal', [
    '$timeout',
    '$document',
    'rosCommanderService',
    'editorToolbarService',
    ($timeout, $document, rosCommanderService, editorToolbarService) => {
      return {
        templateUrl: 'components/ros-terminal/ros-terminal.template.html',
        restrict: 'E',
        replace: true,
        scope: {
          ngShow: '=',
          close: '&closeFn'
        },
        link: (scope, $element) => {
          scope.commands = [];

          const commandList = $element.find('.ros-command-list')[0];
          const rosCommandLine = $element.find('.ros-command-line');

          scope.cmdLine = '';
          scope.focused = true; //prompt should be focused
          scope.running = false; //we hide the prompt when a command is running

          scope.$watch('running', (before, after) => {
            if (before || !after || !scope.focused) return;
            // ros command just became enabled, maybe due to a cmd that has terminated, let's focus on it
            $timeout(() => rosCommandLine.focus());
          });

          let loadhistory = () => {
            try {
              let cmdHistory = localStorage.getItem('ROS_CMD_HISTORY');
              if (cmdHistory) return JSON.parse(cmdHistory);
            } catch (e) {
              angular.noop();
            }
            return ['help']; //default cmd history
          };

          let cmdHistory = loadhistory();
          let cmdHistoryPos = 0; //not within history

          let addCmdToHistory = cmdLine => {
            cmdHistoryPos = 0;
            cmdHistory.push(cmdLine);
            cmdHistory.splice(0, cmdHistory.length - MAX_CMD_HISTORY);
            localStorage.setItem('ROS_CMD_HISTORY', JSON.stringify(cmdHistory));
          };

          let handleCommand = cmdLine => {
            if (!cmdLine.trim()) return;

            addCmd({ type: 'cmd', data: cmdLine });
            scope.cmdLine = '';
            cmdLine = cmdLine.trim();

            addCmdToHistory(cmdLine);

            //split cmd line in cmd and args, while making sure quoted parts remain whole and remove empty matches
            let [cmd, ...cmdArgs] = cmdLine
              .split(/(?:([^"'\s]+)|(?:"([^"]*)")|(?:'([^']*)'))\s*/g)
              .filter(e => e);

            if (AVAILABLE_COMMANDS[cmd]) {
              //is a valid command
              scope.running = true;
              rosCommanderService.sendCommand(cmd, cmdArgs);
            } else if (cmd === 'help') {
              //help command
              newResponsesReceived(
                HELP_COMMAND.map(l => ({ type: 'stdout', data: l }))
              );
            } else {
              //unknown cmd
              addCmd({ type: 'stderr', data: `Unknown command '${cmd}'` });
            }
          };

          //add cmds to list of cmds to show, remove too old if len(cmds)>MAX_VISIBLE_LINES, and scroll if seing the last cmd
          let addCmd = cmds => {
            let shouldScroll =
              commandList.scrollHeight -
                (commandList.scrollTop + commandList.clientHeight) <
              AUTO_SCROLL_MAX_DISTANCE;

            if (!Array.isArray(cmds)) cmds = [cmds];
            scope.commands.push(...cmds);
            //remove extra cmds
            scope.commands.splice(0, scope.commands.length - MAX_VISIBLE_LINES);

            rosCommanderService.setSessionLog(scope.commands);

            $timeout(() => {
              //set vertical scroll to bottom
              if (shouldScroll) {
                $timeout(
                  () => (commandList.scrollTop = commandList.scrollHeight)
                );
              }
            });
          };

          let handleCompletionLine = l => {
            if (l.data.length == 0)
              //no completion suggestion => do nothing
              return [];

            let cmds = [];
            let cmdLine = rosCommandLine.val();
            if (l.data.length > 1) {
              //more than one completion suggestion => display suggestions
              cmds.push({ type: 'cmd', data: cmdLine });
              for (let suggest of l.data)
                cmds.push({ type: 'stdout', data: suggest });
            }

            let calculateCommonPart = arr => {
              //returns the common part of the strings in the array
              if (arr.length == 1) return arr[0];
              arr = [...arr].sort();
              let a = arr[0],
                b = arr[arr.length - 1];
              let i = 0;
              //we compare 'a' and 'b', the most distinct elements in arr
              while (i < a.length && a[i] == b[i]) i++;
              return a.slice(0, i);
            };

            let commonPart =
              calculateCommonPart(l.data) + (l.data.length == 1 ? ' ' : '');
            if (commonPart) {
              if (cmdLine.endsWith(' '))
                //new option comes after current cmdLine
                scope.cmdLine = cmdLine + commonPart;
              else {
                //new option replaces last partial word
                let parts = cmdLine.split(' ');
                scope.cmdLine =
                  parts.slice(0, parts.length - 1).join(' ') +
                  (parts.length > 1 ? ' ' : '') +
                  commonPart;
              }
            }

            return cmds;
          };

          let newResponsesReceived = lines => {
            let cmds = [];

            lines.forEach(l => {
              if (l.type == 'completion')
                cmds = [...cmds, ...handleCompletionLine(l)];
              else cmds.push({ type: l.type, data: l.data });
            });
            if (cmds.length) addCmd(cmds);
          };

          let click$ = Rx.Observable
            .fromEvent($document, 'click')
            .subscribe(e => {
              //focus on prompt if click on terminal and not selecting text
              scope.focused =
                $element.is(e.target) || $element.has(e.target).length;

              if (scope.focused) {
                let textSelection = document.getSelection();

                if (
                  !textSelection ||
                  textSelection.type === 'Caret' ||
                  !textSelection.focusNode ||
                  !textSelection.focusNode.data ||
                  !$(textSelection.focusNode.parentNode).is(':visible')
                )
                  //we only focus if are NOT selecting text
                  rosCommandLine.focus();
              }
            });

          //submit on 'enter'
          let enterpress$ = Rx.Observable
            .fromEvent(rosCommandLine, 'keypress')
            .filter(e => e.which === 13) //enter key only
            .filter(() => rosCommandLine.val().trim()) //filter empty commands
            .subscribe(() => handleCommand(rosCommandLine.val()));

          //browse history using up/down keys
          let upDownPress$ = Rx.Observable
            .fromEvent(rosCommandLine, 'keydown')
            .filter(e => e.which == 38 || e.which == 40) // up | down
            .map(e => e.which == 38) // up ?
            .subscribe(up => {
              if (
                (!cmdHistoryPos && !up) ||
                (up && cmdHistoryPos == cmdHistory.length)
              ) {
                //already new cmd line, or top of history => nothing to do
                return;
              }

              if (cmdHistoryPos == 1 && !up) {
                //leaving history
                scope.cmdLine = '';
                cmdHistoryPos = 0;
                return;
              }

              // moving within history
              up ? cmdHistoryPos++ : cmdHistoryPos--;
              scope.cmdLine = cmdHistory[cmdHistory.length - cmdHistoryPos];

              $timeout(() =>
                //put caret at the end, after having applied the new value of scope.cmdLine
                rosCommandLine[0].setSelectionRange(
                  scope.cmdLine.length,
                  scope.cmdLine.length
                )
              );
            });

          let completeCommand = () => {
            rosCommanderService.completeCommand(rosCommandLine.val());
          };
          //stop current execution on ctrl+c
          let ctrlC$ = Rx.Observable
            .fromEvent($document, 'keydown')
            .filter(e => e.which === 67 && e.ctrlKey) //ctrl+c only
            .subscribe(() => rosCommanderService.stopCurrentExecution());

          //initial command
          addCmd(rosCommanderService.getSessionLog());

          let tabKey$ = Rx.Observable
            .fromEvent(rosCommandLine, 'keydown')
            .filter(e => e.which === 9) //tab key
            .subscribe(e => {
              e.preventDefault();
              completeCommand();
            });

          //new ros-response received
          let rosResponses$ = rosCommanderService.rosResponses$.subscribe(
            ([msg, running]) => {
              scope.running = running;
              newResponsesReceived(msg.data);
            }
          );

          scope.$on('$destroy', () => {
            click$.unsubscribe();
            enterpress$.unsubscribe();
            ctrlC$.unsubscribe();
            rosResponses$.unsubscribe();
            upDownPress$.unsubscribe();
            tabKey$.unsubscribe();

            editorToolbarService.showRosTerminal = false;
          });
        }
      };
    }
  ]);
})();
