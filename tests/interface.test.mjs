import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Execute the shipped standalone bundle with DOM/canvas adapters. This checks
// real event wiring and offline canvas picking, not a separate copy of the app.
async function startApp() {
  const elements = new Map();
  const drawing = { polygons: 0 };
  const context = new Proxy({}, { get: (_,key) => (...args) => { if(key==='fill') drawing.polygons++; }, set: () => true });
  class Element {
    constructor(id) {
      this.id=id; this.listeners={}; this.children=[]; this.dataset={}; this.style={}; this.attributes={}; this.value=''; this.checked=false;
      const classes=new Set(); this.classList={toggle:(name,on)=>on?classes.add(name):classes.delete(name),contains:name=>classes.has(name)};
      this.clientWidth=600; this.clientHeight=410; this.parentElement={};
    }
    addEventListener(name,fn) { (this.listeners[name] ||= []).push(fn); }
    emit(name,event={}) { for(const fn of this.listeners[name]||[]) fn(event); }
    append(child) { this.children.push(child); }
    setAttribute(name,value) { this.attributes[name]=value; }
    getContext() { return context; }
    getBoundingClientRect() { return {left:0,top:0,width:600,height:410}; }
    cloneNode() { return new Element(this.id); }
    replaceWith(next) { elements.set(this.id,next); }
  }
  const html = await readFile(new URL('../preview.html',import.meta.url),'utf8');
  for(const [,id] of html.matchAll(/\bid="([^"]+)"/g)) elements.set(id,new Element(id));
  const tools = ['inspect','tree','building','ground','remove'].map(tool => { const e=new Element(); e.dataset.tool=tool; return e; });
  elements.get('height').value='medium'; elements.get('material').value='brick'; elements.get('ground').value='asphalt'; elements.get('heatmap').checked=true;
  const document={getElementById:id=>elements.get(id),createElement:()=>new Element(),querySelectorAll:selector=> { assert.equal(selector,'[data-tool]'); return tools; }};
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const sandbox={document,console,devicePixelRatio:1,ResizeObserver:class { observe() {} },setTimeout:fn=>{ fn(); return 0; }};
  await new vm.Script(`(async () => { ${script}\n })()`,{importModuleDynamically:()=>Promise.reject(new Error('offline test'))}).runInNewContext(sandbox);
  return {
    el:id=>elements.get(id),
    tool:name=>tools.find(t=>t.dataset.tool===name).emit('click'),
    tile:index=>elements.get('tile-grid').children[index].emit('click'),
    choose:(id,value)=>{ elements.get(id).value=value; elements.get(id).emit('change'); },
    temperature:()=>Number(elements.get('result').innerHTML.match(/class="temperature">([\d.]+)/)[1]),
    drawing,
  };
}

test('standalone preview loads all tiles and offline renderer',async()=>{
  const app=await startApp();
  assert.equal(app.el('tile-grid').children.length,64);
  assert.match(app.el('renderer-status').textContent,/fallback/);
  assert.ok(app.drawing.polygons>=64);
  assert.match(app.el('result').innerHTML,/Estimated ground temperature/);
});
test('placement, selected building editing and removal update the UI',async()=>{
  const app=await startApp(); app.el('reset').emit('click');
  app.tool('building'); app.tile(24);
  assert.match(app.el('result').innerHTML,/12 m building/);
  app.choose('height','tall'); assert.match(app.el('result').innerHTML,/24 m building/);
  app.choose('material','reflective'); assert.equal(app.temperature(),41);
  app.tool('inspect'); app.tile(26);
  assert.ok(app.temperature()<60);
  app.tool('remove'); app.tile(24); assert.equal(app.temperature(),60);
  app.tool('inspect'); app.tile(26); assert.equal(app.temperature(),60);
});
test('building tool selects an existing building instead of overwriting it, and tool switches sync menus',async()=>{
  const app=await startApp(); app.el('reset').emit('click');
  app.tool('building'); app.choose('height','tall'); app.choose('material','dark'); app.tile(24);
  app.tool('inspect'); app.tile(25); app.tool('building'); app.choose('height','low');
  app.tile(24); assert.match(app.el('result').innerHTML,/24 m building/);
  assert.equal(app.el('height').value,'tall'); assert.equal(app.el('material').value,'dark');
  app.tile(25); assert.match(app.el('result').innerHTML,/24 m building/);
  app.tool('inspect'); app.tile(24); app.el('height').value='low'; app.tool('building');
  assert.equal(app.el('height').value,'tall');
});
test('tile explorer numbers match the readout on every example tile',async()=>{
  const app=await startApp(); app.el('example').emit('click');
  for(let index=0;index<64;index++){
    app.tile(index);
    assert.equal(Number(app.el('tile-grid').children[index].textContent.replace(/^[TB] /,'')),Math.round(app.temperature()),`tile ${index}`);
  }
});
test('a tree tile credits its own tree in the heat budget',async()=>{
  const app=await startApp(); app.el('reset').emit('click');
  app.tool('tree'); app.tile(25); assert.match(app.el('result').innerHTML,/This tree and nearby trees/);
  app.tool('inspect'); app.tile(26); assert.match(app.el('result').innerHTML,/<dt>Nearby trees<\/dt>/);
});
test('tree planting, ground change, reset and example update results and map',async()=>{
  const app=await startApp(); app.el('reset').emit('click');
  app.tool('tree'); app.tile(25);
  assert.match(app.el('result').innerHTML,/Tree · ground beneath canopy/);
  assert.ok(app.temperature()<60);
  app.tool('inspect'); app.tile(26); assert.ok(app.temperature()<60);
  app.tool('remove'); app.tile(25); app.tool('inspect'); app.tile(26); assert.equal(app.temperature(),60);
  app.choose('ground','grass'); assert.equal(app.temperature(),39);
  app.el('reset').emit('click'); assert.equal(app.temperature(),60);
  assert.ok(app.el('tile-grid').children.every(b=>b.textContent==='60'));
  app.el('example').emit('click'); assert.ok(app.el('tile-grid').children.some(b=>b.textContent.startsWith('B ')));
  const before=app.temperature(); app.el('heatmap').checked=false; app.el('heatmap').emit('change'); assert.equal(app.temperature(),before);
});
test('canvas ray picking uses visible tile location and runs the selected tool',async()=>{
  const app=await startApp(); app.el('reset').emit('click'); app.tool('tree');
  const scale=Math.min((600-34)/16,(410-40)/(16*.48+2.4));
  app.el('scene').emit('click',{clientX:300,clientY:20+2.4*scale+.48*scale});
  assert.equal(app.el('location').textContent,'Tile A1');
  assert.match(app.el('tile-grid').children[0].textContent,/^T /);
  assert.ok(app.temperature()<60);
});
