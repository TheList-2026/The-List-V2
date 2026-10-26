# THE LIST — Luxury V2 comparison site

Standalone Next.js 15 project. The V2 editorial presentation, actual Marbella spreadsheet data and artwork, and V1 admin functionality are combined.

## Setup
1. Create a **new** GitHub repository (e.g. `The-List-V2`) and upload the **contents** of this folder. Do not overwrite the original website.
2. Import that repository as a **new** Vercel project (framework Next.js).
3. Visit `/hotel/puente-romano-marbella` for the Marbella guide; `/admin` for CSV, bulk artwork, preview, and shared-data tools; `/work-with-us` for the enquiry form.
4. For persistent cross-device admin edits, set `GITHUB_HOTELS_TOKEN` and a strong `ADMIN_WRITE_KEY` on Vercel with permission to read/write `TheList-2026/The-List` branch `hotel-data` and file `shared-hotels.json`. **WARNING:** This configuration would share live hotel data with the first website. To keep the comparison isolated, configure a separate data repository and edit OWNER/REPO/BRANCH in `app/api/shared-hotels/route.ts` before enabling the token.
5. Without the token, the API serves the bundled Marbella demo. Admin edits are kept in browser storage, but **SAVE TO SHARED** is unavailable.

## Artwork rules
Admin image upload accepts JPG, PNG or WebP up to 5MB and automatically outputs **exactly 1080 × 1920 JPEG**, preserving source proportions using a blurred fill behind non-9:16 images. The bundled Marbella images are original supplied WebP assets, and are not altered. Re-upload through Admin to standardize them.

## Spreadsheet / CSV
The supplied `The_List_5500.xlsx` was used to seed 11 real listings and their metadata. Admin's CSV import expects columns `Business Name,Category,Phone,Booking URL,Directions URL,Artwork Filename,Artwork Has Name`. `marbella-admin-import.csv` is provided for convenience. Matching filenames can be bulk-uploaded via Admin.

## Important launch notes
- `/admin` still uses the **original client-side email allowlist** for viewing. Shared-data PUT now additionally requires the `ADMIN_WRITE_KEY` secret, entered when saving. For production, replace this with proper server-side sign-in and rate limiting.
- The enquiry form is a **mailto demo**, with placeholder `partnerships@thelist.example`; replace with a real mailbox or server form before launch.
- The artwork is owned/provided by the project owner; check usage rights before publishing publicly.
- No modifications are made to the original repository or Vercel project by this ZIP.
