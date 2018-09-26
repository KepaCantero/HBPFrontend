/* eslint-env node */
// Generated on 2014-10-10 using generator-hbp-angular 0.0.1
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function(grunt) {
  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);
  var serveStatic = require('serve-static');

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Configurable paths for the application
  var appConfig = {
    app: require('./bower.json').appPath || 'app',
    dist: 'dist'
  };

  var bbpConfig = grunt.file.readJSON(
    grunt.file.exists('app/config.json')
      ? 'app/config.json'
      : 'app/config.json.sample'
  );

  var secret = grunt.file.readJSON(
    grunt.file.exists('test_e2e/secret.json')
      ? 'test_e2e/secret.json'
      : 'test_e2e/secret.json.sample'
  );

  var os = require('os');
  var ifaces = os.networkInterfaces();
  var lookupIpAddress = null;
  var ipAddress = null;
  for (var dev in ifaces) {
    if (dev === 'eth0') {
      lookupIpAddress = ifaces[dev];
    }
  }
  for (var details in lookupIpAddress) {
    if (lookupIpAddress[details].family === 'IPv4') {
      ipAddress = lookupIpAddress[details].address;
    }
  }

  // Define the configuration for all the tasks
  grunt.initConfig({
    // Project settings
    yeoman: appConfig,
    bbpConfig: bbpConfig,
    secret: secret,
    pkg: grunt.file.readJSON('package.json'),
    gerritBranch: process.env.GERRIT_BRANCH,
    noImagemin: false,

    // Protractor settings
    protractor: {
      options: {
        configFile: 'test_e2e/conf.js', // Default config file
        keepAlive: true // If false, the grunt process stops when the test fails.
      },
      remote: {
        options: {
          args: {
            seleniumAddress: 'http://bbplxviz02.epfl.ch:4444/wd/hub',
            params: {
              ipAddress: ipAddress,
              login: {
                user: '<%= secret.username %>',
                password: '<%= secret.password %>'
              }
            }
          }
        }
      }
    },

    // Watches files for changes and runs tasks based on the changed files
    watch: {
      bower: {
        files: ['bower.json'],
        tasks: ['wiredep']
      },
      js: {
        files: ['<%= yeoman.app %>/**/*.js'],
        tasks: ['newer:eslint:all'],
        options: {
          livereload: '<%= connect.options.livereload %>'
        }
      },
      jsTest: {
        files: ['test/spec/**/*.js'],
        tasks: ['newer:eslint:test', 'karma:unit']
      },
      compass: {
        files: ['<%= yeoman.app %>/**/*.{scss,sass}'],
        tasks: ['compass:server', 'autoprefixer']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>'
        },
        files: [
          '<%= yeoman.app %>/**/*.html',
          '.tmp/**/*.css',
          '<%= yeoman.app %>/img/**/*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },

    // The actual grunt server settings
    connect: {
      options: {
        port: 9001,
        hostname: '*',
        livereload: 35729,
        middleware: function(connect) {
          return [
            serveStatic('.tmp'),
            connect().use(
              '/bower_components',
              serveStatic('./bower_components')
            ),
            connect().use('/node_modules', serveStatic('./node_modules')),
            serveStatic(appConfig.app),
            (req, res, next) =>
              req.url == '/package.json'
                ? res.end(grunt.file.read('.' + req.url))
                : next()
          ];
        }
      },
      livereload: {
        options: {
          open: {
            target: 'http://localhost:<%= connect.options.port %>/#/esv-private'
          },
          protocol: 'http'
        }
      },
      livereloadHttps: {
        options: {
          open: {
            target:
              'https://localhost:<%= connect.options.port %>/#/esv-private'
          },
          protocol: 'https'
        }
      },
      e2etest: {
        options: {
          hostname: '0.0.0.0' // Accessible through 'localhost'
        }
      },
      test: {
        options: {
          port: 9001,
          middleware: function(connect) {
            return [
              serveStatic('.tmp'),
              serveStatic('test'),
              connect().use(
                '/bower_components',
                serveStatic('./bower_components')
              ),
              connect().use('/node_modules', serveStatic('./node_modules')),
              serveStatic(appConfig.app)
            ];
          }
        }
      },
      dist: {
        options: {
          open: {
            target: 'http://localhost:<%= connect.options.port %>/#/esv-private'
          },
          middleware: null,
          base: '<%= yeoman.dist %>'
        }
      }
    },

    // Make sure code styles are up to par and there are no obvious mistakes
    eslint: {
      options: {
        configFile: '.eslintrc.json'
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= yeoman.app %>/scripts/**/*.js',
          '<%= yeoman.app %>/components/**/*.js'
        ]
      },
      test: {
        options: {
          configFile: 'test/.eslintrc.json'
        },
        src: ['test/spec/**/*.js']
      }
    },

    // Empties folders to start fresh
    clean: {
      dist: {
        files: [
          {
            dot: true,
            src: [
              '.tmp',
              '<%= yeoman.dist %>/**/*',
              '!<%= yeoman.dist %>/.git*'
            ]
          }
        ]
      },
      server: {
        files: [
          {
            src: [
              '.tmp',
              '<%= yeoman.app %>/style' // removes png files copied from bower_components/gz3d-hbp/gz3d/client/style/images [NRRPLT-3145]
            ]
          }
        ]
      }
    },

    // Add vendor prefixed styles
    autoprefixer: {
      options: {
        browsers: ['last 1 version']
      },
      dist: {
        files: [
          {
            expand: true,
            cwd: '.tmp/',
            src: '**/*.css',
            dest: '.tmp/'
          }
        ]
      }
    },

    // Automatically inject Bower components into the app
    wiredep: {
      app: {
        src: ['<%= yeoman.app %>/index.html'],
        ignorePath: /\.\.\//
      },
      test: {
        src: 'test/karma.conf.js',
        exclude: ['bootstrap-sass-official', 'angular-scenario'],
        devDependencies: true,
        // We have to use a small hack here: We match also for the first 'b' in the ignorePath. This pattern will
        // then be removed in the {{filePath}} below on replace and we add it again there. This is necessary due
        // to the fact that the pattern without the 'b' does exclude jquery (at least). Still we considered this
        // hack a better solution than doing the dependency handling in karma.conf.js manually!
        ignorePath: /\.\.\/b/,
        fileTypes: {
          js: {
            block: /(([\s\t]*)\/\/\s*bower:*(\S*))(\n|\r|.)*?(\/\/\s*endbower)/gi,
            detect: {
              js: /'(.*\.js')/gi
            },
            replace: {
              js: "'b{{filePath}}',"
            }
          }
        }
      },
      sass: {
        src: ['<%= yeoman.app %>/**/*.{scss,sass}'],
        ignorePath: /(\.\.\/){1,2}bower_components\//
      }
    },

    // Compiles Sass to CSS and generates necessary files if requested
    compass: {
      options: {
        sassDir: '<%= yeoman.app %>',
        cssDir: '.tmp',
        generatedImagesDir: '.tmp/img/generated',
        imagesDir: '<%= yeoman.app %>/img',
        javascriptsDir: '<%= yeoman.app %>',
        fontsDir: '<%= yeoman.app %>/styles/fonts',
        importPath: [
          '<%= yeoman.app %>/../bower_components',
          '<%= yeoman.app %>/../bower_components/hbp-collaboratory-theme/dist/sass'
        ],
        httpImagesPath: '/img',
        httpGeneratedImagesPath: '/img/generated',
        httpFontsPath: '/styles/fonts',
        relativeAssets: false,
        assetCacheBuster: false,
        raw: "Encoding.default_external = 'utf-8'\n"
      },
      dist: {
        options: {
          generatedImagesDir: '<%= yeoman.dist %>/img/generated'
        }
      },
      server: {
        options: {
          debugInfo: true
        }
      }
    },

    // Renames files for browser caching purposes
    filerev: {
      dist: {
        src: [
          '<%= yeoman.dist %>/**/*.js',
          '<%= yeoman.dist %>/**/*.css',
          '<%= yeoman.dist %>/img/**/*.{png,jpg,jpeg,gif,webp,svg}',
          '<%= yeoman.dist %>/styles/fonts/*',
          '!<%= yeoman.dist %>/img/tips/*.*',
          '!<%= yeoman.dist %>/img/common/preview*.png',
          '!<%= yeoman.dist %>/img/esv/keyboard-control.svg',
          '!<%= yeoman.dist %>/img/common/intro-get-started.png',
          '!<%= yeoman.dist %>/img/demo/thumbnails/*',
          '!<%= yeoman.dist %>/img/common/intro-bg.jpg',
          '!<%= yeoman.dist %>/img/demo/text-slide-background.jpg',
          '!<%= yeoman.dist %>/img/3denv/**/*.{png,jpg,jpeg,gif,webp,svg,dae}',
          '!<%= yeoman.dist %>/img/brainvisualizer/**/*.{png,jpg,jpeg,gif,webp,svg}',
          '!<%= yeoman.dist %>/img/esv/objects/**/*.{png,jpg,jpeg,gif,webp,svg}',
          '!<%= yeoman.dist %>/img/esv/envsections/**/*.{png,jpg,jpeg,gif,webp,svg}'
        ]
      }
    },

    // Reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Creates configurations in memory so
    // additional tasks can operate on them
    useminPrepare: {
      html: ['<%= yeoman.app %>/**/*.html'],
      options: {
        dest: '<%= yeoman.dist %>',
        flow: {
          html: {
            steps: {
              js: ['concat', 'uglifyjs'],
              css: ['cssmin']
            },
            post: {}
          }
        }
      }
    },
    // Performs rewrites based on rev and the useminPrepare configuration
    usemin: {
      html: ['<%= yeoman.dist %>/**/*.html'],
      css: ['<%= yeoman.dist %>/**/*.css'],
      htmlCustomImageDirectives: ['<%= yeoman.dist %>/**/*.html'],
      options: {
        assetsDirs: ['<%= yeoman.dist %>'],
        patterns: {
          htmlCustomImageDirectives: [
            [
              /(img\/.*?\.(?:gif|jpeg|jpg|png|webp|svg))/gm,
              'Update the JS to reference our revved images'
            ]
          ]
        }
      }
    },

    // The following *-min tasks will produce minified files in the dist folder
    // By default, your `index.html`'s <!-- Usemin block --> will take care of
    // minification. These next options are pre-configured if you do not wish
    // to use the Usemin blocks.
    // cssmin: {
    //   dist: {
    //     files: {
    //       '<%= yeoman.dist %>/styles/main.css': [
    //         '.tmp/styles/**/*.css'
    //       ]
    //     }
    //   }
    // },
    // uglify: {
    //   dist: {
    //     files: {
    //       '<%= yeoman.dist %>/scripts/scripts.js': [
    //         '<%= yeoman.dist %>/scripts/scripts.js'
    //       ]
    //     }
    //   }
    // },
    // concat: {
    //   dist: {}
    // },

    imagemin: {
      dist: {
        files: [
          {
            expand: true,
            cwd: '<%= yeoman.app %>/img',
            src: '**/*.{png,jpg,jpeg,gif,dae}',
            dest: '<%= yeoman.dist %>/img'
          }
        ]
      }
    },

    svgmin: {
      dist: {
        files: [
          {
            expand: true,
            cwd: '<%= yeoman.app %>/img',
            src: '**/*.svg',
            dest: '<%= yeoman.dist %>/img'
          }
        ]
      }
    },

    htmlmin: {
      dist: {
        options: {
          collapseWhitespace: true,
          conservativeCollapse: true,
          collapseBooleanAttributes: true,
          removeCommentsFromCDATA: true,
          removeOptionalTags: true
        },
        files: [
          {
            expand: true,
            cwd: '<%= yeoman.dist %>',
            src: ['*.html', '**/*.html'],
            dest: '<%= yeoman.dist %>'
          }
        ]
      }
    },

    // ng-annotate tries to make the code safe for minification automatically
    // by using the Angular long form for dependency injection.
    ngAnnotate: {
      dist: {
        files: [
          {
            expand: true,
            cwd: '.tmp/concat',
            src: ['*.js', '!oldieshim.js'],
            dest: '.tmp/concat'
          }
        ]
      }
    },

    // Replace Google CDN references
    cdnify: {
      dist: {
        html: ['<%= yeoman.dist %>/*.html']
      }
    },

    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [
          {
            expand: true,
            dot: true,
            cwd: '<%= yeoman.app %>',
            dest: '<%= yeoman.dist %>',
            src: [
              '*.{ico,png,txt}',
              '.htaccess',
              '*.html',
              'data-neurorobotics.json',
              'config.json',
              '**/*.{html,json}',
              'img/**/*.{webp}',
              'partials/**/*.html',
              'fonts/*',
              'data/**/*'
            ]
          },
          {
            expand: true,
            cwd: '.tmp/img',
            dest: '<%= yeoman.dist %>/img',
            src: ['generated/*']
          },
          {
            expand: true,
            cwd: 'bower_components/bootstrap-sass-official/assets/',
            src: 'fonts/bootstrap/*',
            dest: '<%= yeoman.dist %>'
          },
          {
            expand: true,
            cwd: 'bower_components/font-awesome/',
            src: 'fonts/*',
            dest: '<%= yeoman.dist %>'
          },
          {
            // copy hbpcommon assets to dist
            expand: true,
            cwd: '.',
            src: 'bower_components/angular-hbp-common/dist/assets/**/*.*',
            dest: '<%= yeoman.dist %>'
          },
          {
            // copy treecontrol assets to dist
            expand: true,
            cwd: '.',
            src: 'bower_components/angular-tree-control/*/**/*.*',
            dest: '<%= yeoman.dist %>'
          },
          {
            // copy hbp-collaboratory-theme assets to dist
            expand: true,
            cwd: '.',
            src: 'bower_components/hbp-collaboratory-theme/dist/fonts/**/*.*',
            dest: '<%= yeoman.dist %>'
          },
          {
            expand: true,
            cwd: 'bower_components/gz3d-hbp/gz3d/client/style/images',
            src: [
              // the following files are needed by gz3d [NRRPLT-3145]
              'icon_background.png',
              'joints.png',
              'rotate.png',
              'translate.png',
              'transparent.png',
              'trash.png',
              'wireframe.png'
            ],
            dest: '<%= yeoman.dist %>/style/images'
          },
          {
            expand: true,
            cwd: 'node_modules/n3-charts/build',
            src: ['LineChart.min.css', 'LineChart.min.js'],
            dest: '<%= yeoman.dist %>/node_modules/n3-charts/build'
          },
          {
            expand: true,
            cwd: 'node_modules/d3',
            src: ['d3.min.js'],
            dest: '<%= yeoman.dist %>/node_modules/d3'
          },
          {
            expand: true,
            cwd: 'node_modules/rxjs/bundles',
            src: ['Rx.min.js'],
            dest: '<%= yeoman.dist %>/node_modules/rxjs/bundles'
          },
          {
            expand: true,
            cwd: 'node_modules/chart.js/dist',
            src: ['Chart.min.js'],
            dest: '<%= yeoman.dist %>/node_modules/chart.js/dist'
          },
          {
            expand: true,
            cwd: '.',
            src: ['package.json'],
            dest: '<%= yeoman.dist %>'
          }
        ]
      },
      styles: {
        expand: true,
        cwd: '<%= yeoman.app %>/',
        dest: '.tmp/',
        src: '**/*.css'
      },
      images: {
        expand: true,
        cwd: '<%= yeoman.app %>/img',
        dest: '<%= yeoman.dist %>/img',
        src: '**/*.{png,jpg,jpeg,gif,webp}'
      },
      gz3dImages: {
        expand: true,
        cwd: 'bower_components/gz3d-hbp/gz3d/client/style/images',
        src: [
          // the following files are needed by gz3d [NRRPLT-3145]
          'icon_background.png',
          'joints.png',
          'rotate.png',
          'translate.png',
          'transparent.png',
          'trash.png',
          'wireframe.png'
        ],
        dest: '<%= yeoman.app %>/style/images'
      },
      fontawesome: {
        expand: true,
        cwd: 'bower_components/font-awesome/',
        src: 'fonts/*',
        dest: '<%= yeoman.app %>'
      }
    },

    // Run some tasks in parallel to speed up the build process
    concurrent: {
      server: ['compass:server'],
      test: ['compass'],
      dist: [
        'compass:dist',
        //'imagemin', (disable since we have a bug: name are not replaced in js file.)
        'svgmin'
      ]
    },

    // Test settings
    karma: {
      options: {
        configFile: 'test/karma.conf.js',
        singleRun: true,
        browserNoActivityTimeout: 30000,
        browserDisconnectTolerance: 2,
        specReporter: { failFast: true }
      },
      unit: {
        logLevel: 'ERROR'
      },
      debug: {
        logLevel: 'INFO'
      },
      chrome: {
        browsers: ['Chrome'],
        singleRun: false,
        logLevel: 'OFF',
        specReporter: { failFast: false }
      }
    },

    bump: {
      options: {
        files: ['package.json', 'bower.json'],
        updateConfigs: ['pkg'],
        commit: false,
        push: false,
        createTag: false
      }
    },

    gitadd: {
      bump: {
        options: {
          force: true
        },
        files: {
          src: ['package.json', 'bower.json']
        }
      },
      dist: {
        options: {
          force: true,
          message: 'add artefact',
          ignoreEmpty: true
        },
        files: {
          src: ['dist/**/*']
        }
      }
    },

    gitcommit: {
      bump: {
        options: {
          message: 'bump to <%= pkg.version %>',
          ignoreEmpty: true
        },
        files: {
          src: ['package.json', 'bower.json']
        }
      },
      dist: {
        options: {
          message: 'built artefact',
          ignoreEmpty: true
        },
        files: {
          src: ['dist/**/*']
        }
      }
    },

    gittag: {
      dist: {
        options: {
          tag: '<%=pkg.version%>',
          message: 'Version <%=pkg.version%> release'
        }
      }
    },

    gitpush: {
      bump: {
        options: {
          verbose: true, // for debug purpose
          remote: 'origin',
          branch: 'HEAD:<%= gerritBranch %>'
        }
      },
      dist: {
        options: {
          tags: true
        }
      }
    },

    publish: {
      options: {
        registry: 'http://bbpteam.epfl.ch/repository/npm',
        ignore: ['config.json']
      },
      dist: {
        src: ['.']
      }
    },

    exec: {
      tagLatestNpm: 'npm dist-tag add exdfrontend@<%= pkg.version %> latest'
    },

    jsdoc: {
      doc: {
        src: ['<%= yeoman.app %>/**/*.js'],
        options: {
          destination: 'doc',
          template: 'node_modules/ink-docstrap/template',
          configure: 'node_modules/ink-docstrap/template/jsdoc.conf.json',
          recurse: true,
          access: 'all',
          readme: 'README.md'
        }
      }
    },

    ci: {
      options: {
        gerritBranch: '<%= gerritBranch %>'
      }
    },

    build: {
      options: {
        noImagemin: '<%= noImagemin %>'
      }
    }
  });

  grunt.registerTask(
    'serve',
    'Compile then start a connect web server',
    function(target) {
      if (target === 'dist') {
        return grunt.task.run(['build', 'connect:dist:keepalive']);
      }

      grunt.task.run([
        'clean:server',
        'copy:fontawesome', // copy files needed by css style [NRRPLT-4817]
        'copy:gz3dImages', // copy files needed by gz3d [NRRPLT-3145]
        'wiredep',
        'concurrent:server',
        'autoprefixer',
        'connect:livereload',
        'watch'
      ]);
    }
  );

  grunt.registerTask(
    'serve_https',
    'Compile then start a connect https web server',
    function(target) {
      if (target === 'dist') {
        return grunt.task.run(['build', 'connect:dist:keepalive']);
      }

      grunt.task.run([
        'clean:server',
        'wiredep',
        'concurrent:server',
        'autoprefixer',
        'connect:livereloadHttps',
        'watch'
      ]);
    }
  );

  grunt.registerTask('e2e', 'Run protractor e2e test', function(target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'connect:dist:keepalive']);
    }
    grunt.task.run([
      'clean:server',
      'wiredep',
      'concurrent:server',
      'autoprefixer',
      'connect:e2etest',
      'protractor:remote'
    ]);
  });

  grunt.registerTask(
    'server',
    'DEPRECATED TASK. Use the "serve" task instead',
    function(target) {
      grunt.log.warn(
        'The `server` task has been deprecated. Use `grunt serve` to start a server.'
      );
      grunt.task.run(['serve:' + target]);
    }
  );

  grunt.registerTask('test', function(debug) {
    var tasks = ['wiredep:test', 'concurrent:test', 'autoprefixer'];

    tasks.push(debug === 'debug' ? 'karma:debug' : 'karma:unit');
    tasks.push('eslint');

    grunt.task.run(tasks);
  });

  grunt.registerTask('build', function() {
    var tasks = ['clean:dist', 'wiredep', 'compass:dist', 'useminPrepare'];
    grunt.log.writeln(
      'Option to avoid using imagemin is ' + this.options().noImagemin
    );
    if (this.options().noImagemin === true) {
      tasks.push('copy:images');
    } else {
      tasks.push('imagemin');
    }
    var followingTasks = [
      'svgmin',
      'autoprefixer',
      'concat',
      'ngAnnotate',
      'copy:dist',
      'cdnify',
      'cssmin',
      'uglify',
      'filerev',
      'usemin',
      'htmlmin'
    ];
    tasks.push.apply(tasks, followingTasks);
    grunt.task.run(tasks);
  });

  grunt.registerTask('default', ['newer:eslint', 'test', 'build']);

  grunt.registerTask('serve-dist', ['serve:dist']);

  grunt.registerTask('ci', 'Run all the build steps on the CI server', function(
    target
  ) {
    var tasks = ['test', 'build'];
    var branch = this.options().gerritBranch;
    grunt.log.writeln('[grunt ci:' + target + '] GERRIT_BRANCH is: ' + branch);
    if (target === 'patch' || target === 'minor' || target === 'major') {
      tasks.unshift('bump:' + target);
      tasks.push('gitadd:bump');
      tasks.push('gitcommit:bump');
      tasks.push('gitpush:bump');

      tasks.push('gitadd:dist');
      tasks.push('gitcommit:dist');
      tasks.push('gittag:dist');
      tasks.push('gitpush:dist');

      tasks.push('publish:dist');
      // We don't update the npm description of the latest package for an actual release branch
      if ('master' === branch) {
        tasks.push('exec:tagLatestNpm');
      }
    }
    grunt.task.run(tasks);
  });

  grunt.registerTask('doc', ['clean', 'jsdoc']);
};
