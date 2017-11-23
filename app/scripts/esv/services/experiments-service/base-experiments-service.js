(function() {
  'use strict';

  class BaseExperimentsService {
    constructor(
      serverRefreshTimer,
      experimentSimulationService,
      uptimeFilter,
      nrpUser,
      clbErrorDialog,
      FAILED_1_SERVER_ERROR,
      FAIL_ALL_SERVERS_ERROR,
      $interval,
      $q
    ) {
      if (new.target === BaseExperimentsService)
        throw new TypeError('BaseExperimentsService is an abstract class');

      this.experimentSimulationService = experimentSimulationService;
      this.uptimeFilter = uptimeFilter;
      this.nrpUser = nrpUser;
      this.clbErrorDialog = clbErrorDialog;
      this.FAILED_1_SERVER_ERROR = FAILED_1_SERVER_ERROR;
      this.FAIL_ALL_SERVERS_ERROR = FAIL_ALL_SERVERS_ERROR;
      this.$interval = $interval;
      this.serverRefreshTimer = serverRefreshTimer;
      this.$q = $q;
    }

    get experiments() {
      return this.experimentsDefered.promise;
    }

    initialize() {
      this.experimentsArray = [];
      this.experimentsDefered = this.$q.defer();
      this.experimentsDict = {};
      this.stoppingExperiments = {};

      this.updateExperimentsInterval = this.$interval(
        () => this.updateExperiments(),
        this.serverRefreshTimer
      );
      this.updateExperiments();
    }

    updateExperiments() {
      this.getExperiments().then(exps => {
        this.syncExperimentsList(exps);
        this.updateMissingImages();
        this.updateSimulations();
      });
    }

    syncExperimentsList(exps) {
      exps.forEach(exp => {
        if (!this.experimentsDict[exp.id]) {
          this.experimentsDict[exp.id] = exp;
          this.experimentsArray.push(exp);
        }
        let cachedExp = this.experimentsDict[exp.id];
        cachedExp.onlyLocalServers = exp.availableServers.every(
          s => s.serverJobLocation === 'local'
        );
        ['availableServers', 'joinableServers'].forEach(
          prop => (cachedExp[prop] = exp[prop])
        );
      });
      this.experimentsDefered.resolve(this.experimentsArray);
    }

    updateMissingImages() {
      this.experimentsArray.forEach(exp => {
        if (exp.imageUrl !== undefined) return;
        this.getExperimentImage(exp)
          .then(imageUrl => (exp.imageUrl = imageUrl))
          .catch(() => (exp.imageUrl = false));
      });
    }
    updateSimulations() {
      this.experimentsArray.forEach(exp =>
        exp.joinableServers.forEach(sim => {
          sim.stopping =
            this.stoppingExperiments[sim.server] &&
            this.stoppingExperiments[sim.server][
              sim.runningSimulation.simulationID
            ];
          sim.uptime = this.uptimeFilter(sim.runningSimulation.creationDate);
          this.nrpUser
            .getOwnerDisplayName(sim.runningSimulation.owner)
            .then(owner => (sim.owner = owner));
        })
      );
    }

    startExperiment(experiment, launchSingleMode, reservation) {
      return this.experimentSimulationService
        .startNewExperiment(experiment, launchSingleMode, reservation)
        .catch(fatalErrorWasShown => {
          if (!fatalErrorWasShown)
            this.clbErrorDialog.open(
              experiment.devServer
                ? this.FAILED_1_SERVER_ERROR
                : this.FAIL_ALL_SERVERS_ERROR
            );

          return this.$q.reject(fatalErrorWasShown);
        });
    }

    stopExperiment(simulation) {
      simulation.stopping = true;
      if (!this.stoppingExperiments[simulation.server])
        this.stoppingExperiments[simulation.server] = {};
      this.stoppingExperiments[simulation.server][
        simulation.runningSimulation.simulationID
      ] = true;

      return this.experimentSimulationService.stopExperimentOnServer(
        simulation
      );
    }

    destroy() {
      this.$interval.cancel(this.updateExperimentsInterval);
    }

    getExperiments() {
      throw 'not implemented';
    }
    getExperimentImage() {
      throw 'not implemented';
    }
  }

  window.BaseExperimentsService = BaseExperimentsService;
})();
