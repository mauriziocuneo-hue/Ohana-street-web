/* Testi generici per configurare WhatsApp Business nell'app del gestore. */
(function(root){
  'use strict';
  const catalog='https://mauriziocuneo-hue.github.io/Ohana-street-web/catalogo-nuovo.html';
  const automatic=[
    {title:'Messaggio di benvenuto',text:'Aloha! 👋 Benvenuto in OHANA STREET. Per aiutarti, inviaci il codice della scarpa (oppure il link alla scheda), la taglia e il colore desiderato. Un gestore verificherà i dettagli e ti risponderà qui su WhatsApp. ✿'},
    {title:'Messaggio di assenza',text:'Aloha! 👋 Grazie per aver scritto a OHANA STREET. Al momento non riusciamo a risponderti. Lasciaci codice o link della scarpa, taglia, colore e domanda: riprenderemo la richiesta appena possibile. ✿'}
  ];
  const replies=[
    {shortcut:'/catalogo',title:'Catalogo',text:'Aloha! ✿ Qui trovi il catalogo OHANA STREET: '+catalog+'\nApri la scarpa che ti interessa e prepara la richiesta: riceveremo codice, taglia, colore e domanda.'},
    {shortcut:'/taglie',title:'Taglie e vestibilità',text:'Le taglie indicate nel catalogo vanno dalla 36 alla 46; altre taglie e mezze misure si verificano su richiesta. Inviaci codice della scarpa e taglia desiderata: ti confermiamo disponibilità e informazioni sulla vestibilità qui in chat.'},
    {shortcut:'/colori',title:'Colori',text:'Le fotografie mostrano le colorazioni presenti nel nostro catalogo. Per verificare il colore che cerchi, inviaci il codice della scarpa e il colore desiderato. Ti confermiamo i dettagli qui in chat.'},
    {shortcut:'/verifica',title:'Richiesta in verifica',text:'Grazie! Abbiamo preso in carico la tua richiesta e stiamo verificando i dettagli della scarpa, della taglia e del colore indicati. Ti aggiorniamo qui su WhatsApp. ✿'},
    {shortcut:'/dettagli',title:'Dati mancanti',text:'Per completare la tua richiesta, puoi indicarci questi dati?\nCodice OHANA o link alla scheda:\nTaglia desiderata:\nColore desiderato:\nLa tua domanda:'},
    {shortcut:'/prezzi',title:'Informazioni sul prezzo',text:'Per confermarti il prezzo, indicaci il codice della scarpa, la taglia e il colore desiderato. Verifichiamo la richiesta e ti comunichiamo qui in chat tutti i dettagli.'},
    {shortcut:'/spedizione',title:'Informazioni sulla spedizione',text:'Per verificare modalità e tempi di spedizione, indicaci il comune di destinazione e il codice della scarpa che ti interessa. Ti confermiamo i dettagli qui in chat.'}
  ];
  const labels=[['Nuova richiesta','Da leggere e assegnare a un gestore.'],['In verifica','Il gestore sta verificando i dettagli.'],['In attesa cliente','Mancano taglia, colore o una risposta del cliente.'],['Risposto','La risposta è stata inviata al cliente.'],['Chiusa','La richiesta è conclusa.']];
  const api={automatic,replies,labels};if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(!root?.document)return;
  function init(){
    const host=document.querySelector('#businessToolkitContent');if(!host)return;
    const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
    if(location.hash==='#businessToolkit')document.querySelector('#businessToolkit').open=true;
    host.replaceChildren();host.append(make('p','','I testi sono pronti da copiare. Attivali nell’app WhatsApp Business sul telefono: questo pannello non modifica le impostazioni dell’app e non invia messaggi.'));
    const steps=make('ol','business-steps');
    for(const text of ['Apri WhatsApp Business e vai negli Strumenti attività (o nella scheda Strumenti).','In Messaggio di benvenuto e Messaggio di assenza incolla i testi qui sotto. Scegli destinatari e orari coerenti con la tua attività.','In Risposte rapide aggiungi il testo e la scorciatoia indicati. Nella chat puoi richiamarli digitando “/”.','Crea le etichette suggerite e applicale alle conversazioni. Concordate tra gestori chi prende in carico ogni richiesta.'])steps.append(make('li','',text));host.append(steps);
    const status=make('p','business-status');status.setAttribute('role','status');host.append(status);
    function cards(title,items){
      host.append(make('h3','',title));const grid=make('div','business-grid');
      for(const item of items){
        const card=make('article','business-card');card.append(make('h4','',(item.shortcut?item.shortcut+' · ':'')+item.title));
        const area=make('textarea');area.value=item.text;area.readOnly=true;area.rows=5;area.setAttribute('aria-label',item.title);
        const button=make('button','secondary','Copia testo');button.type='button';button.setAttribute('aria-label','Copia '+item.title);
        button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(item.text);status.textContent='Copiato: '+item.title+'. Incollalo in WhatsApp Business.';}catch{area.focus();area.select();status.textContent='Testo selezionato: usa Copia, poi incollalo in WhatsApp Business.';}});
        card.append(area,button);grid.append(card);
      }host.append(grid);
    }
    cards('Messaggi automatici da attivare nell’app',automatic);cards('Risposte rapide da salvare nell’app',replies);
    host.append(make('h3','','Etichette per seguire le richieste'));const list=make('dl','business-labels');for(const [name,description]of labels){list.append(make('dt','',name),make('dd','',description));}host.append(list);
    const sources=make('p','muted','Guide ufficiali: ');
    for(const [title,url]of [['Risposte rapide','https://faq.whatsapp.com/1791149784551042'],['Messaggio di benvenuto','https://faq.whatsapp.com/501866148528310'],['Etichette','https://faq.whatsapp.com/3398508707096369']]){const a=make('a','',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';sources.append(a,document.createTextNode(' · '));}host.append(sources);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof window==='undefined'?null:window);
