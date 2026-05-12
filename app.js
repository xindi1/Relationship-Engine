const KEY='relationship_engine_lite_v1';
let state=load();

const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);

function load(){
try{return JSON.parse(localStorage.getItem(KEY))||{logs:[],theme:'light'}}
catch{return{logs:[],theme:'light'}}
}

function save(){
localStorage.setItem(KEY,JSON.stringify(state));
}

document.addEventListener('DOMContentLoaded',()=>{
document.documentElement.dataset.theme=state.theme;
$('date').value=today();

document.querySelectorAll('.tab').forEach(btn=>{
btn.onclick=()=>{
document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
btn.classList.add('active');
document.getElementById(btn.dataset.tab).classList.add('active');
};
});

$('themeBtn').onclick=()=>{
state.theme=state.theme==='dark'?'light':'dark';
document.documentElement.dataset.theme=state.theme;
save();
};

$('saveBtn').onclick=saveLog;

render();

if('serviceWorker' in navigator){
navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
}
});

function saveLog(){
const person=$('person').value.trim();
if(!person)return;

state.logs.unshift({
person,
mode:$('mode').value,
energy:$('energy').value,
followup:$('followup').checked,
date:$('date').value,
note:$('note').value.trim()
});

$('person').value='';
$('followup').checked=false;
$('note').value='';
$('date').value=today();

save();
render();
}

function render(){
const logs=state.logs;

$('todayCount').textContent=logs.filter(l=>l.date===today()).length;

const cutoff=Date.now()-7*86400000;
$('weekCount').textContent=logs.filter(l=>new Date(l.date).getTime()>=cutoff).length;

$('energizingCount').textContent=logs.filter(l=>l.energy==='Energizing').length;
$('drainingCount').textContent=logs.filter(l=>l.energy==='Draining').length;

$('recentList').innerHTML=logs.slice(0,10).map(card).join('')||'<p>No logs yet.</p>';

const latest={};
logs.forEach(log=>{
if(!latest[log.person])latest[log.person]=log;
});

$('continuityList').innerHTML=Object.values(latest).map(card).join('')||'<p>No continuity yet.</p>';

const modes={};
logs.forEach(log=>{
modes[log.mode]=(modes[log.mode]||0)+1;
});

$('modeList').innerHTML=Object.entries(modes).map(([mode,count])=>`
<div class="item">
<h3>${mode}</h3>
<p>${count} interaction${count===1?'':'s'}</p>
</div>
`).join('')||'<p>No mode data yet.</p>';
}

function card(log){
return `
<div class="item">
<h3>${escapeHTML(log.person)}</h3>
<p>${log.date}</p>
${log.note?`<p>${escapeHTML(log.note)}</p>`:''}
<div class="meta">
<span class="pill">${escapeHTML(log.mode)}</span>
<span class="pill">${escapeHTML(log.energy)}</span>
${log.followup?'<span class="pill">Follow-up</span>':''}
</div>
</div>
`;
}

function escapeHTML(str){
return String(str||'').replace(/[&<>"]/g,function(m){
return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];
});
}
