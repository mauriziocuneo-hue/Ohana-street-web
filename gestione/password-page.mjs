import {recoveryCode,makePasswordService,RECOVERY_STORAGE} from './password-core.mjs';
const code=recoveryCode(location.href);history.replaceState(null,'',location.pathname);
const status=document.getElementById('recoveryStatus'),form=document.getElementById('recoveryForm');
try{
 if(!code)throw Error('Collegamento assente, scaduto o non valido. Richiedine uno nuovo dalla pagina di accesso.');
 const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.118.0');const cfg=window.OHANA_CONFIG;
 const client=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{detectSessionInUrl:false}});
 const recoveryClient=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{flowType:'pkce',storageKey:RECOVERY_STORAGE,persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
 const service=makePasswordService({client,makeRecovery:()=>recoveryClient});
 await service.openRecovery(code);form.hidden=false;status.textContent='Collegamento verificato. Scegli una nuova password da 12 a 128 caratteri.';
 let busy=false;form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;busy=true;const button=form.querySelector('button');button.disabled=true;try{const result=await service.finishRecovery(document.getElementById('recoveryPassword').value,document.getElementById('recoveryConfirm').value);form.hidden=true;status.textContent=result.sessionsRevoked?'Password aggiornata. Torna all’accesso e usa la nuova password. Le sessioni sono state revocate; i token già emessi restano validi fino alla scadenza.':'Password aggiornata. Torna all’accesso. Non è stato possibile confermare la revoca di tutte le sessioni.';}catch(e){status.textContent=e.message;}finally{form.reset();button.disabled=false;busy=false;}});
}catch(e){form.hidden=true;status.textContent=e.message;}
