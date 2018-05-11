(function() {
  'use strict';

  /*global BaseExperimentsService */
  class PrivateExperimentsService extends BaseExperimentsService {
    constructor(
      storageServer,
      $stateParams,
      experimentProxyService,
      ...baseDependencies
    ) {
      super(...baseDependencies);

      this.storageServer = storageServer;
      this.$stateParams = $stateParams;
      this.experimentProxyService = experimentProxyService;
    }

    getExperiments() {
      return this.storageServer
        .getExperiments()
        .then(exps => this.mapToExperiments(exps))
        .then(exps => this.fillServersDataAndDetails(exps));
    }

    mapToExperiments(exps) {
      return exps.map(exp => ({
        configuration: { maturity: 'production' },
        id: exp.uuid,
        private: true
      }));
    }

    fillServersDataAndDetails(exps) {
      return this.$q
        .all([
          this.experimentProxyService.getAvailableServers(),
          this.$q.all(
            exps.map(({ id }) =>
              this.experimentProxyService.getJoinableServers(id)
            )
          ),
          this.$q.all(exps.map(exp => this.loadExperimentDetails(exp)))
        ])
        .then(([availableServers, joinableServers, experimentsDetails]) => {
          return exps
            .map((exp, i) => i)
            .filter(i => experimentsDetails[i])
            .map(i => {
              let exp = exps[i];
              exp.availableServers = availableServers;
              exp.joinableServers = joinableServers[i];
              angular.extend(exp.configuration, experimentsDetails[i]);
              return exp;
            });
        });
    }

    getExperimentImage(exp) {
      return this.storageServer
        .getBase64Content(exp.id, exp.configuration.thumbnail, true)
        .then(imageData => 'data:image/png;base64,' + imageData);
    }

    deleteExperiment(expName) {
      return this.storageServer.deleteExperiment(expName);
    }

    loadExperimentDetails(exp) {
      return this.storageServer
        .getFileContent(exp.id, 'experiment_configuration.exc', true)
        .then(file => {
          if (!file.uuid) return this.$q.resolve(null);

          let xml = $.parseXML(file.data);
          let thumbnail = xml.getElementsByTagNameNS('*', 'thumbnail')[0];
          let thumbnailContent;
          if (thumbnail) thumbnailContent = thumbnail.textContent;
          else {
            thumbnailContent = 'No text content for thumbnail';
            console.error(
              'Experiment details: text content for thumbnail is missing'
            );
          }

          return {
            name: xml.getElementsByTagNameNS('*', 'name')[0].textContent,
            description: xml.getElementsByTagNameNS('*', 'description')[0]
              .textContent,
            thumbnail: thumbnailContent,
            timeout: parseInt(
              xml.getElementsByTagNameNS('*', 'timeout')[0].textContent
            ),
            brainProcesses: parseInt(
              xml
                .getElementsByTagNameNS('*', 'bibiConf')[0]
                .getAttribute('processes') || 1
            ),
            experimentFile: file.data,
            experimentConfiguration: ''
          };
        });
    }
  }

  window.PrivateExperimentsService = PrivateExperimentsService;
})();
