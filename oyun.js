/* ═══════════════════════════════════════════════════════════════
   Türkiye Gezi Atlası — Şehir Oyunu Motoru v2
   Gerçek CC0 piksel-art varlıklarıyla (Ninja Adventure Asset Pack,
   Pixel-boy & AAA — bkz. THIRD-PARTY-NOTICES.md) yürünebilir
   şehir sahneleri.
   Bağımlılıklar (index.html): NOKTALAR, REHBER, bellek, ziyaretEt,
   rehberGoster, hareketAz, VERI
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const KARO = 64;
const HIZ = 230;
const ETKI_MESAFE = 100;

/* ── varlıklar ── */
const IMG = {};
let varliklarHazir = false;
function varlikYukle(){
  if(varliklarHazir) return Promise.resolve();
  const dosyalar = { taban:'taban', oyuncu:'oyuncu', objeler:'objeler', tutam:'tutam', evler:'evler' };
  return Promise.all(Object.entries(dosyalar).map(([ad,dosya])=>new Promise((res,rej)=>{
    const im = new Image();
    im.onload = ()=>{ IMG[ad]=im; res(); };
    im.onerror = rej;
    im.src = 'assets/oyun/'+dosya+'.png';
  }))).then(()=>{ varliklarHazir = true; });
}

/* taban.png sırası */
const T_SU=0, T_KIYI_UST=1, T_KIYI_SOL=2, T_KOSE=3, T_CIM=[4,5,6], T_TOPRAK=7, T_KUM=8, T_CIMDUZ=9;

/* objeler.png (128px kare): 0 ağaç, 1 koyu ağaç, 2 büyük ağaç, 3 kütük, 4 kaya, 5 heykel, 6 heykel2, 7 kurbağa */
const OBJ = { agac:0, agacKoyu:1, agacBuyuk:2, kutuk:3, kaya:4, heykel:5, heykel2:6, kurbaga:7 };

/* evler.png kaynak dikdörtgenleri (16px sanat) */
const EV = {
  kirmiziTapinak:{sx:192,sy:0,w:64,h:48},
  dukkan:{sx:256,sy:0,w:56,h:48},
  koyuKonak:{sx:312,sy:0,w:72,h:48},
  tasEv:{sx:384,sy:0,w:56,h:48},
  ahsapEv:{sx:440,sy:0,w:56,h:48},
  evA:{sx:0,sy:0,w:64,h:48},
  kule:{sx:304,sy:48,w:48,h:96},
  buyukKonak:{sx:400,sy:112,w:64,h:112},
  beyazKubbe:{sx:96,sy:168,w:56,h:48},
  pazar:{sx:256,sy:208,w:64,h:48}
};

/* ── deterministik gürültü ── */
function kar(x,y){ let n=(x*374761393 + y*668265263)|0; n=(n^(n>>13))*1274126177|0; return ((n^(n>>16))>>>0)/4294967295; }

/* ── İstanbul sahnesi ── */
function istanbulSahne(){
  const W=46, H=32;
  const sahne = { ad:'İSTANBUL', pk:'34', W, H, dogus:{x:21*KARO, y:20*KARO},
                  zemin:[], kenar:{}, engel:new Set(), binalar:[], dekorEv:[], objeler:[], tutamlar:[] };
  const z = sahne.zemin;
  /* su: alt bant + sağ körfez; ada ve köprü hariç */
  const adaMi=(x,y)=> (x>=41 && x<=44 && y>=21 && y<=25) || (y===23 && x>=38 && x<=41);
  const suMu=(x,y)=> (y>=26 || (x>=40 && y>=10)) && !adaMi(x,y);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(suMu(x,y)) z.push(T_SU);
    else if(adaMi(x,y) && (x>=40||y===23)) z.push(T_KUM);
    else z.push(T_CIM[(kar(x,y)*3)|0]);
  }
  const at=(x,y,t)=>{ if(x>=0&&x<W&&y>=0&&y<H) z[y*W+x]=t; };
  /* yollar */
  for(let x=3;x<=38;x++) at(x,18,T_TOPRAK);
  for(let y=6;y<=24;y++) at(20,y,T_TOPRAK);
  for(let y=9;y<=18;y++) at(33,y,T_TOPRAK);
  for(let x=6;x<=20;x++) at(x,9,T_TOPRAK);
  for(let x=20;x<=33;x++) at(x,12,T_TOPRAK);
  for(let x=33;x<=38;x++) at(x,23,T_TOPRAK);
  for(let y=18;y<=23;y++) at(36,y,T_TOPRAK);
  /* küçük meydan */
  for(let y=17;y<=20;y++) for(let x=18;x<=24;x++) at(x,y,T_KUM);
  /* kıyı kenarları: su anlık görüntüsünden hesapla (zincirleme bozulmayı önler) */
  const suK=(x,y)=> (x<0||x>=W||y<0||y>=H) ? true : suMu(x,y);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(!suMu(x,y)) continue;
    const u=!suK(x,y-1), l=!suK(x-1,y), r=!suK(x+1,y), d=!suK(x,y+1);
    if(!(u||l||r||d)) continue;
    let b, fx=false, fy=false;
    if(u&&l) b=T_KOSE;
    else if(u&&r){ b=T_KOSE; fx=true; }
    else if(d&&l){ b=T_KOSE; fy=true; }
    else if(d&&r){ b=T_KOSE; fx=true; fy=true; }
    else if(u) b=T_KIYI_UST;
    else if(d){ b=T_KIYI_UST; fy=true; }
    else if(l) b=T_KIYI_SOL;
    else { b=T_KIYI_SOL; fx=true; }
    sahne.kenar[y*W+x]={b,fx,fy};
  }
  /* turistik binalar */
  const B=(ad,ev,tx,ty,s)=>{ sahne.binalar.push({ad, ev:EV[ev], x:tx*KARO, y:ty*KARO, s:s||4}); };
  B('Kapalıçarşı',      'dukkan',        4,  3, 5);
  B('Ayasofya',         'kirmiziTapinak',11,  7, 5);
  B('Sultanahmet Camii','buyukKonak',   22,  6, 4);
  B('Topkapı Sarayı',   'koyuKonak',    29,  2, 5);
  B('Galata Kulesi',    'kule',         33,  4, 4);
  B('Dolmabahçe Sarayı','tasEv',        36, 13, 5);
  B('Kız Kulesi',       'beyazKubbe',   42, 21, 4);
  /* fon evleri (etkileşimsiz kasaba dokusu) */
  const D=(ev,tx,ty,s)=>{ sahne.dekorEv.push({ev:EV[ev], x:tx*KARO, y:ty*KARO, s:s||3}); };
  D('evA', 7, 20, 3); D('ahsapEv', 26, 20, 3); D('evA', 15, 13, 3);
  D('ahsapEv', 2, 9, 3); D('pazar', 18, 15, 3); D('pazar', 22, 15, 3);
  /* dekor objeleri */
  const O=(o,tx,ty)=>sahne.objeler.push({i:OBJ[o], x:tx*KARO, y:ty*KARO});
  O('heykel', 10,11); O('heykel2', 14,11);
  O('kurbaga', 27,10);
  O('kutuk', 7,15); O('kaya', 30,20); O('kaya', 12,22);
  /* ağaçlar */
  const agacYerleri=[[2,6],[2,12],[5,21],[2,24],[8,23],[13,3],[17,4],[26,3],[36,2],[38,6],[30,15],[28,22],[24,22],[15,22],[10,17],[38,10],[34,20],[6,16],[17,13],[44,4],[43,7],[3,15]];
  agacYerleri.forEach(([tx,ty],i)=>{
    if(suMu(tx,ty)||suMu(tx+1,ty)||suMu(tx,ty+1)) return;
    sahne.objeler.push({i:[OBJ.agac,OBJ.agacKoyu,OBJ.agacBuyuk][i%3], x:tx*KARO, y:ty*KARO});
  });
  /* çim tutamları */
  for(let i=0;i<60;i++){
    const tx=(kar(i,7)*W)|0, ty=(kar(i,13)*H)|0;
    const t0=z[ty*W+tx];
    if(t0>=T_CIM[0] && t0<=T_CIM[2]) sahne.tutamlar.push({v:(kar(i,3)*3)|0, x:tx*KARO, y:ty*KARO});
  }
  /* engeller */
  const e=sahne.engel;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(suMu(x,y)) e.add(y*W+x);
  const blokla=(px,py,w,h)=>{
    const x1=px/KARO|0, y1=py/KARO|0, x2=(px+w-1)/KARO|0, y2=(py+h-1)/KARO|0;
    for(let ty=y1;ty<=y2;ty++) for(let tx=x1;tx<=x2;tx++) e.add(ty*W+tx);
  };
  sahne.binalar.forEach(b=>{
    const bw=b.ev.w*b.s, bh=b.ev.h*b.s;
    blokla(b.x+bw*0.08, b.y+bh*0.4, bw*0.84, bh*0.6);
  });
  sahne.dekorEv.forEach(b=>{
    const bw=b.ev.w*b.s, bh=b.ev.h*b.s;
    blokla(b.x+bw*0.08, b.y+bh*0.4, bw*0.84, bh*0.6);
  });
  sahne.objeler.forEach(o=>{ blokla(o.x+30, o.y+70, 68, 50); });
  return sahne;
}

const SAHNELER = { '34': istanbulSahne };
window.OYUN_SAHNELER = SAHNELER;

/* ── durum ── */
let tuval=null, ctx=null, aktif=false, sahne=null, rafId=null, sonZaman=0, t=0;
let oyuncu={x:0,y:0,yon:0,kare:0,karebZaman:0,yuruyor:false}; /* yon: 0 down,1 left,2 right,3 up */
let girdiler={u:false,d:false,l:false,r:false};
let joyVek={x:0,y:0}, joyAktif=false, yakinBina=null;

function oyunBaslat(pk){
  const kur=SAHNELER[pk];
  if(!kur) return;
  const ov=document.getElementById('oyun');
  ov.classList.add('acik'); ov.setAttribute('aria-hidden','false');
  varlikYukle().then(()=>{
    sahne=kur();
    tuval=document.getElementById('oyun-tuval');
    ctx=tuval.getContext('2d');
    document.getElementById('oyun-sehir').textContent=sahne.ad;
    oyuncu.x=sahne.dogus.x; oyuncu.y=sahne.dogus.y; oyuncu.yon=0; oyuncu.yuruyor=false;
    boyutla(); sayacTazele();
    aktif=true; sonZaman=performance.now();
    cancelAnimationFrame(rafId);
    rafId=requestAnimationFrame(dongu);
  }).catch(e=>{
    console.warn('Oyun varlıkları yüklenemedi', e);
    ov.classList.remove('acik');
    alert('Şehir sahnesi yüklenemedi — bağlantını kontrol et.');
  });
}
window.oyunBaslat=oyunBaslat;
window.__oyunTest={
  konum:(x,y)=>{ oyuncu.x=x; oyuncu.y=y; },
  durum:()=>({ x:oyuncu.x|0, y:oyuncu.y|0, yakin:yakinBina?yakinBina.ad:null, aktif })
};

function oyunDur(){
  aktif=false;
  cancelAnimationFrame(rafId);
  const ov=document.getElementById('oyun');
  ov.classList.remove('acik'); ov.setAttribute('aria-hidden','true');
}

function boyutla(){
  tuval.width=innerWidth; tuval.height=innerHeight;
  ctx.imageSmoothingEnabled=false;
}
addEventListener('resize', ()=>{ if(aktif) boyutla(); });

/* ── giriş ── */
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
(function joystickKur(){
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
    const m=Math.hypot(dx,dy)||1, s=Math.min(m,YARICAP);
    dx=dx/m*s; dy=dy/m*s;
    top.style.transform='translate('+dx+'px,'+dy+'px)';
    joyVek={x:dx/YARICAP, y:dy/YARICAP};
    joyAktif=Math.hypot(joyVek.x,joyVek.y)>0.18;
  }
})();
document.getElementById('oyun-cik').addEventListener('click', oyunDur);
document.getElementById('oyun-etkile').addEventListener('click', ()=>{ if(yakinBina) etkiles(yakinBina); });

/* ── etkileşim ── */
function etkiles(b){
  const n=REHBER.find(r=>r.ad===b.ad && r.pk===sahne.pk);
  if(!n) return;
  const nk=NOKTALAR.find(p=>p.n===n);
  if(nk) ziyaretEt(nk);
  const komsu=NOKTALAR.filter(p=>p.pk===sahne.pk).map(p=>({n:p.n, km:null}));
  rehberGoster(n, null, komsu);
  sayacTazele();
  sehirTamamKontrol();
}
function ziyaretliMi(ad){ return bellek.yerler.includes(sahne.pk+'|'+ad); }
function sayacTazele(){
  const g=sahne.binalar.filter(b=>ziyaretliMi(b.ad)).length;
  document.getElementById('oyun-say').textContent=g+'/'+sahne.binalar.length;
}
function sehirTamamKontrol(){
  const hepsi=sahne.binalar.every(b=>ziyaretliMi(b.ad));
  const anahtar='sehir-tamam-'+sahne.pk;
  if(hepsi && !localStorage.getItem(anahtar)){
    try{ localStorage.setItem(anahtar,'1'); }catch(e){}
    const el=document.getElementById('rozet-toast');
    document.getElementById('rozet-toast-ikon').textContent='🏙️';
    document.getElementById('rozet-toast-metin').textContent=sahne.ad+' tamamlandı — tüm yerleri gezdin!';
    el.classList.add('goster');
    setTimeout(()=>el.classList.remove('goster'), 3200);
  }
}

/* ── döngü ── */
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
  oyuncu.yuruyor=m>0.15;
  if(oyuncu.yuruyor){
    vx/=Math.max(1,m); vy/=Math.max(1,m);
    if(Math.abs(vx)>Math.abs(vy)) oyuncu.yon = vx>0?2:1;
    else oyuncu.yon = vy>0?0:3;
    const nx=oyuncu.x+vx*HIZ*dt, ny=oyuncu.y+vy*HIZ*dt;
    if(!carpiyor(nx,oyuncu.y)) oyuncu.x=nx;
    if(!carpiyor(oyuncu.x,ny)) oyuncu.y=ny;
    oyuncu.x=Math.max(20,Math.min(sahne.W*KARO-20,oyuncu.x));
    oyuncu.y=Math.max(30,Math.min(sahne.H*KARO-10,oyuncu.y));
    oyuncu.karebZaman+=dt;
    if(oyuncu.karebZaman>0.13){ oyuncu.kare=(oyuncu.kare+1)%4; oyuncu.karebZaman=0; }
  } else { oyuncu.kare=0; }
  /* yakın bina */
  let enYakin=null, enK=ETKI_MESAFE;
  sahne.binalar.forEach(b=>{
    const bw=b.ev.w*b.s, bh=b.ev.h*b.s;
    const bx=b.x+bw/2, by=b.y+bh*0.85;
    const d=Math.hypot(oyuncu.x-bx, oyuncu.y-by)-Math.max(bw,bh)*0.28;
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
  for(const [ox,oy] of [[-14,-4],[14,-4],[-14,8],[14,8]]){
    const tx=(px+ox)/KARO|0, ty=(py+oy)/KARO|0;
    if(sahne.engel.has(ty*sahne.W+tx)) return true;
  }
  return false;
}

/* ── çizim ── */
function cizSahne(){
  const vw=tuval.width, vh=tuval.height;
  let kx=Math.round(oyuncu.x-vw/2), ky=Math.round(oyuncu.y-vh/2-20);
  kx=Math.max(0,Math.min(sahne.W*KARO-vw,kx));
  ky=Math.max(0,Math.min(sahne.H*KARO-vh,ky));
  /* zemin */
  const x1=kx/KARO|0, y1=ky/KARO|0;
  const x2=Math.min(sahne.W-1,((kx+vw)/KARO|0)+1), y2=Math.min(sahne.H-1,((ky+vh)/KARO|0)+1);
  for(let ty=y1;ty<=y2;ty++) for(let tx=x1;tx<=x2;tx++){
    const i=ty*sahne.W+tx;
    const tip=sahne.zemin[i];
    const px=tx*KARO-kx, py=ty*KARO-ky;
    const ke=(tip===T_SU) ? sahne.kenar[i] : null;
    if(ke){
      ctx.save();
      ctx.translate(px + (ke.fx?KARO:0), py + (ke.fy?KARO:0));
      ctx.scale(ke.fx?-1:1, ke.fy?-1:1);
      ctx.drawImage(IMG.taban, ke.b*64,0,64,64, 0,0, KARO, KARO);
      ctx.restore();
    } else {
      ctx.drawImage(IMG.taban, tip*64,0,64,64, px, py, KARO, KARO);
    }
  }
  /* tutamlar */
  sahne.tutamlar.forEach(u=>{
    ctx.drawImage(IMG.tutam, u.v*64,0,64,64, Math.round(u.x-kx), Math.round(u.y-ky), 64,64);
  });
  /* derinlik sıralı nesneler */
  const N=[];
  sahne.binalar.forEach(b=>{
    const bw=b.ev.w*b.s, bh=b.ev.h*b.s;
    N.push({y:b.y+bh, ciz:()=>{
      ctx.drawImage(IMG.evler, b.ev.sx,b.ev.sy,b.ev.w,b.ev.h, Math.round(b.x-kx), Math.round(b.y-ky), bw, bh);
      const bx=Math.round(b.x-kx+bw/2), by=Math.round(b.y-ky)-8;
      const zy=ziyaretliMi(b.ad);
      ctx.textAlign='center';
      if(yakinBina===b){
        const s=Math.sin(t*6)*3;
        ctx.font='bold 26px Manrope, sans-serif';
        ctx.fillStyle='rgba(20,28,36,.55)';
        ctx.fillText(zy?'✓':'!', bx+1, by-6+s+2);
        ctx.fillStyle=zy?'#7BE3B4':'#F4D06F';
        ctx.fillText(zy?'✓':'!', bx, by-6+s);
      } else if(zy){
        ctx.font='bold 20px Manrope, sans-serif';
        ctx.fillStyle='rgba(20,28,36,.5)'; ctx.fillText('✓', bx+1, by+1);
        ctx.fillStyle='#7BE3B4'; ctx.fillText('✓', bx, by);
      }
    }});
  });
  sahne.dekorEv.forEach(b=>{
    const bw=b.ev.w*b.s, bh=b.ev.h*b.s;
    N.push({y:b.y+bh, ciz:()=>{
      ctx.drawImage(IMG.evler, b.ev.sx,b.ev.sy,b.ev.w,b.ev.h, Math.round(b.x-kx), Math.round(b.y-ky), bw, bh);
    }});
  });
    sahne.objeler.forEach(o=>{
    N.push({y:o.y+120, ciz:()=>{
      ctx.drawImage(IMG.objeler, o.i*128,0,128,128, Math.round(o.x-kx), Math.round(o.y-ky), 128,128);
    }});
  });
  N.push({y:oyuncu.y+10, ciz:()=>{
    const kareler=[0,1,2,3];
    const kare=oyuncu.yuruyor?kareler[oyuncu.kare]:0;
    const px=Math.round(oyuncu.x-kx), py=Math.round(oyuncu.y-ky);
    ctx.fillStyle='rgba(20,30,20,.28)';
    ctx.beginPath(); ctx.ellipse(px,py+8,16,5,0,0,7); ctx.fill();
    ctx.drawImage(IMG.oyuncu, kare*64, oyuncu.yon*64, 64,64, px-32, py-52, 64,64);
  }});
  N.sort((a,b)=>a.y-b.y).forEach(n=>n.ciz());
  /* gece tonu */
  if(document.documentElement.classList.contains('gece')){
    ctx.fillStyle='rgba(12,22,40,.38)'; ctx.fillRect(0,0,vw,vh);
  }
}
})();
