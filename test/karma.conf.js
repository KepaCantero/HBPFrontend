// Karma configuration
// http://karma-runner.github.io/0.12/config/configuration-file.html
// Generated on 2014-10-10 using
// generator-karma 0.8.3

process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function(config) {
  'use strict';

  config.set({
    // base path, that will be used to resolve files and exclude
    basePath: '../',

    // testing framework to use (jasmine/mocha/qunit/...)
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'node_modules/chart.js/dist/Chart.min.js',
      'node_modules/rxjs/bundles/Rx.min.js',

      // The two following files are required by gz3d.js. Since
      // order matters here, they should be in front of the bower
      // section.

      'bower_components/three.js/three.js',
      'bower_components/three.js/examples/js/postprocessing/EffectComposer.js',

      // The lines between 'bower:' and 'endbower' are filled automagically with the respective bower components.
      // Note though that several packages are excluded (as described in the Gruntfile.js).

      // bower:
      'bower_components/jquery/dist/jquery.js',
      'bower_components/angular/angular.js',
      'bower_components/angular-animate/angular-animate.js',
      'bower_components/angular-aria/angular-aria.js',
      'bower_components/angular-bbp-config/angular-bbp-config.js',
      'bower_components/angular-bootstrap-contextmenu/contextMenu.js',
      'bower_components/angular-cookies/angular-cookies.js',
      'bower_components/angular-messages/angular-messages.js',
      'bower_components/angular-material/angular-material.js',
      'bower_components/angular-resource/angular-resource.js',
      'bower_components/angular-sanitize/angular-sanitize.js',
      'bower_components/angular-toArrayFilter/toArrayFilter.js',
      'bower_components/angular-touch/angular-touch.js',
      'bower_components/codemirror/lib/codemirror.js',
      'bower_components/codemirror/mode/python/python.js',
      'bower_components/codemirror/mode/shell/shell.js',
      'bower_components/angular-ui-codemirror/ui-codemirror.js',
      'bower_components/angular-ui-router/release/angular-ui-router.js',
      'bower_components/angular.panels/dist/angular.panels.min.js',
      'bower_components/angular-smart-table/dist/smart-table.js',
      'bower_components/es5-shim/es5-shim.js',
      'bower_components/golden-layout/dist/goldenlayout.min.js',
      'bower_components/three.js/three.js',
      'bower_components/three.js/examples/js/controls/OrbitControls.js',
      'bower_components/three.js/examples/js/Detector.js',
      'bower_components/three.js/examples/js/shaders/CopyShader.js',
      'bower_components/three.js/examples/js/shaders/ConvolutionShader.js',
      'bower_components/three.js/examples/js/shaders/SSAOShader.js',
      'bower_components/three.js/examples/js/shaders/FXAAShader.js',
      'bower_components/three.js/examples/js/shaders/LuminosityShader.js',
      'bower_components/three.js/examples/js/postprocessing/EffectComposer.js',
      'bower_components/three.js/examples/js/postprocessing/RenderPass.js',
      'bower_components/three.js/examples/js/postprocessing/MaskPass.js',
      'bower_components/three.js/examples/js/postprocessing/ShaderPass.js',
      'bower_components/three.js/examples/js/postprocessing/ManualMSAARenderPass.js',
      'bower_components/three.js/examples/js/postprocessing/BloomPass.js',
      'bower_components/eventemitter2/lib/eventemitter2.js',
      'bower_components/xml2json/xml2json.js',
      'bower_components/roslibjs/build/roslib.js',
      'bower_components/lodash/lodash.js',
      'bower_components/gz3d-hbp/gz3d/build/gz3d.js',
      'bower_components/gz3d-hbp/gz3d/client/js/include/ColladaLoader.js',
      'bower_components/gz3d-hbp/gz3d/client/js/include/lookat-controls.js',
      'bower_components/gz3d-hbp/gz3d/client/js/include/avatar-controls.js',
      'bower_components/gz3d-hbp/gz3d/client/js/include/ThreeBackwardsCompatibility.js',
      'bower_components/json3/lib/json3.js',
      'bower_components/ng-file-upload/ng-file-upload.js',
      'bower_components/stats.js/build/stats.min.js',
      'bower_components/v-button/dist/v-button.js',
      'bower_components/abdmob/x2js/xml2json.min.js',
      'bower_components/SHA-1/sha1.js',
      'bower_components/angulartics/src/angulartics.js',
      'bower_components/angulartics-google-analytics/lib/angulartics-ga.js',
      'bower_components/brainvisualizer/src/brain3D.js',
      'bower_components/brainvisualizer/src/brain3Dmainview.js',
      'bower_components/brainvisualizer/src/brain3Dneuronrepresentation.js',
      'bower_components/brainvisualizer/shaders/brain3Dshaders.js',
      'bower_components/moment/moment.js',
      'bower_components/angular-uuid4/angular-uuid4.js',
      'bower_components/angular-deferred-bootstrap/angular-deferred-bootstrap.js',
      'bower_components/angular-moment/angular-moment.js',
      'bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
      'bower_components/hello/dist/hello.all.js',
      'bower_components/angular-hbp-collaboratory/angular-hbp-collaboratory.js',
      'bower_components/angular-tree-control/angular-tree-control.js',
      'bower_components/angular-mocks/angular-mocks.js',
      // endbower

      'node_modules/d3/d3.min.js',
      'node_modules/n3-charts/build/LineChart.js',
      'test/support/**/*.js',
      'app/components/**/*.modules.js', // files defining modules first
      'app/scripts/common/filters/time-filters.js', // Make sure modules used in different files are loaded before they are used
      'app/scripts/**/*.js',
      'app/components/**/*.js',
      'test/mock/**/*.js',
      'test/spec/datagenerator/*.js',
      'test/spec/**/*.js',
      'app/components/**/*.html',
      'app/views/**/*.html',

      { pattern: 'app/views/*.*', included: true, served: true }
    ],

    preprocessors: {
      // source files, that you want to generate coverage for
      // do not include tests or libraries
      // (these files will be instrumented by Istanbul)
      'app/scripts/*/**/*.js': ['coverage'],
      'app/components/**/*.js': ['coverage'],
      'app/components/**/*.html': ['ng-html2js'],
      'app/views/**/*.html': ['ng-html2js']
    },

    ngHtml2JsPreprocessor: {
      stripPrefix: 'app/',
      prependPrefix: '',

      // the name of the Angular module to create
      moduleName: 'exd.templates'
    },

    // list of files / patterns to exclude
    exclude: [],

    // web server port
    port: 9002,

    browsers: ['ChromeHeadlessNoSandbox'],
    reporters: ['progress', 'junit', 'coverage'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      }
    },

    // Which plugins to enable
    plugins: [
      'karma-chrome-launcher',
      'karma-jasmine',
      'karma-coverage',
      'karma-junit-reporter',
      'karma-ng-html2js-preprocessor',
      'karma-spec-reporter'
    ],

    specReporter: {
      maxLogLines: 5, // limit number of lines logged per test
      suppressErrorSummary: false, // do not print error summary
      suppressFailed: false, // do not print information about failed tests
      suppressPassed: true, // do not print information about passed tests
      suppressSkipped: true, // do not print information about skipped tests
      showSpecTiming: true // print the time elapsed for each spec
    },

    junitReporter: {
      outputDir: 'reports/coverage/',
      outputFile: 'unit-test.xml',
      suite: 'unit'
    },

    coverageReporter: {
      instrumenterOptions: {
        istanbul: { noCompact: true }
      },
      reporters: [
        {
          type: 'lcov',
          dir: 'reports/coverage/',
          file: 'coverage.info'
        },
        {
          type: 'cobertura',
          dir: 'reports/coverage/'
        }
      ]
    },

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false,

    colors: true,

    proxies: {
      '/views/': 'http://localhost:8000/views/',
      '/img/': 'app/img/'
    }

    // Uncomment the following lines if you are using grunt's server to run the tests
    // proxies: {
    //   '/': 'http://localhost:9000/'
    // },
    // URL root prevent conflicts with the site root
    // urlRoot: '_karma_'
  });
};
