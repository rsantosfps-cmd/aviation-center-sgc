// Backend offline-first do Aviation Center Calibrações.
// Supabase Auth + REST API. O sincronizador faz MERGE local + nuvem e confirma a gravação.
(function(){
  const C=window.ACS_BACKEND_CONFIG||{};
  const SESSION_KEY="acs_backend_auth_v3";
  const SYNC_META_KEY="acs_backend_sync_meta_v2";
  let timer=null, syncing=false;

  function configured(){return C.enabled!==false && /^https:\/\//.test(C.url||"") && !!C.anonKey;}
  function getAuth(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch(_){return null}}
  function setAuth(x){if(x)localStorage.setItem(SESSION_KEY,JSON.stringify(x));else localStorage.removeItem(SESSION_KEY);updateUI();}
  function getMeta(){try{return JSON.parse(localStorage.getItem(SYNC_META_KEY)||"{}")}catch(_){return {}}}
  function setMeta(x){try{localStorage.setItem(SYNC_META_KEY,JSON.stringify(x||{}))}catch(_){} }
  function headers(token){return {"apikey":C.anonKey,"Authorization":"Bearer "+token,"Content-Type":"application/json","Accept":"application/json","Accept-Profile":"public","Content-Profile":"public"};}

  async function authRequest(path,body){
    const r=await fetch(C.url+"/auth/v1/"+path,{method:"POST",headers:{apikey:C.anonKey,"Content-Type":"application/json"},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error_description||j.msg||j.message||("Falha na autenticação (HTTP "+r.status+")"));
    return j;
  }
  async function signup(email,password){if(!configured())throw new Error("Configure o backend primeiro.");return authRequest("signup",{email,password});}

  async function login(email,password,localDb){
    if(!configured())throw new Error("Configure o backend primeiro.");
    const j=await authRequest("token?grant_type=password",{email,password});
    if(!j.access_token)throw new Error("A conta precisa confirmar o e-mail antes de entrar.");
    setAuth(j);
    const result=await syncNow(localDb || window.ACSGetDB?.(),"login");
    // Autenticação e sincronização são etapas separadas. A conta continua conectada
    // mesmo que a rede/RLS esteja indisponível, para que o usuário possa tentar novamente.
    return {auth:j,sync:result};
  }

  async function refresh(){
    const a=getAuth();
    if(!a?.refresh_token||!configured())return null;
    try{
      const j=await authRequest("token?grant_type=refresh_token",{refresh_token:a.refresh_token});
      if(!j.access_token)throw new Error("Não foi possível renovar a sessão.");
      setAuth(j);return j;
    }catch(e){setAuth(null);setStatus("Sessão expirada. Entre novamente.",false);return null;}
  }

  async function api(path,opts={}){
    let a=getAuth();
    if(!a?.access_token){
      a=await refresh();
      if(!a?.access_token)throw new Error("Não autenticado. Entre novamente.");
    }
    const make=token=>fetch(C.url+path,{...opts,headers:{...headers(token),...(opts.headers||{})}});
    let r=await make(a.access_token);
    if(r.status===401){
      a=await refresh();
      if(!a?.access_token)throw new Error("Sessão expirada. Entre novamente.");
      r=await make(a.access_token);
    }
    const text=await r.text();
    let j={};try{j=text?JSON.parse(text):{}}catch(_){j=text}
    if(!r.ok){
      const detail=j?.message||j?.error||j?.hint||j?.details||text||("HTTP "+r.status);
      throw new Error("HTTP "+r.status+": "+detail);
    }
    return j;
  }

  function clone(x){return JSON.parse(JSON.stringify(x));}
  function stamp(x,trash=false){return String(x?.updatedAt||x?.createdAt||(trash?x?.deletedAt:"")||"");}
  function isBlankValue(v){
    return v===undefined||v===null||(typeof v==="string"&&v.trim()==="");
  }
  function mergeSession(local,cloud){
    if(!local)return clone(cloud);
    if(!cloud)return clone(local);
    const localNewer=stamp(local)>=stamp(cloud);
    const mergeValue=(a,b)=>{
      if(a===undefined)return clone(b);
      if(b===undefined)return clone(a);
      if(Array.isArray(a)&&Array.isArray(b)){
        const n=Math.max(a.length,b.length);
        return Array.from({length:n},(_,i)=>mergeValue(a[i],b[i]));
      }
      if(a&&b&&typeof a==="object"&&typeof b==="object"&&!Array.isArray(a)&&!Array.isArray(b)){
        const o={};
        new Set([...Object.keys(a),...Object.keys(b)]).forEach(k=>o[k]=mergeValue(a[k],b[k]));
        return o;
      }
      // Um valor preenchido nunca é apagado por uma versão vazia.
      if(isBlankValue(a)&&!isBlankValue(b))return clone(b);
      if(!isBlankValue(a)&&isBlankValue(b))return clone(a);
      return clone(localNewer?a:b);
    };
    return mergeValue(local,cloud);
  }
  function mergeStates(local,cloud){
    const out=clone(local||{sessions:[],trash:[]});
    out.sessions=Array.isArray(out.sessions)?out.sessions:[];
    out.trash=Array.isArray(out.trash)?out.trash:[];
    const mergeBy=(a,b,key,trash=false)=>{
      const map=new Map();
      [...(a||[]),...(b||[])].forEach(x=>{
        if(!x||!x[key])return;
        const old=map.get(x[key]);
        if(!old)map.set(x[key],clone(x));
        else if(!trash)map.set(x[key],mergeSession(old,x));
        else if(stamp(x,trash)>=stamp(old,trash))map.set(x[key],clone(x));
      });
      return [...map.values()];
    };
    out.sessions=mergeBy(local?.sessions,cloud?.sessions,false);
    out.trash=mergeBy(local?.trash,cloud?.trash,true);
    return out;
  }

  async function readCloud(){
    const a=getAuth();
    if(!a?.access_token)throw new Error("Não autenticado.");
    const rows=await api("/rest/v1/app_state?select=payload,updated_at&owner_id=eq."+encodeURIComponent(a.user.id)+"&limit=1");
    return rows?.[0]||null;
  }

  async function upsertState(db){
    const a=getAuth();
    if(!a?.access_token||!configured())throw new Error("Sessão não autenticada.");
    const body={owner_id:a.user.id,payload:clone(db),updated_at:new Date().toISOString()};

    // Usa o endpoint padrão do PostgREST para UPSERT. É mais confiável que
    // separar PATCH + POST e evita uma janela de corrida entre dispositivos.
    const result=await api("/rest/v1/app_state?on_conflict=owner_id",{
      method:"POST",
      headers:{Prefer:"resolution=merge-duplicates,return=representation"},
      body:JSON.stringify(body)
    });
    if(!Array.isArray(result)||!result.length){
      throw new Error("O Supabase aceitou a requisição, mas não retornou o registro app_state. Verifique a tabela e as políticas RLS.");
    }
    return result[0];
  }

  async function syncNow(localDb,reason="manual"){
    if(!configured())return {configured:false};
    if(syncing)return {busy:true};
    syncing=true;
    setStatus(reason==="login"?"Conta conectada. Sincronizando dados…":"Sincronizando dados…",false);
    try{
      let a=getAuth();
      if(!a?.access_token&&a?.refresh_token)a=await refresh();
      if(!a?.access_token)return {authenticated:false};

      const local=clone(localDb||window.ACSGetDB?.()||{sessions:[],trash:[]});
      const row=await readCloud();
      const cloud=row?.payload||{sessions:[],trash:[]};
      const merged=mergeStates(local,cloud);

      const saved=await upsertState(merged);
      const verify=await readCloud();
      if(!verify?.payload)throw new Error("A nuvem não retornou o registro após a gravação.");

      if(window.ACSBackendApplyState)window.ACSBackendApplyState(verify.payload);
      const now=new Date().toISOString();
      setMeta({lastSyncAt:now,cloudUpdatedAt:verify.updated_at||saved?.updated_at||now,lastError:""});
      setStatus("Sincronizado com a nuvem • "+new Date(now).toLocaleString("pt-BR"),true);
      return {ok:true,state:verify.payload,cloud:verify};
    }catch(e){
      const msg=e?.message||String(e);
      const meta=getMeta(); setMeta({...meta,lastError:msg,lastErrorAt:new Date().toISOString()});
      setStatus("Sincronização pendente: "+msg,false);
      return {ok:false,error:{message:msg}};
    }finally{syncing=false;updateUI();}
  }

  function queuePush(db){
    if(!configured()||!getAuth()?.access_token)return;
    clearTimeout(timer);
    timer=setTimeout(()=>syncNow(db,"alteração local"),700);
  }

  function logout(){setAuth(null);setStatus("Backend configurado, mas sem sessão.",false);}
  function setStatus(msg,ok){
    const el=document.getElementById("backendStatus");if(el)el.textContent=msg;
    const b=document.getElementById("backendBadge");if(b){b.textContent=ok?"Sincronizado":"Backend";b.className="pill "+(ok?"backend-ok":"");}
  }

  function updateUI(){
    const cfg=configured(),a=getAuth();
    const st=document.getElementById("backendStatus"),badge=document.getElementById("backendBadge"),login=document.getElementById("backendLogin"),signup=document.getElementById("backendSignup"),logoutBtn=document.getElementById("backendLogout"),sync=document.getElementById("backendSync");
    if(!st)return;
    if(!cfg){st.textContent="Backend não configurado. O sistema continua 100% local/offline.";if(badge)badge.textContent="Local";if(login)login.disabled=true;if(signup)signup.disabled=true;if(sync)sync.disabled=true;if(logoutBtn)logoutBtn.classList.add("hidden");return;}
    if(login)login.disabled=false;if(signup)signup.disabled=false;if(sync)sync.disabled=!a?.access_token;if(logoutBtn)logoutBtn.classList.toggle("hidden",!a?.access_token);
    const meta=getMeta();
    if(a?.user?.email){
      if(meta.lastSyncAt){
        st.textContent="Conta conectada: "+a.user.email+" • Última sincronização: "+new Date(meta.lastSyncAt).toLocaleString("pt-BR");
      }else if(meta.lastError){
        st.textContent="Conta conectada: "+a.user.email+" • Sincronização pendente: "+meta.lastError;
      }else{
        st.textContent="Conta conectada: "+a.user.email+" • Sincronização pendente";
      }
    }else st.textContent="Backend configurado. Entre para sincronizar.";
  }

  async function init(){
    updateUI();
    if(configured()&&getAuth()?.refresh_token){
      const a=await refresh();
      if(a?.access_token)await syncNow(window.ACSGetDB?.(),"abertura");
    }
    updateUI();
  }

  window.addEventListener("online",()=>{if(getAuth()?.access_token)syncNow(window.ACSGetDB?.(),"online");});
  window.ACSBackend={configured,signup,login,logout,syncNow,queuePush,updateUI,init};

  document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("backendLogin")?.addEventListener("click",async()=>{
      const e=document.getElementById("backendEmail").value.trim(),p=document.getElementById("backendPassword").value,m=document.getElementById("backendMessage");
      try{
        const result=await login(e,p,window.ACSGetDB?.());
        if(m)m.textContent=result?.sync?.ok?"Login realizado e sincronização confirmada na nuvem.":"Conta conectada, mas a sincronização está pendente. Veja o erro acima e tente novamente.";
      }catch(x){if(m)m.textContent=x.message;setStatus("Backend: "+x.message,false);}
      updateUI();
    });
    document.getElementById("backendSignup")?.addEventListener("click",async()=>{
      const e=document.getElementById("backendEmail").value.trim(),p=document.getElementById("backendPassword").value,p2=document.getElementById("backendPassword2").value,m=document.getElementById("backendMessage");
      if(p!==p2){m.textContent="As senhas não conferem.";return}
      try{const j=await signup(e,p);m.textContent=j.access_token?"Conta criada e conectada.":"Conta criada. Confirme o e-mail e depois entre.";}
      catch(x){m.textContent=x.message;}
      updateUI();
    });
    document.getElementById("backendLogout")?.addEventListener("click",()=>{logout();});
    document.getElementById("backendSync")?.addEventListener("click",async()=>{
      const m=document.getElementById("backendMessage");
      const r=await syncNow(window.ACSGetDB?.(),"manual");
      if(m)m.textContent=r?.ok?"Sincronização concluída e confirmada na nuvem.":(r?.error?.message||"Não foi possível sincronizar agora.");
      updateUI();
    });
    init();
  });
})();
