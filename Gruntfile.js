module.exports = function (grunt) {
    grunt.initConfig({
        jsbeautifier: {
            files: ['viewer/js/hardcider/**/*.js', 'viewer/js/hardcider/hardcider.css']
        },
        jshint: {
            build: {
                src: ['viewer/js/hardcider/**/*.js'],
                options: {
                    jshintrc: '.jshintrc',
                    reporter: require('jshint-stylish')
                }
            }
        },
        watch: {
            dev: {
                files: ['viewer/js/hardcider/**'],
                tasks: ['jshint']
            }
        },
        esri_slurp: {
            options: {
                version: '3.9',
                packageLocation: 'build/js/esri'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jsbeautifier');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-esri-slurp');

    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('beautify', ['jsbeautifier']);
    grunt.registerTask('slurp', ['esri_slurp']);
};
