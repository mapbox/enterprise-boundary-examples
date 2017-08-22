'use strict';

const mapboxgl = require('mapbox-gl');
const getJSON = require('simple-get-json');
const chroma = require('chroma-js');
const turf = require('@turf/turf');
const _ = require('lodash');

var data = {};
var filter = [];
var colorStops = [];
var loading = false;

mapboxgl.accessToken = '<ENTER YOUR MAPBOX TOKEN HERE>';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v9',
    center: [-99.9, 41.5],
    zoom: 3,
    minZoom: 0
});

const lookups = { 'admin-1': '<ENTER YOUR ENTERPRISE BOUNDARY FILE PATH HERE>' }

var colorPalette = "YlGnBu";
var loadingbar = document.getElementById('loading');
var startTime, timer, featurecount //Performance timing
var mapboxAccount = 'mapbox'
var mapId, polyLayerName, pointLayerName, vtMatchProp, data_values;
var maxValue = 2;

var level = 'admin-1'
var lookup_url = lookups[level]
var popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
});
var popupevent, hoverevent, clickevent, selectedFeatures;
var featureFilter = ['all', ['in', 'id']]

map.on('load', () => {

    // Hiding labels to highlight the style
    let style = map.getStyle();
    style.layers.forEach(function(l) {
        if ((l.id.indexOf('country-label') != -1) && (l.type == 'symbol')) {
            map.setLayoutProperty(l.id, 'visibility', 'none')
        }
        if ((l.id.indexOf('state-label') != -1) && (l.type == 'symbol')) {
            map.setLayoutProperty(l.id, 'visibility', 'none')
        }
        if ((l.id.indexOf('place-city') != -1) && (l.type == 'symbol')) {
            map.setLayoutProperty(l.id, 'visibility', 'none')
        }
    })
    getData(lookup_url, initmap, initLayers);
    isMapLoading();
});

function getData(url, callbackone, callbacktwo) {
    getJSON(url, function(lookup_data) {
        callbackone(lookup_data, level);
        callbacktwo(level);
    })
}

var match_data = {
    "USA121": "Midwest",
    "USA121": "Midwest",
    "USA147": "Midwest",
    "USA117": "Midwest",
    "USA118": "Midwest",
    "USA139": "Midwest",
    "USA155": "Midwest",
    "USA142": "East",
    "USA134": "East",
    "USA110": "East",
    "USA124": "East",
    "USA154": "East",
    "USA151": "East",
    "USA137": "East",
    "USA130": "West",
    "USA116": "West",
    "USA141": "West",
    "USA153": "West",
    "USA106": "West",
    "USA122": "South",
    "USA128": "South",
    "USA101": "South",
    "USA113": "South",
    "USA112": "South"
}

var colorKey = {
    "Midwest": "#66c2a5",
    "East": "#fc8d62",
    "West": "#8da0cb",
    "South": "#e78ac3"
}

var centerKey = {
    "Midwest": [],
    "East": [],
    "West": [],
    "South": []
}

function initmap(lookup_data, level) {
    // Join client data to lookup data, then get the matching vector tiles

    // Get the vector tile source to join to
    mapId = lookup_data['TilesetName'];
    polyLayerName = lookup_data['PolyLayerName'];
    pointLayerName = lookup_data['PointLayerName'];
    vtMatchProp = "id";
    featureFilter = ['all', ['in', 'id']]
    colorStops = []

    // All the values in the data are in the data object of the lookup json
    data_values = lookup_data['data']
    data = {}

    Object.keys(data_values).sort().forEach(function(key) {

        // Find keys matching the country-code for the viz
        if (Object.keys(match_data).indexOf(key) > -1) {
            data[key] = {
                "measure": match_data[key],
                "name": data_values[key]['name'],
                "bounds": data_values[key]['bounds'],
                "z_min": data_values[key]['z_min']
            }
            featureFilter[1].push(key)
            var b = data[key].bounds
            var coords = [
                [
                    [b[0], b[1]],
                    [b[0], b[3]],
                    [b[2], b[3]],
                    [b[2], b[1]],
                    [b[0], b[1]]
                ]
            ]
            var bbox_poly = turf.polygon(coords)
            centerKey[match_data[key]].push(turf.centroid(bbox_poly))
        }
    });

    // Hover element
    var hover_geojson = {
        features: [],
        type: "FeatureCollection"
    }

    // Add source for state polygons hosted on Mapbox
    if (!map.getSource(level + "join")) {
        map.addSource(level + "join", {
            type: "vector",
            url: "mapbox://" + mapId
        });
    }

    if (!map.getSource(level + "hover")) {
        map.addSource(level + "hover", {
            type: "vector",
            url: "mapbox://" + mapId
        });
    }

    var point_features = []

    for (var key in centerKey) {
        var feat = turf.centroid(turf.featureCollection(centerKey[key]))
        feat.properties = { "name": key }
        point_features.push(feat)
    }
    var centerpoints = turf.featureCollection(point_features);

    if (!map.getSource(level + "label")) {
        map.addSource(level + "label", {
            type: "geojson",
            data: centerpoints
        });
    }

    // Calculate color for each state based on the matching data
    var scale = chroma.scale(chroma.brewer[colorPalette]).domain([0, maxValue / 4, maxValue / 2, maxValue]).mode('lab');

    for (var key in data) {
        colorStops.push([key, colorKey[data[key].measure]]);
    };

    // Popups and hovers
    addPopupHover(level + 'join', level + 'hover');
    //addSelectClick(level + 'join', level + 'selectionLine');
};

function initLayers(level) {
    // Add layer from the vector tile source with data-driven styles

    // Start render clock
    startTime = window.performance.now();
    if (!map.getLayer(level + 'join')) {
        map.addLayer({
            "id": level + "join",
            "type": "fill",
            "source": level + "join",
            "source-layer": polyLayerName,
            "paint": {
                "fill-color": {
                    "property": vtMatchProp,
                    "type": "categorical",
                    "stops": colorStops
                },
                "fill-opacity": 1
            },
            filter: featureFilter
        }, 'waterway-label');
    } else {
        map.setFilter(level + 'join', featureFilter);
        map.setPaintProperty(level + 'join', 'fill-color', {
            "property": vtMatchProp,
            "type": "categorical",
            "stops": colorStops
        });
    }

    var scale = chroma.scale(chroma.brewer[colorPalette])

    if (!map.getLayer(level + 'hover')) {
        map.addLayer({
            "id": level + 'hover',
            "type": "line",
            "source": level + "hover",
            "source-layer": polyLayerName,
            "layout": {},
            "paint": {
                "line-color": scale(1).hex(),
                "line-width": {
                    stops: [
                        [0, 5],
                        [16, 12]
                    ]
                },
                "line-offset": 1
            },
            "filter": ['==', 'id', '0']
        }, level + "join");
    } else {
        let filter = ['in', 'id']
        selectedFeatures.forEach(function(f) {
            filter.push(f)
        })
        map.setFilter(hoverLayer, filter);
    }

    if (!map.getLayer(level + 'label')) {
        map.addLayer({
            "id": level + "label",
            "type": "symbol",
            "source": level + "label",
            "layout": {
                "text-field": "{name}",
                "text-size": {
                    "stops": [
                        [0, 10],
                        [12, 32]
                    ]
                }
            },
            "paint": {
                "text-halo-color": "white",
                "text-halo-width": 2
            }
        });
    }
}

function isMapLoading() {
    loadingbar.style.visibility = 'visible';
    map.on('render', afterChangeComplete);

    function afterChangeComplete() {
        if (!map.loaded()) {
            return
        } // still not loaded; bail out.

        loadingbar.style.visibility = 'hidden';
        map.off('render', afterChangeComplete); // remove this handler now that we're done.
    }
}

function isMapLoading2() {
    loading = true
    map.on('render', afterChangeComplete);

    function afterChangeComplete() {
        if (!map.loaded()) {
            return
        } // still not loaded; bail out.
        loading = false
        map.off('render', afterChangeComplete); // remove this handler now that we're done.
    }
}

function addPopupHover(popuplayer, hoverLayer) {
    // Add a popup to the map
    var id = '0'

    popupevent = _.debounce(function(e) {
        if (!map.getLayer(popuplayer)) {
            return
        }
        var features = map.queryRenderedFeatures(e.point, {
            layers: [popuplayer]
        });

        map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';
        if (!features.length) {
            popup.remove();
            map.setFilter(hoverLayer, ['==', 'id', '0']);
            id = '0'
            return
        }

        let offsetpoint = map.unproject([e.point.x, e.point.y])
        let feature = features[0];
        let newpk = feature.properties.id

        if (id == newpk) {
            // If the popup pk hasn't changed, just update the position, not the text
            popup.setLngLat(offsetpoint)
            return
        } else {
            //Set the pk of the polygon to the newly hovered pk
            id = newpk;
            var val = match_data[id]
            selectedFeatures = []
            for (var key in match_data) {
                if (match_data[key] == val) {
                    selectedFeatures.push(key)
                }
            }
        }

        //Create the tooltip
        popup.setLngLat(offsetpoint)
            .setHTML(' <h2> Tooltip </h2> <div class="p6">' +
                '<li><b>Region: </b>' + data[id].measure + '</li></div>')
            .addTo(map);

        if (!loading) {
            let filter = ['in', 'id']
            selectedFeatures.forEach(function(f) {
                filter.push(f)
            })
            map.setFilter(hoverLayer, filter);
            isMapLoading2();
        }

    }, 8, {
        'leading': false,
        'trailing': true
    });

    map.on("mousemove", popupevent);
}
