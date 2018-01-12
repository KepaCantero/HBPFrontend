(function() {
  'use strict';

  /*global BaseExperimentsService */
  class TemplateExperimentsService extends BaseExperimentsService {
    constructor(experimentProxyService, $q, ...baseDependencies) {
      super(...baseDependencies);

      this.experimentProxyService = experimentProxyService;
      this.$q = $q;
    }

    getExperiments() {
      return this.$q
        .all([
          this.experimentProxyService.getAvailableServers(),
          this.experimentProxyService.getExperiments()
        ])
        .then(([availableServers, experiments]) =>
          _.map(experiments, (exp, id) => {
            exp.id = id;
            exp.availableServers = availableServers;
            return exp;
          })
        );
    }

    getExperimentImage(exp) {
      return this.experimentProxyService.getImage(exp.id);
    }
  }

  window.TemplateExperimentsService = TemplateExperimentsService;
})();
