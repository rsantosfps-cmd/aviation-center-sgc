const KEY="acs_sgc_v11";
const ALT_FRICTION=[1000,2000,3000,5000,10000,15000,20000];
const ALT_SCALE=[-1000,0,500,1000,1500,2000,3000,4000,6000,8000,10000,12000,14000,16000,18000,20000];
const FRICTION_TOL=[70,70,70,70,70,80,90];
const SCALE_TOL=[20,20,20,20,25,30,30,35,40,60,80,90,100,110,120,130];
const BARO=[["28,10 / 951,6",-1727],["28,50 / 965,1",-1340],["29,00 / 982,1",-863],["29,50 / 999,00",-392],["29,92 / 1013,25",0],["30,50 / 1032,90",531],["30,90 / 1046,40",893],["30,99 / 1049,50",974]];
const INT_ALT=[-1000,0,1000,2000,4000,6000,8000,10000,12000,14000,16000,18000,20000];
const ENC_NOM=[-950,-50,950,1950,3950,5950,7950,9950,11950,13950,15950,17950,19950];
const AIR_DATA_POINTS=[["31,018","-1.000","20"],["29,921","0","20"],["29,385","500","20"],["28,856","1.000","20"],["28,335","1.500","25"],["27,821","2.000","30"],["26,817","3.000","30"],["25,842","4.000","35"],["23,978","6.000","40"],["22,225","8.000","60"],["20,577","10.000","80"],["19,029","12.000","90"],["17,577","14.000","100"],["16,216","16.000","110"],["14,942","18.000","120"],["13,750","20.000","130"]];

window.ALT_FRICTION=ALT_FRICTION;window.FRICTION_TOL=FRICTION_TOL;window.ALT_SCALE=ALT_SCALE;window.SCALE_TOL=SCALE_TOL;window.AIR_DATA_POINTS=AIR_DATA_POINTS;

let db=loadDB();db.trash=Array.isArray(db.trash)?db.trash.filter(x=>x.type==="session"):[];purgeExpiredTrash();
let currentId=null;
window.ACSGetDB=()=>db;
window.ACSBackendApplyState=(state)=>{if(!state||!Array.isArray(state.sessions))return;db=state;db.trash=Array.isArray(db.trash)?db.trash:[];purgeExpiredTrash();localStorage.setItem(KEY,JSON.stringify(db));updateDashboard();renderSessions();if(currentId&&db.sessions.some(x=>x.id===currentId))fillSession(db.sessions.find(x=>x.id===currentId),true);};
let currentReport="altimetro";
function migrateSession(s){
  s.meta??={};
  const oldLegacy={...s.meta};
  // A ficha geral agora contém somente OS, data, cliente e prefixo.
  s.meta={os:oldLegacy.os||"",data:oldLegacy.data||new Date().toISOString().slice(0,10),cliente:oldLegacy.cliente||"",validade:oldLegacy.validade||"2 anos",prefixo:oldLegacy.prefixo||""};
  s.selectedReports=Array.isArray(s.selectedReports)&&s.selectedReports.length?s.selectedReports:["altimetro","integracao","encoder","transponder","airdata"];
  s.reportMeta??={};
  const oldMeta={...oldLegacy,...(s.legacyMeta||{})};
  ["altimetro","integracao","encoder","transponder","airdata"].forEach(k=>{
    const rm=s.reportMeta[k]||{};
    s.reportMeta[k]={fabricante:rm.fabricante??oldMeta.fabricante??"",pn:rm.pn??oldMeta.pn??"",sn:rm.sn??oldMeta.sn??"",tecnico:rm.tecnico??oldMeta.tecnico??""};
  });
  s.reports??={};
  s.reports.airdata??={rows:AIR_DATA_POINTS.map(()=>({valor:""})),leak:""};
  if(!Array.isArray(s.reports.airdata.rows)||s.reports.airdata.rows.length!==AIR_DATA_POINTS.length)s.reports.airdata.rows=AIR_DATA_POINTS.map((_,i)=>s.reports.airdata.rows?.[i]||({valor:""}));
  if(!s.reports.transponder||!Array.isArray(s.reports.transponder.suppression)||!Array.isArray(s.reports.transponder.sensitivity)||!Array.isArray(s.reports.transponder.reception)){
    const d=blankSession().reports.transponder;const old=s.reports.transponder||{};
    s.reports.transponder={...d,radio:old.radio||d.radio,power:old.power||d.power,other:typeof old.other==="string"?old.other:(Array.isArray(old.other)?old.other.map(r=>Array.isArray(r)?`${r[0]} — ${r[2]||""}`:String(r)).join("\n"):""),modeS:old.modeS||d.modeS};
  }
  return s;
}
db.sessions.forEach(migrateSession);
db.sessions.forEach(s=>{s.status="Salva"});

function uid(){return "S"+Date.now().toString(36)+Math.random().toString(36).slice(2,7).toUpperCase()}
function loadDB(){try{return JSON.parse(localStorage.getItem(KEY))||{sessions:[],trash:[]}}catch(e){return {sessions:[]}}}
function saveDB(){localStorage.setItem(KEY,JSON.stringify(db));updateDashboard();renderSessions();window.ACSBackend?.queuePush?.(db)}
function blankSession(){return {id:uid(),status:"Nova",createdAt:new Date().toISOString(),selectedReports:["altimetro","integracao","encoder","transponder","airdata"],meta:{os:"",data:new Date().toISOString().slice(0,10),cliente:"",validade:"2 anos",prefixo:""},reportMeta:{altimetro:{fabricante:"",pn:"",sn:"",tecnico:""},integracao:{fabricante:"",pn:"",sn:"",tecnico:""},encoder:{fabricante:"",pn:"",sn:"",tecnico:""},transponder:{fabricante:"",pn:"",sn:"",tecnico:""},airdata:{fabricante:"",pn:"",sn:"",tecnico:""}},reports:{altimetro:{friction:ALT_FRICTION.map(()=>({sem:"",com:""})),scale:ALT_SCALE.map(()=>({lido:""})),leak:{pressao:"14,942",lido:""},baro:BARO.map(x=>({valor:x[0],diferenca:x[1],lido:""})),hyst:[{lidoDec:"",lidoCresc:"",dif:"",altitude:10000},{lidoDec:"",lidoCresc:"",dif:"",altitude:8000}]},integracao:INT_ALT.map((a,i)=>({teste:i+1,altitude:a,altimetro:"",transponder:""})),encoder:ENC_NOM.map((n,i)=>({teste:i+1,altitude:INT_ALT[i],nominal:n,atual:""})),transponder:{radio:[
["Frequência de Transmissão ATCRBS","1093 ≥ Frequência ≥ 1087",""],["Frequência de Transmissão MODE S CLASSES 1B, 2B e 3B","1093 ≥ Frequência ≥ 1087",""],["Frequência de Transmissão MODE S CLASSES 1B, 2B e 3B — frequência opcional de resposta 1090 MHz ± 1 MHz","1091 ≥ Frequência ≥ 1089",""],["Frequência de Transmissão MODE S CLASSES 1A, 2A, 3A e 4","1091 ≥ Frequência ≥ 1089",""]],
suppression:[
["ATCRBS CLASSE 1A ou 2A","1.000 ≥ razão ≥ 230 — resposta ≤ 1% (P1=P2)",""],["ATCRBS CLASSE 1A ou 2A","Razão 235 ± 5 — resposta ≥ 90% (P2 < 9 dB < P1)",""],["ATCRBS CLASSE 1B ou 2B","1.000 ≥ razão ≥ 230 — resposta ≤ 1% (P1=P2)",""],["ATCRBS CLASSE 1B ou 2B","Razão 235 ± 5 — resposta ≥ 90% (P2 < 9 dB < P1)",""],["MODE S CLASSE 1B, 2B e 3B","1.000 ≥ razão ≥ 230 — resposta ≤ 1% (P1=P2)",""],["MODE S CLASSE 1B, 2B e 3B","Razão 235 ± 5 — resposta ≥ 90% (P2 < 9 dB < P1)",""],["MODE S 1A, 2A e 3A","1.000 ≥ razão ≥ 230 — resposta ≤ 1% (P1=P2)",""],["MODE S 1A, 2A e 3A","Razão 235 ± 5 — resposta ≥ 90% (P2 < 9 dB < P1)",""]],
sensitivity:[["ATCRBS — Sensibilidade","77 dBm ≥ Sensibilidade ≥ 69 dBm",""],["MODE S (Tipo P6) — Sensibilidade","76 dBm ≥ Sensibilidade ≥ 70 dBm",""],["ATCRBS e MODE S — Diferença de Sensibilidade (Modo 3/A & C)","Diferença da Sensibilidade ≤ 1 dB",""]],
power:[["ATCRBS CLASSE 1A e 2A","Potência ≥ 125 W",""],["ATCRBS CLASSES 1B e 2B","Potência ≥ 70 W",""],["MODE S CLASSES 1A, 2A, 3A e 4","Potência ≥ 125 W",""],["MODE S CLASSES 1B, 2B e 3B","Potência ≥ 70 W",""],["ATCRBS e MODE S TODAS AS CLASSES","Potência ≤ 500 W",""]],other:"",reception:[
["Frequência de recepção","1030 MHz","1030 MHz",""],["Largura de pulso F1","0,45 µs ± 0,1 µs","",""],["Largura de pulso F2","0,45 µs ± 0,1 µs","",""],["Espaçamento entre F1 e F2","20,30 µs ± 0,1 µs","",""]],modeS:[
["Isolamento dos canais","Potência da antena selecionada ≥ 20 dB",""],["Endereço do Mode S","Interrogar com 1 endereço correto e pelo menos dois errados na razão de 50 interrogações — deve responder ao endereço correto.",""],["Formatos Mode S","Interrogar com os formatos UF para os quais o transponder está equipado e verificar formatos.",""],["Interrogação Mode S All Call","Interrogar com Mode S All Call, somente UF=11 e ATCRBS Mode S com formato All Call. Verificar resposta DF=11.",""],["Interrogação ATCRBS All Call","Interrogar com ATCRBS All Call, verificar que nenhuma resposta é gerada.",""],["Squitter","Verificar se Squitter é gerado na razão de 1 por segundo.",""]]}}
,airdata:{rows:AIR_DATA_POINTS.map(p=>({valor:""})),leak:""}}}

function getCurrent(){return db.sessions.find(s=>s.id===currentId)}
function setReportEditorVisible(show){const p=document.getElementById("reportEditorPanel");if(p)p.classList.toggle("hidden",!show)}
function clearRegistrationFields(){
  ["os","cliente","prefixo"].forEach(id=>{const el=document.getElementById(id);if(el){el.value="";el.setAttribute("autocomplete","off");}});
  const data=document.getElementById("data");if(data){data.value=new Date().toISOString().slice(0,10);data.setAttribute("autocomplete","off");}
  const obs=document.getElementById("observacoesAjustes");if(obs)obs.value="";
}
function newSession(){
  currentId=null;
  const s=blankSession();
  // A nova calibração nunca reaproveita os valores visuais da anterior.
  clearRegistrationFields();
  fillSession(s,false);
  clearRegistrationFields();
  setReportEditorVisible(false);
  document.querySelector(".registration-panel")?.classList.remove("hidden");
  document.getElementById("reportTabs")?.replaceChildren();
  document.querySelectorAll("[data-select-report]").forEach(x=>x.checked=s.selectedReports.includes(x.dataset.selectReport));
  const title=document.getElementById("sessionTitle");if(title)title.textContent="Nova calibração";
  const status=document.getElementById("sessionStatus");if(status){status.textContent="Nova";status.className="pill";}
  showView("session");
  const main=document.querySelector(".main");
  if(main)main.scrollTo({top:0,behavior:"auto"});
  setTimeout(()=>clearRegistrationFields(),0);
}
function fillSession(s,openReports=true){
  currentId=s.id;
  set("os",s.meta.os);set("data",s.meta.data);set("cliente",s.meta.cliente);set("prefixo",s.meta.prefixo);set("observacoesAjustes",s.observacoesAjustes||"");
  document.querySelectorAll("[data-select-report]").forEach(x=>x.checked=s.selectedReports.includes(x.dataset.selectReport));
  document.getElementById("sessionTitle").textContent=s.meta.os?`Calibração OS ${s.meta.os}`:"Nova calibração";
  document.getElementById("sessionStatus").textContent=s.id && db.sessions.some(x=>x.id===s.id)?"Salva":"Nova";
  if(openReports){setReportEditorVisible(true);document.querySelector(".registration-panel")?.classList.remove("hidden");renderReportTabs(s);renderAllTables(s);}
}
function collectMeta(s){["os","data","cliente","prefixo"].forEach(k=>{const el=document.getElementById(k);if(el)s.meta[k]=el.value.trim()});s.meta.validade="2 anos";s.selectedReports=[...document.querySelectorAll("[data-select-report]:checked")].map(x=>x.dataset.selectReport)}
function collectReportMeta(s){
  s.reportMeta??={};
  const keys=["altimetro","integracao","encoder","transponder","airdata"];
  keys.forEach(key=>{
    s.reportMeta[key]??={fabricante:"",pn:"",sn:"",tecnico:""};
    document.querySelectorAll(`[data-rmeta="${key}"]`).forEach(el=>{s.reportMeta[key][el.dataset.k]=el.value.trim()});
  });
}
function collectObservation(s){const el=document.getElementById("observacoesAjustes");if(el)s.observacoesAjustes=el.value||""}
function resetNewCalibrationForm(){newSession()}
function saveCalibrationRegistration(){
  let s=getCurrent();
  // Uma ficha nova só entra no banco quando o cadastro é realmente salvo.
  if(!s || db.sessions.some(x=>x.id===s.id)===false){
    if(!s)s=blankSession();
    currentId=s.id;
    if(!db.sessions.some(x=>x.id===s.id))db.sessions.push(s);
  }
  collectMeta(s);
  if(!s.meta.data){alert("Informe a data da calibração.");return}
  if(!s.selectedReports.length){alert("Selecione pelo menos um laudo.");return}
  s.status="Salva";
  s.updatedAt=new Date().toISOString();
  collectObservation(s);
  saveDB();

  // Ao salvar o cadastro, a tela muda imediatamente para o preenchimento dos laudos.
  showView("session");
  document.querySelector(".registration-panel")?.classList.add("hidden");
  setReportEditorVisible(true);
  currentReport=s.selectedReports[0]||"altimetro";
  renderAllTables(s);
  renderReportTabs(s);

  const panel=document.getElementById("reportEditorPanel");
  const main=document.querySelector(".main");
  if(panel){
    panel.classList.remove("hidden");
    requestAnimationFrame(()=>{
      if(main)main.scrollTo({top:Math.max(0,panel.offsetTop-12),behavior:"auto"});
      else panel.scrollIntoView({behavior:"auto",block:"start"});
      requestAnimationFrame(()=>{
        const first=panel.querySelector(`#report-${currentReport} input:not([readonly]), #report-${currentReport} textarea`);
        if(first)first.focus({preventScroll:true});
      });
    });
  }
}
function saveCurrent(){let s=getCurrent();if(!s){alert("Abra uma calibração antes de salvar os laudos.");return}collectMeta(s);collectTables(s);collectObservation(s);s.status="Salva";s.updatedAt=new Date().toISOString();saveDB();alert("Calibração salva com sucesso.")}
function buildScaleMap(s){const byAltitude={};ALT_SCALE.forEach((alt,i)=>{byAltitude[alt]=s.reports.altimetro.scale[i].lido||""});return byAltitude}
function syncScaleFromFriction(s){const byAltitude={};ALT_FRICTION.forEach((alt,i)=>{byAltitude[alt]=s.reports.altimetro.friction[i].com||""});s.reports.altimetro.scale.forEach((r,i)=>{if(Object.prototype.hasOwnProperty.call(byAltitude,ALT_SCALE[i]))r.lido=byAltitude[ALT_SCALE[i]]})}
function syncIntegrationFromAltimeter(s){const byAltitude=buildScaleMap(s);s.reports.integracao.forEach(r=>{r.altimetro=byAltitude[r.altitude]||""})}
function syncHysteresisFromScale(s){const byAltitude=buildScaleMap(s);s.reports.altimetro.hyst.forEach(r=>{const v=byAltitude[r.altitude];r.lidoDec=v||"";const a=toNumber(r.lidoDec),b=toNumber(r.lidoCresc);r.dif=Number.isFinite(a)&&Number.isFinite(b)?formatNumber(b-a):""})}

function toNumber(v){
  if(v===null || v===undefined || String(v).trim()==="") return NaN;
  const n=Number(String(v).trim().replace(/\./g,"").replace(",","."));
  return Number.isFinite(n)?n:NaN;
}
function formatNumber(n){return Number.isInteger(n)?String(n):String(Number(n.toFixed(2))).replace(".",",");}

function collectTables(s){
  collectReportMeta(s);
  document.querySelectorAll("[data-r='friction']").forEach(el=>s.reports.altimetro.friction[+el.dataset.i][el.dataset.k]=el.value);
  document.querySelectorAll("[data-r='scale']").forEach(el=>s.reports.altimetro.scale[+el.dataset.i].lido=el.value);
  syncScaleFromFriction(s);
  syncIntegrationFromAltimeter(s);
  document.querySelectorAll("[data-r='leak']").forEach(el=>s.reports.altimetro.leak.lido=el.value);
  document.querySelectorAll("[data-r='baro']").forEach(el=>s.reports.altimetro.baro[+el.dataset.i].lido=el.value);
  document.querySelectorAll("[data-r='hyst']").forEach(el=>{
    const r=s.reports.altimetro.hyst[+el.dataset.i];
    if(el.dataset.k!=="lidoDec" && el.dataset.k!=="dif") r[el.dataset.k]=el.value;
  });
  syncHysteresisFromScale(s);
  document.querySelectorAll("[data-r='int']").forEach(el=>s.reports.integracao[+el.dataset.i][el.dataset.k]=el.value);
  document.querySelectorAll("[data-r='enc']").forEach(el=>s.reports.encoder[+el.dataset.i].atual=el.value);
  document.querySelectorAll("[data-r='tp']").forEach(el=>setNested(s.reports.transponder,el.dataset.path,el.value));
  s.reports.airdata??={rows:AIR_DATA_POINTS.map(()=>({valor:""})),leak:""};
  document.querySelectorAll("[data-r='airdata']").forEach(el=>s.reports.airdata.rows[+el.dataset.i].valor=el.value);
  const airLeak=document.querySelector("[data-r='airleak']"); if(airLeak)s.reports.airdata.leak=airLeak.value;
}
function setNested(o,path,v){let a=path.split(".");let x=o;for(let i=0;i<a.length-1;i++)x=x[a[i]];x[a[a.length-1]]=v}
function set(id,v){document.getElementById(id).value=v||""}

function renderReportMeta(s){
  const names={altimetro:"Altímetro",integracao:"Integração do Transponder e Altitude Encoder",encoder:"Encoder",transponder:"Transponder",airdata:"Air Data"};
  const keys=Object.keys(names);
  s.reportMeta??={};
  keys.forEach(key=>{
    s.reportMeta[key]??={fabricante:"",pn:"",sn:"",tecnico:""};
    const el=document.getElementById("meta-"+key);if(!el)return;
    const m=s.reportMeta[key];
    el.innerHTML=`<div class="report-meta-title">DADOS DO INSTRUMENTO — ${names[key].toUpperCase()}</div><div class="report-meta-grid"><label>Fabricante<input inputmode="text" autocomplete="off" data-rmeta="${key}" data-k="fabricante" value="${esc(m.fabricante)}"></label><label>P/N<input inputmode="text" autocomplete="off" data-rmeta="${key}" data-k="pn" value="${esc(m.pn)}"></label><label>S/N<input inputmode="text" autocomplete="off" data-rmeta="${key}" data-k="sn" value="${esc(m.sn)}"></label><label>Técnico responsável<input inputmode="text" autocomplete="off" data-rmeta="${key}" data-k="tecnico" value="${esc(m.tecnico)}"></label></div>`;
  });
}
function renderAllTables(s){renderReportMeta(s);renderFriction(s);syncScaleFromFriction(s);renderScale(s);renderLeak(s);renderBaro(s);renderHyst(s);renderIntegration(s);renderEncoder(s);renderTransponder(s);renderAirData(s);renderReportTabs(s)}
function inp(v,attrs=""){return `<input class="cell" inputmode="decimal" value="${esc(v)}" ${attrs}>`}
function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function wrap(h){return `<div class="table-wrap">${h}</div>`}
function toleranceClass(value,expected,tol){const v=toNumber(value),e=toNumber(expected),t=toNumber(tol);if(!Number.isFinite(v)||!Number.isFinite(e)||!Number.isFinite(t)||t<=0)return "";const diff=Math.abs(v-e);if(diff>t)return "cell-red";if(diff>=t-2)return "cell-yellow";return "cell-green"}
function hystClass(value,tol){const v=Math.abs(toNumber(value)),t=toNumber(tol);if(!Number.isFinite(v)||!Number.isFinite(t))return "";if(v>t)return "cell-red";if(v>=t-2)return "cell-yellow";return "cell-green"}
function inpClass(v,attrs,cls=""){return `<input class="cell ${cls}" inputmode="decimal" value="${esc(v)}" ${attrs}>`}
function renderFriction(s){let h="<table class='data-table'><thead><tr><th>Altitude (pés)</th><th>Valor sem vibração</th><th>Valor com vibração</th><th>Tolerância</th></tr></thead><tbody>";ALT_FRICTION.forEach((a,i)=>h+=`<tr><td>${a}</td><td>${inp(s.reports.altimetro.friction[i].sem,`data-r="friction" data-i="${i}" data-k="sem"`)}</td><td>${inp(s.reports.altimetro.friction[i].com,`data-r="friction" data-i="${i}" data-k="com"`)}</td><td>${FRICTION_TOL[i]}</td></tr>`);document.getElementById("frictionTable").innerHTML=wrap(h+"</tbody></table>")}
function renderScale(s){syncScaleFromFriction(s);let h="<table class='data-table'><thead><tr><th>Altitude (pés)</th><th>Pressão equivalente (pol Hg)</th><th>Valor lido</th><th>Tolerância ± pés</th></tr></thead><tbody>";const p=["31,018","29,921","29,385","28,856","28,335","27,821","26,817","25,842","23,978","22,225","20,577","19,029","17,577","16,216","14,942","13,75"];ALT_SCALE.forEach((a,i)=>{const fi=ALT_FRICTION.indexOf(a);const ro=fi>=0?`readonly title="Copiado automaticamente do Valor com vibração do Teste de Atrito (${a} pés)"`:``;h+=`<tr><td>${a}</td><td>${p[i]}</td><td>${inpClass(s.reports.altimetro.scale[i].lido,`data-r="scale" data-i="${i}" data-expected="${a}" data-tol="${SCALE_TOL[i]}" ${ro}`,toleranceClass(s.reports.altimetro.scale[i].lido,a,SCALE_TOL[i]))}</td><td>${SCALE_TOL[i]}</td></tr>`});document.getElementById("scaleTable").innerHTML=wrap(h+"</tbody></table>")}
function renderLeak(s){document.getElementById("leakTable").innerHTML=wrap(`<table class='data-table'><thead><tr><th>Pressão (In HG)</th><th>Altitude</th><th>Valor lido</th><th>Tol. ± pés</th></tr></thead><tbody><tr><td>${s.reports.altimetro.leak.pressao}</td><td>18000</td><td>${inp(s.reports.altimetro.leak.lido,`data-r="leak"`)}</td><td>100</td></tr></tbody></table>`)}
function renderBaro(s){let h="<table class='data-table'><thead><tr><th>Pressão</th><th>Diferença de altitude</th><th>Valor lido</th></tr></thead><tbody>";s.reports.altimetro.baro.forEach((r,i)=>h+=`<tr><td>${r.valor}</td><td>${r.diferenca}</td><td>${inp(r.lido,`data-r="baro" data-i="${i}"`)}</td></tr>`);document.getElementById("baroTable").innerHTML=wrap(h+"</tbody></table>")}
function renderHyst(s){
  syncHysteresisFromScale(s);
  let h="<table class='data-table'><thead><tr><th>Ponto de teste</th><th>Valor lido durante o teste de erro de escala (pressão decrescente)</th><th>Valor lido (pressão crescente)</th><th>Diferença encontrada (pés)</th><th>Tolerância especificada (pés)</th></tr></thead><tbody>";
  [["1º ponto de teste — 50% altitude máxima (10000 pés)",10000,75],["2º ponto de teste — 40% altitude máxima (8000 pés)",8000,75]].forEach((r,i)=>h+=`<tr><td>${r[0]}</td><td>${inp(s.reports.altimetro.hyst[i].lidoDec,`data-r="hyst" data-i="${i}" data-k="lidoDec" readonly title="Copiado automaticamente do Erro de Escala na mesma altitude (${r[1]} pés)"`)}</td><td>${inp(s.reports.altimetro.hyst[i].lidoCresc,`data-r="hyst" data-i="${i}" data-k="lidoCresc"`)}</td><td>${inpClass(s.reports.altimetro.hyst[i].dif,`data-r="hyst" data-i="${i}" data-k="dif" data-tol="${r[2]}" readonly title="Calculado: valor lido (pressão crescente) - valor lido durante o teste de erro de escala (pressão decrescente)"`,hystClass(s.reports.altimetro.hyst[i].dif,r[2]))}</td><td>${r[2]}</td></tr>`);
  document.getElementById("hystTable").innerHTML=wrap(h+"</tbody></table>");
}
function renderIntegration(s){syncIntegrationFromAltimeter(s);let h="<table class='data-table'><thead><tr><th>Teste</th><th>Altitude (pés)</th><th>Leitura do altímetro</th><th>Leitura do transponder</th></tr></thead><tbody>";s.reports.integracao.forEach((r,i)=>h+=`<tr><td>${r.teste}</td><td>${r.altitude}</td><td>${inp(r.altimetro,`data-r="int" data-i="${i}" data-k="altimetro" readonly title="Copiado automaticamente do teste de escala do altímetro"`)}</td><td>${inp(r.transponder,`data-r="int" data-i="${i}" data-k="transponder"`)}</td></tr>`);document.getElementById("integrationTable").innerHTML=wrap(h+"</tbody></table>")}
function renderEncoder(s){let h="<table class='data-table'><thead><tr><th>Teste</th><th>Altitude (pés)</th><th>Ponto de transição nominal</th><th>Ponto de transição atual</th></tr></thead><tbody>";s.reports.encoder.forEach((r,i)=>h+=`<tr><td>${r.teste}</td><td>${r.altitude}</td><td>${r.nominal}</td><td>${inp(r.atual,`data-r="enc" data-i="${i}"`)}</td></tr>`);document.getElementById("encoderTable").innerHTML=wrap(h+"</tbody></table>")}
function renderTransponder(s){let t=s.reports.transponder;let h=`<div class="field-grid"><div class="field full"><b>RÁDIO FREQUÊNCIA DE RESPOSTA</b></div>`;t.radio.forEach((r,i)=>h+=`<div class="field full"><label>${r[0]}<small>Valor requerido: ${r[1]}</small><input data-r="tp" data-path="radio.${i}.2" value="${esc(r[2])}" placeholder="Valor encontrado (MHz)"></label></div>`);h+=`<div class="field full"><b>SUPRESSÃO — MODO 3/A</b></div>`;t.suppression.forEach((r,i)=>h+=`<div class="field full"><label>${r[0]}<small>${r[1]}</small><input data-r="tp" data-path="suppression.${i}.2" value="${esc(r[2])}" placeholder="Resultado"></label></div>`);h+=`<div class="field full"><b>SENSIBILIDADE DO RECEPTOR</b><small>Equipamento de teste conectado ao terminal de antena do transponder com correção para perdas de linha de transmissão.</small></div>`;t.sensitivity.forEach((r,i)=>h+=`<div class="field full"><label>${r[0]}<small>${r[1]}</small><input data-r="tp" data-path="sensitivity.${i}.2" value="${esc(r[2])}" placeholder="Valor encontrado"></label></div>`);h+=`<div class="field full"><b>POTÊNCIA DE PICO DE SAÍDA DE RÁDIO FREQUÊNCIA</b></div>`;t.power.forEach((r,i)=>h+=`<div class="field full"><label>${r[0]}<small>${r[1]}</small><input data-r="tp" data-path="power.${i}.2" value="${esc(r[2])}" placeholder="Valor encontrado (W)"></label></div>`);h+=`<div class="field full"><b>OUTRAS MEDIÇÕES</b><textarea data-r="tp" data-path="other">${esc(t.other||"")}</textarea></div><div class="field full"><b>PARÂMETROS — MODE A / MODE C</b></div>`;t.reception.forEach((r,i)=>h+=`<div class="field full"><label>${r[0]}<small>Valor requerido: ${r[1]}</small><div class="two-inputs"><input data-r="tp" data-path="reception.${i}.2" value="${esc(r[2])}" placeholder="Mode A"><input data-r="tp" data-path="reception.${i}.3" value="${esc(r[3])}" placeholder="Mode C"></div></label></div>`);h+=`<div class="field full"><b>SOMENTE PARA TRANSPONDER MODE S</b></div>`;t.modeS.forEach((r,i)=>h+=`<div class="field full"><label>${r[0]}<small>${r[1]}</small><input data-r="tp" data-path="modeS.${i}.2" value="${esc(r[2])}" placeholder="Valor encontrado"></label></div>`);document.getElementById("transponderForm").innerHTML=h+`<p class="hint">Obs.: Inspeção e teste conforme RBAC 43 Apêndice “F”.</p></div>`}
function renderAirData(s){s.reports.airdata??={rows:AIR_DATA_POINTS.map(()=>({valor:""})),leak:""};let h=`<h3>Teste #1 — Erro de Escala (pressão decrescente)</h3><table class="data-table"><thead><tr><th>Pressão equiv. (pol Hg)</th><th>Altitude (pés)</th><th>Valor lido (pés)</th><th>Tolerância especif. (± pés)</th></tr></thead><tbody>`;AIR_DATA_POINTS.forEach((p,i)=>h+=`<tr><td>${p[0]}</td><td>${p[1]}</td><td>${inp(s.reports.airdata.rows[i]?.valor||"",`data-r="airdata" data-i="${i}"`)}</td><td>${p[2]}</td></tr>`);h+=`</tbody></table><h3>Teste #4 — Vazamento da Linha</h3>${wrap(`<table class="data-table"><thead><tr><th>Pressão (in Hg)</th><th>Altitude (pés)</th><th>Valor lido (pés)</th><th>Tolerância</th></tr></thead><tbody><tr><td>13.750</td><td>20.000</td><td>${inp(s.reports.airdata.leak||"",`data-r="airleak"`)}</td><td>± 100</td></tr></tbody></table>`)}<p class="hint">Calibração realizada na aeronave conforme RBAC 43 apêndice “E”.</p>`;document.getElementById("airdataForm").innerHTML=wrap(h)}

function renderReportTabs(s){
 const tabs=document.getElementById("reportTabs");
 if(!tabs)return;
 const names={altimetro:"Altímetro",integracao:"Integração",encoder:"Encoder",transponder:"Transponder",airdata:"Air Data"};
 if(!s.selectedReports.includes(currentReport))currentReport=s.selectedReports[0]||"altimetro";
 tabs.innerHTML=s.selectedReports.map(r=>`<button class="tab ${r===currentReport?"active":""}" data-report="${r}">${names[r]}</button>`).join("");
 document.querySelectorAll("#reportTabs .tab").forEach(b=>b.addEventListener("click",()=>{
   currentReport=b.dataset.report;
   document.querySelectorAll("#reportTabs .tab").forEach(x=>x.classList.toggle("active",x===b));
   document.querySelectorAll(".report").forEach(x=>x.classList.add("hidden"));
   document.getElementById("report-"+currentReport)?.classList.remove("hidden");
 }));
 document.querySelectorAll(".report").forEach(x=>x.classList.toggle("hidden",x.id!=="report-"+currentReport));
}

function deleteSessionToTrash(id){
 const s=db.sessions.find(x=>x.id===id);
 if(!s)return;
 if(!confirm(`Excluir a calibração OS ${s.meta?.os||"sem OS"}?\n\nTodos os relatórios desta calibração serão movidos juntos para a Lixeira por 7 dias.`))return;
 db.trash.push({
   id:uid(),
   type:"session",
   sessionId:s.id,
   label:`Calibração OS ${s.meta?.os||"sem OS"}`,
   deletedAt:new Date().toISOString(),
   expiresAt:new Date(Date.now()+7*86400000).toISOString(),
   data:JSON.parse(JSON.stringify(s))
 });
 db.sessions=db.sessions.filter(x=>x.id!==id);
 if(currentId===id){currentId=null;newSession();}
 saveDB();
 renderSessions();
 renderTrash();
 alert("Calibração movida para a Lixeira. Você terá 7 dias para restaurá-la.");
}

function restoreSession(id){
 purgeExpiredTrash();
 const item=db.trash.find(x=>x.id===id);
 if(!item || item.type!=="session")return;
 const restored=JSON.parse(JSON.stringify(item.data));
 if(db.sessions.some(x=>x.id===restored.id)){restored.id=uid();}
 restored.status="Salva";
 db.sessions.push(restored);
 db.trash=db.trash.filter(x=>x.id!==id);
 saveDB();
 renderTrash();
 alert("Calibração restaurada com sucesso.");
}

function deleteSessionForever(id){
 const item=db.trash.find(x=>x.id===id);
 if(!item || item.type!=="session")return;
 if(!confirm("Excluir esta calibração definitivamente? Todos os relatórios dela serão apagados. Esta ação não poderá ser desfeita."))return;
 db.trash=db.trash.filter(x=>x.id!==id);
 saveDB();
 renderTrash();
}


function purgeExpiredTrash(){
 const now=Date.now();
 const before=db.trash.length;
 db.trash=db.trash.filter(x=>new Date(x.expiresAt).getTime()>now);
 if(before!==db.trash.length)localStorage.setItem(KEY,JSON.stringify(db));
}
function reportName(r){return {altimetro:"Altímetro",integracao:"Integração do Transponder e Altitude Encoder",encoder:"Encoder",transponder:"Transponder",airdata:"Air Data"}[r]||r}
function deleteReportToTrash(reportKey){
 let s=getCurrent(); if(!s||!s.selectedReports.includes(reportKey))return;
 collectMeta(s);collectTables(s);
 db.trash.push({id:uid(),sessionId:s.id,reportKey,label:reportName(reportKey),
   deletedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+7*86400000).toISOString(),
   data:JSON.parse(JSON.stringify(s.reports[reportKey]||{}))});
 s.selectedReports=s.selectedReports.filter(x=>x!==reportKey);
 delete s.reports[reportKey];
 saveDB();renderAllTables(s);
 if(s.selectedReports.length)currentReport=s.selectedReports[0];else currentReport="";
 renderReportTabs(s);
 renderTrash();
 alert(reportName(reportKey)+" foi movido para a Lixeira. Você terá 7 dias para restaurá-lo.");
}
function restoreReport(id){
 purgeExpiredTrash();
 const item=db.trash.find(x=>x.id===id);if(!item)return;
 const s=db.sessions.find(x=>x.id===item.sessionId);
 if(!s){alert("A sessão original não foi encontrada.");return;}
 s.selectedReports ||= [];
 if(!s.selectedReports.includes(item.reportKey))s.selectedReports.push(item.reportKey);
 s.reports ||= {};s.reports[item.reportKey]=item.data||{};
 db.trash=db.trash.filter(x=>x.id!==id);saveDB();
 if(currentId===s.id){renderAllTables(s);currentReport=item.reportKey;renderReportTabs(s);}
 renderTrash();alert(item.label+" restaurado com sucesso.");
}
function deleteReportForever(id){
 const item=db.trash.find(x=>x.id===id);if(!item)return;
 if(!confirm("Excluir este relatório definitivamente? Esta ação não poderá ser desfeita."))return;
 db.trash=db.trash.filter(x=>x.id!==id);saveDB();renderTrash();
}
function renderTrash(){
 purgeExpiredTrash();
 const now=Date.now();
 const el=document.getElementById("trashList");if(!el)return;
 el.innerHTML=db.trash.slice().reverse().map(x=>{
   const s=x.type==="session"?x.data:db.sessions.find(y=>y.id===x.sessionId);
   const days=Math.max(1,Math.ceil((new Date(x.expiresAt).getTime()-now)/86400000));
   const label=x.type==="session"?`Calibração OS ${esc(s?.meta?.os||"sem OS")}`:esc(x.label);
   return `<div class="session-row"><div><b>${label}</b><small>Cliente: ${esc(s?.meta?.cliente||"—")} · Prefixo: ${esc(s?.meta?.prefixo||"—")} · Data: ${fmtDate(s?.meta?.data)}</small><div class="trash-meta">Exclusão definitiva em ${days} dia(s).</div></div><div class="actions"><button class="secondary" onclick="restoreSession('${x.id}')">Restaurar calibração</button><button class="ghost danger" onclick="deleteSessionForever('${x.id}')">Excluir definitivamente</button></div></div>`;
 }).join("")||`<div class="empty">A lixeira está vazia.</div>`;
}

async function updateNetworkStatus(){
 const el=document.getElementById("networkStatus");
 if(!el)return;
 let online=navigator.onLine;
 if(online && location.protocol.startsWith("http")){
   try{
     const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3500);
     const r=await fetch("./?network_check="+Date.now(),{method:"HEAD",cache:"no-store",signal:controller.signal});
     clearTimeout(timer);online=r.ok;
   }catch(e){}
 }
 el.classList.remove("online","offline");
 el.classList.add(online?"online":"offline");
 el.innerHTML=`<span></span> ${online?"Online • conectado à internet":"Offline • modo local"}`;
}
function showView(v){
 document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));
 const target=document.getElementById("view-"+v);if(target)target.classList.remove("hidden");
 document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===v));
 const titles={dashboard:["Dashboard","Gerenciamento de calibração"],session:["Nova calibração","Preenchimento dos laudos"],sessions:["Calibrações","Calibrações salvas"],clients:["Clientes","Clientes e histórico das aeronaves"],aircraft:["Aeronaves","Histórico de serviços por prefixo"],history:["Histórico","Histórico completo de serviços"],trash:["Lixeira","Calibrações apagadas nos últimos 7 dias"],backup:["Backup","Dados locais do Aviation Center Calibrações"],settings:["Configurações","Configurações do sistema"]};
 const t=titles[v]||titles.dashboard;document.getElementById("pageTitle").textContent=t[0];document.getElementById("pageSub").textContent=t[1];
 if(v==="sessions"||v==="history")renderSessions();
 if(v==="clients")renderClients();
 if(v==="aircraft")renderAircraft();
 if(v==="trash")renderTrash();
}
function fmtDate(d){if(!d)return "—";const p=String(d).split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d}
function parseLocalDate(value){const p=String(value||"").split("-").map(Number);return p.length===3&&p.every(Number.isFinite)?new Date(p[0],p[1]-1,p[2]):new Date("")}
function validityStatus(s){const d=parseLocalDate(s?.meta?.data);if(!Number.isFinite(d.getTime()))return {label:"Sem data",cls:""};d.setFullYear(d.getFullYear()+2);const now=new Date();now.setHours(0,0,0,0);const diff=Math.ceil((d-now)/86400000);const due=fmtDate(d.toISOString().slice(0,10));if(diff<0)return {label:`Vencida em ${due}`,cls:"status-expired",due:d};if(diff<=30)return {label:`Vence em ${diff} dia(s)`,cls:"status-warning status-30",due:d};if(diff<=90)return {label:`Vence em ${diff} dia(s)`,cls:"status-warning status-90",due:d};return {label:`Válida até ${due}`,cls:"status-done",due:d}}
function renderClients(){const el=document.getElementById("clientsList");if(!el)return;const map={};db.sessions.forEach(s=>{const c=(s.meta?.cliente||"").trim()||"Sem cliente";(map[c]??=[]).push(s)});const arr=Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));el.innerHTML=arr.length?arr.map(([name,ss])=>{const aircraft=[...new Set(ss.map(s=>s.meta?.prefixo).filter(Boolean))];const latest=ss.slice().sort((a,b)=>String(b.meta?.data||"").localeCompare(String(a.meta?.data||"")))[0];const st=validityStatus(latest);return `<div class="session-row"><div><b>${esc(name)}</b><small>${aircraft.length?`Aeronaves: ${aircraft.map(esc).join(", ")}`:"Nenhuma aeronave informada"} · Último serviço: ${fmtDate(latest.meta?.data)}</small><div class="trash-meta ${st.cls}">${st.label} · ${ss.length} registro(s)</div></div><button class="secondary" onclick="openSession('${latest.id}')">Abrir último</button></div>`}).join(""):`<div class="empty">Nenhum cliente registrado ainda.</div>`}
function renderAircraft(){
 const el=document.getElementById("aircraftList");if(!el)return;
 const map={};db.sessions.forEach(s=>{const p=(s.meta?.prefixo||"").trim()||"Sem prefixo";(map[p]??=[]).push(s)});
 const arr=Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
 if(!arr.length){el.innerHTML=`<div class="empty">Nenhuma aeronave registrada ainda.</div>`;return;}
 el.innerHTML=arr.map(([prefix,ss])=>{
   const ordered=ss.slice().sort((a,b)=>String(b.meta?.data||"").localeCompare(String(a.meta?.data||"")));
   const latest=ordered[0]; const st=validityStatus(latest);
   return `<div class="aircraft-card"><div class="aircraft-head"><div><b>${esc(prefix)}</b><small>Cliente: ${esc(latest.meta?.cliente||"Sem cliente")} · ${ss.length} calibração(ões)</small></div><div class="trash-meta ${st.cls}">${st.label}</div></div><div class="aircraft-history">${ordered.map(s=>`<div class="aircraft-history-row"><div><b>OS ${esc(s.meta?.os||"—")}</b><small>${fmtDate(s.meta?.data)} · ${esc(s.meta?.cliente||"Sem cliente")} · validade 2 anos</small></div><div class="actions-inline"><button class="secondary" onclick="openSession('${s.id}')">Abrir / editar</button><button class="print-small" onclick="printSessionById('${s.id}')">Imprimir relatório</button></div></div>`).join("")}</div></div>`;
 }).join("");
}

function updateDashboard(){let a=db.sessions;dashTotal.textContent=a.length;dashOpen.textContent=0;dashDone.textContent=a.length;dashLast.textContent=a.length?(a[a.length-1].meta.os||"Sem OS"):"—";let recent=a.slice(-5).reverse();recentSessions.innerHTML=recent.length?recent.map(rowHtml).join(""):`<div class="empty">Nenhuma sessão cadastrada.</div>`}
function rowHtml(s){return `<div class="session-row"><div><b>OS ${esc(s.meta.os||"—")} — ${esc(s.meta.cliente||"Sem cliente")}</b><small>${esc(s.meta.prefixo||"Sem prefixo")} · Salva · ${fmtDate(s.meta.data)}</small></div><div class="actions"><button class="secondary" onclick="openSession('${s.id}')">Abrir / editar</button><button class="ghost danger" onclick="deleteSessionToTrash('${s.id}')">Apagar</button></div></div>`}

function renderSessions(){
 const html=db.sessions.length?db.sessions.slice().reverse().map(rowHtml).join(""):`<div class="empty">Nenhuma calibração cadastrada.</div>`;
 if(document.getElementById("sessionsList"))sessionsList.innerHTML=html;
 const hl=document.getElementById("historyList");
 if(hl)hl.innerHTML=html;
}
function openSession(id){let s=db.sessions.find(x=>x.id===id);if(!s)return;fillSession(s,true);showView("session")}
window.openSession=openSession;window.showView=showView;window.deleteSessionToTrash=deleteSessionToTrash;window.restoreSession=restoreSession;window.deleteSessionForever=deleteSessionForever;

function makeCurrentPDF(){
 let s=getCurrent();
 if(!s){alert("Abra uma calibração antes de gerar o relatório.");return null;}
 collectMeta(s);collectTables(s);collectObservation(s);
 saveDB();
 try{
   const blob=AviationPDF.pdfFromSession(s);
   const filename=`Laudo-Calibracao-OS-${(s.meta.os||"sem-OS").replace(/[^a-z0-9_-]/gi,"_")}.pdf`;
   return {blob,s,filename};
 }catch(e){console.error(e);alert("Não foi possível gerar o PDF. Tente novamente.");return null;}
}

function makePdfFileForSession(s){
  const result=makeCurrentPDFForSession(s); if(!result)return null;
  return result;
}
function makeCurrentPDFForSession(s, fromCurrentForm=false){
  try{
    if(fromCurrentForm){ collectMetaForSession(s); collectTablesForSession(s); collectObservationForSession(s); }
    const blob=AviationPDF.pdfFromSession(s);
    const filename=`Laudo-Calibracao-OS-${(s.meta.os||"sem-OS").replace(/[^a-z0-9_-]/gi,"_")}.pdf`;
    return {blob,s,filename};
  }catch(e){console.error(e);alert("Não foi possível gerar o PDF. Verifique os dados e tente novamente.");return null;}
}
function collectMetaForSession(s){
  ["os","data","cliente","prefixo"].forEach(k=>{const el=document.getElementById(k);if(el)s.meta[k]=el.value.trim()});
  s.meta.validade="2 anos";
  collectReportMeta(s);
  s.selectedReports=[...document.querySelectorAll("[data-select-report]:checked")].map(x=>x.dataset.selectReport);
}
function collectTablesForSession(s){ collectTables(s); }
function collectObservationForSession(s){ collectObservation(s); }
function openBlobPdf(blob,filename){
  const url=URL.createObjectURL(blob);
  // The anchor is clicked synchronously from the user's action, which avoids
  // the popup restrictions that were blocking the old async implementation.
  const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener";a.setAttribute("aria-label","Abrir PDF");
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),10*60*1000);
  return true;
}
function sharePdf(blob,filename){
  const file=new File([blob],filename,{type:"application/pdf"});
  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
    navigator.share({files:[file],title:filename}).catch(e=>{if(e?.name!=="AbortError")openBlobPdf(blob,filename);});
    return true;
  }
  return false;
}
function printSessionObject(s){
  const result=makeCurrentPDFForSession(s,true);if(!result)return;
  // First choice: native iPad share sheet. From there the user can tap Imprimir.
  if(sharePdf(result.blob,result.filename))return;
  // Reliable browser fallback: open the real PDF in a new tab/window.
  // The iPad PDF viewer exposes Imprimir and Compartilhar/Salvar em Arquivos.
  openBlobPdf(result.blob,result.filename);
}
async function printReport(){
  const s=getCurrent();if(!s){alert("Abra uma calibração antes de imprimir.");return;}
  printSessionObject(s);
}
async function downloadReport(){
  const s=getCurrent();if(!s){alert("Abra uma calibração antes de salvar o relatório.");return;}
  const result=makeCurrentPDFForSession(s,true);if(!result)return;
  // On iPad, a PDF opened in the native viewer is the dependable path to
  // Salvar em Arquivos. On desktop, the download attribute is used.
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
  if(isIOS){openBlobPdf(result.blob,result.filename);return;}
  const url=URL.createObjectURL(result.blob);const a=document.createElement("a");a.href=url;a.download=result.filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),120000);
}
function printSessionById(id){
  const s=db.sessions.find(x=>x.id===id);if(!s)return;
  currentId=id;printSessionObject(s);
}
window.printSessionById=printSessionById;

function metaHTML(s){let m=s.meta;return `<div class="print-meta"><div><b>Cliente:</b></div><div>${esc(m.cliente)}</div><div><b>Validade:</b></div><div>${esc(m.validade)}</div><div><b>OS:</b></div><div>${esc(m.os)}</div><div><b>DATA:</b></div><div>${esc(m.data)}</div><div><b>Fabricante:</b></div><div>${esc(m.fabricante)}</div><div><b>P/N:</b></div><div>${esc(m.pn)}</div><div><b>S/N:</b></div><div>${esc(m.sn)}</div><div><b>PREFIXO:</b></div><div>${esc(m.prefixo)}</div></div>`}
function pTable(headers,rows){return `<table class="print-table"><thead><tr>${headers.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table>`}
function buildPrint(s){collectTables(s);let pages=[];let a=s.reports.altimetro;if(s.selectedReports.includes("altimetro")){syncScaleFromFriction(s);syncHysteresisFromScale(s);let f=ALT_FRICTION.map((x,i)=>[x,a.friction[i].sem||"",a.friction[i].com||"",FRICTION_TOL[i]]);let sc=ALT_SCALE.map((x,i)=>[x,["31,018","29,921","29,385","28,856","28,335","27,821","26,817","25,842","23,978","22,225","20,577","19,029","17,577","16,216","14,942","13,75"][i],a.scale[i].lido||"",SCALE_TOL[i]]);let leak=[[a.leak.pressao,"18000",a.leak.lido||"","100"]];let bar=a.baro.map(r=>[r.valor,r.diferenca,r.lido||""]);let hy=[["1º — 50% altitude máxima (10000 pés)",a.hyst[0].lidoDec||"",a.hyst[0].lidoCresc||"",a.hyst[0].dif||"","75"],["2º — 40% altitude máxima (8000 pés)",a.hyst[1].lidoDec||"",a.hyst[1].lidoCresc||"",a.hyst[1].dif||"","75"]];pages.push(`<div class="print-page"><div class="print-title">LAUDO TÉCNICO DO ALTÍMETRO</div>${metaHTML(s)}<div class="print-section">TESTE DE ATRITO (pressão decrescente)</div>${pTable(["ALTITUDE (PÉS)","VALOR SEM VIBRAÇÃO","VALOR COM VIBRAÇÃO","TOLERÂNCIA ESPECÍFICA (PÉS)"],f)}<div class="print-section">ERRO DE ESCALA (pressão decrescente)</div>${pTable(["ALTITUDE (PÉS)","PRESSÃO EQUIVALENTE (POL HG)","VALOR LIDO","TOLERÂNCIA ± PÉS"],sc)}<div class="print-grid2"><div><div class="print-section">VAZAMENTO DE CAIXA</div>${pTable(["PRESSÃO (IN HG)","ALTITUDE","VALOR LIDO","TOL. ±"],leak)}</div><div><div class="print-section">ERRO DE ESCALA BARÔMETRO (tol. ±25 pés)</div>${pTable(["PRESSÃO","DIFERENÇA","VALOR LIDO"],bar)}</div></div><div class="print-section">HISTERESE (Altitude máxima de operação — pressão crescente)</div>${pTable(["PONTO DE TESTE","VALOR DECRESCENTE","VALOR CRESCENTE","DIFERENÇA","TOLERÂNCIA"],hy)}<div class="sig"><div>Responsável técnico</div><div>Cliente</div></div></div>`)}
if(s.selectedReports.includes("integracao")){let ir=s.reports.integracao.map(r=>[r.teste,r.altitude,r.altimetro||"",r.transponder||""]);pages.push(`<div class="print-page"><div class="print-title">LAUDO TÉCNICO INTEGRAÇÃO DO TRANSPONDER E ALTITUDE ENCODER</div>${metaHTML(s)}<div class="print-left"><div class="print-section">Verificação da altitude transmitida pelo transponder</div>${pTable(["TESTE Nº","ALTITUDE (PÉS)","LEITURA DO ALTÍMETRO (PÉS)","LEITURA DO TRANSPONDER (PÉS)"],ir)}</div><div class="sig"><div>Responsável técnico</div><div>Cliente</div></div></div>`)}
if(s.selectedReports.includes("encoder")){let er=s.reports.encoder.map(r=>[r.teste,r.altitude,r.nominal,r.atual||""]);pages.push(`<div class="print-page"><div class="print-title">LAUDO TÉCNICO DO ENCODER</div>${metaHTML(s)}<div class="print-left"><div class="print-section">Teste #6 — Verificação da saída digitalizada</div>${pTable(["TESTE Nº","ALTITUDE DE REFERÊNCIA","PONTO DE TRANSIÇÃO NOMINAL","PONTO DE TRANSIÇÃO ATUAL"],er)}</div><div class="sig"><div>Responsável técnico</div><div>Cliente</div></div></div>`)}
if(s.selectedReports.includes("transponder")){let t=s.reports.transponder;let radio=t.radio.map(r=>[r[0],r[1],r[2]||""]),sup=t.suppression.map(r=>[r[0],r[1],r[2]||""]),sens=t.sensitivity.map(r=>[r[0],r[1],r[2]||""]),power=t.power.map(r=>[r[0],r[1],r[2]||""]),rec=t.reception.map(r=>[r[0],r[1],`${r[2]||""} / ${r[3]||""}`]),ms=t.modeS.map(r=>[r[0],r[1],r[2]||""]);pages.push(`<div class="print-page"><div class="print-title">LAUDO TÉCNICO DE TRANSPONDER</div>${metaHTML(s)}<div class="print-section">RADIO FREQUÊNCIA DE RESPOSTA</div>${pTable(["TESTE","VALOR REQUERIDO (MHz)","VALOR ENCONTRADO (MHz)"],radio)}<div class="print-section">SUPRESSÃO — MODO 3/A</div>${pTable(["TESTE","VALOR REQUERIDO","RESULTADO"],sup)}<div class="print-section">SENSIBILIDADE DO RECEPTOR</div><div class="print-note">Obs.: Equipamento de teste conectado ao terminal de antena do transponder com correção para perdas de linha de transmissão.</div>${pTable(["TESTE","VALOR REQUERIDO","VALOR ENCONTRADO"],sens)}<div class="print-section">POTÊNCIA DE PICO DE SAÍDA DE RÁDIO FREQUÊNCIA</div>${pTable(["TESTE","VALOR","VALOR ENCONTRADO (W)"],power)}<div class="print-section">OUTRAS MEDIÇÕES</div><div class="print-note">${esc(t.other||"")}</div><div class="sig"><div>Responsável técnico</div><div>Cliente</div></div></div>`);pages.push(`<div class="print-page"><div class="print-title">LAUDO TÉCNICO DE TRANSPONDER</div>${metaHTML(s)}<div class="print-section">PARÂMETROS — VALOR ENCONTRADO</div>${pTable(["PARÂMETRO","VALOR REQUERIDO","VALOR ENCONTRADO (MODE A / MODE C)"],rec)}<div class="print-section">SOMENTE PARA TRANSPONDER MODE S</div>${pTable(["TESTE","VALOR / CRITÉRIO","VALOR ENCONTRADO"],ms)}<div class="print-note">OBS.: Inspeção e teste conforme RBAC 43 Apêndice “F”.</div><div class="sig"><div>Responsável técnico</div><div>Cliente</div></div></div>`)}
if(s.selectedReports.includes("airdata")){const ad=s.reports.airdata;let rows=AIR_DATA_POINTS.map((p,i)=>[p[0],p[1],ad.rows[i]?.valor||"",p[2]]);pages.push(`<div class="print-page"><div class="print-title">LAUDO TÉCNICO DO AIRDATA</div>${metaHTML(s)}<div class="print-section">TESTE #1 — ERRO DE ESCALA (pressão decrescente)</div>${pTable(["PRESSÃO EQUIVAL. (POL HG)","ALTITUDE (PÉS)","VALOR LIDO (PÉS)","TOLERÂNCIA ESPECIF. (± PÉS)"],rows)}<div class="print-section">TESTE #4 — VAZAMENTO DA LINHA</div>${pTable(["PRESSÃO (IN HG)","ALTITUDE (PÉS)","VALOR LIDO (PÉS)","TOLERÂNCIA"],[["13.750","20.000",ad.leak||"","± 100"]])}<div class="print-note">Obs.: Calibração realizada na aeronave conforme RBAC 43 apêndice “E”.</div><div class="sig"><div>Responsável técnico</div><div>Cliente</div></div></div>`)}
if(s.observacoesAjustes&&String(s.observacoesAjustes).trim()&&pages.length){const obs=`<div class="print-observation"><b>OBSERVAÇÕES / AJUSTES</b><div>${esc(s.observacoesAjustes).replace(/\n/g,"<br>")}</div></div>`;pages[pages.length-1]=pages[pages.length-1].replace(/<div class="sig">/,obs+`<div class="sig">`)}printRoot.innerHTML=pages.join("");}

document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",(ev)=>{
  ev.preventDefault();
  const view=b.dataset.view;
  if(view==="session"){newSession();return;}
  showView(view);
  if(view==="trash")renderTrash();
}));
window.addEventListener("online",updateNetworkStatus);
window.addEventListener("offline",updateNetworkStatus);
setInterval(updateNetworkStatus,15000);
quickNew.onclick=newSession;newFromList.onclick=newSession;
document.getElementById("saveCalibration")?.addEventListener("click",saveCalibrationRegistration);document.getElementById("saveReport")?.addEventListener("click",saveCurrent);document.getElementById("printReport")?.addEventListener("click",printReport);

document.getElementById("downloadReport")?.addEventListener("click",downloadReport);
exportBackup.onclick=()=>{let blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});let a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="aviation-center-calibracoes-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
importBackup.onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!Array.isArray(x.sessions))throw Error();db=x;db.trash=Array.isArray(db.trash)?db.trash:[];purgeExpiredTrash();saveDB();alert("Backup importado com sucesso.");}catch(_){alert("Backup inválido.")}};r.readAsText(f)};
document.addEventListener("input",e=>{const el=e.target;if(!el.matches("input.cell"))return;if(el.dataset.r==="scale"){el.classList.remove("cell-green","cell-yellow","cell-red");el.classList.add(toleranceClass(el.value,el.dataset.expected,el.dataset.tol));}if(el.dataset.r==="hyst"&&el.dataset.k==="dif"){el.classList.remove("cell-green","cell-yellow","cell-red");el.classList.add(hystClass(el.value,el.dataset.tol));}});

const sidebarToggle=document.getElementById("sidebarToggle");
sidebarToggle?.addEventListener("click",()=>{
  document.body.classList.toggle("sidebar-collapsed");
  const collapsed=document.body.classList.contains("sidebar-collapsed");
  sidebarToggle.textContent=collapsed?"›":"‹";
  sidebarToggle.setAttribute("aria-label",collapsed?"Expandir menu":"Recolher menu");
  sidebarToggle.title=collapsed?"Expandir menu":"Recolher menu";
  try{localStorage.setItem("acs_sidebar_collapsed",collapsed?"1":"0")}catch(_){ }
});
try{if(localStorage.getItem("acs_sidebar_collapsed")==="1"){document.body.classList.add("sidebar-collapsed");if(sidebarToggle){sidebarToggle.textContent="›";sidebarToggle.setAttribute("aria-label","Expandir menu");sidebarToggle.title="Expandir menu";}}}catch(_){ }

document.addEventListener("DOMContentLoaded",()=>{updateDashboard();renderSessions();newSession();updateNetworkStatus()});

if("serviceWorker" in navigator && location.protocol.startsWith("http")){navigator.serviceWorker.register("./sw.js").catch(()=>{});}


document.querySelectorAll("[data-select-report]").forEach(ch=>ch.addEventListener("change",()=>{let s=getCurrent();if(!s)return;collectMeta(s);if(!s.selectedReports.length){ch.checked=true;return}if(!document.getElementById("reportEditorPanel")?.classList.contains("hidden")){renderReportTabs(s)}}));
document.addEventListener("input",e=>{
 let s=getCurrent();
 if(!s)return;
 if(e.target.matches("[data-r='friction'][data-k='com']")){
   collectMeta(s);
   s.reports.altimetro.friction[+e.target.dataset.i].com=e.target.value;
   syncScaleFromFriction(s);syncIntegrationFromAltimeter(s);syncHysteresisFromScale(s);
   renderScale(s);renderIntegration(s);renderHyst(s);
   return;
 }
 if(e.target.matches("[data-r='scale']")){
   s.reports.altimetro.scale[+e.target.dataset.i].lido=e.target.value;
   syncIntegrationFromAltimeter(s);syncHysteresisFromScale(s);
   renderIntegration(s);renderHyst(s);
   return;
 }
 if(e.target.matches("[data-r='hyst'][data-k='lidoCresc']")){
   const i=+e.target.dataset.i;
   const r=s.reports.altimetro.hyst[i];
   r.lidoCresc=e.target.value;
   const a=toNumber(r.lidoDec),b=toNumber(r.lidoCresc);
   r.dif=Number.isFinite(a)&&Number.isFinite(b)?formatNumber(b-a):"";
   const diff=document.querySelector(`[data-r="hyst"][data-k="dif"][data-i="${i}"]`);
   if(diff){diff.value=r.dif;diff.classList.remove("cell-green","cell-yellow","cell-red");const c=hystClass(r.dif,75);if(c)diff.classList.add(c);}
 }
});
