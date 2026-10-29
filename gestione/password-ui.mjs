import {makePasswordService,RECOVERY_STORAGE} from './password-core.mjs';
export function mountPasswordTools({client,createClient,config,onChanged=()=>{}}){
 const makeEphemeral=()=>createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'ohana-password-reauth-memory'}});
 const makeRecovery=()=>createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storageKey:RECOVERY_STORAGE}});
 const service=makePasswordService({client,makeEphemeral,makeRecovery});const $=id=>document.getElementById(id);let busy=false;
 async function run(form,status,action){if(busy)return;busy=true;const submit=form.querySelector('button[type="submit"]');submit.disabled=true;status.textContent='Verifica in corso…';try{await action();}catch(e){status.textContent=e.message;}finally{for(const n of form.querySelectorAll('input[type="password"]'))n.value='';submit.disabled=false;busy=false;}}
 $('forgotForm').addEventListener('submit',event=>{event.preventDefault();run($('forgotForm'),$('forgotStatus'),async()=>{$('forgotStatus').textContent=await service.requestReset($('forgotEmail').value);});});
 $('passwordChangeForm').addEventListener('submit',event=>{event.preventDefault();run($('passwordChangeForm'),$('passwordChangeStatus'),async()=>{const result=await service.change($('currentPassword').value,$('newPassword').value,$('confirmPassword').value);$('passwordChangeForm').reset();onChanged(result.sessionsRevoked?'Password aggiornata. Accedi con la nuova password. Le sessioni sono state revocate; i token già emessi restano validi fino alla scadenza.':'Password aggiornata. Accedi di nuovo. Non è stato possibile confermare la revoca di tutte le sessioni.');});});
 const subscription=client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){service.dispose();$('passwordChangeForm').reset();$('passwordChangeStatus').textContent='';}}).data?.subscription;
 return ()=>{service.dispose();subscription?.unsubscribe();$('passwordChangeForm').reset();};
}
