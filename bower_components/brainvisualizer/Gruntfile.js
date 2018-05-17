/* jshint node: true, browser: false */
// Generated on 2014-10-10 using generator-hbp-angular 0.0.1
'use strict';

module.exports = function (grunt)
{
    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    // Configurable paths for the application
    var appConfig = {
        app: './',
        dist: 'dist'
    };

    // Define the configuration for all the tasks
    grunt.initConfig({

        yeoman: appConfig,
        appConfig: appConfig,
        pkg: grunt.file.readJSON('package.json'),
        gerritBranch: process.env.GERRIT_BRANCH,

        // Test settings
        karma: {
            unit: {
                configFile: 'test/karma.conf.js'
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
                    ignoreEmpty: true,
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
            },
            dist: {
                src: ['.']
            }
        },

        exec: {
            tag_latest_npm: 'npm tag brainvisualizer@<%= pkg.version %> latest'
        },

        jsdoc: {
            doc: {
                src: [
                    '<%= yeoman.app %>/scripts/**/*.js'
                ],
                options: {
                    destination: 'doc'
                }
            }
        },

        // Empties folders to start fresh
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '.tmp',
                        '<%= yeoman.dist %>/**/*',
                        '!<%= yeoman.dist %>/.git*'
                    ]
                }]
            },
            server: {
                files: [{
                    src: [
                        '.tmp',
                        '<%= yeoman.app %>/style' // removes png files copied from bower_components/gz3d-hbp/gz3d/client/style/images [NRRPLT-3145]
                    ]
                }]
            },
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
        },

        copy: {
              dist: {
              files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>',
                    src: 'src/*.js',
                    dest: '<%= yeoman.dist %>'
                },
                {
                    expand: true,
                    cwd: '<%= yeoman.app %>',
                    src: 'shaders/*.js',
                    dest: '<%= yeoman.dist %>'
                }
                ]
              }
        },

    });

    grunt.registerTask('test', [
        'karma',
    ]);

    grunt.registerTask('build', function ()
    {
        var tasks = [
            'clean:dist',
            'copy:dist'
        ];

        tasks.push.apply(tasks, []);
        grunt.task.run(tasks);
    });

    grunt.registerTask('ci', 'Run all the build steps on the CI server', function (target)
    {
        var tasks = ['test', 'build'];
        var branch = this.options().gerritBranch;
        grunt.log.writeln('[grunt ci:' + target + '] GERRIT_BRANCH is: ' + branch);
        if (target === 'patch' || target === 'minor' || target === 'major')
        {
            tasks.unshift('bump:' + target);
            tasks.push('gitadd:bump');
            tasks.push('gitcommit:bump');
            tasks.push('gitpush:bump');

            tasks.push('gitadd:dist');
            tasks.push('gitcommit:dist');
            tasks.push('gittag:dist');
            tasks.push('gitpush:dist');
        }
        grunt.task.run(tasks);
    });

};
