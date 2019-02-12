(function() {
  'use strict';

  class BaseExperimentsService {
    constructor(
      serverRefreshTimer,
      experimentSimulationService,
      storageServer,
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
      this.storageServer = storageServer;
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
        let expd = this.experimentsDict[exp.id];
        let conf = Boolean(expd && expd.configuration);
        if (!expd) {
          this.experimentsDict[exp.id] = exp;
          this.experimentsArray.push(exp);
          // Users may have changed configuration files in storage's experiment folders
        } else if (
          conf &&
          (!exp.configuration.experimentFile ||
            !expd.configuration.experimentFile)
        ) {
          expd.configuration = exp.configuration;
          expd.imageUrl = exp.configuration.experimentFile
            ? exp.imageUrl
            : undefined;
        } else if (
          conf &&
          (!exp.configuration.bibiConfSrc || !expd.configuration.bibiConfSrc)
        ) {
          expd.configuration.bibiConfSrc = exp.configuration.bibiConfSrc;
        }

        let cachedExp = this.experimentsDict[exp.id];
        cachedExp.onlyLocalServers = exp.availableServers.every(
          s => s.serverJobLocation === 'local'
        );
        ['availableServers', 'joinableServers'].forEach(
          prop => (cachedExp[prop] = exp[prop])
        );
      });

      let expIds = exps.map(experiment => experiment.id);
      this.experimentsArray = this.experimentsArray.filter(
        experiment => expIds.indexOf(experiment.id) !== -1
      );
      this.experimentsDict = _.pickBy(
        this.experimentsDict,
        (value, key) => expIds.indexOf(key) !== -1
      );

      this.experimentsDefered.notify(this.experimentsArray);
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

    getPizDaintJobs() {
      return this.experimentProxyService
        .getPizDaintJobs()
        .then(function(results) {
          return results;
        });
    }

    getPizDaintJobStatus(url) {
      return this.experimentProxyService
        .getJobStatus(url)
        .then(function(response) {
          return response.status;
        });
    }

    getPizDaintJobOutcome(url) {
      return this.experimentProxyService
        .getJobOutcome(url)
        .then(function(response) {
          return response;
        });
    }

    startPizDaintExperiment(experiment) {
      return this.experimentSimulationService
        .startPizDaintExperiment(experiment)
        .catch(fatalErrorWasShown => {
          if (!fatalErrorWasShown)
            this.clbErrorDialog.open('Error starting Piz Daint job');
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

      this.storageServer.logActivity('simulation_stop', {
        simulationID: simulation.runningSimulation.experimentID
      });

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
