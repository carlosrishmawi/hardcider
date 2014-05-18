module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        tag: {
            banner: '/*  <%= pkg.name %>\n' +
                ' *  @version <%= pkg.version %>\n' +
                ' *  @author <%= pkg.author %>\n' +
                ' *  Project: <%= pkg.homepage %>\n' +
                ' *  Copyright <%= pkg.year %>. <%= pkg.license %> licensed.\n' +
                ' */\n'
        },
        jsbeautifier: {
            files: ['js/hardcider/**/*.js', 'js/hardcider/hardcider.css']
        },
        jshint: {
            build: {
                src: ['js/hardcider/**/*.js'],
                options: {
                    jshintrc: '.jshintrc',
                    reporter: require('jshint-stylish')
                }
            }
        },
        watch: {
            dev: {
                files: ['js/hardcider/**'],
                tasks: ['jshint']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jsbeautifier');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['jshint', 'jsbeautifier']);
};