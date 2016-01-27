/*jshint node:true,strict:true,undef:true,unused:true*/
'use strict';


/**
 * Import tasks
 **/
var gulp = require('gulp');
var browserSync = require('browser-sync').create();
var fs = require('fs');
var plugins = require('gulp-load-plugins')({
	pattern: [
		'gulp-*',
		'aliasify',
		'browserify',
		'del',
		'express',
		'flatten',
		'hintify',
		'path',
		'semver',
		'stringify',
		'vinyl-buffer',
		'vinyl-source-stream',
		'watchify'
	]
});



/**
 * Utilities
 **/
var getPackageJson = function() {
	return JSON.parse(fs.readFileSync('./package.json', 'utf8'));
};



/**
 * Environment
 **/
var pkg = getPackageJson();

// Determine whether running in production or not: If NODE_ENV=production or invoking gulp with --production argument.
var isProduction = process.env.NODE_ENV === 'production' || !!plugins.util.env.production;



/**
 * Configuration of file patterns.
 **/
var srcDir = 'src';
var distDir = 'dist';
var jsMainFileName = 'app.js';
var paths = {
	styleFiles: [srcDir + '/style/**/*.{scss,sass,css}'],
	jsMain: [srcDir + '/script/' + jsMainFileName],
	jsLintFiles: [
		srcDir + '/data/**/*.js',
		srcDir + '/script/**/*.js',
		srcDir + '/data/*.json',
		'!' + srcDir + '/data/config.json',
		'!' + srcDir + '/script/vendor/**/*.js',
	],
	jsConfigFiles: srcDir + '/data/config-*.json',
	jsHintRc: srcDir + '/script/.jshintrc',
	imgFiles: [srcDir + '/images/**/*.{png,jpeg,jpg,gif,svg}'],
	htmlFiles: [
		srcDir + '/**/*.html',
		'!' + srcDir + '/script/**/*.html'
	],
	staticFiles: [
		srcDir + '/static/**/*.*',
		srcDir + '/uploads/**/*.*',
		srcDir + '/*.ico',
		srcDir + '/.htaccess'
	],
	versionFiles: [
		'package.json',
		srcDir + '/data/config-*.json'
	]
};



/**
 * Development server
 */
var nodePort = 2000,
server = function() {
	// Basic initialization
	var port = process.env.PORT || nodePort;
	var appPaths = {
		app: plugins.path.join(__dirname, distDir + '/')
	};
	var app = plugins.express();

	//app.use($.connectLivereload());
	app.use(plugins.express.static(appPaths.app));

	// Let's get this show on the road!
	app.listen(port, function() {
		console.log('\r\n');
		console.log(':: server running :');
		console.log(':: serving content from => \'%s\'', appPaths.app);
		console.log(':: %s (v%s) is running on => \'http://localhost:%d\'', pkg.name, pkg.version, port);
	});

	// All not predefined routes go to index.html. Angular handles the rest
	app.use(function(req, res) {
		res.sendFile(appPaths.app + 'index.html');
	});
};



/**
 * Single purpose tasks
 */



// Cleans the destination build folder: gulp clean
gulp.task('clean', function(cb) {
	return plugins.del([distDir], cb);
});



// Compile Compass stylesheets to CSS.
gulp.task('style', function() {
	return gulp.src(plugins.flatten(paths.styleFiles), {
			base: srcDir
		})
		.pipe(plugins.sass({
			outputStyle: isProduction ? 'compressed' : 'expanded',
			errLogToConsole: true,
		}).on('error', plugins.sass.logError))
		.pipe(plugins.rename(function(path) {
			path.basename += '.' + pkg.version;
		}))
		.pipe(gulp.dest(distDir))
		.pipe(browserSync.stream());
});

// Create config file
gulp.task('config', function() {
	return gulp.src(srcDir + '/data/config-' + (isProduction ? 'production' : 'development') + '.json')
		.pipe(plugins.rename(function(path) {
			path.basename = 'config';
		}))
		.pipe(gulp.dest(srcDir + '/data'));
});

// Compile and minify JS files using Browserify. In production everything is minified to a single bundle. Otherwise (in development) the JS is output with source maps.
var b = plugins.browserify({
		cache: {},
		packageCache: {},
		entries: plugins.flatten(paths.jsMain),
		insertGlobals: true,
		noParse: [
			'lodash'
		],
		debug: !isProduction,
		transform: [
			plugins.stringify({
				extensions: ['.html'],
				minify: isProduction
			}),
			plugins.aliasify
		]
	}),
	bundle = function(sync) {
		return b.bundle()
			// Error handling
			.on('error', function(error) {
				plugins.util.beep();
				plugins.util.log(error);
				this.emit('end');
			})
			// Transform streams to play nice with NPM
			.pipe(plugins.vinylSourceStream(jsMainFileName))
			.pipe(plugins.vinylBuffer())
			// Prep file
			.pipe(plugins.ngAnnotate())
			.pipe(isProduction ? plugins.uglify() : plugins.util.noop())
			.pipe(plugins.rename(function(path) {
				path.basename += '.' + pkg.version;
			}))
			.pipe(gulp.dest(distDir + '/script'))
			.pipe(sync ? browserSync.stream() : plugins.util.noop());
	};
gulp.task('js', ['config'], function() {
	return bundle(true);
});
gulp.task('js-watch', ['config'], function() {
	b.plugin(plugins.watchify);
	b.on('log', plugins.util.log);
	b.on('update', bundle);
	return bundle();
});

// Check client-side JavaScript code quality using JSHint.
gulp.task('js-lint', ['config'], function() {
	gulp.src(paths.jsLintFiles)
		.pipe(plugins.jshint())
		.pipe(plugins.jshint.reporter('jshint-stylish'));
});



// Minify and copy images.
gulp.task('img', function() {
	return gulp.src(plugins.flatten(paths.imgFiles), {
			base: srcDir
		})
		.pipe(isProduction ? plugins.imagemin({
			optimizationLevel: 5,
			progressive: true
		}) : plugins.util.noop())
		.pipe(gulp.dest(distDir))
		.pipe(browserSync.stream());
});



// Copy HTML files and update references.
gulp.task('html', function() {
	return gulp.src(plugins.flatten(paths.htmlFiles), {
			base: srcDir
		})
		.pipe(plugins.replace('%%APPVERSION%%', pkg.version))
		.pipe(gulp.dest(distDir))
		.pipe(browserSync.stream());
});



// Copy static files.
gulp.task('copy', function() {
	return gulp.src(plugins.flatten(paths.staticFiles), {
			base: srcDir
		})
		.pipe(gulp.dest(distDir))
		.pipe(browserSync.stream());
});



// Versioning
gulp.task('bump', function() {
	// Reget package 
	pkg = getPackageJson();

	// Increment version 
	var newVersion = plugins.semver.inc(pkg.version, plugins.util.env.bump ? plugins.util.env.bump : 'patch');

	// Update JSONs
	return gulp.src(plugins.flatten(paths.versionFiles), {
			base: './'
		})
		.pipe(plugins.bump({
			version: newVersion
		}))
		.pipe(gulp.dest('./'));
});



/**
 * Multi-purpose tasks
 */

// Watch for file changes and build accordingly.
gulp.task('watch', function() {
	server();

	browserSync.init({
		proxy: 'localhost:' + nodePort
	});

	gulp.watch(paths.jsConfigFiles, ['config']);
	gulp.watch(paths.jsLintFiles, ['js-lint']);
	gulp.watch(paths.styleFiles, ['style']);
	gulp.watch(paths.imgFiles, ['img']);
	gulp.watch(paths.htmlFiles, ['html']);
	gulp.watch(paths.staticFiles, ['copy']);
});

// In NPM it is setup with: gulp clean && gulp build --production
gulp.task('build', ['style', 'js', 'js-lint', 'img', 'html', 'copy']);

// When developing you can continuously build files using just: gulp
gulp.task('default', ['style', 'js-watch', 'js-lint', 'img', 'html', 'copy', 'watch']);