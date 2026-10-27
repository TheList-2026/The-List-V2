"use client";

import { useEffect, useState, type ChangeEvent, type CSSProperties } from "react";
import Link from "next/link";
import JSZip from "jszip";

type Category = "DINING" | "SHOPPING" | "EXPERIENCES";
type Listing = {
  id: string;
  name: string;
  category: Category;
  image: string;
  artworkHasName: boolean;
  phone: string;
  booking: string;
  directions: string;
  artworkFilename?: string;
};
type Hotel = { id: string; name: string; location: string; listings: Listing[]; mode?: "demo" | "live"; published?: boolean };
type ImportRow = { name: string; category: Category; phone: string; booking: string; directions: string; artworkFilename: string; artworkHasName: boolean };
function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"') { if (quoted && src[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}
function normalizedName(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, ""); }
function fileKey(value: string) { return value.trim().replace(/^.*[\\/]/, "").toLowerCase(); }
const ARTWORK_WIDTH = 1080;
const ARTWORK_HEIGHT = 1920;

// Produce an exact 9:16 canvas without stretching or cropping supplied artwork.
function renderPortraitArtwork(img: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = ARTWORK_WIDTH;
  canvas.height = ARTWORK_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot process image.");

  const cover = Math.max(ARTWORK_WIDTH / img.naturalWidth, ARTWORK_HEIGHT / img.naturalHeight);
  const bgWidth = img.naturalWidth * cover;
  const bgHeight = img.naturalHeight * cover;
  ctx.filter = "blur(48px) brightness(0.65)";
  ctx.drawImage(img, (ARTWORK_WIDTH - bgWidth) / 2, (ARTWORK_HEIGHT - bgHeight) / 2, bgWidth, bgHeight);
  ctx.filter = "none";

  const contain = Math.min(ARTWORK_WIDTH / img.naturalWidth, ARTWORK_HEIGHT / img.naturalHeight);
  const width = img.naturalWidth * contain;
  const height = img.naturalHeight * contain;
  ctx.drawImage(img, (ARTWORK_WIDTH - width) / 2, (ARTWORK_HEIGHT - height) / 2, width, height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

async function optimizeImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error(`${file.name}: use JPG, PNG or WebP under 5 MB.`);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try { resolve(renderPortraitArtwork(img)); }
      catch (error) { reject(error); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Cannot read ${file.name}.`)); };
    img.src = url;
  });
}


const STORE = "the-list-admin-test-hotels-v2";
const panel: CSSProperties = { background: "#202020", border: "1px solid #383838", borderRadius: 12, padding: 22 };
const field: CSSProperties = { width: "100%", boxSizing: "border-box", background: "#141414", border: "1px solid #494949", borderRadius: 5, color: "#fff", padding: "12px", fontSize: 14 };
const button: CSSProperties = { padding: "12px 16px", background: "#e7e0d5", color: "#171717", border: 0, borderRadius: 5, cursor: "pointer", fontSize: 12, letterSpacing: ".08em" };
const secondary: CSSProperties = { ...button, background: "transparent", color: "#e7e0d5", border: "1px solid #777" };
const label: CSSProperties = { display: "block", color: "#bbb", fontSize: 11, letterSpacing: ".12em", marginBottom: 7 };
function slug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function makeId() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function validUrl(value: string) { if (!value.trim()) return true; try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activity, setActivity] = useState<{author:string; date:string; message:string}[]>([]);
  const [artworkWarnings, setArtworkWarnings] = useState<string[]>([]);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState("");
  const [location, setLocation] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("DINING");
  const [image, setImage] = useState("");
  const [artworkHasName, setArtworkHasName] = useState(false);
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState("");
  const [directions, setDirections] = useState("");
  const [preview, setPreview] = useState(false);
  const [openPreviewCard, setOpenPreviewCard] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [sharedSha, setSharedSha] = useState<string | null>(null);
  const [sharedBusy, setSharedBusy] = useState(false);
  const [sharedLoaded, setSharedLoaded] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importHotelId, setImportHotelId] = useState<string | null>(null);
  const [removeMissing, setRemoveMissing] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [qrBusy, setQrBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setHotels(parsed as Hotel[]);
      }
    } catch { /* Browser storage may be unavailable */ }
    fetch("/api/admin/session", {cache:"no-store"}).then(r=>r.json()).then(d=>{if(d.authenticated) setApproved(true)}).catch(()=>{});
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORE, JSON.stringify(hotels)); }
    catch { setNotice("Browser storage is full. Try smaller images; your latest changes may not be saved."); }
  }, [hotels, ready]);

  const active = hotels.find(h => h.id === activeId);
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const r = await fetch("/api/admin/session", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to sign in.");
      setApproved(true); setPassword(""); setError("");
      await refreshActivity();
    } catch(e) {setError(e instanceof Error ? e.message : "Login failed.");}
  }
  async function signOut() {
    await fetch("/api/admin/session", {method:"DELETE"});
    setApproved(false); setActiveId(null); setPreview(false);
  }
  async function refreshActivity() {
    try {
      const r = await fetch("/api/admin/activity",{cache:"no-store"});
      if(r.ok) { const d = await r.json(); setActivity(d.activity || []); }
    } catch { /* history temporarily unavailable */ }
  }
  async function uploadZip(event: ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0]; if(!file) return;
    setArtworkWarnings([]);
    if(file.size > 35*1024*1024){setArtworkWarnings(["ZIP exceeds 35 MB. Split the artwork into smaller ZIP files."]);return;}
    try {
      const zip=await JSZip.loadAsync(file);
      const entries=Object.values(zip.files).filter(f=>!f.dir && !f.name.startsWith("__MACOSX/") && !f.name.split("/").pop()?.startsWith("."));
      if(entries.length>100) throw new Error("Maximum 100 images per ZIP.");
      const accepted:File[]=[]; const warnings:string[]=[];
      for(const entry of entries){
        const filename=entry.name.split("/").pop() || "";
        const ext=filename.split(".").pop()?.toLowerCase();
        const mime=ext==="jpg"||ext==="jpeg"?"image/jpeg":ext==="png"?"image/png":ext==="webp"?"image/webp":"";
        if(!mime){warnings.push(`${filename}: unsupported format; use JPG, PNG or WebP.`);continue;}
        const bytes=await entry.async("uint8array");
        if(bytes.byteLength>5*1024*1024){warnings.push(`${filename}: over 5 MB; skipped.`);continue;}
        const imageFile=new File([Uint8Array.from(bytes)],filename,{type:mime});
        const url=URL.createObjectURL(imageFile);
        try {
          const dimensions=await new Promise<{width:number;height:number}>((resolve,reject)=>{
            const image=new Image(); image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight}); image.onerror=()=>reject(new Error("Unreadable image")); image.src=url;
          });
          if(dimensions.width!==1080||dimensions.height!==1920) warnings.push(`${filename}: ${dimensions.width} × ${dimensions.height} (required 1080 × 1920). Will convert without stretching when CSV is applied.`);
          accepted.push(imageFile);
        }catch{warnings.push(`${filename}: invalid or unreadable image; skipped.`)}finally{URL.revokeObjectURL(url)}
      }
      const names=new Set<string>();
      for(const f of accepted){const key=fileKey(f.name);if(names.has(key))warnings.push(`${f.name}: duplicate filename in ZIP.`);names.add(key)}
      setImportFiles(accepted); setArtworkWarnings(warnings);
      setNotice(`${accepted.length} image(s) loaded from ZIP. ${warnings.length} warning(s). Review before applying CSV.`);
    }catch(e){setArtworkWarnings([e instanceof Error?e.message:"Unable to open ZIP."]);setImportFiles([])}
  }
  async function loadShared() {
    if (sharedBusy) return;
    setSharedBusy(true);
    try {
      const response = await fetch("/api/shared-hotels", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load shared hotels.");
      const remote: Hotel[] = Array.isArray(data.hotels) ? data.hotels : [];
      if (hotels.length && !sharedLoaded &&
          !window.confirm("Replace the hotels currently shown on this device with the shared hotels? Your local test hotels may differ. Cancel to keep your local hotels, then use Save to shared.")) return;
      setHotels(remote);
      setActiveId(null);
      setPreview(false);
      setSharedSha(data.sha || null);
      setSharedLoaded(true);
      setNotice(`Loaded ${remote.length} hotel(s) from shared storage.`);
      await refreshActivity();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Shared load failed."); }
    finally { setSharedBusy(false); }
  }

  async function saveShared() {
    if (sharedBusy) return;
    if (!sharedLoaded) { setNotice("Load shared hotels first, then save. This protects your partner’s changes."); return; }
    if (!window.confirm("Save the hotels currently shown here for both administrators? This replaces the current shared hotel list.")) return;
    setSharedBusy(true);
    try {
      const response = await fetch("/api/shared-hotels", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotels, sha: sharedSha }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save shared hotels.");
      setSharedSha(data.sha);
      setSharedLoaded(true);
      setNotice("Saved online. Published demos are now listed on Explore Our Demos. Your partner can click LOAD SHARED HOTELS to see the changes.");
      await refreshActivity();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Shared save failed."); }
    finally { setSharedBusy(false); }
  }


  async function readImportCSV(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file || !active) return;
    try {
      const matrix = parseCSV(await file.text());
      if (matrix.length < 2) throw new Error("CSV needs a header and at least one business.");
      const headers = matrix[0].map(x => x.toLowerCase().replace(/[^a-z0-9]/g, ""));
      const col = (name: string) => headers.indexOf(name);
      for (const required of ["businessname", "category", "artworkfilename"]) if (col(required) < 0) throw new Error(`Missing CSV column: ${required}. Use the provided template.`);
      const get = (r: string[], key: string) => (r[col(key)] || "").trim();
      const seen = new Set<string>();
      const parsed: ImportRow[] = matrix.slice(1).map((r, index) => {
        const name = get(r, "businessname"); const rawCategory = get(r, "category").toUpperCase();
        if (!name) throw new Error(`Row ${index + 2}: business name missing.`);
        if (!["DINING", "SHOPPING", "EXPERIENCES"].includes(rawCategory)) throw new Error(`Row ${index + 2}: category must be DINING, SHOPPING or EXPERIENCES.`);
        const key = normalizedName(name); if (seen.has(key)) throw new Error(`Duplicate business in CSV: ${name}.`); seen.add(key);
        const booking = get(r, "bookingurl"), directions = get(r, "directionsurl");
        if (![booking, directions].every(validUrl)) throw new Error(`Row ${index + 2}: links must begin https:// or http://.`);
        return { name, category: rawCategory as Category, phone: get(r, "phone"), booking, directions, artworkFilename: get(r, "artworkfilename"), artworkHasName: ["yes", "true", "1"].includes(get(r, "artworkhasname").toLowerCase()) };
      });
      setImportRows(parsed); setImportHotelId(active.id); setImportFiles([]); setRemoveMissing(false);
      setNotice(`CSV checked: ${parsed.length} businesses. Upload their artwork, then review changes.`);
    } catch (e) { setImportRows(null); setNotice(e instanceof Error ? e.message : "Cannot read CSV."); }
    event.target.value = "";
  }
  async function applyImport() {
    if (!active || !importRows || importHotelId !== active.id || importBusy) return;
    setImportBusy(true);
    try {
      const existing = new Map(active.listings.map(item => [normalizedName(item.name), item]));
      const uploads = new Map<string, File>();
      for (const f of importFiles) { const key = fileKey(f.name); if (uploads.has(key)) throw new Error(`Duplicate artwork filename: ${f.name}`); uploads.set(key, f); }
      const images = new Map<string, string>();
      const needed = [...new Set(importRows.map(r => fileKey(r.artworkFilename)).filter(Boolean))];
      for (const key of needed) { const file = uploads.get(key); if (file) images.set(key, await optimizeImage(file)); }
      const updated: Listing[] = importRows.map(row => {
        const previous = existing.get(normalizedName(row.name));
        const filename = fileKey(row.artworkFilename);
        const image = images.get(filename) || previous?.image || "";
        return { id: previous?.id || makeId(), name: row.name, category: row.category, phone: row.phone, booking: row.booking, directions: row.directions, artworkHasName: row.artworkHasName, artworkFilename: row.artworkFilename, image };
      });
      const imported = new Set(importRows.map(r => normalizedName(r.name)));
      const retained = removeMissing ? [] : active.listings.filter(item => !imported.has(normalizedName(item.name)));
      const next = [...updated, ...retained];
      setHotels(prev => prev.map(h => h.id === active.id ? { ...h, listings: next } : h));
      setImportRows(null); setImportFiles([]); setImportHotelId(null); setRemoveMissing(false);
      setNotice(`CSV applied to ${active.name}: ${updated.length} imported, ${retained.length} existing retained. Review postcards, then SAVE TO SHARED.`);
    } catch (e) { setNotice(e instanceof Error ? e.message : "Import failed."); }
    finally { setImportBusy(false); }
  }

  function createHotel() {
    const cleanName = hotelName.trim();
    if (!cleanName || !location.trim()) { setNotice("Enter a hotel name and location."); return; }
    const hotelSlug = slug(cleanName);
    if (!hotelSlug) { setNotice("Use a hotel name containing letters or numbers."); return; }
    if (hotels.some(h => h.id === hotelSlug || slug(h.name) === hotelSlug)) { setNotice("A hotel with that URL already exists."); return; }
    const hotel: Hotel = { id: hotelSlug, name: cleanName, location: location.trim(), listings: [], mode: "demo", published: false };
    setHotels(prev => [...prev, hotel]); setActiveId(hotel.id); setHotelName(""); setLocation(""); setNotice("Test hotel created. Add its first postcard below.");
  }
  function updateHotel(fn: (hotel: Hotel) => Hotel) {
    setHotels(prev => prev.map(h => h.id === activeId ? fn(h) : h));
  }
  async function uploadArtwork(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const optimized = await optimizeImage(file);
      setImage(optimized);
      setNotice("Artwork ready: automatically converted to 1080 × 1920 (9:16) without stretching or cropping.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to process artwork.");
    }
    event.target.value = "";
  }
  function addPostcard() {
    if (!active || !name.trim() || !image) { setNotice("Enter the business name and upload its artwork."); return; }
    if (![booking, directions].every(validUrl)) { setNotice("Booking and Maps links must start with https:// or http://."); return; }
    const item: Listing = { id: makeId(), name: name.trim(), category, image, artworkHasName, phone: phone.trim(), booking: booking.trim(), directions: directions.trim() };
    updateHotel(h => ({ ...h, listings: [...h.listings, item] }));
    setName(""); setImage(""); setPhone(""); setBooking(""); setDirections(""); setArtworkHasName(false);
    setNotice("Postcard added and saved in this browser.");
  }
  function movePostcard(index: number, change: number) {
    updateHotel(h => {
      const next = [...h.listings]; const target = index + change;
      if (target < 0 || target >= next.length) return h;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...h, listings: next };
    });
  }
  function removePostcard(id: string) {
    updateHotel(h => ({ ...h, listings: h.listings.filter(item => item.id !== id) }));
  }
  function removeHotel() {
    if (!active || !window.confirm(`Delete the test hotel "${active.name}"?`)) return;
    setHotels(prev => prev.filter(h => h.id !== activeId)); setActiveId(null); setPreview(false);
  }
  async function downloadQr(hotel: Hotel) {
    setQrBusy(true);
    try {
      const response = await fetch(`/api/admin/qr?hotelId=${encodeURIComponent(hotel.id)}`, {cache:"no-store"});
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "QR unavailable"); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `the-list-${hotel.id}-qr.png`; link.click();
      URL.revokeObjectURL(url);
      setNotice("QR code downloaded. Test the code with a phone before printing.");
    } catch(e) { setNotice(e instanceof Error ? e.message : "QR download failed"); }
    finally {setQrBusy(false);}
  }
  async function emailQr(hotel: Hotel) {
    if (!window.confirm(`Email the QR code for ${hotel.name} to Ben@thelist.studio and Projects@thelist.studio?`)) return;
    setEmailBusy(true);
    try {
      const response = await fetch("/api/admin/send-qr", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({hotelId:hotel.id})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Email could not be sent");
      setNotice("QR email accepted for delivery to both administrators.");
    } catch(e) { setNotice(e instanceof Error ? e.message : "Email failed"); }
    finally {setEmailBusy(false);}
  }
  const input = (value: string, onChange: (value: string) => void, placeholder = "") => (
    <input style={field} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
  );
  return (
    <main style={{ minHeight: "100vh", width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "clip", background: "#151515", color: "#f5f1eb", padding: "32px 18px 80px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 1100, minWidth: 0, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #373737", paddingBottom: 22, marginBottom: 28 }}>
          <div><div style={{ fontFamily: "Georgia, serif", fontSize: 30, letterSpacing: ".22em" }}>THE LIST</div><div style={{ color: "#aaa", fontSize: 10, letterSpacing: ".2em", marginTop: 9 }}>HOTEL MANAGEMENT · SHARED WORKSPACE</div></div>
          {approved && <button type="button" style={secondary} onClick={signOut}>SIGN OUT</button>}
        </header>
        {!approved ? (
          <section style={{ ...panel, maxWidth: 420, margin: "70px auto" }}>
            <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 29 }}>Welcome back.</h1>
            <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.7 }}>Private management for authorised partners. Sign in with your own credentials.</p>
            <form onSubmit={login}><label style={label} htmlFor="admin-email">EMAIL</label><input id="admin-email" type="email" required style={{ ...field, marginBottom: 16 }} value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" /><label style={label}>PASSWORD</label><input type="password" required autoComplete="current-password" style={{ ...field, marginBottom: 16 }} value={password} onChange={e => setPassword(e.target.value)} />{error && <p style={{ color: "#eaa", fontSize: 13 }}>{error}</p>}<button type="submit" style={{ ...button, width: "100%" }}>ENTER DASHBOARD →</button></form>
          </section>
        ) : (
          <>
            <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 36, marginBottom: 8 }}>Your hotels</h1>
            <section style={{ ...panel, marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, marginTop: 0 }}>Shared hotel workspace</h2>
              <p style={{ color: "#bbb", fontSize: 13, lineHeight: 1.6 }}>Click LOAD to see the online hotel list. After making changes, click SAVE to share them. On another device, click LOAD again. Your existing browser-only hotels are preserved until you choose to replace them.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="button" disabled={sharedBusy || !ready} style={secondary} onClick={loadShared}>{sharedBusy ? "WORKING…" : "LOAD SHARED HOTELS"}</button>
                <button type="button" disabled={sharedBusy || !ready} style={button} onClick={saveShared}>{sharedBusy ? "WORKING…" : "SAVE TO SHARED"}</button>
              </div>
            </section>
            <section style={{...panel,marginBottom:20}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}><h2 style={{fontSize:17,margin:0}}>Recent shared activity</h2><button type="button" style={secondary} onClick={refreshActivity}>REFRESH</button></div><p style={{color:"#aaa",fontSize:12}}>Changes published by either partner appear here. Unsaved local edits are not shared.</p>{activity.length ? activity.map((a,i)=><p key={i} style={{fontSize:12,borderTop:"1px solid #393939",paddingTop:9}}><strong>{a.author}</strong> · {new Date(a.date).toLocaleString()}<br/><span style={{color:"#aaa"}}>{a.message}</span></p>) : <p style={{color:"#aaa",fontSize:12}}>No activity loaded yet.</p>}</section>
            <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>Create and preview hotels here. Changes stay on this device until you click SAVE TO SHARED. The shared workspace is separate from publishing guest pages.</p>
            {notice && <p role="status" style={{ background: "#302b25", border: "1px solid #625342", padding: 13, borderRadius: 5, color: "#f0e2ce" }}>{notice}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))", gap: 20, alignItems: "start", minWidth: 0, maxWidth: "100%" }}>
              <div style={{ display: "grid", gap: 20, minWidth: 0, maxWidth: "100%" }}>
                <section style={panel}>
                  <h2 style={{ fontSize: 18, marginTop: 0 }}>Create hotel</h2>
                  <label style={label}>HOTEL NAME</label><div style={{ marginBottom: 15 }}>{input(hotelName, setHotelName, "e.g. Four Seasons Maui")}</div>
                  <label style={label}>LOCATION</label><div style={{ marginBottom: 15 }}>{input(location, setLocation, "e.g. Wailea, Maui")}</div>
                  <p style={{ color: "#aaa", fontSize: 12, overflowWrap: "anywhere" }}>Proposed URL: /hotel/{slug(hotelName) || "hotel-name"}</p>
                  <button type="button" style={button} onClick={createHotel}>+ CREATE TEST HOTEL</button>
                </section>
                <section style={panel}>
                  <h2 style={{ fontSize: 18, marginTop: 0 }}>Hotels ({hotels.length})</h2>
                  {hotels.length === 0 && <p style={{ color: "#aaa", fontSize: 13 }}>No hotels yet. Create one above.</p>}
                  {hotels.map(h => <button key={h.id} type="button" onClick={() => { setActiveId(h.id); setPreview(false); setNotice(""); }} style={{ display: "block", width: "100%", textAlign: "left", background: activeId === h.id ? "#38332c" : "#292929", color: "#fff", border: "1px solid #454545", padding: 15, borderRadius: 6, cursor: "pointer", marginTop: 9 }}><strong>{h.name}</strong><span style={{ display: "block", color: "#aaa", fontSize: 12, marginTop: 6 }}>{h.location} · {h.listings.length} postcards · {h.published ? (h.mode === "live" ? "LIVE / UNLISTED" : "DEMO / LISTED") : "DRAFT"}</span></button>)}
                </section>
              </div>
              <div style={{ display: "grid", gap: 20, minWidth: 0, maxWidth: "100%" }}>
                {!active ? <section style={panel}><h2 style={{ fontSize: 18, marginTop: 0 }}>Select a hotel</h2><p style={{ color: "#aaa", fontSize: 13 }}>Create or select a hotel to add its business postcards.</p></section> : (
                  <>
                    <section style={panel}>
                      <h2 style={{ fontSize: 19, marginTop: 0 }}>{active.name}</h2>
                      <p style={{ color: "#aaa", fontSize: 12 }}>{active.location} · /hotel/{slug(active.name)}</p>
                      <p style={{ color: "#c5b59f", fontSize: 12 }}>{active.published ? "Published page — changes go live when saved to shared." : "Draft — publish below when ready."}</p>
                      <button type="button" style={secondary} onClick={removeHotel}>DELETE TEST HOTEL</button>
                    </section>
                    <section style={panel}>
                      <h2 style={{ fontSize: 18, marginTop: 0 }}>CSV import / Replace CSV</h2>
                      <p style={{ color: "#bbb", fontSize: 13, lineHeight: 1.6 }}>Import a CSV for {active.name}. Upload named artwork files, review changes, then apply. Replacing a CSV updates existing businesses without duplicating them.</p>
                      <label style={label}>1. SELECT CSV</label>
                      <input type="file" accept=".csv,text/csv" onChange={readImportCSV} style={{ ...field, marginBottom: 16 }} />
                      {importRows && importHotelId === active.id && <>
                        <label style={label}>2. UPLOAD ARTWORK ZIP (OR SELECT INDIVIDUAL FILES)</label>
                        <input type="file" accept=".zip,application/zip" onChange={uploadZip} style={{...field,marginBottom:12}} />
                        <label style={label}>OR SELECT INDIVIDUAL IMAGES</label>
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e => setImportFiles(Array.from(e.target.files || []))} style={{ ...field, marginBottom: 16 }} />
                        {artworkWarnings.length>0 && <div role="alert" style={{background:"#382c24",border:"1px solid #8d7051",padding:12,marginBottom:14,fontSize:12}}><strong>Artwork validation — {artworkWarnings.length} warning(s)</strong>{artworkWarnings.map((w,i)=><p key={i} style={{margin:"8px 0 0"}}>{w}</p>)}</div>}
                        <p style={{ color: "#bbb", fontSize: 12 }}>{importFiles.length} image(s) selected. Exact filenames match the Artwork Filename CSV column.</p>
                        <h3 style={{ fontSize: 14 }}>3. Review changes</h3>
                        {(() => {
                          const old = new Map(active.listings.map(x => [normalizedName(x.name), x]));
                          const incoming = new Set(importRows.map(x => normalizedName(x.name)));
                          const removed = active.listings.filter(x => !incoming.has(normalizedName(x.name)));
                          return <>
                            <p style={{ color: "#ddd", fontSize: 12 }}>{importRows.filter(x => old.has(normalizedName(x.name))).length} updates · {importRows.filter(x => !old.has(normalizedName(x.name))).length} new · {removed.length} absent from CSV</p>
                            <div style={{ maxHeight: 300, overflowY: "auto", borderTop: "1px solid #444" }}>
                              {importRows.map(row => {
                                const prior = old.get(normalizedName(row.name));
                                const matched = importFiles.some(f => fileKey(f.name) === fileKey(row.artworkFilename) && !!row.artworkFilename);
                                return <div key={row.name} style={{ padding: "9px 0", borderBottom: "1px solid #333", fontSize: 12 }}><strong>{row.name}</strong> · {prior ? "UPDATE" : "NEW"}<div style={{ color: matched ? "#b9d7b0" : prior?.image ? "#d9c5a5" : "#f1aaa5", marginTop: 4 }}>{matched ? "New artwork matched" : prior?.image ? "Keeping existing artwork" : "No artwork yet — upload matching filename"}</div></div>;
                              })}
                            </div>
                            {removed.length > 0 && <label style={{ display: "flex", gap: 9, alignItems: "flex-start", color: "#ddd", fontSize: 12, marginTop: 14 }}><input type="checkbox" checked={removeMissing} onChange={e => setRemoveMissing(e.target.checked)} />Remove {removed.length} business(es) absent from this CSV ({removed.map(x => x.name).join(", ")}). Leave unchecked to keep them.</label>}
                          </>;
                        })()}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 16 }}>
                          <button type="button" disabled={importBusy} style={button} onClick={applyImport}>{importBusy ? "PROCESSING…" : "APPLY CSV CHANGES"}</button>
                          <button type="button" disabled={importBusy} style={secondary} onClick={() => { setImportRows(null); setImportFiles([]); setImportHotelId(null); }}>CANCEL</button>
                        </div>
                      </>}
                    </section>
                    <section style={panel}>
                      <h2 style={{ fontSize: 18, marginTop: 0 }}>Add business postcard</h2>
                      <label style={label}>BUSINESS NAME</label><div style={{ marginBottom: 15 }}>{input(name, setName, "Business name")}</div>
                      <label style={label}>CATEGORY</label><select style={{ ...field, marginBottom: 15 }} value={category} onChange={e => setCategory(e.target.value as Category)}><option value="DINING">Restaurant</option><option value="SHOPPING">Fashion / Retail</option><option value="EXPERIENCES">Experience</option></select>
                      <label style={label}>CLIENT ARTWORK (UP TO 5 MB — PORTRAIT 1080 × 1920 RECOMMENDED)</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadArtwork} style={{ ...field, marginBottom: 12 }} />
                      {image && <img src={image} alt="Uploaded artwork preview" style={{ width: "100%", height: 190, objectFit: "cover", borderRadius: 5, marginBottom: 12 }} />}
                      <label style={{ display: "flex", gap: 9, alignItems: "center", color: "#ddd", fontSize: 13, marginBottom: 17 }}><input type="checkbox" checked={artworkHasName} onChange={e => setArtworkHasName(e.target.checked)} />Business name is already in the artwork</label>
                      <label style={label}>PHONE (OPTIONAL IN TEST)</label><div style={{ marginBottom: 15 }}>{input(phone, setPhone, "+1...")}</div>
                      <label style={label}>{category === "DINING" ? "RESERVATION LINK" : category === "SHOPPING" ? "APPOINTMENT LINK (OPTIONAL)" : "BOOKING LINK (OPTIONAL)"}</label><div style={{ marginBottom: 15 }}>{input(booking, setBooking, "https://...")}</div>
                      <label style={label}>GOOGLE MAPS LINK</label><div style={{ marginBottom: 20 }}>{input(directions, setDirections, "https://maps.google.com/...")}</div>
                      <button type="button" style={button} onClick={addPostcard}>+ ADD POSTCARD</button>
                    </section>
                    <section style={panel}>
                      <h2 style={{ fontSize: 18, marginTop: 0 }}>Postcard order ({active.listings.length})</h2>
                      {active.listings.map((item, i) => <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 0", borderBottom: "1px solid #393939" }}><img src={item.image} alt="" style={{ width: 46, height: 62, objectFit: "cover", borderRadius: 4 }} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13 }}>{i + 1}. {item.name}</div><div style={{ fontSize: 11, color: "#aaa", marginTop: 5 }}>{item.category}</div></div><button type="button" aria-label={`Move ${item.name} up`} disabled={i === 0} onClick={() => movePostcard(i, -1)} style={secondary}>↑</button><button type="button" aria-label={`Move ${item.name} down`} disabled={i === active.listings.length - 1} onClick={() => movePostcard(i, 1)} style={secondary}>↓</button><button type="button" aria-label={`Remove ${item.name}`} onClick={() => removePostcard(item.id)} style={secondary}>×</button></div>)}
                      <button type="button" style={{ ...button, marginTop: 18, width: "100%" }} disabled={!active.listings.length} onClick={() => setPreview(p => !p)}>{preview ? "CLOSE PREVIEW" : "PREVIEW HOTEL POSTCARDS"}</button>
                    </section>
                  </>
                )}
              </div>
            </div>
            {active && preview && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`Preview of ${active.name}`}
                style={{ position: "fixed", inset: 0, width: "100vw", maxWidth: "100vw", minWidth: 0, overflow: "hidden", touchAction: "pan-y", zIndex: 9999, background: "#111" }}
              >
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Manrope:wght@400;500&display=swap" />
                <style>{`
                  .listHotel .editorialCard { display: flex !important; flex-direction: column !important; padding: 0 !important; background: #181715 !important; align-items: stretch !important; }
                  .listHotel .editorialImage { position: relative; flex: 1 1 auto; min-height: 0; overflow: hidden; background: #22211e; }
                  .listHotel .editorialImage img { width: 100%; height: 100%; object-fit: contain; display: block; position: relative; z-index: 1; }
                  .listHotel .editorialFooter { flex: 0 0 auto; position: relative; z-index: 2; width: 100%; padding: 22px 24px calc(30px + env(safe-area-inset-bottom, 0px)); background: #181715; box-sizing: border-box; }
                  .listHotel .editorialEyebrow { font: 500 9px/1.4 "Manrope", sans-serif; letter-spacing: .17em; color: #c4b49a; margin-bottom: 9px; text-transform: uppercase; }
                  .listHotel .editorialTitle { font-family: "Cormorant Garamond", Georgia, serif !important; font-weight: 400 !important; font-size: clamp(29px, 7.8vw, 43px) !important; line-height: 1.03 !important; letter-spacing: -.012em !important; color: #f2eee6 !important; margin: 0 0 15px !important; text-shadow: none !important; overflow-wrap: normal !important; }
                  .listHotel .editorialRule { height: 1px; background: rgba(220,207,185,.33); margin-bottom: 13px; }
                  .listHotel .editorialActions { display: grid !important; grid-template-columns: repeat(var(--action-count), minmax(0, 1fr)) !important; gap: 9px !important; margin: 0 !important; width: 100% !important; align-items: center !important; }
                  .listHotel .editorialActions .listActionLink { min-width: 0 !important; width: 100% !important; box-sizing: border-box !important; display: block !important; text-align: left !important; font: 500 clamp(8px, 2.3vw, 10px)/1.4 "Manrope", Arial, sans-serif !important; letter-spacing: .075em !important; white-space: nowrap !important; color: #f2eee6 !important; background: transparent !important; border: 0 !important; padding: 7px 0 !important; min-height: 30px !important; backdrop-filter: none !important; transform: none !important; position: relative; text-decoration: none !important; }
                  .listHotel .editorialActions .listActionLink::after { content: ""; position: absolute; left: 0; bottom: 1px; width: 70%; height: 1px; background: #c6b18d; transform: scaleX(0); transform-origin: left; transition: transform 320ms ease; }
                  .listHotel .editorialActions .listActionLink:hover::after, .listHotel .editorialActions .listActionLink:focus-visible::after, .listHotel .editorialActions .listActionLink:active::after { transform: scaleX(1); }
                  @media (max-height: 680px) { .listHotel .editorialFooter { padding-top: 14px; padding-bottom: 17px; } .listHotel .editorialTitle { font-size: 28px !important; margin-bottom: 10px !important; } }
                  @media (prefers-reduced-motion: reduce) { .listHotel .editorialActions .listActionLink::after { transition: none; } }
                `}</style>
                <button
                  type="button"
                  onClick={() => setPreview(false)}
                  style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 16px)", right: 12, maxWidth: "calc(100% - 24px)", zIndex: 10002, background: "rgba(0,0,0,.75)", color: "white", border: "1px solid rgba(255,255,255,.55)", padding: "11px 16px", borderRadius: 4, fontSize: 11, letterSpacing: ".12em", cursor: "pointer" }}
                >
                  CLOSE PREVIEW ×
                </button>
                <div className="feed listHotel" id="admin-preview-top" style={{ height: "100dvh", width: "100%", maxWidth: "100%", overflowY: "auto", overflowX: "hidden", overscrollBehaviorX: "none", touchAction: "pan-y" }}>
                  <header className="feedHeader" style={{ zIndex: 10001, background: "linear-gradient(to bottom,rgba(0,0,0,.72),rgba(0,0,0,.32) 65%,transparent)", paddingBottom: 35 }}>
                    <span className="wordmark">THE LIST</span>
                    <span className="hotelName">{active.name}</span>
                  </header>
                  <section className="feedCard welcome" style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden", padding: "100px 22px 35px" }}>
                    <div className="welcomeInner" style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowWrap: "anywhere" }}>
                      <span className="eyebrow">THE LIST PRESENTS</span>
                      <h1 style={{ fontSize: "clamp(38px, 11vw, 88px)", lineHeight: 1.08, maxWidth: "100%", overflowWrap: "anywhere" }}>{active.location}<br /><em style={{ display: "block", fontSize: "clamp(36px, 10vw, 84px)", whiteSpace: "normal" }}>for your stay.</em></h1>
                      <span className="scrollHint">SCROLL TO DISCOVER ↓</span>
                    </div>
                  </section>
                  {active.listings.map((item, i) => {
                    const actions: { label: string; href: string }[] = [];
                    if (item.phone) actions.push({ label: "CALL", href: `tel:${item.phone}` });
                    if (item.booking) actions.push({ label: item.category === "DINING" ? "RESERVATION" : item.category === "SHOPPING" ? "APPOINTMENT" : "BOOKING", href: item.booking });
                    if (item.directions) actions.push({ label: "DIRECTIONS", href: item.directions });
                    return (
                      <section
                        className="feedCard listing listPostcard editorialCard"
                        key={item.id}
                        tabIndex={0}
                        aria-label={`${item.name} postcard. Press Enter to ${openPreviewCard === item.id ? "hide" : "show"} actions.`}
                        onClick={() => setOpenPreviewCard(current => current === item.id ? null : item.id)}
                        onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setOpenPreviewCard(current => current === item.id ? null : item.id); } }}
                        style={{ width: "100%", maxWidth: "100%", minWidth: 0, cursor: "pointer" }}
                      >
                        <div className="editorialImage">
                          <img src={item.image} alt={`${item.name} artwork`} />
                          <div className="cardCount" style={{ position: "absolute", top: 88, left: 24, zIndex: 2, color: "#fff", textShadow: "0 1px 7px #000" }}>{String(i + 1).padStart(2, "0")} / {String(active.listings.length).padStart(2, "0")}</div>
                        </div>
                        <div className="editorialFooter">
                          <div className="editorialEyebrow">{item.category} · {active.name}</div>
                          <h2 className="editorialTitle">{item.name}</h2>
                          <div className="editorialRule" />
                          <div className="cardActions listPostcardActions editorialActions" style={{ "--action-count": Math.max(actions.length, 1), opacity: openPreviewCard === item.id ? 1 : 0, visibility: openPreviewCard === item.id ? "visible" : "hidden", transition: "opacity 250ms ease, visibility 250ms", pointerEvents: openPreviewCard === item.id ? "auto" : "none" } as CSSProperties} aria-hidden={openPreviewCard !== item.id}>
                            {actions.map(action => (
                              <a onClick={event => event.stopPropagation()} className="listActionLink" tabIndex={openPreviewCard === item.id ? 0 : -1} key={action.label} href={action.href} target={action.label === "CALL" ? undefined : "_blank"} rel={action.label === "CALL" ? undefined : "noopener noreferrer"}>
                                {action.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                  <section className="feedCard endCard">
                    <div>
                      <span className="eyebrow">THE LIST</span>
                      <h2>Enjoy your stay.</h2>
                      <a href="#admin-preview-top" className="backTop">BACK TO TOP ↑</a>
                    </div>
                  </section>
                </div>
              </div>
            )}
            <section style={{ ...panel, marginTop: 24 }}>
              <h2 style={{ fontSize: 17, marginTop: 0 }}>Publishing & QR codes</h2>
              <p style={{ color: "#aaa", fontSize: 13, lineHeight: 1.7 }}>Set a hotel to Demo to show it in the public demo gallery, or Live for an unlisted, QR-accessible page. Changes only take effect after SAVE TO SHARED. An unlisted URL is not password protected.</p>
              {active ? <>
                <label style={label}>HOTEL VISIBILITY</label>
                <select value={active.mode || "demo"} onChange={e => updateHotel(h => ({...h,mode:e.target.value as "demo"|"live"}))} style={{...field,marginBottom:12}}><option value="demo">Demo — listed in gallery</option><option value="live">Live — unlisted, QR / link only</option></select>
                <label style={{display:"flex",gap:9,alignItems:"center",fontSize:13,marginBottom:15}}><input type="checkbox" checked={active.published === true} onChange={e => updateHotel(h => ({...h,published:e.target.checked}))}/> Published (uncheck to hide)</label>
                <p style={{color:"#aaa",fontSize:12}}>Hotel URL: /hotel/{active.id}</p>
                <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
                  <button type="button" style={button} onClick={saveShared} disabled={sharedBusy || !sharedLoaded}>SAVE / PUBLISH CHANGES</button>
                  <button type="button" style={secondary} onClick={()=>downloadQr(active)} disabled={qrBusy || !active.published || !sharedLoaded}>DOWNLOAD QR</button>
                  <button type="button" style={secondary} onClick={()=>emailQr(active)} disabled={emailBusy || !active.published || !sharedLoaded}>{emailBusy ? "SENDING…" : "SEND QR TO BOTH"}</button>
                  <button type="button" style={secondary} onClick={()=>{void navigator.clipboard.writeText(`${window.location.origin}/hotel/${active.id}`);setNotice("Hotel link copied.")}}>COPY HOTEL LINK</button>
                  <Link href={`/hotel/${active.id}`} target="_blank" style={{...secondary,textDecoration:"none"}}>OPEN HOTEL ↗</Link>
                </div>
                <p style={{color:"#aaa",fontSize:12,marginTop:12}}>QR actions use the last saved published version. Save and reload shared data after publishing before sending QR codes. Email requires RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel.</p>
              </> : <p style={{color:"#aaa",fontSize:13}}>Select a hotel to manage publishing.</p>}
            </section>
          </>
        )}
        <footer style={{ marginTop: 32, color: "#777", fontSize: 11, textAlign: "center" }}>THE LIST · INTERNAL TESTING ONLY · <Link href="/hotel/maui-demo" style={{ color: "#bbb" }}>VIEW MAUI DEMO ↗</Link></footer>
      </div>
    </main>
  );
}