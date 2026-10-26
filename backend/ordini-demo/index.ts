import {makeHandler} from './handler.mjs';
import products from './product-ids.json' with {type:'json'};
Deno.serve(makeHandler({dbUrl:Deno.env.get('SUPABASE_URL')!,serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,products}));
