/* eslint-disable import/no-unresolved -- Deno resolves the pinned npm specifier. */
// @ts-ignore Deno resolves the pinned npm specifier.
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {createPublishHandler} from './handler.ts';
declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
const configuredSecrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}') as Record<string,string>;
const url=Deno.env.get('SUPABASE_URL'),legacySecret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const secret=configuredSecrets.default??legacySecret;if(!url||!secret)throw new Error('Missing server configuration');
const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createPublishHandler({secret,additionalSecrets:[...Object.values(configuredSecrets),...(legacySecret?[legacySecret]:[])],async publish(catalog,digest,activate){const {data,error}=await admin.rpc('publish_game_catalog',{catalog,catalog_digest:digest,activate});if(error)throw new Error(error.message);return data;}}));
