// Set Mapbox access token for authentication
mapboxgl.accessToken = 'pk.eyJ1IjoiYWFzdGhhMjcyIiwiYSI6ImNtbGNud3g4dDB5N2czZ3EwdmN3ejlidGMifQ.qxx3hONjiExrB-iCER2Hjw';

// Initialize Mapbox map with Toronto as the center point
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11', // clean base map
  center: [-79.3832, 43.7332], // Toronto coordinates
  zoom: 10
});

// Store original theft data for filtering operations
let originalTheftData;

// Add standard map controls for user interaction
map.addControl(new mapboxgl.NavigationControl()); // Zoom and pan controls
map.addControl(new mapboxgl.FullscreenControl()); // Fullscreen toggle
map.addControl(new mapboxgl.ScaleControl()); // Map scale indicator

// Execute code after the map has fully loaded
map.on('load', () => {

  // Create GeoJSON source for cycling infrastructure network
  map.addSource('cycling-network', {
    type: 'geojson',
    data: 'data/cycling-network - 4326.geojson'
  });

  // Load and process bicycle theft data from GeoJSON file
  fetch('data/bicycle-thefts-clean.geojson')
    .then(res => res.json())
    .then(data => {

      // Convert MultiPoint geometries to single Points (use first coordinate)
      data.features.forEach(feature => {
        if (feature.geometry.type === "MultiPoint") {
          feature.geometry = {
            type: "Point",
            coordinates: feature.geometry.coordinates[0]
          };
        }
      });

      // Save original data for later filtering
      originalTheftData = data;

      // Create GeoJSON source with clustering enabled
      map.addSource('bicycle-thefts', {
        type: 'geojson',
        data: data,
        cluster: true, // Enable point clustering
        clusterMaxZoom: 14, // Stop clustering at zoom level 14
        clusterRadius: 40 // Cluster radius in pixels
      });

      // Render clustered points with color and size based on theft count
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'bicycle-thefts',
        filter: ['has', 'point_count'], // Only show clusters
        paint: {
          // Color gradient: lighter for fewer thefts, darker red for more
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#fee5d9', // Very light pink (1-49 thefts)
            50, '#fcae91', // Light orange (50-99 thefts)
            100, '#fb6a4a', // Orange (100-249 thefts)
            250, '#cb181d' // Dark red (250+ thefts)
          ],
          // Size increases with theft count
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15, // Base size
            50, 20, // 20px at 50+ thefts
            100, 30, // 30px at 100+ thefts
            250, 40 // 40px at 250+ thefts
          ],
          'circle-opacity': 0.65
        }
      });

      // Display count numbers on top of cluster circles
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'bicycle-thefts',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Open Sans Bold'],
          'text-size': 14
        },
        paint: {
          'text-color': '#ffffff' // White text for visibility
        }
      });

      // Display individual theft points at higher zoom levels (not part of clusters)
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'bicycle-thefts',
        filter: ['!', ['has', 'point_count']], // Show only non-clustered points
        paint: {
          'circle-color': '#ff0000', // Red color for individual thefts
          'circle-radius': 5,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff' // White outline
        }
      });

      // Initialize theft data display starting from 2014
      updateTheftData(2014);

    });

  // Create visual layer for cycling infrastructure with color-coded infrastructure types
  map.addLayer({
    id: 'cycling-layer',
    type: 'line',
    source: 'cycling-network',
    paint: {
      // Color code different types of cycling infrastructure
      'line-color': [
        'match',
        ['get', 'INFRA_HIGHORDER'],

        // Multi-Use Trails in green
        [
            'Multi-Use Trail',
            'Multi-Use Trail - Entrance',
            'Multi-Use Trail - Boulevard',
            'Multi-Use Trail - Connector',
            'Multi-Use Trail - Existing Connector'
        ],
        '#1a9850', // Green

        // Cycle Tracks in blue
        [
            'Cycle Track',
            'Bi-Directional Cycle Track',
            'Cycle Track - Contraflow'
        ],
        '#2c7bb6', // Blue

        // Bike Lanes in light blue
        [
            'Bike Lane',
            'Bike Lane - Buffered',
            'Bike Lane - Contraflow'
        ],
        '#abd9e9', // Light blue

        // Sharrows in orange
        [
            'Sharrows',
            'Sharrows - Wayfinding',
            'Sharrows - Arterial',
            'Sharrows - Arterial - Connector'
        ],
        '#fdae61', // Orange

        // Signed Routes in light yellow
        ['Signed Route (No Pavement Markings)'],
        '#fee08b',

        // Park Roads in light gray
        ['Park Road'],
        '#cccccc',

        '#999999' // Default fallback color
        ],

      // Line width increases at higher zoom levels for visibility
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        10, 1, // 1px at zoom 10
        14, 3, // 3px at zoom 14
        17, 6 // 6px at zoom 17
      ]
    }
  });

  // When user clicks a cluster, zoom in to expand it
  map.on('click', 'clusters', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters']
    });

    const clusterId = features[0].properties.cluster_id;

    // Calculate appropriate zoom level to show all points in cluster
    map.getSource('bicycle-thefts').getClusterExpansionZoom(
        clusterId,
        (err, zoom) => {
        if (err) return;

        // Smoothly animate to the cluster center at new zoom level
        map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
        });
        }
    );
  });

  // When user clicks an individual theft point, show a popup with details
  map.on('click', 'unclustered-point', (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice();
    const props = e.features[0].properties;

    // Display theft information in a popup
    new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
        <strong>Bicycle Theft</strong><br>
        Report Date: ${props.REPORT_DATE}<br>
        Occurred: ${props.OCC_DATE}<br>
        Division: ${props.DIVISION}<br>
        Bike Type: ${props.BIKE_TYPE || 'Unknown'}
        `)
        .addTo(map);
  });

  // Change cursor to pointer when hovering over clusters
  map.on('mouseenter', 'clusters', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'clusters', () => {
    map.getCanvas().style.cursor = '';
  });

  // Change cursor to pointer when hovering over individual theft points
  map.on('mouseenter', 'unclustered-point', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'unclustered-point', () => {
    map.getCanvas().style.cursor = '';
  });

  // Load bike parking locations
  map.addSource('parking-indoor', {
    type: 'geojson',
    data: 'data/bike-parking-indoor.geojson'
  });

  map.addSource('parking-outdoor', {
    type: 'geojson',
    data: 'data/bike-parking-outdoor.geojson'
  });

  // Display indoor bike parking in blue
  map.addLayer({
    id: 'parking-indoor-layer',
    type: 'circle',
    source: 'parking-indoor',
    paint: {
        'circle-color': '#2c7fb8', // Blue
        'circle-radius': 5,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff'
    }
  });

  // Display outdoor bike parking in green
  map.addLayer({
    id: 'parking-outdoor-layer',
    type: 'circle',
    source: 'parking-outdoor',
    paint: {
        'circle-color': '#41ab5d', // Green
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff'
    }
  });

  // Show popup when clicking indoor parking location
  map.on('click', 'parking-indoor-layer', (e) => {
    const coords = e.features[0].geometry.coordinates.slice();

    new mapboxgl.Popup()
        .setLngLat(coords)
        .setHTML(`<strong>Indoor Bike Parking</strong>`)
        .addTo(map);
  });

  // Show popup when clicking outdoor parking location
  map.on('click', 'parking-outdoor-layer', (e) => {
    const coords = e.features[0].geometry.coordinates.slice();

    new mapboxgl.Popup()
        .setLngLat(coords)
        .setHTML(`<strong>Outdoor Bike Parking</strong>`)
        .addTo(map);
  });

});

// Handle cycling infrastructure type filter dropdown
document.getElementById('infraFilter').addEventListener('change', function() {
  const value = this.value;

  // Show all infrastructure types if 'all' is selected
  if (value === 'all') {
    map.setFilter('cycling-layer', null);
    return;
  }

  // Define which specific types belong to the selected category
  let filterValues = [];

  if (value === 'Multi-Use Trail') {
    filterValues = [
      'Multi-Use Trail',
      'Multi-Use Trail - Entrance',
      'Multi-Use Trail - Boulevard',
      'Multi-Use Trail - Connector',
      'Multi-Use Trail - Existing Connector'
    ];
  }

  else if (value === 'Cycle Track') {
    filterValues = [
      'Cycle Track',
      'Bi-Directional Cycle Track',
      'Cycle Track - Contraflow'
    ];
  }

  else if (value === 'Bike Lane') {
    filterValues = [
      'Bike Lane',
      'Bike Lane - Buffered',
      'Bike Lane - Contraflow'
    ];
  }

  else if (value === 'Sharrows') {
    filterValues = [
      'Sharrows',
      'Sharrows - Wayfinding',
      'Sharrows - Arterial',
      'Sharrows - Arterial - Connector'
    ];
  }

  else if (value === 'Signed Route') {
    filterValues = ['Signed Route (No Pavement Markings)'];
  }

  // Apply filter to show only selected infrastructure types
  map.setFilter('cycling-layer', [
    'in',
    ['get', 'INFRA_HIGHORDER'],
    ['literal', filterValues]
  ]);
});

// Update theft data when user adjusts the year slider
document.getElementById('yearSlider').addEventListener('input', function() {

  const selectedYear = parseInt(this.value);
  updateTheftData(selectedYear); // Show all thefts from selected year onwards

});

// Highlight only the most comfortable cycling infrastructure types
document.getElementById('highlightComfort').addEventListener('click', () => {
  // Show only cycle tracks and multi-use trails (highest comfort)
  map.setFilter('cycling-layer', [
    'match',
    ['get', 'INFRA_HIGHORDER'],
    ['Cycle Track', 'Multi-Use Trail'],
    true,
    false
  ]);
});

// Reset all filters and controls to initial state
document.getElementById('resetFilters').addEventListener('click', () => {

  // Clear cycling layer filter to show all infrastructure
  map.setFilter('cycling-layer', null);
  document.getElementById('infraFilter').value = 'all';

  // Reset year slider to 2014
  const slider = document.getElementById('yearSlider');
  slider.value = 2014;
  document.getElementById('yearValue').textContent = 2014;

  // Restore all theft data from original dataset
  const theftSource = map.getSource('bicycle-thefts');

  if (theftSource && originalTheftData) {
    theftSource.setData(originalTheftData);
  }

  updateTheftData(2014); // Ensure theft data is also reset to 2014 and later

});

// Toggle information panel visibility
document.getElementById('infoToggle').addEventListener('click', () => {
  const box = document.getElementById('infoBox');
  // Show if hidden, hide if shown
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
});


// Filter and display theft data for selected year and onwards
function updateTheftData(selectedYear) {

  // Keep only thefts reported in the selected year or later
  const filteredFeatures = originalTheftData.features.filter(f => {
    return parseInt(f.properties.REPORT_YEAR) >= selectedYear;
  });

  // Update the year label with current year and theft count
  document.getElementById('yearValue').textContent =
    selectedYear + " (" + filteredFeatures.length + " thefts)";

  // Update map source with filtered theft data
  map.getSource('bicycle-thefts').setData({
    type: "FeatureCollection",
    features: filteredFeatures
  });
}

