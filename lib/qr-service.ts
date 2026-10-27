import QRCode from 'qrcode';
import {getHotels} from '@/lib/get-hotels';

export async function hotelQr(hotelId:string){
  const hotels=await getHotels();
  const hotel=hotels.find(h=>h.id===hotelId && h.published===true);
  if(!hotel) return null;
  const base=process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://thelistv2.vercel.app');
  const url=`${base.replace(/\/$/,'')}/hotel/${encodeURIComponent(hotel.id)}`;
  const png=await QRCode.toBuffer(url,{type:'png',width:1200,margin:3,errorCorrectionLevel:'H',color:{dark:'#24201c',light:'#fffdf7'}});
  return {hotel,url,png};
}
