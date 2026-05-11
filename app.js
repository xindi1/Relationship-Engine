const KEY = "relationship_engine_v1";
let state = load();

const $ = id => document.getElementById(id);
const nowISO = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0,10);
const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);

function load(){
  try { return JSON.parse(localStorage.getItem(KEY)) || seedState(); }
  catch { return seedState(); }
}
function seedState(){ return { people:[], interactions:[], theme:"light" }; }
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function daysAgo(dateStr){
  if(!dateStr) return 9999;
  return Math.floor((new Date() - new Date(dateStr)) / 86400000);
}
function weekCount(){
  const cutoff = Date.now() - 7*86400000;
  return state.interactions.filter(i => new Date(i.date).getTime() >= cutoff).length;
}

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.theme = state.theme || "light";
  bindTabs(); bindEvents(); renderAll(); registerSW();
});

function bindTabs(){
  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
    renderAll();
  }));
}
function bindEvents(){
  $("themeBtn").onclick = () => { state.theme = state.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = state.theme; save(); };
  $("seedBtn").onclick = loadDemo;
  $("quickSwingBtn").onclick = quickSwing;
  $("addPersonBtn").onclick = addPerson;
  $("saveLogBtn").onclick = saveInteraction;
  $("peopleSearch").oninput = renderPeople;
  $("exportBtn").onclick = exportData;
  $("importFile").onchange = importData;
  $("resetBtn").onclick = () => { if(confirm("Reset Relationship Engine data?")){ state=seedState(); save(); renderAll(); } };
}

function loadDemo(){
  if(state.people.length || state.interactions.length){
    if(!confirm("Add demo people and interactions?")) return;
  }
  const names = [
    ["Ronnie","Family","Energizing","Lake Norman, property, family network, practical support","family, lake, property, peripheral opportunity"],
    ["Ron","Family","Energizing","Atlanta trip, Rashad book tour, entrepreneurial sounding board","family, atlanta, deal flow"],
    ["Charade","Professional","Energizing","Potential walkthrough and stakeholder feedback","professional, app feedback, healthcare"],
    ["Aunt Sophie","Family","Healing","Warm reconnection after Wesley graduation","family, birth family, healing"],
    ["Michael Wang","Peripheral","Neutral","Dormant professional contact worth re-engaging","peripheral, dormant, opportunity"]
  ];
  names.forEach(n => state.people.push({id:uid(), name:n[0], category:n[1], energy:n[2], nextFollowup:today(), context:n[3], tags:n[4], created:nowISO()}));
  state.interactions.unshift({id:uid(), person:"Ronnie", type:"Text", date:nowISO(), moodBefore:"Before 3", moodAfter:"After 4", quality:"Clear", notes:"Property/lake duties coordination. Practical trust-building.", followNeeded:false, swingType:"Maintenance"});
  state.interactions.unshift({id:uid(), person:"Aunt Sophie", type:"Text", date:nowISO(), moodBefore:"Before 4", moodAfter:"After 5", quality:"Warm", notes:"Welcoming family message after graduation.", followNeeded:true, swingType:"Gratitude"});
  save(); renderAll();
}

function quickSwing(){
  const name = $("quickName").value.trim();
  if(!name) return;
  state.interactions.unshift({id:uid(), person:name, type:"Swing", date:nowISO(), moodBefore:"Before 3", moodAfter:"After 3", quality:"Strategic", notes:$("quickNote").value.trim(), followNeeded:false, swingType:$("quickType").value});
  if(!state.people.some(p => p.name.toLowerCase() === name.toLowerCase())){
    state.people.push({id:uid(), name, category:"Peripheral", energy:"Neutral", nextFollowup:"", context:"Added via Quick Swing.", tags:$("quickType").value, created:nowISO()});
  }
  $("quickName").value = ""; $("quickNote").value = "";
  save(); renderAll();
}
function addPerson(){
  const name = $("personName").value.trim();
  if(!name) return;
  state.people.unshift({id:uid(), name, category:$("personCategory").value, energy:$("energyImpact").value, nextFollowup:$("nextFollowup").value, context:$("personContext").value.trim(), tags:$("personTags").value.trim(), created:nowISO()});
  ["personName","personContext","personTags","nextFollowup"].forEach(id => $(id).value="");
  save(); renderAll();
}
function saveInteraction(){
  const person = $("logPerson").value.trim();
  if(!person) return;
  state.interactions.unshift({id:uid(), person, type:$("interactionType").value, date:nowISO(), moodBefore:$("moodBefore").value, moodAfter:$("moodAfter").value, quality:$("commQuality").value, notes:$("logNotes").value.trim(), followNeeded:$("followNeeded").checked, swingType:$("interactionType").value});
  if(!state.people.some(p => p.name.toLowerCase() === person.toLowerCase())){
    state.people.push({id:uid(), name:person, category:"Peripheral", energy:"Neutral", nextFollowup:"", context:"Added from interaction log.", tags:"", created:nowISO()});
  }
  $("logPerson").value = ""; $("logNotes").value = ""; $("followNeeded").checked = false;
  save(); renderAll();
}
function markFollowed(id){
  const i = state.interactions.find(x => x.id === id);
  if(i) i.followNeeded = false;
  save(); renderAll();
}
function deleteInteraction(id){ state.interactions = state.interactions.filter(x => x.id !== id); save(); renderAll(); }
function deletePerson(id){ state.people = state.people.filter(x => x.id !== id); save(); renderAll(); }
function logForPerson(name){
  $("logPerson").value = name;
  document.querySelector('[data-tab="log"]').click();
}
function renderAll(){
  $("weeklyCount").textContent = weekCount();
  $("openFollowups").textContent = state.interactions.filter(i=>i.followNeeded).length;
  renderQueue(); renderRecent(); renderPeople(); renderTimeline(); renderSwings(); renderPeripheral();
}
function personLast(name){
  return state.interactions.find(i => i.person.toLowerCase() === name.toLowerCase());
}
function renderQueue(){
  const due = state.people
    .map(p => ({...p, last: personLast(p.name)}))
    .sort((a,b) => (a.nextFollowup || "9999").localeCompare(b.nextFollowup || "9999") || daysAgo(a.last?.date)-daysAgo(b.last?.date))
    .slice(0,8);
  $("queueList").innerHTML = due.length ? due.map(p => itemPerson(p)).join("") : `<div class="empty">No relationships yet. Add someone or load demo data.</div>`;
}
function renderRecent(){
  $("recentList").innerHTML = state.interactions.slice(0,5).map(itemInteraction).join("") || `<div class="empty">No interactions logged yet.</div>`;
}
function renderPeople(){
  const q = $("peopleSearch").value.trim().toLowerCase();
  const people = state.people.filter(p => !q || [p.name,p.category,p.energy,p.tags,p.context].join(" ").toLowerCase().includes(q));
  $("peopleList").innerHTML = people.map(itemPerson).join("") || `<div class="empty">No matching people.</div>`;
}
function renderTimeline(){
  $("timelineList").innerHTML = state.interactions.map(itemInteraction).join("") || `<div class="empty">No timeline entries yet.</div>`;
}
function renderSwings(){
  const types = ["Maintenance","Gratitude","Reconnection","Strategic","Opportunity","Family"];
  $("swingStats").innerHTML = types.map(t => `<div class="metric card"><span>${state.interactions.filter(i=>i.swingType===t).length}</span><small>${t}</small></div>`).join("");
  const open = state.interactions.filter(i => i.followNeeded);
  $("followupList").innerHTML = open.map(itemInteraction).join("") || `<div class="empty">No open follow-ups.</div>`;
}
function renderPeripheral(){
  const list = state.people.filter(p => p.category === "Peripheral" || (p.tags||"").toLowerCase().includes("peripheral") || daysAgo(personLast(p.name)?.date) > 60);
  $("peripheralList").innerHTML = list.map(p => {
    const last = personLast(p.name);
    return `<div class="item"><h3>${esc(p.name)}</h3><p class="muted">${last ? daysAgo(last.date)+" days since last touch" : "No touch logged yet"} · ${esc(p.context)}</p><div class="meta"><span class="pill">${esc(p.category)}</span><span class="pill">${esc(p.energy)}</span></div><div class="actions"><button class="done" onclick="logForPerson('${esc(p.name)}')">Log touch</button></div></div>`;
  }).join("") || `<div class="empty">No peripheral contacts yet.</div>`;
}
function itemPerson(p){
  const last = personLast(p.name);
  return `<div class="item">
    <h3>${esc(p.name)}</h3>
    <p class="muted">${esc(p.context || "No context yet.")}</p>
    <div class="meta">
      <span class="pill">${esc(p.category)}</span>
      <span class="pill">${esc(p.energy)}</span>
      ${p.nextFollowup ? `<span class="pill">Next ${esc(p.nextFollowup)}</span>` : ""}
      ${last ? `<span class="pill">Last ${daysAgo(last.date)}d ago</span>` : `<span class="pill">No touch</span>`}
    </div>
    ${p.tags ? `<p class="muted" style="margin-top:8px">${esc(p.tags)}</p>` : ""}
    <div class="actions">
      <button class="done" onclick="logForPerson('${esc(p.name)}')">Log touch</button>
      <button class="del" onclick="deletePerson('${p.id}')">Delete</button>
    </div>
  </div>`;
}
function itemInteraction(i){
  return `<div class="item">
    <h3>${esc(i.person)}</h3>
    <p class="muted">${new Date(i.date).toLocaleString()} · ${esc(i.type)} · ${esc(i.quality)}</p>
    ${i.notes ? `<p style="margin:8px 0 0">${esc(i.notes)}</p>` : ""}
    <div class="meta">
      <span class="pill">${esc(i.moodBefore)}</span>
      <span class="pill">${esc(i.moodAfter)}</span>
      <span class="pill">${esc(i.swingType || i.type)}</span>
      ${i.followNeeded ? `<span class="pill">Follow-up needed</span>` : ""}
    </div>
    <div class="actions">
      ${i.followNeeded ? `<button class="done" onclick="markFollowed('${i.id}')">Mark followed</button>` : ""}
      <button class="del" onclick="deleteInteraction('${i.id}')">Delete</button>
    </div>
  </div>`;
}
function exportData(){
  const blob = new Blob([JSON.stringify({app:"Relationship Engine v1 fixed", exportedAt:nowISO(), state}, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `relationship-engine-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function importData(e){
  const file = e.target.files?.[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      state = parsed.state || parsed;
      if(!state.people) state.people = [];
      if(!state.interactions) state.interactions = [];
      if(!state.theme) state.theme = "light";
      save(); renderAll(); document.documentElement.dataset.theme = state.theme;
    }catch{ alert("Invalid JSON file."); }
    e.target.value = "";
  };
  reader.readAsText(file);
}
function registerSW(){
  if("serviceWorker" in navigator){
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(()=>{}));
  }
}
window.markFollowed = markFollowed;
window.deleteInteraction = deleteInteraction;
window.deletePerson = deletePerson;
window.logForPerson = logForPerson;
