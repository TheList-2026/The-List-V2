
import seed from '@/data/seed-hotels.json';

export type Listing = {
  id: string;
  name: string;
  description?: string;
  published?: boolean;
  showText?: boolean;
  artworkHasName?: boolean;
  category: string;
  image: string;
  phone: string;
  booking: string;
  directions: string;
};

export type Hotel = {
  id: string;
  name: string;
  location: string;
  listings: Listing[];
  mode?: "demo" | "live";
  published?: boolean;
};

export async function getHotels(): Promise<Hotel[]> {
  const token = process.env.GITHUB_HOTELS_TOKEN;

  if (!token) return seed.hotels as Hotel[];

  // Preview reads test hotels; production reads live hotels.
  const branch =
    process.env.VERCEL_ENV === 'preview'
      ? 'admin-v3-test'
      : 'main';

  try {
    const url =
      `https://api.github.com/repos/TheList-2026/The-List-V2/contents/data/shared-hotels.json?ref=${encodeURIComponent(branch)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`);
    }

    const file = await response.json();

    let raw = '';

    if (file.content) {
      raw = Buffer.from(
        file.content.replace(/\s/g, ''),
        'base64'
      ).toString('utf8');
    } else if (file.download_url) {
      const download = await fetch(file.download_url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!download.ok) {
        throw new Error('Could not download hotel data');
      }

      raw = await download.text();
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.hotels)) {
      throw new Error('Invalid hotel data');
    }

    return parsed.hotels as Hotel[];
  } catch (error) {
    console.error('Unable to load shared hotels:', error);
    throw new Error('Live hotel data is temporarily unavailable.');
  }
}
