(function() {
  'use strict';

  /*global BaseExperimentsService */
  class PrivateExperimentsService extends BaseExperimentsService {
    constructor($stateParams, experimentProxyService, ...baseDependencies) {
      super(...baseDependencies);

      this.$stateParams = $stateParams;
      this.experimentProxyService = experimentProxyService;
    }

    getExperiments() {
      return this.storageServer
        .getExperiments()
        .then(exps => exps.map(exp => this.checkConfiguration(exp)))
        .then(exps => this.fillServersDataAndDetails(exps));
    }

    fillServersDataAndDetails(exps) {
      return this.experimentProxyService
        .getAvailableServers()
        .then(availableServers =>
          exps.map((exp, i) => i).map(i => {
            let exp = exps[i];
            exp.availableServers = availableServers;
            return exp;
          })
        );
    }

    getExperimentImage(exp) {
      return this.storageServer
        .getBase64Content(exp.id, exp.configuration.thumbnail, true)
        .then(imageData => 'data:image/png;base64,' + imageData);
    }

    deleteExperiment(expName) {
      return this.storageServer.deleteExperiment(expName);
    }

    checkConfiguration(exp) {
      const details = exp.configuration;
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
      return exp;
    }
  }

  window.PrivateExperimentsService = PrivateExperimentsService;
})();
