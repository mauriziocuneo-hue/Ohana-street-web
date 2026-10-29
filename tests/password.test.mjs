import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makePasswordService,validatePassword,recoveryCode,RECOVERY_URL,GENERIC_RESET} from '../gestione/password-core.mjs';
const secret='Una frase lunga 123!';
function fixture(options={}){
 const calls=[];
 function client(kind){return {from(table){assert.equal(table,'ohana_managers');return {select(){return this;},eq(k,id){assert.equal(k,'user_id');assert.equal(id,'manager');return this;},async maybeSingle(){return {data:options.member===false?null:{user_id:'manager'},error:null};}};},auth:{
 async getUser(){calls.push([kind,'user']);return {data:{user:options.noUser?null:{id:'manager',email:'demo@example.invalid'}},error:null};},
 async signInWithPassword(value){calls.push([kind,'reauth']);assert.equal(value.password,'attuale');return {data:{user:{id:options.other?'other':'manager'}},error:options.wrong?{}:null};},
 async updateUser(value){calls.push([kind,'update',value]);return {error:options.updateError?{}:null};},
 async signOut(value){calls.push([kind,'out',value.scope]);return {error:options.revokeError&&value.scope==='global'?{}:null};},
 async resetPasswordForEmail(email,value){calls.push([kind,'reset',email,value]);if(options.resetError)throw Error('server detail');return {error:null};},
 async exchangeCodeForSession(code){calls.push([kind,'exchange',code]);return {data:{session:options.expired?null:{}},error:null};}
 }};}
 let now=100000;const service=makePasswordService({client:client('normal'),makeEphemeral:()=>client('fresh'),makeRecovery:()=>client('recovery'),clock:()=>now});
 return {service,calls,advance(){now+=60000;}};
}
test('password: lunghezza, conferma e riuso senza tagliare gli spazi',()=>{
 for(const args of [['short','short'],[secret,'diversa'],[secret,secret,secret],['a'.repeat(129),'a'.repeat(129)]])assert.throws(()=>validatePassword(...args));
 assert.doesNotThrow(()=>validatePassword('  una frase lunga  ','  una frase lunga  '));
});
test('callback: rifiuta frammenti, errori, codici duplicati e mancanti',()=>{
 for(const suffix of ['', '?code=short','?code=abcdefghijk&code=abcdefghijk','?code=abcdefghijk#error','?code=abcdefghijk&error=denied'])assert.equal(recoveryCode(RECOVERY_URL+suffix),null);
 assert.equal(recoveryCode(RECOVERY_URL+'?code=abcdefghijk'),'abcdefghijk');
});
test('cambio: nuova autenticazione, controllo gestore, password attuale al server e revoca',async()=>{
 const f=fixture();assert.deepEqual(await f.service.change('attuale',secret,secret),{updated:true,sessionsRevoked:true});
 assert.deepEqual(f.calls.find(x=>x[1]==='update'),['fresh','update',{password:secret,current_password:'attuale'}]);
 assert(f.calls.findIndex(x=>x[1]==='reauth')<f.calls.findIndex(x=>x[1]==='update'));
 assert(f.calls.some(x=>x[0]==='fresh'&&x[2]==='global'));
 assert(f.calls.some(x=>x[0]==='normal'&&x[2]==='local'));
});
for(const options of [{wrong:true},{other:true},{member:false},{noUser:true}])test('cambio negato prima di update: '+JSON.stringify(options),async()=>{
 const f=fixture(options);await assert.rejects(f.service.change('attuale',secret,secret));assert(!f.calls.some(x=>x[1]==='update'));
});
test('errore di aggiornamento non dichiara successo; revoca fallita viene distinta',async()=>{
 const f=fixture({updateError:true});await assert.rejects(f.service.change('attuale',secret,secret));
 assert(!f.calls.some(x=>x[2]==='global'));
 assert.deepEqual(await fixture({revokeError:true}).service.change('attuale',secret,secret),{updated:true,sessionsRevoked:false});
});
test('recupero: risposta generica, destinazione fissa e limite richieste',async()=>{
 for(const resetError of [false,true]){const f=fixture({resetError});assert.equal(await f.service.requestReset('demo@example.invalid'),GENERIC_RESET);
 assert.equal(f.calls[0][3].redirectTo,RECOVERY_URL);await assert.rejects(f.service.requestReset('demo@example.invalid'),/minuto/);f.advance();assert.equal(await f.service.requestReset('demo@example.invalid'),GENERIC_RESET);}
 await assert.rejects(fixture().service.requestReset('invalid'));
});
test('recupero non usa una normale sessione già aperta',async()=>{
 const f=fixture();await assert.rejects(f.service.finishRecovery(secret,secret));assert(!f.calls.some(x=>x[1]==='update'));
});
for(const options of [{expired:true},{member:false},{noUser:true}])test('recupero rifiutato e sessione eliminata: '+JSON.stringify(options),async()=>{
 const f=fixture(options);await assert.rejects(f.service.openRecovery('abcdefghijk'));await assert.rejects(f.service.finishRecovery(secret,secret));assert(!f.calls.some(x=>x[1]==='update'));assert(f.calls.some(x=>x[0]==='recovery'&&x[2]==='local'));
});
test('recupero completo, conferma obbligatoria e singolo utilizzo',async()=>{
 const f=fixture();await f.service.openRecovery('abcdefghijk');await assert.rejects(f.service.finishRecovery(secret,'diversa'));
 assert.deepEqual(await f.service.finishRecovery(secret,secret),{updated:true,sessionsRevoked:true});
 await assert.rejects(f.service.finishRecovery(secret,secret));assert.equal(f.calls.filter(x=>x[1]==='update').length,1);
});
test('pagina callback: nessun referrer, form nascosto e rimozione codice prima del SDK',()=>{
 const html=readFileSync(new URL('../gestione/password.html',import.meta.url),'utf8');const js=readFileSync(new URL('../gestione/password-page.mjs',import.meta.url),'utf8');
 assert.match(html,/no-referrer/);assert.match(html,/id="recoveryForm"[^>]*hidden/);assert.match(html,/Content-Security-Policy/);
 assert(js.indexOf('history.replaceState')<js.indexOf("await import("));assert.match(js,/@2\.118\.0/);
});
