import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.118.0';
const $=id=>document.getElementById(id);
const cfg=window.OHANA_CONFIG||{};
const client=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
const brands=["Nike","Jordan","Adidas","New Balance"];
const pageSize=12;let page=0;let manager=null;let sources=[];let count=0;
let imageQueue=[],imageActive=0,imageEpoch=0,objectUrls=[];
const make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
const validPhoto=u=>{try{const x=new URL(u);return x.protocol==="https:"&&x.hostname==="photo.yupoo.com"&&/^\/[a-zA-Z0-9_-]{2,40}\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+\.(jpeg|jpg|png)$/.test(x.pathname)?x.href:null;}catch{return null;}};
const albumLink=u=>{try{const x=new URL(u);return x.protocol==="https:"&&x.hostname.endsWith(".x.yupoo.com")&&/^\/albums\/[0-9]+$/.test(x.pathname)?x.href:null;}catch{return null;}};
const setStatus=message=>{$("globalStatus").textContent=message;};
function clearPreviews(){
  imageEpoch++;
  imageQueue=[];
  for(const url of objectUrls)URL.revokeObjectURL(url);
  objectUrls=[];
}
function pumpPreviews(){
  while(imageActive<4 && imageQueue.length){
    const task=imageQueue.shift();
    imageActive++;
    task().catch(()=>{}).finally(()=>{imageActive--;pumpPreviews();});
  }
}
function queuePreview(row,index,img,finished){
  const epoch=imageEpoch;
  imageQueue.push(async()=>{
    if(epoch!==imageEpoch||!img.isConnected)return;
    const {data,error}=await client.functions.invoke("ohana-v3-media",{
      body:{category_id:row.category_id,album_id:row.album_id,mode:"preview",index}
    });
    if(epoch!==imageEpoch||!img.isConnected)return;
    if(error||!(data instanceof Blob)||data.type!=="image/jpeg"){
      img.alt="Anteprima non disponibile";return;
    }
    const src=URL.createObjectURL(data);
    objectUrls.push(src);
    img.onload=()=>{if(epoch===imageEpoch)finished();};
    img.onerror=()=>{img.alt="Fotografia non disponibile";};
    img.src=src;
  });
  pumpPreviews();
}

function requireAuth(){ $("authArea").hidden=false; $("workspace").hidden=true; }
async function authenticate(){
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user){requireAuth();return;}
  const {data:row,error:authError}=await client.from("ohana_managers").select("user_id").eq("user_id",user.id).maybeSingle();
  if(authError||!row){setStatus("Utente non autorizzato per questa area.");requireAuth();return;}
  manager=user;
  $("authArea").hidden=true;$("workspace").hidden=false;
  const src=await client.from("ohana_v3_sources").select("category_id,brand,model_label,reported_albums");
  if(src.error){setStatus("Non riesco a leggere le raccolte riservate.");return;}
  sources=src.data||[];
  await load();
}
async function stats(){
  const states=["discovered","needs_review","approved","rejected","publishing","published"];
  const values=await Promise.all(states.map(s=>client.from("ohana_v3_album_candidates").select("album_id",{count:"exact",head:true}).eq("status",s)));
  const counts=Object.fromEntries(states.map((v,i)=>[v,values[i].count||0]));
  $("summary").textContent="Inventario: "+Object.values(counts).reduce((a,b)=>a+b,0)+
     " album · "+counts.discovered+" in scansione · "+counts.needs_review+" da verificare · "+
     counts.approved+" approvati · "+counts.published+" pubblicati · "+counts.rejected+" scartati";
}
function makeCard(row){
  const src=sources.find(s=>s.category_id===row.category_id);
  const el=make("article",undefined,"card");
  const head=make("header");head.append(make("h2",(src?.brand||"")+" · "+(src?.model_label||"")));
  head.append(make("span","#"+row.album_id,"code"));el.append(head);
  if(row.raw_title)el.append(make("p",row.raw_title,"raw-title"));
  const photos=make("div",undefined,"photos");
  const urls=Array.isArray(row.raw_image_urls)?row.raw_image_urls.filter(validPhoto):[];
  let loadedPreviews=0;
  const previewDone=()=>{loadedPreviews++;if(loadedPreviews===3&&row.status==="needs_review"&&approve)approve.disabled=false;};
  for(const [index,url] of urls.slice(0,3).entries()){
    const img=make("img");img.alt="Caricamento vista "+(index+1);
    img.loading="lazy";photos.append(img);
    // JPG ricevuto dal proxy autenticato OHANA, senza esporre URL del fornitore.
    queuePreview(row,index,img,previewDone);
  }
  if(!photos.childElementCount)photos.append(make("p","Foto non ancora recuperate"));
  el.append(photos);
  const link=albumLink(row.album_url);
  if(link){const a=make("a","Apri album per verifica ↗");a.href=link;a.target="_blank";a.rel="noopener noreferrer";el.append(a);}
  const form=make("form");
  const nameLabel=make("label","Nome modello verificato");const name=make("input");name.type="text";name.required=true;name.maxLength=110;name.value=row.proposed_name||[src?.brand,src?.model_label].filter(Boolean).join(" ");nameLabel.append(name);
  const colorLabel=make("label","Colorazione (facoltativa)");const color=make("input");color.type="text";color.maxLength=80;color.value=row.proposed_color||"";color.placeholder="Solo se identificata con certezza";colorLabel.append(color);
  const actions=make("div",undefined,"actions");
  const approve=make("button",row.status==="approved"?"Già approvato":"Approva");approve.type="submit";approve.disabled=true; // Serve il caricamento reale delle tre fotografie prima dell’approvazione
  const reject=make("button","Scarta","reject");reject.type="button";
  const note=make("p","", "status notice");note.setAttribute("role","status");
  async function save(status){
    if(!manager)return;
    if(status==="approved"&&(urls.length<3||name.value.trim().length<3)){note.textContent="Servono almeno tre foto e un modello verificato.";return;}
    approve.disabled=true;reject.disabled=true;note.textContent="Salvataggio…";
    const update={status,proposed_name:name.value.trim().slice(0,110)||null,
       proposed_color:color.value.trim().slice(0,80)||null,reviewed_by:manager.id,reviewed_at:new Date().toISOString()};
    const {error}=await client.from("ohana_v3_album_candidates").update(update)
      .eq("category_id",row.category_id).eq("album_id",row.album_id);
    if(error){note.textContent="Aggiornamento non riuscito. Verifica i permessi.";approve.disabled=urls.length<3;reject.disabled=false;return;}
    await load();
  }
  form.addEventListener("submit",e=>{e.preventDefault();save("approved");});
  reject.addEventListener("click",()=>save("rejected"));
  actions.append(approve,reject);
  if(row.status==="approved"){
    const publish=make("button","Importa 3 foto e pubblica V3");
    publish.type="button";
    publish.addEventListener("click",async()=>{
      publish.disabled=true;reject.disabled=true;note.textContent="Importazione delle fotografie approvate…";
      const {data,error}=await client.functions.invoke("ohana-v3-media",{
        body:{category_id:row.category_id,album_id:row.album_id}
      });
      if(error||!data?.published){
        note.textContent="Importazione non completata. Riprova oppure verifica le fotografie.";
        publish.disabled=false;reject.disabled=false;return;
      }
      note.textContent="Fotografie pubblicate nello spazio OHANA. Aggiornamento catalogo statico in corso.";
      await load();
    });
    actions.append(publish);
  }
  if(row.status==="published"){
    approve.disabled=true;reject.disabled=true;
    note.textContent="Prodotto approvato e fotografie ospitate da OHANA.";
  }
  form.append(nameLabel,colorLabel,actions,note);el.append(form);
  return el;
}
async function load(){
  clearPreviews();
  setStatus("");$("cards").replaceChildren(make("p","Caricamento album…"));
  const status=$("status").value,brand=$("brand").value;
  let query=client.from("ohana_v3_album_candidates")
    .select("category_id,album_id,album_url,raw_title,raw_image_urls,status,proposed_name,proposed_color",{count:"exact"})
    .eq("status",status).order("updated_at",{ascending:false}).range(page*pageSize,(page+1)*pageSize-1);
  if(brand){
    const ids=sources.filter(s=>s.brand===brand).map(s=>s.category_id);
    if(!ids.length){$("cards").replaceChildren(make("p","Nessun modello per questo marchio."));return;}
    query=query.in("category_id",ids);
  }
  const {data,error,count:c}=await query;
  if(error){$("cards").replaceChildren(make("p","Errore nella lettura delle schede."));return;}
  count=c||0;const list=data||[];
  const area=$("cards");area.replaceChildren();
  for(const row of list)area.append(makeCard(row));
  if(!list.length)area.append(make("p","Nessun album in questo stato."));
  $("prev").disabled=page===0;$("next").disabled=(page+1)*pageSize>=count;
  $("pageStatus").textContent=(count?((page*pageSize)+1):0)+"–"+Math.min(count,(page+1)*pageSize)+" / "+count;
  await stats();
}
$("loginForm").addEventListener("submit",async e=>{
  e.preventDefault();$("loginStatus").textContent="Accesso in corso…";
  const {error}=await client.auth.signInWithPassword({email:$("email").value,password:$("password").value});
  $("password").value="";
  if(error){$("loginStatus").textContent="Accesso non riuscito. Ricontrolla le credenziali.";return;}
  $("loginStatus").textContent="";await authenticate();
});
$("brand").addEventListener("change",()=>{page=0;load();});
$("status").addEventListener("change",()=>{page=0;load();});
$("reload").addEventListener("click",()=>load());
$("prev").addEventListener("click",()=>{if(page>0){page--;load();}});
$("next").addEventListener("click",()=>{if((page+1)*pageSize<count){page++;load();}});
client.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){manager=null;requireAuth();}});
authenticate().catch(()=>{setStatus("Errore temporaneo. Riprova.");requireAuth();});