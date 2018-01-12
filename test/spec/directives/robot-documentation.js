'use strict';

describe('Directive: robotDocViewer', function() {
  beforeEach(module('exdFrontendApp'));
  beforeEach(module('exd.templates'));

  var $scope, viewer;

  var configMock = {
    model: {
      name: 'HBP Clearpath Robotics Husky A200',
      version: '1.0',
      license: 'GPL',
      sdf: { _version: '1.5', __text: 'model.sdf' },
      author: {
        name: 'Ryan Gariepy',
        email: 'rgariepy@clearpathrobotics.com'
      },
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      website: 'http://wiki.ros.org/Robots/Husky',
      sensors: {
        sensor: [
          { _name: 'Super camera', _type: 'camera' },
          { _name: 'A funky lazer', _type: 'laser' }
        ]
      },
      actuators: {
        actuator: [
          { _name: '4 wheels', _type: 'motor' },
          { _name: 'Ball cannon', _type: 'pneumatic' }
        ]
      },
      publication: [
        {
          _title:
            'Semi-Supervised Spiking Neural Network for One-Shot Object Appearance Learning',
          _authors:
            'J. Kaiser, R. Stal, A. Subramoney, A. Roennau, R. Dillmann',
          _url:
            'https://link.springer.com/chapter/10.1007%2F978-3-662-54712-0_10'
        },
        {
          _title:
            'Scaling up liquid state machines to predict over address events from dynamic vision sensors',
          _authors:
            'I. Peric, R. Hangu, J. Kaiser, S. Ulbrich, A. Roennau, J. M. Zoellner, R. Dillman',
          _url:
            'https://www.frontiersin.org/articles/10.3389/fninf.2017.00007/full'
        }
      ],
      youtube: [
        {
          _title: 'Tutorial - Overview of the HBP Neurorobotics Platform',
          '_youtube-id': 'uAXzS7SPFG4'
        },
        {
          _title: 'Third HBP Neurorobotics Workshop @TUM - Munich',
          '_youtube-id': 'R0D82QooSs8'
        }
      ],
      picture: [
        {
          _title: 'Home page',
          _url:
            'https://developer.humanbrainproject.eu/docs/projects/HBP%20Neurorobotics%20Platform/0.9/_images/gz3d-interact.png'
        },
        {
          _title: 'Wizzard',
          _url:
            'https://developer.humanbrainproject.eu/docs/projects/HBP%20Neurorobotics%20Platform/1.2/_images/gz3d-env-editor.png'
        }
      ]
    }
  };

  beforeEach(
    inject(function($rootScope, $compile) {
      $scope = $rootScope.$new();
      $scope.config = configMock;

      viewer = $compile(
        '<robot-doc-viewer config="config"></robot-doc-viewer>'
      )($scope);
      $scope.$digest();
    })
  );

  it('should show HTML elements', function() {
    expect(viewer.find('.publication').length).toBe(2);
    expect(viewer.find('.author').length).toBe(1);
    expect(viewer.find('.sensor').length).toBe(2);
    expect(viewer.find('.actuator').length).toBe(2);
  });
});
