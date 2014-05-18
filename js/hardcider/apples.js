/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define(['esri/geometry/Extent'], function(Extent) {
    return {
        map: {
            basemap: null,
            //center: [-123.49, 45.86],
            //zoom: 11,
            extent: new Extent({
                'xmin': -13874608,
                'ymin': 5126806,
                'xmax': -12984269,
                'ymax': 5838587,
                'spatialReference': {
                    'wkid': 102100,
                    'latestWkid': 3857
                }
            }),
            showAttribution: true,
            logo: false,
            proxyUrl: 'proxy/proxy.php',
            geometryServiceUrl: 'http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer',
            bingMapsKey: 'Ao8BC5dsixV4B1uhNaUAK_ejjm6jtZ8G3oXQ5c5Q-WtmpORHOMklBvzqSIEXwdxe', //please use your key - thanks
            mapboxMapId: 'btfou.i2j794p6', //please use your mapbox map - thanks
            defaultBasemap: 'bm_mapbox'
        },
        drawProjects: {
            pouchDbName: 'hardcider-drawing-projects', //changing this is going to leave folks without their projects! set it and forget it!
            couchDbUrl: 'http://localhost:5984/hardcider-drawing-projects',
            couchDbGetProjectsUrl: 'http://localhost:5984/hardcider-drawing-projects/_design/hardcider/_view/projects'
            //^ a design view for retrieving info for load projects grid
            // if it doesn't exist draw projects will use _temp_view (very poor performance even to return a single document)
            // the map function:
            //function (doc) {
            //    emit(null, {
            //        _id: doc._id,
            //        _rev: doc._rev,
            //        name: doc.name,
            //        description: doc.description,
            //        timestamp: doc.timestamp,
            //        location: doc.location
            //    });
            //}
        },
        overlays: [{
            type: 'dynamic',
            id: 'oregonhydro',
            url: 'http://navigator.state.or.us/arcgis/rest/services/Framework/Hydro_GeneralMap_WM/MapServer',
            name: 'Oregon Hydrography',
            identify: true,
            query: true
        }, {
            type: 'dynamic',
            id: 'femaflood',
            url: 'http://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer',
            name: 'FEMA Flood',
            identify: true,
            query: true
        }, {
            type: 'dynamic',
            id: 'oregonadmin',
            url: 'http://navigator.state.or.us/arcgis/rest/services/Framework/Admin_Bounds_WM/MapServer',
            name: 'Oregon Administrative Boundaries',
            identify: true,
            query: true
        }],
        features: [{
            type: 'feature',
            id: 'orfarmersmarkets',
            url: 'http://venison.library.oregonstate.edu/arcgis/rest/services/farm/Farmers_Markets_2013/FeatureServer/0',
            name: 'Oregon Farmers Markets',
            mode: 1,
            outFields: ['*'],
            infoTemplate: {
                type: 'custom',
                title: '${marketnam}',
                content: '<div class="popupInfoWrapper">Location: ${location}<br>City: ${city}<br>County: ${county}<br>Season: ${season}<br>Days: ${days}<br>Hours: ${hours}</div>'
            },
            visible: false,
            opacity: 1
        }]
    };
});