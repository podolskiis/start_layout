/* VARIABLES
 ********************************************************/
var
  gulp = require('gulp'),
  // Sass
  sass = require('gulp-sass'),
  rename = require("gulp-rename"),
  bourbon = require('node-bourbon'),
  minifyCss = require('gulp-minify-css'), // set to (Sass,Build)
  autoprefixer = require('gulp-autoprefixer'),
  // Jade
  jade = require('gulp-jade'),
  jadeInheritance = require('gulp-jade-inheritance'),
  prettify = require('gulp-html-prettify'),
  changed = require('gulp-changed'),
  cached = require('gulp-cached'),
  gulpif = require('gulp-if'), // set to (Jade,Build)
  filter = require('gulp-filter'),
  data = require('gulp-data'),
  // Tools
  browserSync = require('browser-sync'),
  reload = browserSync.reload,
  plumber = require('gulp-plumber'), // set to (Sass,Jade)
  wiredep = require('wiredep').stream,
  // Destination path
  appDir = 'app/',
  buildDir = 'www/';

/* PREPROCESSING
 ********************************************************/
  // Sass
  gulp.task('sass', function () {
    gulp.src(appDir+'sass/import.scss')
      .pipe(plumber())
      .pipe(sass({includePaths: require('node-bourbon').includePaths}).on('error', sass.logError))
      .pipe(autoprefixer({ browsers: ['last 25 versions'] }))
      .pipe(rename('theme.min.css'))
      // .pipe(minifyCss({compatibility: 'ie8'}))
      .pipe(gulp.dest(appDir+'css/'))
      .pipe(reload({ stream:true }));
  });
  // Jade
  gulp.task('jade', function() {
    return gulp.src(appDir+'jade/**/*.jade')
      .pipe(plumber())
      .pipe(changed(appDir, {extension: '.html'}))
      .pipe(gulpif(global.isWatching, cached('jade')))
      .pipe(jadeInheritance({basedir: appDir+'jade/'}))
      .pipe(filter(function (file) {
        return !/\/^_/.test(file.path) && !/^_/.test(file.relative);
      }))
      .pipe(data(function(file) {
        return require('./'+appDir+'jade/data/data.json');
      }))
      .pipe(jade({ pretty: true }))
      .pipe(prettify({indent_char: ' ', indent_size: 2}))
      .pipe(gulp.dest(appDir))
      .pipe(reload({ stream:true }));
  });
  gulp.task('setWatch', function() {
    global.isWatching = true;
  });
  // BrowserSync
  gulp.task('serve', ['setWatch','sass','jade','bower'], function() {
    browserSync.init({
      server: {baseDir: appDir},
      notify: false
    });
  });
  // Bower Wiredep
  gulp.task('bower', function () {
    gulp.src([
        appDir+'jade/**/_styles.jade',
        appDir+'jade/**/_scripts.jade'
      ])
      .pipe(wiredep({
        // directory: 'bower_components/', // задать путь к bower_components
        ignorePath: /^(\.\.\/)*\.\./
      }))
      .pipe(gulp.dest(appDir+'jade/'));
  });

/* WATCH
 ********************************************************/
gulp.task('watch', function() {
  gulp.watch(appDir+'sass/**/*.+(scss|sass)', ['sass']);
  gulp.watch(appDir+'jade/**/*.jade', ['jade']);
  gulp.watch('bower.json', ['bower']);
  gulp.watch([
    appDir+'js/*.js'
  ]).on('change', reload);
});
// combination tasks
gulp.task('default', ['serve','watch']);


/* BUILD TASKS
 ********************************************************/
// Variables build
var
  runSequence = require('run-sequence'), // set to (DEPLOOY)
  clean = require('gulp-clean'),
  size = require('gulp-size'),
  imagemin = require('gulp-imagemin'),
  uglify = require('gulp-uglify'),
  useref = require('gulp-useref');

// Clean dir
gulp.task('clean', function () {
  return gulp.src(buildDir, {read: false})
    .pipe(clean());
});
// Transfer the HTML, CSS, JS into dist
gulp.task('useref', function () {
  return gulp.src(appDir+'*.html')
    .pipe(useref())
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulpif('*.css', minifyCss({compatibility: 'ie8'})))
    .pipe(gulp.dest(buildDir));
});
// Transferring Fonts
gulp.task('fonts', function () {
  gulp.src(appDir+'fonts/**/*')
    .pipe(gulp.dest(buildDir+'fonts/'));
});
// Transferring and compress img
gulp.task('img', function () {
  return gulp.src(appDir+'images/**/*')
    .pipe(imagemin({
      progressive: true,
      interlaced: true
    }))
    .pipe(gulp.dest(buildDir+'images/'));
});
// We transfer the remaining files (.ico, .htaccess, etc ...)
gulp.task('extras', function () {
  return gulp.src([
    appDir+'.*',
    appDir+'*.*',
    '!'+appDir+'*.html'
  ]).pipe(gulp.dest(buildDir));
});
// Transferring js
gulp.task('js', function () {
  gulp.src(appDir+'js/**/*')
    .pipe(gulp.dest(buildDir+'js/'));
});

// Build folder DIST
gulp.task('dist', ['useref','img','fonts','extras','js'], function () {
  return gulp.src(buildDir+'**/*').pipe(size({title: 'build'}));
});
// Build folder DIST (only after compiling "Sass, Jade")
gulp.task('build', function (cb) {
  runSequence(['sass','jade'],'clean','dist', cb);
});


/* DEPLOOY
 ********************************************************/
var
  gutil = require('gulp-util'),
  ftp = require('vinyl-ftp');

gulp.task('http', function () {
  var
    urlDir = '/activ.sergeypodolsky.ru/public_html/work/2016/08/demo/',
    conn = ftp.create({
      host:     '92.53.96.55',
      user:     'podolskiis',
      password: '9999999999',
      parallel: 10,
      log: gutil.log
    }),
    globs = [
      buildDir+'**/*',
      buildDir+'**/.*'
    ];
  return gulp.src(globs, {base: buildDir, buffer: false})
    .pipe(conn.dest(urlDir));
});

/* BUILD and DEPLOOY  in the loop
 ********************************************************/
gulp.task('build:http', function(cb) {
  runSequence('build', 'http', cb);
});
