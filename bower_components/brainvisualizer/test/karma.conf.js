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
      'src/*.js',
      'lib/three.js',
      'shaders/*.js',
      'test/brainvisualizer.js',
      'node_modules/lodash/lodash.js'
    ],


    preprocessors: {
        // source files, that you want to generate coverage for
        // do not include tests or libraries
        // (these files will be instrumented by Istanbul)
        'src/*.js': ['coverage'],
    },

    // list of files / patterns to exclude
    exclude: [],

    // web server port
    port: 9002,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['ChromeHeadlessNoSandbox'],

    customLaunchers: {
        ChromeHeadlessNoSandbox: {
          base: 'ChromeHeadless',
          flags: ['--no-sandbox']
        }
    },

    reporters: ['progress', 'junit', 'coverage'],

    // Which plugins to enable
    plugins: [
        'karma-chrome-launcher',
        'karma-jasmine',
        'karma-coverage',
        'karma-junit-reporter',
        'karma-ng-html2js-preprocessor'
    ],

    junitReporter: {
        outputDir: 'reports/coverage/',
        outputFile: 'unit-test.xml',
        suite: 'unit'
    },

    coverageReporter: {
        reporters: [
            {
                type : 'lcov',
                dir:   'reports/coverage/',
                file : 'coverage.info'
            },
            {
                type : 'cobertura',
                dir:   'reports/coverage/'
            }
        ]
    },

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: true,

    colors: true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_DEBUG,

    proxies : {
    },

    // Uncomment the following lines if you are using grunt's server to run the tests
    // proxies: {
    //   '/': 'http://localhost:9000/'
    // },
    // URL root prevent conflicts with the site root
    // urlRoot: '_karma_'
  });
};
