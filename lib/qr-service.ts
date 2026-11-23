
import QRCode from 'qrcode';
import { getHotels } from '@/lib/get-hotels';

export async function hotelQr(hotelId: string) {
  const hotels = await getHotels();

  const hotel = hotels.find(
    h => h.id === hotelId && h.published === true
  );

  if (!hotel) return null;

  // Printed QR codes always point to the permanent public hotel address,
  // including when generated from an admin preview deployment.
  const url = `https://thelist.studio/hotel/${encodeURIComponent(hotel.id)}`;

  const png = await QRCode.toBuffer(url, {
    type: 'png',
    width: 1200,
    margin: 3,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#24201c',
      light: '#fffdf7',
    },
  });

  return { hotel, url, png };
}
