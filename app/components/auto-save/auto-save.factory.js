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

  class AutoSaveService {
    static get delay() {
      return 2000; //ms
    }

    constructor(factory, name) {
      this.dirty = false;
      this.factory = factory;
      this.name = name;
    }

    triggerSave() {
      this.factory.saving(this.name);
      this.savecb()
        .then(() => (this.dirty = false))
        .finally(() => this.factory.saving());
    }

    setDirty() {
      this.dirty = true;

      if (!this.saveDebounced)
        this.saveDebounced = _.debounce(
          () => this.triggerSave(),
          AutoSaveService.delay
        );
      this.saveDebounced();
    }

    isDirty() {
      return this.dirty;
    }

    dispose() {
      this.saveDebounced && this.saveDebounced.cancel();
    }

    reset() {
      this.saveDebounced && this.saveDebounced.cancel();
    }

    onsave(cb) {
      this.savecb = cb;
    }
  }

  class AutoSaveFactory {
    constructor() {
      this.services = {};
      window.addEventListener('beforeunload', e => this.hookPageUnload(e));
    }

    hookPageUnload(e) {
      let dirty = _.some(this.services, service => service.isDirty());
      if (dirty)
        return (e.returnValue =
          'Saving in progress. PLease wait a few seconds before exiting.');
    }

    onSaving(cb) {
      this.cb = cb;
    }

    saving(type) {
      this.cb && this.cb(type);
    }

    createService(name) {
      return (this.services[name] = new AutoSaveService(this, name));
    }
  }

  angular.module('exdFrontendApp').factory('autoSaveFactory', AutoSaveFactory);
})();
