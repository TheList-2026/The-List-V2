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


## Partner Admin (2026 update)

Add the following Vercel environment variables **only to the V2 project**, for Production, Preview and Development as needed:

- `GITHUB_HOTELS_TOKEN` — fine-grained GitHub token scoped to `TheList-2026/The-List-V2`, Contents: Read and write.
- `ADMIN_SESSION_SECRET` — a unique random secret of at least 32 characters (recommend 64).
- `ADMIN_1_EMAIL` and `ADMIN_1_PASSWORD` — first administrator credentials.
- `ADMIN_2_EMAIL` and `ADMIN_2_PASSWORD` — second administrator credentials. Use different strong passwords.

Never use a real token or password in code, a GitHub commit or the chat. Redeploy after adding environment variables. `/admin` uses separate signed, HTTP-only session cookies (12 hours). Public homepage links discreetly to `/admin`; remove that link whenever desired. The GitHub contents API is used for shared data with SHA conflict protection. Recent commits to `data/shared-hotels.json` are displayed in Admin as an audit trail. Reload shared data to see your partner's saved work; this is not real-time collaborative editing.

For a hotel, import CSV first (see `marbella-admin-import.csv`), then upload a ZIP of artwork whose filenames match the CSV's `Artwork Filename` column. The client checks file type, max 5 MB per image, dimensions (1080x1920), ZIP max 35 MB and 100 files, and lists warnings. Accepted images of other dimensions are resized to 1080x1920 using contain + blurred background without stretching when you click Apply CSV. Review before Save to Shared. Shared images are currently stored inline in JSON, capped at 18 MB: for larger hotel collections migrate to dedicated object storage.

Security limitations: login has no persistent rate limiting or password-reset flow; enable Vercel WAF/rate limiting or an identity provider before broad external exposure. Individual account passwords are stored in Vercel environment settings, not in source code. GitHub commits provide a basic publishing log, not a comprehensive record of local drafts or per-field changes.

## Demo gallery and QR publishing (October 2026)

- Homepage button goes to `/demos`. Only shared hotels with `published: true` and `mode: "demo"` (or legacy mode absent) appear there.
- Each hotel has its own `/hotel/<hotel-id>` experience; there is no cross-hotel scrolling.
- Admin: load shared hotels, create/edit, select Demo or Live, check Published, then **SAVE TO SHARED**. New hotels begin as drafts. Live hotels are unlisted (not secret or access-controlled).
- QR codes are generated only for published hotels in **shared GitHub storage**. Download PNG, copy link, or manually send the QR to both admins.
- For actual email delivery, verify `thelist.studio` in Resend and set Vercel env vars `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (e.g. `The List <qr@thelist.studio>`). Until then, the Send button shows a configuration error, and Download QR works.
- Set `NEXT_PUBLIC_SITE_URL=https://thelistv2.vercel.app` (or your final domain) in Vercel so QR codes point to the intended host.
- Admin credentials, `ADMIN_SESSION_SECRET`, and `GITHUB_HOTELS_TOKEN` remain in Vercel; do not commit them.
- New dependency: `qrcode` and its TypeScript definitions. Vercel must install them during deployment.
- This package has not been production-build tested in this environment. Test a demo, QR scan, email delivery, and a two-admin shared save before giving QR codes to hotels.
