'use client';
import dynamic from 'next/dynamic';
const Storefront=dynamic(()=>import('../src/main'),{ssr:false,loading:()=> <div className="loading" role="status">Loading BEL…</div>});
export default function Client(){return <Storefront/>}
