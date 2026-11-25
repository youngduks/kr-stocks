/* ---------- 1. 채광 ---------- */
function crystal(cx,cy,s){const r=42*s,ry=.36,hg=92*s;const top=[];for(let i=0;i<6;i++){const a=i*Math.PI/3;top.push([cx+Math.cos(a)*r,cy-hg/2+Math.sin(a)*r*ry]);}const bot=top.map(p=>[p[0],p[1]+hg]);ctx.strokeStyle='rgba(40,25,10,.6)';ctx.lineWidth=1.5;for(let i=0;i<6;i++){const j=(i+1)%6,am=(i+.5)*Math.PI/3;if(Math.sin(am)<=0)continue;poly([top[i],top[j],bot[j],bot[i]]);ctx.fillStyle=mixc('#6e4a1e','#e0ad55',.55+.45*Math.cos(am-1.2));ctx.fill();ctx.stroke();}poly(top);ctx.fillStyle='#f0c674';ctx.fill();ctx.stroke();}
const s1=(()=>{const R=rng(7);
  const surf=[[0,372],[120,372],[150,452],[200,452],[240,612],[660,612],[700,522],[780,522],[810,432],[900,432],[930,342],[1030,342],[1060,252],[1280,252]];
  const terr=[...surf,[1280,720],[0,720]];
  const specks=Array.from({length:170},()=>({x:R()*W,y:330+R()*390,r:1.2+R()*2.6,c:R()<.3?C.lilac:R()<.5?'#c9a46a':'#8d7f73'}));
  const slots=[];[[596,8,304],[566,7,326],[537,6,350],[509,4,396],[483,2,442]].forEach(([y,n,x0])=>{for(let i=0;i<n;i++)slots.push([x0+i*45+(R()-.5)*8,y+(R()-.5)*6]);});
  const rocks=slots.map((s,i)=>{const pts=[[1240,232],[1046,318],[918,410],[796,500],[690,594],[(690+s[0])/2,Math.min(s[1],594)-50],s];return{pts,L:pathLen(pts),r:19+R()*7,shape:rockShape(R),rot:R()*6,col:R()<.5?'#6d6158':'#7d7064',st:-.24+i*.034};});
  const inSp=Array.from({length:60},()=>({x:840+R()*200,y:50+R()*200,c:R()<.5?'#6a5f56':'#8a7b6c'}));
  return function(t){bg();
    ctx.save();poly(terr);ctx.fillStyle='#3a332e';ctx.fill();ctx.clip();
    for(let y=300,k=0;y<H;y+=44,k++){ctx.fillStyle=['#3a332e','#433a33','#4b4139','#3f3731'][k%4];ctx.beginPath();ctx.moveTo(0,y);for(let x=0;x<=W;x+=80)ctx.lineTo(x,y+Math.sin(x*.006+k)*8);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();}
    ctx.globalAlpha=.75;specks.forEach(p=>{ctx.fillStyle=p.c;circle(p.x,p.y,p.r);ctx.fill();});ctx.restore();
    ctx.beginPath();surf.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle='#a08f7c';ctx.lineWidth=2.5;ctx.stroke();
    rocks.forEach(r=>{if(t<r.st)return;const u=seg(t,r.st,r.st+.14);const p=along(r.pts,r.L,eout(u));drawRock(p[0],p[1],r.r,r.rot+u*9,r.shape,r.col,C.lilac);});
    tag('노천 채굴 · Open pit',1170,300,{al:'center'});
    callout(470,500,300,300,'희토류 원광','REO 3–10% · 암석 덩어리',seg(t,.12,.24));
    const a2=seg(t,.32,.44);
    if(a2>0){ctx.save();ctx.globalAlpha=a2;ctx.setLineDash([4,6]);ctx.strokeStyle=C.faint;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(520,486);ctx.lineTo(860,215);ctx.stroke();ctx.setLineDash([]);
      circle(940,150,104);ctx.fillStyle='#4a423b';ctx.fill();ctx.save();circle(940,150,102);ctx.clip();inSp.forEach(p=>{ctx.fillStyle=p.c;circle(p.x,p.y,6);ctx.fill();});crystal(968,170,1);crystal(888,128,.55);ctx.restore();
      circle(940,150,104);ctx.lineWidth=2.5;ctx.strokeStyle=C.ink;ctx.stroke();ctx.restore();
      txt('바스트네사이트',822,128,{al:'right',w:600,a:a2});txt('(Ce,La,Nd)CO₃F',822,156,{al:'right',mono:1,s:17,c:C.dim,a:a2});}
  };})();

/* ---------- 2. 분쇄·선광 ---------- */
const s2=(()=>{const R=rng(21);const rsh=Array.from({length:6},()=>rockShape(R));
  const parts=Array.from({length:44},()=>({j:(R()-.5)*30,good:R()<.35,s:2+R()*2.5}));
  const bub=Array.from({length:34},()=>({x:720+R()*270,r:4+R()*5,ph:R(),w:R()*6,carry:R()<.6}));
  const froth=Array.from({length:42},()=>({x:700+R()*305,y:322+R()*18,r:7+R()*8}));
  return function(t,ts){bg();
    for(let k=0;k<6;k++){const p=(ts*.55+k/6)%1;drawRock(275+(k%2?-12:12)*(1-p),lerp(30,236,p),lerp(24,11,p),k+ts*2,rsh[k],'#776a5f',C.lilac);}
    poly([[222,80],[328,80],[302,152],[248,152]]);ctx.fillStyle='#2d3443';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.stroke();
    [[205,250,1],[345,250,-1]].forEach(([x,y,d])=>{ctx.save();ctx.translate(x,y);ctx.rotate(d*ts*1.6);circle(0,0,62);const g=ctx.createRadialGradient(-15,-15,5,0,0,62);g.addColorStop(0,'#8a95a8');g.addColorStop(1,'#3b4352');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#1e2430';ctx.lineWidth=2;ctx.stroke();for(let i=0;i<16;i++){ctx.rotate(Math.PI/8);ctx.fillStyle='#2a303c';ctx.fillRect(54,-4,10,8);}circle(0,0,10);ctx.fillStyle='#1e2430';ctx.fill();ctx.restore();});
    txt('분쇄 · 분급',70,244,{al:'center',w:600,s:21});txt('Crusher·Mill',70,270,{al:'center',s:15,c:C.dim,mono:1});
    ctx.strokeStyle=C.steel;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(190,488);ctx.lineTo(650,488);ctx.moveTo(190,512);ctx.lineTo(650,512);ctx.stroke();
    for(let x=200;x<=640;x+=73){ctx.save();ctx.translate(x,500);ctx.rotate(ts*3);circle(0,0,11);ctx.fillStyle='#2d3443';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.moveTo(-11,0);ctx.lineTo(11,0);ctx.stroke();ctx.restore();}
    parts.forEach((q,k)=>{const p=(ts*.32+k/parts.length)%1;let x,y;if(p<.22){const u=p/.22;x=275+q.j*u;y=lerp(300,484,u*u);}else if(p<.86){const u=(p-.22)/.64;x=lerp(275+q.j,650,u);y=484-q.s;}else{const u=(p-.86)/.14;x=650+u*55;y=484+u*u*90;}ctx.fillStyle=q.good?C.tan:'#7c7f87';circle(x,y,q.s);ctx.fill();});
    tag('입도 ≤ 75 μm',420,562,{al:'center',mono:1,s:17});
    rr(690,318,320,292,6);ctx.fillStyle='rgba(120,175,200,.16)';ctx.fill();
    const th=lerp(6,26,t);ctx.fillStyle='#5f636c';rr(692,608-th,316,th,4);ctx.fill();
    ctx.strokeStyle=C.steel;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(850,300);ctx.lineTo(850,540);ctx.stroke();const c=Math.cos(ts*5)*46;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(850-c,540);ctx.lineTo(850+c,540);ctx.stroke();
    bub.forEach(b=>{const p=(ts*.33+b.ph)%1;const x=b.x+Math.sin(p*7+b.w)*6,y=lerp(595,345,p);ctx.globalAlpha=.9*(1-seg(p,.9,1));circle(x,y,b.r);ctx.strokeStyle='rgba(225,240,250,.75)';ctx.lineWidth=1.5;ctx.stroke();if(b.carry){ctx.fillStyle=C.tan;circle(x+b.r*.6,y-b.r*.4,2.6);ctx.fill();}ctx.globalAlpha=1;});
    froth.forEach((f,k)=>{circle(f.x,f.y+Math.sin(ts*2+k)*2,f.r);ctx.fillStyle=k%3?'#cdb68a':'#e1d2ae';ctx.fill();});
    rr(690,318,320,292,6);ctx.strokeStyle=C.steel;ctx.lineWidth=3;ctx.stroke();
    txt('부유선별 · Flotation',700,296,{w:600,s:21});
    poly([[1008,322],[1024,322],[1100,404],[1084,412]]);ctx.fillStyle='#3a4252';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.stroke();
    const h=lerp(28,118,ease(t)),top=612-h;
    for(let k=0;k<14;k++){const p=(ts*.6+k/14)%1;let x,y;if(p<.55){const u=p/.55;x=lerp(1014,1090,u);y=lerp(318,398,u);}else{const u=(p-.55)/.45;x=1092+u*30+(k%3)*6;y=lerp(404,top+6,u*u);}ctx.fillStyle=C.tan;circle(x,y,3);ctx.fill();}
    mound(1150,612,105,h,'#b3946a','#d8bf8f',5);
    callout(1150,top+16,1090,220,'희토류 정광','REO 50–70%',seg(t,.2,.32));
  };})();

/* ---------- 3. 침출·침전 ---------- */
const s3=(()=>{const R=rng(33);
  const solids=Array.from({length:70},()=>({x:490+R()*300,y:R(),r:2+R()*3,ph:R()*6}));
  const ions=Array.from({length:46},(_,k)=>({x:500+R()*280,y:R(),ph:R()*6,sp:.5+R(),lab:k===3||k===17||k===30}));
  const flocs=Array.from({length:70},()=>({x:494+R()*292,y0:R(),st:.62+R()*.22,r:2+R()*2.5}));
  function beaker(){ctx.beginPath();ctx.moveTo(462,200);ctx.lineTo(474,212);ctx.lineTo(474,560);ctx.quadraticCurveTo(474,592,506,592);ctx.lineTo(774,592);ctx.quadraticCurveTo(806,592,806,560);ctx.lineTo(806,212);ctx.lineTo(818,200);}
  return function(t,ts){bg();
    const ph=t<.34?0:t<.6?1:2;
    ['① 황산 배소','② 물 침출','③ 탄산염 침전'].forEach((s,i)=>tag(s,380+i*260,64,{al:'center',c:i===ph?(i===0?C.copper:C.lilac):C.faint,tc:i===ph?C.ink:C.dim}));
    const hA=1-seg(t,.3,.38);
    if(hA>0){ctx.save();ctx.globalAlpha=hA;for(let i=0;i<7;i++){const x=505+i*45,f=12+Math.sin(ts*9+i*2)*5;ctx.beginPath();ctx.moveTo(x-9,612);ctx.quadraticCurveTo(x,612-f*2.6,x+9,612);ctx.fillStyle='rgba(255,140,60,.6)';ctx.fill();}rr(480,612,320,12,4);ctx.fillStyle=mixc('#5a4a44','#ff9a4a',.6+.4*Math.sin(ts*6));ctx.fill();ctx.restore();}
    const lvl=lerp(470,330,ease(seg(t,.34,.46)));
    const k=seg(t,.38,.56);
    ctx.save();beaker();ctx.clip();
    ctx.fillStyle=`rgba(${lerp(170,185,k)|0},${lerp(110,160,k)|0},${lerp(70,225,k)|0},${lerp(.55,.36,k)})`;ctx.fillRect(470,lvl,340,600-lvl);
    const n=Math.floor(70*(.3+.7*seg(t,0,.24))),sf=1-seg(t,.4,.58);
    if(sf>0)for(let i=0;i<n;i++){const s=solids[i];ctx.fillStyle='#9c8463';circle(s.x+Math.sin(ts*2+s.ph)*3,lerp(lvl+10,584,s.y),s.r*sf);ctx.fill();}
    const iA=seg(t,.4,.56)*(1-seg(t,.66,.8));
    if(iA>0)ions.forEach(o=>{const x=o.x+Math.sin(ts*o.sp+o.ph)*10,y=lerp(lvl+12,570,o.y)+Math.cos(ts*o.sp*1.3+o.ph)*8;ctx.globalAlpha=iA;ctx.fillStyle=C.lilac;circle(x,y,3.6);ctx.fill();if(o.lab)txt('RE³⁺',x+8,y-6,{mono:1,s:15,c:C.ink,a:iA});ctx.globalAlpha=1;});
    const sedH=34*ease(seg(t,.64,.96));
    flocs.forEach(f=>{if(t<f.st)return;const u=seg(t,f.st,f.st+.12);ctx.fillStyle='#ece8f2';circle(f.x,lerp(lerp(lvl+10,500,f.y),588-sedH,u*u),f.r);ctx.fill();});
    if(sedH>0){ctx.fillStyle='#e6e1ec';ctx.fillRect(470,592-sedH,340,sedH);}
    ctx.restore();
    ctx.strokeStyle=C.steel;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(640,150);ctx.lineTo(640,532);ctx.stroke();const bc=Math.cos(ts*5)*54;ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(640-bc,532);ctx.lineTo(640+bc,532);ctx.stroke();
    beaker();ctx.strokeStyle='rgba(220,230,245,.75)';ctx.lineWidth=3;ctx.stroke();
    for(let y=300;y<=560;y+=40){ctx.beginPath();ctx.moveTo(474,y);ctx.lineTo(492,y);ctx.strokeStyle='rgba(220,230,245,.4)';ctx.lineWidth=2;ctx.stroke();}
    const pA=1-seg(t,.24,.3);
    if(pA>0){ctx.save();ctx.globalAlpha=pA;ctx.translate(590,132);ctx.rotate(.5);rr(-50,-14,80,28,6);ctx.fillStyle='#4a5262';ctx.fill();ctx.restore();for(let i=0;i<16;i++){const p=(ts*1.2+i/16)%1;ctx.globalAlpha=pA;ctx.fillStyle='#b89a6a';circle(600+Math.sin(i)*6,lerp(156,lvl,p),2.5);ctx.fill();}ctx.globalAlpha=1;}
    const wA=seg(t,.33,.36)*(1-seg(t,.45,.48));
    if(wA>0){ctx.save();ctx.globalAlpha=wA;ctx.strokeStyle='rgba(140,200,225,.6)';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(380,150);ctx.quadraticCurveTo(520,150,530,lvl);ctx.stroke();ctx.fillStyle='#4a5262';ctx.fillRect(340,140,44,20);ctx.restore();}
    const dA=seg(t,.6,.63)*(1-seg(t,.86,.9));
    if(dA>0){ctx.save();ctx.globalAlpha=dA;circle(740,112,16);ctx.fillStyle='#6b5a8a';ctx.fill();ctx.fillStyle='rgba(220,230,245,.8)';ctx.fillRect(736,126,8,124);const p=(ts*1.4)%1;ctx.fillStyle='#ece8f2';circle(740,lerp(258,lvl,p*p),4);ctx.fill();ctx.restore();txt('Na₂CO₃',764,118,{mono:1,s:15,c:C.dim,a:dA});}
    callout(610,430,960,330,'정광 + 진한 황산','배소 후 수용성 황산염',seg(t,.08,.15)*(1-seg(t,.3,.35)));
    callout(770,400,960,330,'희토류 이온 용액','La·Ce·Pr·Nd 혼합',seg(t,.47,.55)*(1-seg(t,.7,.76)));
    callout(560,580,260,470,'혼합 희토류 탄산염','RE₂(CO₃)₃ 침전',seg(t,.76,.86));
  };})();

/* ---------- 4. 분리·정제 ---------- */
const s4=(()=>{const R=rng(44);
  const typ=[{c:'#e9e2cf',x:300,n:'La·Ce',n2:'경희토'},{c:C.lilac,x:560,n:'Pr·Nd',n2:'자석용'},{c:C.amber,x:820,n:'Sm–Lu',n2:'Dy·Tb 포함'}];
  typ.forEach(o=>{o.pts=[[50,250],[o.x,250],[o.x,452]];o.L=pathLen(o.pts);});
  const dots=Array.from({length:66},(_,k)=>({ty:k%3,ph:R(),j:(R()-.5)*18}));
  const pipe=[[612,575],[700,575],[700,690],[1200,690],[1200,440],[1040,440],[1040,500]];const pL=pathLen(pipe);
  return function(t,ts){bg();
    txt('용매추출 (Mixer-settler) · 실제 라인은 수백 단',110,172,{w:600,s:21});
    [[59,'Pr','프라세오디뮴',C.lilac],[60,'Nd','네오디뮴',C.lilac],[65,'Tb','테르븀',C.amber],[66,'Dy','디스프로슘',C.amber]].forEach(([z,sy,kn,c],i)=>{const x=968+i*70,y=58;rr(x,y,62,80,6);ctx.fillStyle='rgba(255,255,255,.04)';ctx.fill();ctx.strokeStyle=c;ctx.lineWidth=1.5;ctx.stroke();txt(String(z),x+7,y+18,{mono:1,s:13,c:C.dim});txt(sy,x+31,y+52,{al:'center',w:700,s:26,c});txt(kn,x+31,y+71,{al:'center',s:10.5,c:C.dim});});
    for(let i=0;i<8;i++){const x=110+i*112;
      rr(x,196,44,104,4);ctx.fillStyle='rgba(185,163,240,.12)';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=1.8;ctx.stroke();
      ctx.strokeStyle=C.ink;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x+22,196);ctx.lineTo(x+22,262);ctx.stroke();const cx=Math.cos(ts*4+i)*14;ctx.beginPath();ctx.moveTo(x+22-cx,262);ctx.lineTo(x+22+cx,262);ctx.stroke();
      ctx.save();rr(x+48,196,58,104,4);ctx.clip();ctx.fillStyle='rgba(232,179,74,.22)';ctx.fillRect(x+48,196,58,46);ctx.fillStyle='rgba(120,175,200,.22)';ctx.fillRect(x+48,242,58,58);ctx.restore();rr(x+48,196,58,104,4);ctx.strokeStyle=C.steel;ctx.lineWidth=1.8;ctx.stroke();}
    ctx.fillStyle='rgba(232,179,74,.45)';ctx.fillRect(1022,206,22,12);txt('유기상 (추출제)',1052,218,{s:16,c:C.dim});
    ctx.fillStyle='rgba(120,175,200,.45)';ctx.fillRect(1022,236,22,12);txt('수상',1052,248,{s:16,c:C.dim});
    arrow(20,250,60,250,{c:C.dim});
    dots.forEach(d=>{const o=typ[d.ty];const u=(ts*.11+d.ph)%1;const p=along(o.pts,o.L,u);ctx.fillStyle=o.c;circle(p[0]+(p[1]>256?d.j*.3:0),p[1]+(p[1]<=256?d.j*.6:0),5);ctx.fill();});
    const fill=lerp(.12,.78,ease(seg(t,0,.62)));const hl=seg(t,.55,.62);
    typ.forEach((o,i)=>{const x=o.x-60,y=452,w=120,h=140;ctx.save();rr(x,y,w,h,10);ctx.clip();ctx.globalAlpha=.75;ctx.fillStyle=o.c;ctx.fillRect(x,y+h*(1-fill),w,h*fill);ctx.restore();rr(x,y,w,h,10);ctx.strokeStyle=i===1?mixc('#dce6f5',C.lilac,hl):'rgba(220,230,245,.7)';ctx.lineWidth=i===1?2.5+hl*1.5:2.5;ctx.stroke();txt(o.n,o.x,624,{al:'center',w:600,s:20});txt(o.n2,o.x,650,{al:'center',s:16,c:C.dim});});
    const a=seg(t,.56,.64);
    if(a>0){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='rgba(220,226,240,.22)';ctx.lineWidth=7;ctx.lineJoin='round';ctx.beginPath();pipe.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
      for(let k=0;k<16;k++){const p=along(pipe,pL,(ts*.18+k/16)%1);ctx.fillStyle='#d6b7e8';circle(p[0],p[1],3.2);ctx.fill();}
      const hk=seg(t,.7,.78);if(hk>0){for(let i=0;i<5;i++){const x=1000+i*20,f=10+Math.sin(ts*9+i*2)*4;ctx.beginPath();ctx.moveTo(x-7,588);ctx.quadraticCurveTo(x,588-f*2.2*hk,x+7,588);ctx.fillStyle='rgba(255,140,60,.65)';ctx.fill();}}
      poly([[980,520],[1100,520],[1088,575],[992,575]]);ctx.fillStyle='#3a4252';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.stroke();
      mound(1040,522,54,lerp(0,46,ease(seg(t,.7,.95))),'#6f5f58','#8d7b86',9);
      ctx.restore();
      tag('옥살산염 침전 → 소성 ~900 ℃',1040,620,{al:'center',s:16,a});}
    callout(1040,500,1000,368,'PrNd 산화물','(Pr,Nd)₂O₃ · 순도 ≥99%',seg(t,.8,.9));
  };})();

/* ---------- 5. 금속 환원 ---------- */
const s5=(()=>{const R=rng(55);const bub=Array.from({length:28},(_,k)=>({side:k%2,ph:R(),dx:(R()-.5)*30,r:3+R()*5}));const feed=Array.from({length:14},()=>({ph:R(),dx:(R()-.5)*14}));
  return function(t,ts){bg();
    rr(380,262,520,340,10);ctx.fillStyle='#2a303c';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.stroke();
    const fl=.85+.15*Math.sin(ts*3);const g=ctx.createRadialGradient(640,470,20,640,450,320);g.addColorStop(0,`rgba(255,190,110,${fl})`);g.addColorStop(.55,'rgba(230,90,40,.95)');g.addColorStop(1,'rgba(120,30,15,1)');rr(400,300,480,286,6);ctx.fillStyle=g;ctx.fill();
    ctx.strokeStyle='rgba(255,220,170,.6)';ctx.lineWidth=2;ctx.beginPath();for(let x=400;x<=880;x+=10)ctx.lineTo(x,301+Math.sin(x*.05+ts*3)*1.5);ctx.stroke();
    bub.forEach(b=>{const p=(ts*.45+b.ph)%1;const x=(b.side?790:490)+b.dx,y=lerp(470,305,p);ctx.globalAlpha=1-seg(p,.8,1);circle(x,y,b.r);ctx.strokeStyle='rgba(255,235,200,.85)';ctx.lineWidth=1.5;ctx.stroke();ctx.globalAlpha=1;});
    [490,790].forEach(x=>{const gg=ctx.createLinearGradient(x-22,0,x+22,0);gg.addColorStop(0,'#252a33');gg.addColorStop(.5,'#4f5663');gg.addColorStop(1,'#252a33');ctx.fillStyle=gg;ctx.fillRect(x-22,150,44,330);txt('+',x,180,{al:'center',w:700,s:24,c:C.copper});});
    const cg=ctx.createLinearGradient(632,0,648,0);cg.addColorStop(0,'#8a94a6');cg.addColorStop(.5,'#e3e8ef');cg.addColorStop(1,'#8a94a6');ctx.fillStyle=cg;ctx.fillRect(632,120,16,386);
    const p=(ts*.9)%1;ctx.fillStyle='#e3e8ef';if(p<.55){const r=lerp(2,7,p/.55);circle(640,506+r,r);ctx.fill();}else{const u=(p-.55)/.45;circle(640,lerp(514,566,u*u),6);ctx.fill();}
    rr(596,546,88,40,6);ctx.fillStyle='#3a4252';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=1.5;ctx.stroke();const ml=lerp(5,28,t);ctx.fillStyle=metalGrad(600,586-ml,680,586);ctx.fillRect(600,586-ml,80,ml-2);
    poly([[532,66],[588,66],[572,102],[548,102]]);ctx.fillStyle='#3a4252';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=1.5;ctx.stroke();
    feed.forEach(f=>{const q=(ts*.7+f.ph)%1;ctx.fillStyle='#7a6a62';circle(560+f.dx*q,lerp(104,300,q),2.6);ctx.fill();});
    tag('흑연 양극 (+)',490,124,{al:'center',s:17});tag('텅스텐 음극 (−)',700,124,{s:17});
    callout(420,430,250,340,'불화물 용융염','LiF–REF₃ · ~1,050 ℃',seg(t,.08,.18));
    const iA=seg(t,.56,.64);
    if(iA>0){arrow(692,566,990,520,{a:iA,dash:[6,6],c:C.faint});
      ctx.save();ctx.globalAlpha=iA;const mold=[[1000,470],[1200,470],[1180,550],[1020,550]];poly(mold);ctx.fillStyle='#2a303c';ctx.fill();const fk=ease(seg(t,.62,.86));ctx.save();poly(mold);ctx.clip();const ly=lerp(550,474,fk);ctx.fillStyle=fk<1?mixc('#ff9a4a','#c9d0da',seg(t,.7,.9)):metalGrad(1000,470,1200,550);ctx.fillRect(1000,ly,200,550-ly);ctx.restore();poly(mold);ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.stroke();ctx.restore();
      txt('NdPr 금속 잉곳',1100,596,{al:'center',w:700,s:23,a:iA});txt('순도 ≥99.5%',1100,624,{al:'center',s:17,c:C.dim,a:iA});}
    txt('양극: O²⁻ + C → CO/CO₂↑      음극: Nd³⁺ + 3e⁻ → Nd',640,668,{al:'center',mono:1,s:17,c:C.dim});
  };})();

/* ---------- 6. 합금·스트립캐스팅 ---------- */
const s6=(()=>{const R=rng(66);
  const comp=[['Nd+Pr',27,C.lilac],['Dy·Tb',4,C.amber],['Fe',66,'#8d96a6'],['B',1,'#e86a5c'],['기타',2,C.cyan]];
  const charges=[{x:120,lab:'NdPr 금속'},{x:230,lab:'전해철'},{x:340,lab:'페로보론'},{x:450,lab:'Dy-Fe·Co·Cu'}];
  const flakes=Array.from({length:30},()=>({ph:R(),dx:R()*60,dy:R()*30,rot:R()*6,w:12+R()*10}));
  const pile=Array.from({length:70},()=>({x:1055+R()*140,y:R(),rot:R()*3,w:10+R()*10}));
  const sh=Array.from({length:6},()=>rockShape(R,8));
  function charge(i,x,y){if(i===0){drawRock(x-12,y,16,.3,sh[0],'#b8c0cc');drawRock(x+12,y+4,13,1,sh[1],'#c9d0da');}else if(i===1){ctx.fillStyle='#6b7280';rr(x-27,y-17,54,34,4);ctx.fill();ctx.strokeStyle='#9aa4b4';ctx.lineWidth=1.5;ctx.stroke();}else if(i===2){drawRock(x-10,y,13,.5,sh[2],'#8a8078');drawRock(x+12,y-4,11,2,sh[3],'#978c82');drawRock(x+2,y+10,9,1,sh[4],'#7f756d');}else{[[C.amber,-12,0],[C.cyan,4,-6],[C.copper,10,8],['#c9d0da',-4,10]].forEach(([c,dx,dy])=>{ctx.fillStyle=c;circle(x+dx,y+dy,7);ctx.fill();});}}
  return function(t,ts){bg();
    txt('합금 조성 예 (wt%)',80,70,{w:600,s:18,c:C.dim});
    let x=80;const bw=560;comp.forEach(([n,v,c])=>{const w=bw*v/100;ctx.fillStyle=c;ctx.fillRect(x,84,Math.max(1,w-1),24);x+=w;});
    txt('Nd+Pr 27',80,132,{mono:1,s:16});txt('Fe 66',438,132,{mono:1,s:16,al:'center'});txt('Dy·Tb 4',231,156,{mono:1,s:16,c:C.amber});txt('B 1 · 기타(Co·Cu·Al·Ga) 2',640,156,{mono:1,s:16,al:'right',c:C.dim});
    const tilt=.75*ease(seg(t,.38,.48)),glow=seg(t,.22,.34),pour=seg(t,.45,.5);
    ctx.save();ctx.translate(430,360);ctx.rotate(tilt);ctx.translate(-430,-360);
    poly([[250,360],[430,360],[410,520],[270,520]]);ctx.fillStyle='#3a4252';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.stroke();
    if(glow>0){poly([[262,372],[418,372],[402,510],[278,510]]);const g=ctx.createLinearGradient(0,372,0,510);g.addColorStop(0,`rgba(255,190,110,${glow})`);g.addColorStop(1,`rgba(220,70,30,${glow})`);ctx.fillStyle=g;ctx.fill();}
    for(let k=0;k<4;k++){ctx.beginPath();ctx.ellipse(340,395+k*35,112-k*5,13,0,0,TAU);ctx.strokeStyle=k%2?C.copper:C.copperD;ctx.lineWidth=5;ctx.stroke();}
    ctx.restore();
    charges.forEach((c,i)=>{const u=ease(seg(t,.05+i*.05,.17+i*.05));if(u>=1)return;const x=lerp(c.x,340,u),y=lerp(240,360,u)-Math.sin(u*Math.PI)*60;ctx.save();ctx.globalAlpha=1-seg(u,.85,1);charge(i,x,y);ctx.restore();txt(c.lab,c.x,292,{al:'center',s:15,c:C.dim,a:1-seg(t,.04,.12)});});
    rr(520,384,130,22,4);ctx.fillStyle='#3a4252';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=1.5;ctx.stroke();
    if(pour>0){ctx.save();ctx.globalAlpha=pour;ctx.strokeStyle='#ff8a3d';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(432,362);ctx.quadraticCurveTo(480,352,540,388);ctx.stroke();ctx.fillStyle='#ff9a4a';ctx.fillRect(524,386,122,5);ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(648,400);ctx.lineTo(706,425);ctx.stroke();ctx.restore();}
    ctx.save();ctx.translate(790,540);circle(0,0,140);const wg=ctx.createRadialGradient(-40,-40,10,0,0,140);wg.addColorStop(0,'#e6a170');wg.addColorStop(1,'#7a4220');ctx.fillStyle=wg;ctx.fill();ctx.rotate(ts*1.8);ctx.strokeStyle='rgba(60,30,15,.6)';ctx.lineWidth=5;for(let i=0;i<6;i++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(26,0);ctx.lineTo(118,0);ctx.stroke();}circle(0,0,24);ctx.fillStyle='#4a2a16';ctx.fill();ctx.restore();
    if(pour>0){ctx.save();ctx.globalAlpha=pour;ctx.lineWidth=6;for(let i=0;i<12;i++){const a0=lerp(-2.2,-.4,i/12),a1=lerp(-2.2,-.4,(i+1)/12);ctx.beginPath();ctx.arc(790,540,143,a0,a1+.01);ctx.strokeStyle=mixc('#ff8a3d','#aab3c2',i/11);ctx.stroke();}
      flakes.forEach(f=>{const p=(ts*.85+f.ph)%1;const x=919+p*(150+f.dx),y=485+p*(60+f.dy)+p*p*70;ctx.save();ctx.translate(x,y);ctx.rotate(f.rot+p*8);ctx.fillStyle='#aab3c2';ctx.fillRect(-f.w/2,-2,f.w,4);ctx.restore();});ctx.restore();}
    poly([[1030,592],[1220,592],[1205,680],[1045,680]]);ctx.fillStyle='rgba(255,255,255,.03)';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.stroke();
    const np=Math.floor(70*seg(t,.5,1));for(let i=0;i<np;i++){const f=pile[i];ctx.save();ctx.translate(f.x,lerp(672,640,f.y));ctx.rotate(f.rot);ctx.fillStyle=i%2?'#8d96a6':'#aab3c2';ctx.fillRect(-f.w/2,-2,f.w,4);ctx.restore();}
    tag('진공 유도 용해 ~1,450 ℃',340,580,{al:'center',s:17});
    tag('수랭 구리 롤 · 스트립 캐스팅',790,358,{al:'center',s:17});
    callout(1090,612,1100,330,'합금 플레이크','두께 0.2–0.4 mm',seg(t,.62,.72));
  };})();

/* ---------- 7. 수소파쇄·미분쇄 ---------- */
const s7=(()=>{const R=rng(77);
  const fl=Array.from({length:5},(_,i)=>({x:110+R()*130,y:250+i*56+R()*10,a:(R()-.5)*.6,w:120+R()*30,cuts:[.3+R()*.1,.62+R()*.1]}));
  const H2=Array.from({length:40},()=>({x:95+R()*280,y:205+R()*300,ph:R()*6}));
  const mill=Array.from({length:70},()=>({r:40+R()*95,a0:R()*TAU,sp:1.4+R()*1.2,s:.6+R()*.6}));
  const cyc=Array.from({length:18},()=>({ph:R()}));
  const pipe=[[680,210],[680,140],[990,140],[990,200],[1010,200]];const pL=pathLen(pipe);
  const fmt=v=>v>=100?Math.round(v/10)*10:v>=10?Math.round(v):v.toFixed(1);
  return function(t,ts){bg();
    rr(70,190,330,330,16);ctx.fillStyle='rgba(127,214,232,.05)';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2.5;ctx.stroke();
    txt('수소 파쇄 (HD)',235,170,{al:'center',w:600});tag('H₂',370,216,{al:'center',s:16,c:C.cyan,mono:1});
    const hA=1-seg(t,.36,.44);
    ctx.fillStyle=C.cyan;H2.forEach(h=>{ctx.globalAlpha=.8*hA;circle(h.x+Math.sin(ts*1.3+h.ph)*14,h.y+Math.cos(ts*1.1+h.ph*2)*14,2.6);ctx.fill();});ctx.globalAlpha=1;
    const crack=seg(t,.08,.2),sep=ease(seg(t,.2,.32));
    if(hA>0)fl.forEach(f=>{ctx.save();ctx.globalAlpha=hA;ctx.translate(f.x+f.w/2,f.y);ctx.rotate(f.a);[[0,f.cuts[0]],[f.cuts[0],f.cuts[1]],[f.cuts[1],1]].forEach(([a,b],j)=>{const off=(j-1)*14*sep;ctx.fillStyle='#9aa4b4';ctx.fillRect(-f.w/2+a*f.w+off,-7+(j-1)*4*sep,(b-a)*f.w,14);ctx.strokeStyle='#5e6878';ctx.lineWidth=1;ctx.strokeRect(-f.w/2+a*f.w+off,-7+(j-1)*4*sep,(b-a)*f.w,14);});
      if(sep<.05&&crack>0){ctx.strokeStyle='#1b2130';ctx.lineWidth=2;f.cuts.forEach(c=>{const x=-f.w/2+c*f.w;ctx.beginPath();ctx.moveTo(x,-7);ctx.lineTo(x+3,-7+14*crack*.5);ctx.lineTo(x-2,-7+14*crack);ctx.stroke();});}ctx.restore();});
    arrow(410,360,505,360,{c:C.dim});
    circle(680,360,150);ctx.fillStyle='rgba(255,255,255,.025)';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=3;ctx.stroke();
    for(let k=0;k<6;k++){const a=k*Math.PI/3+.2,x=680+Math.cos(a)*150,y=360+Math.sin(a)*150;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='#4a5262';ctx.fillRect(0,-7,18,14);ctx.restore();const a2=a+Math.PI-.5;arrow(x,y,x+Math.cos(a2)*55,y+Math.sin(a2)*55,{c:C.cyan,a:.55,w:2,head:8});}
    const mA=seg(t,.36,.46),shr=seg(t,.44,.84);
    if(mA>0){ctx.fillStyle='#a3adbd';mill.forEach(m=>{const a=m.a0+ts*m.sp;ctx.globalAlpha=mA;circle(680+Math.cos(a)*m.r,360+Math.sin(a)*m.r,lerp(8,1.8,shr)*m.s);ctx.fill();});ctx.globalAlpha=1;
      if(shr<1)for(let k=0;k<5;k++){const Rr=rng(Math.floor(ts*6)*31+k*13+1);const a=Rr()*TAU,r=40+Rr()*90;ctx.fillStyle=`rgba(255,240,200,${.8*mA})`;circle(680+Math.cos(a)*r,360+Math.sin(a)*r,2+Rr()*2);ctx.fill();}}
    ctx.save();ctx.translate(680,360);ctx.rotate(ts*4);circle(0,0,26);ctx.strokeStyle=C.ink;ctx.lineWidth=2;ctx.stroke();for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(26,0);ctx.stroke();}ctx.restore();
    ctx.strokeStyle='rgba(220,226,240,.22)';ctx.lineWidth=10;ctx.lineJoin='round';ctx.beginPath();pipe.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
    const oA=seg(t,.55,.62);if(oA>0){ctx.fillStyle='#c9d0da';for(let k=0;k<20;k++){const p=along(pipe,pL,(ts*.4+k/20)%1);ctx.globalAlpha=oA;circle(p[0],p[1],1.8);ctx.fill();}ctx.globalAlpha=1;}
    poly([[1010,180],[1110,180],[1110,270],[1075,420],[1045,420],[1010,270]]);ctx.fillStyle='rgba(255,255,255,.03)';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2.5;ctx.stroke();
    if(oA>0){ctx.fillStyle='#c9d0da';cyc.forEach(c=>{const p=(ts*.5+c.ph)%1;const y=lerp(200,420,p);const hw=y<270?46:lerp(46,12,(y-270)/150);ctx.globalAlpha=oA;circle(1060+Math.cos(p*20)*hw*.8,y,1.8);ctx.fill();});ctx.globalAlpha=1;}
    rr(1010,428,100,90,8);ctx.fillStyle='rgba(255,255,255,.03)';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.stroke();
    const ph=lerp(4,60,ease(seg(t,.6,1)));ctx.fillStyle='#5d6573';ctx.fillRect(1013,515-ph,94,ph);
    txt('제트밀 · N₂ 기류',680,548,{al:'center',w:600});txt('미분말',1060,552,{al:'center',w:600});
    const ax0=200,ax1=1100,ay=636,X=um=>ax0+Math.log10(um)/3*(ax1-ax0);
    ctx.strokeStyle=C.faint;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ax0,ay);ctx.lineTo(ax1,ay);ctx.stroke();
    ctx.lineWidth=1.5;for(let d=0;d<3;d++)for(let m=1;m<10;m++){const x=X(Math.pow(10,d)*m);ctx.beginPath();ctx.moveTo(x,ay);ctx.lineTo(x,ay+(m===1?12:6));ctx.stroke();}ctx.beginPath();ctx.moveTo(ax1,ay);ctx.lineTo(ax1,ay+12);ctx.stroke();
    [[1,'1 μm'],[10,'10 μm'],[100,'100 μm'],[1000,'1 mm']].forEach(([v,l])=>txt(l,X(v),ay+34,{al:'center',mono:1,s:15,c:C.dim}));
    txt('입자 크기',ax0-20,ay+6,{al:'right',s:16,c:C.dim});
    const bA=seg(t,.8,.9);if(bA>0){ctx.fillStyle=`rgba(185,163,240,${.4*bA})`;ctx.fillRect(X(3),ay-10,X(5)-X(3),20);}
    let lg;if(t<.12)lg=Math.log10(300);else if(t<.44)lg=lerp(Math.log10(300),Math.log10(150),seg(t,.12,.34));else lg=lerp(Math.log10(150),Math.log10(4),ease(seg(t,.44,.84)));
    const v=Math.pow(10,lg),mx=X(v);ctx.fillStyle=C.lilac;ctx.beginPath();ctx.moveTo(mx,ay-4);ctx.lineTo(mx-8,ay-18);ctx.lineTo(mx+8,ay-18);ctx.closePath();ctx.fill();
    const lab=t<.12?'플레이크 두께':t<.44?'HD 조분':t<.84?'제트밀 분쇄':'미분말';txt(`${lab} ≈ ${fmt(v)} μm`,mx,ay-26,{al:'center',mono:0,s:16,w:600,c:C.lilac});
  };})();

/* ---------- 8. 자장 중 성형 ---------- */
const s8=(()=>{const R=rng(88);const g=[];for(let r=0;r<10;r++)for(let c=0;c<11;c++)g.push({x:548+c*19+(R()-.5)*5,y:270+r*22+(R()-.5)*5,a:R()*TAU});
  return function(t,ts){bg();
    [[330,450],[830,950]].forEach(([x0,x1])=>{ctx.fillStyle='#4a5262';ctx.fillRect(x0,300,x1-x0,140);for(let k=0;k<7;k++){ctx.fillStyle=k%2?C.copper:C.copperD;ctx.fillRect(x0+6+k*15,270,13,200);}});
    txt('전자석',390,252,{al:'center',s:17,c:C.dim});txt('전자석',890,252,{al:'center',s:17,c:C.dim});
    ctx.fillStyle='#3a4252';ctx.fillRect(450,170,380,400);ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.strokeRect(450,170,380,400);
    ctx.fillStyle='#141924';ctx.fillRect(538,170,204,320);
    ctx.fillStyle='#59637a';ctx.fillRect(540,490,200,110);ctx.strokeStyle=C.steel;ctx.strokeRect(540,490,200,110);
    const press=ease(seg(t,.56,.76));const top=lerp(262,350,press);
    let pb;if(t<.5)pb=110;else if(t<.56)pb=lerp(110,262,ease(seg(t,.5,.56)));else if(t<.84)pb=top;else pb=lerp(350,110,ease(seg(t,.84,.94)));
    ctx.fillStyle='#59637a';ctx.fillRect(540,pb-160,200,160);ctx.strokeStyle=C.steel;ctx.strokeRect(540,pb-160,200,160);
    const fA=.6*seg(t,.14,.24)*(1-seg(t,.8,.86));
    if(fA>0){ctx.save();ctx.strokeStyle=`rgba(185,163,240,${fA})`;ctx.lineWidth=2;ctx.setLineDash([14,10]);ctx.lineDashOffset=-ts*80;for(let y=286;y<=466;y+=26){ctx.beginPath();ctx.moveTo(330,y);ctx.lineTo(950,y);ctx.stroke();}ctx.restore();}
    const al=ease(seg(t,.2,.46)),cA=seg(t,.86,.94);
    g.forEach(p=>{const y=490-(490-p.y)*(490-top)/(490-262);let d=((0-p.a+Math.PI)%TAU+TAU)%TAU-Math.PI;const a=p.a+d*al;ctx.save();ctx.translate(p.x,y);ctx.rotate(a);ctx.globalAlpha=1-cA*.7;ctx.fillStyle=mixc('#7d8798','#8f86b0',al);ctx.beginPath();ctx.ellipse(0,0,8,5.5,0,0,TAU);ctx.fill();ctx.strokeStyle=mixc('#c9d0da',C.lilac,al);ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.lineTo(3,-2.5);ctx.moveTo(6,0);ctx.lineTo(3,2.5);ctx.stroke();ctx.restore();});
    if(cA>0){ctx.save();ctx.globalAlpha=cA;ctx.fillStyle='rgba(150,156,168,.92)';ctx.fillRect(540,350,200,140);const R2=rng(5);ctx.fillStyle='rgba(60,66,80,.6)';for(let i=0;i<160;i++)ctx.fillRect(540+R2()*200,350+R2()*140,2,2);ctx.restore();arrow(570,420,710,420,{c:C.lilac,w:3,a:cA,head:12});txt('c축',640,408,{al:'center',s:15,c:C.ink,a:cA,w:600});}
    const pa=seg(t,.5,.56)*(1-seg(t,.76,.8));if(pa>0){arrow(640,22,640,86,{c:C.ink,w:4,a:pa,head:14});txt('가압',664,62,{w:600,s:20,a:pa});}
    tag('배향 자장 ~2 T',640,628,{al:'center',s:17,c:C.lilac});
    txt('자장 ⊥ 가압 방향 (횡자장 성형)',640,676,{al:'center',s:16,c:C.dim});
    callout(742,470,990,540,'압분체','그린 컴팩트 · ~4 g/cm³',seg(t,.86,.94));
  };})();

/* ---------- 9. 소결·열처리 ---------- */
const s9=(()=>{const KP=[[0,25],[.16,1080],[.36,1080],[.44,180],[.5,900],[.6,900],[.66,180],[.72,500],[.86,500],[.95,60],[1,40]];
  function temp(u){for(let i=1;i<KP.length;i++)if(u<=KP[i][0])return lerp(KP[i-1][1],KP[i][1],(u-KP[i-1][0])/(KP[i][0]-KP[i-1][0]));return 40;}
  const x0=700,x1=1210,Y=T=>540-T/1200*340,X=u=>x0+u*(x1-x0);
  return function(t,ts){bg();
    const T=temp(t),k=clamp(T/1100);
    rr(90,170,510,420,14);ctx.fillStyle='#262c38';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.stroke();
    txt('진공 소결로',345,210,{al:'center',w:600,s:19});
    rr(130,228,430,322,8);ctx.fillStyle='#141822';ctx.fill();
    if(k>0){const g=ctx.createRadialGradient(345,420,10,345,400,260);g.addColorStop(0,`rgba(255,150,70,${.7*Math.pow(k,1.5)})`);g.addColorStop(1,'rgba(255,120,50,0)');ctx.save();rr(130,228,430,322,8);ctx.clip();ctx.fillStyle=g;ctx.fillRect(130,228,430,322);ctx.restore();}
    [252,528].forEach(y=>{ctx.strokeStyle=mixc('#4a3f3a','#ffb070',k);ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(150,y);ctx.lineTo(540,y);ctx.stroke();});
    ctx.strokeStyle=C.steel;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(190,500);ctx.lineTo(500,500);ctx.stroke();
    const sh=ease(seg(t,.16,.36)),w=lerp(220,186,sh),h=lerp(120,100,sh),bx=345-w/2,by=500-h;
    const bgd=ctx.createLinearGradient(0,by,0,500);bgd.addColorStop(0,mixc('#9097a3','#a4aebd',sh));bgd.addColorStop(1,mixc('#7a808b','#55606f',sh));ctx.fillStyle=bgd;ctx.fillRect(bx,by,w,h);
    if(sh<1){const R=rng(3);ctx.fillStyle=`rgba(40,46,58,${.6*(1-sh)})`;for(let i=0;i<180;i++)ctx.fillRect(bx+R()*w,by+R()*h,2,2);}
    ctx.fillStyle=`rgba(255,140,60,${.35*k})`;ctx.fillRect(bx,by,w,h);
    txt('온도 프로파일',x0,172,{w:600,s:20});
    ctx.strokeStyle='rgba(220,226,240,.08)';ctx.lineWidth=1;[300,600,900,1200].forEach(v=>{ctx.beginPath();ctx.moveTo(x0,Y(v));ctx.lineTo(x1,Y(v));ctx.stroke();});
    ctx.strokeStyle=C.faint;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x0,Y(1200));ctx.lineTo(x0,Y(0));ctx.lineTo(x1,Y(0));ctx.stroke();
    [0,300,600,900,1200].forEach(v=>txt(v.toLocaleString('en-US'),x0-10,Y(v)+5,{al:'right',mono:1,s:14,c:C.dim}));
    txt('℃',x0-10,Y(1200)-16,{al:'right',s:14,c:C.dim});txt('시간 →',x1,568,{al:'right',s:15,c:C.dim});
    ctx.beginPath();ctx.moveTo(X(0),Y(temp(0)));for(let u=0;u<=t;u+=.004)ctx.lineTo(X(u),Y(temp(u)));ctx.lineTo(X(t),Y(T));ctx.strokeStyle=C.copper;ctx.lineWidth=3;ctx.stroke();
    ctx.lineTo(X(t),Y(0));ctx.lineTo(X(0),Y(0));ctx.closePath();ctx.fillStyle='rgba(224,146,90,.1)';ctx.fill();
    if(t>.16)txt('소결 1,050–1,100 ℃',X(.26),Y(1080)-14,{al:'center',s:15,w:600});
    if(t>.5)txt('1차 열처리 ~900 ℃',X(.55),Y(900)-14,{al:'center',s:15,w:600});
    if(t>.72)txt('2차 시효 ~500 ℃',X(.79),Y(500)-14,{al:'center',s:15,w:600});
    circle(X(t),Y(T),6);ctx.fillStyle=C.copper;ctx.fill();tag(`${Math.round(T).toLocaleString('en-US')} ℃`,X(t)+14,Y(T)+28,{s:15,mono:1,c:C.copper});
    const lA=seg(t,.38,.46);txt('소결 블록 · 밀도 ~7.5 g/cm³',345,632,{al:'center',w:600,s:22,a:lA});txt('선수축 약 15–20%, 이론밀도의 ~99%',345,660,{al:'center',s:17,c:C.dim,a:lA});
  };})();

/* ---------- 10. 가공·입계확산·코팅 ---------- */
const s10=(()=>{const R=rng(10);const r=36,cells=[];for(let row=0;row<9;row++)for(let col=-1;col<11;col++){const x=330+col*62.35+(row%2?31.2:0),y=190+row*54;if(x>290&&x<990&&y<620)cells.push({x,y,f:mixc('#5d6676','#6e7788',R())});}
  const near=(px,py)=>cells.reduce((b,c)=>Math.hypot(c.x-px,c.y-py)<Math.hypot(b.x-px,b.y-py)?c:b);
  const cg=near(800,470),cb=near(820,262);
  function A(t,ts){const cut=ease(seg(t,.02,.18)),spr=ease(seg(t,.19,.28));const bx=360,by=262,bw=560,bh=180,n=6,sw=bw/n;
    for(let i=0;i<n;i++){const off=(i-(n-1)/2)*28*spr,x=bx+i*sw+off;const g=ctx.createLinearGradient(0,by,0,by+bh);g.addColorStop(0,'#a4aebd');g.addColorStop(.5,'#6a7486');g.addColorStop(1,'#535c6c');ctx.fillStyle=g;ctx.fillRect(x,by,sw,bh);if(i>0){ctx.fillStyle='#141924';ctx.fillRect(x-1.5,by,3,bh*cut);}}
    const wA=1-seg(t,.17,.2);if(wA>0){ctx.save();ctx.globalAlpha=wA;ctx.strokeStyle='#dfe7f2';ctx.lineWidth=1.5;for(let i=1;i<n;i++){const x=bx+i*sw;ctx.beginPath();ctx.moveTo(x,196);ctx.lineTo(x,512);ctx.stroke();ctx.fillStyle='rgba(255,230,180,.9)';circle(x,by+bh*cut,2.5+Math.random()*1.5);ctx.fill();}ctx.setLineDash([8,8]);ctx.lineDashOffset=-ts*120;ctx.beginPath();ctx.moveTo(bx-20,196);ctx.lineTo(bx+bw+20,196);ctx.stroke();ctx.restore();}
    txt('절단 · 연삭',640,170,{al:'center',w:600,s:24});txt('다중 와이어 절단 → 설계 치수, 공차 ±0.05 mm',640,560,{al:'center',s:18,c:C.dim});}
  function B(lt){const front=190+ease(seg(lt,.12,.92))*360;
    ctx.save();ctx.beginPath();ctx.rect(330,190,620,390);ctx.clip();
    cells.forEach(c=>{hexPath(c.x,c.y,r);ctx.fillStyle=c.f;ctx.fill();});
    cells.forEach(c=>{const k=clamp((front-c.y)/110)*lerp(1,.4,(c.y-190)/390);hexPath(c.x,c.y,r);ctx.strokeStyle=mixc('#262b36',C.amber,k);ctx.lineWidth=4+k*2.5;ctx.stroke();});
    ctx.restore();
    ctx.fillStyle=`rgba(232,179,74,${.9*seg(lt,0,.15)})`;ctx.fillRect(330,176,620,14);
    ctx.strokeStyle=C.faint;ctx.lineWidth=1.5;ctx.strokeRect(330,190,620,390);
    txt('입계확산 (GBD) · 미세조직 모식도',330,150,{w:600,s:22});
    ctx.strokeStyle=C.ink;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(340,612);ctx.lineTo(340+124.7,612);ctx.stroke();txt('10 μm',340+62,640,{al:'center',mono:1,s:15,c:C.dim});
    callout(400,183,300,183,'Dy·Tb 도포','증착·코팅 후 열처리',seg(lt,.05,.18),C.amber);
    callout(cg.x,cg.y,1000,470,'Nd₂Fe₁₄B 결정립','크기 ~5 μm',seg(lt,.2,.32));
    callout(cb.x+r*.866,cb.y-r*.5,1000,262,'Dy·Tb 농화 입계','보자력 ↑ · 중희토 절감',seg(lt,.45,.58),C.amber);}
  function Cc(lc){const g=ctx.createLinearGradient(0,260,0,440);g.addColorStop(0,'#a4aebd');g.addColorStop(1,'#535c6c');rr(420,260,440,180,12);ctx.fillStyle=g;ctx.fill();
    const L=[[4.5,'#cfd5de','Ni 하지층'],[13.5,C.copper,'Cu 중간층'],[22.5,'#eef1f5','Ni 표층']];
    L.forEach(([o,c,n],i)=>{const a=seg(lc,.1+i*.25,.3+i*.25);if(a<=0)return;ctx.save();ctx.globalAlpha=a;rr(420-o,260-o,440+2*o,180+2*o,12+o);ctx.strokeStyle=c;ctx.lineWidth=9;ctx.stroke();ctx.fillStyle=c;ctx.fillRect(960,288+i*40,26,14);ctx.restore();txt(n,996,301+i*40,{s:18,a});});
    txt('표면 코팅 (단면)',420,206,{w:600,s:24});txt('모식도 · 코팅 두께는 과장해서 표시',420,520,{s:16,c:C.dim});
    const a=seg(lc,.8,.9);txt('총 두께 ~10–25 μm',960,430,{s:17,c:C.dim,a});txt('다른 코팅 종류는 10C 참고',960,458,{s:17,c:C.dim,a});}
  return function(t,ts){bg();
    const aA=1-seg(t,.3,.36),aB=seg(t,.34,.4)*(1-seg(t,.66,.72)),aC=seg(t,.7,.76);
    if(aA>0){ctx.save();ctx.globalAlpha=aA;A(t,ts);ctx.restore();}
    if(aB>0){ctx.save();ctx.globalAlpha=aB;B(seg(t,.36,.68));ctx.restore();}
    if(aC>0){ctx.save();ctx.globalAlpha=aC;Cc(seg(t,.72,1));ctx.restore();}
  };})();

/* ---------- 9B. 소결로 방식 비교 ---------- */
const s9b=(()=>{const KP=[[0,25],[.16,1080],[.36,1080],[.44,180],[.5,900],[.6,900],[.66,180],[.72,500],[.86,500],[.95,60],[1,40]];
  function temp(u){for(let i=1;i<KP.length;i++)if(u<=KP[i][0])return lerp(KP[i-1][1],KP[i][1],(u-KP[i-1][0])/(KP[i][0]-KP[i-1][0]));return 40;}
  const ch=[['탈가스','≤900 ℃',800],['소결','~1,080 ℃',1080],['냉각','Ar 급냉',150],['시효 1','~900 ℃',900],['시효 2','~500 ℃',500],['배출','상온',40]];
  const cx0=664,cw=88,cg=6,cy0=172,chH=118,CX=i=>cx0+i*(cw+cg);
  const glow=T=>mixc('#1b2130','#c2551f',Math.pow(clamp(T/1100),1.3));
  const blk=T=>mixc('#8d939e','#ffb27a',clamp(T/1100)*.6);
  return function(t,ts){bg();
    txt('소결로 방식 비교',640,80,{al:'center',font:FD,w:700,s:30});
    ctx.strokeStyle=C.faint;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(610,108);ctx.lineTo(610,700);ctx.stroke();
    txt('배치식 (Batch)',120,128,{w:700,s:22,c:C.copper});txt('연속식 (Continuous)',664,128,{w:700,s:22,c:C.lilac});
    /* batch */
    const Tb=temp(t);
    rr(120,150,420,270,12);ctx.fillStyle='#262c38';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2;ctx.stroke();
    rr(150,175,360,220,8);ctx.fillStyle=glow(Tb);ctx.fill();
    for(let k=0;k<3;k++){const y=235+k*60;ctx.strokeStyle=C.steel;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(170,y);ctx.lineTo(490,y);ctx.stroke();for(let b=0;b<5;b++){ctx.fillStyle=blk(Tb);ctx.fillRect(184+b*62,y-30,48,28);}}
    tag(`로 전체 ${Math.round(Tb).toLocaleString('en-US')} ℃`,536,150,{al:'right',s:15,mono:1,c:C.copper});
    const X=u=>120+u*420,Y=T=>590-T/1200*130;
    txt('로 전체 온도가 시간에 따라 오르내림',120,450,{s:15,c:C.dim});
    ctx.strokeStyle=C.faint;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(120,460);ctx.lineTo(120,590);ctx.lineTo(540,590);ctx.stroke();
    ctx.beginPath();for(let u=0;u<=1.0001;u+=.005){const x=X(u),y=Y(temp(u));u?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle='rgba(224,146,90,.3)';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.moveTo(X(0),Y(temp(0)));for(let u=0;u<=t;u+=.005)ctx.lineTo(X(u),Y(temp(u)));ctx.lineTo(X(t),Y(Tb));ctx.strokeStyle=C.copper;ctx.lineWidth=3;ctx.stroke();
    circle(X(t),Y(Tb),5);ctx.fillStyle=C.copper;ctx.fill();
    txt('한 로에서 탈가스 → 소결 → 냉각 → 시효를 차례로',120,622,{s:16,c:C.dim});
    txt('+ 투자비 낮음 · 레시피 전환 자유 · 다품종 소량',120,656,{s:16});
    txt('− 매 사이클 승온·냉각 반복 · 장입 위치별 편차',120,684,{s:16,c:C.dim});
    /* continuous */
    ch.forEach(([n,tl,T],i)=>{const x=CX(i);rr(x,cy0,cw,chH,6);ctx.fillStyle=glow(T);ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=1.5;ctx.stroke();txt(n,x+cw/2,cy0+24,{al:'center',w:700,s:16});txt(tl,x+cw/2,cy0+chH-12,{al:'center',mono:1,s:12.5});});
    const per=1.5,ph=ts/per,st=Math.floor(ph),fr=ease(clamp((ph-st-.55)/.45));
    ctx.save();ctx.beginPath();ctx.rect(612,cy0,668,chH);ctx.clip();
    for(let j=-1;j<6;j++){const pos=j+fr,x=CX(0)+pos*(cw+cg)+10,T=ch[clamp(Math.round(pos),0,5)][2];ctx.fillStyle='#5e6878';ctx.fillRect(x,cy0+80,cw-20,5);for(let b=0;b<3;b++){ctx.fillStyle=blk(T);ctx.fillRect(x+4+b*23,cy0+58,18,22);}}
    ctx.restore();
    for(let i=1;i<6;i++){ctx.fillStyle='#6b7586';ctx.fillRect(CX(i)-cg/2-2,cy0-8,4,chH+16);}
    txt('트레이 진행 방향 →',664,320,{s:15,c:C.dim});txt('구간 사이 게이트 밸브',1222,320,{al:'right',s:15,c:C.dim});
    const Y2=T=>560-T/1200*170;
    txt('위치별 온도 (구간마다 고정)',664,372,{s:15,c:C.dim});
    ctx.strokeStyle=C.faint;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(664,384);ctx.lineTo(664,560);ctx.lineTo(1222,560);ctx.stroke();
    ctx.beginPath();ch.forEach(([,,T],i)=>{const x=CX(i),y=Y2(T);i?ctx.lineTo(x,y):ctx.moveTo(x,y);ctx.lineTo(x+cw+cg,y);});ctx.strokeStyle=C.lilac;ctx.lineWidth=3;ctx.stroke();
    const pp=Math.min(5.999,t*6),mi=Math.floor(pp);circle(CX(0)+pp*(cw+cg),Y2(ch[mi][2]),6);ctx.fillStyle=C.ink;ctx.fill();
    txt('트레이 1개',CX(0)+pp*(cw+cg),Y2(ch[mi][2])-14,{al:'center',s:13,c:C.ink});
    txt('트레이마다 같은 열이력을 거침',664,622,{s:16,c:C.dim});
    txt('+ 단위 에너지 낮음 · 열이력 균일 · 자동 반송',664,656,{s:16});
    txt('− 투자비·면적 큼 · 등급 전환 어려움 · 고장 시 라인 정지',664,684,{s:16,c:C.dim});
  };})();

/* ---------- 10B. 입계확산 도포 방식 ---------- */
const s10b=(()=>{const R=rng(101);
  const mist=Array.from({length:46},()=>({ph:R(),dx:R()-.5,dy:R()}));
  const atoms=Array.from({length:44},()=>({ph:R(),x:R(),dx:(R()-.5)*30}));
  const P=[[40,104],[650,104],[40,404],[650,404]],pw=590,phh=280;
  const info=[['스프레이 (분무)','슬러리 분사 → 건조 · 연속 라인'],['스크린 인쇄','페이스트를 마스크로 인쇄 · 극면만 도포'],['딥핑 (침지)','슬러리에 담갔다 건조 · 전면 도포'],['스퍼터링 · 증착','진공에서 금속 박막 형성 · 고가 설비']];
  const AMB=a=>`rgba(232,179,74,${a})`;
  function spray(x0,y0,ts){const by=y0+236,gx=x0+340;
    ctx.strokeStyle=C.steel;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x0+20,by);ctx.lineTo(x0+570,by);ctx.stroke();
    for(let k=0;k<5;k++){const x=x0+20+((ts*60+k*120)%600)-60;ctx.fillStyle='#8a94a6';ctx.fillRect(x,by-24,64,22);if(x+32>gx){ctx.fillStyle=AMB(.95);ctx.fillRect(x,by-29,64,5);}}
    poly([[gx,y0+128],[gx-46,by-26],[gx+46,by-26]]);const g=ctx.createLinearGradient(0,y0+128,0,by-26);g.addColorStop(0,AMB(.5));g.addColorStop(1,AMB(.12));ctx.fillStyle=g;ctx.fill();
    mist.forEach(m=>{const p=(ts*.8+m.ph)%1;ctx.fillStyle=AMB(.6*(1-p));circle(gx+m.dx*150*p,y0+130+p*86+m.dy*12,2.2);ctx.fill();});
    ctx.fillStyle='#4a5262';rr(gx-34,y0+92,68,30,6);ctx.fill();ctx.fillRect(gx-6,y0+120,12,10);ctx.fillRect(gx+30,y0+100,40,10);
    txt('오버스프레이 손실',x0+440,y0+160,{s:14,c:C.amber});}
  function screen(x0,y0,ts){const my=y0+204,ph=(ts*.3)%1,sx=lerp(x0+130,x0+530,ease(ph));
    for(let k=0;k<3;k++){const mx=x0+160+k*125,mw=90;ctx.fillStyle='#8a94a6';ctx.fillRect(mx,my,mw,34);const f=clamp((sx-mx)/mw);if(f>0){ctx.fillStyle=AMB(.95);ctx.fillRect(mx,my-6,mw*f,6);}}
    ctx.save();ctx.setLineDash([2,3]);ctx.strokeStyle='#8d97a8';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x0+120,my-9);ctx.lineTo(x0+540,my-9);ctx.stroke();ctx.restore();
    ctx.fillStyle='#4a5262';ctx.fillRect(x0+112,my-16,10,16);ctx.fillRect(x0+538,my-16,10,16);
    poly([[sx-7,y0+122],[sx+7,y0+122],[sx+3,my-12],[sx-3,my-12]]);ctx.fillStyle='#6b7586';ctx.fill();ctx.fillStyle='#4a5262';ctx.fillRect(sx-24,y0+110,48,14);
    ctx.fillStyle=AMB(.9);circle(sx+12,my-16,6);ctx.fill();
    txt('스퀴지',sx,y0+102,{al:'center',s:14,c:C.dim});txt('측면 손실 적음',x0+430,y0+266,{s:14,c:C.amber});}
  function dip(x0,y0,ts){const ph=(ts*.25)%1;let off;if(ph<.3)off=ease(ph/.3)*120;else if(ph<.45)off=120;else if(ph<.75)off=120*(1-ease((ph-.45)/.3));else off=0;
    const surf=y0+180,coated=ph>.32&&ph<.99;
    ctx.strokeStyle=C.steel;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x0+430,y0+74);ctx.lineTo(x0+430,y0+82+off);ctx.stroke();ctx.fillStyle='#6b7586';ctx.fillRect(x0+330,y0+82+off,200,8);
    for(let k=0;k<3;k++){const mx=x0+345+k*60,my=y0+96+off;ctx.strokeStyle=C.steel;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(mx+20,y0+90+off);ctx.lineTo(mx+20,my);ctx.stroke();ctx.fillStyle='#8a94a6';ctx.fillRect(mx,my,40,50);if(coated){ctx.strokeStyle=AMB(.95);ctx.lineWidth=4;ctx.strokeRect(mx-2,my-2,44,54);}
      if(ph>.75){const d=((ph-.75)/.25*3+k*.37)%1;ctx.fillStyle=AMB(.9);circle(mx+20,lerp(my+54,surf,d),3);ctx.fill();}}
    ctx.fillStyle=AMB(.5);ctx.fillRect(x0+302,surf,236,y0+266-surf);
    ctx.strokeStyle=C.steel;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x0+300,y0+164);ctx.lineTo(x0+300,y0+268);ctx.lineTo(x0+540,y0+268);ctx.lineTo(x0+540,y0+164);ctx.stroke();
    txt('측면까지 전면 도포',x0+20,y0+266,{s:14,c:C.amber});}
  function pvd(x0,y0,ts){rr(x0+250,y0+76,320,194,10);ctx.fillStyle='rgba(255,255,255,.025)';ctx.fill();ctx.strokeStyle=C.steel;ctx.lineWidth=2.5;ctx.stroke();
    ctx.fillStyle=AMB(1);ctx.fillRect(x0+300,y0+86,220,14);
    const g=ctx.createRadialGradient(x0+410,y0+112,4,x0+410,y0+112,130);g.addColorStop(0,`rgba(185,163,240,${.5+.15*Math.sin(ts*5)})`);g.addColorStop(1,'rgba(185,163,240,0)');ctx.fillStyle=g;ctx.fillRect(x0+252,y0+100,316,60);
    atoms.forEach(a=>{const p=(ts*.6+a.ph)%1;ctx.fillStyle=AMB(.9);circle(x0+300+a.x*220+a.dx*p,lerp(y0+104,y0+224,p),2.2);ctx.fill();});
    for(let k=0;k<3;k++){const mx=x0+300+k*80;ctx.fillStyle='#8a94a6';ctx.fillRect(mx,y0+226,60,24);ctx.fillStyle=AMB(.95);ctx.fillRect(mx,y0+222,60,4);}
    ctx.fillStyle='#6b7586';ctx.fillRect(x0+284,y0+250,252,6);
    txt('Tb 타깃',x0+240,y0+98,{al:'right',s:14,c:C.amber});txt('Ar 플라스마',x0+240,y0+124,{al:'right',s:14,c:C.lilac});txt('자석 홀더',x0+240,y0+246,{al:'right',s:14,c:C.dim});}
  const draws=[spray,screen,dip,pvd];
  return function(t,ts){bg();
    txt('입계확산 확산원 공급 방식',640,74,{al:'center',font:FD,w:700,s:28});
    const act=Math.min(3,Math.floor(t*4));
    P.forEach(([x0,y0],i)=>{rr(x0,y0,pw,phh,12);ctx.fillStyle='rgba(255,255,255,.025)';ctx.fill();ctx.strokeStyle=i===act?C.lilac:'rgba(220,226,240,.16)';ctx.lineWidth=i===act?2.5:1.5;ctx.stroke();
      ctx.save();rr(x0,y0,pw,phh,12);ctx.clip();ctx.globalAlpha=i===act?1:.55;draws[i](x0,y0,ts);ctx.restore();
      txt(info[i][0],x0+20,y0+38,{w:700,s:21,c:i===act?C.ink:C.dim});txt(info[i][1],x0+20,y0+64,{s:15,c:C.dim});});
  };})();

/* ---------- 10C. 표면 코팅 종류 ---------- */
const s10c=(()=>{const EP='#4a5163';
  const T=[
    ['Ni-Cu-Ni 도금','~10–25 μm',[[8,'#cfd5de'],[14,C.copper],[8,'#eef1f5']],'+ 내식·내마모, 금속 광택','− 도전성, 도금액 침투 관리'],
    ['에폭시 전착 (E-coat)','~10–30 μm',[[30,EP]],'+ 균일 두께·절연, 내식 우수','− 내열 한계, 두께만큼 치수 증가'],
    ['인산염 처리','수 μm 이하',[[4,'#a3a17e']],'+ 얇고 저렴, 수지 밀착 좋음','− 단독 내식성 낮음'],
    ['Zn 도금','~5–15 μm',[[16,'#b8c4d6']],'+ 저렴, 희생 방식','− 내식·내열이 Ni보다 낮음'],
    ['Al 이온증착 (IVD)','~5–20 μm',[[18,'#dfe3e8']],'+ 내열·내식, 수소 침투 없음','− 진공 설비 고가, 처리량 낮음'],
    ['복합 (Ni + 에폭시)','~25–45 μm',[[8,'#cfd5de'],[10,C.copper],[8,'#eef1f5'],[28,EP]],'+ 가혹 환경에서 최고 수준 내식','− 공정 길고 비용·두께 증가']];
  return function(t){bg();
    txt('표면 코팅 종류',640,74,{al:'center',font:FD,w:700,s:28});
    const act=Math.min(5,Math.floor(t*6));
    T.forEach(([n,th,L,pro,con],i)=>{const x0=40+(i%3)*407,y0=104+Math.floor(i/3)*296,w=386,h=280,on=i<=act;
      rr(x0,y0,w,h,12);ctx.fillStyle='rgba(255,255,255,.025)';ctx.fill();ctx.strokeStyle=i===act?C.lilac:'rgba(220,226,240,.16)';ctx.lineWidth=i===act?2.5:1.5;ctx.stroke();
      txt(n,x0+18,y0+38,{w:700,s:20,c:on?C.ink:C.dim});
      const g=ease(seg(t,i/6,i/6+.1)),mx=x0+24,mw=250,my=y0+176;
      const mg=ctx.createLinearGradient(0,my,0,my+44);mg.addColorStop(0,'#a4aebd');mg.addColorStop(1,'#535c6c');ctx.fillStyle=mg;ctx.fillRect(mx,my,mw,44);
      let y=my;L.forEach(([px,c],j)=>{const k=clamp(g*L.length-j);if(k<=0)return;const hh=px*k;y-=hh;ctx.fillStyle=c;ctx.fillRect(mx,y,mw,hh);ctx.strokeStyle='rgba(0,0,0,.3)';ctx.lineWidth=1;ctx.strokeRect(mx,y,mw,hh);});
      txt('자석',mx+10,my+28,{s:14,c:'#1b2130',w:600});
      if(g>0)txt(th,x0+w-18,my-4,{al:'right',mono:1,s:14,c:C.dim,a:g});
      txt(pro,x0+18,y0+246,{s:15,a:on?1:.5});txt(con,x0+18,y0+270,{s:15,c:C.dim,a:on?1:.5});});
    txt('두께는 개념 표시이며 실제 비율과 다름',1240,704,{al:'right',s:14,c:C.dim});
  };})();

/* ---------- 11. 로터 조립·착자 ---------- */
const s11=(()=>{const RX=560,RY=400;const slots=[];for(let p=0;p<8;p++)for(const side of[-1,1])slots.push({p,ph:p*Math.PI/4+Math.PI/8,side});
  function pose(s,rot){const ph=s.ph+rot,rh=[Math.cos(ph),Math.sin(ph)],th=[-Math.sin(ph),Math.cos(ph)],b=.62;const x=RX+rh[0]*146+th[0]*s.side*31,y=RY+rh[1]*146+th[1]*s.side*31;const ax=[th[0]*s.side*Math.cos(b)+rh[0]*Math.sin(b),th[1]*s.side*Math.cos(b)+rh[1]*Math.sin(b)];return{x,y,a:Math.atan2(ax[1],ax[0])};}
  function ring(c1,c2,teeth,col){ctx.beginPath();ctx.arc(RX,RY,290,0,TAU);ctx.arc(RX,RY,222,0,TAU,true);ctx.fillStyle=c1;ctx.fill('evenodd');}
  return function(t,ts){bg();
    const ph=t<.36?0:t<.64?1:2;
    ['① 자석 삽입·고정','② 로터 착자','③ 모터 조립'].forEach((s,i)=>tag(s,300+i*260,64,{al:'center',c:i===ph?C.lilac:C.faint,tc:i===ph?C.ink:C.dim}));
    const rot=Math.pow(seg(t,.72,1),2)*3.2,mg=seg(t,.5,.53);
    const yA=seg(t,.38,.44)*(1-seg(t,.62,.68)),sA=seg(t,.68,.76);
    if(sA>0){ctx.save();ctx.globalAlpha=sA;ring('#2a313e');for(let k=0;k<36;k++){ctx.save();ctx.translate(RX,RY);ctx.rotate(k*TAU/36);ctx.fillStyle=C.copperD;ctx.fillRect(224,-6,30,12);ctx.restore();}ctx.restore();}
    if(yA>0){ctx.save();ctx.globalAlpha=yA;ring('#353b47');for(let p=0;p<8;p++){ctx.save();ctx.translate(RX,RY);ctx.rotate(p*Math.PI/4+Math.PI/8);ctx.fillStyle='#7d8798';ctx.fillRect(212,-26,18,52);for(let k=0;k<4;k++){ctx.fillStyle=k%2?C.copper:C.copperD;ctx.fillRect(232+k*13,-34,11,68);}ctx.restore();}ctx.restore();}
    circle(RX,RY,205);ctx.fillStyle='#3a4352';ctx.fill();ctx.strokeStyle='#5e6878';ctx.lineWidth=2;ctx.stroke();
    for(let r=60;r<205;r+=18){circle(RX,RY,r);ctx.strokeStyle='rgba(255,255,255,.035)';ctx.lineWidth=1;ctx.stroke();}
    slots.forEach(s=>{const q=pose(s,rot);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.a);ctx.fillStyle='#141924';ctx.fillRect(-28,-8,56,16);ctx.restore();});
    circle(RX,RY,42);ctx.fillStyle='#6b7586';ctx.fill();ctx.save();ctx.translate(RX,RY);ctx.rotate(rot);ctx.fillStyle='#3a4352';ctx.fillRect(-6,-42,12,13);ctx.restore();
    txt('미착자 자석',110,282,{al:'center',s:16,c:C.dim,a:1-seg(t,.3,.36)});
    slots.forEach((s,m)=>{const st=.03+m*.015,u=ease(seg(t,st,st+.1));const sx=110,sy=304+m*12;const q=pose(s,rot);const x=lerp(sx,q.x,u),y=lerp(sy,q.y,u),a=lerp(0,q.a,u);ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=mixc('#8a94a6',s.p%2?C.S:C.N,mg);ctx.fillRect(-25,-6,50,12);if(u>=1&&t<.5){ctx.strokeStyle='rgba(232,179,74,.7)';ctx.lineWidth=2;ctx.strokeRect(-28,-8,56,16);}ctx.restore();});
    const fl=seg(t,.49,.505)*(1-seg(t,.51,.57));if(fl>0){const g=ctx.createRadialGradient(RX,RY,0,RX,RY,330);g.addColorStop(0,`rgba(255,255,255,${.8*fl})`);g.addColorStop(1,'rgba(185,163,240,0)');ctx.fillStyle=g;ctx.fillRect(RX-330,RY-330,660,660);}
    const aA=seg(t,.53,.57)*(1-seg(t,.62,.68));if(aA>0){ctx.save();ctx.strokeStyle=`rgba(185,163,240,${aA})`;ctx.lineWidth=2;ctx.setLineDash([6,6]);ctx.lineDashOffset=-ts*30;for(let p=0;p<8;p++){const b=p*Math.PI/4;ctx.beginPath();ctx.arc(RX+190*Math.cos(b),RY+190*Math.sin(b),46,b-Math.PI/2,b+Math.PI/2);ctx.stroke();}ctx.restore();}
    const a0=1-seg(t,.33,.37),a1=seg(t,.37,.41)*(1-seg(t,.62,.66)),a2=seg(t,.66,.7);
    const block=(a,title,l1,l2)=>{if(a<=0)return;txt(title,900,300,{w:700,s:24,a});txt(l1,900,336,{s:17,c:C.dim,a});txt(l2,900,364,{s:17,c:C.dim,a});};
    block(a0,'자석 삽입·수지 고정','미착자 상태로 V자 슬롯에 삽입','에폭시 수지로 고정·경화');
    block(a1,'로터 착자 (조립 후 착자)','다극 착자 요크 + 펄스 전원','철심 속 자석을 포화시킬 강한 자장');
    block(a2,'모터 조립 · 완성','Br ~1.3 T · Hcj ≥20 kOe','EV 1대당 NdFeB 약 1–2 kg');
    txt('IPM 로터 · V자 자석 배치',900,460,{s:16,c:C.dim});
  };})();

/* ---------- 12. 요약 ---------- */
const s12=(()=>{const R=rng(12);const rs=rockShape(R,9);const shards=Array.from({length:7},()=>({x:(R()-.5)*70,y:(R()-.5)*60,a:R()*3,w:24+R()*20}));
  const icons=[
    ()=>drawRock(0,4,42,.3,rs,'#7a6d61',C.lilac),
    ()=>mound(0,40,50,54,'#b3946a','#d8bf8f',3),
    ()=>{ctx.save();ctx.beginPath();ctx.moveTo(-32,-42);ctx.lineTo(-32,30);ctx.quadraticCurveTo(-32,42,-20,42);ctx.lineTo(20,42);ctx.quadraticCurveTo(32,42,32,30);ctx.lineTo(32,-42);ctx.clip();ctx.fillStyle='rgba(185,160,225,.4)';ctx.fillRect(-34,-10,68,54);ctx.fillStyle='#e6e1ec';ctx.fillRect(-34,24,68,20);ctx.restore();ctx.beginPath();ctx.moveTo(-32,-42);ctx.lineTo(-32,30);ctx.quadraticCurveTo(-32,42,-20,42);ctx.lineTo(20,42);ctx.quadraticCurveTo(32,42,32,30);ctx.lineTo(32,-42);ctx.strokeStyle='rgba(220,230,245,.75)';ctx.lineWidth=2.5;ctx.stroke();},
    ()=>mound(0,40,50,48,'#6f5f58','#8d7b86',4),
    ()=>{poly([[-42,-4],[42,-4],[30,-22],[-30,-22]]);ctx.fillStyle='#e3e8ef';ctx.fill();poly([[-42,-4],[42,-4],[34,30],[-34,30]]);ctx.fillStyle=metalGrad(-42,-4,42,30);ctx.fill();},
    ()=>shards.forEach(s=>{ctx.save();ctx.translate(s.x*.8,s.y*.8);ctx.rotate(s.a);ctx.fillStyle='#aab3c2';ctx.fillRect(-s.w/2,-2.5,s.w,5);ctx.restore();}),
    ()=>{mound(0,40,52,40,'#5d6573',null,0);const R2=rng(8);ctx.fillStyle='#8a93a3';for(let i=0;i<120;i++){const x=(R2()-.5)*80,y=40-R2()*34*(1-Math.abs(x)/52);ctx.fillRect(x,y,1.5,1.5);}},
    ()=>{ctx.fillStyle='#8d939e';ctx.fillRect(-42,-24,84,50);const R2=rng(6);ctx.fillStyle='rgba(50,56,70,.6)';for(let i=0;i<90;i++)ctx.fillRect(-42+R2()*84,-24+R2()*50,2,2);arrow(-26,1,26,1,{c:C.lilac,w:2.5,head:9});},
    ()=>{const g=ctx.createLinearGradient(0,-24,0,26);g.addColorStop(0,'#a4aebd');g.addColorStop(1,'#535c6c');ctx.fillStyle=g;ctx.fillRect(-38,-22,76,46);ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(-38,-22,76,6);},
    ()=>{[-24,0,24].forEach((y,i)=>{rr(-38+i*4,y-9,70,18,4);ctx.fillStyle='#d5dbe3';ctx.fill();ctx.strokeStyle='#8a94a6';ctx.lineWidth=1.2;ctx.stroke();});},
    ()=>{ctx.fillStyle=C.S;ctx.fillRect(-42,-20,42,40);ctx.fillStyle=C.N;ctx.fillRect(0,-20,42,40);txt('S',-21,8,{al:'center',w:700,s:20});txt('N',21,8,{al:'center',w:700,s:20});ctx.strokeStyle='rgba(185,163,240,.6)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,52,34,0,Math.PI*1.1,Math.PI*1.9);ctx.stroke();ctx.beginPath();ctx.ellipse(0,0,52,34,0,Math.PI*.1,Math.PI*.9);ctx.stroke();}];
  const names=['원광','정광','탄산염','PrNd 산화물','NdPr 금속','합금 플레이크','미분말','압분체','소결 블록','가공·코팅 편','영구자석'];
  const pos=i=>i<6?[165+i*190,230]:[260+(i-6)*190,490];
  return function(t){bg();
    txt('원자재 형태의 변화',640,92,{al:'center',font:FD,w:700,s:34});txt('원광부터 영구자석까지 11단계',640,124,{al:'center',s:17,c:C.dim});
    names.forEach((n,i)=>{const a=seg(t,.03+i*.06,.09+i*.06);if(a<=0)return;const[x,y]=pos(i);
      if(i>0&&i!==6){const[px]=pos(i-1);arrow(px+68,y,x-70,y,{a,c:C.faint,head:8});}
      if(i===6){ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=C.faint;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(1183,230);ctx.lineTo(1228,230);ctx.lineTo(1228,395);ctx.lineTo(180,395);ctx.lineTo(180,490);ctx.stroke();ctx.restore();arrow(180,490,194,490,{a,c:C.faint,head:8});}
      ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);const sc=lerp(.85,1,eout(a));ctx.scale(sc,sc);rr(-62,-62,124,124,14);ctx.fillStyle='rgba(255,255,255,.035)';ctx.fill();ctx.strokeStyle=i<5?'rgba(224,146,90,.55)':'rgba(185,163,240,.55)';ctx.lineWidth=1.5;ctx.stroke();icons[i]();ctx.restore();
      txt(String(i+1).padStart(2,'0'),x,y+90,{al:'center',mono:1,s:14,c:i<5?C.copper:C.lilac,a});txt(n,x,y+116,{al:'center',w:600,s:19,a});});
  };})();

/* ---------- script ---------- */
const S=[
 {no:'01',d:9,draw:s1,kind:'up',name:'채광',form:'희토류 원광',detail:'암석 덩어리 · 수 cm–수십 cm',chips:['REO 3–10%','바스트네사이트 (Ce,La,Nd)CO₃F','모나자이트','중희토: 이온흡착형 점토'],
  eq:'천공기·발파 · 유압 셔블 · 광산용 덤프트럭 (이온흡착형 점토는 인시튜 침출 설비)',
  narr:'모든 것은 희토류 원광에서 시작합니다. 바스트네사이트나 모나자이트 같은 광석에는 희토류 산화물(REO)이 보통 수% 정도만 들어 있습니다.'},
 {no:'02',d:9,draw:s2,kind:'up',name:'분쇄·선광',form:'희토류 정광',detail:'고운 분말 · 입도 ~75 μm 이하',chips:['REO 50–70%','부유선별','맥석 제거'],
  eq:'조 크러셔·콘 크러셔 · 볼밀 · 하이드로사이클론 · 부유선별기 · 자력선별기 · 농축조·필터프레스',
  narr:'원광을 잘게 부순 뒤 부유선별로 맥석을 걸러내면, 희토류 산화물 함량 50~70%의 고운 정광 분말이 됩니다.'},
 {no:'03',d:9,draw:s3,kind:'up',name:'침출·침전',form:'혼합 희토류 탄산염',detail:'습윤 침전물(케이크)',chips:['황산 배소 → 물 침출','RE₂(CO₃)₃','La·Ce·Pr·Nd 혼합'],
  eq:'로터리 킬른(황산 배소) · 교반 침출조 · 필터프레스 · 침전조 (모나자이트는 알칼리 분해 반응기)',
  narr:'정광을 진한 황산으로 배소하고 물로 침출하면 희토류가 용액으로 녹아 나옵니다. 여기에 탄산염을 넣어 혼합 희토류 원료로 침전시킵니다.'},
 {no:'04',d:9,draw:s4,kind:'up',name:'분리·정제',form:'PrNd 산화물',detail:'회갈색 분말 · 순도 ≥99%',chips:['(Pr,Nd)₂O₃','Pr:Nd ≈ 25:75','용매추출 수백 단','옥살산염 소성'],
  eq:'믹서-세틀러 캐스케이드 · 추출제(P507·P204) 공급·회수 · 옥살산 침전조·원심분리기 · 소성로(로터리·터널 킬른)',
  narr:'성질이 비슷한 희토류는 수백 단의 용매추출로 하나씩 나눕니다. 자석에 쓰는 프라세오디뮴과 네오디뮴은 소성을 거쳐 순도 99% 이상의 산화물 분말이 됩니다.'},
 {no:'05',d:9,draw:s5,kind:'up',name:'금속 환원',form:'NdPr 금속',detail:'은회색 잉곳 · 순도 ≥99.5%',chips:['불화물 용융염 전해','~1,050 ℃','Dy·Tb는 Dy-Fe 합금 형태'],
  eq:'불화물 용융염 전해조(흑연 양극·텅스텐 음극) · 대전류 정류기 · 배기가스 처리 · 주조 몰드',
  narr:'산화물을 약 1,050 ℃의 불화물 용융염에 넣고 전기분해하면 음극에 금속이 모입니다. 이를 주조해 NdPr 금속 잉곳을 만듭니다.'},
 {no:'06',d:9,draw:s6,kind:'down',name:'합금·스트립캐스팅',form:'합금 플레이크',detail:'두께 0.2–0.4 mm 박편',chips:['Nd₂Fe₁₄B 주상','진공 유도 용해','수랭 구리 롤 급랭'],
  eq:'진공 유도 용해(VIM) 스트립캐스터: 유도코일 · 도가니 · 턴디시 · 수랭 구리 롤 · 회전 냉각 드럼',
  narr:'NdPr 금속에 철과 페로보론, 소량의 디스프로슘·코발트·구리를 넣고 진공에서 녹입니다. 회전하는 구리 롤에 부어 급랭하면 얇은 합금 플레이크가 됩니다.'},
 {no:'07',d:9,draw:s7,kind:'down',name:'수소파쇄·미분쇄',form:'미분말',detail:'평균 입도 3–5 μm',chips:['수소 파쇄(HD)','제트밀 · N₂ 기류','산화 방지 위해 산소 차단'],
  eq:'회전식 수소처리로(HD) · 유동층 제트밀(N₂ 순환·분급 휠·사이클론) · 윤활제 혼합기 · 글로브박스',
  narr:'플레이크에 수소를 흡수시키면 스스로 갈라집니다. 이어 질소 기류 속 제트밀에서 입자끼리 부딪혀 3~5 마이크로미터의 미분말이 됩니다.'},
 {no:'08',d:9,draw:s8,kind:'down',name:'자장 중 성형',form:'압분체 (그린 컴팩트)',detail:'부서지기 쉬운 성형체 · 밀도 ~4 g/cm³',chips:['배향 자장 ~2 T','횡자장 성형','냉간 등방압(CIP) 병행'],
  eq:'자장 성형 프레스(전자석·다(多)캐비티 금형, N₂ 분위기) · 냉간 등방압 프레스(CIP)',
  narr:'미분말을 금형에 채우고 강한 자장을 걸면 입자의 자화 용이축이 한 방향으로 정렬합니다. 그대로 눌러 압분체를 만듭니다.'},
 {no:'09',d:9,draw:s9,kind:'down',name:'소결·열처리',form:'소결 블록',detail:'치밀한 금속 블록 · 밀도 ~7.5 g/cm³',chips:['진공 1,050–1,100 ℃','선수축 15–20%','2단 열처리 ~900 / ~500 ℃'],
  eq:'진공 소결로(배치식 / 연속식) · Ar 가압 냉각 · 진공 펌프 계통 · 시효 열처리로',
  narr:'압분체를 진공로에서 약 1,080 ℃로 소결하면 치밀한 블록이 됩니다. 이어 두 차례 열처리로 보자력을 끌어올립니다.'},
 {no:'09B',d:9,draw:s9b,kind:'down',name:'소결로 방식 비교',form:'배치식 vs 연속식',detail:'같은 소결·시효 조건을 다른 설비 구조로 수행',chips:['배치: 1개 로에서 전 공정','연속: 구간별 온도 고정','대량 단일 등급 → 연속식 유리'],
  eq:'진공 배치 소결로 · 다실(多室) 연속 진공 소결로 · 트레이 자동 반송 장치 · 구간 사이 게이트 밸브',
  narr:'소결로는 크게 두 가지입니다. 배치식은 한 로가 승온과 냉각을 반복하며 모든 단계를 처리하고, 연속식은 온도가 고정된 여러 구간을 트레이가 차례로 지나갑니다.'},
 {no:'10',d:9,draw:s10,kind:'down',name:'가공·입계확산·코팅',form:'가공 자석 편',detail:'설계 치수 세그먼트 · 공차 ±0.05 mm',chips:['와이어 절단·연삭','입계확산 Dy·Tb','Ni-Cu-Ni / 에폭시 코팅'],
  eq:'멀티 와이어 쏘·슬라이싱기 · 양두 연삭기 · 바렐 모따기 · 세척 라인 · 확산원 도포기 + 확산 열처리로 · 도금·전착도장 라인',
  narr:'소결 블록을 설계 치수로 자르고 연마합니다. 입계확산으로 디스프로슘과 테르븀을 입자 경계에만 넣고, 니켈 도금으로 부식을 막습니다.'},
 {no:'10B',d:9,draw:s10b,kind:'down',name:'입계확산 도포 방식',form:'확산원 도포층',detail:'Tb·Dy 화합물이나 금속을 자석 극면에 공급',chips:['스프레이','스크린 인쇄','딥핑','스퍼터링·증착'],
  eq:'자동 스프레이 라인 · 스크린 인쇄기 · 딥 코팅 장치 · 마그네트론 스퍼터/증착기 · 건조로 · 확산 열처리로',
  narr:'입계확산의 확산원은 스프레이, 스크린 인쇄, 딥핑, 스퍼터링 같은 방식으로 자석 표면에 입힙니다. 방식마다 재료 이용률, 도포 균일성, 생산성, 설비비가 다릅니다.'},
 {no:'10C',d:9,draw:s10c,kind:'down',name:'표면 코팅 종류',form:'코팅된 자석 편',detail:'사용 환경과 로터 구조에 맞춰 코팅 선택',chips:['Ni-Cu-Ni','에폭시 전착','인산염','Zn','Al IVD','복합'],
  eq:'전처리(탈지·산세·활성화) · 전기도금 라인(바렐·랙) · 양이온 전착도장 라인 · 인산염 화성처리조 · Al 이온증착(IVD) 진공 장비 · 건조·경화로',
  narr:'코팅은 사용 환경에 맞춰 고릅니다. 니켈 도금은 내식성과 내마모성이 좋고, 에폭시 전착은 고른 절연막을 만들며, 인산염은 얇고 저렴해 로터에 매립되는 자석에 많이 씁니다.'},
 {no:'11',d:9,draw:s11,kind:'down',name:'로터 조립·착자',form:'완성 영구자석',detail:'미착자 자석을 로터에 넣고 고정한 뒤 로터째 착자',chips:['조립 후 착자','Br ~1.3 T','Hcj ≥20 kOe (≈1,600 kA/m)','EV 1대당 ~1–2 kg'],
  eq:'자석 삽입기 · 수지(에폭시) 주입·경화 설비 · 로터 착자기(다극 착자 요크 + 콘덴서 방전 전원) · 표면자속 검사기 · 밸런싱기',
  narr:'자석은 착자하지 않은 상태로 로터 철심의 V자 슬롯에 넣고 수지로 고정합니다. 그다음 로터째 착자 요크에 넣고 강한 펄스 자장을 걸어 N극과 S극을 만든 뒤 모터에 조립합니다.'},
 {no:'—',d:9,draw:s12,kind:'sum',name:'한눈에 보기',form:'원광 → 영구자석',detail:'원자재가 거치는 11가지 형태',chips:['업스트림 1–5: 채광·제련','다운스트림 6–11: 자석 제조'],
  eq:'광산·선광장 → 제련·분리 공장 → 금속 전해 → 자석 공장(합금·분말·성형·소결·가공·착자)',
  narr:'원광 한 덩어리가 구동모터 속 영구자석이 되기까지, 원자재는 이렇게 열한 가지 형태를 거칩니다.'}
];
