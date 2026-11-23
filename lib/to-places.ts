import type {Place} from '@/lib/places'
import type {Hotel} from '@/lib/get-hotels'
export function toPlaces(hotel:Hotel):Place[]{return hotel.listings.filter(x=>x.published!==false).map((x,i)=>({id:x.id||String(i),name:x.name,category:x.category||'Curated destination',location:hotel.location||'Marbella',description:x.description||'',showText:x.showText??true,image:x.image||'/images/title.webp',website:x.booking||'',phone:x.phone||'',address:`${x.name}, ${hotel.location}`,directions:x.directions||''}))}
