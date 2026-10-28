import test from 'node:test';
import assert from 'node:assert/strict';
import { AIR, SIZE, HEIGHTS, MATERIALS, SURFACES, blankNeighborhood, exampleNeighborhood, editCell, estimate, temperatures } from '../src/model.js';

const at = (x,z) => z*SIZE+x;
test('ground materials compare at the same unshaded location', () => {
  const base = blankNeighborhood();
  assert.equal(estimate(base,0).temperature,60);
  assert.equal(estimate(editCell(base,0,'ground',{ground:'grass'}),0).temperature,39);
  assert.equal(estimate(editCell(base,0,'ground',{ground:'pavers'}),0).temperature,44);
  assert.equal(base[0].ground,'asphalt');
});
test('roof materials and height edits apply, without cooling their own roof', () => {
  let cells = editCell(blankNeighborhood(),at(2,3),'building',{height:'low',material:'dark'});
  const low = estimate(cells,at(2,3));
  cells = editCell(cells,at(2,3),'building',{height:'tall',material:'dark'});
  assert.equal(estimate(cells,at(2,3)).temperature,low.temperature);
  assert.equal(estimate(cells,at(2,3)).shade,0);
  cells = editCell(cells,at(2,3),'building',{height:'tall',material:'reflective'});
  assert.equal(estimate(cells,at(2,3)).temperature,41);
});
test('taller buildings cast longer eastward shadows', () => {
  const low = editCell(blankNeighborhood(),at(1,3),'building',{height:'low',material:'brick'});
  const tall = editCell(low,at(1,3),'building',{height:'tall',material:'brick'});
  assert.ok(estimate(tall,at(2,3)).shade > estimate(low,at(2,3)).shade);
  assert.equal(estimate(low,at(3,3)).shade,0);
  assert.ok(estimate(tall,at(3,3)).shade > 0);
  assert.ok(estimate(tall,at(3,3)).temperature < estimate(low,at(3,3)).temperature);
  assert.equal(estimate(tall,at(0,3)).shade,0);
});
test('roof receiver height prevents lower objects from shading higher roofs', () => {
  let cells = editCell(blankNeighborhood(),at(1,3),'building',{height:'low',material:'brick'});
  cells = editCell(cells,at(2,3),'building',{height:'tall',material:'dark'});
  assert.equal(estimate(cells,at(2,3)).shade,0);
  cells = editCell(cells,at(1,3),'building',{height:'tall',material:'brick'});
  cells = editCell(cells,at(2,3),'building',{height:'low',material:'dark'});
  assert.ok(estimate(cells,at(2,3)).shade > 0);
});
test('trees shade eastward and nearby cooling decays with distance', () => {
  const cells = editCell(blankNeighborhood(),at(2,3),'tree');
  assert.ok(estimate(cells,at(3,3)).shade > 0);
  assert.ok(estimate(cells,at(3,3)).temperature < 60);
  assert.ok(estimate(cells,at(2,4)).cooling > estimate(cells,at(2,5)).cooling);
  assert.equal(estimate(cells,at(7,7)).cooling,0);
  assert.equal(estimate(cells,at(7,7)).temperature,60);
});
test('overlapping cooling is capped and shadow fraction stays bounded', () => {
  let cells = blankNeighborhood();
  for (const [x,z] of [[2,3],[4,3],[3,2],[3,4]]) cells = editCell(cells,at(x,z),'tree');
  assert.equal(estimate(cells,at(3,3)).cooling,4);
  cells = cells.map(cell => ({...cell,object:{type:'tree'}}));
  for (const result of temperatures(cells)) {
    assert.ok(result.cooling <= 4);
    assert.ok(result.shade >= 0 && result.shade <= 1);
    assert.ok(result.temperature >= AIR && result.temperature <= 60);
  }
});
test('heat budget terms sum to the displayed temperature, even at the air-temperature floor', () => {
  let cells = editCell(blankNeighborhood(),at(3,3),'ground',{ground:'grass'});
  cells = editCell(cells,at(2,3),'building',{height:'tall',material:'dark'});
  for (const [x,z] of [[3,2],[3,4],[4,3]]) cells = editCell(cells,at(x,z),'tree');
  const floored = estimate(cells,at(3,3));
  assert.equal(floored.temperature,AIR);
  assert.ok(floored.cooling < 4);
  for (const result of [...temperatures(cells),...temperatures(exampleNeighborhood())]) {
    const total = AIR + result.excess - result.shadeReduction - result.cooling;
    assert.ok(Math.abs(total - result.temperature) < 1e-9);
    assert.ok(result.cooling >= 0 && result.temperature >= AIR);
  }
});
test('tree cooling fades with roof height', () => {
  const base = editCell(blankNeighborhood(),at(3,3),'tree');
  const low = editCell(base,at(3,4),'building',{height:'low',material:'dark'});
  const tall = editCell(base,at(3,4),'building',{height:'tall',material:'dark'});
  assert.ok(estimate(low,at(3,4)).cooling > 0);
  assert.equal(estimate(tall,at(3,4)).cooling,0);
});
test('replacement, removal and stored ground are consistent and immutable', () => {
  const base = editCell(blankNeighborhood(),0,'ground',{ground:'grass'});
  const tree = editCell(base,0,'tree');
  const building = editCell(tree,0,'building',{height:'medium',material:'brick'});
  assert.equal(building[0].object.type,'building'); assert.equal(tree[0].object.type,'tree');
  const removed = editCell(building,0,'remove');
  assert.equal(removed[0].object,null); assert.equal(removed[0].ground,'grass');
  assert.equal(estimate(removed,0).temperature,estimate(base,0).temperature);
});
test('removing a tree restores neighboring temperatures immediately', () => {
  const cells = editCell(blankNeighborhood(),at(2,3),'tree');
  assert.ok(estimate(cells,at(3,3)).temperature < 60);
  assert.equal(estimate(editCell(cells,at(2,3),'remove'),at(3,3)).temperature,60);
});
test('reset and example are independent deterministic neighborhoods', () => {
  const example = exampleNeighborhood(); assert.ok(example.some(c => c.object));
  const copy = exampleNeighborhood(); example[0].ground = 'grass';
  assert.equal(copy[0].ground,'asphalt');
  const reset = blankNeighborhood(); assert.ok(reset.every(c => c.ground==='asphalt' && c.object===null));
  assert.ok(temperatures(reset).every(r=>r.temperature===60));
  assert.deepEqual(temperatures(exampleNeighborhood()),temperatures(copy));
});
test('all materials, heights and dense scenarios remain finite and bounded', () => {
  for (const height of Object.keys(HEIGHTS)) for (const material of Object.keys(MATERIALS)) for (const ground of Object.keys(SURFACES)) {
    const cells = blankNeighborhood().map((cell,i) => ({ground,object:i%3===0?{type:'tree'}:{type:'building',height,material}}));
    for (const r of temperatures(cells)) assert.ok(Number.isFinite(r.temperature) && r.temperature>=32 && r.temperature<=60);
  }
});
test('invalid edits are rejected', () => {
  assert.throws(()=>editCell(blankNeighborhood(),64,'tree'),RangeError);
  assert.throws(()=>editCell(blankNeighborhood(),0,'building',{height:'huge'}));
  assert.throws(()=>editCell(blankNeighborhood(),0,'ground',{ground:'lava'}));
});
