/* eslint-disable */
const autoprefixer = require('gulp-autoprefixer'),
  browserSync = require('browser-sync'),
  cleanCSS = require('gulp-clean-css'),
  cssImporter = require('node-sass-css-importer')({
    import_paths: ['./scss']
  }),
  del = require('del'),
  eslint = require('gulp-eslint'),
  fileinclude = require('gulp-file-include'),
  gulp = require('gulp'),
  newer = require('gulp-newer'),
  path = require('path'),
  reload = browserSync.reload,
  rename = require('gulp-rename'),
  rollup = require('rollup'),
  rollupBabel = require('rollup-plugin-babel'),
  rollupCommonjs = require('rollup-plugin-commonjs'),
  rollupResolve = require('rollup-plugin-node-resolve'),
  rollupUglify = require('rollup-plugin-uglify').uglify,
  sass = require('gulp-sass'),
  sourcemaps = require('gulp-sourcemaps'),
  themeYaml = './theme.yml',
  year = new Date().getFullYear(),
  yaml = require('yamljs');

let theme = yaml.load(themeYaml);

const babelConfig = {
  presets: [
    [
      '@babel/env',
      {
        loose: true,
        modules: false,
        exclude: ['transform-typeof-symbol']
      }
    ]
  ],
  plugins: [
    '@babel/plugin-proposal-object-rest-spread'
  ],
  env: {
    test: {
      plugins: ['istanbul']
    }
  },
  exclude: 'node_modules/**', // Only transpile our source code
  externalHelpersWhitelist: [ // Include only required helpers
    'defineProperties',
    'createClass',
    'inheritsLoose',
    'defineProperty',
    'objectSpread'
  ],
};

getPaths = () => {
  return {
    pages: {
      folder: 'source',
      html: 'source/*.html',
      all: 'source/**/*.html',
    },
    js: {
      bootstrap: {
        all: [
          "./js/bootstrap/util.js",
          "./js/bootstrap/alert.js",
          "./js/bootstrap/button.js",
          "./js/bootstrap/carousel.js",
          "./js/bootstrap/collapse.js",
          "./js/bootstrap/dropdown.js",
          "./js/bootstrap/modal.js",
          "./js/bootstrap/tooltip.js",
          "./js/bootstrap/popover.js",
          "./js/bootstrap/scrollspy.js",
          "./js/bootstrap/toast.js",
          "./js/bootstrap/tab.js"
        ],
        index: "./js/bootstrap/index.js"
      },
      custom: {
        all: "js/custom/**/*.js",
        index: "js/custom/index.js",
      }
    },
    scss: {
      all: 'scss/**/*',
      themeScss: ['scss/theme.scss', '!scss/user.scss', '!scss/user-variables.scss'],
    },
    assets: {
      all: 'source/assets/**/*',
      folder: 'source/assets',
      allFolders: ['source/assets/css', 'source/assets/img', 'source/assets/fonts', 'source/assets/video'],
    },
    dist: {
      folder: 'dist',
      all: 'dist/**/*',
      assets: 'dist/assets',
      css: 'dist/assets/css',
      js: 'dist/assets/js',
    },
  }
};

let paths = getPaths();

// DEFINE TASKS

gulp.task('clean:dist', function (done) {
  del.sync(paths.dist.all, {
    force: true
  });
  done();
});

// Copy html files to dist
gulp.task('html', function () {
  return gulp.src(paths.pages.html, {
    base: paths.pages.folder
  })
  .pipe(newer(paths.dist.folder))
  .pipe(gulp.dest(paths.dist.folder))
  .pipe(reload({
    stream: true
  }));
});


// File includes into HTML
gulp.task('fileinclude', function (done) {
  gulp.src(paths.pages.html)
  .pipe(fileinclude({
    prefix: '@@',
    basepath: '@file'
  }))
  .pipe(gulp.dest(paths.dist.folder));
  done();
});

gulp.task('sass', function () {
  return gulp.src(paths.scss.themeScss)
  .pipe(sourcemaps.init())
  .pipe(sass({
    importer: [cssImporter]
  }).on('error', sass.logError))
  .pipe(autoprefixer())
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(paths.dist.css))
  .pipe(browserSync.stream({
    match: "**/theme*.css"
  }));
});

gulp.task('sass-min', function () {
  return gulp.src(paths.scss.themeScss)
  .pipe(sourcemaps.init())
  .pipe(sass({
    importer: [cssImporter]
  }).on('error', sass.logError))
  .pipe(cleanCSS({
    compatibility: 'ie9'
  }))
  .pipe(autoprefixer())
  .pipe(rename({
    suffix: '.min'
  }))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(paths.dist.css))
  .pipe(browserSync.stream({
    match: "**/theme*.css"
  }));
});

gulp.task('bootstrapjs', async (done) => {
  let fileDest = 'bootstrap.js';
  const external = ['jquery', 'popper.js'];
  const plugins = [
    rollupBabel(babelConfig),
    rollupUglify({
      output: {
        comments: "/^!/"
      }
    }),
  ];
  const globals = {
    jquery: 'jQuery', // Ensure we use jQuery which is always available even in noConflict mode
    'popper.js': 'Popper'
  };

  const bundle = await rollup.rollup({
    input: paths.js.bootstrap.index,
    external,
    plugins
  });

  await bundle.write({
    file: path.resolve(__dirname, `./${paths.dist.js}${path.sep}${fileDest}`),
    globals,
    format: 'umd',
    name: 'bootstrap',
    sourcemap: true,
  });
  // Reload Browsersync clients
  reload();
  done();
});

gulp.task('custom-js', async (done) => {
  gulp.src(paths.js.custom.all)
  // .pipe(eslint())
  // .pipe(eslint.format());

  let fileDest = 'theme.js';
  const external = [...theme.scripts.external];
  const plugins = [
    rollupCommonjs(),
    rollupResolve({
      browser: true,
    }),
    rollupBabel(babelConfig),
    theme.minify_scripts === true ? rollupUglify({
      output: {
        comments: "/^!/"
      }
    }) : null,
  ];
  const globals = theme.scripts.globals;

  const bundle = await rollup.rollup({
    input: paths.js.custom.index,
    external,
    plugins,
    onwarn: function (warning) {
      // Skip certain warnings
      if (warning.code === 'THIS_IS_UNDEFINED') {
        return;
      }
      // console.warn everything else
      console.warn(warning.message);
    }
  });

  await bundle.write({
    file: path.resolve(__dirname, `./${paths.dist.js}${path.sep}${fileDest}`),
    globals,
    format: 'umd',
    name: 'theme',
    sourcemap: true,
    sourcemapFile: path.resolve(__dirname, `./${paths.dist.js}${path.sep}${fileDest}.map`),
  });
  // Reload Browsersync clients
  reload();
  done();
});

// Assets
gulp.task('copy-assets', function () {
  return gulp.src(paths.assets.all, {
    base: paths.assets.folder
  })
  .pipe(newer(paths.dist.assets))
  .pipe(gulp.dest(paths.dist.assets))
  .pipe(reload({
    stream: true
  }));
});

// watch files for changes and reload
gulp.task('serve', function (done) {
  browserSync({
    server: {
      baseDir: './dist',
      index: "index.html",
    },
    notify: false,
    tunnel: true,
  });
  done();
});

gulp.task('watch', function (done) {

  // PAGES
  // Watch only .html source as they can be recompiled individually
  gulp.watch([paths.pages.all], {
    cwd: './'
  }, gulp.series('html', 'fileinclude', function reloadPage(done) {
    reload();
    done();
  }));

  // SCSS
  // Any .scss file change will trigger a sass rebuild
  gulp.watch([paths.scss.all], {
    cwd: './'
  }, gulp.series('sass'));


  // JS
  // Rebuild bootstrap js if files change
  gulp.watch([...paths.js.bootstrap.all], {
    cwd: './'
  }, gulp.series('bootstrapjs'));

  // Rebuild custom js if files change
  gulp.watch([paths.js.custom.all], {
    cwd: './'
  }, gulp.series('custom-js'));

  // Rebuild custom js if files change
  const assetsWatcher = gulp.watch([paths.assets.all, ...paths.assets.allFolders], {
    cwd: './'
  }, gulp.series('copy-assets'));

  assetsWatcher.on('change', function (path) {
    console.log('File ' + path + ' was changed');
  });

  assetsWatcher.on('unlink', function (path) {
    const changedDistFile = path.resolve(paths.dist.assets, path.relative(path.resolve(paths.assets.folder), event.path));
    console.log('File ' + path + ' was removed');
    del.sync(path);
  });

  done();
  // End watch task

});

gulp.task('default', gulp.series('clean:dist', 'copy-assets', gulp.series('html', 'sass', 'fileinclude', 'sass-min', 'bootstrapjs', 'custom-js'), gulp.series('serve', 'watch')));

gulp.task('build', gulp.series('clean:dist', 'copy-assets', gulp.series('html', 'sass', 'fileinclude', 'sass-min', 'bootstrapjs', 'custom-js')));
