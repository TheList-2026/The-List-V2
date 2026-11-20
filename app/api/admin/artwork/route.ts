
import { NextRequest, NextResponse } from "next/server";
import { sessionEmail } from "@/lib/admin-auth";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

const OWNER = "TheList-2026";
const REPO = "The-List-V2";
const BRANCH =
  process.env.VERCEL_ENV === "production"
    ? "main"
    : "admin-v3-test";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!sessionEmail(req)) {
    return NextResponse.json(
      { error: "Admin sign-in required." },
      { status: 401 }
    );
  }

  const token = process.env.GITHUB_HOTELS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GitHub storage is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const image = body?.image;

    if (
      typeof image !== "string" ||
      !image.startsWith("data:image/jpeg;base64,")
    ) {
      return NextResponse.json(
        { error: "A JPEG image is required." },
        { status: 400 }
      );
    }

    const encoded = image.slice("data:image/jpeg;base64,".length);

    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      return NextResponse.json(
        { error: "Invalid image encoding." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(encoded, "base64");

    if (
      bytes.length === 0 ||
      bytes.length > MAX_IMAGE_BYTES ||
      bytes[0] !== 0xff ||
      bytes[1] !== 0xd8 ||
      bytes[2] !== 0xff
    ) {
      return NextResponse.json(
        { error: "Invalid JPEG or image exceeds 3 MB." },
        { status: 413 }
      );
    }

    const hash = createHash("sha256")
      .update(bytes)
      .digest("hex");

    const path = `public/hotel-artwork/${hash}.jpg`;
    const api =
      `https://api.github.com/repos/${OWNER}/${REPO}` +
      `/contents/${path}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const existing = await fetch(
      `${api}?ref=${encodeURIComponent(BRANCH)}`,
      { headers, cache: "no-store" }
    );

    if (existing.status !== 404 && !existing.ok) {
      throw new Error(`GitHub lookup failed: ${existing.status}`);
    }

    if (existing.status === 404) {
      const uploaded = await fetch(api, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Upload hotel artwork ${hash.slice(0, 12)}`,
          branch: BRANCH,
          content: encoded,
        }),
      });

      if (!uploaded.ok) {
        throw new Error(`GitHub upload failed: ${uploaded.status}`);
      }
    }

    return NextResponse.json({
      image: `/hotel-artwork/${hash}.jpg`,
    });
  } catch (error) {
    console.error("Artwork upload failed:", error);

    return NextResponse.json(
      { error: "Artwork upload failed. Nothing was deleted." },
      { status: 500 }
    );
  }
}
