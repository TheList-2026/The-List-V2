import {NextRequest,NextResponse} from 'next/server';
import {sessionEmail} from '@/lib/admin-auth';
import {hotelQr} from '@/lib/qr-service';
export const runtime='nodejs';
export async function POST(req:NextRequest){
  if(!sessionEmail(req))return NextResponse.json({error:'Sign in first.'},{status:401});
  if(!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)return NextResponse.json({error:'Email is not connected yet. Add RESEND_API_KEY and a verified RESEND_FROM_EMAIL in Vercel. You can download the QR now.'},{status:503});
  try{
    const body=await req.json();
    if(typeof body.hotelId!=='string')return NextResponse.json({error:'Invalid hotel.'},{status:400});
    const qr=await hotelQr(body.hotelId);
    if(!qr)return NextResponse.json({error:'Save and publish this hotel before sending its QR.'},{status:404});
    const recipients=['Ben@thelist.studio','Projects@thelist.studio'];
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:recipients,subject:`The List — ${qr.hotel.name} QR code`,text:`The List hotel access\n\nHotel: ${qr.hotel.name}\nLink: ${qr.url}\n\nThe scannable QR code is attached. Please test it before printing.`,attachments:[{filename:`the-list-${qr.hotel.id}-qr.png`,content:qr.png.toString('base64')}]})});
    if(!response.ok){return NextResponse.json({error:`Email service rejected the request (${response.status}). Check your verified sender and API key.`},{status:502});}
    return NextResponse.json({ok:true,recipients});
  }catch{return NextResponse.json({error:'Could not send QR email.'},{status:500});}
}
