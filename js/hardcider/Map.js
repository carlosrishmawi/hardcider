/*
 * https://github.com/btfou/hardcider
 *
 * the hardcider map class
 * extends esri/map with some handy extras
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/keys',
    'dojo/mouse',
    'dojo/dom-construct',
    'dojo/number',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/PopupMenuItem',
    'esri/map',
    'esri/toolbars/draw',
    'esri/toolbars/edit',
    'esri/toolbars/navigation',
    'dojo/i18n!esri/nls/jsapi',
    'esri/units',
    'esri/symbols/jsonUtils',
    'esri/dijit/LayerSwipe',
    'hardcider/dijit/MapInfo',
    'hardcider/dijit/MapNotify',
    'hardcider/dijit/AlertDialog',
    'hardcider/dijit/ConfirmDialog',
    'hardcider/dijit/GeometryDialog',
    'hardcider/layers/Basemaps'
], function(
    declare,
    lang,
    array,
    keys,
    mouse,
    domConst,
    number,
    Menu,
    MenuItem,
    PopupMenuItem,
    Map,
    Draw,
    Edit,
    Nav,
    esriBundle,
    Units,
    symbolJsonUtils,
    LayerSwipe,
    MapInfo,
    MapNotify,
    AlertDialog,
    ConfirmDialog,
    GeometryDialog,
    Basemaps
) {
    return declare(Map, {
        rightMouseClickCoords: null, //what it says
        eventOns: [], //array of map events
        snappingOptions: {
            snapPointSymbol: symbolJsonUtils.fromJson({
                color: null,
                size: 11.25,
                type: 'esriSMS',
                style: 'esriSMSCross',
                outline: {
                    color: [255, 0, 0, 192],
                    width: 3.75,
                    type: 'esriSLS',
                    style: 'esriSLSSolid'
                }
            }),
            alwaysSnap: false,
            snapKey: keys.CTRL,
            tolerance: 15
        },
        defaultUnits: {
            location: 'dec',
            distance: Units.FEET,
            area: Units.ACRES
        },
        constructor: function(srcNodeRef, options) {
            //toolbars
            this.drawToolbar = new Draw(this);
            this.editToolbar = new Edit(this);
            this.navToolbar = new Nav(this);

            //context menu
            this.contextMenu = new Menu({
                targetNodeIds: [this.id],
                contextMenuForWindow: false,
                leftClickToOpen: false
            });
            this.contextMenu.startup();

            //right mouse click coords
            this.on('mouse-down', lang.hitch(this, function(evt) {
                if (mouse.isRight(evt)) {
                    this.rightMouseClickCoords = evt.mapPoint;
                }
            }));

            //basemaps
            //if not 'basemap' then load basemaps
            if (!options.basemap) {
                this.basemaps = new Basemaps({
                    map: this,
                    bingMapsKey: options.bingMapsKey,
                    mapboxMapId: options.mapboxMapId,
                    defaultBasemap: options.defaultBasemap || 'bm_esriworldtopo',
                    defaultBasemapType: options.defaultBasemapType || null
                });
                this.contextMenu.addChild(new PopupMenuItem({
                    label: 'Basemaps',
                    popup: this.basemaps.menu
                }));
            }

            //map info
            var mapInfo = new MapInfo({
                map: this
            }, domConst.create('div', {}, srcNodeRef, 'last'));
            mapInfo.startup();

            //map notify
            var mapNotify = new MapNotify({}, domConst.create('div', {}, srcNodeRef, 'last'));
            mapNotify.startup();
            this.notify = function(msg, duration) {
                mapNotify.notify(msg, duration);
            };

            //alert dialog
            var alertDialog = new AlertDialog({
                map: this
            });
            alertDialog.startup();

            //confirm dialog
            var confirmDialog = new ConfirmDialog({
                map: this
            });
            confirmDialog.startup();
        },

        //set/reset draw tooltips
        setDrawTooltips: function(draw) {
            draw = draw || {};
            var defaults = {
                addMultipoint: 'Click to start adding points',
                addPoint: 'Click to add a point',
                addShape: 'Click to add a shape, or press down to start and let go to finish',
                complete: 'Double-click to finish',
                finish: 'Double-click to finish',
                freehand: 'Press down to start and let go to finish',
                resume: 'Click to continue drawing',
                start: 'Click to start drawing'
            };
            lang.mixin(esriBundle.toolbars.draw, defaults, draw);
        },

        //map event management
        //add event
        //@param event {Object} - any on event
        eventAdd: function(event) {
            this.eventOns.push(event);
        },
        //call before creating new event to clear existing and reset map, draw, etc
        eventBegin: function() {
            this.infoWindow.hide();
            this.infoWindow.clearFeatures();
            this.setMapCursor('default');
            this.eventMouseEventsDisable();
            array.forEach(this.eventOns, function(o) {
                o.remove();
            });
            this.eventOns = [];
            if (this.drawToolbar._geometryType !== null) {
                this.drawToolbar.deactivate();
            }
            this.setDrawTooltips();
        },
        //call after event fired
        //NOTE: the draw toolbar must be deactivated in code
        eventEnd: function() {
            this.setMapCursor('default');
            this.eventMouseEventsEnable();
            this.setDrawTooltips();
        },
        //reset by calling both begin and end
        eventReset: function() {
            this.eventBegin();
            this.eventEnd();
        },
        //enable/disable mouse events on graphic layers
        eventMouseEventsEnable: function() {
            array.forEach(this.graphicsLayerIds, function(layer) {
                this.getLayer(layer).enableMouseEvents();
            }, this);
        },
        eventMouseEventsDisable: function() {
            array.forEach(this.graphicsLayerIds, function(layer) {
                this.getLayer(layer).disableMouseEvents();
            }, this);
        },

        //geometry info dialog
        //@param geom {Object} - esri geometry
        geometryInfo: function(geom) {
            var d = this.geomInfoDialog;
            if (!d) {
                d = this.geomInfoDialog = new GeometryDialog({
                    title: 'Geometry Info',
                    map: this
                });
            }
            d.geometryInfo(geom);
        },

        //enable snapping on all graphics layers recycling snapping options
        recycleEnableSnapping: function() {
            var sm = this.snappingManager,
                options = {};
            //maybe mixin here but probably not
            if (sm) {
                options.alwaySnap = sm.alwaySnap;
                options.snapKey = sm.snapKey;
                options.snapPointSymbol = sm.snapPointSymbol;
                options.tolerance = sm.tolerance;
                this.enableSnapping(options);
            } else {
                this.enableSnapping(this.snappingOptions);
            }
        },

        //decimal lat/lng to DMS string
        //@param l {Number} - decimal lat/lng
        //@param type {String} - lat/y or lng/x
        decToDMS: function(l, type) {
            var dir = '?',
                abs = Math.abs(l),
                deg = parseInt(abs, 10),
                min = (abs - deg) * 60,
                minInt = parseInt(min, 10),
                sec = number.round((min - minInt) * 60, 3),
                minIntTxt = (minInt < 10) ? '0' + minInt : minInt,
                secTxt = (sec < 10) ? '0' + sec : sec;
            if (type === 'lat' || type === 'y') {
                dir = (l > 0) ? 'N' : 'S';
            }
            if (type === 'lng' || type === 'x') {
                dir = (l > 0) ? 'E' : 'W';
            }
            return deg + '&deg;' + minIntTxt + '\'' + secTxt + '"&nbsp;' + dir;
        },

        //layer swiping
        //@param layer {Object} - layer to swipe
        //@param type {string} - axis to swipe - 'vertical' (default) or 'horizontal'
        swipeLayer: function(layer, type) {
            if (!layer) {
                return;
            }
            if (!layer.visible) {
                this.alert('Layer must be visible to use layer swipe.', 'Layer Swipe');
                return;
            }
            if (!this._swiper) {
                this._swiper = new LayerSwipe({
                    type: type || 'vertical',
                    map: this,
                    layers: [layer]
                }, domConst.create('div', {}, this.id, 'last'));
                this._swiper.startup();
                this._swiper.exitMenuItem = new MenuItem({
                    label: 'Exit Layer Swipe',
                    onClick: lang.hitch(this, function() {
                        this._swiper.disable();
                    })
                });
                this.contextMenu.addChild(this._swiper.exitMenuItem);
                this._swiper.watch('enabled', lang.hitch(this, function() {
                    if (this._swiper.enabled) {
                        this.contextMenu.addChild(this._swiper.exitMenuItem);
                    } else {
                        this.contextMenu.removeChild(this._swiper.exitMenuItem);
                    }
                }));
            } else {
                this._swiper.disable();
                this._swiper.set('layers', [layer]);
                this._swiper.set('type', type);
                this._swiper.enable();
            }
        }
    });
});
