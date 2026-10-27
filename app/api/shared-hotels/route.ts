import seed from "../../../data/seed-hotels.json";
import {sessionEmail} from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OWNER = "TheList-2026";
const REPO = "The-List-V2";
const BRANCH = "main";
const FILE = "data/shared-hotels.json";
const api = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}?ref=${BRANCH}`;

const headers = () => ({
  Authorization: `Bearer ${process.env.GITHUB_HOTELS_TOKEN || ""}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

async function readCurrent() {
  const res = await fetch(api, { headers: headers(), cache: "no-store" });
  if (res.status === 404) return { hotels: [], sha: null as string | null };
  if (!res.ok) throw new Error(`GitHub returned ${res.status}. Check token, repo and hotel-data branch.`);

  const file: { sha?: string; content?: string; download_url?: string | null } = await res.json();
  if (!file.sha) throw new Error("GitHub did not return a file SHA. Shared data was not changed.");

  let raw = "";
  if (file.content?.trim()) {
    raw = Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8");
  } else {
    // GitHub's Contents API omits inline content for larger files.
    // Read the actual file instead, without modifying anything in GitHub.
    if (!file.download_url) {
      throw new Error("GitHub omitted the shared file contents and provided no download URL. Shared data was not changed.");
    }
    const download = await fetch(file.download_url, {
      headers: { Authorization: headers().Authorization, Accept: "application/octet-stream" },
      cache: "no-store",
    });
    if (!download.ok) throw new Error(`Unable to download shared hotel data (${download.status}).`);
    raw = await download.text();
  }

  if (!raw.trim()) throw new Error("Shared hotel file is empty. Nothing has been overwritten.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error("Shared hotel file is not valid JSON. Nothing has been overwritten."); }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { hotels?: unknown }).hotels)) {
    throw new Error("Shared hotel file has an unexpected format. Nothing has been overwritten.");
  }
  return { hotels: (parsed as { hotels: unknown[] }).hotels, sha: file.sha };
}

export async function GET() {
  if (!process.env.GITHUB_HOTELS_TOKEN) {
    return NextResponse.json(seed, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    return NextResponse.json(await readCurrent(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unable to load hotels." }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const actor=sessionEmail(req);
  if (!actor) return NextResponse.json({ error: "Sign in to Admin to save shared hotels." }, { status: 401 });
  if (!process.env.GITHUB_HOTELS_TOKEN) {
    return NextResponse.json({ error: "Set GITHUB_HOTELS_TOKEN in Vercel first." }, { status: 503 });
  }
  try {
    const body = await req.json();
    if (!Array.isArray(body.hotels) || body.hotels.length > 10) {
      return NextResponse.json({ error: "This pilot supports up to 10 hotels." }, { status: 400 });
    }
    if (body.hotels.some((h: unknown) => !h || typeof h !== "object" || !("name" in h) || !("listings" in h) || !Array.isArray(h.listings))) {
      return NextResponse.json({ error: "Invalid hotel data." }, { status: 400 });
    }
    const current = await readCurrent();
    if ((body.sha || null) !== current.sha) {
      return NextResponse.json({ error: "Another device has saved changes. Click LOAD SHARED HOTELS before saving again. Copy any unsaved edits first." }, { status: 409 });
    }
    const json = JSON.stringify({ hotels: body.hotels }, null, 2);
    if (Buffer.byteLength(json, "utf8") > 18 * 1024 * 1024) {
      return NextResponse.json({ error: "Shared data exceeds 18 MB. Reduce image sizes or number of postcards." }, { status: 413 });
    }
    const payload: Record<string, unknown> = {
      message: `Admin update by ${actor}`,
      branch: BRANCH,
      content: Buffer.from(json, "utf8").toString("base64"),
    };
    if (current.sha) payload.sha = current.sha;
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`, {
      method: "PUT", headers: headers(), body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`GitHub save failed (${res.status}): ${error.slice(0, 300)}`);
    }
    const result = await res.json();
    return NextResponse.json({ ok: true, sha: result.content?.sha || null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unable to save hotels." }, { status: 502 });
  }
}
