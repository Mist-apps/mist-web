'use strict';

module.exports = function (grunt) {

	// Load grunt tasks automatically
	require('load-grunt-tasks')(grunt);

	// Define the configuration for all the tasks
	grunt.initConfig({

		// Folder cleaning before fill them
		clean: {
			serve: ['.tmp'],
			build: ['.tmp', 'dist']
		},

		// Bower components injection into the HTML files
		wiredep: {
			app: {
				src: [
					'app/{,*/}*.html'
				]
			}
		},

		// Parallel tasks running
		concurrent: {
			serve: [
				'compass:serve'
			],
			build: [
				'compass:build',
				'imagemin'
			]
		},

		// Sass to CSS compilation
		compass: {
			options: {
				sassDir: 'app/*/styles',
				cssDir: '.tmp/*/styles',
				importPath: './bower_components',
				relativeAssets: false,
				assetCacheBuster: false
			},
			serve: {
				options: {
					debugInfo: true
				}
			},
			build: {
				options: {
				}
			}
		},

		// Images minification
		imagemin: {
			build: {
				files: [{
					expand: true,
					cwd: 'app/',
					src: '{,*/}{,images/}*.{png,jpg,jpeg,gif}',
					dest: 'dist/'
				}]
			}
		},

		// Add vendor prefixed styles
		autoprefixer: {
			options: {
				browsers: ['last 2 versions']
			},
			dist: {
				expand: true,
				cwd: '.tmp/',
				src: '{,*/}{,styles/}*.css',
				dest: '.tmp/'
			}
		},

		// Reads HTML for usemin blocks to enable smart builds that automatically
		// concat, minify and revision files. Creates configurations in memory so
		// additional tasks can operate on them
		useminPrepare: {
			html: 'app/index.html',
			options: {
				dest: 'dist',
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

		// Performs rewrites based on filerev and the useminPrepare configuration
		usemin: {
			html: ['dist/{,*/}*.html'],
			css: ['dist/styles/{,*/}*.css'],
			js: ['dist/scripts/{,*/}*.js'],
			options: {
				assetsDirs: ['dist','dist/images'],
			}
		},

		// Copies remaining files to places other tasks can use
		copy: {
			dist: {
				files: [{
					expand: true,
					dot: true,
					cwd: 'app',
					dest: 'dist',
					src: [
						'*.{ico,png,txt}',
						'.htaccess',
						'{,*/}{,modals/}*.html'
					]
				}, {
					expand: true,
					dot: true,
					cwd: 'bower_components/fontawesome',
					dest: 'dist',
					src: ['global/fonts/*']
				}]
			}
		},

		// HTML minification
		htmlmin: {
			dist: {
				options: {
					collapseWhitespace: true,
					conservativeCollapse: true,
					collapseBooleanAttributes: true,
					removeCommentsFromCDATA: true,
					removeOptionalTags: true
				},
				files: [{
					expand: true,
					cwd: 'dist',
					src: ['{,*/}{,modals/}*.html'],
					dest: 'dist'
				}]
			}
		},

		// Renames files for browser caching purposes
		filerev: {
			dist: {
				src: [
					'dist/{,*/}{,scripts/}*.js',
					'dist/{,*/}{,styles/}*.css',
					'dist/{,*/}{,images/}*.{png,jpg,jpeg,gif}',
					'dist/{,*/}{,fonts/}*'
				]
			}
		},

		// Javascript files checkstyle
		jshint: {
			options: {
				jshintrc: '.jshintrc',
				reporter: require('jshint-stylish')
			},
			all: {
				src: [
					'Gruntfile.js',
					'app/{,*/}{,scripts/}*.js'
				]
			}
		},

		// Grunt connect server
		connect: {
			// Global options
			options: {
				port: 9000,
				hostname: '*',
				livereload: 35729,
				open: true
			},
			// Development server
			livereload: {
				options: {
					base: [
						'app',
						'.tmp'
					],
					middleware: function (connect, options, middlewares) {
						middlewares.unshift(connect().use('/bower_components', connect.static('./bower_components')));
						return middlewares;
					},
				}
			},
			// Production-like server
			dist: {
				options: {
					keepalive: true,
					base: 'dist'
				}
			}
		},

		// Files watching
		watch: {
			bower: {
				files: ['bower.json'],
				tasks: ['wiredep']
			},
			js: {
				files: ['app/{,*/}{,scripts/}*.js'],
				tasks: ['jshint'],
				options: {
					livereload: '<%= connect.options.livereload %>'
				}
			},
			compass: {
				files: ['app/{,*/}{,styles/}*.{scss,sass}'],
				tasks: ['compass:serve', 'autoprefixer']
			},
			livereload: {
				files: [
					'app/{,*/}{,modals/}*.html',
					'.tmp/{,*/}{,styles/}*.css',
					'app/{,*/}{,images/}*.{png,jpg,jpeg,gif}'
				],
				options: {
					livereload: '<%= connect.options.livereload %>'
				}
			}
		}

	});


	/**
	 * Grunt tasks
	 */

	grunt.registerTask('serve', [
		'clean:serve',
		'wiredep',
		'concurrent:serve',
		'autoprefixer',
		'connect:livereload',
		'watch'
	]);

	grunt.registerTask('dist', [
		'build',
		'connect:dist'
	]);

	grunt.registerTask('build', [
		'clean:build',
		'wiredep',
		'useminPrepare',
		'concurrent:build',
		'autoprefixer',
		'concat',
		'copy',
		'cssmin',
		'uglify',
		'filerev',
		'usemin',
		'htmlmin'
	]);

	grunt.registerTask('default', [
		'jshint',
		'build'
	]);

};
