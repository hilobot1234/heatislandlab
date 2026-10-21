import { SIZE, HEIGHTS, MATERIALS, SURFACES, exampleNeighborhood, blankNeighborhood, editCell, temperatures } from './model.js';
import { createView, heatColor } from './view.js';

let cells = exampleNeighborhood(), selected = 0, tool = 'inspect', view;
const $ = id => document.getElementById(id);
const tileName = i => `${String.fromCharCode(65 + i % SIZE)}${Math.floor(i / SIZE) + 1}`;
const buttons = cells.map((_, index) => {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.index = index;
  button.addEventListener('click', () => pick(index)); $('tile-grid').append(button); return button;
});
const optionValues = () => ({ height: $('height').value, material: $('material').value, ground: $('ground').value });
const hints = { inspect: 'Click any tile to measure its temperature.', tree: 'Click a tile to plant a tree. It replaces any building there.', building: 'Click a tile to place a building. Change height or roof to edit the selected building.', ground: 'Click a tile to change its ground. Changing the menu edits the selected tile.', remove: 'Click a tile to remove its tree or building.' };
function pick(index) {
  selected = index;
  if (tool !== 'inspect') cells = editCell(cells,index,tool,optionValues());
  syncOptions(); render();
}
function syncOptions() {
  const cell = cells[selected];
  $('ground').value = cell.ground;
  if (cell.object?.type === 'building') {
    $('height').value = cell.object.height; $('material').value = cell.object.material;
  }
}
document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => {
  tool = button.dataset.tool;
  document.querySelectorAll('[data-tool]').forEach(item => item.setAttribute('aria-pressed',String(item === button)));
  $('tool-hint').textContent = hints[tool]; showOptions();
}));
for (const id of ['height','material']) $(id).addEventListener('change', () => {
  // Edits are applied only to a selected building, regardless of active tool.
  if (cells[selected].object?.type === 'building') { cells = editCell(cells,selected,'building',optionValues()); render(); }
});
$('ground').addEventListener('change', () => { cells = editCell(cells,selected,'ground',optionValues()); render(); });
// Show only the menus the active tool uses.
function showOptions() { $('building-options').hidden = tool !== 'building'; $('ground-options').hidden = tool !== 'ground'; }
function loadNeighborhood(next) {
  cells = next; selected = 0; tool = 'inspect';
  $('height').value = 'medium'; $('material').value = 'brick'; $('heatmap').checked = true;
  document.querySelectorAll('[data-tool]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.tool === tool)));
  $('tool-hint').textContent = hints[tool]; showOptions(); syncOptions(); render();
}
$('reset').addEventListener('click', () => loadNeighborhood(blankNeighborhood()));
$('example').addEventListener('click', () => loadNeighborhood(exampleNeighborhood()));
$('heatmap').addEventListener('change', render);
function render() {
  const results = temperatures(cells), result = results[selected], cell = cells[selected];
  $('location').textContent = `Tile ${tileName(selected)}`;
  const objectLabel = cell.object?.type === 'building' ? `${HEIGHTS[cell.object.height]} m building` : cell.object?.type === 'tree' ? 'Tree · ground beneath canopy' : 'Open ground';
  let explanation = `${result.material} gains ${result.excess}°C above the fixed air temperature in full sun. `;
  explanation += result.shade > 0 ? `About ${Math.round(result.shade*100)}% of this ${result.kind} is shaded, reducing solar heating. ` : `This ${result.kind} is unshaded. `;
  explanation += result.cooling > 0 ? 'Nearby trees provide an additional, distance-limited cooling effect.' : cell.object?.type === 'building' ? 'Tree cooling fades with roof height; tall roofs receive none.' : 'No nearby trees provide extra cooling here.';
  // Bars share one scale so students can compare each part of the heat budget.
  const bar = degrees => `<span class="bar" style="width:${Math.min(100, degrees / 30 * 100)}%"></span>`;
  $('result').innerHTML = `<div class="reading"><span class="swatch" style="background:${heatColor(result.temperature)}"></span><div class="temperature">${result.temperature.toFixed(1)}<span class="unit">°C</span></div><div class="temp-label">Estimated ${result.kind} temperature</div></div>`
    + `<div class="result-object"><span class="chip">${result.material}</span><span class="chip">${objectLabel}</span></div>`
    + `<dl class="budget"><div class="budget-title">Heat budget</div>`
    + `<div class="budget-row"><dt>Air temperature (fixed)</dt><dd>32.0</dd></div>`
    + `<div class="budget-row add"><dt>Sun heating the ${result.kind}</dt><dd>+${result.excess.toFixed(1)}</dd>${bar(result.excess)}</div>`
    + `<div class="budget-row subtract"><dt>Shade (${Math.round(result.shade*100)}% covered)</dt><dd>−${result.shadeReduction.toFixed(1)}</dd>${bar(result.shadeReduction)}</div>`
    + `<div class="budget-row subtract"><dt>Nearby trees</dt><dd>−${result.cooling.toFixed(1)}</dd>${bar(result.cooling)}</div>`
    + `<div class="budget-row total"><dt>Surface temperature</dt><dd>${result.temperature.toFixed(1)}°C</dd></div></dl>`
    + `<p class="explanation">${explanation}</p>`;
  buttons.forEach((button,index) => {
    const value = results[index], object = cells[index].object;
    const prefix = object?.type === 'tree' ? 'T ' : object?.type === 'building' ? 'B ' : '';
    button.textContent = prefix + Math.round(value.temperature);
    // Lightened colors retain dark text contrast; the 3D map uses the full ramp.
    button.style.background = `color-mix(in srgb, ${heatColor(value.temperature)} 45%, white)`;
    button.classList.toggle('selected',index===selected);
    button.setAttribute('aria-pressed',String(index===selected));
    button.setAttribute('aria-label',`Tile ${tileName(index)}, ${object?.type || 'open ground'}, ${value.material}, estimated ${value.kind} temperature ${value.temperature.toFixed(1)} degrees Celsius. ${tool} tool.`);
  });
  view?.draw(cells,results,selected,$('heatmap').checked);
}
syncOptions(); render();
view = await createView($('scene'),pick,label => { $('renderer-status').textContent = label; });
render();
