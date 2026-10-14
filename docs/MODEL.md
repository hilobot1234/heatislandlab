# Heat Island Lab: educational temperature model

This model estimates **surface temperature**, the temperature of pavement, ground, or a building's roof. It does not estimate air temperature, indoor temperature, human heat exposure, or a weather forecast. Results describe one fictional neighborhood and should be used for comparisons, not predictions. Tenths of a degree make small changes visible; they do not imply measured accuracy.

## Fixed scenario and illustrative parameters

Air reference: 32°C. Clear sunny summer afternoon, sun due west at 45° elevation. Grid: 8 × 8 cells, each 10 m × 10 m. Time, wind, humidity, soil moisture, and latitude are not simulated. The scene is a snapshot; changes update instantly rather than simulating heating over time.

**Every numerical model parameter below is an illustrative design choice, not a measured or calibrated scientific value.** Material labels represent typical heating tendencies; real materials vary with color, age, moisture, reflectance, and thermal properties.

| Surface | Full-sun heating above air | Full-sun estimate |
| --- | ---: | ---: |
| Asphalt / dark roof | +28°C | 60°C |
| Concrete / brick or tile roof | +18°C | 50°C |
| Light pavers | +12°C | 44°C |
| Reflective roof | +9°C | 41°C |
| Grass | +7°C | 39°C |

Building heights are 6, 12, and 24 m. Footprints are 8 × 8 m. A tree has a spherical crown of radius 3.5 m centered 7 m above ground and a drawn trunk. It represents one mature, well-watered tree; species, growth, and water stress are omitted. One object may occupy each tile. A building tile reports its roof; a tree tile reports the ground beneath it. Walls and leaves do not have reported temperatures. Ground surfaces under buildings are retained for when the building is removed.

## Shade and temperature equation

Sample each ground tile or roof at 25 evenly spaced points. From each sample, cast a ray toward the fixed sun. Intersections with building boxes or spherical tree crowns mark that point as shaded. Roof samples start at roof height, so lower objects cannot shade higher roofs. A building never shades its own roof. A ray counts as shaded once even if several objects block it.

At 45°, the shadow of an ideal vertical edge on level ground extends one horizontal meter per meter of height: length = height / tan(45°). On an elevated receiver, only the height difference contributes. The displayed scene uses the same dimensions and west-to-east direction. The model averages shade across the tile; it does not draw sub-tile heat patterns.

Let `s` be the shaded fraction (0–1) and `H` the material heating above air:

`T = max(32, 32 + H × (1 − 0.65 × s) − C)`

Shade removes 65% of material heating, rather than subtracting a fixed amount regardless of material. It does not remove the 32°C air reference. This represents remaining diffuse sunlight and other heat exchanges only approximately.

For each tree at horizontal distance `d` meters from the receiver tile center, add `2.5 × max(0, 1 − d / 25)` degrees to a cooling sum. Cap the sum at 4°C, then multiply by `max(0, 1 − receiverHeight / 12)`. Thus nearby cooling fades over 25 m, is smaller at low roofs, and is zero at roofs 12 m or higher. This is an illustrative proxy for local effects of evapotranspiration, not an air-temperature field or a measured conversion from air cooling to surface cooling. Shade and nearby cooling are distinct terms; overlapping shade is never added repeatedly. The floor of 32°C prevents unrealistic overcooling in this simplified sunny scenario.

## Scientific support and limits

The following sources support the **mechanisms**, not the table or coefficients above:

- [US EPA: What Are Heat Islands?](https://www.epa.gov/heatislands/what-are-heat-islands) distinguishes surface and atmospheric heat islands and explains how urban materials and reduced vegetation contribute to heating.
- [US EPA: Benefits of Trees and Vegetation](https://www.epa.gov/heatislands/benefits-trees-and-vegetation) describes shading and evapotranspiration. Its reported air-cooling findings must not be treated as measured surface-cooling coefficients here.
- [US EPA: Trees and Vegetation Compendium, chapter 2](https://www.epa.gov/sites/default/files/2014-06/documents/treesandvegcompendium.pdf) reports studies with maximum shaded wall/roof surface reductions of 11–25°C. Those context-specific observations illustrate that shade can matter substantially; they do not validate this simulator's 65% shade factor.
- [US EPA: Using Cool Roofs to Reduce Heat Islands](https://www.epa.gov/heatislands/using-cool-roofs-reduce-heat-islands) explains how reflectance and thermal emittance affect roof heating. The simulator groups those properties into one material parameter.

Not represented: nighttime heat storage, changing sun position, wind and ventilation, humidity, anthropogenic heat, reflected sunlight between surfaces, seasonal effects, rainfall, conduction, or energy balance. More height improves shade in this daytime model but is not a general recommendation to build taller buildings.

## Controlled behavior checks

Run `npm test` (Node.js 20+). Tests compare equal locations under fixed conditions: asphalt versus grass, dark versus reflective roofs, low versus tall shadows, nearby versus distant trees, roof elevation, overlapping cooling limits, editing, removal, and reset. These check model consistency, not real-world validity.

In the browser, reset, inspect B4, then place a low building at A4. Reinspect B4 and note its shade. Change A4 to tall: B4 should cool and C4 should gain shade. Compare the roof at A4: increasing its height alone does not cool its own roof. Reset, place a tree at B4, and inspect C4. Remove the tree and verify C4 returns to its baseline. Change C4 from asphalt to grass and verify it is cooler. Reset should restore all tiles to empty asphalt at 60°C.
