import {NextRequest,NextResponse} from 'next/server';
import {sessionEmail} from '@/lib/admin-auth';
import {hotelQr} from '@/lib/qr-service';
export const runtime='nodejs';
export async function GET(req:NextRequest){
  if(!sessionEmail(req)) return NextResponse.json({error:'Sign in first.'},{status:401});
  const id=req.nextUrl.searchParams.get('hotelId')||'';
  if(!id) return NextResponse.json({error:'Missing hotel.'},{status:400});
  try{
    const qr=await hotelQr(id);
    if(!qr) return NextResponse.json({error:'Hotel is not published in shared storage. Save to shared first.'},{status:404});
    return new NextResponse(new Uint8Array(qr.png),{headers:{'Content-Type':'image/png','Content-Disposition':`attachment; filename="the-list-${id.replace(/[^a-z0-9-]/gi,'')}-qr.png"`,'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'Could not generate QR code.'},{status:500});}
}
