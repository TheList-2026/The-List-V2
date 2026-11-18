"use client";

import { useEffect, useState, useRef, type CSSProperties } from "react";
import Link from "next/link";
import JSZip from "jszip";

type Category = "DINING" | "SHOPPING" | "EXPERIENCES";
type Listing = {
  id: string;
  businessId?: string;
  name: string;
  category: Category;
  image: string;
  artworkHasName: boolean;
  phone: string;
  booking: string;
  directions: string;
  artworkFilename?: string;
};
type Hotel = { id: string; name: string; location: string; listings: Listing[]; mode?: "demo" | "live"; published?: boolean; sheetLink?: string };
type ImportRow = { businessId: string; name: string; category: Category; phone: string; booking: string; directions: string; artworkFilename: string; artworkHasName: boolean };
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



const panel: CSSProperties = {background:'#202020',border:'1px solid #393939',borderRadius:13,padding:20};
const field: CSSProperties = {width:'100%',boxSizing:'border-box',background:'#151515',border:'1px solid #4a4a4a',borderRadius:7,color:'#f4efe8',padding:'12px',fontSize:14};
const button: CSSProperties = {padding:'12px 17px',background:'#e8dfd2',color:'#171717',border:0,borderRadius:7,cursor:'pointer',fontSize:12,letterSpacing:'.06em'};
const secondary: CSSProperties = {...button,background:'#292929',color:'#e8dfd2',border:'1px solid #555'};
const label: CSSProperties = {display:'block',fontSize:11,letterSpacing:'.12em',color:'#c9c1b7',marginBottom:7};
function slug(v:string){return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function makeId(){return `${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function validUrl(v:string){if(!v.trim())return true;try{const u=new URL(v);return u.protocol==='https:'||u.protocol==='http:'}catch{return false}}
function reorder<T>(items:T[],from:number,to:number):T[]{const next=[...items];if(from<0||to<0||from>=next.length||to>=next.length)return next;const [m]=next.splice(from,1);next.splice(to,0,m);return next;}
type SaveStatus='loading'|'saved'|'saving'|'pending'|'conflict'|'error';
export default function AdminPage(){
 const [email,setEmail]=useState(''); const [password,setPassword]=useState('');const [approved,setApproved]=useState(false);const [authError,setAuthError]=useState('');
 const [hotels,setHotels]=useState<Hotel[]>([]);const [activeId,setActiveId]=useState<string|null>(null);const [selectedCard,setSelectedCard]=useState<string|null>(null);
 const [status,setStatus]=useState<SaveStatus>('loading');const [notice,setNotice]=useState('');const [modal,setModal]=useState<'add'|'sync'|null>(null);
 const [propertyName,setPropertyName]=useState('');const [propertyLocation,setPropertyLocation]=useState('');const [sheetLink,setSheetLink]=useState('');const [zipFile,setZipFile]=useState<File|null>(null);
 const [newPublished,setNewPublished]=useState(false);const [newDemo,setNewDemo]=useState(false);const [busy,setBusy]=useState(false);const [artworkWarnings,setArtworkWarnings]=useState<string[]>([]);
 const [preview,setPreview]=useState(false);const [openPreviewCard,setOpenPreviewCard]=useState<string|null>(null);const [qrBusy,setQrBusy]=useState(false);const [emailBusy,setEmailBusy]=useState(false);
 const [dragIndex,setDragIndex]=useState<number|null>(null);const [dragOver,setDragOver]=useState<number|null>(null);
 const hotelsRef=useRef<Hotel[]>([]);const shaRef=useRef<string|null>(null);const dirtyRef=useRef(false);const savingRef=useRef(false);const readyRef=useRef(false);const approvedRef=useRef(false);const activeRef=useRef<string|null>(null);
 const active=hotels.find(h=>h.id===activeId);const selected=active?.listings.find(x=>x.id===selectedCard)||active?.listings[0];
 function showHotels(next:Hotel[]){hotelsRef.current=next;setHotels(next)}
 function editHotels(fn:(prev:Hotel[])=>Hotel[]){const next=fn(hotelsRef.current);showHotels(next);dirtyRef.current=true;setStatus('pending')}
 function editActive(fn:(h:Hotel)=>Hotel){if(!activeRef.current)return;editHotels(prev=>prev.map(h=>h.id===activeRef.current?fn(h):h))}
 function selectHotel(id:string){activeRef.current=id;setActiveId(id);setSelectedCard(null);setNotice('')}
 async function loadShared(initial=false){
  if(!approvedRef.current)return;
  try{const r=await fetch('/api/shared-hotels',{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'Cannot load shared properties');
   if(dirtyRef.current||savingRef.current)return;
   if(initial||data.sha!==shaRef.current){shaRef.current=data.sha||null;showHotels(Array.isArray(data.hotels)?data.hotels:[]);if(initial){readyRef.current=true;setStatus('saved')} }
  }catch(e){if(initial){readyRef.current=false;setStatus('error')}setNotice(e instanceof Error?e.message:'Unable to sync properties')}
 }
 async function saveShared(){
  if(!approvedRef.current||!readyRef.current||!dirtyRef.current||savingRef.current)return;
  savingRef.current=true;setStatus('saving');const snapshot=hotelsRef.current;
  try{const r=await fetch('/api/shared-hotels',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({hotels:snapshot,sha:shaRef.current})});const d=await r.json();
   if(r.status===409){setStatus('conflict');setNotice('Another administrator saved first. Your changes are still on this screen. Do not refresh; resolve the conflict before continuing.');return}
   if(!r.ok)throw new Error(d.error||'Shared save failed');
   shaRef.current=d.sha||null;
   if(hotelsRef.current===snapshot){dirtyRef.current=false;setStatus('saved')}else{setStatus('pending')}
  }catch(e){setStatus('error');setNotice(e instanceof Error?e.message:'Save failed. Your changes remain on this screen.')}
  finally{savingRef.current=false}
 }
 useEffect(()=>{let mounted=true;fetch('/api/admin/session',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(mounted&&d.authenticated){approvedRef.current=true;setApproved(true)}}).catch(()=>{});return()=>{mounted=false}},[]);
 useEffect(()=>{if(!approved)return;approvedRef.current=true;void loadShared(true);const timer=setInterval(()=>{if(!dirtyRef.current&&!savingRef.current)void loadShared(false)},5000);return()=>clearInterval(timer)},[approved]);
 useEffect(()=>{if(!approved)return;const timer=setInterval(()=>{if(dirtyRef.current&&!savingRef.current&&status!=='conflict')void saveShared()},1800);return()=>clearInterval(timer)},[approved,status]);
 async function login(e:React.FormEvent<HTMLFormElement>){e.preventDefault();try{const r=await fetch('/api/admin/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to sign in.');approvedRef.current=true;setApproved(true);setPassword('');setAuthError('')}catch(e){setAuthError(e instanceof Error?e.message:'Login failed.')}}
 async function signOut(){await fetch('/api/admin/session',{method:'DELETE'});approvedRef.current=false;readyRef.current=false;setApproved(false);showHotels([]);selectHotel('')}
 async function readSheet(link:string):Promise<ImportRow[]>{const r=await fetch(`/api/admin/google-sheet?url=${encodeURIComponent(link.trim())}`,{cache:'no-store'});const d=await r.json();if(!r.ok||typeof d.csv!=='string')throw new Error(d.error||'Cannot read Google Sheet');const matrix=parseCSV(d.csv);if(matrix.length<2)throw new Error('Sheet must contain a header and at least one business.');const headers=matrix[0].map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,''));const col=(s:string)=>headers.indexOf(s);for(const key of ['businessid','businessname','category'])if(col(key)<0)throw new Error(`Missing Google Sheet column: ${key}`);const get=(r:string[],key:string)=> (r[col(key)]||'').trim();const seen=new Set<string>();return matrix.slice(1).map((r,i)=>{const businessId=get(r,'businessid');const name=get(r,'businessname');const category=get(r,'category').toUpperCase();if(!businessId||!/^[a-zA-Z0-9_-]+$/.test(businessId))throw new Error(`Row ${i+2}: invalid Business ID`);if(seen.has(businessId.toLowerCase()))throw new Error(`Duplicate Business ID ${businessId}`);seen.add(businessId.toLowerCase());if(!name)throw new Error(`Row ${i+2}: missing business name`);if(!['DINING','SHOPPING','EXPERIENCES'].includes(category))throw new Error(`Row ${i+2}: invalid category`);const booking=get(r,'bookingurl'),directions=get(r,'directionsurl');if(!validUrl(booking)||!validUrl(directions))throw new Error(`Row ${i+2}: invalid link`);return {businessId,name,category:category as Category,phone:get(r,'phone'),booking,directions,artworkFilename:get(r,'artworkfilename')||businessId,artworkHasName:['yes','true','1'].includes(get(r,'artworkhasname').toLowerCase())}})}
 async function unpackZip(zip:File|null){if(!zip)return new Map<string,File>();if(zip.size>35*1024*1024)throw new Error('ZIP exceeds 35 MB.');const z=await JSZip.loadAsync(zip);const entries=Object.values(z.files).filter(f=>!f.dir&&!f.name.startsWith('__MACOSX/')&&!f.name.split('/').pop()?.startsWith('.'));if(entries.length>100)throw new Error('Maximum 100 images per ZIP.');const map=new Map<string,File>();const warnings:string[]=[];for(const entry of entries){const filename=entry.name.split('/').pop()||'';const ext=filename.split('.').pop()?.toLowerCase();const mime=ext==='jpg'||ext==='jpeg'?'image/jpeg':ext==='png'?'image/png':ext==='webp'?'image/webp':'';if(!mime){warnings.push(`${filename}: unsupported file`);continue}const bytes=await entry.async('uint8array');if(bytes.length>5*1024*1024){warnings.push(`${filename}: exceeds 5 MB`);continue}const key=fileKey(filename);if(map.has(key))throw new Error(`Duplicate ZIP filename: ${filename}`);map.set(key,new File([Uint8Array.from(bytes)],filename,{type:mime}))}setArtworkWarnings(warnings);return map}
 async function applySheet(existing:Listing[],rows:ImportRow[],zip:File|null){const uploads=await unpackZip(zip);const byId=new Map(existing.filter(x=>x.businessId).map(x=>[x.businessId!.toLowerCase(),x]));const byName=new Map(existing.filter(x=>!x.businessId).map(x=>[normalizedName(x.name),x]));const used=new Set<string>();const updated:Listing[]=[];for(const row of rows){const prior=byId.get(row.businessId.toLowerCase())||byName.get(normalizedName(row.name));if(prior)used.add(prior.id);const key=fileKey(row.artworkFilename);const file=key.includes('.')?uploads.get(key):['.webp','.jpg','.jpeg','.png'].map(ext=>uploads.get(key+ext)).find(Boolean);const image=file?await optimizeImage(file):prior?.image||'';if(!image)throw new Error(`${row.name} (${row.businessId}) has no matching artwork. Upload its image in the ZIP.`);updated.push({id:prior?.id||makeId(),businessId:row.businessId,name:row.name,category:row.category,phone:row.phone,booking:row.booking,directions:row.directions,artworkFilename:row.artworkFilename,artworkHasName:row.artworkHasName,image})}
  // Existing postcards absent from a replacement sheet are retained; new sheet order does not overwrite a user's drag order.
  const oldOrder=new Map(existing.map((x,i)=>[x.id,i]));updated.sort((a,b)=>(oldOrder.get(a.id)??Number.MAX_SAFE_INTEGER)-(oldOrder.get(b.id)??Number.MAX_SAFE_INTEGER));return [...updated,...existing.filter(x=>!used.has(x.id))];}
 async function createProperty(){if(busy)return;const clean=propertyName.trim(),loc=propertyLocation.trim(),id=slug(clean);if(!clean||!loc||!sheetLink.trim()||!zipFile){setNotice('Enter property name, location, Google Sheets link and artwork ZIP.');return}if(!id||hotelsRef.current.some(h=>h.id===id)){setNotice('A property with this name or URL already exists.');return}setBusy(true);try{const rows=await readSheet(sheetLink);const listings=await applySheet([],rows,zipFile);const h:Hotel={id,name:clean,location:loc,listings,mode:newPublished&&newDemo?'demo':'live',published:newPublished,sheetLink:sheetLink.trim()};editHotels(prev=>[...prev,h]);selectHotel(id);setModal(null);setPropertyName('');setPropertyLocation('');setSheetLink('');setZipFile(null);setNewPublished(false);setNewDemo(false);setNotice(`${clean} created with ${listings.length} postcards. Saving automatically.`)}catch(e){setNotice(e instanceof Error?e.message:'Could not create property')}finally{setBusy(false)}}
 async function syncProperty(){if(!active||busy)return;if(!sheetLink.trim()){setNotice('Paste the updated Google Sheets link.');return}setBusy(true);try{const id=active.id;const rows=await readSheet(sheetLink);const listings=await applySheet(active.listings,rows,zipFile);editHotels(prev=>prev.map(h=>h.id===id?{...h,listings,sheetLink:sheetLink.trim()}:h));setModal(null);setZipFile(null);setSheetLink('');setSelectedCard(null);setNotice(`Updated ${listings.length} postcards. Existing artwork was kept where no replacement was supplied.`)}catch(e){setNotice(e instanceof Error?e.message:'Import failed')}finally{setBusy(false)}}
 async function downloadQr(h:Hotel){setQrBusy(true);try{const r=await fetch(`/api/admin/qr?hotelId=${encodeURIComponent(h.id)}`,{cache:'no-store'});if(!r.ok){const d=await r.json();throw new Error(d.error||'QR unavailable')}const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`the-list-${h.id}-qr.png`;a.click();URL.revokeObjectURL(url)}catch(e){setNotice(e instanceof Error?e.message:'QR download failed')}finally{setQrBusy(false)}}
 async function emailQr(h:Hotel){if(!window.confirm(`Email QR for ${h.name} to both administrators?`))return;setEmailBusy(true);try{const r=await fetch('/api/admin/send-qr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hotelId:h.id})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Email failed');setNotice('QR email accepted for delivery.')}catch(e){setNotice(e instanceof Error?e.message:'Email failed')}finally{setEmailBusy(false)}}
 const pill=(published:boolean)=>({fontSize:11,borderRadius:20,padding:'5px 10px',color:published?'#cde5c7':'#d6c5ac',background:published?'#304435':'#3d342b'} as CSSProperties);
 return <main style={{minHeight:'100vh',background:'#151515',color:'#f5f1eb',fontFamily:'Arial,Helvetica,sans-serif',padding:'26px 18px 70px'}}><div style={{maxWidth:1400,margin:'0 auto'}}>
 <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap',borderBottom:'1px solid #373737',paddingBottom:20,marginBottom:26}}><div><div style={{fontFamily:'Georgia,serif',fontSize:30,letterSpacing:'.22em'}}>THE LIST</div><div style={{color:'#aaa',fontSize:10,letterSpacing:'.2em',marginTop:9}}>HOTEL MANAGEMENT · SHARED WORKSPACE</div></div>{approved&&<div style={{display:'flex',alignItems:'center',gap:16}}><span style={{color:'#bcb4a8',fontSize:12}}>{status==='saved'?'● Saved':status==='saving'?'◌ Saving…':status==='pending'?'◌ Changes pending':status==='loading'?'◌ Loading…':status==='conflict'?'⚠ Conflict':'⚠ Save error'}</span><button type='button' style={secondary} onClick={signOut}>SIGN OUT</button></div>}</header>
 {!approved?<section style={{...panel,maxWidth:420,margin:'70px auto'}}><h1 style={{fontFamily:'Georgia,serif',fontWeight:400,fontSize:29}}>Welcome back.</h1><p style={{color:'#aaa',fontSize:13,lineHeight:1.7}}>Private management for authorised partners. Sign in with your own credentials.</p><form onSubmit={login}><label style={label} htmlFor='admin-email'>EMAIL</label><input id='admin-email' type='email' required style={{...field,marginBottom:16}} value={email} onChange={e=>setEmail(e.target.value)} placeholder='Email address'/><label style={label}>PASSWORD</label><input type='password' required autoComplete='current-password' style={{...field,marginBottom:16}} value={password} onChange={e=>setPassword(e.target.value)}/>{authError&&<p style={{color:'#eaa',fontSize:13}}>{authError}</p>}<button type='submit' style={{...button,width:'100%'}}>ENTER DASHBOARD →</button></form></section>:
 <><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,flexWrap:'wrap',marginBottom:16}}><div><h1 style={{fontFamily:'Georgia,serif',fontSize:36,fontWeight:400,margin:'0 0 8px'}}>Our Properties</h1><p style={{fontSize:13,color:'#aaa',margin:0}}>Manage your hotel collection and postcard order.</p></div><button style={button} disabled={!readyRef.current||status==='conflict'} onClick={()=>{setModal('add');setArtworkWarnings([]);setNotice('')}}>+ ADD PROPERTY</button></div>
 {notice&&<p role='status' style={{background:'#302b25',border:'1px solid #625342',padding:13,borderRadius:7,color:'#f0e2ce'}}>{notice}</p>}
 {status==='conflict'&&<div style={{...panel,marginBottom:16}}><strong>Another administrator saved changes.</strong><p style={{fontSize:13,color:'#bbb'}}>Your unsaved changes remain visible here. To protect both versions, automatic saving is paused. Coordinate with the other administrator before reloading.</p><button style={secondary} onClick={()=>{if(window.confirm('Discard your unsaved changes and load the latest shared data?')){dirtyRef.current=false;setStatus('loading');void loadShared(true)}}}>DISCARD LOCAL CHANGES & RELOAD</button></div>}
 <section style={{...panel,marginBottom:18,padding:0,overflow:'hidden'}}><div style={{display:'flex',justifyContent:'space-between',padding:'17px 20px',borderBottom:'1px solid #383838'}}><strong style={{fontSize:15}}>Properties ({hotels.length})</strong><span style={{color:'#aaa',fontSize:12}}>Scroll to view all properties</span></div><div style={{maxHeight:280,overflowY:'auto'}}><div style={{minWidth:640}}><div style={{display:'grid',gridTemplateColumns:'2.4fr 1.4fr .6fr .8fr 1fr .6fr',padding:'12px 20px',color:'#aaa',fontSize:11,borderBottom:'1px solid #383838'}}><span>PROPERTY</span><span>LOCATION</span><span>CARDS</span><span>STATUS</span><span>VISIBILITY</span><span/></div>{hotels.map(h=><button key={h.id} onClick={()=>selectHotel(h.id)} style={{width:'100%',display:'grid',gridTemplateColumns:'2.4fr 1.4fr .6fr .8fr 1fr .6fr',textAlign:'left',alignItems:'center',gap:4,padding:'14px 20px',background:h.id===activeId?'#35302b':'transparent',color:'#f5f1eb',border:0,borderBottom:'1px solid #333',cursor:'pointer',fontSize:12}}><strong>{h.name}</strong><span style={{color:'#aaa'}}>{h.location}</span><span>{h.listings.length}</span><span><span style={pill(!!h.published)}>{h.published?'Live':'Dormant'}</span></span><span style={{color:'#bfb6aa'}}>{h.published&&h.mode==='demo'?'Demo gallery':h.published?'Unlisted':'—'}</span><span style={{color:'#e8dfd2'}}>OPEN ↗</span></button>)}{!hotels.length&&<p style={{padding:20,color:'#aaa'}}>No properties yet. Click Add Property to begin.</p>}</div></div></section>
 {active?<section style={{...panel,padding:0,overflow:'hidden'}}><div style={{padding:'18px 22px',display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',borderBottom:'1px solid #383838'}}><div><h2 style={{fontFamily:'Georgia,serif',fontWeight:400,fontSize:25,margin:'0 0 5px'}}>{active.name}</h2><span style={{fontSize:12,color:'#aaa'}}>{active.location} · /hotel/{active.id}</span></div><div style={{display:'flex',gap:9,flexWrap:'wrap'}}><button style={secondary} onClick={()=>{setSheetLink(active.sheetLink||'');setZipFile(null);setArtworkWarnings([]);setModal('sync')}}>REIMPORT SHEET + ZIP</button><button style={secondary} onClick={()=>setPreview(true)}>FULL HOTEL PREVIEW</button></div></div>
 <div style={{display:'grid',gridTemplateColumns:'minmax(0,1.5fr) minmax(260px,.8fr)',gap:18,padding:18}} className='admin-workspace'><div style={{minWidth:0}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><h3 style={{fontSize:17,fontWeight:500,margin:0}}>Cards ({active.listings.length})</h3><span style={{color:'#aaa',fontSize:12}}>Drag to reorder</span></div><div style={{maxHeight:610,overflowY:'auto'}}>{active.listings.map((item,i)=><div key={item.id} draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';setDragIndex(i)}} onDragOver={e=>{e.preventDefault();setDragOver(i)}} onDrop={e=>{e.preventDefault();if(dragIndex!==null&&dragIndex!==i)editActive(h=>({...h,listings:reorder(h.listings,dragIndex,i)}));setDragIndex(null);setDragOver(null)}} onDragEnd={()=>{setDragIndex(null);setDragOver(null)}} onClick={()=>setSelectedCard(item.id)} role='button' tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedCard(item.id)}}} style={{display:'flex',alignItems:'center',gap:12,marginBottom:9,padding:10,borderRadius:9,border:dragOver===i?'1px solid #e8dfd2':selected?.id===item.id?'1px solid #756956':'1px solid #3a3a3a',background:selected?.id===item.id?'#35302b':'#292929',cursor:'grab'}}><span aria-hidden='true' style={{fontSize:21,color:'#aaa'}}>⠿</span><span style={{fontSize:12,color:'#aaa',width:19}}>{i+1}</span>{item.image?<img src={item.image} alt='' style={{width:48,height:64,objectFit:'contain',background:'#191919',borderRadius:5}}/>:<div style={{width:48,height:64,background:'#111'}}/>}<div style={{minWidth:0,flex:1}}><div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div><div style={{fontSize:11,color:'#aaa',marginTop:6}}>{item.category} · ID {item.businessId||'legacy'}</div></div><span style={{color:'#b8ad9d',fontSize:11}}>PREVIEW</span></div>)}{!active.listings.length&&<p style={{color:'#aaa'}}>No cards imported yet.</p>}</div></div>
 <div style={{minWidth:0,borderLeft:'1px solid #383838',paddingLeft:18}}><h3 style={{fontSize:17,fontWeight:500,margin:'0 0 14px'}}>Card Preview</h3><div style={{margin:'0 auto',maxWidth:270,background:'#0f0f0f',border:'6px solid #494949',borderRadius:29,padding:7,boxShadow:'0 10px 32px #0008'}}><div style={{borderRadius:20,overflow:'hidden',aspectRatio:'9 / 16',background:'#1c1b19',position:'relative'}}>{selected?.image?<img src={selected.image} alt={selected.name+' artwork'} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<div style={{display:'grid',placeItems:'center',height:'100%',color:'#aaa'}}>Select a card</div>}<div style={{position:'absolute',top:10,left:12,color:'#fff',fontSize:10,textShadow:'0 1px 5px #000'}}>THE LIST</div></div></div><p style={{fontSize:12,color:'#aaa',textAlign:'center',marginTop:12}}>{selected?`${selected.name} · ${active.listings.findIndex(x=>x.id===selected.id)+1} of ${active.listings.length}`:'Click a card to preview it'}</p><p style={{fontSize:11,color:'#8f8f8f',textAlign:'center'}}>Artwork-only preview. Full Hotel Preview uses the existing guest layout.</p></div></div>
 <div style={{borderTop:'1px solid #383838',padding:'18px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:14}}><div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}><span style={{fontSize:12,color:'#c9c1b7'}}>PUBLISHING</span><select aria-label='Publishing status' style={{...field,width:'auto'}} value={active.published?'live':'dormant'} onChange={e=>editActive(h=>({...h,published:e.target.value==='live',mode:e.target.value==='live'?h.mode||'live':'live'}))}><option value='dormant'>Dormant</option><option value='live'>Live</option></select>{active.published&&<label style={{display:'flex',gap:7,alignItems:'center',fontSize:12}}><input type='checkbox' checked={active.mode==='demo'} onChange={e=>editActive(h=>({...h,mode:e.target.checked?'demo':'live'}))}/> Add to demo gallery</label>}</div><div style={{display:'flex',gap:9,flexWrap:'wrap'}}><button style={secondary} disabled={!active.published||status!=='saved'||qrBusy} onClick={()=>void downloadQr(active)}>DOWNLOAD QR</button><button style={secondary} disabled={!active.published||status!=='saved'||emailBusy} onClick={()=>void emailQr(active)}>{emailBusy?'SENDING…':'EMAIL QR'}</button><button style={secondary} onClick={()=>{void navigator.clipboard.writeText(`${window.location.origin}/hotel/${active.id}`);setNotice('Hotel link copied.')}}>COPY LINK</button><Link href={`/hotel/${active.id}`} target='_blank' style={{...secondary,textDecoration:'none'}}>OPEN HOTEL ↗</Link></div></div></section>:<section style={panel}><h2 style={{fontFamily:'Georgia,serif',fontWeight:400}}>Select a property</h2><p style={{fontSize:13,color:'#aaa'}}>Choose a property above to manage its cards and publishing.</p></section>}
 <style>{`@media(max-width:800px){.admin-workspace{grid-template-columns:1fr!important}.admin-workspace>div:last-child{border-left:0!important;border-top:1px solid #383838;padding-left:0!important;padding-top:20px}}`}</style>
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

 {modal&&<div role='dialog' aria-modal='true' aria-label={modal==='add'?'Add property':'Reimport property'} style={{position:'fixed',inset:0,zIndex:10010,background:'#000c',display:'grid',placeItems:'center',padding:16,overflowY:'auto'}}><section style={{...panel,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><h2 style={{fontFamily:'Georgia,serif',fontWeight:400,fontSize:26,margin:'0 0 20px'}}>{modal==='add'?'Add Property':'Update Property'}</h2><button style={secondary} onClick={()=>setModal(null)}>✕</button></div>
 {modal==='add'&&<><label style={label}>PROPERTY NAME</label><input style={{...field,marginBottom:16}} value={propertyName} onChange={e=>setPropertyName(e.target.value)} placeholder='e.g. Puente Romano'/><label style={label}>LOCATION</label><input style={{...field,marginBottom:16}} value={propertyLocation} onChange={e=>setPropertyLocation(e.target.value)} placeholder='e.g. Marbella, Spain'/></>}
 <label style={label}>GOOGLE SHEETS PUBLISHED CSV LINK</label><input style={{...field,marginBottom:16}} type='url' value={sheetLink} onChange={e=>setSheetLink(e.target.value)} placeholder='https://docs.google.com/spreadsheets/...'/><label style={label}>ARTWORK ZIP {modal==='sync'?'(OPTIONAL — EXISTING ARTWORK IS PRESERVED)':''}</label><input style={{...field,marginBottom:12}} type='file' accept='.zip,application/zip' onChange={e=>setZipFile(e.target.files?.[0]||null)}/><p style={{fontSize:12,color:'#aaa',lineHeight:1.6}}>Match artwork filenames to Business ID (5501.webp, 5502.jpg). JPG, PNG or WebP, max 5 MB each, max 100 images per ZIP. Artwork is converted to 1080 × 1920 without cropping or stretching.</p>
 {modal==='add'&&<><label style={label}>PUBLISHING</label><label style={{display:'block',marginBottom:10,fontSize:13}}><input type='radio' checked={!newPublished} onChange={()=>{setNewPublished(false);setNewDemo(false)}}/> Dormant — unpublished</label><label style={{display:'block',marginBottom:10,fontSize:13}}><input type='radio' checked={newPublished} onChange={()=>setNewPublished(true)}/> Live — publish hotel URL and QR</label>{newPublished&&<label style={{display:'block',marginBottom:14,fontSize:13}}><input type='checkbox' checked={newDemo} onChange={e=>setNewDemo(e.target.checked)}/> Add to public demo gallery</label>}</>}
 {notice&&<p role='alert' style={{color:'#e5b994',fontSize:12}}>{notice}</p>}{artworkWarnings.length>0&&<p style={{color:'#e5b994',fontSize:12}}>{artworkWarnings.join(' · ')}</p>}
 <div style={{display:'flex',gap:9,flexWrap:'wrap',marginTop:20}}><button style={button} disabled={busy||status==='conflict'} onClick={()=>void(modal==='add'?createProperty():syncProperty())}>{busy?'PROCESSING…':modal==='add'?'CREATE PROPERTY':'REIMPORT & UPDATE'}</button><button style={secondary} disabled={busy} onClick={()=>setModal(null)}>CANCEL</button></div></section></div>}
 </>}
 </div></main>
}
