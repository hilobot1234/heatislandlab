---
name: urban-heat-model
description: Maintain or explain Heat Island Lab's educational surface-temperature model and check controlled comparisons when changing materials, shade geometry, or tree cooling. Use for this illustrative simulator, not real weather forecasting.
---

# Educational urban heat model

Read the project model documentation at `../../docs/MODEL.md` before changing assumptions. The implementation is `../../src/model.js`; behavior checks are `../../tests/model.test.mjs`. Resolve these links relative to this skill folder. For reuse elsewhere, keep the same project files together or adapt the paths to the target project.

## Preserve the model's meaning

- Report surface temperature, specifying ground or roof. Keep the distinction from air temperature and the educational-estimate label in the interface.
- Hold the sunny summer scenario fixed: 32°C reference, west sun at 45°. Do not imply time evolution, weather prediction, or measured accuracy.
- Treat all heating coefficients, building dimensions, tree dimensions, shade attenuation, and cooling distances as illustrative choices. EPA sources in the documentation support mechanisms; their air-temperature results do not validate surface-temperature coefficients.
- Sample receiver surfaces at their actual height. Taller buildings extend ground shadows; a building does not shade its own roof. Count overlapping shadow once per sample.
- Reduce material heating with shade. Sum nearby-tree effects with distance decay, cap at 4°C before roof-height attenuation, and retain the 32°C lower bound. Do not let dense tree placement produce unlimited cooling.
- Keep roof materials separate from stored ground surfaces. Removing an object restores that ground, not an invented default.

## Check a change

From the repository root run `npm test`, then `npm run build`. Compare otherwise identical neighborhoods: grass cooler than asphalt, reflective roof cooler than dark roof, tall buildings shading farther east than low buildings, nearby trees cooler than distant ones, and no self-shading roofs. Check finite bounded temperatures and capped overlapping cooling. After changing geometry or coefficients, update the documentation and extend tests for the affected comparison.

In a browser exercise both the 3D view and tile explorer: place, inspect, change height and material, remove, reset, and load the example. Verify the explanation and heatmap update together. Confirm keyboard editing and the fallback renderer still work. These checks establish internal consistency, not scientific calibration. Preserve any publication approval boundary from the user's request.
