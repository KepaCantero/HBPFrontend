(function() {
  'use strict';

  /*global BaseExperimentsService */
  class TemplateExperimentsService extends BaseExperimentsService {
    constructor(experimentProxyService, ...baseDependencies) {
      super(...baseDependencies);

      this.experimentProxyService = experimentProxyService;
    }

    getExperiments() {
      return this.experimentProxyService.getExperiments().then(experiments =>
        _.map(experiments, (exp, id) => {
          exp.id = id;
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
