'use strict';

mapboxgl.accessToken = 'your-mapbox-access-token';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v9',
    center: [-99.9, 41.5],
    zoom: 3,
    minZoom: 0
});

const lookups = { 'admin-1': './lookup/a1.json' }
var level = 'admin-1'
var lookup_url = lookups[level]

// Create parent hierarchy of id -> types to merge shapes
// Replace this with any hierarchy mapping feature id -> your custom grouping
var match_data = {
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

// Create color stops for parent hierarchy
var colorKey = {
    "Midwest": "#66c2a5",
    "East": "#fc8d62",
    "West": "#8da0cb",
    "South": "#e78ac3"
}

map.on('load', () => {
    //Load the lookup data and create the viz
    fetch(lookup_url)
        .then(res => res.json())
        .then((jsondata) => {
            createViz(jsondata);
        })
        .catch(err => console.error(err));
});


function createViz(lookup_data) {

    // Get the vector tile source from lookup table
    var mapId = lookup_data['TilesetName'];
    var polyLayerName = lookup_data['PolyLayerName'];
    var featureFilter = ['all', ['in', 'id']];
    var data_values = lookup_data['data'];

    // All the values in the data are in the data object of the lookup json
    var data = {}
    Object.keys(data_values).sort().forEach(function(key) {
        // Find keys matching the id from lookup table
        if (Object.keys(match_data).indexOf(key) > -1) {
            // Add the matching id to the feautures to render
            data[key] = { "parent": match_data[key] }
            featureFilter[1].push(key)
        }
    });

    // Create color stops for matching keys
    var colorStops = []
    for (var key in data) {
        colorStops.push([key, colorKey[data[key].parent]]);
    };

    // Add source for matching enterprise boundaries
    map.addSource(level + "join", {
        type: "vector",
        url: "mapbox://" + mapId
    });

    // Create layer for merged-states
    map.addLayer({
        "id": level + "join",
        "type": "fill",
        "source": level + "join",
        "source-layer": polyLayerName,
        "paint": {
            "fill-color": {
                "property": 'id',
                "type": "categorical",
                "stops": colorStops
            }
        },
        filter: featureFilter
    }, 'waterway-label');
};
