"use strict";

var gulp = require("gulp");
var plumber = require("gulp-plumber");
var rename = require("gulp-rename");
var htmlmin = require("gulp-htmlmin");
var htmlvalidator = require("gulp-w3c-html-validator");
var imagemin = require("gulp-imagemin");
var webp = require("gulp-webp");
var svgstore = require("gulp-svgstore");
var less = require("gulp-less");
var combineMq = require('gulp-combine-mq');
var cssBase64 = require("gulp-css-base64");
var postcss = require("gulp-postcss");
var autoprefixer = require("autoprefixer");
var csso = require("gulp-csso");
var concat = require("gulp-concat");
var uglify = require("gulp-uglify");
var stylelint = require("gulp-stylelint");
var editorconfig = require("gulp-lintspaces");
var del = require("del");
var server = require("browser-sync").create();
var settings = require("./package.json");
var isDev = process.env.NODE_ENV !== "production";

gulp.task("editorconfig", function () {
  return gulp.src(settings["editorconfig-cli"])
    .pipe(plumber())
    .pipe(editorconfig({ editorconfig: `.editorconfig` }))
    .pipe(editorconfig.reporter());
});

gulp.task("stylelint", function () {
  return gulp.src("source/less/**/*.less")
    .pipe(plumber())
    .pipe(stylelint({
      reporters: [
        {
          console: true,
          formatter: "string"
        }
      ]
    }));
});

gulp.task("html", function () {
  return gulp.src("source/**/*.html")
    .pipe(htmlmin({
      collapseWhitespace: true
    }))
    .pipe(htmlvalidator())
    .pipe(htmlvalidator.reporter())
    .pipe(gulp.dest("build"));
});

gulp.task("css", function () {
  return gulp.src("source/less/style.less", { sourcemaps: isDev })
    .pipe(plumber())
    .pipe(less())
    .pipe(combineMq())
    .pipe(cssBase64({
      baseDir: "../img/bg-icons",
      maxWeightResource: 10000,
      extensionsAllowed: [".svg", ".png"]
    }))
    .pipe(postcss([
      autoprefixer()
    ]))
    .pipe(gulp.dest("build/css"))
    .pipe(csso())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("build/css", { sourcemaps: "." }))
    .pipe(server.stream());
});

gulp.task("js", function () {
  return gulp.src([
    "node_modules/picturefill/dist/picturefill.min.js",
    "node_modules/svg4everybody/dist/svg4everybody.min.js",
    "source/js/start.js",
    "source/js/nav.js",
    "source/js/story.js",
    "source/js/map.js"
  ], { sourcemaps: isDev })
    .pipe(concat("script.js"))
    .pipe(gulp.dest("build/js"))
    .pipe(uglify())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("build/js", { sourcemaps: "." }));
});

gulp.task("imagemin", function () {
  return gulp.src("source/imagemin/**/*.{png,jpg,svg}")
    .pipe(imagemin([
      imagemin.optipng({ optimizationLevel: 3 }),
      imagemin.jpegtran({ progressive: true }),
      imagemin.svgo(settings.svgoConfig)
    ]))
    .pipe(gulp.dest("source/img"));
});

gulp.task("images", function () {
  return gulp.src([
    "source/img/content/**/*.{png,jpg,svg}",
    "source/img/background/**/*.{png,jpg,svg}",
    "source/img/bg-icons/**/*.{png,jpg,svg}",
  ])
    .pipe(gulp.dest("build/img"));
});

gulp.task("webp", function () {
  return gulp.src("source/img/content/**/*.{png,jpg,svg}")
    .pipe(webp({ quality: 80 }))
    .pipe(gulp.dest("build/img"));
});

gulp.task("sprite", function () {
  return gulp.src("source/img/sprite-icons/**/*.svg")
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename("sprite.svg"))
    .pipe(gulp.dest("build/img"));
});

gulp.task("copy", function () {
  return gulp.src([
    "source/fonts/**/*.{woff, woff2}"
  ], {
      base: "source"
    })
    .pipe(gulp.dest("build"));
});

gulp.task("clean", function () {
  return del("build");
});

gulp.task("server", function () {
  server.init({
    server: "build",
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  gulp.watch("source/**/*.html", gulp.series("html", "reload"));
  gulp.watch("source/js/**/*.js", gulp.series("js", "reload"));
  gulp.watch("source/less/**/*.less", gulp.series("stylelint", "css"));
  gulp.watch("source/img/sprite-icons/**/*.svg", gulp.series("sprite", "reload"));
  gulp.watch("source/imagemin/**/*.{jpg,png,svg}", gulp.series("imagemin", "css", "reload"));
  gulp.watch("source/img/backgruond/**/*.svg", gulp.series("images", "reload"));
  gulp.watch("source/img/content/**/*.svg", gulp.series("images", "webp", "reload"));
  gulp.watch("source/img/bg-icons/**/*.svg", gulp.series("images", "reload"));
  gulp.watch(settings["editorconfig-cli"], gulp.series("editorconfig", "reload"));
});

gulp.task("reload", function (done) {
  server.reload();
  done();
});

gulp.task("build", gulp.series(
  gulp.parallel("editorconfig", "stylelint", "clean", "html", "imagemin"),
  gulp.parallel("css", "js", "sprite", "copy", "images", "webp")
));
gulp.task("start", gulp.series("build", "server"));
