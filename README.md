# THE LIST — V2 cinematic rebuild

This project preserves the original V0 visual language: Cormorant/Manrope, champagne/ivory/ink, full-screen scroll snapping, 6-second photo motion, animated copy and glass action bar. The homepage is a V0-style intro with the original V1-inspired three-field Work With Us modal. The hotel demo uses the uploaded Marbella artwork and seed business details. The Admin is adapted from the original V1 admin.

## Deploy (separate V2 only)

1. Upload the **contents** of this folder into `TheList-2026/The-List-V2`, preserving directories. Do not replace the original `The-List` repository.
2. Import `The-List-V2` into a **new** Vercel project. Framework: Next.js, root: `./`.
3. `npm install && npm run build` to test locally.
4. Open `/` for the homepage, `/hotel/puente-romano-marbella` for the demo, `/admin` for management.

## IMPORTANT: admin / live storage

Without environment variables, the demo loads `data/seed-hotels.json`. Admin can manage drafts locally and import CSV/images, but online saving needs **both** `GITHUB_HOTELS_TOKEN` (a fine-grained GitHub token with contents write access **only to the V2 repo**) and `ADMIN_WRITE_KEY` (a private, long random password). The V2 API targets `TheList-2026/The-List-V2`, branch `main`, file `data/shared-hotels.json` and will **not** write to V1. Set these environment variables in the **V2** Vercel project only. To save, enter the ADMIN_WRITE_KEY when prompted. Admin's legacy email allow-list is only a convenience UI, **not authentication**; keep the Admin private and add real server-side access control before external use.

`NEXT_PUBLIC_ENQUIRY_EMAIL`: set to your actual enquiries inbox. Until set, the modal opens a mail draft addressed to `hello@example.com` (placeholder), not a working backend. This is a mailto form and cannot guarantee delivery.

The Admin enforces 5MB JPG/PNG/WebP inputs and outputs exact 1080×1920 JPEG with non-distorting blur-fill. The original supplied Marbella images are preserved; new admin uploads are processed automatically. V2 live image data is stored as base64 in shared JSON; the 18MB pilot limit still applies.

The public guest page reads V2 shared data directly on the server. The V0 design is kept for the demo. Artwork names and business details are from the supplied files; descriptions in the seed are from the earlier project.
