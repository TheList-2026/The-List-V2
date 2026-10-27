import {NextRequest,NextResponse} from "next/server";
import {sessionEmail} from "@/lib/admin-auth";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 if(!sessionEmail(req))return NextResponse.json({error:"Unauthorized"},{status:401});
 const token=process.env.GITHUB_HOTELS_TOKEN;
 if(!token)return NextResponse.json({activity:[]});
 try{const r=await fetch("https://api.github.com/repos/TheList-2026/The-List-V2/commits?path=data%2Fshared-hotels.json&per_page=15",{headers:{Authorization:`Bearer ${token}`,Accept:"application/vnd.github+json"},cache:"no-store"});
 if(!r.ok)throw new Error(`GitHub returned ${r.status}`);
 const commits=await r.json();return NextResponse.json({activity:commits.map((x:{commit:{message:string;author:{name:string;date:string}}})=>({author:x.commit.message.startsWith("Admin update by ")?x.commit.message.slice(16):x.commit.author.name,date:x.commit.author.date,message:x.commit.message}))},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to read activity"},{status:502})}
}
