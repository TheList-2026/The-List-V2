import {notFound} from 'next/navigation'
import {SwipeFeed} from '@/components/feed/swipe-feed'
import {getHotels} from '@/lib/get-hotels'
import {toPlaces} from '@/lib/to-places'
export const dynamic='force-dynamic'
export default async function HotelPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const hotels=await getHotels();const hotel=hotels.find(h=>h.id===slug||slug==='maui-demo'&&h.id==='puente-romano-marbella');if(!hotel)notFound();return <main className="h-dvh w-full overflow-hidden bg-ink"><SwipeFeed places={toPlaces(hotel)}/></main>}
