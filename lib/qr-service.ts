
import QRCode from 'qrcode';
import { getHotels } from '@/lib/get-hotels';

export async function hotelQr(hotelId: string) {
  const hotels = await getHotels();

  const hotel = hotels.find(
    h => h.id === hotelId && h.published === true
  );

  if (!hotel) return null;

  let base: string;

  if (process.env.VERCEL_ENV === 'preview') {
    // Use the URL of this specific Preview deployment.
    const previewHost =
      process.env.VERCEL_URL ||
      process.env.VERCEL_BRANCH_URL;

    if (!previewHost) {
      throw new Error('Preview deployment URL is missing.');
    }

    base = `https://${previewHost}`;
  } else {
    // Final public website once we launch.
    base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://www.thelist.studio';
  }

  const url =
    `${base.replace(/\/$/, '')}/hotel/${encodeURIComponent(hotel.id)}`;

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
