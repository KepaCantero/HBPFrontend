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

  class UpdateChecker {
    get CHECK_UPDATE_URL() {
      return this.bbpConfig.get('api.versionCheck.checkUpdate');
    }

    get CHECK_UPDATE_ENABLED() {
      return !!this.bbpConfig.get('api.versionCheck.checkEnabled', true);
    }

    get RELEASE_NOTES_URL() {
      return this.bbpConfig.get('api.versionCheck.releaseNotes');
    }

    static get LOCAL_STORAGE_KEYS() {
      return {
        version: 'LATEST_VERSION',
        time: 'LATEST_VERSION_CHECKED_TIME'
      };
    }

    static get CHECK_FREQUENCY() {
      // periodiocity in seconds
      return 12 * 60 * 60; // 12h
    }

    constructor(nrpFrontendVersion, $http, $q, bbpConfig) {
      this.nrpFrontendVersion = nrpFrontendVersion;
      this.$http = $http;
      this.$q = $q;
      this.bbpConfig = bbpConfig;
    }

    /**
     * Public method that compares the current version with the latest version online
     *
     * Returns: The newer version number if there is a new version, 'null' otherwise
     */
    checkForNewVersion() {
      return this.getLocalVersion()
        .then(localVersion =>
          this.$q.all([localVersion, this.getReferenceVersion(localVersion)])
        )
        .then(([localVersion, refVersion]) => {
          if (this.isNewVersion(localVersion, refVersion)) {
            return refVersion;
          }
          return null; // no new version
        });
    }

    getReferenceVersion(localVersion) {
      const [refVersion, cachedInvalid] = this.getCachedRefVersion();

      if (cachedInvalid)
        return this.getOnlineRefVersion(
          localVersion,
          !!refVersion
        ).then(refVersion => {
          this.saveCachedRefVersion(refVersion);
          return refVersion;
        });

      return this.$q.resolve(refVersion);
    }

    getOnlineRefVersion(localVersion, hasCachedVersion) {
      return this.$http
        .post(this.CHECK_UPDATE_URL, {
          returningUser: hasCachedVersion
        })
        .then(({ data: { version } }) => version);
    }

    getLocalVersion() {
      return this.nrpFrontendVersion
        .get()
        .$promise.then(({ version }) => version);
    }

    /**
     * Tries loading the cached information about the NRP latest reference version
     *
     * Returns: [version, invalid], where 'version' is the cached version and 'invalid' is a boolean validity flag (true => invalid)
     */
    getCachedRefVersion() {
      const lastCheckTimestamp = parseInt(
        localStorage.getItem(UpdateChecker.LOCAL_STORAGE_KEYS.time)
      );
      const tooOld =
        isNaN(lastCheckTimestamp) ||
        Date.now() - new Date(lastCheckTimestamp) >
          UpdateChecker.CHECK_FREQUENCY * 1000;

      const cachedVersion = localStorage.getItem(
        UpdateChecker.LOCAL_STORAGE_KEYS.version
      );

      return [cachedVersion, tooOld];
    }

    saveCachedRefVersion(referenceVersion) {
      localStorage.setItem(UpdateChecker.LOCAL_STORAGE_KEYS.time, Date.now());
      localStorage.setItem(
        UpdateChecker.LOCAL_STORAGE_KEYS.version,
        referenceVersion
      );
    }

    isNewVersion(local, ref) {
      const localParts = local.split('.');
      const refParts = ref.split('.');

      for (let i = 0; i < Math.max(localParts.length, refParts.length); i++) {
        let localPart = parseInt(localParts[i]);
        let refPart = parseInt(refParts[i]);
        if (isNaN(localPart) != isNaN(refPart)) return isNaN(localPart);

        if (localPart != refPart) return refPart > localPart;
      }
      return false;
    }

    onExit() {
      this.logSubscription.unsubscribe();
    }
  }

  UpdateChecker.$inject = ['nrpFrontendVersion', '$http', '$q', 'bbpConfig'];

  angular.module('exdFrontendApp').service('updateChecker', UpdateChecker);
})();
