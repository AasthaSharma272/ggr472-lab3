# Where Is It Safe to Bike in Toronto?

## Overview

This interactive web map explores cycling infrastructure, reported bicycle theft incidents, and bike parking locations across the City of Toronto. The goal of the project is to examine spatial patterns in cycling comfort levels and theft risk, and to allow users to interactively explore how these patterns change over time.

The map integrates multiple datasets from the City of Toronto Open Data Portal and demonstrates data-driven styling, clustering, filtering, and interactive controls using Mapbox GL JS.

---

## Data Sources

All datasets are publicly available through the City of Toronto Open Data Portal:

- **Cycling Network**
  - Publisher: Transportation Services
  - Geometry: LineString
  - Key Field Used: `INFRA_HIGHORDER`
  - Coordinate System: WGS84

- **Bicycle Thefts**
  - Publisher: Toronto Police Service
  - Geometry: Converted from MultiPoint to Point
  - Key Fields Used: `REPORT_YEAR`, `REPORT_DATE`, `OCC_DATE`, `DIVISION`
  - Note: Theft locations are offset to protect privacy

- **Bike Parking**
  - Indoor Parking Stations
  - Outdoor Parking Stations
  - Geometry: Point

All data are used under the Open Government Licence – Toronto.

---

## Map Features & Functionality

This web map includes the following interactive and analytical features:

### 1. Classified Cycling Infrastructure

Cycling routes are symbolized using a `match` expression based on `INFRA_HIGHORDER`. Similar infrastructure types were grouped into broader comfort categories:

- Multi-Use Trails (highest comfort)
- Cycle Tracks
- Bike Lanes
- Sharrows (shared road markings)
- Signed Routes
- Park Roads

Line width dynamically changes based on zoom level using an `interpolate` expression.

---

### 2. Clustered Bicycle Thefts

Bicycle theft incidents are clustered using Mapbox's built-in clustering functionality:

- Cluster size and color vary using `step` expressions
- Clicking a cluster zooms into its extent
- Individual theft points display detailed popups

Clusters automatically recompute when the year filter changes.

---

### 3. Year Slider (Dynamic Filtering)

A slider allows users to filter theft incidents from 2014–2026.

When the slider changes:
- The GeoJSON source is filtered programmatically
- Clusters recompute dynamically
- The number of thefts is displayed beside the selected year

---

### 4. Infrastructure Filter Dropdown

Users can filter cycling infrastructure by comfort category. The dropdown dynamically filters grouped infrastructure types using an `in` expression.

---

### 5. Highlight High-Comfort Routes

A button allows users to isolate the highest comfort infrastructure (Cycle Tracks and Multi-Use Trails). A reset button restores all filters and data.

---

### 6. Popups

Popups are implemented using click events for:

- Individual theft incidents
- Indoor bike parking
- Outdoor bike parking

Each popup displays relevant attribute information.

---

### 7. Map Controls

The following built-in Mapbox controls are included:

- Navigation control (zoom + rotation)
- Fullscreen control
- Scale bar

---

### 8. Legend

A custom legend explains:

- Cycling infrastructure classification
- Theft cluster intensity levels
- Indoor and outdoor parking locations

The legend is positioned separately from the filter controls for clarity.

---

## Technical Implementation

This project was built using:

- **Mapbox GL JS (v2.15.0)**
- HTML5
- CSS3
- JavaScript (ES6)
