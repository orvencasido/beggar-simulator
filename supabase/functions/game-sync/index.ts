/* eslint-disable import/no-unresolved -- Deno resolves the pinned npm specifier. */
// Supabase Edge uses the same pure engine modules as the app; no duplicated economic formulas.
// @ts-ignore Deno resolves pinned npm specifiers at deployment.
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { createGameSyncHandler } from './handler.ts';
declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
const url=Deno.env.get('SUPABASE_URL');const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!url||!key)throw new Error('Missing server configuration');
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createGameSyncHandler({
 async authenticate(token){const {data,error}=await admin.auth.getUser(token);return error?null:data.user?.id??null;},
 async rpc(name,args){const {data,error}=await admin.rpc(name,args);if(error)throw new Error(error.message);return data;},
}));
