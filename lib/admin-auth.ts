import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
const COOKIE="thelist_admin_session";
const secret=()=>process.env.ADMIN_SESSION_SECRET || "";
export function accounts(){return [1,2].map(i=>({email:(process.env[`ADMIN_${i}_EMAIL`]||"").trim().toLowerCase(),password:process.env[`ADMIN_${i}_PASSWORD`]||""})).filter(x=>x.email&&x.password);}
function sign(value:string){return createHmac("sha256",secret()).update(value).digest("hex")}
export function safeEqual(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
export function createSession(email:string){const payload=Buffer.from(JSON.stringify({email,expires:Date.now()+12*60*60*1000})).toString("base64url");return `${payload}.${sign(payload)}`;}
export function sessionEmail(req:NextRequest):string|null{
  if(!secret()||secret().length<32)return null;
  const raw=req.cookies.get(COOKIE)?.value||"";const [payload,signature,...extra]=raw.split(".");
  if(!payload||!signature||extra.length||!safeEqual(sign(payload),signature))return null;
  try{const value=JSON.parse(Buffer.from(payload,"base64url").toString());if(typeof value.expires!=="number"||value.expires<Date.now())return null;return accounts().some(x=>x.email===value.email)?value.email:null}catch{return null}
}
export const cookieName=COOKIE;
