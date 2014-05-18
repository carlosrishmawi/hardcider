/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/lang',
    'dojo/request',
    'dojo/Deferred'
], function(
    lang,
    request,
    Deferred
) {
    'use strict';
    return {
        _normalizeUrl: function(database) {
            return (database.charAt(database.length - 1) === '/') ? database : database + '/';
        },

        //check for valid database
        validateDatabase: function(database) {
            database = this._normalizeUrl(database);
            var d = new Deferred();
            request.get(database, {
                handleAs: 'json'
            }).then(function(r) {
                if (r.error) {
                    d.reject(r);
                } else {
                    d.resolve(r);
                }
            }, function(e) {
                d.reject(e);
            });
            return d.promise;
        },

        //uuids getter
        _getUuids: function(database, count) {
            var s = database.split('/');
            var couch = s[0] + '//' + s[2] + '/';
            count = count || 1;
            var d = new Deferred();
            request.get((count > 1) ? couch + '_uuids?count=' + count : couch + '_uuids', {
                handleAs: 'json'
            }).then(function(r) {
                d.resolve(r);
            }, function(e) {
                d.reject(e);
            });
            return d.promise;
        },

        //add document
        addDocument: function(database, json) {
            database = this._normalizeUrl(database);
            var d = new Deferred();
            this._getUuids(database, 1).then(lang.hitch(this, function(r) {
                this._addDocument(database, d, r.uuids[0], json);
            }), lang.hitch(this, function(e) {
                d.reject(e);
            }));
            return d.promise;
        },
        _addDocument: function(database, d, id, json) {
            request.put(database + id, {
                data: json,
                handleAs: 'json'
            }).then(function(r) {
                d.resolve(r);
            }, function(e) {
                d.reject(e);
            });
        },

        //get document
        getDocument: function(database, id) {
            database = this._normalizeUrl(database);
            var d = new Deferred();
            request.get(database + id, {
                handleAs: 'json'
            }).then(function(r) {
                d.resolve(r);
            }, function(e) {
                d.reject(e);
            });
            return d.promise;
        },

        //update document
        updateDocument: function(database, id, json) {
            database = this._normalizeUrl(database);
            var d = new Deferred();
            request.put(database + id, {
                data: json,
                handleAs: 'json'
            }).then(function(r) {
                d.resolve(r);
            }, function(e) {
                d.reject(e);
            });
            return d.promise;
        },

        //get all documents
        getAllDocuments: function(database, include_docs) {
            database = this._normalizeUrl(database);
            var d = new Deferred(),
                query = {};
            if (include_docs) {
                query.include_docs = true;
            }
            request.get(database + '_all_docs', {
                query: query,
                handleAs: 'json'
            }).then(function(r) {
                d.resolve(r);
            }, function(e) {
                d.reject(e);
            });
            return d.promise;
        },

        //get view
        getView: function(view, include_docs) {
            var d = new Deferred(),
                query = {};
            if (include_docs) {
                query.include_docs = true;
            }
            request.get(view, {
                query: query,
                handleAs: 'json'
            }).then(function(r) {
                d.resolve(r);
            }, function(e) {
                d.reject(e);
            });
            return d.promise;
        },

        //get temp view
        getTempView: function(database, mapReduce) {
            database = this._normalizeUrl(database);
            var d = new Deferred();
            request.post(database + '_temp_view', {
                data: mapReduce,
                headers: {
                    'Content-Type': 'application/json'
                },
                handleAs: 'json'
            }).then(function(r) {
                d.resolve(r);
            }, function(e) {
                d.reject(e);
            });
            return d.promise;
        },

        //delete document
        deleteDocument: function(database, id, rev) {
            database = this._normalizeUrl(database);
            var d = new Deferred();
            request.del(database + id + '?rev=' + rev, {
                handleAs: 'json'
            }).then(function(r) {
                d.resolve(r);
            }, function(e) {
                d.reject(e);
            });
            return d.promise;
        }
    };
});
