/* ═══════════════════════════════════════════════════════════════
   Türkiye Gezi Atlası — Şehir Oyunu Motoru
   Piksel-art, karo (tile) tabanlı, yürünebilir şehir sahneleri.
   Bağımlılıklar (index.html ana betiğinden): NOKTALAR, REHBER,
   bellek, ziyaretEt, rehberGoster, hareketAz, VERI
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── sabitler ── */
const KARO = 16;                 // karo boyutu (piksel)
const GORUS_W = 288, GORUS_H = 192; // sanal kamera çözünürlüğü
const HIZ = 76;                  // karakter hızı px/sn
const ETKI_MESAFE = 30;          // etkileşim yarıçapı

/* ── palet ── */
const PAL = {
  cim1:'#7FA05A', cim2:'#779655',
  yol:'#C9BFA8', yolK:'#B7AB90',
  kum:'#D8C9A8',
  su1:'#4E7F9E', su2:'#457493', kopuk:'#BFD9E2',
  agacG:'#3E6B3A', agacA:'#4F8148', govde:'#6E4F30',
  duvar:'#E4D7BE', duvarG:'#CBBB9C', cati:'#A65B4B',
  tas:'#B9AFA0', tasK:'#948B7D',
  altin:'#D9A43B', kirmizi:'#B03A2E', gri:'#8E8A80', griK:'#6F6B62',
  pembe:'#C98D7C', pembeK:'#B07361',
  beyaz:'#F2EFE6', pencere:'#3A4A55', isik:'#F4D06F',
  golge:'rgba(30,40,30,.25)'
};

/* ── yardımcılar ── */
function ofg(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.imageSmoothingEnabled=false; return [c,g]; }
function R(g,x,y,w,h,renk){ g.fillStyle=renk; g.fillRect(x|0,y|0,w|0,h|0); }

/* ── karakter sprite'ları (12x17, string haritalar) ──
   H şapka, S ten, G mont, B çanta, P pantolon, K kol */
const KFR = {
  asagi0:[
  "...HHHHHH...",
  "..HHHHHHHH..",
  "...SSSSSS...",
  "...S.SS.S...",
  "...SSSSSS...",
  "..GGGGGGGG..",
  ".KGGGGGGGGK.",
  ".KGGGGGGGGK.",
  ".KGGGGGGGGK.",
  "..GGGGGGGG..",
  "...PPPPPP...",
  "...PP..PP...",
  "...PP..PP...",
  "...PP..PP...",
  "..PPP..PPP.."],
  asagi1:[
  "...HHHHHH...",
  "..HHHHHHHH..",
  "...SSSSSS...",
  "...S.SS.S...",
  "...SSSSSS...",
  "..GGGGGGGG..",
  ".KGGGGGGGGK.",
  ".KGGGGGGGGK.",
  ".KGGGGGGGGK.",
  "..GGGGGGGG..",
  "...PPPPPP...",
  "...PP..PP...",
  "..PP....PP..",
  "..PP....PP..",
  ".PPP....PPP."],
  yan0:[
  "...HHHHHH...",
  "..HHHHHHHH..",
  "....SSSS....",
  "....SS.S....",
  "....SSSS....",
  ".BBGGGGGG...",
  ".BBGGGGGGK..",
  ".BBGGGGGGK..",
  ".BBGGGGGGK..",
  "..GGGGGG....",
  "...PPPP.....",
  "...PPPP.....",
  "...PP.PP....",
  "...PP.PP....",
  "..PPP.PPP..."],
  yan1:[
  "...HHHHHH...",
  "..HHHHHHHH..",
  "....SSSS....",
  "....SS.S....",
  "....SSSS....",
  ".BBGGGGGG...",
  ".BBGGGGGGK..",
  ".BBGGGGGGK..",
  ".BBGGGGGGK..",
  "..GGGGGG....",
  "...PPPP.....",
  "..PPPPPP....",
  ".PP...PPP...",
  ".PP....PP...",
  "PPP....PPP.."],
  yukari0:[
  "...HHHHHH...",
  "..HHHHHHHH..",
  "...HHHHHH...",
  "..BBBBBBBB..",
  "..BBBBBBBB..",
  "..BBBBBBBB..",
  ".KBBBBBBBBK.",
  ".KBBBBBBBBK.",
  ".KGGGGGGGGK.",
  "..GGGGGGGG..",
  "...PPPPPP...",
  "...PP..PP...",
  "...PP..PP...",
  "...PP..PP...",
  "..PPP..PPP.."],
  yukari1:null
};
KFR.yukari1 = KFR.yukari0.map((s,i)=> i>=11 ? KFR.asagi1[i] : s);
const KRENK = {H:'#B03A2E', S:'#EBC9A4', G:'#2E8B6A', B:'#8A6238', P:'#33424E', K:'#257258'};
function spriteCiz(harita){
  const [c,g]=ofg(12,15+2);
  harita.forEach((satir,y)=>{ [...satir].forEach((ch,x)=>{ if(KRENK[ch]) R(g,x,y,1,1,KRENK[ch]); }); });
  return c;
}
const SPR = {};
Object.keys(KFR).forEach(k=>{ SPR[k]=spriteCiz(KFR[k]); });

/* ── bina çizimleri (offscreen, prosedürel piksel-art) ── */
function binaKubbe(g,cx,ty,r,renk){ g.fillStyle=renk; g.beginPath(); g.arc(cx,ty+r,r,Math.PI,0); g.fill(); }
function minare(g,x,y,h){ R(g,x,y,3,h,PAL.beyaz); R(g,x-1,y+4,5,2,PAL.gri); g.fillStyle=PAL.gri; g.beginPath(); g.moveTo(x-1,y); g.lineTo(x+1.5,y-5); g.lineTo(x+4,y); g.fill(); }
function pencereSira(g,x,y,adet,aralik){ for(let i=0;i<adet;i++) R(g,x+i*aralik,y,3,5,PAL.pencere); }

function cizAyasofya(){
  const [c,g]=ofg(64,52);
  R(g,8,26,48,24,PAL.pembe); R(g,8,26,48,3,PAL.pembeK);
  R(g,14,18,36,10,PAL.pembe);
  binaKubbe(g,32,8,13,PAL.pembeK);
  binaKubbe(g,18,20,7,PAL.pembeK); binaKubbe(g,46,20,7,PAL.pembeK);
  pencereSira(g,14,32,6,7); pencereSira(g,16,40,5,7);
  R(g,29,38,6,12,PAL.pencere);
  minare(g,3,14,36); minare(g,58,14,36);
  minare(g,10,10,18); minare(g,51,10,18);
  return c;
}
function cizSultanahmet(){
  const [c,g]=ofg(64,54);
  R(g,10,30,44,22,PAL.duvar); R(g,10,30,44,3,PAL.duvarG);
  R(g,16,22,32,10,PAL.duvar);
  binaKubbe(g,32,10,12,PAL.gri);
  binaKubbe(g,20,22,6,PAL.gri); binaKubbe(g,44,22,6,PAL.gri);
  binaKubbe(g,26,17,5,PAL.gri); binaKubbe(g,38,17,5,PAL.gri);
  pencereSira(g,15,36,7,6); R(g,29,42,6,10,PAL.pencere);
  minare(g,2,12,40); minare(g,59,12,40);
  minare(g,8,18,30); minare(g,53,18,30);
  minare(g,14,24,22); minare(g,47,24,22);
  return c;
}
function cizTopkapi(){
  const [c,g]=ofg(60,46);
  R(g,6,20,48,26,PAL.tas); R(g,6,20,48,3,PAL.tasK);
  R(g,12,26,8,8,PAL.pencere); R(g,40,26,8,8,PAL.pencere);
  R(g,26,26,8,20,PAL.griK); R(g,27,28,6,10,PAL.pencere);
  R(g,2,10,10,36,PAL.tasK); g.fillStyle=PAL.cati; g.beginPath(); g.moveTo(1,10); g.lineTo(7,2); g.lineTo(13,10); g.fill();
  R(g,48,10,10,36,PAL.tasK); g.beginPath(); g.moveTo(47,10); g.lineTo(53,2); g.lineTo(59,10); g.fill();
  R(g,5,16,4,6,PAL.pencere); R(g,51,16,4,6,PAL.pencere);
  return c;
}
function cizKapalicarsi(){
  const [c,g]=ofg(64,40);
  R(g,4,14,56,26,PAL.duvar);
  for(let i=0;i<4;i++) binaKubbe(g,12+i*13.4,8,7,PAL.cati);
  for(let i=0;i<5;i++){ R(g,8+i*11,24,7,16,PAL.pencere); g.fillStyle=PAL.duvarG; g.beginPath(); g.arc(11.5+i*11,24,3.5,Math.PI,0); g.fill(); }
  R(g,4,14,56,3,PAL.duvarG);
  return c;
}
function cizGalata(){
  const [c,g]=ofg(34,62);
  R(g,11,20,12,40,PAL.tas);
  R(g,10,18,14,3,PAL.tasK);
  R(g,9,12,16,7,PAL.tas); pencereSira(g,10,14,3,5);
  g.fillStyle=PAL.cati; g.beginPath(); g.moveTo(7,12); g.lineTo(17,1); g.lineTo(27,12); g.fill();
  R(g,13,26,3,5,PAL.pencere); R(g,18,26,3,5,PAL.pencere);
  R(g,13,36,3,5,PAL.pencere); R(g,18,36,3,5,PAL.pencere);
  R(g,14,50,6,10,PAL.pencere);
  return c;
}
function cizDolmabahce(){
  const [c,g]=ofg(72,36);
  R(g,2,10,68,26,PAL.beyaz);
  R(g,2,10,68,3,PAL.gri);
  R(g,30,4,12,32,PAL.beyaz); R(g,30,4,12,3,PAL.gri);
  pencereSira(g,6,16,5,5); pencereSira(g,46,16,5,5);
  pencereSira(g,6,26,5,5); pencereSira(g,46,26,5,5);
  R(g,33,10,6,5,PAL.pencere); R(g,33,20,6,16,PAL.pencere);
  R(g,0,32,72,4,PAL.tasK);
  return c;
}
function cizKizkulesi(){
  const [c,g]=ofg(30,46);
  R(g,2,38,26,8,PAL.tas);
  R(g,10,16,10,24,PAL.beyaz);
  R(g,8,14,14,3,PAL.gri);
  R(g,11,8,8,7,PAL.beyaz);
  g.fillStyle=PAL.cati; g.beginPath(); g.moveTo(10,8); g.lineTo(15,1); g.lineTo(20,8); g.fill();
  R(g,13,20,4,5,PAL.pencere); R(g,13,30,4,8,PAL.pencere);
  return c;
}
function cizVapur(){
  const [c,g]=ofg(40,18);
  R(g,2,10,36,6,'#3A4A55'); R(g,0,12,40,3,'#2C3944');
  R(g,8,4,22,7,PAL.beyaz);
  R(g,12,1,4,4,PAL.kirmizi); R(g,22,1,4,4,PAL.kirmizi);
  pencereSira(g,10,6,4,5);
  return c;
}
function cizAgac(){
  const [c,g]=ofg(16,20);
  R(g,7,13,3,6,PAL.govde);
  g.fillStyle=PAL.agacG; g.beginPath(); g.arc(8,8,7,0,7); g.fill();
  g.fillStyle=PAL.agacA; g.beginPath(); g.arc(6,6,4,0,7); g.fill();
  return c;
}
const AGAC = cizAgac(), VAPUR = cizVapur();

/* ── İstanbul sahnesi ── */
function istanbulSahne(){
  const W=64, H=44;
  const sahne = {
    ad:'İSTANBUL', pk:'34', W, H,
    dogus:{x:30*KARO, y:29*KARO},
    zemin:null, engel:null, binalar:[], agaclar:[], dekor:[]
  };
  /* zemin: 0 çim,1 çim2,2 yol,3 kum,4 su */
  const z = new Array(W*H).fill(0);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if((x+y)%2===0) z[y*W+x]=1;
  const su=(x,y)=>{ if(x>=0&&x<W&&y>=0&&y<H) z[y*W+x]=4; };
  const kum=(x,y)=>{ if(x>=0&&x<W&&y>=0&&y<H) z[y*W+x]=3; };
  const yol=(x,y)=>{ if(x>=0&&x<W&&y>=0&&y<H) z[y*W+x]=2; };
  /* deniz: alt bant + sağda Boğaz körfezi */
  for(let y=34;y<H;y++) for(let x=0;x<W;x++) su(x,y);
  for(let y=6;y<34;y++) for(let x=56;x<W;x++) su(x,y);
  for(let y=20;y<34;y++) su(55,y);
  /* kıyı kumu */
  for(let x=0;x<55;x++) kum(x,33);
  for(let y=6;y<20;y++) kum(55,y);
  for(let y=20;y<33;y++) kum(54,y);
  /* yollar: meydan + arterler */
  for(let x=6;x<52;x++){ yol(x,28); yol(x,29); }
  for(let y=12;y<30;y++){ yol(16,y); yol(17,y); }
  for(let y=8;y<30;y++){ yol(36,y); yol(37,y); }
  for(let x=17;x<37;x++){ yol(x,12); yol(x,13); }
  for(let x=37;x<50;x++){ yol(x,20); yol(x,21); }
  /* meydan taşı */
  for(let y=24;y<28;y++) for(let x=20;x<32;x++) yol(x,y);
  sahne.zemin=z;
  /* binalar: {n REHBER adı, img, x,y (px sol-üst), etiket ofseti} */
  const B=(ad,img,tx,ty)=>({ad, img, x:tx*KARO, y:ty*KARO});
  sahne.binalar=[
    B('Ayasofya',        cizAyasofya(),     10, 14),
    B('Sultanahmet Camii',cizSultanahmet(), 22, 20),
    B('Topkapı Sarayı',  cizTopkapi(),      40,  6),
    B('Kapalıçarşı',     cizKapalicarsi(),   5,  4),
    B('Galata Kulesi',   cizGalata(),       46, 12),
    B('Dolmabahçe Sarayı',cizDolmabahce(),  38, 24),
    B('Kız Kulesi',      cizKizkulesi(),    58, 36)
  ];
  /* ağaçlar */
  sahne.agaclar=[[3,17],[3,24],[8,20],[13,9],[20,16],[33,16],[34,5],[3,30],[12,31],[42,17],[52,8],[50,22],[19,31],[44,31],[28,15]]
    .map(([tx,ty])=>({x:tx*KARO, y:ty*KARO}));
  /* dekor: vapur */
  sahne.dekor=[{img:VAPUR, x:14*KARO, y:37*KARO, salla:true},{img:VAPUR, x:40*KARO, y:40*KARO, salla:true}];
  /* engel haritası */
  const e = new Set();
  const blokla=(px,py,w,h)=>{ const x1=px/KARO|0, y1=py/KARO|0, x2=(px+w-1)/KARO|0, y2=(py+h-1)/KARO|0;
    for(let ty=y1;ty<=y2;ty++) for(let tx=x1;tx<=x2;tx++) e.add(ty*W+tx); };
  for(let i=0;i<z.length;i++) if(z[i]===4) e.add(i);
  sahne.binalar.forEach(b=>{ if(b.ad!=='Kız Kulesi') blokla(b.x+2, b.y+b.img.height*0.45, b.img.width-4, b.img.height*0.55); });
  sahne.agaclar.forEach(a=>{ e.add(((a.y/KARO|0)+1)*W + (a.x/KARO|0)); });
  sahne.engel=e;
  return sahne;
}

const SAHNELER = { '34': istanbulSahne };
window.OYUN_SAHNELER = SAHNELER;

/* ── oyun durumu ── */
let tuval=null, ctx=null, aktif=false, sahne=null, rafId=null, sonZaman=0;
let oyuncu={x:0,y:0,yon:'asagi',bakis:1,kare:0,karebZaman:0,yuruyor:false};
let girdiler={u:false,d:false,l:false,r:false};
let joyVek={x:0,y:0}, joyAktif=false;
let yakinBina=null, olcek=2, t=0;

function oyunBaslat(pk){
  const kur = SAHNELER[pk];
  if(!kur) return;
  sahne = kur();
  const ov=document.getElementById('oyun');
  tuval=document.getElementById('oyun-tuval');
  ctx=tuval.getContext('2d');
  document.getElementById('oyun-sehir').textContent = sahne.ad;
  oyuncu.x=sahne.dogus.x; oyuncu.y=sahne.dogus.y;
  oyuncu.yon='asagi'; oyuncu.yuruyor=false;
  boyutla();
  ov.classList.add('acik');
  ov.setAttribute('aria-hidden','false');
  sayacTazele();
  aktif=true; sonZaman=performance.now();
  cancelAnimationFrame(rafId);
  rafId=requestAnimationFrame(dongu);
}
window.oyunBaslat = oyunBaslat;
/* test kancası */
window.__oyunTest = {
  konum:(x,y)=>{ oyuncu.x=x; oyuncu.y=y; },
  durum:()=>({ x:oyuncu.x|0, y:oyuncu.y|0, yakin: yakinBina ? yakinBina.ad : null, aktif })
};

function oyunDur(){
  aktif=false;
  cancelAnimationFrame(rafId);
  const ov=document.getElementById('oyun');
  ov.classList.remove('acik');
  ov.setAttribute('aria-hidden','true');
}

function boyutla(){
  const dpr=1;
  const vw=innerWidth, vh=innerHeight;
  olcek=Math.max(2, Math.min(6, Math.floor(Math.min(vw/GORUS_W, vh/GORUS_H))));
  tuval.width=Math.ceil(vw/olcek); tuval.height=Math.ceil(vh/olcek);
  tuval.style.width=vw+'px'; tuval.style.height=vh+'px';
  ctx.imageSmoothingEnabled=false;
}
addEventListener('resize', ()=>{ if(aktif) boyutla(); });

/* ── giriş: klavye ── */
addEventListener('keydown', e=>{
  if(!aktif) return;
  const rp=document.getElementById('rehber-panel');
  if(rp && rp.classList.contains('acik')) return;
  const k=e.key.toLowerCase();
  if(k==='arrowup'||k==='w') girdiler.u=true;
  else if(k==='arrowdown'||k==='s') girdiler.d=true;
  else if(k==='arrowleft'||k==='a') girdiler.l=true;
  else if(k==='arrowright'||k==='d') girdiler.r=true;
  else if(k==='e'||k===' '||k==='enter'){ if(yakinBina) etkiles(yakinBina); }
  else if(k==='escape'){ oyunDur(); return; }
  else return;
  e.preventDefault();
});
addEventListener('keyup', e=>{
  const k=e.key.toLowerCase();
  if(k==='arrowup'||k==='w') girdiler.u=false;
  if(k==='arrowdown'||k==='s') girdiler.d=false;
  if(k==='arrowleft'||k==='a') girdiler.l=false;
  if(k==='arrowright'||k==='d') girdiler.r=false;
});

/* ── giriş: joystick ── */
function joystickKur(){
  const alan=document.getElementById('joystick');
  const top=document.getElementById('joystick-top');
  let pid=null, cx=0, cy=0;
  const YARICAP=34;
  alan.addEventListener('pointerdown', e=>{
    pid=e.pointerId; alan.setPointerCapture(pid);
    const r=alan.getBoundingClientRect(); cx=r.left+r.width/2; cy=r.top+r.height/2;
    surukle(e);
  });
  alan.addEventListener('pointermove', e=>{ if(e.pointerId===pid) surukle(e); });
  const birak=e=>{ if(e.pointerId!==pid) return; pid=null; joyVek={x:0,y:0}; joyAktif=false; top.style.transform='translate(0,0)'; };
  alan.addEventListener('pointerup', birak);
  alan.addEventListener('pointercancel', birak);
  function surukle(e){
    let dx=e.clientX-cx, dy=e.clientY-cy;
    const m=Math.hypot(dx,dy)||1;
    const s=Math.min(m,YARICAP);
    dx=dx/m*s; dy=dy/m*s;
    top.style.transform='translate('+dx+'px,'+dy+'px)';
    joyVek={x:dx/YARICAP, y:dy/YARICAP};
    joyAktif=Math.hypot(joyVek.x,joyVek.y)>0.18;
  }
}
joystickKur();
document.getElementById('oyun-cik').addEventListener('click', oyunDur);
document.getElementById('oyun-etkile').addEventListener('click', ()=>{ if(yakinBina) etkiles(yakinBina); });

/* ── etkileşim ── */
function etkiles(b){
  const n = REHBER.find(r=>r.ad===b.ad && r.pk===sahne.pk);
  if(!n) return;
  const nk = NOKTALAR.find(p=>p.n===n);
  if(nk) ziyaretEt(nk);
  const komsu = NOKTALAR.filter(p=>p.pk===sahne.pk).map(p=>({n:p.n, km:null}));
  rehberGoster(n, null, komsu);
  sayacTazele();
  sehirTamamKontrol();
}
function ziyaretliMi(ad){
  return bellek.yerler.includes(sahne.pk+'|'+ad);
}
function sayacTazele(){
  const top=sahne.binalar.length;
  const g=sahne.binalar.filter(b=>ziyaretliMi(b.ad)).length;
  document.getElementById('oyun-say').textContent = g+'/'+top;
}
function sehirTamamKontrol(){
  const hepsi=sahne.binalar.every(b=>ziyaretliMi(b.ad));
  const anahtar='sehir-tamam-'+sahne.pk;
  if(hepsi && !localStorage.getItem(anahtar)){
    try{ localStorage.setItem(anahtar,'1'); }catch(e){}
    const t=document.getElementById('rozet-toast');
    document.getElementById('rozet-toast-ikon').textContent='🏙️';
    document.getElementById('rozet-toast-metin').textContent=sahne.ad+' tamamlandı — tüm yerleri gezdin!';
    t.classList.add('goster');
    setTimeout(()=>t.classList.remove('goster'), 3200);
  }
}

/* ── oyun döngüsü ── */
function dongu(zaman){
  if(!aktif) return;
  const dt=Math.min(0.05,(zaman-sonZaman)/1000);
  sonZaman=zaman; t+=dt;
  guncelle(dt);
  cizSahne();
  rafId=requestAnimationFrame(dongu);
}

function guncelle(dt){
  let vx=0, vy=0;
  if(girdiler.l) vx-=1; if(girdiler.r) vx+=1;
  if(girdiler.u) vy-=1; if(girdiler.d) vy+=1;
  if(joyAktif){ vx=joyVek.x; vy=joyVek.y; }
  const m=Math.hypot(vx,vy);
  oyuncu.yuruyor = m>0.15;
  if(oyuncu.yuruyor){
    vx/=Math.max(1,m); vy/=Math.max(1,m);
    if(Math.abs(vx)>Math.abs(vy)){ oyuncu.yon='yan'; oyuncu.bakis=vx>0?1:-1; }
    else oyuncu.yon = vy>0?'asagi':'yukari';
    const nx=oyuncu.x+vx*HIZ*dt, ny=oyuncu.y+vy*HIZ*dt;
    if(!carpiyor(nx,oyuncu.y)) oyuncu.x=nx;
    if(!carpiyor(oyuncu.x,ny)) oyuncu.y=ny;
    oyuncu.x=Math.max(6,Math.min(sahne.W*KARO-6,oyuncu.x));
    oyuncu.y=Math.max(8,Math.min(sahne.H*KARO-4,oyuncu.y));
    oyuncu.karebZaman+=dt;
    if(oyuncu.karebZaman>0.14){ oyuncu.kare=1-oyuncu.kare; oyuncu.karebZaman=0; }
  } else oyuncu.kare=0;
  /* yakın bina */
  let enYakin=null, enK=ETKI_MESAFE;
  sahne.binalar.forEach(b=>{
    const bx=b.x+b.img.width/2, by=b.y+b.img.height*0.8;
    const d=Math.hypot(oyuncu.x-bx, oyuncu.y-by) - Math.max(b.img.width,b.img.height)*0.25;
    if(d<enK){ enK=d; enYakin=b; }
  });
  if(enYakin!==yakinBina){
    yakinBina=enYakin;
    const et=document.getElementById('oyun-etkile');
    if(yakinBina){
      document.getElementById('oyun-etkile-ad').textContent=yakinBina.ad;
      et.classList.remove('gizli');
    } else et.classList.add('gizli');
  }
}
function carpiyor(px,py){
  /* ayak kutusu */
  for(const [ox,oy] of [[-4,-2],[4,-2],[-4,3],[4,3]]){
    const tx=(px+ox)/KARO|0, ty=(py+oy)/KARO|0;
    if(sahne.engel.has(ty*sahne.W+tx)) return true;
  }
  return false;
}

/* ── çizim ── */
function cizSahne(){
  const vw=tuval.width, vh=tuval.height;
  let kx=Math.round(oyuncu.x-vw/2), ky=Math.round(oyuncu.y-vh/2-6);
  kx=Math.max(0,Math.min(sahne.W*KARO-vw,kx));
  ky=Math.max(0,Math.min(sahne.H*KARO-vh,ky));
  /* zemin */
  const x1=kx/KARO|0, y1=ky/KARO|0, x2=Math.min(sahne.W-1,(kx+vw)/KARO+1|0), y2=Math.min(sahne.H-1,(ky+vh)/KARO+1|0);
  for(let ty=y1;ty<=y2;ty++) for(let tx=x1;tx<=x2;tx++){
    const tip=sahne.zemin[ty*sahne.W+tx];
    const px=tx*KARO-kx, py=ty*KARO-ky;
    if(tip===4){
      const f=Math.sin(t*1.4+tx*0.7+ty*0.5)>0.4;
      R(ctx,px,py,KARO,KARO, f?PAL.su2:PAL.su1);
      if(Math.sin(t*0.9+tx*1.3+ty)>0.93) R(ctx,px+4,py+7,5,1,PAL.kopuk);
    }
    else if(tip===3) R(ctx,px,py,KARO,KARO,PAL.kum);
    else if(tip===2){ R(ctx,px,py,KARO,KARO,PAL.yol); if((tx+ty)%3===0) R(ctx,px+6,py+9,3,2,PAL.yolK); }
    else R(ctx,px,py,KARO,KARO, tip===1?PAL.cim2:PAL.cim1);
  }
  /* dekor (vapurlar) */
  sahne.dekor.forEach(d=>{
    const sal=d.salla?Math.sin(t*2+d.x)*1.5:0;
    ctx.drawImage(d.img, Math.round(d.x-kx), Math.round(d.y-ky+sal));
  });
  /* çizim sırası: y'ye göre binalar+ağaçlar+oyuncu */
  const nesneler=[];
  sahne.binalar.forEach(b=>nesneler.push({y:b.y+b.img.height, ciz:()=>{
    ctx.fillStyle=PAL.golge; ctx.fillRect(Math.round(b.x-kx)+3, Math.round(b.y+b.img.height-ky)-3, b.img.width-6, 4);
    ctx.drawImage(b.img, Math.round(b.x-kx), Math.round(b.y-ky));
    /* etiket + durum */
    const bx=Math.round(b.x-kx+b.img.width/2);
    const by=Math.round(b.y-ky)-4;
    const zy=ziyaretliMi(b.ad);
    if(yakinBina===b){
      const s=Math.sin(t*6)*1.5;
      ctx.fillStyle='#FBFAF6'; ctx.font='7px monospace'; ctx.textAlign='center';
      ctx.fillStyle=zy?'#57BD96':'#F4D06F';
      ctx.font='bold 9px monospace';
      ctx.fillText(zy?'✓':'!', bx, by-3+s);
    } else if(zy){
      ctx.fillStyle='#57BD96'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
      ctx.fillText('✓', bx, by);
    }
  }}));
  sahne.agaclar.forEach(a=>nesneler.push({y:a.y+20, ciz:()=>{ ctx.drawImage(AGAC, Math.round(a.x-kx), Math.round(a.y-ky)); }}));
  nesneler.push({y:oyuncu.y+8, ciz:()=>{
    const kareAd = oyuncu.yon + (oyuncu.yuruyor?oyuncu.kare:0);
    const spr=SPR[kareAd]||SPR.asagi0;
    const px=Math.round(oyuncu.x-kx), py=Math.round(oyuncu.y-ky);
    ctx.fillStyle=PAL.golge; ctx.fillRect(px-5,py+6,10,3);
    if(oyuncu.yon==='yan' && oyuncu.bakis<0){
      ctx.save(); ctx.translate(px,0); ctx.scale(-1,1);
      ctx.drawImage(spr,-6,py-8); ctx.restore();
    } else ctx.drawImage(spr,px-6,py-8);
  }});
  nesneler.sort((a,b)=>a.y-b.y).forEach(n=>n.ciz());
  /* gece tonu */
  if(document.documentElement.classList.contains('gece')){
    ctx.fillStyle='rgba(12,22,40,.38)'; ctx.fillRect(0,0,vw,vh);
  }
}
})();
