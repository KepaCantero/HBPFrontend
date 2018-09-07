'use strict';
window.bbpConfig = {
  api: {
    task: {
      v1: 'https://services-test.humanbrainproject-test.eu/task/v0/api',
      v0: 'https://services-test.humanbrainproject-test.eu/task/v0/api'
    },
    bluepy: {
      v0: 'https://services-test.humanbrainproject-test.eu/bluepy/v0/api'
    },
    simconfig: {
      v0: 'https://services-test.humanbrainproject-test.eu/bluepy/v0/api'
    },
    user: {
      v1: 'https://services-test.humanbrainproject-test.eu/oidc/v0/api',
      v0: 'https://services-test.humanbrainproject-test.eu/oidc/v0/api'
    },
    document: {
      v1: 'https://services-test.humanbrainproject-test.eu/document/v0/api',
      v0: 'https://services-test.humanbrainproject-test.eu/document/v0/api'
    },
    provenance: {
      v2: 'https://services-test.humanbrainproject-test.eu/provenance/v0/api',
      v1: 'https://services-test.humanbrainproject-test.eu/provenance/v0/api',
      v0: 'https://services-test.humanbrainproject-test.eu/provenance/v0/api'
    },
    collabContextManagement: {
      url: 'https://neurorobotics-dev.humanbrainproject.eu/cle/1/api'
    },
    proxy: {
      url: 'http://proxy'
    },
    slurmmonitor: {
      url: 'http://bbpsrvc44.cscs.ch:8080'
    },
    collab: {
      v0: 'https://services.humanbrainproject.eu/collab/v0'
    },
    onlinePlatform: {
      releaseNotes: 'http://148.187.97.48/releasenotes/',
      checkUpdate: 'http://148.187.97.48/proxy/checkupdate'
    }
  },
  auth: {
    url: 'https://services-test.humanbrainproject-test.eu/oidc',
    clientId: 'test-client-id'
  },
  collab: {
    collabIds: {
      neuroroboticsCollabBaseUrl: 'http://localhost',
      pagesId: {
        test: '/testUrl'
      }
    }
  },
  up: {
    sites: [
      {
        name: 'Public',
        url: 'https://humanbrainproject.eu'
      },
      {
        name: 'Unified Platform',
        url: 'http://localhost:9999'
      },
      {
        name: 'Collaboration',
        url: 'https://collaboration.humanbrainproject.eu'
      },
      {
        name: 'Education',
        url: 'https://education.humanbrainproject.eu'
      }
    ],
    apps: [
      {
        name: 'Different Domain',
        type: 'external',
        url: 'http://localhost:9880'
      },
      {
        name: 'Same Domain',
        type: 'external',
        url: 'http://localhost:9999'
      }
    ],
    resourceUrlWhitelist: [
      'https://humanbrainproject.eu/**',
      'https://*.humanbrainproject.eu/**',
      'http://localhost:*/'
    ]
  },
  'ros-topics': {
    spikes: '/monitor/spike_recorder',
    joint: '/joint_states',
    status: '/ros_cle_simulation/status',
    cleError: '/ros_cle_simulation/cle_error',
    logs: '/ros_cle_simulation/logs'
  },
  'ros-services': {
    modelProperties: {
      name: '/gazebo/get_model_properties',
      type: 'gazebo_msgs/GetModelProperties',
      param: 'model_name'
    },
    jointProperties: {
      name: '/gazebo/get_joint_properties',
      type: 'gazebo_msgs/GetJointProperties',
      param: 'joint_name'
    }
  }
};
