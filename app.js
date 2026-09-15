const KEY="acs_definitivo_v12";
const AIR_POINTS=[
["31,018","-1.000","20"],["29,921","0","20"],["29,385","500","20"],["28,856","1.000","20"],
["28,335","1.500","25"],["27,821","2.000","30"],["26,817","3.000","30"],["25,842","4.000","35"],
["23,978","6.000","40"],["22,225","8.000","60"],["20,577","10.000","80"],["19,029","12.000","90"],
["17,577","14.000","100"],["16,216","16.000","110"],["14,942","18.000","120"],["13,750","20.000","130"]
];
const ALT_POINTS=[["31,018","-1.000","20"],["29,921","0","20"],["29,385","500","20"],["28,856","1.000","20"],["28,335","1.500","25"],["27,821","2.000","30"],["26,817","3.000","30"],["25,842","4.000","35"],["23,978","6.000","40"],["22,225","8.000","60"],["20,577","10.000","80"],["19,029","12.000","90"],["17,577","14.000","100"]];
const tabs={altimetro:"Altímetro",integracao:"Integração",encoder:"Encoder",transponder:"Transponder",airdata:"Air Data"};
let db=JSON.parse(localStorage.getItem(KEY)||'{"sessions":[],"outbox":[],"settings":{}}');
let current=null, activeReport=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const saveDB=()=>localStorage.setItem(KEY,JSON.stringify(db));
function show(view){document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));$("view-"+view).classList.remove("hidden");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===view));$("pageTitle").textContent={dashboard:"Dashboard",session:"Nova Sessão",aircraft:"Aeronaves",clients:"Clientes",sessions:"Histórico",backup:"Backup"}[view];if(view==="dashboard")renderDash();if(view==="aircraft")renderAircraft();if(view==="clients")renderClients();if(view==="sessions")renderSessions();}
function newSession(){
 current={id:crypto.randomUUID(),status:"draft",createdAt:new Date().toISOString(),reports:["altimetro"],meta:{},data:{},observacoes:""};
 clearForm(); loadSession(); show("session");
}
function clearForm(){["os","data","cliente","validade","fabricante","pn","sn","prefixo","tecnico","observacoesAjustes"].forEach(id=>{if($(id))$(id).value=id==="validade"?"2 anos":""});document.querySelectorAll("[data-select-report]").forEach((x,i)=>x.checked=i===0);}
function readMeta(){current.meta={os:$("os").value,data:$("data").value,cliente:$("cliente").value,validade:$("validade").value,fabricante:$("fabricante").value,pn:$("pn").value,sn:$("sn").value,prefixo:$("prefixo").value,tecnico:$("tecnico").value};current.observacoes=$("observacoesAjustes").value;current.reports=[...document.querySelectorAll("[data-select-report]:checked")].map(x=>x.dataset.selectReport);current.updatedAt=new Date().toISOString();}
function loadSession(){
 const m=current.meta||{};["os","data","cliente","validade","fabricante","pn","sn","prefixo","tecnico"].forEach(id=>$(id).value=m[id]??(id==="validade"?"2 anos":""));$("observacoesAjustes").value=current.observacoes||"";
 document.querySelectorAll("[data-select-report]").forEach(x=>x.checked=current.reports.includes(x.dataset.selectReport));
 renderReports();
}
function persist(status){readMeta();current.status=status||current.status;const i=db.sessions.findIndex(s=>s.id===current.id);if(i<0)db.sessions.push(current);else db.sessions[i]=current;db.outbox.push({id:crypto.randomUUID(),sessionId:current.id,when:new Date().toISOString(),payload:current});saveDB();updateDash();return current;}
function makeTable(headers,rows,editable=true){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`}
function num(v){return parseFloat(String(v??"").replace(",", "."))}
function cellClass(v,t){if(v===""||v==null)return"";const n=Math.abs(num(v)),tol=num(t);if(!isFinite(n)||!isFinite(tol))return"";if(n>tol)return"cell-red";if(n>=tol-2)return"cell-yellow";return"cell-green";}
function altReport(){
 let d=current.data.altimetro||{friction:[],scale:[],hyst:[],leak:"",baro:""}; 
 const fr=ALT_POINTS.map((p,i)=>{let r=d.friction[i]||{};return `<tr><td>${p[0]}</td><td>${p[1]}</td><td>${p[2]}</td><td><input data-r="fric" data-i="${i}" value="${esc(r.v||"")}"></td></tr>`});
 const sc=ALT_POINTS.map((p,i)=>{let r=d.scale[i]||{};return `<tr><td>${p[0]}</td><td>${p[1]}</td><td>${p[2]}</td><td><input data-r="scale" data-i="${i}" value="${esc(r.v||"")}"></td></tr>`});
 const hy=ALT_POINTS.map((p,i)=>{let r=d.hyst[i]||{};let dec=d.scale[i]?.v||"";return `<tr><td>${p[1]}</td><td><input data-r="hystInc" data-i="${i}" value="${esc(r.inc||"")}"></td><td><input readonly value="${esc(dec)}"></td><td><input readonly class="hystDiff" data-i="${i}" value="${esc(r.diff||"")}"></td></tr>`});
 return `<div class="report" data-report-body="altimetro"><h2>LAUDO TÉCNICO DO ALTÍMETRO</h2><h3>Teste de Atrito — pressão decrescente</h3>${makeTable(["Pressão (pol Hg)","Altitude (pés)","Tolerância","Valor com vibração"],fr)}
 <h3>Erro de Escala — pressão decrescente</h3>${makeTable(["Pressão (pol Hg)","Altitude (pés)","Tolerância","Valor lido"],sc)}
 <div class="two-cols"><div><h3>Vazamento de Caixa</h3><input data-simple="leak" value="${esc(d.leak||"")}"></div><div><h3>Erro de Escala do Barômetro</h3><input data-simple="baro" value="${esc(d.baro||"")}"></div></div>
 <h3>Histerese — pressão crescente</h3>${makeTable(["Altitude (pés)","Valor lido (pressão crescente)","Valor lido durante o teste","Diferença"],hy)}</div>`;
}
function integrationReport(){
 const d=current.data.integracao||{rows:[]};let rows=ALT_POINTS.map((p,i)=>{let r=d.rows[i]||{};let alt=current.data.altimetro?.scale?.[i]?.v||"";return `<tr><td>${p[1]}</td><td><input readonly value="${esc(alt)}"></td><td><input data-r="int" data-i="${i}" value="${esc(r.trans||"")}"></td></tr>`});
 return `<div class="report" data-report-body="integracao"><h2>LAUDO TÉCNICO — INTEGRAÇÃO DO TRANSPONDER E ALTITUDE ENCODER</h2>${makeTable(["Altitude nominal (pés)","Altímetro","Altitude transmitida"],rows)}</div>`;
}
function encoderReport(){let d=current.data.encoder||{};return `<div class="report" data-report-body="encoder"><h2>LAUDO TÉCNICO DO ENCODER</h2><p class="hint">Informe os pontos de transição atuais.</p>${makeTable(["Ponto nominal","Transição atual"],Array.from({length:13},(_,i)=>`<tr><td>${i+1}</td><td><input data-r="enc" data-i="${i}" value="${esc(d[i]||"")}"></td></tr>`))}</div>`}
function transponderReport(){let d=current.data.transponder||{};const fields=["Frequência de resposta","Potência de pico","Supressão Mode A","Sensibilidade do receptor","Outras medições","Medições exclusivas Mode S","Perdas de linha / observações"];return `<div class="report" data-report-body="transponder"><h2>LAUDO TÉCNICO DO TRANSPONDER</h2>${fields.map((f,i)=>`<label class="full">${f}<input data-t="${i}" value="${esc(d[i]||"")}"></label>`).join("")}</div>`}
function airdataReport(){let d=current.data.airdata||{rows:[],leak:""};let rows=AIR_POINTS.map((p,i)=>{let r=d.rows[i]||{};return `<tr><td>${p[0]}</td><td>${p[1]}</td><td><input data-r="air" data-i="${i}" value="${esc(r.v||"")}"></td><td>${p[2]}</td></tr>`});return `<div class="report" data-report-body="airdata"><h2>LAUDO TÉCNICO DO AIRDATA</h2><p class="hint">Todos os campos do Air Data são 100% manuais.</p><h3>Teste #1 — Erro de Escala (pressão decrescente)</h3>${makeTable(["Pressão equiv. (pol Hg)","Altitude (pés)","Valor lido (pés)","Tolerância (± pés)"],rows)}<h3>Teste #4 — Vazamento da Linha</h3>${makeTable(["Pressão (in Hg)","Altitude (pés)","Valor lido (pés)","Tolerância"],[`<tr><td>13.750</td><td>20.000</td><td><input data-simple="airLeak" value="${esc(d.leak||"")}"></td><td>± 100</td></tr>`])}<p class="hint">Calibração realizada na aeronave conforme RBAC 43 apêndice “E”. Equipamento utilizado na calibração: Air Data Test Set GE PN ATDS405F SN 4050660311.</p></div>`}
function renderReports(){const selected=current.reports;const tabs=$("reportTabs"),body=$("reports");tabs.innerHTML=selected.map((r,i)=>`<button class="tab ${i===0?"active":""}" data-tab="${r}">${tabs[r]||tabs[r]}</button>`).join("");tabs.innerHTML=selected.map((r,i)=>`<button class="tab ${i===0?"active":""}" data-tab="${r}">${tabsObj(r)}</button>`).join("");body.innerHTML=selected.map(r=>({altimetro:altReport,integracao:integrationReport,encoder:encoderReport,transponder:transponderReport,airdata:airdataReport}[r])()).join("");activeReport=selected[0]||null;activateReport(activeReport);tabs.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>activateReport(b.dataset.tab));bindInputs();}
function tabsObj(r){return {altimetro:"Altímetro",integracao:"Integração",encoder:"Encoder",transponder:"Transponder",airdata:"Air Data"}[r]}
function activateReport(r){activeReport=r;document.querySelectorAll("[data-report-body]").forEach(x=>x.classList.toggle("hidden",x.dataset.reportBody!==r));document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x.dataset.tab===r))}
function bindInputs(){
 document.querySelectorAll("#reports input").forEach(el=>el.oninput=()=>{collectReport();});
}
function collectReport(){
 const a=current.data.altimetro ||= {};
 a.friction ||= [];a.scale ||= [];a.hyst ||= [];
 document.querySelectorAll('[data-r="fric"]').forEach(x=>a.friction[x.dataset.i]={v:x.value});
 document.querySelectorAll('[data-r="scale"]').forEach(x=>a.scale[x.dataset.i]={v:x.value});
 document.querySelectorAll('[data-r="hystInc"]').forEach(x=>{a.hyst[x.dataset.i]??={};a.hyst[x.dataset.i].inc=x.value;let dec=a.scale[x.dataset.i]?.v||"";a.hyst[x.dataset.i].diff=(x.value!==""&&dec!=="")?(num(x.value)-num(dec)).toFixed(2):"";});
 a.leak=document.querySelector('[data-simple="leak"]')?.value||a.leak||"";a.baro=document.querySelector('[data-simple="baro"]')?.value||a.baro||"";
 const ir=current.data.integracao ||= {rows:[]};document.querySelectorAll('[data-r="int"]').forEach(x=>ir.rows[x.dataset.i]={trans:x.value});
 const en=current.data.encoder ||= {};document.querySelectorAll('[data-r="enc"]').forEach(x=>en[x.dataset.i]=x.value);
 const tr=current.data.transponder ||= {};document.querySelectorAll("[data-t]").forEach(x=>tr[x.dataset.t]=x.value);
 const ad=current.data.airdata ||= {rows:[]};document.querySelectorAll('[data-r="air"]').forEach(x=>ad.rows[x.dataset.i]={v:x.value});ad.leak=document.querySelector('[data-simple="airLeak"]')?.value||ad.leak||"";
 // agreed automatic relationship: Altímetro scale -> integration only by exact altitude row.
 document.querySelectorAll('[data-r="int"]').forEach(x=>{const i=Number(x.dataset.i);const alt=current.data.altimetro?.scale?.[i]?.v||"";const input=x.closest("tr")?.querySelector('td:nth-child(2) input');if(input)input.value=alt;});
}
function renderDash(){const s=db.sessions;$("dashTotal").textContent=s.length;$("dashOpen").textContent=s.filter(x=>x.status==="draft").length;$("dashDone").textContent=s.filter(x=>x.status==="done").length;$("dashAircraft").textContent=new Set(s.map(x=>x.meta?.prefixo).filter(Boolean)).size;$("recentSessions").innerHTML=s.slice().reverse().slice(0,8).map(x=>`<div class="list-item"><b>OS ${esc(x.meta?.os||"—")} • ${esc(x.meta?.prefixo||"Sem prefixo")}</b><small>${esc(x.meta?.cliente||"")} • ${esc(x.meta?.data||"")} • ${x.status==="done"?"Finalizada":"Rascunho"}</small></div>`).join("")||'<div class="hint">Nenhuma sessão cadastrada.</div>'}
function renderSessions(){$("sessionsList").innerHTML=db.sessions.slice().reverse().map(x=>`<div class="list-item"><b>OS ${esc(x.meta?.os||"—")} — ${esc(x.meta?.prefixo||"Sem prefixo")}</b><small>${esc(x.meta?.cliente||"")} • ${esc(x.meta?.data||"")} • ${x.status==="done"?"Finalizada":"Em andamento"}</small><div class="actions"><button class="secondary" onclick="openSession('${x.id}')">Abrir</button></div></div>`).join("")||'<div class="hint">Nenhuma sessão cadastrada.</div>'}
function renderAircraft(){const map={};db.sessions.forEach(s=>{const p=s.meta?.prefixo||"Sem prefixo";(map[p]??=[]).push(s)});$("aircraftList").innerHTML=Object.entries(map).map(([p,arr])=>{const last=arr.slice().sort((a,b)=>String(b.meta?.data).localeCompare(String(a.meta?.data)))[0];return `<div class="list-item"><b>${esc(p)}</b><small>Cliente: ${esc(last.meta?.cliente||"—")} • Último serviço: ${esc(last.meta?.data||"—")}</small><br><small>Histórico: ${arr.length} registro(s). ${arr.map(x=>esc(x.observacoes||"")).filter(Boolean).slice(-1)[0]||"Sem observações."}</small></div>`}).join("")||'<div class="hint">Nenhuma aeronave cadastrada.</div>'}
function renderClients(){const map={};db.sessions.forEach(s=>{const c=s.meta?.cliente||"Sem cliente";(map[c]??=[]).push(s)});$("clientList").innerHTML=Object.entries(map).map(([c,arr])=>{const aircraft=[...new Set(arr.map(x=>x.meta?.prefixo).filter(Boolean))];return `<div class="list-item"><b>${esc(c)}</b><small>Aeronaves: ${esc(aircraft.join(", ")||"—")}</small><br><small>Serviços: ${arr.length} • Validade padrão: 2 anos</small></div>`}).join("")||'<div class="hint">Nenhum cliente cadastrado.</div>'}
function openSession(id){current=db.sessions.find(x=>x.id===id);if(!current)return;loadSession();$("sessionTitle").textContent="Editar sessão";$("deleteSession").classList.remove("hidden");show("session")}
function updateDash(){renderDash()}
function printReport(){collectReport();const pages=[];current.reports.forEach(r=>{const src=document.querySelector(`[data-report-body="${r}"]`);if(src)pages.push(`<div class="print-page"><div><b>Aviation Center — SGC</b><br>OS: ${esc(current.meta.os||"")} &nbsp; Data: ${esc(current.meta.data||"")} &nbsp; Prefixo: ${esc(current.meta.prefixo||"")}<hr></div>${src.innerHTML}</div>`)});$("printRoot").innerHTML=pages.join("");window.print()}
function downloadReport(){collectReport();const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>SGC ${esc(current.meta.os||"")}</title><link rel="stylesheet" href="style.css"></head><body><div class="print-page">${$("printRoot").innerHTML||""}</div></body></html>`;const blob=new Blob([html],{type:"text/html;charset=utf-8"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`SGC-${current.meta.prefixo||"aeronave"}-${current.meta.os||"relatorio"}.html`;a.click();URL.revokeObjectURL(a.href)}
function exportBackup(){const b=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="Aviation-Center-SGC-backup.json";a.click();URL.revokeObjectURL(a.href)}
function importBackup(file){const r=new FileReader();r.onload=()=>{try{db=JSON.parse(r.result);saveDB();renderDash();alert("Backup importado com sucesso.");}catch(e){alert("Backup inválido.");}};r.readAsText(file)}
function connection(){const online=navigator.onLine;$("connectionText").textContent=online?"Online • dados locais":"Offline/local";$("connectionDot").parentElement.classList.toggle("online",online);if(online)syncQueue()}
async function syncQueue(){/* ponto de integração do backend/cloud; sem endpoint configurado não envia dados */if(!db.settings.syncEndpoint)return;/* backend deverá aceitar POST JSON */}

// eventos
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>show(b.dataset.view));
$("quickNew").onclick=newSession;$("newFromList").onclick=newSession;
$("saveDraft").onclick=()=>{persist("draft");alert("Rascunho salvo.");renderSessions()};
$("finishSession").onclick=()=>{if(!current.reports.length)return alert("Selecione ao menos um relatório.");persist("done");alert("Sessão finalizada.");renderSessions()};
$("saveReport").onclick=()=>{collectReport();persist();alert("Dados salvos.");};
$("printReport").onclick=printReport;
$("downloadReport").onclick=()=>{collectReport();persist();printReport();setTimeout(downloadReport,300)};
$("exportBackup").onclick=exportBackup;$("importBackup").onchange=e=>e.target.files[0]&&importBackup(e.target.files[0]);
$("deleteSession").onclick=()=>{if(current&&confirm("Excluir esta sessão?")){db.sessions=db.sessions.filter(x=>x.id!==current.id);saveDB();current=null;show("sessions")}};
document.querySelectorAll("[data-select-report]").forEach(x=>x.onchange=()=>{if(!current)return;readMeta();renderReports()});
window.openSession=openSession;window.addEventListener("online",connection);window.addEventListener("offline",connection);
function boot(){if(!db.sessions.length){};renderDash();connection();show("dashboard")}boot();
