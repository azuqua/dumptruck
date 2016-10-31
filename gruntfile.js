/**
 * -- gruntfile.js
 * Created by austin on 10/9/16.
 */

"use strict";

module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),

    mochaTest: {
      run: {
        options: {reporter: "spec", checkLeaks: true},
        src: ["tests/*.js"]
      }
    },

    jshint: {
      files: ["*.js", "lib/*.js", "migrations/*.js", "test/*.js"],
      options: {
        jshintrc: '.jshintrc'
      }
    }

  });

  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-mocha-test");

  grunt.registerTask("lint", ["jshint"]);

  grunt.registerTask("test", ["mochaTest:run"]);

  grunt.registerTask("default", ["lint", "test"]);
};
