import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import Client from '../client';
import {environment} from '../../server/environment.mjs';
import {pageSession} from '../../server/api.mjs';
export const dynamic='force-dynamic';
export async function generateMetadata({params}){const{path=[]}=await params;const privatePage=['admin','checkout','confirmation','track'].includes(path[0]);return{robots:privatePage?{index:false,follow:false}:{index:true,follow:true}}}
export default async function Page({params}){const{path=[]}=await params;if(path[0]==='admin'&&path.length>1){const h=await headers();let s;try{s=await pageSession(new Request('http://internal/admin',{headers:{cookie:h.get('cookie')||''}}),await environment())}catch{redirect('/admin')}if(!s)redirect('/admin');if(s.must_change&&path[1]!=='change-password')redirect('/admin/change-password');}return <Client/>}
