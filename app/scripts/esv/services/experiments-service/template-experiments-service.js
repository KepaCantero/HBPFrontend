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
          this.experimentProxyService.getExperiments(),
          this.experimentProxyService.getSharedExperiments()
        ])
        .then(([availableServers, experiments, sharedExperiments]) => {
          var experimentsArray = _.map(experiments, (exp, id) => {
            exp.id = id;
            exp.availableServers = availableServers;
            return exp;
          });
          Object.keys(sharedExperiments).forEach(id => {
            let exp = sharedExperiments[id];
            exp.id = id;
            exp.availableServers = availableServers;
            experimentsArray.push(exp);
          });
          return experimentsArray;
        });
    }

    getExperimentImage(exp) {
      return this.experimentProxyService.getImage(exp.id);
    }
  }

  window.TemplateExperimentsService = TemplateExperimentsService;
})();
