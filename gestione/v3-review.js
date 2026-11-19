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
    if(epoch!==imageEpoch)return;
    const {data,error}=await client.functions.invoke("ohana-v3-media",{
      body:{category_id:row.category_id,album_id:row.album_id,mode:"preview",index}
    });
    if(epoch!==imageEpoch||!img.isConnected)return;
    if(error||!(data instanceof Blob)||data.type!=="application/octet-stream"){
      img.alt="Anteprima non disponibile";return;
    }
    const signature=new Uint8Array(await data.slice(0,3).arrayBuffer());
    if(signature[0]!==0xff||signature[1]!==0xd8||signature[2]!==0xff){
      img.alt="Formato immagine non valido";return;
    }
    const src=URL.createObjectURL(new Blob([data],{type:"image/jpeg"}));
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
  refreshModels();
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
  const card=make("article",undefined,"card");
  const header=make("header");
  header.append(make("h2",(src?.brand||"")+" · "+(src?.model_label||"")));
  header.append(make("span","#"+row.album_id,"code"));
  card.append(header);
  if(row.raw_title)card.append(make("p",row.raw_title,"raw-title"));
  if(row.sku_hint){
    const sku=make("p","Codice individuato nelle foto (da verificare): "+row.sku_hint,"sku-hint");
    card.append(sku);
  }
  if(row.source_photo_caption){
    const hint=make("p","Didascalia originale foto: "+row.source_photo_caption,"source-photo-caption");
    card.append(hint);
  }
  if(row.photo_quality_method==="unverified_numbering")
    card.append(make("p","Controllo visivo necessario: numerazione delle foto non affidabile.","sku-hint"));
  else if(row.photo_quality_method==="original_photo_01_02_03")
    card.append(make("p","Foto riordinate secondo le viste originali 01, 02 e 03.","source-photo-caption"));
  const originalUrls=Array.isArray(row.raw_image_urls)?row.raw_image_urls.slice(0,24):[];
  const available=originalUrls.map((url,i)=>validPhoto(url)?i:-1).filter(i=>i>=0);
  const allowed=new Set(available);
  const stored=Array.isArray(row.selected_photo_indices)?row.selected_photo_indices.map(Number):[0,1,2];
  let selected=stored.length===3&&new Set(stored).size===3&&stored.every(i=>allowed.has(i))?stored:[...available].slice(0,3);
  const loaded=new Set();
  const editable=row.status==="needs_review";
  const photos=make("div",undefined,"photos photo-chooser");
  photos.setAttribute("role","group");
  photos.setAttribute("aria-label","Seleziona le tre fotografie da pubblicare");
  const thumbnails=new Map();
  const helper=make("p","", "photo-selection-status");
  const more=make("button","Mostra tutte le fotografie ("+available.length+")","photo-more");
  more.type="button";
  const additional=make("div",undefined,"photos photo-chooser photo-extra");
  additional.hidden=true;
  const form=make("form");
  const nameLabel=make("label","Nome modello verificato");
  const name=make("input");name.type="text";name.required=true;name.maxLength=110;
  name.value=row.proposed_name||[src?.brand,src?.model_label].filter(Boolean).join(" ");
  name.disabled=row.status==="published"||row.status==="publishing";nameLabel.append(name);
  const colorLabel=make("label","Colorazione (facoltativa)");
  const color=make("input");color.type="text";color.maxLength=80;
  color.value=row.proposed_color||"";
  color.placeholder="Scrivi solo una colorazione verificata";
  color.disabled=row.status==="published"||row.status==="publishing";
  colorLabel.append(color);
  const actions=make("div",undefined,"actions");
  const approve=make("button","Approva tre fotografie");
  approve.type="submit";approve.disabled=true;
  const reject=make("button","Scarta","reject");
  reject.type="button";reject.disabled=row.status==="published"||row.status==="publishing";
  const note=make("p","", "status notice");note.setAttribute("role","status");

  function updateSelection(){
    for(const [index,button] of thumbnails){
      const checked=selected.includes(index);
      button.classList.toggle("selected",checked);
      button.setAttribute("aria-pressed",String(checked));
    }
    helper.textContent="Fotografie selezionate: "+
      (selected.length?selected.map(i=>"n. "+(i+1)).join(", "):"nessuna")+
      " · "+selected.length+"/3 (clicca per scegliere)";
    approve.disabled=!editable||selected.length!==3||
      !selected.every(i=>loaded.has(i))||name.value.trim().length<3;
  }
  function insertPhoto(index,target){
    const button=make("button",undefined,"photo-choice");
    button.type="button";
    button.setAttribute("aria-label","Seleziona fotografia "+(index+1));
    const img=make("img");img.alt="Vista "+(index+1)+" non disponibile";
    img.loading="lazy";button.append(img,make("span",String(index+1),"photo-number"));
    thumbnails.set(index,button);
    button.addEventListener("click",()=>{
      if(!editable)return;
      if(selected.includes(index))selected=selected.filter(i=>i!==index);
      else if(selected.length<3)selected=[...selected,index];
      else {note.textContent="Deseleziona prima una delle tre fotografie.";return;}
      note.textContent="";
      updateSelection();
    });
    target.append(button);
    queuePreview(row,index,img,()=>{loaded.add(index);img.alt="Vista "+(index+1);updateSelection();});
  }
  if(available.length){
    available.slice(0,3).forEach(index=>insertPhoto(index,photos));
    if(available.length>3)more.hidden=false;
    else more.hidden=true;
  }else photos.append(make("p","Fotografie non ancora recuperate."));
  more.addEventListener("click",()=>{
    additional.hidden=!additional.hidden;
    more.textContent=additional.hidden?"Mostra tutte le fotografie ("+available.length+")":"Nascondi fotografie aggiuntive";
    if(!additional.hidden&&!additional.dataset.loaded){
      available.slice(3).forEach(index=>insertPhoto(index,additional));
      additional.dataset.loaded="1";
      updateSelection();
    }
  });
  card.append(photos);
  if(available.length>3)card.append(more,additional);
  card.append(helper);
  updateSelection();
  const link=albumLink(row.album_url);
  if(link){
    const a=make("a","Apri album per verifica ↗");
    a.href=link;a.target="_blank";a.rel="noopener noreferrer";
    card.append(a);
  }

  async function save(status){
    if(!manager)return;
    if(status==="approved"&&(selected.length!==3||
      !selected.every(i=>loaded.has(i))||name.value.trim().length<3)){
      note.textContent="Servono tre fotografie effettivamente visibili e il nome modello verificato.";
      return;
    }
    approve.disabled=true;reject.disabled=true;note.textContent="Salvataggio…";
    const update={
      status,selected_photo_indices:status==="approved"?selected:(selected.length===3?selected:stored),
      proposed_name:name.value.trim().slice(0,110)||null,
      proposed_color:color.value.trim().slice(0,80)||null,
      reviewed_by:manager.id,reviewed_at:new Date().toISOString()
    };
    const {error}=await client.from("ohana_v3_album_candidates")
      .update(update).eq("category_id",row.category_id).eq("album_id",row.album_id);
    if(error){
      note.textContent="Aggiornamento non riuscito. Controlla i permessi e riprova.";
      reject.disabled=false;updateSelection();return;
    }
    await load();
  }
  form.addEventListener("submit",event=>{event.preventDefault();save("approved");});
  reject.addEventListener("click",()=>save("rejected"));
  actions.append(approve,reject);
  if(row.status==="approved"){
    const publish=make("button","Importa tre foto e pubblica V3");
    publish.type="button";
    publish.addEventListener("click",async()=>{
      publish.disabled=true;reject.disabled=true;
      note.textContent="Importazione delle tre fotografie approvate…";
      const {data,error}=await client.functions.invoke("ohana-v3-media",{
        body:{category_id:row.category_id,album_id:row.album_id}
      });
      if(error||!data?.published){
        note.textContent="Importazione non riuscita. Le foto devono essere JPEG valide e differenti.";
        publish.disabled=false;reject.disabled=false;return;
      }
      note.textContent="Foto salvate su OHANA; aggiornamento catalogo pubblico programmato.";
      await load();
    });
    actions.append(publish);
  }
  if(row.status==="published"){
    approve.disabled=true;reject.disabled=true;
    note.textContent="Prodotto fotografico già pubblicato nello Storage OHANA.";
  }
  if(row.status==="publishing"){
    approve.disabled=true;reject.disabled=true;
    note.textContent="Importazione in corso; se bloccata occorre verificare il processo.";
  }
  form.append(nameLabel,colorLabel,actions,note);
  card.append(form);
  return card;
}
async function load(){
  clearPreviews();
  setStatus("");$("cards").replaceChildren(make("p","Caricamento album…"));
  const status=$("status").value,brand=$("brand").value,model=$("model").value;
  const photoQuality=$("photoQuality").value;
  let query=client.from("ohana_v3_album_candidates")
    .select("category_id,album_id,album_url,raw_title,source_photo_caption,sku_hint,raw_image_urls,selected_photo_indices,photo_quality_method,photo_quality_checked_at,status,proposed_name,proposed_color",{count:"exact"})
    .eq("status",status).order("updated_at",{ascending:false}).range(page*pageSize,(page+1)*pageSize-1);
  if(photoQuality==="pending")query=query.is("photo_quality_checked_at",null);
  else if(photoQuality)query=query.eq("photo_quality_method",photoQuality);
  if(model)query=query.eq("category_id",model);
  else if(brand){
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
function refreshModels(){
  const brand=$("brand").value,control=$("model");
  control.replaceChildren(make("option","Tutti i modelli"));
  control.firstChild.value="";
  const rows=sources.filter(s=>!brand||s.brand===brand);
  rows.sort((a,b)=>a.brand.localeCompare(b.brand,"it")||a.model_label.localeCompare(b.model_label,"it"));
  for(const item of rows){
    const option=make("option",item.brand+" · "+item.model_label);
    option.value=item.category_id;control.append(option);
  }
}
$("brand").addEventListener("change",()=>{page=0;refreshModels();load();});
$("model").addEventListener("change",()=>{page=0;load();});
$("status").addEventListener("change",()=>{page=0;load();});
$("photoQuality").addEventListener("change",()=>{page=0;load();});
$("reload").addEventListener("click",()=>load());
$("prev").addEventListener("click",()=>{if(page>0){page--;load();}});
$("next").addEventListener("click",()=>{if((page+1)*pageSize<count){page++;load();}});
client.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){manager=null;requireAuth();}});
authenticate().catch(()=>{setStatus("Errore temporaneo. Riprova.");requireAuth();});