'use strict';

const mapboxgl = require('mapbox-gl');
const getJSON = require('simple-get-json');
const chroma = require('chroma-js');

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

const lookups = { 'admin-1': '<ENTER YOUR ENTERPRISE BOUNDARY FILE REFERENCE HERE>' }

var colorPalette = "YlGnBu";
var mapboxAccount = 'mapbox'
var mapId, polyLayerName, pointLayerName, vtMatchProp, data_values;
var maxValue = 2;

var level = 'admin-1'
var lookup_url = lookups[level]
var featureFilter = ['all', ['in', 'id']]

map.on('load', () => {

    // Hiding labels to highlight the style
    getData(lookup_url, initmap, initLayers);
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
        }
    });

    // Add source for state polygons hosted on Mapbox
        map.addSource(level + "join", {
            type: "vector",
            url: "mapbox://" + mapId
        });


    // Calculate color for each state based on the matching data
    var scale = chroma.scale(chroma.brewer[colorPalette]).domain([0, maxValue / 4, maxValue / 2, maxValue]).mode('lab');

    for (var key in data) {
        colorStops.push([key, colorKey[data[key].measure]]);
    };
};

function initLayers(level) {
    // Add layer from the vector tile source with data-driven styles

    // Start render clock
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
}
