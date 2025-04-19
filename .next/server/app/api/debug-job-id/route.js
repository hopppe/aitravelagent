"use strict";(()=>{var e={};e.id=826,e.ids=[826],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8893:e=>{e.exports=require("buffer")},4770:e=>{e.exports=require("crypto")},7702:e=>{e.exports=require("events")},2048:e=>{e.exports=require("fs")},2615:e=>{e.exports=require("http")},8791:e=>{e.exports=require("https")},8216:e=>{e.exports=require("net")},5315:e=>{e.exports=require("path")},8621:e=>{e.exports=require("punycode")},6162:e=>{e.exports=require("stream")},2452:e=>{e.exports=require("tls")},7360:e=>{e.exports=require("url")},1568:e=>{e.exports=require("zlib")},9151:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>l,patchFetch:()=>g,requestAsyncStorage:()=>m,routeModule:()=>h,serverHooks:()=>b,staticGenerationAsyncStorage:()=>c});var s={};r.r(s),r.d(s,{GET:()=>d});var a=r(9303),o=r(8716),i=r(3131),n=r(7070),u=r(5662);let p=Function("id",`
  // If the ID is already numeric, return it as is
  if (!isNaN(Number(id))) {
    return Number(id);
  }
  
  // For job IDs that start with a timestamp (job_ or debug_), extract the timestamp
  // This ensures consistent ID generation across environments
  const timestampMatch = id.match(/^(job|debug|test)_(\\d+)/);
  if (timestampMatch && !isNaN(Number(timestampMatch[2]))) {
    // Use the timestamp portion as the numeric ID
    return Number(timestampMatch[2]);
  }

  // For any other IDs, use a hash function to generate a numeric ID
  let hash = 0;
  const prime = 31; // Use a prime number for better distribution
  
  for (let i = 0; i < id.length; i++) {
    // Get the character code
    const char = id.charCodeAt(i);
    // Multiply the current hash by the prime and add the character code
    hash = Math.imul(hash, prime) + char | 0;
  }
  
  // Ensure positive number by using absolute value
  return Math.abs(hash);
  `);async function d(e){let{searchParams:t}=new URL(e.url),r=t.get("jobId");if(!r)return n.NextResponse.json({error:"jobId parameter is required"},{status:400});let s=p(r),a={found:!1,data:null,error:null};try{let{data:e,error:t}=await u.OQ.from("jobs").select("*").eq("id",s).maybeSingle();a={found:!!e,data:e,error:t?{code:t.code,message:t.message}:null}}catch(e){a.error={message:e.message}}return n.NextResponse.json({originalJobId:r,dbCompatibleId:s,dbResult:a,explanation:`
      This endpoint shows how job IDs are converted for database storage.
      For jobs with the format "job_1234567890", the numeric part is extracted.
      For other formats, a hash is generated.
    `})}let h=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/debug-job-id/route",pathname:"/api/debug-job-id",filename:"route",bundlePath:"app/api/debug-job-id/route"},resolvedPagePath:"/Users/ethanhoppe/Desktop/AItravelagent/app/api/debug-job-id/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:m,staticGenerationAsyncStorage:c,serverHooks:b}=h,l="/api/debug-job-id/route";function g(){return(0,i.patchFetch)({serverHooks:b,staticGenerationAsyncStorage:c})}}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[276,972,518,662],()=>r(9151));module.exports=s})();