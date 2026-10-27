import { NextRequest, NextResponse } from "next/server";
import {accounts,createSession,sessionEmail,safeEqual,cookieName} from "@/lib/admin-auth";
export const runtime="nodejs";
export async function GET(req:NextRequest){const email=sessionEmail(req);return NextResponse.json({authenticated:!!email,email},{headers:{"Cache-Control":"no-store"}})}
export async function POST(req:NextRequest){
  const {email,password}=await req.json().catch(()=>({email:"",password:""}));
  const configured=accounts();if(!configured.length||(process.env.ADMIN_SESSION_SECRET||"").length<32)return NextResponse.json({error:"Admin login is not configured in Vercel."},{status:503});
  const found=configured.find(x=>x.email===String(email||"").trim().toLowerCase());
  if(!found||!safeEqual(found.password,String(password||"")))return NextResponse.json({error:"Invalid email or password."},{status:401});
  const response=NextResponse.json({authenticated:true,email:found.email});
  response.cookies.set(cookieName,createSession(found.email),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:43200});return response;
}
export async function DELETE(){const r=NextResponse.json({ok:true});r.cookies.set(cookieName,"",{path:"/",maxAge:0});return r}
