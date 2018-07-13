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
      return this.storageServer.getExperimentConfig(exp.id).then(details => {
        if (!details.thumbnail) {
          console.error(
            'Experiment details: the text content for thumbnail is missing'
          );
        }

        if (!details.name) {
          details.name = 'No name available';
          console.error('Experiment details: the experiment name is missing');
        }

        if (!details.description) {
          details.description = 'No description available';
          console.error(
            'Experiment details: the experiment description is missing'
          );
        }

        if (!details.timeout) {
          details.timeout = 'Undefined timeout value';
          console.error('Experiment details: the timeout value is missing');
        } else {
          details.timeout = parseInt(details.timeout);
        }

        if (!details.brainProcesses && details.bibiConfSrc) {
          details.brainProcesses = 1;
        }

        details.experimentConfiguration = '';
        details.privateStorage = true;
        return details;
      });
    }
  }

  window.PrivateExperimentsService = PrivateExperimentsService;
})();
