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

  angular.module('exdFrontendApp').service('codeEditorsServices', [
    '$timeout',
    'userContextService',
    function($timeout, userContextService) {
      return {
        getDefaultEditorOptions: getDefaultEditorOptions,
        getEditor: getEditor,
        getEditorChild: getEditorChild,
        refreshEditor: refreshEditor,
        refreshAllEditors: refreshAllEditors,
        resetEditor: resetEditor,
        ownerOnlyOptions: ownerOnlyOptions
      };

      function getDefaultEditorOptions() {
        return {
          lineWrapping: true,
          lineNumbers: true,
          readOnly: false,
          indentUnit: 4,
          mode: 'text/x-python'
        };
      }

      function ownerOnlyOptions(options) {
        return userContextService.isOwner()
          ? options
          : _.assign(options, { readOnly: 'nocursor' });
      }

      function getEditor(id) {
        var codeMirrorDiv = document.getElementById(id).firstChild;
        return codeMirrorDiv && codeMirrorDiv.CodeMirror;
      }

      function getEditorChild(id, parent) {
        var codeMirrorDiv = parent.querySelector('#' + id).firstChild;
        return codeMirrorDiv.CodeMirror;
      }

      function refreshEditor(editor) {
        $timeout(function() {
          editor.refresh && editor.refresh();
        }, 100);
      }

      function refreshAllEditors(ids) {
        $timeout(function() {
          _.forEach(ids, function(id) {
            refreshEditor(getEditor(id));
          });
        }, 100);
      }

      function resetEditor(editor) {
        editor.clearHistory();
        editor.markClean();
      }
    }
  ]);
})();
