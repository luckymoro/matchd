(function(){
var $=function(i){return document.getElementById(i)};
var T=THREE;

/* ================= i18n (English / العربية) ================= */
var LANG='';try{LANG=localStorage.getItem('hf_lang')||''}catch(e){}
if(LANG!=='ar'&&LANG!=='en')LANG=/^ar/i.test(navigator.language||'')?'ar':'en';
function tx(en,ar){return LANG==='ar'&&ar?ar:en}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function sp(en,ar){return'<span data-en="'+esc(en)+'" data-ar="'+esc(ar||en)+'">'+esc(tx(en,ar))+'</span>'}
function opt(v,en,ar){return'<option value="'+v+'" data-en="'+esc(en)+'" data-ar="'+esc(ar||en)+'">'+esc(tx(en,ar))+'</option>'}
function setT(el,en,ar){el.dataset.en=en;el.dataset.ar=ar;el.textContent=tx(en,ar)}
function applyLang(){var h=document.documentElement;h.lang=LANG;h.dir=LANG==='ar'?'rtl':'ltr';
 document.querySelectorAll('[data-en]').forEach(function(e){e.textContent=LANG==='ar'?e.dataset.ar:e.dataset.en});
 document.querySelectorAll('optgroup[data-gen]').forEach(function(e){e.label=LANG==='ar'?e.dataset.gar:e.dataset.gen});
 document.querySelectorAll('[data-ten]').forEach(function(e){e.title=LANG==='ar'?e.dataset.tar:e.dataset.ten});
 $('lang').textContent=LANG==='ar'?'English':'العربية';if(LANG==='ar')$('lang').title='Switch to English';else $('lang').title='التبديل إلى العربية';
 if(ready){buildMenu();drawWheel();setMode(mode)}}

/* ================= helpers ================= */
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function sm(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
function sq(x){return x*x}
function col(h){return new T.Color(h)}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}

/* ================= state ================= */
var S={
 shape:{},expr:{},blend:{x:0,y:0},
 skin:{mel:0.58,red:0.5,custom:'',bump:0.6,oil:0.5,sss:0.7,trn:0.8,rough:0.58,freck:0.2,age:0,under:0.25,flush:0.45,blotch:0.4,micro:0.8,fuzz:0.35},
 makeup:{lip:0,lipC:'#a8323a',gloss:0,blush:0,blushC:'#d9667a',shadow:0,shadowC:'#6b4a7a',liner:0},
 eyes:{c:'#5b3a24',c2:'#3d6b4f',het:false,size:1,pupil:1,limbal:0.6,sclera:'#f4f1ec',red:0.1,gaze:'auto'},
 hair:{},
 brow:{on:true,dens:1,len:1,thick:1,arch:0.5,c:'#1f150e',link:true},
 lash:{on:true,len:1,c:'#120c08'},
 fade:{on:false,style:'fade',lo:'skin',hi:'2',start:2.2,top:3.35,soft:0.7,lines:true},
 beard:{style:'none',len:1,dens:0.8,stub:0,c:'#2a1b11',link:true},
 phys:{on:true,k:150,damp:0.3,grav:1,wind:0},
 hmat:{shine:1,gloss:1,trans:1,grey:0,soft:0.7,shadow:1},
 comb:{t:'comb',r:0.45,str:1,teeth:'med',tex:0,dmode:'follow',ang:0},
 groom:{b:'dir',r:0.3,str:0.5,sym:true,inv:false,c:'#d9b07a',viz:true},
 tie:{mode:'none',sel:'top',u:[0,0.62,-0.78],tight:0.75,spread:0.4,bunR:0.16,band:'#151515'},
 barb:{tool:'clipper',sym:false,lever:0,flick:0,slen:0.6,thin:0.35,lw:0.035,straight:false},
 ear:{margin:0.08,sb:2.4,back:2.35,taper:0.85,slope:0.9,guides:false},
 light:{rig:'cinema',rot:0,int:1,expo:0.68,tone:'aces',bg:'rig',bgc:'#202226'},
 view:{mode:'lit',focal:42,hair:true,turn:false,guides:false}
};
var BR={t:'draw',r:0.22,s:0.5,sym:true,inv:false};
var cur=S.hair;
function getPath(p){var a=p.split('.'),o=a[0]==='brush'?BR:S[a[0]];return o?o[a[1]]:undefined}
function setPath(p,v){var a=p.split('.'),o=a[0]==='brush'?BR:S[a[0]];if(o)o[a[1]]=v}

/* ================= face-shaping definitions =================
 comp: ['m',cx,cy,cz,rx,ry,rz,vx,vy,vz,sym]  move inside an ellipsoid
       ['s',cx,cy,cz,rx,ry,rz,sx,sy,sz,px,py,pz,sym]  scale about pivot
       ['j']  jaw hinge rotation                                       */
var SECS={head:['Head','الرأس'],brow:['Brows','الحواجب'],eyes:['Eyes','العينان'],nose:['Nose','الأنف'],cheek:['Cheeks','الوجنتان'],mouth:['Mouth','الفم'],jaw:['Jaw & chin','الفك والذقن'],ear:['Ears & neck','الأذنان والرقبة']};
var MD=[
 ['headW','head','Head width','عرض الرأس',[['s',0,3.6,-0.4,2.0,1.5,2.3,0.1,0,0,0,3.2,-0.4,0]]],
 ['headH','head','Cranium height','ارتفاع الجمجمة',[['s',0,4.3,-0.5,2.0,1.0,2.2,0,0.12,0,0,3.4,-0.4,0]]],
 ['headD','head','Head depth','عمق الرأس',[['s',0,3.5,-1.3,1.9,1.5,1.3,0,0,0.12,0,3.5,-0.2,0]]],
 ['forehead','head','Forehead slope','ميل الجبهة',[['m',0,3.85,0.85,1.1,0.5,0.6,0,0.02,0.1,0]]],
 ['faceLen','head','Face length','طول الوجه',[['s',0,1.9,0.6,1.4,1.0,1.2,0,0.1,0,0,2.9,0.5,0]]],
 ['browH','brow','Brow height','ارتفاع الحاجب',[['m',0.5,3.2,0.85,0.55,0.25,0.45,0,0.06,0,1]]],
 ['browRidge','brow','Brow ridge','بروز عظمة الحاجب',[['m',0.45,3.18,0.95,0.6,0.2,0.4,0,0.01,0.08,1]]],
 ['eyeSpace','eyes','Eye spacing','تباعد العينين',[['m',0.5,2.93,0.6,0.42,0.3,0.55,0.07,0,0,1]]],
 ['eyeH','eyes','Eye height','ارتفاع العينين',[['m',0.5,2.93,0.6,0.45,0.33,0.55,0,0.07,0,1]]],
 ['eyeDepth','eyes','Eye depth','عمق العينين',[['m',0.5,2.93,0.65,0.4,0.3,0.5,0,0,-0.07,1]]],
 ['eyeSize','eyes','Eye opening','اتساع فتحة العين',[['s',0.5,2.95,0.7,0.38,0.26,0.4,0.15,0.25,0.05,0.45,2.95,0.6,1]]],
 ['eyeTilt','eyes','Canthal tilt','ميل زاوية العين',[['m',0.78,2.95,0.55,0.2,0.18,0.35,0,0.05,0,1],['m',0.25,2.92,0.75,0.18,0.18,0.35,0,-0.03,0,1]]],
 ['noseLen','nose','Nose length','طول الأنف',[['m',0,2.4,1.3,0.35,0.3,0.4,0,-0.07,0.02,0]]],
 ['noseW','nose','Nose width','عرض الأنف',[['m',0.17,2.45,1.1,0.25,0.25,0.35,0.06,0,0,1]]],
 ['noseBridge','nose','Bridge height','ارتفاع جسر الأنف',[['m',0,2.75,1.15,0.2,0.32,0.35,0,0,0.08,0]]],
 ['noseTip','nose','Tip projection','بروز طرف الأنف',[['m',0,2.42,1.35,0.25,0.22,0.3,0,0,0.1,0]]],
 ['noseLift','nose','Tip lift','رفع طرف الأنف',[['m',0,2.38,1.33,0.22,0.18,0.3,0,0.06,0,0]]],
 ['nostril','nose','Nostril flare','اتساع فتحتي الأنف',[['m',0.2,2.45,1.05,0.15,0.15,0.22,0.05,0,0,1]]],
 ['cheekbone','cheek','Cheekbones','عظام الوجنتين',[['m',0.88,2.6,0.6,0.4,0.3,0.45,0.06,0.01,0.05,1]]],
 ['cheekFull','cheek','Cheek fullness','امتلاء الخدين',[['m',0.75,2.1,0.65,0.42,0.38,0.42,0.08,0,0.03,1]]],
 ['mouthW','mouth','Mouth width','عرض الفم',[['m',0.42,1.85,0.85,0.25,0.2,0.3,0.06,0,0,1]]],
 ['lipU','mouth','Upper lip','الشفة العليا',[['m',0,1.95,1.05,0.42,0.1,0.25,0,0.015,0.05,0]]],
 ['lipL','mouth','Lower lip','الشفة السفلى',[['m',0,1.75,1.02,0.42,0.12,0.25,0,-0.015,0.05,0]]],
 ['mouthH','mouth','Mouth height','ارتفاع الفم',[['m',0,1.85,0.95,0.65,0.22,0.45,0,0.07,0,0]]],
 ['mouthProj','mouth','Mouth protrusion','بروز الفم',[['m',0,1.85,1.0,0.6,0.3,0.4,0,0,0.07,0]]],
 ['jawW','jaw','Jaw width','عرض الفك',[['m',0.9,1.7,-0.1,0.55,0.6,0.85,0.1,0,0,1]]],
 ['jawAngle','jaw','Jaw angle','زاوية الفك',[['m',0.9,1.5,-0.35,0.4,0.35,0.5,0.04,-0.06,0,1]]],
 ['chinLen','jaw','Chin length','طول الذقن',[['m',0,1.3,0.95,0.55,0.35,0.5,0,-0.1,0.02,0]]],
 ['chinProj','jaw','Chin projection','بروز الذقن',[['m',0,1.35,1.0,0.5,0.35,0.4,0,0,0.1,0]]],
 ['chinW','jaw','Chin width','عرض الذقن',[['m',0.3,1.35,0.95,0.3,0.35,0.4,0.06,0,0,1]]],
 ['earSize','ear','Ear size','حجم الأذن',[['s',1.42,2.8,-0.75,0.35,0.6,0.5,0.05,0.2,0.2,1.3,2.8,-0.75,1]]],
 ['earOut','ear','Ear protrusion','بروز الأذن',[['m',1.5,2.85,-0.9,0.3,0.5,0.4,0.1,0,0.02,1]]],
 ['neckW','ear','Neck thickness','سماكة الرقبة',[['s',0,0.95,-0.4,1.3,0.55,1.5,0.15,0,0.12,0,0.95,-0.4,0]]]
];
var AGEC=[['m',0.7,1.55,0.6,0.35,0.3,0.4,0.015,-0.05,0,1],['m',0,2.4,1.3,0.3,0.3,0.4,0,-0.03,0.015,0],['s',1.42,2.8,-0.75,0.35,0.6,0.5,0.02,0.08,0.08,1.3,2.8,-0.75,1],['m',0.75,2.25,0.7,0.3,0.25,0.3,-0.02,-0.02,-0.01,1],['m',0,1.85,1.03,0.4,0.15,0.25,0,0,-0.025,0],['m',0.7,3.15,0.75,0.3,0.2,0.4,0,-0.03,0,1]];
var EXPR=[
 ['smile','Smile','ابتسامة',[['m',0.43,1.85,0.85,0.25,0.2,0.3,0.05,0.07,-0.02,1],['m',0.68,2.25,0.75,0.33,0.25,0.4,0.01,0.04,0.03,1]]],
 ['frown','Frown','عبوس',[['m',0.43,1.83,0.85,0.25,0.2,0.3,-0.01,-0.06,0,1],['m',0,1.65,1.0,0.35,0.15,0.3,0,0.02,0.02,0]]],
 ['jaw','Jaw open','فتح الفك',[['j']]],
 ['browUp','Brows raise','رفع الحاجبين',[['m',0.5,3.22,0.85,0.6,0.28,0.45,0,0.07,0.01,1]]],
 ['browDown','Brows furrow','تقطيب الحاجبين',[['m',0.25,3.15,0.95,0.32,0.22,0.35,-0.03,-0.05,0.01,1]]],
 ['browSad','Inner brows up','رفع طرف الحاجب الداخلي',[['m',0.22,3.17,0.95,0.25,0.2,0.35,0,0.06,0,1]]],
 ['puff','Cheek puff','نفخ الخدين',[['m',0.6,1.95,0.8,0.35,0.3,0.35,0.09,0,0.05,1]]],
 ['sneer','Sneer','ازدراء',[['m',0.22,2.35,1.05,0.2,0.2,0.3,0.01,0.04,0,1],['m',0.25,1.93,0.95,0.2,0.08,0.3,0,0.03,0,1]]],
 ['pucker','Pucker','تزمّ الشفتين',[['m',0.42,1.85,0.85,0.25,0.2,0.3,-0.07,0,0.02,1],['m',0,1.85,1.03,0.35,0.18,0.3,0,0,0.06,0]]]
];
var EMO={neutral:['Neutral','محايد',{}],happy:['Happy','سعيد',{smile:0.9,puff:0.1}],surprise:['Surprised','مندهش',{browUp:1,jaw:0.55}],angry:['Angry','غاضب',{browDown:1,sneer:0.5,frown:0.3}],sad:['Sad','حزين',{browSad:1,frown:0.8}],disgust:['Disgust','اشمئزاز',{sneer:1,browDown:0.4,frown:0.3}]};
var BP=[
 {en:'Angular',ar:'حاد',v:{jawW:0.6,cheekbone:0.8,chinProj:0.4,noseBridge:0.6,cheekFull:-0.6,jawAngle:0.5,browRidge:0.4}},
 {en:'Round',ar:'دائري',v:{cheekFull:0.9,jawAngle:-0.4,chinLen:-0.4,noseW:0.4,headW:0.4,neckW:0.4,faceLen:-0.4}},
 {en:'Long',ar:'طويل',v:{headW:-0.5,chinLen:0.7,noseLen:0.6,jawW:-0.5,faceLen:0.7,headH:0.4}},
 {en:'Strong',ar:'قوي',v:{headW:0.5,jawW:0.9,browRidge:0.9,noseW:0.5,neckW:1,chinW:0.6,chinProj:0.3}},
 {en:'Delicate',ar:'رقيق',v:{jawW:-0.7,chinW:-0.6,noseW:-0.5,lipU:0.5,lipL:0.6,eyeSize:0.5,browRidge:-0.7,neckW:-0.6,noseTip:-0.3}},
 {en:'Defined',ar:'بارز الملامح',v:{noseBridge:0.9,noseTip:0.4,noseLen:0.4,eyeDepth:0.6,cheekbone:0.5,cheekFull:-0.4,mouthW:0.3,lipU:-0.3}}
];

/* ================= hair presets ================= */
var SL=[['count','Strands (thousands)','عدد الخصلات (بالآلاف)',10,140,1],['len','Top length','طول الأعلى',0.05,2.6,0.01],['fadeBand','Fade height','ارتفاع التدريج',0.2,1.8,0.02],['nape','Back/side hairline','خط الشعر الخلفي والجانبي',1.6,3.2,0.02],['front','Front hairline','خط الشعر الأمامي',3.2,4.3,0.02],['lift','Lift from scalp','الارتفاع عن فروة الرأس',0,1,0.02],['curl','Curl / messiness','تجعيد / فوضوية',0,1,0.02],['coil','Curl radius','نصف قطر التجعيد',0,0.15,0.005],['freq','Curl tightness','كثافة التجعيد',0,14,0.5],['sweep','Swept back','تسريح للخلف',0,2.5,0.05],['wave','Wave amplitude','سعة التموّج',0,0.12,0.005],['lock','Lock separation','انفصال الخُصل',0,0.6,0.02],['bend','Lay flat (natural)','الانسدال الطبيعي',0,1,0.02],['stub','Stubble shadow','ظل الشعر الخفيف',0,1,0.02],['mohawk','Mohawk strip width','عرض شريط الموهوك',0,1.2,0.02],['seed','Seed','البذرة',1,999,1]];
var PR={fade:{count:90,len:0.42,fadeBand:0.95,nape:2.15,front:3.85,lift:0.7,curl:0.3,stub:0.9,seed:11,h:'#2a1b11',t:'#6f573f'},
buzz:{count:120,len:0.1,fadeBand:0.7,nape:2.05,front:3.8,lift:0.85,curl:0.15,stub:1,seed:5,h:'#1d140d',t:'#463525'},
crop:{count:110,len:0.65,fadeBand:1.1,nape:2.2,front:3.9,lift:0.45,curl:0.6,stub:0.8,seed:23,h:'#3a2415',t:'#85684a'},
base:{count:140,len:0.7,fadeBand:0.2,nape:2.05,front:3.85,lift:0.6,curl:0.35,stub:0.1,seed:11,h:'#2a1b11',t:'#6f573f'},
long:{count:140,len:1.35,fadeBand:0.4,nape:1.7,front:3.9,lift:0.25,curl:0.4,stub:0.2,seed:31,h:'#4a3220',t:'#93714d',wave:0.05,lock:0.35},
ref:{count:125,len:0.85,fadeBand:0.8,nape:2.2,front:3.82,lift:0.28,curl:0.22,stub:0.5,seed:53,h:'#160e0a',t:'#2e211a',coil:0.022,freq:2.5,sweep:1.7,wave:0.03,lock:0.25},
curly:{count:110,len:0.75,fadeBand:0.6,nape:2.0,front:3.85,lift:0.55,curl:0.25,stub:0.2,seed:17,h:'#2b1a10',t:'#5e4630',coil:0.06,freq:7,sweep:0,bend:0.35},
wavy:{count:120,len:0.85,fadeBand:0.7,nape:2.0,front:3.85,lift:0.35,curl:0.2,stub:0.2,seed:9,h:'#3a2616',t:'#7a5a3a',coil:0.045,freq:3,sweep:0},
afro:{count:90,len:0.55,fadeBand:0.9,nape:2.2,front:3.7,lift:0.95,curl:0.15,stub:0.6,seed:41,h:'#120b07',t:'#2a1c12',coil:0.03,freq:12,sweep:0,bend:0.1},
dicap:{count:120,len:0.6,fadeBand:1.1,nape:2.1,front:3.85,lift:0.15,curl:0.12,stub:0.5,seed:13,h:'#8a6a3a',t:'#b89458',coil:0,freq:0,sweep:2.0},
cruise:{count:120,len:0.5,fadeBand:1.0,nape:2.15,front:3.9,lift:0.55,curl:0.25,stub:0.7,seed:27,h:'#2b1d12',t:'#5a4430',coil:0,freq:0,sweep:0.8},
undercut:{count:120,len:0.95,fadeBand:0.3,nape:2.9,front:3.9,lift:0.3,curl:0.2,stub:0.6,seed:61,h:'#2a1b11',t:'#5e4630',sweep:1.4,wave:0.02},
mohawk:{count:110,len:0.9,fadeBand:0.25,nape:2.1,front:3.85,lift:0.95,curl:0.25,stub:0.7,seed:71,h:'#1a1210',t:'#3a2a20',mohawk:0.32}};
(function(){var F={fade:['up',0.07,0.1],buzz:['crown',0.01,0],crop:['forward',0.05,0.04],base:['crown',0.06,0],long:['center',0.05,0.04],ref:['up',0.1,0.15],curly:['crown',0.18,0.05],wavy:['side',0.07,0.06],afro:['crown',0.3,0.05],dicap:['back',0.03,0.04],cruise:['side',0.08,0.12],undercut:['back',0.1,0.15],mohawk:['legacy',0,0]};
 for(var k in F){PR[k].flow=F[k][0];PR[k].vol=F[k][1];PR[k].volF=F[k][2]}
 Object.assign(PR,{
 titanic:{flow:'center',part:0.45,count:130,len:0.95,fadeBand:0.25,nape:1.75,front:3.95,lift:0.3,curl:0.14,stub:0.15,seed:97,h:'#3d2a1a',t:'#8a6440',vol:0.06,volF:0.06,layer:0.7,wave:0.03,lock:0.32,clump:0.55},
 topgun:{flow:'side',part:0.42,count:125,len:0.55,fadeBand:0.85,nape:2.1,front:3.9,lift:0.4,curl:0.12,stub:0.35,seed:33,h:'#21160e',t:'#3d2c1e',vol:0.09,volF:0.13,layer:0.5,wave:0.02,lock:0.22,clump:0.45},
 kroos:{flow:'back',count:120,len:0.55,fadeBand:0.55,nape:2.75,front:3.92,lift:0.3,curl:0.04,stub:0.9,seed:8,h:'#6b5235',t:'#a88a60',vol:0.04,volF:0.1,layer:0.35,wave:0.01,lock:0.4,clump:0.6},
 quiff:{flow:'up',count:120,len:0.72,fadeBand:0.9,nape:2.25,front:3.85,lift:0.5,curl:0.45,stub:0.9,seed:19,h:'#120c08',t:'#2a1e16',vol:0.11,volF:0.3,layer:0.5,wave:0.02,lock:0.42,clump:0.65},
 pomp:{flow:'up',count:130,len:0.95,fadeBand:0.6,nape:2.15,front:3.85,lift:0.4,curl:0.06,stub:0.6,seed:44,h:'#1a120d',t:'#3a2a1e',vol:0.14,volF:0.42,layer:0.6,wave:0.015,lock:0.2,clump:0.5},
 flowback:{flow:'back',count:130,len:1.0,fadeBand:0.35,nape:1.95,front:3.9,lift:0.35,curl:0.2,stub:0.3,seed:58,h:'#140e0a',t:'#30241b',vol:0.12,volF:0.24,layer:0.6,wave:0.035,lock:0.35,clump:0.55}})})();
Object.assign(PR,{
 curlyTaper:{flow:'forward',count:140,len:0.72,fadeBand:0.2,nape:2.05,front:3.85,lift:0.45,curl:0.22,stub:0.6,seed:303,h:'#0e0a08',t:'#2a1e16',coil:0.065,freq:2.6,vol:0.12,volF:0.04,layer:0.4,wave:0,lock:0.42,clump:0.75,lenVar:0.5,bend:0.5,frizz:0.08,stray:0.025,csz:0.1,fadeP:{style:'taper',lo:'skin',hi:'4',start:2.08,top:3.45,soft:0.9}},
 hsf:{flow:'forward',count:120,len:0.52,fadeBand:0.2,nape:2.15,front:3.85,lift:0.5,curl:0.4,stub:0.8,seed:12,h:'#2b1d14',t:'#57402d',vol:0.08,volF:0.12,layer:0.4,wave:0.025,lock:0.4,clump:0.6,fadeP:{style:'fade',lo:'skin',hi:'1.5',start:2.2,top:3.7,soft:0.75}},
 beck:{flow:'up',count:125,len:0.62,fadeBand:0.2,nape:2.15,front:3.85,lift:0.5,curl:0.35,stub:0.6,seed:24,h:'#4a3622',t:'#9c7b52',vol:0.1,volF:0.24,layer:0.5,wave:0.02,lock:0.42,clump:0.6,fadeP:{style:'taper',lo:'1',hi:'3',start:2.15,top:3.25,soft:0.9}},
 beck16:{flow:'back',count:130,len:1.2,fadeBand:0.2,nape:2.15,front:3.85,lift:0.4,curl:0.3,stub:0.5,seed:66,h:'#3a2a1c',t:'#a08060',vol:0.09,volF:0.3,layer:0.65,wave:0.035,lock:0.45,clump:0.6,fadeP:{style:'fade',lo:'1',hi:'2',start:2.2,top:3.45,soft:0.55}},
 mi2:{flow:'side',part:0.3,count:135,len:1.0,fadeBand:0.2,nape:1.75,front:3.9,lift:0.3,curl:0.22,stub:0.1,seed:82,h:'#2a1c12',t:'#6a4e34',vol:0.07,volF:0.06,layer:0.75,wave:0.035,lock:0.4,clump:0.55,oneLen:0.45,lenVar:0.35,drape:1},
 viking:{flow:'back',count:140,len:1.9,fadeBand:0.2,nape:1.75,front:3.9,lift:0.2,curl:0.05,stub:0.35,seed:77,h:'#2e2116',t:'#6e5640',vol:0.03,volF:0,layer:0.3,wave:0.012,lock:0.22,clump:0.45,mohawk:0.62,lenVar:0.25,drape:1.2,tie:{mode:'bun',sel:'top',u:[0,0.62,-0.78],bunR:0.15,tight:0.85,spread:0.35}},
 wLong:{flow:'center',part:0,count:140,len:1.55,fadeBand:0.2,nape:1.7,front:3.95,lift:0.3,curl:0.06,stub:0,seed:101,h:'#2a1a10',t:'#5a3e28',vol:0.04,volF:0.02,layer:0.25,wave:0.012,lock:0.25,clump:0.45,oneLen:1,lenVar:0.12,drape:1},
 wWavy:{flow:'side',part:0.35,count:140,len:1.5,fadeBand:0.2,nape:1.7,front:3.95,lift:0.3,curl:0.14,stub:0,seed:102,h:'#4a2e1a',t:'#b08050',vol:0.07,volF:0.05,layer:0.5,wave:0.07,lock:0.4,clump:0.6,oneLen:0.9,lenVar:0.2,drape:1},
 wBob:{flow:'side',part:0.3,count:140,len:0.55,fadeBand:0.2,nape:1.75,front:3.95,lift:0.3,curl:0.05,stub:0,seed:103,h:'#140d09',t:'#2c1f16',vol:0.06,volF:0.03,layer:0.1,wave:0.01,lock:0.2,clump:0.35,oneLen:1,lenVar:0.08,drape:0.7},
 wLob:{flow:'center',part:0,count:140,len:0.95,fadeBand:0.2,nape:1.75,front:3.95,lift:0.3,curl:0.1,stub:0,seed:104,h:'#5a3c22',t:'#c49a64',vol:0.06,volF:0.04,layer:0.45,wave:0.04,lock:0.35,clump:0.5,oneLen:1,lenVar:0.15,drape:1,bangs:'curtain',bangLen:0.75},
 wBangs:{flow:'center',part:0,count:140,len:1.4,fadeBand:0.2,nape:1.7,front:3.95,lift:0.3,curl:0.05,stub:0,seed:105,h:'#1a110b',t:'#35261a',vol:0.05,volF:0.02,layer:0.2,wave:0.01,lock:0.25,clump:0.4,oneLen:1,lenVar:0.1,drape:1,bangs:'blunt',bangLen:0.6},
 wCurly:{flow:'center',part:0,count:120,len:1.15,fadeBand:0.2,nape:1.75,front:3.9,lift:0.4,curl:0.2,stub:0,seed:106,h:'#2a1810',t:'#6a4428',coil:0.05,freq:5,vol:0.14,volF:0.06,layer:0.6,wave:0,lock:0.3,clump:0.55,oneLen:0.7,lenVar:0.3,drape:0.8,bend:0.4},
 wCurlyHi:{ear:'over',flow:'center',part:0.15,count:95,len:1.55,fadeBand:0.2,nape:1.75,front:3.9,lift:0.4,curl:0.25,stub:0,seed:211,h:'#3a2414',t:'#7a5230',coil:0.07,freq:2.4,vol:0.16,volF:0.05,layer:0.6,wave:0,lock:0.3,clump:0.6,oneLen:0.7,lenVar:0.3,drape:0.8,bend:0.4,hl:0.42,hlc:'#d6a35e',frizz:0.06,stray:0.012,csz:0.09},
 wPixie:{flow:'side',part:0.3,count:130,len:0.32,fadeBand:0.5,nape:2.15,front:3.85,lift:0.4,curl:0.2,stub:0.3,seed:107,h:'#6a4a2a',t:'#c8a070',vol:0.06,volF:0.1,layer:0.4,wave:0.02,lock:0.35,clump:0.5,bangs:'side',bangLen:0.55}});
var PRW=[['wLong','Long straight · center part','طويل ناعم · فرق في المنتصف'],['wWavy','Long waves · side part','طويل مموّج · فرق جانبي'],['wBangs','Long with blunt bangs','طويل مع غرّة مستقيمة'],['wLob','Lob with curtain bangs','لوب مع غرّة ستارة'],['wBob','Classic bob','بوب كلاسيكي'],['wCurly','Long curls','تجاعيد طويلة'],['wCurlyHi','Long curls with highlights','تجاعيد طويلة مع خصل فاتحة'],['wPixie','Pixie cut','قصّة بيكسي']];
var PRN=[['viking','Viking: slick back + top knot, long back','فايكنغ: مسرّح للخلف مع كعكة وشعر طويل'],['curlyTaper','Curly fringe + low taper (photo)','مجعّد مع غرّة وتدريج منخفض (الصورة)'],['hsf','Textured crop + high skin fade','كروب مموّج مع تدريج عالٍ حتى الجلد'],['beck','Beckham textured quiff','كويف بيكهام المموّج'],['beck16','Beckham long top, short sides','بيكهام: أعلى طويل وجوانب قصيرة'],['mi2','Mission: Impossible 2 (to the nape)','مهمة مستحيلة 2 (حتى الرقبة)'],['titanic','Titanic curtains (DiCaprio ’97)','ستارة تايتانك (دي كابريو)'],['topgun','Top Gun side part (Tom Cruise)','فرق جانبي توب غن (توم كروز)'],['kroos','Slick back + high fade (Kroos)','للخلف مع تدريج عالٍ (كروس)'],['quiff','Textured quiff + low fade','كويف مموّج مع تدريج منخفض'],['pomp','Pompadour','بومبادور'],['flowback','Flow back','انسياب للخلف'],['base','Base shape (uncut)','الشكل الأساسي (غير مقصوص)'],['fade','Short fade (photo look)','تدريج قصير'],['buzz','Buzz cut','حلاقة قصيرة جداً'],['crop','Textured crop','قصة كروب'],['long','Long','طويل'],['ref','Dark wavy swept-up (photo)','مموّج داكن مرفوع'],['curly','Natural curly','مجعّد طبيعي'],['wavy','Wavy','مموّج'],['afro','Afro / coily','أفرو'],['dicap','Slick back (DiCaprio)','مسرّح للخلف'],['cruise','Side-swept (Tom Cruise)','مسرّح جانبي'],['undercut','Undercut','أندركت'],['mohawk','Mohawk','موهوك']];
function setP(k){var fp=PR[k].fadeP;S.fade.on=!!fp;if(fp)Object.assign(S.fade,fp);S.hair=cur=Object.assign({preset:k,oneLen:0.85,lenVar:0.6,drape:1,bangs:'none',bangLen:0.6,coil:0,freq:0,sweep:0,wave:0.015,lock:0.18,bend:0.75,mohawk:0,flow:'crown',part:0.45,ear:'behind',frizz:0,stray:undefined,hl:0,hlc:'#d9a560',csz:0.07,vol:0.05,volF:0,layer:0.5,clump:0.4},JSON.parse(JSON.stringify(PR[k])));var tq=cur.tie;delete cur.tie;Object.assign(S.tie,{mode:'none',sel:'top',u:[0,0.62,-0.78],tight:0.75,spread:0.4,bunR:0.16},tq||{})}

/* ================= renderer / scene ================= */
var cv=$('c'),st=$('stage'),ren=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});
ren.setPixelRatio(Math.min(devicePixelRatio,2));ren.toneMapping=T.LinearToneMapping;ren.shadowMap.enabled=true;ren.shadowMap.type=T.PCFSoftShadowMap;
var scene=new T.Scene(),cam=new T.PerspectiveCamera(32,1,0.1,100);
var hemi=new T.HemisphereLight(0xffffff,0x5a4a3c,0.35);scene.add(hemi);
var key=new T.DirectionalLight(0xfff2e0,0.7);key.position.set(4,7,6);scene.add(key);
// key light casts the hair/face shadows; the ortho frustum just covers head + neck
key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-0.0006;key.shadow.normalBias=0.015;key.shadow.radius=2;
(function(c){c.left=-2.6;c.right=2.6;c.top=2.6;c.bottom=-2.6;c.near=2;c.far=22})(key.shadow.camera);key.target.position.set(0,2.75,-0.3);scene.add(key.target);
var rim=new T.DirectionalLight(0x9ec4ff,0.35);rim.position.set(-6,4,-5);scene.add(rim);
var fill=new T.DirectionalLight(0xffffff,0);fill.position.set(-5,1,6);scene.add(fill);
var pm=new T.PMREMGenerator(ren),es2=new T.Scene(),sky=new T.Mesh(new T.SphereGeometry(50,32,16),new T.MeshBasicMaterial({side:T.BackSide,vertexColors:true}));
sky.geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(sky.geometry.attributes.position.count*3),3));es2.add(sky);
function pnl(w,h){var m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({side:T.DoubleSide}));es2.add(m);return m}
var PKey=pnl(30,22),PRim=pnl(14,40),PTop=pnl(40,10),PFill=pnl(20,20),envRT=null;
var bgCv=document.createElement('canvas');bgCv.width=2;bgCv.height=256;var bgTex=new T.CanvasTexture(bgCv);

/* ================= mesh pipeline: Loop subdivision ================= */
var BASE={v:new Float32Array(D.v),f:Uint32Array.from(D.f)};
function loopSub(pos,idx){
 var nv=pos.length/3,nf=idx.length/3,em=new Map(),ea=[],eb=[],eo=[],eoc=[],fe=new Int32Array(nf*3),f,k,c,e,v;
 for(f=0;f<nf;f++)for(k=0;k<3;k++){var a=idx[f*3+k],b=idx[f*3+(k+1)%3],o=idx[f*3+(k+2)%3],K=a<b?a*nv+b:b*nv+a;e=em.get(K);
  if(e===undefined){e=ea.length;em.set(K,e);ea.push(a);eb.push(b);eo.push(o,-1);eoc.push(1)}else{if(eoc[e]===1)eo[e*2+1]=o;eoc[e]++}fe[f*3+k]=e}
 var ne=ea.length,deg=new Int32Array(nv),bd=new Int32Array(nv),sum=new Float64Array(nv*3),bsum=new Float64Array(nv*3);
 for(e=0;e<ne;e++){var A=ea[e],B=eb[e];deg[A]++;deg[B]++;for(c=0;c<3;c++){sum[A*3+c]+=pos[B*3+c];sum[B*3+c]+=pos[A*3+c]}
  if(eoc[e]!==2){bd[A]++;bd[B]++;for(c=0;c<3;c++){bsum[A*3+c]+=pos[B*3+c];bsum[B*3+c]+=pos[A*3+c]}}}
 var out=new Float32Array((nv+ne)*3);
 for(v=0;v<nv;v++){var j=v*3;
  if(bd[v]===2){for(c=0;c<3;c++)out[j+c]=0.75*pos[j+c]+0.125*bsum[j+c]}
  else if(bd[v]>0){for(c=0;c<3;c++)out[j+c]=pos[j+c]}
  else{var n=deg[v],be=n===3?3/16:3/(8*n);for(c=0;c<3;c++)out[j+c]=(1-n*be)*pos[j+c]+be*sum[j+c]}}
 for(e=0;e<ne;e++){var j2=(nv+e)*3,A2=ea[e],B2=eb[e];
  if(eoc[e]===2){var o1=eo[e*2],o2=eo[e*2+1];for(c=0;c<3;c++)out[j2+c]=0.375*(pos[A2*3+c]+pos[B2*3+c])+0.125*(pos[o1*3+c]+pos[o2*3+c])}
  else for(c=0;c<3;c++)out[j2+c]=0.5*(pos[A2*3+c]+pos[B2*3+c])}
 var nf2=new Uint32Array(nf*12);
 for(f=0;f<nf;f++){var a0=idx[f*3],b0=idx[f*3+1],c0=idx[f*3+2],ab=nv+fe[f*3],bc=nv+fe[f*3+1],ca=nv+fe[f*3+2];nf2.set([a0,ab,ca,ab,b0,bc,ca,bc,c0,ab,bc,ca],f*12)}
 return{p:out,f:nf2}}

var SHC,SHL,SHW2,VA,EARD,shortDirty=true,shortT=0,HLY=0,LEVEL=2,g=null,P,N,IX,NT,NV,REST,SD,NBO,NBI,LINER,RIMS={eyes:[],mouth:null},COMPS=[],SAMP_ALL,SAMP_BROW,SAMP_BEARD,skin=null,wire=null;
function setupMesh(lv){LEVEL=lv;var pos=BASE.v,idx=BASE.f;for(var i=0;i<lv;i++){var r=loopSub(pos,idx);pos=r.p;idx=r.f}
 NV=pos.length/3;REST=new Float32Array(pos);IX=idx;NT=idx.length/3;
 var ng=new T.BufferGeometry();ng.setAttribute('position',new T.BufferAttribute(new Float32Array(pos),3));ng.setIndex(new T.BufferAttribute(idx,1));
 ng.setAttribute('aRest',new T.BufferAttribute(REST,3));ng.setAttribute('color',new T.BufferAttribute(new Float32Array(NV*3),3));ng.setAttribute('aRough',new T.BufferAttribute(new Float32Array(NV),1));
 ng.computeVertexNormals();ng.computeBoundingSphere();
 var old=g;g=ng;P=g.attributes.position;N=g.attributes.normal;if(skin){skin.geometry=g;wire.geometry=g}if(old)old.dispose();
 ng.setAttribute('aFade',new T.BufferAttribute(new Float32Array(NV).fill(-1),1));
 ng.setAttribute('aShort',new T.BufferAttribute(new Float32Array(NV*2),2));g.setAttribute('aGv',new T.BufferAttribute(new Float32Array(NV),1));g.setAttribute('aCurv',new T.BufferAttribute(new Float32Array(NV),1));
 SD=new Float32Array(NV*3);SHC=new Float32Array(NV);SHL=new Float32Array(NV);SHW2=new Float32Array(NV*2);VA=new Float32Array(NV);shortDirty=true;
 for(var t0=0;t0<NT;t0++){var A0=IX[t0*3]*3,B0=IX[t0*3+1]*3,C0=IX[t0*3+2]*3,e1x=REST[B0]-REST[A0],e1y=REST[B0+1]-REST[A0+1],e1z=REST[B0+2]-REST[A0+2],e2x=REST[C0]-REST[A0],e2y=REST[C0+1]-REST[A0+1],e2z=REST[C0+2]-REST[A0+2],ar=Math.hypot(e1y*e2z-e1z*e2y,e1z*e2x-e1x*e2z,e1x*e2y-e1y*e2x)/6;VA[A0/3]+=ar;VA[B0/3]+=ar;VA[C0/3]+=ar}
 // distance to the ear (protruding flap) so the hairline can trace its outline
 EARD=new Float32Array(NV).fill(9);var EV=[];for(i=0;i<NV;i++){var ex0=Math.abs(REST[i*3]),ey0=REST[i*3+1],ez0=REST[i*3+2];if(ex0>1.26&&ey0>2.3&&ey0<3.2&&ez0>-1.05&&ez0<-0.35)EV.push(i)}
 for(i=0;i<NV;i++){var qx=REST[i*3],qy=REST[i*3+1],qz=REST[i*3+2];if(qy<1.9||qy>3.7||qz>0.1||qz<-1.6)continue;var md=9;for(var e=0;e<EV.length;e++){var ev=EV[e]*3;if((REST[ev]>0)!==(qx>0))continue;var dd=Math.hypot(REST[ev]-qx,REST[ev+1]-qy,REST[ev+2]-qz);if(dd<md)md=dd}EARD[i]=md}
 // vertex adjacency (CSR) for the smooth brush
 var cnt=new Int32Array(NV+1),t,k;for(t=0;t<NT*3;t++)cnt[IX[t]+1]+=2;for(i=0;i<NV;i++)cnt[i+1]+=cnt[i];
 var fillp=cnt.slice(0,NV),nb=new Int32Array(cnt[NV]);for(t=0;t<NT;t++)for(k=0;k<3;k++){var a=IX[t*3+k],b=IX[t*3+(k+1)%3];nb[fillp[a]++]=b;nb[fillp[b]++]=a}
 NBO=cnt;NBI=nb;
 SAMP_ALL=mkSampler(null);
 SAMP_BROW=mkSampler(function(x,y,z){return Math.abs(x)<1.05&&y>2.9&&y<3.55&&z>0.3});
 SAMP_BEARD=mkSampler(function(x,y,z){return y>0.75&&y<2.9&&z>-0.8&&Math.abs(x)<1.45});
 findRims();bakeMorphs();bakeLiner();buildShell()}
function mkSampler(fl){var L=[],C=[],t=0,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(var i=0;i<NT;i++){var ia=IX[i*3]*3,ib=IX[i*3+1]*3,ic=IX[i*3+2]*3;
  if(fl&&!fl((REST[ia]+REST[ib]+REST[ic])/3,(REST[ia+1]+REST[ib+1]+REST[ic+1])/3,(REST[ia+2]+REST[ib+2]+REST[ic+2])/3))continue;
  a.fromArray(REST,ia);b.fromArray(REST,ib);c.fromArray(REST,ic);t+=b.sub(a).cross(c.sub(a)).length()/2;L.push(i);C.push(t)}
 return{l:Int32Array.from(L),c:Float64Array.from(C),t:t}}
function pickS(Q,R){var r=R()*Q.t,lo=0,hi=Q.l.length-1;while(lo<hi){var m=(lo+hi)>>1;if(Q.c[m]<r)lo=m+1;else hi=m}return Q.l[lo]}
var SP={ti:0,u:0,v:0,x:0,y:0,z:0,p:new T.Vector3(),n:new T.Vector3()};
function setSP(ti,u,v){var w=1-u-v,ia=IX[ti*3]*3,ib=IX[ti*3+1]*3,ic=IX[ti*3+2]*3,pa=P.array,na=N.array;SP.ti=ti;SP.u=u;SP.v=v;
 SP.x=REST[ia]*w+REST[ib]*u+REST[ic]*v;SP.y=REST[ia+1]*w+REST[ib+1]*u+REST[ic+1]*v;SP.z=REST[ia+2]*w+REST[ib+2]*u+REST[ic+2]*v;
 SP.p.set(pa[ia]*w+pa[ib]*u+pa[ic]*v,pa[ia+1]*w+pa[ib+1]*u+pa[ic+1]*v,pa[ia+2]*w+pa[ib+2]*u+pa[ic+2]*v);
 SP.n.set(na[ia]*w+na[ib]*u+na[ic]*v,na[ia+1]*w+na[ib+1]*u+na[ic+1]*v,na[ia+2]*w+na[ib+2]*u+na[ic+2]*v).normalize();return SP}
function sample(Q,R){var ti=pickS(Q,R),u=R(),v=R();if(u+v>1){u=1-u;v=1-v}return setSP(ti,u,v)}

/* feature rims: open boundary loops of the mesh (eye sockets, mouth) drive eyes, lashes and mouth interior */
function findRims(){RIMS={eyes:[],mouth:null};var em=new Map(),nv=NV,t,k;
 for(t=0;t<NT;t++)for(k=0;k<3;k++){var a=IX[t*3+k],b=IX[t*3+(k+1)%3],K=a<b?a*nv+b:b*nv+a,e=em.get(K);if(e)e.c++;else em.set(K,{a:a,b:b,t:t,c:1})}
 var adj=new Map(),bed=[];em.forEach(function(e){if(e.c!==1)return;bed.push(e);[e.a,e.b].forEach(function(v){if(!adj.has(v))adj.set(v,[]);adj.get(v).push(e)})});
 var comp=new Map(),cid=0;adj.forEach(function(_,v){if(comp.has(v))return;var stck=[v];comp.set(v,cid);while(stck.length){var u=stck.pop();adj.get(u).forEach(function(e){var w=e.a===u?e.b:e.a;if(!comp.has(w)){comp.set(w,cid);stck.push(w)}})}cid++});
 var gr=[];for(var i=0;i<cid;i++)gr.push({v:[],e:[]});comp.forEach(function(c,v){gr[c].v.push(v)});bed.forEach(function(e){gr[comp.get(e.a)].e.push(e)});
 gr.forEach(function(q){var c=new T.Vector3();q.v.forEach(function(v){c.x+=REST[v*3];c.y+=REST[v*3+1];c.z+=REST[v*3+2]});c.divideScalar(q.v.length);q.c0=c;
  if(Math.abs(Math.abs(c.x)-0.42)<0.25&&Math.abs(c.y-2.95)<0.25&&c.z>0.3){q.k=c.x>0?0:1;q.E0=new T.Vector3(c.x>0?0.5:-0.5,2.93,0.47);var s=0;q.v.forEach(function(v){s+=Math.hypot(REST[v*3]-c.x,REST[v*3+1]-c.y,REST[v*3+2]-c.z)});q.s0=s/q.v.length;q.hw=0;q.v.forEach(function(v){q.hw=Math.max(q.hw,Math.abs(REST[v*3]-c.x))});RIMS.eyes.push(q)}
  else if(Math.abs(c.x)<0.12&&Math.abs(c.y-1.85)<0.2&&c.z>0.5){q.up=q.v.filter(function(v){return REST[v*3+1]>c.y});if(!q.up.length)q.up=q.v;var u0=new T.Vector3();q.up.forEach(function(v){u0.x+=REST[v*3];u0.y+=REST[v*3+1];u0.z+=REST[v*3+2]});q.u0=u0.divideScalar(q.up.length);RIMS.mouth=q}})}
function bakeLiner(){LINER=new Float32Array(NV);RIMS.eyes.forEach(function(r){var c=r.c0;
 for(var i=0;i<NV;i++){var x=REST[i*3],y=REST[i*3+1],z=REST[i*3+2];if(Math.abs(x-c.x)>0.45||Math.abs(y-c.y)>0.3||z<0.3)continue;var d=9;
  for(var q=0;q<r.v.length;q++){var v=r.v[q];d=Math.min(d,Math.hypot(x-REST[v*3],y-REST[v*3+1],z-REST[v*3+2]))}
  LINER[i]=Math.max(LINER[i],sm((0.05-d)/0.035)*(y>c.y-0.02?1:0.5))}})}
function bakeComp(src,id,c){var idx=[],d=[],typ=c[0],sym=c[c.length-1]===1;
 for(var i=0;i<NV;i++){var x=REST[i*3],y=REST[i*3+1],z=REST[i*3+2],dx=0,dy=0,dz=0,w;
  if(typ==='j'){var ax=Math.abs(x);w=sm((1.855-y)/0.035)*sm((z+0.6)/0.6)*sm((y-0.85)/0.4)*(1-0.5*sm((ax-0.6)/0.6));if(w<=0)continue;
   var A=0.22,ry=y-2.05,rz=z+0.55,ca=Math.cos(A),sa=Math.sin(A);dy=(ry*ca-rz*sa-ry)*w;dz=(ry*sa+rz*ca-rz)*w}
  else{var sg=sym&&x<0?-1:1,ex=(x-c[1]*sg)/c[4],ey=(y-c[2])/c[5],ez=(z-c[3])/c[6],r=Math.sqrt(ex*ex+ey*ey+ez*ez);if(r>=1)continue;w=sm(1-r);
   if(typ==='m'){dx=c[7]*sg;dy=c[8];dz=c[9];if(sym&&c[1]!==0)dx*=Math.min(1,Math.abs(x)/(c[4]*0.5))}
   else{dx=(x-c[10]*sg)*c[7];dy=(y-c[11])*c[8];dz=(z-c[12])*c[9]}
   dx*=w;dy*=w;dz*=w}
  if(Math.abs(dx)+Math.abs(dy)+Math.abs(dz)<1e-6)continue;idx.push(i);d.push(dx,dy,dz)}
 return{src:src,id:id,idx:Int32Array.from(idx),d:Float32Array.from(d)}}
function bakeMorphs(){COMPS=[];MD.forEach(function(m){m[4].forEach(function(c){COMPS.push(bakeComp('shape',m[0],c))})});
 EXPR.forEach(function(m){m[3].forEach(function(c){COMPS.push(bakeComp('expr',m[0],c))})});AGEC.forEach(function(c){COMPS.push(bakeComp('age','age',c))})}

/* ================= procedural PBR skin ================= */
function vn(Sz,per,R){var Gd=new Float32Array(per*per);for(var i=0;i<Gd.length;i++)Gd[i]=R();return function(x,y){x=x/Sz*per;y=y/Sz*per;var x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);var xa=x0%per,xb=(x0+1)%per,ya=y0%per,yb=(y0+1)%per,a1=Gd[ya*per+xa],b1=Gd[ya*per+xb],c1=Gd[yb*per+xa],d1=Gd[yb*per+xb];return a1+(b1-a1)*fx+(c1-a1)*fy+(a1-b1-c1+d1)*fx*fy}}
function mkSkinTex(){var Sz=512,R=rng(77),n1=vn(Sz,8,R),n2=vn(Sz,32,R),n3=vn(Sz,96,R),n4=vn(Sz,256,R),n5=vn(Sz,48,R);
 var hc=document.createElement('canvas');hc.width=hc.height=Sz;var hx=hc.getContext('2d'),hi=hx.createImageData(Sz,Sz),dc=document.createElement('canvas');dc.width=dc.height=Sz;var dx2=dc.getContext('2d'),di=dx2.createImageData(Sz,Sz);
 var pore=new Float32Array(Sz*Sz),frk=new Float32Array(Sz*Sz),k,ox,oy;
 for(k=0;k<2600;k++){var px=Math.floor(R()*Sz),py=Math.floor(R()*Sz),pr=1.2+R()*1.6,dep=0.4+R()*0.6;for(oy=-4;oy<=4;oy++)for(ox=-4;ox<=4;ox++){var dd=ox*ox+oy*oy;if(dd>pr*pr*3.2)continue;var xx=(px+ox+Sz)%Sz,yy=(py+oy+Sz)%Sz,v=dep*Math.exp(-dd/(pr*pr));if(v>pore[yy*Sz+xx])pore[yy*Sz+xx]=v}}
 for(k=0;k<900;k++){var fx2=Math.floor(R()*Sz),fy2=Math.floor(R()*Sz),fr=0.9+R()*1.8,fa=0.35+R()*0.65;for(oy=-5;oy<=5;oy++)for(ox=-5;ox<=5;ox++){var d2=ox*ox+oy*oy;if(d2>fr*fr*4)continue;var x3=(fx2+ox+Sz)%Sz,y3=(fy2+oy+Sz)%Sz,v2=fa*Math.exp(-d2/(fr*fr));if(v2>frk[y3*Sz+x3])frk[y3*Sz+x3]=v2}}
 for(var y=0;y<Sz;y++)for(var x=0;x<Sz;x++){var i=(y*Sz+x)*4,h=0.35*n3(x,y)+0.25*n4(x,y)+0.25*n2(x,y)+0.15*n1(x,y);h=Math.max(0,Math.min(1,h*0.7+0.3-pore[y*Sz+x]*0.45));hi.data[i]=hi.data[i+2]=h*255;hi.data[i+1]=Math.min(1,frk[y*Sz+x])*255;hi.data[i+3]=255;
  var red=(n1(x,y)-0.5)*0.08+(n5(x,y)-0.5)*0.04,fn=(n3(x,y)-0.5)*0.08;di.data[i]=Math.min(255,(1+red+fn)*204);di.data[i+1]=Math.min(255,(1-red*0.8+fn)*204);di.data[i+2]=Math.min(255,(1-red*0.6+fn)*204);di.data[i+3]=255}
 // B = micro furrows: short criss-crossing grooves at two dominant angles, like the fine skin texture between pores
 var mc=document.createElement('canvas');mc.width=mc.height=Sz;var mx=mc.getContext('2d');mx.fillStyle='#fff';mx.fillRect(0,0,Sz,Sz);mx.lineCap='round';
 for(k=0;k<2400;k++){var ma=(R()<0.5?0.7:-0.75)+(R()-0.5)*0.5,ml=5+R()*16,mcx=R()*Sz,mcy=R()*Sz,mdx=Math.cos(ma)*ml/2,mdy=Math.sin(ma)*ml/2;mx.strokeStyle='rgba(0,0,0,'+(0.1+R()*0.28).toFixed(3)+')';mx.lineWidth=0.6+R()*0.9;
  for(var tx9=-1;tx9<=1;tx9++)for(var ty9=-1;ty9<=1;ty9++){mx.beginPath();mx.moveTo(mcx-mdx+tx9*Sz,mcy-mdy+ty9*Sz);mx.lineTo(mcx+mdx+tx9*Sz,mcy+mdy+ty9*Sz);mx.stroke()}}
 var md=mx.getImageData(0,0,Sz,Sz).data;for(k=0;k<Sz*Sz*4;k+=4)hi.data[k+2]=md[k];
 hx.putImageData(hi,0,0);dx2.putImageData(di,0,0);
 function txr(c){var q=new T.CanvasTexture(c);q.wrapS=q.wrapT=T.RepeatWrapping;q.anisotropy=8;return q}return{h:txr(hc),d:txr(dc)}}
// Tileable short-hair texture built with the Hair Texture Generator approach: R = short stubble strokes,
// G = follicle dots, B = longer strokes (root-dense, lighter body). Painted on the scalp by cut length.
function mkHairTex(){var W=512,R=rng(4242),out=document.createElement('canvas');out.width=out.height=W;var ox=out.getContext('2d'),od=ox.createImageData(W,W);
 function layer(draw){var c=document.createElement('canvas');c.width=c.height=W;var x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,W,W);x.lineCap='round';draw(x);return x.getImageData(0,0,W,W).data}
 function wrap(px,py,m,fn){for(var dx=-1;dx<=1;dx++)for(var dy=-1;dy<=1;dy++){var X=px+dx*W,Y=py+dy*W;if(X<-m||X>W+m||Y<-m||Y>W+m)continue;fn(X,Y)}}
 var dots=layer(function(x){for(var i=0;i<9000;i++){var px=R()*W,py=R()*W,r=0.9+R()*1.1;x.fillStyle='rgba(255,255,255,'+(0.35+R()*0.55)+')';wrap(px,py,4,function(X,Y){x.beginPath();x.arc(X,Y,r,0,6.283);x.fill()})}});
 function strokes(n,lmin,lmax,th){return layer(function(x){for(var i=0;i<n;i++){var px=R()*W,py=R()*W,a=Math.PI/2+(R()-.5)*0.9,L=lmin+R()*(lmax-lmin),bend=(R()-.5)*L*0.25,c=Math.cos(a),sn=Math.sin(a),w=th*(0.8+R()*0.5),body=0.55+R()*0.3;
  var mx=c*L*.5-sn*bend,my=sn*L*.5+c*bend,tx=c*L+sn*bend*.5,ty=sn*L-c*bend*.5;
  wrap(px,py,lmax+4,function(X,Y){x.lineWidth=w;x.strokeStyle='rgba(255,255,255,0.95)';x.beginPath();x.moveTo(X,Y);x.lineTo(X+mx,Y+my);x.stroke();x.lineWidth=w*0.75;x.strokeStyle='rgba(255,255,255,'+body+')';x.beginPath();x.moveTo(X+mx,Y+my);x.lineTo(X+tx,Y+ty);x.stroke()})}})}
 var sh=strokes(7000,4,9,1.6),lg=strokes(3200,16,34,1.6);
 for(var i=0;i<W*W*4;i+=4){od.data[i]=sh[i];od.data[i+1]=dots[i];od.data[i+2]=lg[i];od.data[i+3]=255}
 ox.putImageData(od,0,0);var t=new T.CanvasTexture(out);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t}
// Pre-integrated subsurface scattering (Penner 2011): the d'Eon/Jimenez six-Gaussian skin profile integrated
// around a ring of radius r. u = N.L remapped to 0..1, v = surface curvature (v 1 = 2 mm radius).
function mkSssLut(){var W=96,Hh=64,d=new Uint8Array(W*Hh*4),V=[0.0064,0.0484,0.187,0.567,1.99,7.41],WR=[0.233,0.1,0.118,0.113,0.358,0.078],WG=[0.455,0.336,0.198,0.007,0.004,0],WB=[0.649,0.344,0,0.007,0,0],NS=320,X=new Float32Array(NS),J=new Float32Array(NS),RR=new Float32Array(NS),RG=new Float32Array(NS),RB=new Float32Array(NS),s,y,x,k;
 for(s=0;s<NS;s++){var u=(s+0.5)/NS*2-1;X[s]=Math.PI*u*u*u;J[s]=3*Math.PI*u*u*2/NS}
 for(y=0;y<Hh;y++){var r=1/(((y+0.5)/Hh)*0.5);
  for(s=0;s<NS;s++){var dd=2*r*Math.abs(Math.sin(X[s]/2)),a=0,b=0,c=0;for(k=0;k<6;k++){var gk=Math.exp(-dd*dd/(2*V[k]))/(2*Math.PI*V[k]);a+=WR[k]*gk;b+=WG[k]*gk;c+=WB[k]*gk}RR[s]=a*J[s];RG[s]=b*J[s];RB[s]=c*J[s]}
  for(x=0;x<W;x++){var th=Math.acos((x+0.5)/W*2-1),nr=0,ng=0,nb=0,dr=0,dg=0,db=0;
   for(s=0;s<NS;s++){var cl=Math.max(0,Math.cos(th+X[s]));nr+=cl*RR[s];ng+=cl*RG[s];nb+=cl*RB[s];dr+=RR[s];dg+=RG[s];db+=RB[s]}
   var o=(y*W+x)*4;d[o]=clamp(nr/dr,0,1)*255;d[o+1]=clamp(ng/dg,0,1)*255;d[o+2]=clamp(nb/db,0,1)*255;d[o+3]=255}}
 var t=new T.DataTexture(d,W,Hh,T.RGBAFormat,T.UnsignedByteType);t.magFilter=t.minFilter=T.LinearFilter;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.generateMipmaps=false;t.needsUpdate=true;return t}
var SKT=mkSkinTex(),SKU={bump:{value:0.6},oil:{value:0.5},sss:{value:0.7},trn:{value:0.8},age:{value:0},frk:{value:0.2},micro:{value:0.8},fuzz:{value:0.35},lut:{value:mkSssLut()},ht:{value:mkHairTex()},hA:{value:new T.Color()},hB:{value:new T.Color()},stub:{value:0.5},fadeN:{value:1},fadeShow:{value:0}};
var MAPSHOW={value:0};
var skinMat=new T.MeshPhysicalMaterial({vertexColors:true,roughness:0.58,metalness:0,reflectivity:0.42,clearcoat:0.06,clearcoatRoughness:0.4,side:T.DoubleSide,envMapIntensity:0.85});
skinMat.onBeforeCompile=function(sh){sh.uniforms.uH={value:SKT.h};sh.uniforms.uD={value:SKT.d};sh.uniforms.uBump=SKU.bump;sh.uniforms.uOil=SKU.oil;sh.uniforms.uSSS=SKU.sss;sh.uniforms.uTrn=SKU.trn;sh.uniforms.uAge=SKU.age;sh.uniforms.uFrk=SKU.frk;sh.uniforms.uHT=SKU.ht;sh.uniforms.uHairA=SKU.hA;sh.uniforms.uHairB=SKU.hB;sh.uniforms.uStub=SKU.stub;sh.uniforms.uFadeN=SKU.fadeN;sh.uniforms.uFadeShow=SKU.fadeShow;sh.uniforms.uMapShow=MAPSHOW;sh.uniforms.uMicro=SKU.micro;sh.uniforms.uFuzz=SKU.fuzz;sh.uniforms.uLut=SKU.lut;sh.uniforms.uKeyV=LU.uL1;
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 aRest;attribute float aRough;attribute vec2 aShort;varying vec2 vShort;attribute float aFade;varying float vFade;attribute float aGv;varying float vGv;attribute float aCurv;varying float vCurv;varying vec3 vOP;varying vec3 vON;varying float vThin;varying float vRough;').replace('#include <begin_vertex>','#include <begin_vertex>\nvOP=aRest;vON=normal;vRough=aRough;vShort=aShort;vFade=aFade;vGv=aGv;vCurv=aCurv;float ea=smoothstep(0.95,1.35,abs(aRest.x))*step(2.2,aRest.y)*step(aRest.y,3.4);float nz=exp(-(aRest.x*aRest.x/0.12+(aRest.y-2.45)*(aRest.y-2.45)/0.15))*step(0.9,aRest.z);vThin=clamp(ea+nz*0.8,0.0,1.0);');
 var DIRECT_OLD='reflectedLight.directDiffuse += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );';
 var DIRECT_NEW=`{
  // red diffuses furthest under the skin, so it sees the smooth normal; blue keeps the pore-level detail
  float cS=clamp(vCurv*(0.5+uSSS)/27.5,0.0,1.0);
  vec3 Ls=directLight.direction;
  float nB=dot(geometry.normal,Ls),nR=dot(gSmN,Ls),nG=mix(nR,nB,0.45);
  vec3 dS=vec3(sssLut(nR,cS).r,sssLut(nG,cS).g,sssLut(nB,cS).b);
  dS=mix(vec3(saturate(nB)),dS,clamp(uSSS*1.25,0.0,1.0));
  vec3 sssIrr=dS*directLight.color;
  #ifndef PHYSICALLY_CORRECT_LIGHTS
  sssIrr*=PI;
  #endif
  reflectedLight.directDiffuse += ( 1.0 - clearcoatDHR ) * sssIrr * BRDF_Diffuse_Lambert( material.diffuseColor )*mix(0.86,1.0,gCav);
  vec3 tlS=normalize(directLight.direction+geometry.normal*0.35);
  float trS=pow(clamp(dot(geometry.viewDir,-tlS),0.0,1.0),3.0);
  vec3 trI=directLight.color*trS*vThin*uTrn*2.2;
  #ifndef PHYSICALLY_CORRECT_LIGHTS
  trI*=PI;
  #endif
  reflectedLight.directDiffuse += trI*vec3(1.0,0.34,0.18)*material.diffuseColor;
 }`;
    var SPEC_OLD='reflectedLight.directSpecular += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Specular_GGX( directLight, geometry.viewDir, geometry.normal, material.specularColor, material.specularRoughness);';
    // dual-lobe skin specular: tight oily sheen + broad lobe, occluded inside pores and furrows
    var SPEC_NEW='reflectedLight.directSpecular += ( 1.0 - clearcoatDHR ) * irradiance * mix(0.45,1.0,gCav) * (0.85*BRDF_Specular_GGX( directLight, geometry.viewDir, geometry.normal, material.specularColor, clamp(material.specularRoughness*0.75,0.08,1.0)) + 0.15*BRDF_Specular_GGX( directLight, geometry.viewDir, geometry.normal, material.specularColor, min(material.specularRoughness*1.35,1.0)));';
 var chunkS=T.ShaderChunk.lights_physical_pars_fragment;if(chunkS.indexOf(SPEC_OLD)<0)console.warn('skin specular anchor missing');chunkS=chunkS.replace(SPEC_OLD,SPEC_NEW);if(chunkS.indexOf(DIRECT_OLD)<0)console.warn('SSS anchor missing');chunkS=chunkS.replace(DIRECT_OLD,DIRECT_NEW);
 sh.fragmentShader=sh.fragmentShader.replace('#include <lights_physical_pars_fragment>',chunkS).replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n{vec3 dnS=fwidth(normal);float vS=dot(dnS,dnS);material.specularRoughness=min(1.0,sqrt(material.specularRoughness*material.specularRoughness+min(vS*1.5,0.25)));}');
 var lfb=T.ShaderChunk.lights_fragment_begin.split('\n').map(function(l){if(l.indexOf('getShadow( directionalShadowMap')<0)return l;return l.replace('directLight.color *= ','{float shS = ').replace(/;\s*$/,';directLight.color *= mix(vec3(shS),pow(vec3(shS),vec3(0.42,1.0,1.5)),clamp(uSSS,0.0,1.0));}')}).join('\n');
 if(lfb.indexOf('float shS')<0)console.warn('skin shadow anchor missing');sh.fragmentShader=sh.fragmentShader.replace('#include <lights_fragment_begin>',lfb);
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform float uMicro;uniform float uFuzz;uniform sampler2D uLut;uniform vec3 uKeyV;varying float vCurv;vec3 gSmN=vec3(0.0,0.0,1.0);float gCav=1.0;
vec3 sssLut(float nl,float c){return texture2D(uLut,vec2(nl*0.5+0.5,c)).rgb;}
varying vec3 vOP;varying vec3 vON;varying float vThin;varying float vRough;uniform sampler2D uH;uniform sampler2D uD;uniform float uBump;uniform float uOil;uniform float uSSS;uniform float uTrn;uniform float uAge;uniform float uFrk;uniform sampler2D uHT;uniform vec3 uHairA;uniform vec3 uHairB;uniform float uStub;varying vec2 vShort;varying float vFade;varying float vGv;uniform float uMapShow;uniform float uFadeN;uniform float uFadeShow;
vec3 tpW(){vec3 w=pow(abs(normalize(vON)),vec3(4.0));return w/(w.x+w.y+w.z);}
float tpH(){vec3 w=tpW();vec3 p=vOP*1.05;return texture2D(uH,p.zy).r*w.x+texture2D(uH,p.xz).r*w.y+texture2D(uH,p.xy).r*w.z;}
float tpM(){vec3 w=tpW();vec3 p=vOP*3.1;return texture2D(uH,p.zy).b*w.x+texture2D(uH,p.xz).b*w.y+texture2D(uH,p.xy).b*w.z;}
float tpF(){vec3 w=tpW();vec3 p=vOP*0.7;return texture2D(uH,p.zy).g*w.x+texture2D(uH,p.xz).g*w.y+texture2D(uH,p.xy).g*w.z;}
vec3 tpD(){vec3 w=tpW();vec3 p=vOP*0.7;return texture2D(uD,p.zy).rgb*w.x+texture2D(uD,p.xz).rgb*w.y+texture2D(uD,p.xy).rgb*w.z;}
float wrk(){if(uAge<=0.001)return 0.0;vec3 p=vOP;float ax=abs(p.x);
 float fh=pow(sin(p.y*46.0+sin(p.x*3.0)*1.2+texture2D(uH,p.xy*0.18).r*3.5)*0.5+0.5,6.0)*(0.25+0.95*texture2D(uH,p.xy*0.33+0.37).r)*smoothstep(3.3,3.5,p.y)*smoothstep(4.1,3.8,p.y)*smoothstep(0.9,0.3,ax)*step(0.6,p.z);
 vec2 q=vec2(ax-0.82,p.y-2.93);float r=length(q);float cf=pow(sin(atan(q.y,q.x)*14.0)*0.5+0.5,4.0)*smoothstep(0.25,0.05,r)*smoothstep(0.02,0.07,r)*step(-0.05,q.x)*step(0.3,p.z);
 vec2 a=vec2(0.27,2.33);vec2 ba=vec2(0.5,1.88)-a;vec2 pa=vec2(ax,p.y)-a;float hh=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);float nl=smoothstep(0.035,0.0,length(pa-ba*hh))*step(0.7,p.z);
 return (fh*0.6+cf*0.3+nl*0.5)*uAge;}`)
 .replace('#include <color_fragment>',`#include <color_fragment>
diffuseColor.rgb*=tpD()*1.25;
{float fm=exp(-(vOP.x*vOP.x/0.9+(vOP.y-2.55)*(vOP.y-2.55)/0.22))*smoothstep(0.3,0.9,vOP.z);float fk=clamp(tpF()*uFrk*(0.25+0.9*fm)*1.6,0.0,1.0);diffuseColor.rgb*=mix(vec3(1.0),vec3(0.6,0.42,0.32),fk);diffuseColor.rgb*=1.0-wrk()*0.18;}
float gHair=0.0;
{vec3 w=tpW();vec3 p=vOP*1.7;vec3 h3=texture2D(uHT,p.zy).rgb*w.x+texture2D(uHT,p.xz).rgb*w.y+texture2D(uHT,p.xy).rgb*w.z;
 float dn=clamp(vShort.y,0.0,1.0),ln=vShort.x;
 float dots=h3.g*dn*(0.45+0.55*uStub);
 float hs=max(h3.r*smoothstep(0.003,0.03,ln),h3.b*smoothstep(0.025,0.1,ln))*dn*(1.0-0.85*smoothstep(0.12,0.35,ln));
 // soft tone = what the follicles average to at a distance; grows with length so fades grade smoothly
 // guard length on a log scale: skin 0, #0 ~0.4, #0.5 ~0.7, #1 ~0.9, #1.5+ 1 -> each clipper band reads as its own shade
 float gl=clamp(log(max(ln,0.004)/0.004)/3.2189,0.0,1.0);
 float tone=dn*(0.1+0.82*pow(gl,0.7))*(0.85+0.15*uStub);
 vec3 shadowC=mix(uHairA*0.7,vec3(0.15,0.16,0.18),0.4*(1.0-gl));
 diffuseColor.rgb=mix(diffuseColor.rgb,shadowC,clamp(tone,0.0,0.92));
 diffuseColor.rgb=mix(diffuseColor.rgb,shadowC*0.8,clamp(dots*0.55,0.0,1.0));
 diffuseColor.rgb=mix(diffuseColor.rgb,mix(uHairA,uHairB,0.3*h3.b),clamp(hs*0.9,0.0,1.0));
 gHair=clamp(tone+dots*0.4+hs,0.0,1.0);}
if(uMapShow>0.5)diffuseColor.rgb=mix(diffuseColor.rgb*0.55+0.25,vec3(1.0,0.74,0.08),clamp(vGv,0.0,1.0)*0.9);
if(uFadeShow>0.5&&vFade>0.5&&vFade<uFadeN+0.5){float fd=abs(vFade-floor(vFade+0.5)),fw=max(fwidth(vFade),1e-4);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0,0.72,0.15),(1.0-smoothstep(fw*0.7,fw*1.8,fd))*0.9*smoothstep(0.15,0.5,vShort.y));}`)
 .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor+=(0.55-tpH())*0.3+uAge*0.06-vRough;gCav=smoothstep(0.18,0.6,tpH())*mix(1.0,tpM(),0.5*clamp(uMicro,0.0,1.0));
float tzn=exp(-pow(vOP.x/0.9,2.0))*smoothstep(1.9,2.5,vOP.y)*smoothstep(-0.2,0.6,vOP.z)*smoothstep(4.2,3.6,vOP.y);
roughnessFactor=clamp(roughnessFactor-tzn*uOil*0.3*(1.0-gHair),0.1,1.0);roughnessFactor=mix(roughnessFactor,0.85,gHair*0.8);`)
 .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
gSmN=normal;
{float axS=abs(vOP.x),dyN=vOP.y-2.5,dyC=vOP.y-2.45,dyL=vOP.y-1.85;float noseM=exp(-(vOP.x*vOP.x/0.05+dyN*dyN/0.12))*step(0.9,vOP.z),chkM=exp(-((axS-0.72)*(axS-0.72)/0.08+dyC*dyC/0.1))*step(0.3,vOP.z),lipM=exp(-dyL*dyL/0.008-vOP.x*vOP.x/0.25)*step(0.8,vOP.z);float pm=(0.75+0.9*noseM+0.45*chkM)*(1.0-0.8*lipM);float hH=tpH()*uBump*0.0042*pm+(tpM()-1.0)*uMicro*0.0014*(1.0-0.6*lipM)-wrk()*0.007;vec3 dpx=dFdx(-vViewPosition),dpy=dFdy(-vViewPosition);float dHx=dFdx(hH),dHy=dFdy(hH);vec3 rr1=cross(dpy,normal),rr2=cross(normal,dpx);float det=dot(dpx,rr1);vec3 gr=sign(det)*(dHx*rr1+dHy*rr2);normal=normalize(abs(det)*normal-gr);}`)
 .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
{float rim=pow(1.0-clamp(dot(normalize(vViewPosition),normal),0.0,1.0),3.0);float ear=smoothstep(0.9,1.4,abs(vOP.x))*step(2.2,vOP.y)*step(vOP.y,3.4);
float NoVf=clamp(dot(normalize(vViewPosition),normal),0.0,1.0),fz=pow(1.0-NoVf,4.0)*(0.25+0.75*clamp(dot(normal,uKeyV)*0.6+0.4,0.0,1.0));
totalEmissiveRadiance+=vec3(0.62,0.14,0.06)*(rim*0.1+ear*0.1)*uSSS*diffuseColor.r+uFuzz*0.16*fz*mix(diffuseColor.rgb,vec3(0.92,0.86,0.8),0.55)*(1.0-gHair);}`)};
var clayMat=new T.MeshStandardMaterial({color:0xbab3aa,roughness:0.72,metalness:0,side:T.DoubleSide});
var wireMat=new T.MeshBasicMaterial({color:0x7fd0ff,wireframe:true,transparent:true,opacity:0.22,depthWrite:false});

/* ================= strand hair (instanced, GPU-evaluated) ================= */
// Barber's ear outline (uEar 0). The ear is detected from the mesh (detectEar), so the outline follows
// sculpted/resized ears. uEarC: flap base |x|, centre y, z; uEarR: clearance radii (y,z, margin included);
// uEarB: sideburn bottom y, y where the back hairline starts sloping, taper width, back-line slope.
var EAR_GLSL=`
uniform float uEar;uniform vec3 uEarC;uniform vec2 uEarR;uniform vec4 uEarB;
bool earCut(){
 if(uEar<-0.5||uEar>0.5||vTd>0.5)return false;
 if(fract(vVar*13.1)<smoothstep(0.55,0.95,vL))return false;
 float ax=abs(vW.x);if(ax<uEarC.x-0.5)return false;
 float f=(fract(vVar*31.7)-0.5)*0.09;
 vec2 q=vec2((vW.y-uEarC.y)/uEarR.x,(vW.z-uEarC.z)/uEarR.y);
 if(dot(q,q)<1.0+f*2.0)return true;
 float f2=(fract(vVar*57.3)-0.5)*0.16;
 float zb=uEarC.z-uEarR.y*0.86-max(0.0,uEarB.y-vW.y)*uEarB.w+f;
 return vW.y<uEarC.y&&vW.z>zb&&(vW.z<uEarC.z+uEarR.y+f||vW.y<uEarB.x+f2);
}
`;
var HAIR_VS=`
attribute float aT;attribute vec3 aRoot;attribute vec3 aDir;attribute vec3 aNrm;attribute vec4 aMisc;attribute float aVar;attribute vec4 aClump;attribute vec3 aCC;attribute vec4 aGrm;attribute vec4 aTint;
uniform float uFlow;uniform vec3 uHC;uniform vec3 uHR;uniform sampler2D uShell;uniform float uVol;uniform float uVolF;uniform float uLayer;uniform float uGravF;uniform float uClumpA;uniform float uHide;uniform float uDrape;
uniform sampler2D uPh;uniform float uGW;uniform float uCurl;uniform float uSag;uniform float uPhys;uniform vec4 uClip;uniform float uCoil;uniform float uFreq;uniform float uWaveA;uniform float uWaveF;uniform float uLock;uniform float uBend;
varying vec3 vT;varying vec3 vN;varying vec3 vV;varying float vP;varying float vVar;varying float vS;varying vec3 vW;varying vec4 vTint;varying float vTd;varying float vL;varying float vHl;
// hair flows around the ear (tucked behind / in front of it, side chosen per strand from its root) instead of tenting over it or poking through
uniform float uEar;uniform vec3 uEarC;uniform vec2 uEarR;uniform vec4 uEarB;float shellR(vec3 u);
// Ear routing (uEar: -1 off, 0 tucked behind, 1 covering) around the detected ear (uEarC/uEarR).
vec3 earFix(vec3 p,float t){
 if(uEar<-0.5)return p;
 float ax=abs(p.x),sx=p.x<0.0?-1.0:1.0;
 vec2 qe=(vec2(p.y,p.z)-uEarC.yz)/uEarR;float e2=dot(qe,qe);
 if(ax<uEarC.x-0.25)return p;
 float w=smoothstep(0.01,0.12,t)*smoothstep(1.0,0.5,e2);
 if(uEar<0.5){
  // long hair is not tucked: it drapes over the ear (sweeping it behind stacked strands into a flat wall)
  float lw=smoothstep(0.55,0.95,aMisc.x);
  if(lw>0.0){vec2 qc=vec2((p.y-uEarC.y)/(p.y<uEarC.y?uEarR.x*1.7:uEarR.x*1.05),(p.z-uEarC.z)/(uEarR.y*1.15));float f2=dot(qc,qc);
   if(f2<1.0&&ax<1.75){float tgt=uEarC.x+0.3;p.x=sx*mix(ax,max(ax,tgt),lw*smoothstep(1.0,0.0,f2)*smoothstep(0.01,0.12,t));}}
  // taper: approaching the ear outline the hair is pressed onto the scalp so it thins out instead of ending in a wall
  float et=length((vec2(p.y,p.z)-uEarC.yz)/uEarR);
  float wt=smoothstep(1.05+uEarB.z,1.05,et)*smoothstep(0.01,0.1,t)*step(uEarC.x-0.35,ax);
  wt*=1.0-lw;if(wt>0.0){vec3 qq=(p-uHC)/uHR;float ll=length(qq);vec3 uu=qq/ll;float sr=shellR(uu)+0.012;if(ll>sr)p=mix(p,uHC+uHR*uu*sr,wt*0.9);}
  return p;
 }else{
  // covering: every hair layer is lifted by the ear's protrusion (keeps the layering, so no sparse sheet),
  // easing in above the ear and draping out slowly below it
  vec2 qc=vec2((p.y-uEarC.y)/(p.y<uEarC.y?uEarR.x*1.7:uEarR.x*1.05),(p.z-uEarC.z)/(uEarR.y*1.15));float f2=dot(qc,qc);
  if(f2<1.0&&ax<1.75)p.x=sx*(ax+0.36*smoothstep(1.0,0.3,f2)*smoothstep(0.01,0.12,t));
 }
 return p;}
float shellR(vec3 u){vec2 uv=vec2(atan(u.x,u.z)*0.15915494+0.5,asin(clamp(u.y,-1.0,1.0))*0.31830989+0.5);return 0.6+texture2D(uShell,uv).r*1.2;}
// Flow groom: the strand travels along a great circle of the head shell (ellipsoid space, radius from a
// baked surface map) in its combed direction, lifts off by the volume profile, and leaves the head
// where its path turns straight down, then hangs under gravity.
vec3 flowP(float s,float L){
 vec3 q=(aRoot-uHC)/uHR;float ql=length(q);vec3 u0=q/ql;
 vec3 d=aDir/uHR;d-=u0*dot(d,u0);float dl=length(d);d=dl>1e-5?d/dl:normalize(cross(u0,vec3(1.0,0.0,0.0)));
 float k=ql-shellR(u0);
 float spd=max(0.2,length(uHR*d)*ql);
 float th=3.14159265-atan(u0.y,d.y+1e-6);if(th>3.14159265)th=0.0;th=min(th,2.2);
 // back/side strands keep following the shell past vertical so they settle onto the nape and neck
 vec3 uT=u0*cos(th)+d*sin(th);float ext=uDrape*0.6*(1.0-smoothstep(-0.05,0.2,uT.z));th+=ext;
 float sw=min(s,th*spd);float a=sw/spd;
 vec3 ua=u0*cos(a)+d*sin(a);
 float rad=shellR(ua)+k*(1.0-smoothstep(0.0,0.6,a));
 vec3 nW=normalize(ua/uHR);
 float fr=smoothstep(0.1,0.9,u0.z)*smoothstep(-0.3,0.4,u0.y);
 float h=0.004+(uVol+uVolF*fr)*smoothstep(0.0,0.2,s)*(0.15+1.25*fract(aVar*7.31))+uLayer*0.05*s;
 vec3 p=uHC+uHR*ua*rad+nW*h;
 float ex=s-sw;
 if(ex>0.0){vec3 tw=normalize(uHR*(-u0*sin(th)+d*cos(th)));float gw=uGravF*ex*0.9;gw=gw/(1.0+gw);p+=normalize(mix(tw,vec3(0.0,-1.0,0.0),max(gw,step(0.01,ext)*0.75*smoothstep(0.0,0.3,ex))))*ex;}
 return p;}
uniform float uFrizz;uniform float uStray;uniform float uGuide;
uniform vec4 uTie;uniform vec3 uTieN;uniform vec4 uTieP;uniform vec3 uTieSw;
float gTied;
// Hair tie: a tied strand runs over the scalp to the band (great circle in head-ellipsoid space), gathers there,
// then hangs as a ponytail (uTie.w 1) or coils into a bun (uTie.w 2). uTieP: bun radius, spread, tightness.
float tieD(){vec3 u0=normalize((aRoot-uHC)/uHR),u1=normalize((uTie.xyz-uHC)/uHR);float A=acos(clamp(dot(u0,u1),-1.0,1.0));vec3 um=u0+u1;um=length(um)>1e-3?normalize(um):u1;return A*length(uHR*um)*shellR(um);}
vec3 tieP(float s,float L){
 vec3 u0=normalize((aRoot-uHC)/uHR),u1=normalize((uTie.xyz-uHC)/uHR);
 float A=acos(clamp(dot(u0,u1),-1.0,1.0)),D=min(max(tieD(),1e-3),L*0.75);
 vec3 N=uTieN,rd=aRoot-uTie.xyz;rd-=N*dot(rd,N);float rl=length(rd);
 vec3 b1=normalize(cross(N,abs(N.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0))),b2=cross(N,b1);
 vec3 e=(rl>1e-4?rd/rl:b1)*0.055*(0.35+0.65*fract(aVar*3.71));
 float lift=mix(0.03,0.004,uTieP.z)+0.012*fract(aVar*7.31);
 if(s<D){float a=s/D;vec3 ua=A>1e-3?(sin((1.0-a)*A)*u0+sin(a*A)*u1)/sin(A):u1;
  return uHC+uHR*ua*(shellR(ua)+lift+0.05*smoothstep(0.6,1.0,a))+e*smoothstep(0.7,1.0,a);}
 float r=s-D;vec3 E=uTie.xyz+N*(lift+0.05)+e,p;
 if(uTie.w<1.5){
  float k0=mix(0.18,0.32,uTieP.z),ex=k0*(1.0-exp(-r/k0));
  vec3 cl=uTie.xyz+N*0.06+N*ex+vec3(0.0,-1.0,0.0)*(r-ex)+uTieSw*smoothstep(0.0,1.2,r)*min(r,1.4);
  vec3 qq=(cl-uHC)/uHR;float ll=length(qq);vec3 uu=qq/ll;float sr=shellR(uu)+0.09;if(ll<sr)cl=uHC+uHR*uu*sr;
  p=cl+(E-uTie.xyz-N*0.06)*(1.0+r*uTieP.y*2.5);
 }else{
  float rt=r/max(L-D,0.05),Rb=uTieP.x,phi=atan(dot(e,b2),dot(e,b1))+r/(Rb*0.95),rr=Rb*(1.0-0.5*rt)*(0.7+0.6*fract(aVar*5.31));
  p=uTie.xyz+N*(lift+0.04+Rb*1.15*rt)+(b1*cos(phi)+b2*sin(phi))*rr;
 }
 return p;}
vec3 hp(float t){
 float L=aMisc.x;
 vec3 tn=aDir-aNrm*dot(aDir,aNrm);float tnl=length(tn);tn=tnl>1e-3?tn/tnl:aDir;
 vec3 p;
 if(gTied>0.5)p=tieP(t*L,L);else if(uFlow>0.5)p=flowP(t*L,L);
 else p=aRoot+(aDir*t+(tn-aDir)*(uBend*t*t))*L-vec3(0.0,uSag*L*L*t*t,0.0);
 if(gTied>0.5){vec3 sdt=normalize(cross(uTieN,aDir)+vec3(1e-4,0.0,0.0));return p+sdt*sin(t*L*7.0+aClump.x)*uWaveA*0.5*aClump.w*smoothstep(0.0,0.3,t)*(1.0+aGrm.x);}
 float rf=clamp(1.0+aGrm.x,0.0,2.0);
 // groomed hair curls sideways along the scalp (world x/z offsets made strands cross and read as a second layer)
 vec3 cvd=uFlow>0.5?normalize(cross(aNrm,aDir)+vec3(1e-4,0.0,0.0))*aMisc.z*0.7+aNrm*abs(aMisc.w)*0.2:vec3(aMisc.z,0.0,aMisc.w);
 p+=cvd*(uCurl*L*0.3*t*t*rf)+aCC*(uClumpA*(1.0+aGrm.z*1.6)*smoothstep(0.15,1.0,t)*smoothstep(0.05,0.4,L));
 if(uCoil>0.0){
  vec3 ax=aDir;vec3 cu=normalize(cross(ax,abs(ax.y)<0.9?vec3(0.0,1.0,0.0):vec3(1.0,0.0,0.0)));vec3 cw=cross(ax,cu);
  float ph0=aVar*40.0;float ph=ph0+t*L*uFreq*6.2831;float rd=uCoil*(0.7+0.6*fract(aVar*13.7));
  p+=(cu*(cos(ph)-cos(ph0))+cw*(sin(ph)-sin(ph0)))*rd;
 }
 {
  vec3 sd=normalize(cross(aDir,vec3(0.0,1.0,0.0))+vec3(1e-4,0.0,0.0));
  vec3 sd2=cross(aDir,sd);
  // groomed hair: keep wave/lock offsets in the scalp's tangent plane so strands don't bristle outward
  if(uFlow>0.5){sd=normalize(cross(aNrm,aDir)+vec3(1e-4,0.0,0.0));sd2=aNrm*0.2;}
  float wv=sin(t*L*uWaveF*6.2831+aClump.x)*uWaveA*aClump.w*smoothstep(0.0,0.2,t)*(0.4+0.6*rf);
  p+=sd*wv+(sd*aClump.y+sd2*aClump.z)*(uLock*L*t*t*(0.5+0.5*rf)*(1.0+aGrm.z));
  float fz=max(aGrm.x,0.0)+uFrizz;
  if(fz>0.0)p+=(sd*sin(t*L*41.0+aVar*57.0)+sd2*cos(t*L*33.0+aVar*31.0))*0.016*fz*smoothstep(0.0,0.3,t);
  if(fract(aVar*91.7)>1.0-uStray*(1.0+2.6*max(aGrm.x,0.0)))p+=(sd*(aVar-1.0)+sd2*(fract(aVar*37.0)-0.5))*(uFlow>0.5?min(L,0.8)*0.25:L*0.6)*t*t;
 }
 float gi=(aMisc.y+0.5)/uGW;
 vec3 o1=texture2D(uPh,vec2(gi,0.25)).xyz;vec3 o2=texture2D(uPh,vec2(gi,0.75)).xyz;
 vec3 d=min(L,1.2)*(o1*(6.75*t*t*(1.0-t))+o2*(t*t*t))*smoothstep(0.04,0.4,L)*uPhys;
 float h=dot(p-aRoot,aNrm);float dn=dot(d,aNrm);
 float pin=smoothstep(0.0,0.15,t);
 if(uFlow>0.5){vec3 pp=p+d;vec3 qq=(pp-uHC)/uHR;float ll=length(qq);vec3 uu=qq/ll;float sr=shellR(uu)+0.003;if(ll<sr)pp=mix(pp,uHC+uHR*uu*sr,smoothstep(0.02,0.12,t));p=earFix(pp,t*L);}
 else{if(h+dn<0.012)d+=aNrm*(0.012-(h+dn))*pin;p+=d;p=earFix(p,t*L);}
 if(uClip.w>0.0){vec3 dd=p-uClip.xyz;float l=length(dd);if(l<uClip.w){p+=dd/(l+1e-4)*(uClip.w-l)*0.4*pin*smoothstep(0.05,0.25,L);}}
 return p;
}
void main(){
 if(aMisc.x<uHide){gl_Position=vec4(2.0,2.0,2.0,1.0);vT=vec3(0.0,1.0,0.0);vN=vT;vV=vT;vP=0.0;vVar=1.0;vS=0.0;vTint=vec4(0.0);vTd=0.0;vL=0.0;vHl=1.0;return;}
 // guides view: only ~0.6% of the strands, drawn as coloured guide curves
 if(uGuide>0.5&&fract(aVar*61.3)>0.006){gl_Position=vec4(2.0,2.0,2.0,1.0);vT=vec3(0.0,1.0,0.0);vN=vT;vV=vT;vP=0.0;vVar=1.0;vS=0.0;vTint=vec4(0.0);vTd=0.0;vL=0.0;vHl=1.0;return;}
 gTied=0.0;
 if(uTie.w>0.5&&fract(aVar*17.13)<aGrm.y&&aMisc.x>0.25)gTied=1.0;
 float tc=aT;
 if(gTied<0.5&&uEar>-0.5&&uEar<0.5&&abs(aRoot.x)>uEarC.x-0.35){float er=length((vec2(aRoot.y,aRoot.z)-uEarC.yz)/uEarR);tc*=mix(mix(0.45,1.0,smoothstep(1.05,1.05+uEarB.z*0.55,er)),1.0,smoothstep(0.55,0.95,aMisc.x));}
 vec3 p0=hp(tc);
 bool nt=aT<0.98;
 vec3 p1=hp(nt?tc+0.02:tc-0.02);
 vec3 tg=nt?(p1-p0):(p0-p1);
 vec4 mv=viewMatrix*vec4(p0,1.0);
 vT=mat3(viewMatrix)*normalize(tg+vec3(0.0,1e-5,0.0));
 vN=mat3(viewMatrix)*aNrm;
 vV=-mv.xyz;vP=aT;vVar=aVar;vS=aT*aMisc.x;vW=p0;vTint=aTint;vTd=gTied;vL=aMisc.x;vHl=fract(aClump.x*0.15915+aClump.y*0.37+0.5);
 gl_Position=projectionMatrix*mv;
}`;
var HAIR_FS=`
uniform vec3 uHair;uniform vec3 uTip;uniform vec3 uL1;uniform vec3 uL2;uniform vec3 uC1;uniform vec3 uC2;uniform vec3 uAmb;
uniform float uHl;uniform vec3 uHlc;uniform float uGuide;uniform float uShine;uniform float uGloss;uniform float uTrans;uniform float uGrey;uniform vec3 uGreyC;uniform float uSoft;
uniform sampler2D uShMap;uniform mat4 uShM;uniform float uShOn;uniform float uShTx;uniform float uShRng;uniform float uShD;
varying vec3 vT;varying vec3 vN;varying vec3 vV;varying float vP;varying float vVar;varying float vS;varying vec3 vW;varying vec4 vTint;varying float vTd;varying float vL;varying float vHl;
#include <packing>
${EAR_GLSL}
float kk(vec3 T,vec3 H,float e){float d=dot(T,H);float s=sqrt(max(0.0,1.0-d*d));return pow(s,e)*smoothstep(-1.0,0.0,d);}
// Deep-opacity style self-shadow from the key light's shadow map: hair is translucent, so light fades
// with the thickness of hair in front of the fragment instead of switching off at the first strand.
float hairShadow(){
 if(uShOn<0.5)return 1.0;
 vec4 sc=uShM*vec4(vW,1.0);vec3 c=sc.xyz/sc.w;
 if(c.x<0.0||c.x>1.0||c.y<0.0||c.y>1.0||c.z>1.0)return 1.0;
 float s=0.0;
 for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){
  float o=unpackRGBAToDepth(texture2D(uShMap,c.xy+vec2(float(i),float(j))*uShTx*1.5));
  s+=exp(-max(c.z-o-0.0004,0.0)*uShRng*uShD);
 }
 return s/9.0;
}
// Marschner-style lobes: R (white cuticle glint, shifted to the root), TRT (tinted, broader, shifted to the tip), TT (backlit transmission)
vec3 shade(vec3 L,vec3 lc,vec3 T,vec3 N,vec3 V,vec3 base,float sh){
 float nl=dot(N,L);
 float wrap=clamp((nl+0.35)/1.35,0.0,1.0);
 float tl=dot(T,L);
 float sinTL=sqrt(max(0.0,1.0-tl*tl));
 vec3 diff=base*(sinTL*0.55+0.45*wrap)*wrap;
 vec3 H=normalize(L+V);
 float jit=(vVar-1.0)*0.35+(fract(vVar*23.17)-0.5)*0.08;
 vec3 TR=normalize(T+N*(-0.07+jit));
 vec3 T2=normalize(T+N*(0.14+jit));
 float g=uGloss;
 float r=kk(TR,H,320.0*g)*0.4+kk(TR,H,90.0*g)*0.05;
 float glint=0.55+0.9*fract(vVar*71.3);
 float trt=kk(T2,H,36.0*g)*0.5*glint;
 vec3 spec=lc*uShine*(vec3(r)+trt*base*2.6)*smoothstep(-0.2,0.35,nl+0.2);
 float tt=pow(clamp(dot(V,-L),0.0,1.0),5.0)*sinTL;
 vec3 trans=lc*tt*uTrans*sqrt(base)*base*3.0;
 return (diff*lc+spec)*sh+trans*mix(0.25,1.0,sh);
}
void main(){
 if(earCut())discard;
 vec3 T=normalize(vT);vec3 N=normalize(vN);vec3 V=normalize(vV);
 vec3 base=mix(uHair,uTip,smoothstep(0.15,1.0,vP)*0.7);
 base=mix(base,uGreyC,step(fract(vVar*53.17),uGrey));
 // per-strand melanin variation: brightness plus a slight warm/cool shift
 // highlights come in sections (per clump cell), darker at the root like balayage
 if(vHl<uHl)base=mix(base,uHlc*(0.85+0.3*fract(vVar*7.7)),0.15+0.75*smoothstep(0.0,0.35,vP));
 base=base*(1.0-vTint.a)+vTint.rgb;
 float hv=fract(vVar*17.31)-0.5;
 base*=vVar*vec3(1.0+hv*0.1,1.0,1.0-hv*0.1);
 base*=mix(1.0,0.7,smoothstep(0.8,1.0,vP));if(fract(vVar*91.7)>0.95)base*=0.6;
 float sh=hairShadow();
 // root occlusion by distance from the scalp, so long hair isn't dark for its first half-unit
 float ao=mix(0.22,1.0,smoothstep(0.0,0.5,max(vP,vS/0.6)));
 float occ=mix(0.4,1.0,sh)*ao;
 vec3 c=base*uAmb*(0.6+0.4*N.y)*occ+shade(uL1,uC1,T,N,V,base,sh*mix(0.5,1.0,ao))+shade(uL2,uC2,T,N,V,base,mix(0.5,1.0,ao));
 // multiple scattering: light diffusing through neighbouring fibres keeps shadowed light hair from going grey
 c+=base*base*uC1*0.2*(1.0-sh)*ao;
 // tapered silhouette: every fibre ends at a slightly different point, like real cut/grown tips
 // (no alpha: the canvas must stay opaque and strands are not depth-sorted)
 if(vP>1.0-uSoft*0.3*fract(vVar*113.7))discard;
 if(uGuide>0.5)c=mix(vec3(0.85,0.05,0.03),vec3(1.0,0.75,0.1),vP)*(0.5+0.6*max(dot(N,uL1),0.0));
 gl_FragColor=vec4(c,1.0);
 #include <tonemapping_fragment>
 #include <encodings_fragment>
}`;
var HAIR_DFS='#include <packing>\nvarying vec3 vW;varying float vVar;varying float vTd;varying float vL;\n'+EAR_GLSL+'void main(){if(earCut())discard;gl_FragColor=packDepthToRGBA(gl_FragCoord.z);}';
var LU={uGuide:{value:0},uEarC:{value:new T.Vector3(1.1,2.78,-0.8)},uEarR:{value:new T.Vector2(0.59,0.43)},uEarB:{value:new T.Vector4(2.4,2.35,0.85,0.9)},uShMap:{value:null},uShM:{value:key.shadow.matrix},uShOn:{value:0},uShTx:{value:1/2048},uShRng:{value:20},uShD:{value:14},uL1:{value:new T.Vector3(0,0,1)},uL2:{value:new T.Vector3(0,0,1)},uC1:{value:new T.Vector3(1.25,1.18,1.08)},uC2:{value:new T.Vector3(0.22,0.28,0.38)},uAmb:{value:new T.Vector3(0.42,0.4,0.38)}};
var SHW=128,SHH=64,SHD=new Uint8Array(SHW*SHH),SHF=new Float32Array(SHW*SHH),SHT=new Float32Array(SHW*SHH);
var shellTex=new T.DataTexture(SHD,SHW,SHH,T.LuminanceFormat,T.UnsignedByteType);shellTex.wrapS=T.RepeatWrapping;shellTex.wrapT=T.ClampToEdgeWrapping;shellTex.magFilter=shellTex.minFilter=T.LinearFilter;shellTex.generateMipmaps=false;
var HC=new T.Vector3(0,3.15,-0.35),HR=new T.Vector3(1.38,1.5,1.5);
// equirect map (ellipsoid space) of the outermost head surface; groomed strands ride on it
/* ================= ear detection & hair distribution =================
 The ear flap is found on the deformed mesh (vertices sticking out past the side of the skull in the ear
 region), per side, and averaged. Its bounds drive the hairline, the clearance outline and the guides. */
var EAR={x:1.1,y:2.78,z:-0.8,ry:0.53,rz:0.37,n:0,sides:0};
function detectEar(){if(typeof P==='undefined'||!P||typeof REST==='undefined')return EAR;var pa=P.array,sd=[[1e9,-1e9,1e9,-1e9,1e9,0],[1e9,-1e9,1e9,-1e9,1e9,0]],i;
 for(i=0;i<NV;i++){var rx=REST[i*3],ry=REST[i*3+1],rz=REST[i*3+2];if(!(Math.abs(rx)>1.27&&ry>2.1&&ry<3.45&&rz>-1.25&&rz<-0.3))continue;
  var b=sd[rx>0?0:1],ax=Math.abs(pa[i*3]),y=pa[i*3+1],z=pa[i*3+2];b[0]=Math.min(b[0],y);b[1]=Math.max(b[1],y);b[2]=Math.min(b[2],z);b[3]=Math.max(b[3],z);b[4]=Math.min(b[4],ax);b[5]++}
 var ok=sd.filter(function(b){return b[5]>=8});if(!ok.length)return EAR;
 var a=[0,0,0,0,0];ok.forEach(function(b){for(var k=0;k<5;k++)a[k]+=b[k]/ok.length});
 EAR={x:a[4]-0.14,y:(a[0]+a[1])/2,z:(a[2]+a[3])/2+0.035,ry:(a[1]-a[0])/2*1.04,rz:(a[3]-a[2])/2*1.2,n:sd[0][5]+sd[1][5],sides:ok.length};return EAR}
function earNote(){var e=$('earInfo');if(e)e.textContent=EAR.n?tx('Detected '+EAR.sides+' ear(s), '+EAR.n+' vertices · height '+(EAR.ry*2).toFixed(2)+' · width '+(EAR.rz*2).toFixed(2)+' · centre y '+EAR.y.toFixed(2),'تم اكتشاف '+EAR.sides+' أذن، '+EAR.n+' رأس · الارتفاع '+(EAR.ry*2).toFixed(2)+' · العرض '+(EAR.rz*2).toFixed(2)+' · المركز y '+EAR.y.toFixed(2)):tx('No ear found on the mesh, using defaults','لم يُعثر على أذن، تُستخدم القيم الافتراضية')}
var earG=new T.Group();earG.visible=false;earG.renderOrder=12;scene.add(earG);
function updEar(){var E=S.ear,m=E.margin,R=LU.uEarR.value;LU.uEarC.value.set(EAR.x,EAR.y,EAR.z);R.set(EAR.ry+m,EAR.rz+m);LU.uEarB.value.set(E.sb,E.back,E.taper,E.slope);earNote();
 while(earG.children.length){earG.children.pop().children.forEach(function(c){c.geometry.dispose()})}
 earG.visible=!!E.guides;if(!E.guides)return;
 var mk=function(col){return new T.LineBasicMaterial({color:col,depthTest:false,transparent:true,opacity:0.95})},mE=mk(0xffd04a),mC=mk(0x4fb3d9),mS=mk(0xff6a5a),mT=mk(0x7be08a);
 [1,-1].forEach(function(sx){var X=sx*(EAR.x+0.42),grp=new T.Group();grp.userData.sx=sx;earG.add(grp);var line=function(pts,mat,loop){var g=new T.BufferGeometry().setFromPoints(pts),o=loop?new T.LineLoop(g,mat):new T.Line(g,mat);o.renderOrder=12;grp.add(o)},ell=function(ry,rz,mat){var p=[];for(var k=0;k<64;k++){var a=k/64*Math.PI*2;p.push(new T.Vector3(X,EAR.y+Math.sin(a)*ry,EAR.z+Math.cos(a)*rz))}line(p,mat,true)};
  ell(EAR.ry,EAR.rz,mE);ell(R.x,R.y,mC);ell(R.x*(1.05+E.taper)/1.05,R.y*(1.05+E.taper)/1.05,mT);
  var zf=EAR.z+R.y;line([new T.Vector3(X,E.sb,zf),new T.Vector3(X,E.sb,zf+0.35),new T.Vector3(X,EAR.y,zf+0.35)],mS);
  var bk=[];for(var y=EAR.y;y>=1.75;y-=0.05)bk.push(new T.Vector3(X,y,EAR.z-R.y*0.86-Math.max(0,E.back-y)*E.slope));line(bk,mS)})}
function isEar(x,y,z){return Math.abs(x)>1.17&&y>2.2&&y<3.35&&z>-1.2&&z<-0.25}
function buildShell(){var m=SHF,pa=P.array,i,x,y,dx,dy;m.fill(0);
 for(i=0;i<NV;i++){var py0=pa[i*3+1];if(py0<1.6)continue;if(isEar(REST[i*3],REST[i*3+1],REST[i*3+2]))continue;var qx=(pa[i*3]-HC.x)/HR.x,qy=(py0-HC.y)/HR.y,qz=(pa[i*3+2]-HC.z)/HR.z,l=Math.sqrt(qx*qx+qy*qy+qz*qz);if(l<1e-4)continue;
  var bx=Math.floor((Math.atan2(qx,qz)/6.2831853+0.5)*SHW)%SHW,by=Math.min(SHH-1,Math.floor((Math.asin(clamp(qy/l,-1,1))/Math.PI+0.5)*SHH)),b=by*SHW+bx;if(l>m[b])m[b]=l}
 for(var it=0;it<16;it++){var any=false;SHT.set(m);for(y=0;y<SHH;y++)for(x=0;x<SHW;x++){var b2=y*SHW+x;if(SHT[b2])continue;var sum=0,c=0;for(dy=-1;dy<=1;dy++)for(dx=-1;dx<=1;dx++){var yy=y+dy;if(yy<0||yy>=SHH)continue;var v=SHT[yy*SHW+(x+dx+SHW)%SHW];if(v){sum+=v;c++}}if(c){m[b2]=sum/c;any=true}}if(!any)break}
 for(i=0;i<m.length;i++)if(!m[i])m[i]=1;
 for(var pass=0;pass<2;pass++){SHT.set(m);for(y=0;y<SHH;y++)for(x=0;x<SHW;x++){var mx=0,av=0,cn=0;for(dy=-1;dy<=1;dy++)for(dx=-1;dx<=1;dx++){var y2=clamp(y+dy,0,SHH-1),w=SHT[y2*SHW+(x+dx+SHW)%SHW];if(w>mx)mx=w;av+=w;cn++}m[y*SHW+x]=pass?av/cn:mx}}
 for(i=0;i<m.length;i++)SHD[i]=clamp(Math.round((m[i]-0.6)/1.2*255),0,255);shellTex.needsUpdate=true}
function shellJS(ux,uy,uz){var fu=(Math.atan2(ux,uz)/6.2831853+0.5)*SHW-0.5,fv=(Math.asin(clamp(uy,-1,1))/Math.PI+0.5)*SHH-0.5,x0=Math.floor(fu),y0=Math.floor(fv),ax=fu-x0,ay=fv-y0;
 function G(x,y){x=((x%SHW)+SHW)%SHW;y=clamp(y,0,SHH-1);return SHD[y*SHW+x]}return 0.6+((G(x0,y0)*(1-ax)+G(x0+1,y0)*ax)*(1-ay)+(G(x0,y0+1)*(1-ax)+G(x0+1,y0+1)*ax)*ay)/255*1.2}
// CPU mirror of flowP() for exports
function flowJS(H,U,i,s,out){var j=i*3,q=new T.Vector3(H.RT[j],H.RT[j+1],H.RT[j+2]).sub(HC).divide(HR),ql=q.length(),u0=q.divideScalar(ql),d=new T.Vector3(H.DIR[j],H.DIR[j+1],H.DIR[j+2]).divide(HR);
 d.addScaledVector(u0,-d.dot(u0));if(d.length()>1e-5)d.normalize();else d.crossVectors(u0,new T.Vector3(1,0,0)).normalize();
 var k=ql-shellJS(u0.x,u0.y,u0.z),spd=Math.max(0.2,d.clone().multiply(HR).length()*ql),th=Math.PI-Math.atan2(u0.y,d.y+1e-6);if(th>Math.PI)th=0;th=Math.min(th,2.2);
 var uT=u0.clone().multiplyScalar(Math.cos(th)).addScaledVector(d,Math.sin(th)),ext=U.uDrape.value*0.6*(1-sm((uT.z+0.05)/0.25));th+=ext;
 var sw=Math.min(s,th*spd),a=sw/spd,ua=u0.clone().multiplyScalar(Math.cos(a)).addScaledVector(d,Math.sin(a)),rad=shellJS(ua.x,ua.y,ua.z)+k*(1-sm(a/0.6)),nW=ua.clone().divide(HR).normalize();
 var fr=sm((u0.z-0.1)/0.8)*sm((u0.y+0.3)/0.7),h=0.004+(U.uVol.value+U.uVolF.value*fr)*sm(s/0.2)*(0.15+1.25*((H.VAR[i]*7.31)%1))+U.uLayer.value*0.05*s;
 var p=ua.multiply(HR).multiplyScalar(rad).add(HC).addScaledVector(nW,h),ex=s-sw;
 if(ex>0){var tw=u0.clone().multiplyScalar(-Math.sin(th)).addScaledVector(d,Math.cos(th)).multiply(HR).normalize();var gw=U.uGravF.value*ex*0.9;gw=gw/(1+gw);tw.lerp(new T.Vector3(0,-1,0),Math.max(gw,ext>0.01?0.75*sm(ex/0.3):0)).normalize();p.addScaledVector(tw,ex)}
 var eyq=(p.y-2.76)/0.48;if(Math.abs(eyq)<1&&Math.abs(p.x)>0.98){var hwq=0.34*Math.sqrt(1-eyq*eyq),dzq=p.z+0.71;if(Math.abs(dzq)<hwq){var tzq=-0.71+(H.RT[j+2]+0.71<0?-1:1)*hwq*1.04;p.z+=(tzq-p.z)*sm((s-0.01)/0.11)}}
 out[0]=p.x;out[1]=p.y;out[2]=p.z}
var DUMMY=new T.DataTexture(new Float32Array(8),1,2,T.RGBAFormat,T.FloatType);DUMMY.needsUpdate=true;
var CLIPU={value:new T.Vector4(0,0,0,0)};
function mkLayer(n,o){var U={uPh:{value:DUMMY},uGW:{value:1},uCurl:{value:0.3},uSag:{value:0.3},uPhys:{value:0},uCoil:{value:0},uFreq:{value:0},uWaveA:{value:0.015},uBend:{value:0.75},uWaveF:{value:2.5},uLock:{value:0.18},uClip:o.clip?CLIPU:{value:new T.Vector4()},uHair:{value:new T.Color()},uTip:{value:new T.Color()},uShine:{value:1},uGloss:{value:1},uTrans:{value:1},uGrey:{value:0},uGreyC:{value:new T.Color(0.74,0.73,0.71)},uFlow:{value:0},uHC:{value:HC},uHR:{value:HR},uShell:{value:shellTex},uVol:{value:0},uVolF:{value:0},uLayer:{value:0},uGravF:{value:1},uClumpA:{value:0},uDrape:{value:1},uHide:{value:o.cut?0.045:0},uSoft:{value:0.7},uEar:{value:-1},uTie:{value:new T.Vector4()},uTieN:{value:new T.Vector3(0,1,0)},uTieP:{value:new T.Vector4(0.16,0.4,0.75,0)},uTieSw:{value:new T.Vector3()},uFrizz:{value:0},uStray:{value:0.015},uHl:{value:0},uHlc:{value:new T.Color('#d9a560')}};
 for(var k in LU)U[k]=LU[k];return{n:n,U:U,mat:new T.ShaderMaterial({uniforms:U,vertexShader:HAIR_VS,fragmentShader:HAIR_FS}),dmat:new T.ShaderMaterial({uniforms:U,vertexShader:HAIR_VS,fragmentShader:HAIR_DFS}),H:{n:0},obj:null,st:null,cut:!!o.cut,off:o.off,dirty:false}}
var LY={scalp:mkLayer('scalp',{clip:true,cut:true,off:0.015}),brow:mkLayer('brow',{off:0.004}),beard:mkLayer('beard',{clip:true,cut:true,off:0.006}),lash:mkLayer('lash',{off:0})};
var HU=LY.scalp.U;HU.sag0=0.3;
function newH(n){return{n:0,RT:new Float32Array(n*3),NRM:new Float32Array(n*3),DIR:new Float32Array(n*3),L0:new Float32Array(n),CAP:new Float32Array(n).fill(9),MISC:new Float32Array(n*4),VAR:new Float32Array(n),CL:new Float32Array(n*4),TI:new Int32Array(n),BU:new Float32Array(n),BV:new Float32Array(n),CC:new Float32Array(n*3),LB:new Float32Array(n),DB:new Float32Array(n*3),DR:new Float32Array(n),DH:new Uint8Array(n),GR:new Float32Array(n*4),TN:new Float32Array(n*4)}}
function addStrand(H,k,s,dir,L,R,off){var j=k*3;H.TI[k]=s.ti;H.BU[k]=s.u;H.BV[k]=s.v;
 H.RT[j]=s.p.x-s.n.x*off;H.RT[j+1]=s.p.y-s.n.y*off;H.RT[j+2]=s.p.z-s.n.z*off;H.NRM[j]=s.n.x;H.NRM[j+1]=s.n.y;H.NRM[j+2]=s.n.z;H.DIR[j]=dir.x;H.DIR[j+1]=dir.y;H.DIR[j+2]=dir.z;
 H.L0[k]=L;H.MISC[k*4]=L;H.MISC[k*4+2]=R()-.5;H.MISC[k*4+3]=R()-.5;H.VAR[k]=0.6+R()*0.75;
 var hx=Math.floor(s.x/0.1),hy=Math.floor(s.y/0.1),hz=Math.floor(s.z/0.1),hs=(Math.imul(hx,73856093)^Math.imul(hy,19349663)^Math.imul(hz,83492791))>>>0;hs=Math.imul(hs^(hs>>>13),1274126177)>>>0;
 H.CL[k*4]=(hs%1000)/1000*6.283;H.CL[k*4+1]=((hs>>>10)%1000)/1000-0.5;H.CL[k*4+2]=((hs>>>20)%1000)/1000-0.5;H.CL[k*4+3]=0.5+((hs>>>5)%1000)/1000}
function finalize(L,k,segs){var H=L.H;H.n=k;H.segs=segs;var bg=new T.InstancedBufferGeometry();
 var CSz=L===LY.scalp?(cur.csz||0.07):0.07,cm=new Map(),acc=[],key=new Float64Array(k),i0;for(i0=0;i0<k;i0++){var j0=i0*3,kk=((Math.floor(H.RT[j0]/CSz)+512)*1024+Math.floor(H.RT[j0+1]/CSz)+512)*1024+Math.floor(H.RT[j0+2]/CSz)+512,ci=cm.get(kk);
  if(ci===undefined){ci=acc.length/4;cm.set(kk,ci);acc.push(0,0,0,0)}acc[ci*4]+=H.RT[j0];acc[ci*4+1]+=H.RT[j0+1];acc[ci*4+2]+=H.RT[j0+2];acc[ci*4+3]++;key[i0]=ci}
 for(i0=0;i0<k;i0++){var c0=key[i0]*4,n0=acc[c0+3];for(var e0=0;e0<3;e0++)H.CC[i0*3+e0]=acc[c0+e0]/n0-H.RT[i0*3+e0]}
 bg.setAttribute('position',new T.BufferAttribute(new Float32Array(3*64),3));
 var tA=new Float32Array(segs+1),ix=[],i;for(i=0;i<=segs;i++)tA[i]=i/segs;for(i=0;i<segs;i++)ix.push(i,i+1);
 bg.setAttribute('aT',new T.BufferAttribute(tA,1));bg.setIndex(ix);
 bg.setAttribute('aRoot',new T.InstancedBufferAttribute(H.RT,3).setUsage(T.DynamicDrawUsage));
 bg.setAttribute('aDir',new T.InstancedBufferAttribute(H.DIR,3));
 bg.setAttribute('aNrm',new T.InstancedBufferAttribute(H.NRM,3).setUsage(T.DynamicDrawUsage));
 bg.setAttribute('aMisc',new T.InstancedBufferAttribute(H.MISC,4).setUsage(T.DynamicDrawUsage));
 bg.setAttribute('aVar',new T.InstancedBufferAttribute(H.VAR,1));bg.setAttribute('aCC',new T.InstancedBufferAttribute(H.CC,3));bg.setAttribute('aClump',new T.InstancedBufferAttribute(H.CL,4));bg.setAttribute('aGrm',new T.InstancedBufferAttribute(H.GR,4));bg.setAttribute('aTint',new T.InstancedBufferAttribute(H.TN,4));H.grid=null;
 bg.instanceCount=k;L.obj=new T.LineSegments(bg,L.mat);L.obj.frustumCulled=false;L.obj.castShadow=L.n!=='lash';L.obj.customDepthMaterial=L.dmat;L.obj.visible=S.view.hair;scene.add(L.obj)}
function mkStub(L,list){var n=list.length/4;if(!n)return;var sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(new Float32Array(n*3),3).setUsage(T.DynamicDrawUsage));sg.setAttribute('color',new T.BufferAttribute(new Float32Array(n*3),3));
 L.st={n:n,d:Float32Array.from(list),obj:new T.Points(sg,new T.PointsMaterial({size:1.6,sizeAttenuation:false,vertexColors:true}))};L.st.obj.frustumCulled=false;L.st.obj.visible=S.view.hair;scene.add(L.st.obj);rebindStub(L)}
function updShort(){shortDirty=false;var cnt=SHC,sl=SHL,i,q;cnt.fill(0);sl.fill(0);
 [LY.scalp,LY.beard].forEach(function(L){var H=L.H;for(var i=0;i<H.n;i++){if(H.DH[i]||H.CAP[i]<0.002)continue;var t=H.TI[i]*3,u=H.BU[i],v=H.BV[i],w=1-u-v,len=Math.min(H.L0[i],H.CAP[i]),ia=IX[t],ib=IX[t+1],ic=IX[t+2];cnt[ia]+=w;cnt[ib]+=u;cnt[ic]+=v;sl[ia]+=w*len;sl[ib]+=u*len;sl[ic]+=v*len}});
 var nz=[];for(i=0;i<NV;i++)if(cnt[i]>0)nz.push(cnt[i]/VA[i]);if(!nz.length){g.attributes.aShort.array.fill(0);g.attributes.aShort.needsUpdate=true;return}
 nz.sort(function(a,b){return a-b});var ref=nz[Math.floor(nz.length*0.5)]||1,W2=SHW2;
 for(i=0;i<NV;i++){W2[i*2]=cnt[i]>0?sl[i]/cnt[i]:0;W2[i*2+1]=Math.sqrt(Math.min(1,cnt[i]/VA[i]/ref))}
 var out=g.attributes.aShort.array;for(var pass=0;pass<2;pass++){for(i=0;i<NV;i++){var dS=0,lS=0,lW=0,c=NBO[i+1]-NBO[i];for(q=NBO[i];q<NBO[i+1];q++){var m=NBI[q]*2;dS+=W2[m+1];lS+=W2[m]*W2[m+1];lW+=W2[m+1]}
  var d=c?0.5*W2[i*2+1]+0.5*dS/c:W2[i*2+1],tw=W2[i*2+1]+lW;out[i*2]=tw>0?(W2[i*2]*W2[i*2+1]+lS)/tw:0;out[i*2+1]=d}if(!pass)W2.set(out)}
 for(i=0;i<NV;i++)if(isEar(REST[i*3],REST[i*3+1],REST[i*3+2]))out[i*2+1]=0;
 g.attributes.aShort.needsUpdate=true}
function disposeL(L){shortDirty=true;if(L.obj){scene.remove(L.obj);L.obj.geometry.dispose();L.obj=null}if(L.st){scene.remove(L.st.obj);L.st.obj.geometry.dispose();L.st.obj.material.dispose();L.st=null}L.H={n:0}}
function rebind(L){var H=L.H;if(H.n&&L.obj){var pa=P.array,na=N.array,off=L.off;
 for(var i=0;i<H.n;i++){var t=H.TI[i]*3,u=H.BU[i],v=H.BV[i],w=1-u-v,ia=IX[t]*3,ib=IX[t+1]*3,ic=IX[t+2]*3,j=i*3;
  var nx=na[ia]*w+na[ib]*u+na[ic]*v,ny=na[ia+1]*w+na[ib+1]*u+na[ic+1]*v,nz=na[ia+2]*w+na[ib+2]*u+na[ic+2]*v,nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1;nx/=nl;ny/=nl;nz/=nl;
  H.RT[j]=pa[ia]*w+pa[ib]*u+pa[ic]*v-nx*off;H.RT[j+1]=pa[ia+1]*w+pa[ib+1]*u+pa[ic+1]*v-ny*off;H.RT[j+2]=pa[ia+2]*w+pa[ib+2]*u+pa[ic+2]*v-nz*off;H.NRM[j]=nx;H.NRM[j+1]=ny;H.NRM[j+2]=nz}
 var at=L.obj.geometry.attributes;at.aRoot.needsUpdate=true;at.aNrm.needsUpdate=true;H.grid=null}rebindStub(L)}
function rebindStub(L){if(!L.st)return;var d=L.st.d,o=L.st.obj.geometry.attributes.position.array,pa=P.array,na=N.array;
 for(var i=0;i<L.st.n;i++){var t=d[i*4]*3,u=d[i*4+1],v=d[i*4+2],w=1-u-v,ia=IX[t]*3,ib=IX[t+1]*3,ic=IX[t+2]*3;
  for(var c=0;c<3;c++)o[i*3+c]=pa[ia+c]*w+pa[ib+c]*u+pa[ic+c]*v+(na[ia+c]*w+na[ib+c]*u+na[ic+c]*v)*0.004}
 L.st.obj.geometry.attributes.position.needsUpdate=true}
function stubColor(L,c){if(!L.st)return;var a=L.st.obj.geometry.attributes.color,d=L.st.d;for(var i=0;i<L.st.n;i++){var b=d[i*4+3];a.setXYZ(i,c.r*b,c.g*b,c.b*b)}a.needsUpdate=true}

/* ---------- scalp hair (with guide-hair physics) ---------- */
var PH={G:0,tex:null,data:null,o:null,v:null,tmp:null,gx:null,gy:null,gz:null,gl:null,nb:null,cf:null,on:true,asleep:false,k:150,damp:0.3,grav:1,wind:0,shake:0,ms:0,fr:0};
function yLow(x,y,z){var w=sm((z+0.35)/0.55);return cur.nape+(cur.front-cur.nape)*w}
function earD(x,y,z){var dx=Math.abs(x)-1.41,dy=y-2.75,dz=z+0.75;return Math.sqrt(dx*dx+dy*dy+dz*dz)}
// combing direction per root (rest-pose coords decide the region; tg = direction away from the crown)
function partSide(dx,x,y,z){var sg=dx>=0?1:-1,a=Math.abs(dx);if(a<0.09&&hsh3(Math.floor(x*400),Math.floor(y*400),Math.floor(z*400),7)+0.5<0.42*(1-a/0.09))sg=-sg;return sg}
function flowDir(c,s,tg,D){var x=s.x,y=s.y,z=s.z,f=c.flow,pt=c.part===undefined?0.45:c.part,front=sm((z-0.1)/0.7);
 if(f==='crown')D.copy(tg).addScaledVector(new T.Vector3().crossVectors(s.n,tg),0.25);
 else if(f==='forward')D.set(x*0.3,-0.25,1);
 else if(f==='back')D.set(x*0.25,0.1,-1);
 else if(f==='side'){if(partSide(x-pt,x,y,z)<0)D.set(-1,0.1,-0.45);else D.set(1,-0.8,-0.3)}
 else if(f==='center'){var dx0=x-(pt-0.45),sg=partSide(dx0,x,y,z);D.set(sg,-0.35,0.25+0.5*front)}
 else{D.set(x*0.2,1,-0.35);var sd=sm((Math.abs(x)-0.6)/0.3);D.lerp(new T.Vector3(x*0.1,0.2,-1),sd)}
 if(f!=='crown'){var w=sm((-z-0.3)/0.7)*sm((3.95-y)/0.5);D.lerp(new T.Vector3(x*0.3,-1,-0.3),w)}
 return D}
function edAt(sp){var t=sp.ti*3,w=1-sp.u-sp.v;return EARD[IX[t]]*w+EARD[IX[t+1]]*sp.u+EARD[IX[t+2]]*sp.v}
function hairW(x,y,z,ed){if(y<1.95||isEar(x,y,z))return 0;var eey=(y-EAR.y)/(EAR.ry*0.9);if(Math.abs(x)>EAR.x-0.15&&Math.abs(eey)<1&&Math.abs(z-EAR.z)<EAR.rz*0.95*Math.sqrt(1-eey*eey))return 0;var yl=yLow(x,y,z),ye=z>-0.45?2.45+0.35*sm((-0.3-z)/0.15):z>-1.0?2.8:2.8+(cur.nape-2.8)*sm((-1.0-z)/0.3);yl=Math.max(yl,ye);
 HLY=yl;return sm((y-yl+0.06)/0.12)*sm((ed-0.03)/0.05)}

/* ================= hair painting (groom maps) =================
 Per-vertex scalp maps (length, density, flow direction, smooth/rough, clumps, colour, tie mask) are painted
 with brushes and sampled at every strand root, so the painting survives restyles, reseeds and haircuts. */
function hsh3(i,j,k,s){var h=Math.imul(i,73856093)^Math.imul(j,19349663)^Math.imul(k,83492791)^Math.imul(s,668265263);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296-0.5}
function vn1(x,y,z,s){var i=Math.floor(x),j=Math.floor(y),k=Math.floor(z),fx=x-i,fy=y-j,fz=z-k,r=0;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);
 for(var a=0;a<2;a++)for(var b=0;b<2;b++)for(var c=0;c<2;c++)r+=hsh3(i+a,j+b,k+c,s)*(a?fx:1-fx)*(b?fy:1-fy)*(c?fz:1-fz);return r}
function vnz3(x,y,z,sd){var f=1.5;sd=(sd|0)*3;return[vn1(x*f,y*f,z*f,sd+1),vn1(x*f,y*f,z*f,sd+2),vn1(x*f,y*f,z*f,sd+3)]}
var GRM=null,GCH=['len','den','dir','tex','clp','tie','col'];
function grmAlloc(){if(GRM&&GRM.n===NV)return;GRM={n:NV,mod:false,tiePainted:false,len:new Float32Array(NV).fill(1),den:new Float32Array(NV).fill(1),dir:new Float32Array(NV*3),tex:new Float32Array(NV),clp:new Float32Array(NV),tie:new Float32Array(NV),col:new Float32Array(NV*4)}}
function grmReset(){grmAlloc();GRM.len.fill(1);GRM.den.fill(1);GRM.dir.fill(0);GRM.tex.fill(0);GRM.clp.fill(0);GRM.col.fill(0);GRM.mod=false;GRM.tiePainted=false;tieSelFill()}
function grmGet(){var o={};GCH.forEach(function(c){o[c]=GRM[c].slice()});return o}
function grmSet(o){grmAlloc();if(!o||!o.len||o.len.length!==NV){grmReset();return}GCH.forEach(function(c){if(o[c]&&o[c].length===GRM[c].length)GRM[c].set(o[c])});GRM.mod=true;GRM.tiePainted=true}
// map values at one strand root -> its length, visibility, direction and shader attributes
function groomStrand(H,i){var G=GRM,t=H.TI[i]*3,u=H.BU[i],v=H.BV[i],w=1-u-v,a=IX[t],b=IX[t+1],c=IX[t+2],j=i*3,q=i*4,e;
 H.L0[i]=H.LB[i]*(G.len[a]*w+G.len[b]*u+G.len[c]*v);
 H.DH[i]=H.DR[i]>G.den[a]*w+G.den[b]*u+G.den[c]*v?1:0;
 H.MISC[q]=H.DH[i]?0:Math.min(H.L0[i],H.CAP[i]);
 var dx=G.dir[a*3]*w+G.dir[b*3]*u+G.dir[c*3]*v,dy=G.dir[a*3+1]*w+G.dir[b*3+1]*u+G.dir[c*3+1]*v,dz=G.dir[a*3+2]*w+G.dir[b*3+2]*u+G.dir[c*3+2]*v,m=Math.hypot(dx,dy,dz),ox=H.DB[j],oy=H.DB[j+1],oz=H.DB[j+2];
 if(m>1e-4){var mk=Math.min(1,m);ox=ox*(1-mk)+dx/m*mk;oy=oy*(1-mk)+dy/m*mk;oz=oz*(1-mk)+dz/m*mk}
 var nx=H.NRM[j],ny=H.NRM[j+1],nz=H.NRM[j+2],dn=ox*nx+oy*ny+oz*nz,tx=ox-nx*dn,ty=oy-ny*dn,tz=oz-nz*dn,tl=Math.hypot(tx,ty,tz);
 if(tl>1e-4){H.DIR[j]=tx/tl;H.DIR[j+1]=ty/tl;H.DIR[j+2]=tz/tl}else{H.DIR[j]=H.DB[j];H.DIR[j+1]=H.DB[j+1];H.DIR[j+2]=H.DB[j+2]}
 H.GR[q]=G.tex[a]*w+G.tex[b]*u+G.tex[c]*v;H.GR[q+1]=G.tie[a]*w+G.tie[b]*u+G.tie[c]*v;H.GR[q+2]=G.clp[a]*w+G.clp[b]*u+G.clp[c]*v;
 for(e=0;e<4;e++)H.TN[q+e]=G.col[a*4+e]*w+G.col[b*4+e]*u+G.col[c*4+e]*v}
function grmUpload(L){if(!L.obj)return;var at=L.obj.geometry.attributes;at.aDir.needsUpdate=at.aMisc.needsUpdate=at.aGrm.needsUpdate=at.aTint.needsUpdate=true;shortDirty=true}
function applyGroomAll(){var L=LY.scalp,H=L.H;if(!H.n||!GRM||!H.LB)return;for(var i=0;i<H.n;i++)groomStrand(H,i);grmUpload(L)}
var grooming=false,lastGr=null;
// op (from the comb) overrides brush, radius, strength and target value
function grmPaint(p,d,op){var B=S.groom,G=GRM,R=op&&op.r||B.r,R2=R*R,pa=P.array,na=N.array,str=op?op.str:B.str,b=op?op.b:B.b,sg=(!op&&(B.inv||brushMod.inv))?-1:1,cc=col(B.c),i,c;
 if(b==='dir'&&!d)return;
 for(i=0;i<NV;i++){var dx=pa[i*3]-p.x,dy=pa[i*3+1]-p.y,dz=pa[i*3+2]-p.z,d2=dx*dx+dy*dy+dz*dz;if(d2>R2)continue;var w=1-Math.sqrt(d2)/R;w=w*w*(3-2*w)*str;
  if(b==='len')G.len[i]=clamp(G.len[i]*(1+sg*0.09*w),0.03,2.5);
  else if(b==='den')G.den[i]=clamp(G.den[i]+sg*0.12*w,0,1);
  else if(b==='tex')G.tex[i]=clamp(op&&op.to!==undefined?G.tex[i]+(op.to-G.tex[i])*w*0.5:G.tex[i]+sg*0.12*w,-1,1);
  else if(b==='clp')G.clp[i]=clamp(op&&op.to!==undefined?G.clp[i]+(op.to-G.clp[i])*w*0.4:G.clp[i]+sg*0.12*w,0,1);
  else if(b==='tie'){G.tie[i]=clamp(G.tie[i]+sg*0.25*w,0,1);G.tiePainted=true}
  else if(b==='col'){var q=i*4,tg=sg<0?[0,0,0,0]:[cc.r,cc.g,cc.b,1];for(c=0;c<4;c++)G.col[q+c]+=(tg[c]-G.col[q+c])*w*0.2}
  else if(b==='dir'){var nx=na[i*3],ny=na[i*3+1],nz=na[i*3+2],dn=d.x*nx+d.y*ny+d.z*nz,tx=d.x-nx*dn,ty=d.y-ny*dn,tz=d.z-nz*dn,tl=Math.hypot(tx,ty,tz)||1,k=Math.min(1,w*0.45);
   G.dir[i*3]+=(tx/tl-G.dir[i*3])*k;G.dir[i*3+1]+=(ty/tl-G.dir[i*3+1])*k;G.dir[i*3+2]+=(tz/tl-G.dir[i*3+2])*k}
  else if(b==='smooth'){var a0=NBO[i],a1=NBO[i+1],cn=a1-a0;if(cn)for(var h=0;h<GCH.length;h++){var A=G[GCH[h]],stp=A.length/NV;for(var e=0;e<stp;e++){var sm2=0;for(var q2=a0;q2<a1;q2++)sm2+=A[NBI[q2]*stp+e];A[i*stp+e]+=(sm2/cn-A[i*stp+e])*w*0.5}}}
  else if(b==='erase'){var k2=Math.min(1,w*0.4);G.len[i]+=(1-G.len[i])*k2;G.den[i]+=(1-G.den[i])*k2;G.tex[i]*=1-k2;G.clp[i]*=1-k2;for(c=0;c<3;c++)G.dir[i*3+c]*=1-k2;for(c=0;c<4;c++)G.col[i*4+c]*=1-k2}
 }
 G.mod=true}
function grmViz(){var on=!!S.groom.viz&&mode==='groom';MAPSHOW.value=on?1:0;if(!on||!GRM||!g||!g.attributes.aGv)return;var a=g.attributes.aGv.array,b=S.groom.b,G=GRM;
 for(var i=0;i<NV;i++)a[i]=b==='len'?Math.abs(G.len[i]-1)*1.2:b==='den'?1-G.den[i]:b==='tex'?Math.abs(G.tex[i]):b==='clp'?G.clp[i]:b==='tie'?G.tie[i]:b==='col'?G.col[i*4+3]:b==='dir'?Math.hypot(G.dir[i*3],G.dir[i*3+1],G.dir[i*3+2]):Math.max(Math.abs(G.len[i]-1),1-G.den[i],Math.abs(G.tex[i]),G.clp[i],G.col[i*4+3]);g.attributes.aGv.needsUpdate=true}
function grmRefresh(p,R){var L=LY.scalp,H=L.H,RT=H.RT,R3=(R+0.06)*(R+0.06);if(!H.n||!L.obj)return;for(var i=0;i<H.n;i++){var ex=RT[i*3]-p.x,ey=RT[i*3+1]-p.y,ez=RT[i*3+2]-p.z;if(ex*ex+ey*ey+ez*ez<R3)groomStrand(H,i)}grmUpload(L)}
function groomAt(p,d){var B=S.groom;grmPaint(p,d);grmRefresh(p,B.r);if(B.viz)grmViz();if(B.sym&&Math.abs(p.x)>0.02){var pm2=new T.Vector3(-p.x,p.y,p.z);grmPaint(pm2,d?new T.Vector3(-d.x,d.y,d.z):null);grmRefresh(pm2,B.r)}}
function groomMove(e){var h=hit(e);if(!h){ring.visible=false;return}ring.visible=true;ring.position.copy(h.p).addScaledVector(h.n,0.01);ring.lookAt(h.p.clone().add(h.n));ring.scale.setScalar(S.groom.r);
 if(!grooming)return;var from=lastGr||h.p,dv=h.p.clone().sub(from),l=dv.length(),d=l>1e-4?dv.divideScalar(l):null,n=Math.max(1,Math.min(10,Math.ceil(l/(S.groom.r*0.3))));
 if(!d&&S.groom.b==='dir')return;for(var s=1;s<=n;s++)groomAt(from.clone().lerp(h.p,s/n),d);lastGr=h.p}
/* ---------- hair ties ---------- */
function tiePoint(){var u=S.tie.u||[0,0.62,-0.78],v=new T.Vector3(u[0],u[1],u[2]).normalize(),r=shellJS(v.x,v.y,v.z);return{p:v.clone().multiply(HR).multiplyScalar(r).add(HC),n:v.clone().divide(HR).normalize()}}
function tieSelFill(){grmAlloc();var sel=S.tie.sel,tp=tiePoint(),yT=EAR.y+EAR.ry+0.14,pa=P.array;
 for(var i=0;i<NV;i++){var y=REST[i*3+1],v;
  if(sel==='all')v=y>1.9?1:0;else if(sel==='top')v=sm((y-yT)/0.12);
  else{var dx=pa[i*3]-tp.p.x,dy=pa[i*3+1]-tp.p.y,dz=pa[i*3+2]-tp.p.z;v=sm((1.25-Math.sqrt(dx*dx+dy*dy+dz*dz))/0.2)*sm((y-yT)/0.12)}
  GRM.tie[i]=v}}
var tieBand=new T.Mesh(new T.TorusGeometry(0.075,0.024,10,32),new T.MeshStandardMaterial({color:0x151515,roughness:0.55}));tieBand.castShadow=true;tieBand.visible=false;scene.add(tieBand);
var TIE={o:new T.Vector3(),v:new T.Vector3()};
function updTie(k){var Tq=S.tie,U=LY.scalp.U,on=Tq.mode!=='none';
 if(k==='sel'||(k==='u'&&Tq.sel==='crown')){GRM.tiePainted=false;tieSelFill();applyGroomAll()}
 var tp=tiePoint();U.uTie.value.set(tp.p.x,tp.p.y,tp.p.z,Tq.mode==='bun'?2:on?1:0);U.uTieN.value.copy(tp.n);U.uTieP.value.set(Tq.bunR,Tq.spread,Tq.tight,0);
 tieBand.visible=on&&S.view.hair;tieBand.material.color.set(Tq.band);tieBand.position.copy(tp.p).addScaledVector(tp.n,Tq.mode==='bun'?0.06:0.08);tieBand.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),tp.n);
 TIE.o.set(0,0,0);TIE.v.set(0,0,0);U.uTieSw.value.set(0,0,0)}
function hairLive(c){var U=LY.scalp.U;U.uFrizz.value=c.frizz||0;U.uStray.value=c.stray===undefined?((c.flow||'legacy')!=='legacy'?0.015:0.05):c.stray;U.uHl.value=c.hl||0;U.uHlc.value.set(c.hlc||'#d9a560')}
// Equal-length strands from the crown spend most of their length crossing the scalp, so they end far higher
// than strands rooted on the sides: the hair reads as a short cap over a second, longer curtain. Long styles
// lengthen each strand (solved on the CPU flow mirror) so every tip reaches one hemline; oneLen blends it in.
function oneLenFix(H,U,k,Ln,c,R){var om=(c.oneLen||0)*sm((c.len-0.7)/0.4);if(om<=0)return Ln;
 var hem=2.75-c.len*0.95+(R()-0.5)*(c.lenVar==null?0.6:c.lenVar)*0.3,L2=Ln,P3=[0,0,0];
 flowJS(H,U,k,Ln,P3);if(P3[2]>0.45)return Ln;
 for(var it=0;it<5;it++){var e=P3[1]-hem;if(Math.abs(e)<0.01)break;L2=clamp(L2+e,Ln*0.4,Ln*3);flowJS(H,U,k,L2,P3)}
 return Ln+(L2-Ln)*om}
function buildScalp(){var L=LY.scalp;disposeL(L);grmAlloc();var c=cur,R=rng(c.seed),n=Math.round(c.count*1000),H=L.H=newH(n),k=0,tries=0,U=L.U;
 HU.sag0=0.35/(0.2+c.len)*(1-c.lift*0.6);U.uSag.value=HU.sag0*PH.grav*1.8;U.uEar.value=c.ear==='over'?1:0;U.uCurl.value=c.curl;U.uCoil.value=c.coil||0;U.uFreq.value=c.freq||0;U.uWaveA.value=c.wave||0;U.uLock.value=c.lock||0;U.uBend.value=c.bend;
 var flow=c.flow||'legacy',FL=flow!=='legacy';U.uFlow.value=FL?1:0;U.uVol.value=c.vol||0;U.uVolF.value=c.volF||0;U.uLayer.value=c.layer===undefined?0.5:c.layer;U.uGravF.value=PH.grav;U.uClumpA.value=(c.clump===undefined?0.4:c.clump)*0.9;U.uDrape.value=c.drape===undefined?1:c.drape;hairLive(c);
 var stub=[],crown=new T.Vector3(0,4.5,-0.9),tg=new T.Vector3(),dir=new T.Vector3(),CS=0.24,gm=new Map(),GK=[],GX=[],GY=[],GZ=[],GL=[],GN=[];
 while(k<n&&tries<n*4){tries++;var s=sample(SAMP_ALL,R),hw=hairW(s.x,s.y,s.z,edAt(s)),yl=HLY;if(R()>=hw)continue;
  var f=1-sm((s.y-yl)/c.fadeBand);if(c.mohawk>0)f=Math.max(f,sm((Math.abs(s.x)-c.mohawk)/0.12));if(R()<f*0.6)continue;
  tg.copy(s.p).sub(crown);tg.addScaledVector(s.n,-tg.dot(s.n));if(tg.lengthSq()<1e-6)tg.set(0,-1,0);tg.normalize();
  var lv=c.lenVar===undefined?0.6:c.lenVar,Ln=((c.len+(FL?0:(c.oneLen||0))*Math.max(0,s.y-2.6)*1.2)*(1-f)+0.025*f)*(1-lv/2+R()*lv);
  var bz=FL&&c.bangs&&c.bangs!=='none'&&s.z>0.3&&s.y>3.45&&Math.abs(s.x)<0.8;
  if(bz){var bx=s.x-(c.part||0);if(c.bangs==='blunt')dir.set(s.x*0.25,-0.2,1);else if(c.bangs==='side')dir.set(1,-0.35,0.8);else dir.set(bx<0?-1:1,-0.8,0.6);dir.addScaledVector(s.n,-dir.dot(s.n)).normalize();Ln=(c.bangLen||0.6)*(0.88+R()*0.24)}
  else if(FL){flowDir(c,s,tg,dir);var nq=vnz3(s.x,s.y,s.z,c.seed);dir.x+=nq[0]*c.curl*0.8+(R()-.5)*c.curl*0.08;dir.y+=nq[1]*c.curl*0.8+(R()-.5)*c.curl*0.08;dir.z+=nq[2]*c.curl*0.8+(R()-.5)*c.curl*0.08;dir.addScaledVector(s.n,-dir.dot(s.n)).normalize()}
  else{dir.copy(s.n).multiplyScalar(c.lift).addScaledVector(tg,1-c.lift);var wf=c.sweep?sm((s.z+0.6)/1.2):0;dir.y+=0.25*c.sweep*wf;dir.z-=c.sweep*wf;
  dir.x+=(R()-.5)*c.curl;dir.y+=(R()-.5)*c.curl;dir.z+=(R()-.5)*c.curl;dir.normalize()}
  addStrand(H,k,s,dir,Ln,R,L.off);if(FL&&!bz){Ln=oneLenFix(H,U,k,Ln,c,R);H.L0[k]=H.MISC[k*4]=Ln}H.LB[k]=Ln;H.DB[k*3]=dir.x;H.DB[k*3+1]=dir.y;H.DB[k*3+2]=dir.z;H.DR[k]=((Math.imul(k+7,0x9E3779B1)>>>0)%100003)/100003;
  var ck=((Math.floor(s.x/CS)+64)<<14)|((Math.floor(s.y/CS)+64)<<7)|(Math.floor(s.z/CS)+64),gi=gm.get(ck);
  if(gi===undefined){gi=GK.length;gm.set(ck,gi);GK.push(ck);GX.push(0);GY.push(0);GZ.push(0);GL.push(0);GN.push(0)}
  GX[gi]+=s.p.x;GY[gi]+=s.p.y;GZ[gi]+=s.p.z;GL[gi]+=Ln;GN[gi]++;H.MISC[k*4+1]=gi;k++;
  if(f>0.15&&R()<c.stub)stub.push(s.ti,s.u,s.v,0.5+R()*0.5)}
 var G=Math.max(1,GK.length);PH.G=GK.length;
 PH.o=new Float32Array(G*6);PH.v=new Float32Array(G*6);PH.tmp=new Float32Array(G*6);PH.cf=new Float32Array(G*3);PH.g=new Float32Array(G*6);PH.gAny=false;
 PH.gx=new Float32Array(G);PH.gy=new Float32Array(G);PH.gz=new Float32Array(G);PH.gl=new Float32Array(G);PH.nb=new Int32Array(G*26).fill(-1);
 for(var g2=0;g2<GK.length;g2++){var cn=GN[g2]||1;PH.gx[g2]=GX[g2]/cn;PH.gy[g2]=GY[g2]/cn;PH.gz[g2]=GZ[g2]/cn;PH.gl[g2]=GL[g2]/cn;
  var key0=GK[g2],cz=(key0&127),cy=((key0>>7)&127),cx=(key0>>14),q2=0;
  for(var ddx=-1;ddx<=1;ddx++)for(var ddy=-1;ddy<=1;ddy++)for(var ddz=-1;ddz<=1;ddz++){if(!ddx&&!ddy&&!ddz)continue;var ng=gm.get(((cx+ddx)<<14)|((cy+ddy)<<7)|(cz+ddz));if(ng!==undefined)PH.nb[g2*26+q2++]=ng}}
 if(PH.tex)PH.tex.dispose();PH.data=new Float32Array(G*2*4);PH.tex=new T.DataTexture(PH.data,G,2,T.RGBAFormat,T.FloatType);
 PH.tex.minFilter=PH.tex.magFilter=T.NearestFilter;PH.tex.generateMipmaps=false;PH.tex.needsUpdate=true;U.uPh.value=PH.tex;U.uGW.value=G;PH.asleep=true;
 var mxL=0;for(var q0=0;q0<k;q0++)if(H.L0[q0]>mxL)mxL=H.L0[q0];var segs=c.freq>0?Math.min(40,Math.max(FL?8:6,Math.ceil(c.freq*mxL*6))):FL?clamp(Math.ceil(mxL*7)+4,6,26):4;finalize(L,k,segs);if(!GRM.tiePainted)tieSelFill();applyGroomAll();updTie();
 trimmed=0;if(S.fade.on)applyFade();updFadeViz();updHairCols();updHairMat()}

/* ---------- eyebrows, beard, lashes ---------- */
function browW(x,y,z){var ax=Math.abs(x);if(z<0.45)return 0;var t=(ax-0.1)/0.82;if(t<0||t>1)return 0;
 var cy=3.16+S.brow.arch*0.1*Math.sin(Math.PI*Math.min(1,t*1.15))-0.03*t,th=(0.065*(1-t)+0.028)*S.brow.thick,d=Math.abs(y-cy)/th;if(d>=1)return 0;return(1-d*d)*sm(t/0.08)*sm((1-t)/0.1)}
function buildBrow(){var L=LY.brow;disposeL(L);if(!S.brow.on)return;var R=rng(313),n=Math.round(9000*S.brow.dens),H=L.H=newH(n),k=0,tries=0,want=new T.Vector3(),dir=new T.Vector3();
 while(k<n&&tries<n*40){tries++;var s=sample(SAMP_BROW,R),w=browW(s.x,s.y,s.z);if(w<=0||R()>w)continue;
  var ax=Math.abs(s.x),sx=s.x<0?-1:1,tt=clamp((ax-0.12)/0.8,0,1),m=sm(tt*1.6);
  want.set(sx*(0.3+0.7*m),1-1.2*m,0.1);want.addScaledVector(s.n,-want.dot(s.n)).normalize();dir.copy(want).multiplyScalar(0.8).addScaledVector(s.n,0.2).normalize();
  addStrand(H,k,s,dir,0.075*S.brow.len*(0.7+0.6*R())*(1-0.35*tt),R,L.off);k++}
 finalize(L,k,3);var U=L.U;U.uBend.value=0.9;U.uSag.value=0.05;U.uCurl.value=0.12;U.uCoil.value=0;U.uFreq.value=0;U.uWaveA.value=0.003;U.uLock.value=0.06;updHairCols();updHairMat()}
function mustM(x,y,z){var ax=Math.abs(x);if(z<0.6)return 0;return sm((2.22-y)/0.05)*sm((y-1.95)/0.03)*sm((0.52-ax)/0.08)}
function chinM(x,y,z){var ax=Math.abs(x);if(z<0.45)return 0;return sm((1.74-y)/0.04)*sm((y-1.12)/0.1)*sm((0.4-ax)/0.1)}
function fullM(x,y,z){var ax=Math.abs(x),top=2.2+0.5*sm((ax-0.5)/0.6),up=sm((top-y)/0.07),back=sm((z+0.55)/0.18),lowY=0.95+0.15*sm((ax-0.4)/0.5),low=sm((y-lowY)/0.12);
 var lips=(ax<0.47&&y>1.74&&y<1.97&&z>0.7)?1:0,nose=(ax<0.32&&y>2.2)?1:0,ear=earD(x,y,z)<0.55?1:0;return up*back*low*(1-lips)*(1-nose)*(1-ear)}
var BEARD={none:[0,0],stubble:[0,0],mustache:[0.1,1],goatee:[0.12,2],boxed:[0.1,3],full:[0.2,3],long:[0.42,3]};
function beardMask(t,x,y,z){return t===1?mustM(x,y,z):t===2?Math.max(mustM(x,y,z),chinM(x,y,z)):t===3?fullM(x,y,z):0}
function buildBeard(){var L=LY.beard;disposeL(L);var b=S.beard,cfg=BEARD[b.style]||BEARD.none,R=rng(515),want=new T.Vector3(),dir=new T.Vector3();
 if(cfg[1]){var n=Math.round(42000*b.dens*(cfg[1]===3?1:0.4)),H=L.H=newH(n),k=0,tries=0;
  while(k<n&&tries<n*10){tries++;var s=sample(SAMP_BEARD,R),w=beardMask(cfg[1],s.x,s.y,s.z);if(w<=0||R()>w)continue;
   var sx=s.x<0?-1:1,mu=mustM(s.x,s.y,s.z)>0.3,lift=cfg[0]>0.15?0.38:0.28;want.set(sx*(mu?0.55:0.12),-1,0.22);want.addScaledVector(s.n,-want.dot(s.n)).normalize();
   dir.copy(want).multiplyScalar(1-lift).addScaledVector(s.n,lift).normalize();addStrand(H,k,s,dir,cfg[0]*b.len*(mu&&cfg[1]===3?0.7:1)*(0.75+0.5*R()),R,L.off);k++}
  finalize(L,k,cfg[0]>0.15?8:5);var U=L.U,ln=cfg[0]*b.len;U.uBend.value=0.55;U.uSag.value=0.35/(0.2+ln)*0.5;U.uCurl.value=0.35;U.uCoil.value=0.012;U.uFreq.value=5;U.uWaveA.value=0.008;U.uLock.value=0.25}
 var ns=Math.round(b.stub*26000),stub=[],tr=0;while(stub.length/4<ns&&tr<ns*6){tr++;var s2=sample(SAMP_BEARD,R),m2=fullM(s2.x,s2.y,s2.z);if(m2<=0||R()>m2)continue;stub.push(s2.ti,s2.u,s2.v,0.35+R()*0.5)}
 mkStub(L,stub);updHairCols();updHairMat()}
function buildLash(){var L=LY.lash;disposeL(L);if(!S.lash.on||!RIMS.eyes.length)return;var R=rng(91),list=[];
 RIMS.eyes.forEach(function(r){var c=r.c0;r.e.forEach(function(e){var a=e.a,b=e.b,my=(REST[a*3+1]+REST[b*3+1])/2,up=my>c.y-0.005,len=Math.hypot(REST[b*3]-REST[a*3],REST[b*3+1]-REST[a*3+1],REST[b*3+2]-REST[a*3+2]),cnt=Math.max(1,Math.round(len/(up?0.0045:0.01)));
  for(var q=0;q<cnt;q++)list.push([e,(q+R())/cnt,up,r])})});
 var n=list.length,H=L.H=newH(n),dir=new T.Vector3();
 list.forEach(function(it,k){var e=it[0],s=it[1],up=it[2],r=it[3],t=e.t,wts=[0,0,0];for(var q=0;q<3;q++){if(IX[t*3+q]===e.a)wts[q]+=1-s;if(IX[t*3+q]===e.b)wts[q]+=s}
  var sp0=setSP(t,wts[1],wts[2]),rx=sp0.x-r.c0.x,ry=sp0.y-r.c0.y,rl=Math.hypot(rx,ry)||1,fx=Math.abs(rx)/(r.hw||0.2);
  dir.set(rx/rl*0.55,ry/rl*0.55+(up?0.42:-0.22),0.8).normalize();addStrand(H,k,sp0,dir,(up?0.08:0.035)*S.lash.len*(1-0.55*fx*fx)*(0.75+0.5*R()),R,L.off)});
 finalize(L,n,4);var U=L.U;U.uBend.value=0;U.uSag.value=-5;U.uCurl.value=0.05;U.uCoil.value=0;U.uFreq.value=0;U.uWaveA.value=0;U.uLock.value=0;updHairCols();updHairMat()}
function buildAll(){buildScalp();buildBrow();buildBeard();buildLash()}
function greyAmt(){return 1-(1-S.hmat.grey)*(1-0.75*sm((S.skin.age-0.35)/0.65))}
function beardCol(){return S.beard.link?col(cur.h):col(S.beard.c)}
function updHairCols(){var h=col(cur.h),t=col(cur.t),gr=greyAmt();LY.scalp.U.uHair.value.copy(h);LY.scalp.U.uTip.value.copy(t);
 var bc=S.brow.link?h.clone().multiplyScalar(0.8):col(S.brow.c);LY.brow.U.uHair.value.copy(bc);LY.brow.U.uTip.value.copy(S.brow.link?bc.clone().lerp(t,0.25):bc);
 var dc=beardCol();LY.beard.U.uHair.value.copy(dc);LY.beard.U.uTip.value.copy(S.beard.link?t:dc.clone().multiplyScalar(1.3));
 var lc=col(S.lash.c);LY.lash.U.uHair.value.copy(lc);LY.lash.U.uTip.value.copy(lc);
 LY.scalp.U.uGrey.value=gr;LY.beard.U.uGrey.value=gr;LY.brow.U.uGrey.value=gr*0.7;stubColor(LY.scalp,h);SKU.hA.value.copy(h).multiplyScalar(0.85);SKU.hB.value.copy(t);SKU.stub.value=cur.stub;stubColor(LY.beard,dc)}
function updHairMat(){var m=S.hmat;if(m.soft==null)m.soft=0.7;if(m.shadow==null)m.shadow=1;['scalp','brow','beard','lash'].forEach(function(n){var U=LY[n].U,k=n==='lash'?0.5:1;U.uShine.value=m.shine*k;U.uGloss.value=m.gloss;U.uTrans.value=m.trans;U.uSoft.value=n==='lash'?m.soft*0.4:m.soft});LU.uShD.value=14*m.shadow}
function setHairVis(){var v=S.view.hair;tieBand.visible=v&&S.tie.mode!=='none';for(var n in LY){if(LY[n].obj)LY[n].obj.visible=v;if(LY[n].st)LY[n].st.obj.visible=v}}
var pend={},pendQ=0;function sched(n){pend[n]=1;if(pendQ)return;pendQ=requestAnimationFrame(function(){pendQ=0;var p=pend;pend={};if(p.scalp)buildScalp();if(p.brow)buildBrow();if(p.beard)buildBeard();if(p.lash)buildLash();stats0()})}

/* ================= eyes, mouth interior ================= */
var eyes=[],eyeR=0.26,scare=0,tps=new T.Vector3(0,3,6),mouseN=new T.Vector2(),sacc=new T.Vector3(),saccT=0;
function irisTex(hex,lim,seed){var c=document.createElement('canvas');c.width=256;c.height=64;var x=c.getContext('2d'),R=rng(seed),base=col(hex),hsl={};base.getHSL(hsl);
 x.fillStyle='#'+base.getHexString();x.fillRect(0,0,256,64);
 for(var i=0;i<420;i++){var px=R()*256,w=0.6+R()*1.6,l=clamp(hsl.l*(0.55+R()*0.9),0,0.92),a=0.25+R()*0.45;x.strokeStyle='hsla('+(hsl.h*360+(R()-.5)*14)+','+(hsl.s*100*(0.7+R()*0.5))+'%,'+(l*100)+'%,'+a+')';x.lineWidth=w;x.beginPath();x.moveTo(px,0);x.bezierCurveTo(px+(R()-.5)*8,20,px+(R()-.5)*8,44,px+(R()-.5)*6,64);x.stroke()}
 var gc=x.createLinearGradient(0,0,0,64);gc.addColorStop(0,'rgba(30,18,8,0.55)');gc.addColorStop(0.18,'rgba(160,110,40,0.22)');gc.addColorStop(0.35,'rgba(0,0,0,0)');gc.addColorStop(0.72,'rgba(0,0,0,0)');gc.addColorStop(1,'rgba(8,6,5,'+(0.25+0.7*lim)+')');x.fillStyle=gc;x.fillRect(0,0,256,64);
 for(i=0;i<26;i++){x.fillStyle='rgba(0,0,0,'+(0.15+R()*0.2)+')';x.beginPath();x.ellipse(R()*256,14+R()*36,1.5+R()*3,3+R()*5,0,0,6.283);x.fill()}
 var t=new T.CanvasTexture(c);t.anisotropy=4;return t}
function mkEye(sx){var g2=new T.Group();g2.position.set(sx*0.5,2.93,0.47);
 var scl=new T.Mesh(new T.SphereGeometry(1,32,24),new T.MeshStandardMaterial({color:0xf4f1ec,roughness:0.15}));g2.add(scl);
 var ir=new T.Mesh(new T.SphereGeometry(1.004,48,16,0,Math.PI*2,0,0.5).rotateX(Math.PI/2),new T.MeshStandardMaterial({color:0xffffff,roughness:0.3}));g2.add(ir);
 var pu=new T.Mesh(new T.SphereGeometry(1.008,24,12,0,Math.PI*2,0,0.22).rotateX(Math.PI/2),new T.MeshBasicMaterial({color:0x050505}));g2.add(pu);
 var hl=new T.Mesh(new T.SphereGeometry(0.09,12,8),new T.MeshBasicMaterial({color:0xffffff}));hl.position.set(0.27,0.3,0.9);g2.add(hl);
 g2.add(new T.Mesh(new T.SphereGeometry(1.03,32,24),new T.MeshPhysicalMaterial({color:0xffffff,roughness:0.03,metalness:0,transparent:true,opacity:0.18,depthWrite:false,clearcoat:1,envMapIntensity:1.6})));scene.add(g2);
 return{g:g2,ir:ir,pu:pu,scl:scl,k:1,sx:sx}}
function updEyeMats(){var e=S.eyes;eyes.forEach(function(E,i){var c=i===1&&e.het?e.c2:e.c;if(E.ir.material.map)E.ir.material.map.dispose();E.ir.material.map=irisTex(c,e.limbal,17+i*7);E.ir.material.needsUpdate=true;E.scl.material.color.set(e.sclera).lerp(new T.Color('#e8a0a0'),e.red*0.5)})}
function updEyes(dt){var md=S.eyes.gaze,tp;
 if(md==='fwd')tp=tps.set(0,2.95,12);else if(md==='cursor'){rc.setFromCamera(mouseN,cam);tp=rc.ray.at(7,new T.Vector3())}else if(md==='cam')tp=cam.position;else tp=(clip.visible&&!cm&&mode==='clip')?clip.position:cam.position;
 if(tp!==tps)tps.lerp(tp,0.2);scare=Math.max(0,scare-dt*1.5);
 if(ANIM.mode!=='none'){saccT-=dt;if(saccT<=0){saccT=0.4+Math.random()*1.6;sacc.set((Math.random()-.5)*0.8,(Math.random()-.5)*0.5,0)}}else sacc.set(0,0,0);
 eyes.forEach(function(e){var d=tps.clone().add(sacc).sub(e.g.position).normalize();if(d.z<0.55)d.z=0.55;d.normalize();e.g.lookAt(e.g.position.clone().add(d));var R=eyeR*e.k*S.eyes.size;e.g.scale.set(R,R*(1-scare*0.25),R);var s=(1+scare*0.3)*S.eyes.pupil;e.pu.scale.set(s,s,1)})}
var mouthG=new T.Group();scene.add(mouthG);
var cav=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshStandardMaterial({color:0x2a0a0a,roughness:0.6}));cav.scale.set(0.36,0.2,0.45);cav.position.set(0,1.8,0.5);mouthG.add(cav);
var tMat=new T.MeshStandardMaterial({color:0xece6d8,roughness:0.25});
var upT=new T.Mesh(new T.CylinderGeometry(0.34,0.32,0.085,28,1,false,-1.0,2.0),tMat);upT.position.set(0,1.88,0.6);mouthG.add(upT);
var loPiv=new T.Group();loPiv.position.set(0,2.05,-0.55);mouthG.add(loPiv);
var loT=new T.Mesh(new T.CylinderGeometry(0.31,0.3,0.075,28,1,false,-0.95,1.9),tMat);loT.position.set(0,1.79-2.05,0.58+0.55);loPiv.add(loT);
var tong=new T.Mesh(new T.SphereGeometry(1,20,12),new T.MeshStandardMaterial({color:0x9a3b3e,roughness:0.45}));tong.scale.set(0.24,0.07,0.3);tong.position.set(0,1.72-2.05,0.42+0.55);loPiv.add(tong);
function fitFeatures(){var pa=P.array;
 RIMS.eyes.forEach(function(r){var cx=0,cy=0,cz=0,n=r.v.length,s=0,i,v;for(i=0;i<n;i++){v=r.v[i]*3;cx+=pa[v];cy+=pa[v+1];cz+=pa[v+2]}cx/=n;cy/=n;cz/=n;for(i=0;i<n;i++){v=r.v[i]*3;s+=Math.hypot(pa[v]-cx,pa[v+1]-cy,pa[v+2]-cz)}
  var e=eyes[r.k];if(!e)return;e.g.position.set(r.E0.x+cx-r.c0.x,r.E0.y+cy-r.c0.y,r.E0.z+cz-r.c0.z);e.k=(s/n)/r.s0});
 var m=RIMS.mouth;if(m){var x=0,y=0,z=0;m.up.forEach(function(v){x+=pa[v*3];y+=pa[v*3+1];z+=pa[v*3+2]});var n2=m.up.length;mouthG.position.set(x/n2-m.u0.x,y/n2-m.u0.y,z/n2-m.u0.z)}
 var jv=(animExpr||S.expr).jaw||0;loPiv.rotation.x=0.22*jv;cav.scale.y=0.2+0.14*jv;cav.position.y=1.8-0.09*jv}

/* ================= deformation: morphs + sculpt ================= */
var defDirty=true,paintDirty=true,animExpr=null;
// mean curvature per vertex (1/unit): average normal change per unit distance to the one-ring, lightly smoothed
function updCurv(){var at=g.attributes.aCurv;if(!at)return;var a=at.array,pa=P.array,na=N.array,tmp=new Float32Array(NV),i,q;
 for(i=0;i<NV;i++){var sm2=0,cn=0,i3=i*3;for(q=NBO[i];q<NBO[i+1];q++){var j3=NBI[q]*3,dp=Math.hypot(pa[i3]-pa[j3],pa[i3+1]-pa[j3+1],pa[i3+2]-pa[j3+2]);if(dp<1e-6)continue;sm2+=Math.hypot(na[i3]-na[j3],na[i3+1]-na[j3+1],na[i3+2]-na[j3+2])/dp;cn++}tmp[i]=cn?sm2/cn:0}
 for(i=0;i<NV;i++){var s3=tmp[i],c3=1;for(q=NBO[i];q<NBO[i+1];q++){s3+=tmp[NBI[q]];c3++}a[i]=s3/c3}at.needsUpdate=true}
function applyDeform(){defDirty=false;var pa=P.array,ex=animExpr||S.expr,q,k;pa.set(REST);
 for(q=0;q<COMPS.length;q++){var C=COMPS[q],v=C.src==='shape'?S.shape[C.id]:C.src==='expr'?ex[C.id]:S.skin.age;if(!v)continue;var I=C.idx,Dd=C.d;
  for(k=0;k<I.length;k++){var j=I[k]*3,m=k*3;pa[j]+=Dd[m]*v;pa[j+1]+=Dd[m+1]*v;pa[j+2]+=Dd[m+2]*v}}
 for(k=0;k<pa.length;k++)pa[k]+=SD[k];
 P.needsUpdate=true;g.computeVertexNormals();updCurv();g.computeBoundingSphere();buildShell();detectEar();updEar();fitFeatures();for(var n in LY)rebind(LY[n])}

/* ================= skin painting (tone, makeup, beard shadow) ================= */
var STOPS=[[0,[0.98,0.86,0.78]],[0.2,[0.93,0.76,0.64]],[0.4,[0.84,0.62,0.48]],[0.6,[0.66,0.46,0.33]],[0.8,[0.45,0.29,0.2]],[1,[0.24,0.15,0.11]]];
function skinRGB(m,r,out){var i=0;while(i<STOPS.length-2&&m>STOPS[i+1][0])i++;var a=STOPS[i],b=STOPS[i+1],t=clamp((m-a[0])/(b[0]-a[0]),0,1),c=[0,1,2].map(function(k){return a[1][k]+(b[1][k]-a[1][k])*t}),u=r-0.5;
 c[0]+=u*0.07*(1-m*0.5);c[1]+=-u*0.025;c[2]+=u*0.035;(out||(out=new T.Color())).setRGB(clamp(c[0],0,1),clamp(c[1],0,1),clamp(c[2],0,1));return out}
function skinCol(){var c=S.skin.custom?col(S.skin.custom):skinRGB(S.skin.mel,S.skin.red);var a=S.skin.age;if(a>0){var hs={};c.getHSL(hs);c.setHSL(hs.h,hs.s*(1-0.25*a),hs.l*(1-0.05*a))}return c}
var FLUSH=new T.Color('#c4554f'),BLOT=new T.Color('#8a5a44'),WARM=new T.Color('#d9a273'),PINK=new T.Color('#d9707a'),LIP=new T.Color('#b0524c'),DK=new T.Color('#3b2622'),LNR=new T.Color('#0c0908');
function paintSkin(){paintDirty=false;var cs=skinCol(),ch=col(cur.h),bc=beardCol(),mk=S.makeup,bl=col(mk.blushC),lp=col(mk.lipC),sh=col(mk.shadowC),ca=g.attributes.color,ra=g.attributes.aRough.array,t=new T.Color(),cfg=BEARD[S.beard.style]||BEARD.none;
 for(var i=0;i<NV;i++){var x=REST[i*3],y=REST[i*3+1],z=REST[i*3+2],ax=Math.abs(x);
  var cov=sm((y-yLow(x,y,z)+0.05)/0.5)*sm((earD(x,y,z)-0.45)/0.3)*(y>1.9?1:0);
  t.copy(cs);
      // blood flow and melanin variation: redder nose, cheeks, ears and chin, warmer forehead, low-frequency blotches
      var flu=S.skin.flush==null?0.45:S.skin.flush,blo=S.skin.blotch==null?0.4:S.skin.blotch;
      if(blo>0){var bn=vn1(x*2.3,y*2.3,z*2.3,17)+0.55*vn1(x*6.5,y*6.5,z*6.5,23);t.multiplyScalar(1+bn*0.16*blo);t.lerp(BLOT,clamp(bn,0,1)*0.25*blo)}
      if(flu>0){var fzm=1.1*Math.exp(-(x*x/0.06+sq(y-2.45)/0.06+sq(z-1.3)/0.12))+0.75*Math.exp(-(sq(ax-0.75)/0.07+sq(y-2.4)/0.07))*(z>0.25?1:0)+0.9*Math.exp(-(sq(ax-1.32)/0.03+sq(y-2.78)/0.18+sq(z+0.8)/0.12))+0.45*Math.exp(-(x*x/0.12+sq(y-1.55)/0.04))*(z>0.7?1:0)+0.35*Math.exp(-(sq(ax-0.38)/0.03+sq(y-2.82)/0.004))*(z>0.6?1:0);
       t.lerp(FLUSH,Math.min(0.5,flu*0.3*fzm));t.lerp(WARM,flu*0.12*Math.exp(-(x*x/0.5+sq(y-3.65)/0.12))*(z>0.3?1:0))}
  t.lerp(PINK,0.22*Math.exp(-(sq(ax-0.85)+sq(y-2.3)+sq(z-0.7))/0.22)*(z>0.2?1:0));
  t.lerp(LIP,0.55*Math.exp(-(sq(y-1.85)/0.012+x*x/0.3))*(z>0.9?1:0));
  t.lerp(ch,(S.brow.on?0.22:0.7)*((ax>0.15&&ax<0.88&&z>0.7)?sm(1-Math.abs(y-3.2)/0.1):0));
  t.multiplyScalar(1-0.1*Math.exp(-(sq(ax-0.5)/0.1+sq(y-2.78)/0.006))*(z>0.5?1:0));
  if(S.skin.under>0)t.lerp(DK,S.skin.under*0.4*Math.exp(-(sq(ax-0.5)/0.05+sq(y-2.74)/0.006))*(z>0.4?1:0));
  var fm=fullM(x,y,z);if(fm>0){var bm=cfg[1]?beardMask(cfg[1],x,y,z):0;t.lerp(bc,Math.min(0.75,fm*0.55*S.beard.stub+bm*0.35))}
  if(mk.blush>0)t.lerp(bl,mk.blush*0.45*Math.exp(-(sq(ax-0.78)/0.06+sq(y-2.4)/0.05))*(z>0.2?1:0));
  if(mk.shadow>0)t.lerp(sh,mk.shadow*0.8*Math.exp(-(sq(ax-0.5)/0.07+sq(y-3.05)/0.005))*(z>0.4&&y>2.96?1:0));
  if(mk.liner>0)t.lerp(LNR,mk.liner*LINER[i]);
  var lipT=sm((0.52-ax)/0.2)*Math.exp(-sq(y-1.85)/0.007)*sm((z-0.72)/0.12);
  if(mk.lip>0)t.lerp(lp,mk.lip*0.92*lipT);
  ra[i]=lipT*(0.04+mk.gloss*0.4);ca.setXYZ(i,t.r,t.g,t.b)}
 ca.needsUpdate=true;g.attributes.aRough.needsUpdate=true}
function updSkinU(){var k=S.skin;SKU.bump.value=k.bump;SKU.oil.value=k.oil;SKU.sss.value=k.sss;SKU.trn.value=k.trn;SKU.age.value=k.age;SKU.frk.value=k.freck;skinMat.roughness=k.rough;skinMat.clearcoat=0.02+0.12*k.oil;SKU.micro.value=k.micro==null?0.8:k.micro;SKU.fuzz.value=k.fuzz==null?0.35:k.fuzz}

/* ================= lighting rigs ================= */
var RIGS={
 cinema:{en:'Cinematic (AAA)',ar:'سينمائي (AAA)',k:[-4,6.5,7,'#fff0e0',1.05],r:[5.5,4,-6,'#cfe0ff',0.32],f:[5,0,6,'#ffe9dc',0.07],h:['#f2ece6','#1f1a16',0.22],sky:['#050505','#2b2b2d'],bg:['#2c2d2f','#141516']},
 studio:{en:'Studio',ar:'استوديو',k:[4,7,6,'#fff2e0',0.7],r:[-6,4,-5,'#9ec4ff',0.35],f:[-5,1,6,'#ffffff',0],h:['#ffffff','#5a4a3c',0.35],sky:['#0d0b0a','#54595f'],bg:['#3b3f45','#151619']},
 portrait:{en:'Rembrandt',ar:'رامبرانت',k:[6,6,3,'#ffe6c8',0.85],r:[-5,5,-6,'#bcd2ff',0.25],f:[-6,0,4,'#ffffff',0.05],h:['#fff4e6','#2a2018',0.22],sky:['#060504','#2f2a25'],bg:['#2a2420','#0b0a09']},
 beauty:{en:'Beauty',ar:'تجميلي',k:[0,7,7,'#fff8f0',0.75],r:[0,5,-7,'#ffffff',0.45],f:[0,-3,6,'#fff0e6',0.25],h:['#ffffff','#8a7a70',0.4],sky:['#2a2828','#a7a4a0'],bg:['#d9d6d2','#9b9893']},
 split:{en:'Split',ar:'منقسم',k:[9,2.5,0,'#fff0e0',0.95],r:[-6,4,-4,'#7aa8ff',0.2],f:[0,0,1,'#ffffff',0],h:['#ffffff','#000000',0.1],sky:['#030303','#1a1a1c'],bg:['#141518','#050506']},
 sunny:{en:'Sunny',ar:'مشمس',k:[6,10,4,'#fff3dc',1.0],r:[-5,3,-6,'#bfe0ff',0.3],f:[0,0,1,'#ffffff',0],h:['#9ecbff','#6b5a40',0.55],sky:['#6b5a44','#8fc3ff'],bg:['#8ec5f2','#e8f1f7']},
 overcast:{en:'Overcast',ar:'غائم',k:[2,9,5,'#eef2f6',0.35],r:[-5,4,-5,'#dfe6ee',0.2],f:[0,0,1,'#ffffff',0],h:['#e8eef5','#5c5a55',0.8],sky:['#4a4946','#c9ced4'],bg:['#b8bdc2','#7d8186']},
 golden:{en:'Golden hour',ar:'الساعة الذهبية',k:[9,2.2,3,'#ffae55',1.05],r:[-7,3,-6,'#ff6e3a',0.55],f:[-4,2,5,'#7d8cff',0.12],h:['#ffcf9a','#3a2a40',0.3],sky:['#2a1830','#ff9a52'],bg:['#f39a55','#3a2346']},
 neon:{en:'Neon night',ar:'نيون ليلي',k:[5,3,4,'#ff3fb0',0.85],r:[-5,4,-4,'#2fd8ff',1.0],f:[0,-2,6,'#6a3cff',0.15],h:['#3a2a6a','#050208',0.15],sky:['#05030a','#3b1f6e'],bg:['#1a0f2e','#05030a']}};
var TONEM={linear:T.LinearToneMapping,aces:T.ACESFilmicToneMapping,reinhard:T.ReinhardToneMapping,cineon:T.CineonToneMapping};
var lastTone=null;
function rotY(a,v){var c=Math.cos(a),s=Math.sin(a);return new T.Vector3(v[0]*c+v[2]*s,v[1],-v[0]*s+v[2]*c)}
function applyLight(){var L=S.light,r=RIGS[L.rig]||RIGS.studio,a=L.rot*Math.PI/180,I=L.int;
 [[key,r.k],[rim,r.r],[fill,r.f]].forEach(function(q){q[0].position.copy(rotY(a,q[1]));q[0].color.set(q[1][3]);q[0].intensity=q[1][4]*I});
 hemi.color.set(r.h[0]);hemi.groundColor.set(r.h[1]);hemi.intensity=r.h[2]*I;
 var kc=col(r.k[3]),rc2=col(r.r[3]),hc=col(r.h[0]);LU.uC1.value.set(kc.r,kc.g,kc.b).multiplyScalar(r.k[4]*I*1.75);LU.uC2.value.set(rc2.r,rc2.g,rc2.b).multiplyScalar(r.r[4]*I*0.95);LU.uAmb.value.set(hc.r,hc.g,hc.b).multiplyScalar(0.25+r.h[2]*I*0.5);
 // environment for reflections
 var s0=col(r.sky[0]),s1=col(r.sky[1]),sp2=sky.geometry.attributes.position,sc=sky.geometry.attributes.color;for(var i=0;i<sp2.count;i++){var t=(sp2.getY(i)/50+1)/2;sc.setXYZ(i,s0.r+(s1.r-s0.r)*t,s0.g+(s1.g-s0.g)*t,s0.b+(s1.b-s0.b)*t)}sc.needsUpdate=true;
 [[PKey,r.k,5],[PRim,r.r,3],[PFill,r.f,2]].forEach(function(q){var v=rotY(a,q[1]).normalize().multiplyScalar(40);q[0].position.copy(v);q[0].lookAt(0,0,0);q[0].material.color.set(q[1][3]).multiplyScalar(q[1][4]*q[2]*I+0.001)});
 PTop.position.set(0,45,0);PTop.lookAt(0,0,0);PTop.material.color.set(r.h[0]).multiplyScalar(1.5*r.h[2]*I);
 if(envRT)envRT.dispose();envRT=pm.fromScene(es2,0.04);scene.environment=envRT.texture;
 ren.toneMappingExposure=L.expo;var tm=TONEM[L.tone]||T.LinearToneMapping;if(tm!==lastTone){ren.toneMapping=tm;lastTone=tm;scene.traverse(function(o){if(o.material)[].concat(o.material).forEach(function(m){m.needsUpdate=true})});clayMat.needsUpdate=skinMat.needsUpdate=true}
 var x=bgCv.getContext('2d'),gr=x.createLinearGradient(0,0,0,256);
 if(L.bg==='trans'){scene.background=null;st.classList.add('trans')}else{st.classList.remove('trans');var c1=L.bg==='solid'?L.bgc:L.bg==='green'?'#00b140':r.bg[0],c2=L.bg==='solid'?L.bgc:L.bg==='green'?'#00b140':r.bg[1];gr.addColorStop(0,c1);gr.addColorStop(1,c2);x.fillStyle=gr;x.fillRect(0,0,2,256);bgTex.needsUpdate=true;scene.background=bgTex}}
function applyView(){var v=S.view;skin.material=v.mode==='clay'||v.mode==='wire'?clayMat:skinMat;wire.visible=v.mode==='wire'||v.mode==='topo';setHairVis();cam.fov=2*Math.atan(12/v.focal)*180/Math.PI;cam.updateProjectionMatrix();$('turn').classList.toggle('p',!!v.turn)}

/* ================= clipper (barber tools) ================= */
var clip=new T.Group(),tilt=new T.Group();clip.add(tilt);tilt.rotation.x=0.5;
var mB=new T.MeshStandardMaterial({color:0x202225,metalness:0.55,roughness:0.35}),mS=new T.MeshStandardMaterial({color:0xd5d9dd,metalness:0.9,roughness:0.25});
var bdy=new T.Mesh(new T.BoxGeometry(0.64,2.0,0.46),mB);bdy.position.set(0,1.15,0.25);tilt.add(bdy);
var bn=new T.Mesh(new T.BoxGeometry(0.66,0.16,0.48),new T.MeshStandardMaterial({color:0x2f9fd0,roughness:0.4}));bn.position.set(0,0.55,0.25);tilt.add(bn);
var bl=new T.Mesh(new T.BoxGeometry(0.66,0.2,0.04),mS);bl.position.set(0,0.1,0.02);tilt.add(bl);
var teeth=new T.Group();tilt.add(teeth);
var gmat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.5}),gdm=new T.Mesh(new T.BoxGeometry(0.68,0.22,0.12),gmat);gdm.position.set(0,0.1,0.06);tilt.add(gdm);
clip.visible=false;scene.add(clip);
var lnPrev=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:0xff4040,depthTest:false}));lnPrev.renderOrder=11;lnPrev.visible=false;scene.add(lnPrev);
function lnPrevSet(a,b){var p=lnPrev.geometry.attributes.position;p.setXYZ(0,a.x,a.y,a.z);p.setXYZ(1,b.x,b.y,b.z);p.needsUpdate=true;lnPrev.visible=true}
// straight razor line: sample the screen segment, project each sample onto the head, cut along the surface path
function lnFinish(e){var dx=e.clientX-lnS.x,dy=e.clientY-lnS.y,n=Math.max(2,Math.ceil(Math.hypot(dx,dy)/2)),prev=null;
 for(var i=0;i<=n;i++){var h=hit({clientX:lnS.x+dx*i/n,clientY:lnS.y+dy*i/n});if(!h)continue;
  if(prev){var fx=h.p.clone().sub(prev);fx.addScaledVector(h.n,-fx.dot(h.n));if(fx.lengthSq()>1e-10){fx.normalize();var m=Math.max(1,Math.ceil(prev.distanceTo(h.p)/(S.barb.lw*0.3)));for(var k=1;k<=m;k++)doCut(prev.clone().lerp(h.p,k/m),h.n,0,fx)}}prev=h.p}}
function guard(){var s=$('gd');gdm.visible=+s.value>0.015;gmat.color.set(['#ffffff','#d94f4f','#e0a030','#5fb85f','#4f8fd9','#a060d0'][s.selectedIndex])}
var NP=1500,pp=new Float32Array(NP*3),pv=new Float32Array(NP*3),pl=new Float32Array(NP),pc=new Float32Array(NP*3),pn=0;
for(var i0=0;i0<NP;i0++)pp[i0*3+1]=-99;
var pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pp,3));pg.setAttribute('color',new T.BufferAttribute(pc,3));
var pobj=new T.Points(pg,new T.PointsMaterial({size:3,sizeAttenuation:false,vertexColors:true}));pobj.frustumCulled=false;scene.add(pobj);
function spawn(pt,nm,c){var hc=col(cur.h);for(var s=0;s<c;s++){pn=(pn+1)%NP;var i=pn,j=i*3,r=Math.random;pp[j]=pt.x+(r()-.5)*0.2;pp[j+1]=pt.y+(r()-.5)*0.2;pp[j+2]=pt.z+(r()-.5)*0.2;pv[j]=nm.x*0.6+(r()-.5)*0.8;pv[j+1]=nm.y*0.6+r()*0.5;pv[j+2]=nm.z*0.6+(r()-.5)*0.8;pl[i]=2.5;var b=0.6+r()*0.7;pc[j]=hc.r*b;pc[j+1]=hc.g*b;pc[j+2]=hc.b*b}pg.attributes.color.needsUpdate=true}
function stepP(dt){for(var i=0;i<NP;i++){if(pl[i]<=0)continue;pl[i]-=dt;var j=i*3;pv[j+1]-=3.2*dt;pv[j]*=0.99;pv[j+2]*=0.99;pp[j]+=pv[j]*dt;pp[j+1]+=pv[j+1]*dt;pp[j+2]+=pv[j+2]*dt;if(pl[i]<=0||pp[j+1]<-0.6){pl[i]=0;pp[j+1]=-99}}pg.attributes.position.needsUpdate=true}
var BL={std:{n:'Standard',a:'قياسية',w:1,vw:1,min:0.012,taper:0,prec:60,cov:60,noise:55,safe:70},taper:{n:'Taper blade',a:'شفرة تدريج',w:0.8,vw:0.85,min:0.012,taper:1.2,prec:78,cov:55,noise:50,safe:75},tblade:{n:'T-blade outliner',a:'شفرة T للتحديد',w:0.55,vw:0.5,min:0.004,taper:0,prec:95,cov:30,noise:60,safe:55},foil:{n:'Foil shaver',a:'ماكينة رقائق',w:1.1,vw:1.05,min:0.002,taper:0,prec:70,cov:65,noise:45,safe:95},wide:{n:'Wide pro blade',a:'شفرة عريضة',w:1.6,vw:1.5,min:0.02,taper:0,prec:35,cov:95,noise:80,safe:60}};
var MT={std:{n:'Standard motor',a:'محرك قياسي',pitch:105,vib:1,part:1,dp:0,dn:0},rot:{n:'Rotary motor',a:'محرك دوّار',pitch:150,vib:1.7,part:1.5,dp:-8,dn:18},mag:{n:'Magnetic motor',a:'محرك مغناطيسي',pitch:80,vib:0.6,part:0.7,dp:8,dn:-22}};
var FN={black:{n:'Matte black',a:'أسود مطفي',c:0x202225,m:0.55,r:0.4,e:0x000000,band:0x2f9fd0},chrome:{n:'Chrome',a:'كروم',c:0xdfe3e8,m:1,r:0.15,e:0x000000,band:0x202225},gold:{n:'Gold',a:'ذهبي',c:0xd4a73a,m:0.9,r:0.25,e:0x000000,band:0x202225},neon:{n:'Neon blue',a:'أزرق نيون',c:0x1b6f8f,m:0.3,r:0.4,e:0x0a4a66,band:0x7ff0ff},red:{n:'Racing red',a:'أحمر سباق',c:0xb3261e,m:0.5,r:0.3,e:0x200000,band:0xffffff}};
var LD={bl:BL.std,mt:MT.std,fin:FN.black,laser:false,led:false},SM={bl:BL,mt:MT,fin:FN},mT=new T.MeshStandardMaterial({color:0x303236,metalness:0.6,roughness:0.4}),cm=false;
var lz=new T.Mesh(new T.BoxGeometry(2.4,0.012,0.012),new T.MeshBasicMaterial({color:0xff2a2a}));lz.position.set(0,0,0.06);lz.visible=false;tilt.add(lz);
var led=new T.PointLight(0xfff1d0,0,6);led.position.set(0,0.5,0.9);tilt.add(led);
function setBlade(){while(teeth.children.length)teeth.remove(teeth.children[0]);var b=LD.bl,vw=b.vw;bl.scale.x=vw;
 if(b===BL.foil){var f=new T.Mesh(new T.BoxGeometry(0.66*vw,0.14,0.02),new T.MeshStandardMaterial({color:0xe0b84a,metalness:0.95,roughness:0.2}));f.position.set(0,0.03,0.045);teeth.add(f);return}
 var n=Math.round(14*vw),ht=b===BL.tblade?0.14:0.1;for(var i=0;i<n;i++){var h=b===BL.taper?0.1-Math.abs(i-n/2)/n*0.07:ht,tt=new T.Mesh(new T.BoxGeometry(0.025,h,0.05),mT);tt.position.set(-0.28*vw+i*(0.56*vw/(n-1)),0.04,0.03);teeth.add(tt)}}
var GD=[[0.012,'No guard','بدون مشط'],[0.04,'#0.5','#0.5'],[0.07,'#1','#1'],[0.12,'#2','#2'],[0.2,'#3','#3'],[0.3,'#4','#4']];
function cstats(){var b=LD.bl,m=LD.mt,gi=$('gd').selectedIndex;return[['Precision','الدقة',b.prec+m.dp],['Coverage','التغطية',b.cov+gi*2],['Noise','الضجيج',b.noise+m.dn],['Skin safety','أمان البشرة',b.safe+(gi>0?10:-5)]]}
function buildMenu(){var h='';[['Blade','الشفرة','bl'],['Motor','المحرك','mt'],['Finish','الطلاء','fin']].forEach(function(s){h+='<div class="slot"><div class="t">'+tx(s[0],s[1])+'</div><div class="opts2">';for(var k in SM[s[2]])h+='<button data-s="'+s[2]+'" data-k="'+k+'" class="'+(LD[s[2]]===SM[s[2]][k]?'on':'')+'">'+esc(tx(SM[s[2]][k].n,SM[s[2]][k].a))+'</button>';h+='</div></div>'});
 h+='<div class="slot"><div class="t">'+tx('Guard comb','مشط الحماية')+'</div><div class="opts2">';GD.forEach(function(g2,i){h+='<button data-g="'+i+'" class="'+($('gd').selectedIndex===i?'on':'')+'">'+esc(tx(g2[1],g2[2]))+'</button>'});
 h+='</div></div><div class="slot"><div class="t">'+tx('Attachments','الملحقات')+'</div><div class="opts2"><button data-t="laser" class="'+(LD.laser?'on':'')+'">'+tx('Laser guide','دليل ليزر')+'</button><button data-t="led" class="'+(LD.led?'on':'')+'">'+tx('LED light','إضاءة LED')+'</button></div></div>';
 $('opts').innerHTML=h;$('stats').innerHTML=cstats().map(function(s){var v=clamp(s[2],0,100);return'<div class="sb"><span>'+tx(s[0],s[1])+'</span><u><i style="width:'+v+'%"></i></u></div>'}).join('');
 setT($('cmT'),'Clipper loadout','تجهيز ماكينة الحلاقة');setT($('cmX'),'Close (Esc)','إغلاق (Esc)')}
function applyLD(){setBlade();var f=LD.fin;mB.color.set(f.c);mB.metalness=f.m;mB.roughness=f.r;mB.emissive.set(f.e);bn.material.color.set(f.band);lz.visible=LD.laser;led.intensity=LD.led?1.2:0;if(osc)osc.frequency.value=LD.mt.pitch;buildMenu()}
function toggleCM(on){cm=on;$('cm').classList.toggle('open',on);if(on){stopBuzz();clip.visible=true;buildMenu()}else if(mode!=='clip'&&!auto)clip.visible=false}

/* ---------- barber challenge ---------- */
var LAD=[['skin','Skin (foil) · 0 mm','جلد · 0 مم',0.003],['0','#0 · 0.8 mm','#0 · 0.8 مم',0.015],['0.5','#0.5 · 1.5 mm','#0.5 · 1.5 مم',0.04],['1','#1 · 3 mm','#1 · 3 مم',0.07],['1.5','#1.5 · 4.5 mm','#1.5 · 4.5 مم',0.095],['2','#2 · 6 mm','#2 · 6 مم',0.12],['3','#3 · 10 mm','#3 · 10 مم',0.2],['4','#4 · 13 mm','#4 · 13 مم',0.3],['5','#5 · 16 mm','#5 · 16 مم',0.4],['6','#6 · 19 mm','#6 · 19 مم',0.5],['8','#8 · 25 mm','#8 · 25 مم',0.65]];
var FADEP={low:['Low skin fade','تدريج منخفض',{style:'fade',lo:'skin',hi:'2',start:2.15,top:2.9,soft:0.7}],mid:['Mid skin fade','تدريج متوسط',{style:'fade',lo:'skin',hi:'2',start:2.2,top:3.35,soft:0.7}],high:['High skin fade','تدريج عالٍ',{style:'fade',lo:'skin',hi:'1.5',start:2.25,top:3.75,soft:0.75}],
 drop:['Drop fade','تدريج منحدر',{style:'drop',lo:'0',hi:'2',start:2.2,top:3.3,soft:0.7}],taper:['Taper','تابر',{style:'taper',lo:'0.5',hi:'3',start:2.1,top:2.75,soft:0.9}],burst:['Burst fade','تدريج دائري',{style:'burst',lo:'skin',hi:'2',start:2.15,top:3.1,soft:0.7}],under:['Undercut #2','أندركت #2',{style:'fade',lo:'2',hi:'2',start:2.2,top:3.45,soft:0}]};
function ladIdx(k){for(var i=0;i<LAD.length;i++)if(LAD[i][0]===k)return i;return 0}
function fadeLevels(){var a=ladIdx(S.fade.lo),b=ladIdx(S.fade.hi);if(b<a)b=a;var L=[];for(var i=a;i<=b;i++)L.push(LAD[i][3]);return L}
// fade coordinate t: 0 = bottom of the fade, 1 = top; above 1 the natural length stays
function fadeT(x,y,z,ed){var F=S.fade,y0=F.start,y1=Math.max(F.top,F.start+0.05);
 if(F.style==='burst'){var d=Math.hypot(Math.abs(x)-1.4,y-2.75,z+0.75),r0=0.35+(y0-2.05),r1=0.35+(y1-2.05)*0.9;return(d-r0)/Math.max(0.05,r1-r0)}
 if(F.style==='drop'){var dr=sm((-z-0.75)/0.55);y0-=dr*0.3;y1-=dr*0.55}
 if(F.style==='taper'){hairW(x,y,z,ed);y=y-HLY+2.05}
 return(y-y0)/(y1-y0)}
function fadeCap(t,L){var n=L.length,pos=clamp(t*n-0.5,0,n),k=Math.floor(pos),fr=pos-k,sf=S.fade.soft;if(k>=n)return 9;
 var a=L[k],b=k+1<n?L[k+1]:9,f=sf<0.01?(fr>=0.5?1:0):sm((fr-0.5)/sf+0.5);return Math.exp(Math.log(a)+(Math.log(b)-Math.log(a))*f)}
function applyFade(){var L=LY.scalp,H=L.H,lev=fadeLevels();if(!H.n)return;
 for(var i=0;i<H.n;i++){var t=H.TI[i]*3,u=H.BU[i],v=H.BV[i],w=1-u-v,ia=IX[t],ib=IX[t+1],ic=IX[t+2];
  var x=REST[ia*3]*w+REST[ib*3]*u+REST[ic*3]*v,y=REST[ia*3+1]*w+REST[ib*3+1]*u+REST[ic*3+1]*v,z=REST[ia*3+2]*w+REST[ib*3+2]*u+REST[ic*3+2]*v,ed=EARD[ia]*w+EARD[ib]*u+EARD[ic]*v;
  // fade only the sides and back; the front hairline and top keep their length
  var c=fadeCap(fadeT(x,y,z,ed),lev);if(z>0.35&&Math.abs(x)<0.75)c=9;H.CAP[i]=c;H.MISC[i*4]=H.DH[i]?0:Math.min(H.L0[i],c)}
 L.dirty=true;shortDirty=true}
function clearFade(){var L=LY.scalp,H=L.H;S.fade.on=false;for(var i=0;i<H.n;i++){H.CAP[i]=9;H.MISC[i*4]=H.DH[i]?0:H.L0[i]}L.dirty=true;shortDirty=true}
var fadeTabOn=false;
function updFadeViz(){var a=g.attributes.aFade;if(!a)return;var n=fadeLevels().length,arr=a.array;
 for(var i=0;i<NV;i++){var x=REST[i*3],y=REST[i*3+1],z=REST[i*3+2],hw=hairW(x,y,z,EARD[i]);arr[i]=(z>0.35&&Math.abs(x)<0.75)?-1:fadeT(x,y,z,EARD[i])*n}
 a.needsUpdate=true;SKU.fadeN.value=n;SKU.fadeShow.value=S.fade.lines&&fadeTabOn?1:0;
 var e=$('fadeSeq');if(e){var lv=fadeLevels(),a0=ladIdx(S.fade.lo);e.textContent=lv.map(function(_,i){return LAD[a0+i][1].split(' ·')[0]}).join(' → ')+' → '+tx('natural top','الأعلى الطبيعي')}}
var G={on:false,t:0,score:0,combo:0,mist:0,tg:'fade',acc:0,dirty:false,last:0},trimmed=0;
var TG={fade:{say:['Give me the fade from the photo!','أريد التدريج الذي في الصورة!'],f:function(y){return 0.02+0.43*sm((y-2.05)/1.75)}},buzz:{say:['Just a clean #1 buzz all over.','حلاقة نظيفة رقم 1 لكامل الرأس.'],f:function(){return 0.07}},taper:{say:['High skin fade, keep the top!','تدريج عالٍ حتى الجلد، واترك الأعلى!'],f:function(y){return y<3.0?0.02:0.02+0.35*sm((y-3.0)/0.9)}}};
function toast(m,bad){var e=$('toast');e.textContent=m;e.className=bad?'bad show':'show';clearTimeout(toast.t);toast.t=setTimeout(function(){e.className=''},1900)}
function accuracy(){var H=LY.scalp.H,f=TG[G.tg].f,s=0;for(var i=0;i<H.n;i++){var id=Math.min(H.L0[i],f(H.RT[i*3+1]));s+=Math.abs(Math.min(H.L0[i],H.CAP[i])-id)}return Math.max(0,100*(1-(s/Math.max(1,H.n))/0.2))}
function hud(){$('hS').textContent=Math.round(G.score)+' '+tx('pts','نقطة');$('hT').textContent=Math.ceil(G.t)+' '+tx('s','ث');$('hA').textContent=tx('Accuracy ','الدقة ')+Math.round(G.acc)+'%';$('hC').textContent=tx('Combo ×','سلسلة ×')+(1+Math.min(G.combo,20)*0.1).toFixed(1);$('hM').textContent=G.mist+' '+tx('mistakes','أخطاء')}
function drawMini(){var H=LY.scalp.H,c=$('mini'),x=c.getContext('2d'),W=c.width,Hh=c.height,nb=10,sm2=new Float32Array(nb),tg=new Float32Array(nb),cn=new Float32Array(nb),f=TG[G.tg].f,i,b;
 for(i=0;i<H.n;i++){var y=H.RT[i*3+1];b=Math.floor((y-2)/2.6*nb);if(b<0||b>=nb)continue;sm2[b]+=Math.min(H.L0[i],H.CAP[i]);tg[b]+=Math.min(H.L0[i],f(y));cn[b]++}
 x.clearRect(0,0,W,Hh);var bw2=W/nb,mx=0.7;for(b=0;b<nb;b++){if(!cn[b])continue;var cv2=sm2[b]/cn[b]/mx*(Hh-16),tv=tg[b]/cn[b]/mx*(Hh-16);x.fillStyle='#7fb4cf';x.fillRect(b*bw2+3,Hh-14-cv2,bw2-6,cv2);x.fillStyle='#e0a030';x.fillRect(b*bw2,Hh-15-tv,bw2,3)}
 x.fillStyle='#9a948b';x.font='10px system-ui';x.fillText(tx('low','أسفل'),2,Hh-2);var lab=tx('top of head · bars = yours, gold = target','أعلى الرأس · الأعمدة = قصّتك، الذهبي = الهدف');x.fillText(lab,W-x.measureText(lab).width-2,Hh-2)}
function gStart(){G.tg=$('tgt').value;S.fade.on=false;buildScalp();G.on=true;G.t=90;G.score=0;G.combo=0;G.mist=0;G.acc=0;$('hud').hidden=false;$('res').hidden=true;$('mini').hidden=false;setMode('clip');toast(tx(TG[G.tg].say[0],TG[G.tg].say[1]));drawMini();hud()}
function gEnd(){if(!G.on)return;G.on=false;stopBuzz();var a=accuracy(),sc=Math.round(G.score*(0.5+a/100)),s=a>=90?3:a>=75?2:a>=55?1:0;
 $('rT').textContent='★'.repeat(s)+'☆'.repeat(3-s);$('rP').textContent=tx('Accuracy ','الدقة ')+Math.round(a)+'%\n'+tx('Score ','النتيجة ')+sc+'\n'+tx('Mistakes ','الأخطاء ')+G.mist+'\n'+(s===3?tx('Master barber!','حلاق محترف!'):s?tx('Nice cut, keep practicing.','قصة جيدة، واصل التدريب.'):tx('Too rough, try again.','خشنة جداً، حاول مرة أخرى.'));$('res').hidden=false;commit()}
function gScore(r){G.score=Math.max(0,G.score+(r.good*0.05+r.prog*0.01)*(1+Math.min(G.combo,20)*0.1)-r.over*0.3);
 if(r.over>3){G.combo=0;G.mist++;scare=1;toast(tx('Over-cut! Careful','قصّ زائد! انتبه'),true)}else if(r.good>0)G.combo+=0.2;G.dirty=true}
// roots are bucketed in a spatial grid so every cut step only visits the strands near the blade
function gridBuild(H){var m=new Map(),RT=H.RT;for(var i=0;i<H.n;i++){var k=((Math.floor(RT[i*3]/0.25)+64)*128+Math.floor(RT[i*3+1]/0.25)+64)*128+Math.floor(RT[i*3+2]/0.25)+64,a=m.get(k);if(!a){a=[];m.set(k,a)}a.push(i)}return m}
function gridQ(H,p,r,fn){if(!H.grid)H.grid=gridBuild(H);var c=0.25,x0=Math.floor((p.x-r)/c),x1=Math.floor((p.x+r)/c),y0=Math.floor((p.y-r)/c),y1=Math.floor((p.y+r)/c),z0=Math.floor((p.z-r)/c),z1=Math.floor((p.z+r)/c);
 for(var x=x0;x<=x1;x++)for(var y=y0;y<=y1;y++)for(var z=z0;z<=z1;z++){var a=H.grid.get(((x+64)*128+y+64)*128+z+64);if(a)for(var q=0;q<a.length;q++)fn(a[q])}}
// o.n + o.fx: rectangular blade footprint, edge on to the stroke; o.flick lengthens toward the heel; o.thin: thinning shears
function cutAt(pt,rad,cap,taper,o){o=o||{};var r={c:0,good:0,over:0,prog:0},gf=G.on?TG[G.tg].f:null,n=o.n,fx=o.fx,bx=n&&fx?new T.Vector3().crossVectors(n,fx).normalize():null,dep=rad*0.45;
 [LY.scalp,LY.beard].forEach(function(L){var H=L.H,RT=H.RT;if(!H.n)return;
  gridQ(H,pt,rad+0.05,function(i){var j=i*3,dx=RT[j]-pt.x,dy=RT[j+1]-pt.y,dz=RT[j+2]-pt.z,e,fl=0,nc;
   if(bx){var a=dx*bx.x+dy*bx.y+dz*bx.z,f=dx*fx.x+dy*fx.y+dz*fx.z,hn=dx*n.x+dy*n.y+dz*n.z;if(Math.abs(a)>rad||Math.abs(f)>dep||Math.abs(hn)>0.3)return;e=Math.abs(a)/rad;fl=(o.flick||0)*0.18*(0.5-f/dep*0.5)}
   else{var d2=dx*dx+dy*dy+dz*dz;if(d2>rad*rad)return;e=Math.sqrt(d2)/rad}
   var hs=((i*2654435761)>>>0)/4294967296;
   if(o.thin){if(((i*2246822519+3266489917)>>>0)/4294967296>o.thin)return;nc=H.L0[i]*(0.35+0.4*hs)}
   else nc=(cap*(1+taper*e)+fl)*(o.jit===undefined?0.8+0.4*hs:1-o.jit+2*o.jit*hs);
   if(nc<Math.min(H.L0[i],H.CAP[i])){H.CAP[i]=nc;H.MISC[i*4]=H.DH[i]?0:Math.min(H.L0[i],nc);L.dirty=true;r.c++;
    if(gf&&L===LY.scalp){var er=Math.min(H.L0[i],nc)-Math.min(H.L0[i],gf(RT[j+1]));if(er<-0.06)r.over++;else if(er<=0.06)r.good++;else r.prog++}}})});
 return r}
function doCut(pt,nm,cap,fx){var B=S.barb,tool=auto?'clipper':B.tool,w=(+$('bw').value)*LD.bl.w,cp,tp=LD.bl.taper,o={n:nm,fx:fx||null};
 if(tool==='razor'){cp=0;w*=0.7;tp=0;o.jit=0}else if(tool==='line'){cp=0;w=B.lw;tp=0;o.jit=0}else if(tool==='trimmer'){cp=0.004;w*=0.55;tp=0;o.jit=0.03}
 else if(tool==='scissors'){cp=B.slen;tp=0;o.jit=0.12}
 else if(tool==='thin'){cp=9;o.thin=B.thin}
 else{cp=(cap<=0.0125?LD.bl.min:Math.max(cap,LD.bl.min))+B.lever*0.03;o.flick=B.flick}
 var r=cutAt(pt,w,cp,tp,o);
 if(B.sym&&!auto&&Math.abs(pt.x)>0.05){var r2=cutAt(new T.Vector3(-pt.x,pt.y,pt.z),w,cp,tp,{n:new T.Vector3(-nm.x,nm.y,nm.z),fx:fx?new T.Vector3(-fx.x,fx.y,fx.z):null,jit:o.jit,thin:o.thin,flick:o.flick});r.c+=r2.c;r.good+=r2.good;r.over+=r2.over;r.prog+=r2.prog}
 if(r.c){trimmed+=r.c;spawn(pt,nm,Math.min(22,Math.ceil(r.c/8*LD.mt.part)));if(G.on)gScore(r);else note(tx('Trimmed ','تم قص ')+trimmed+tx(' strands',' خصلة'))}}
var ac=null,og=null,osc=null;
function startBuzz(){var sn=$('snd');if(sn&&!sn.checked)return;try{if(!ac){ac=new(window.AudioContext||window.webkitAudioContext)();var o=ac.createOscillator(),f=ac.createBiquadFilter();og=ac.createGain();o.type='sawtooth';o.frequency.value=LD.mt.pitch;osc=o;f.type='lowpass';f.frequency.value=700;og.gain.value=0;o.connect(f);f.connect(og);og.connect(ac.destination);o.start()}if(ac.state==='suspended')ac.resume();og.gain.setTargetAtTime(0.03,ac.currentTime,0.03)}catch(e){}}
function stopBuzz(){if(og&&ac)og.gain.setTargetAtTime(0,ac.currentTime,0.05)}
var tpos=new T.Vector3(),tq=new T.Quaternion(),tn=new T.Vector3(0,0,1),cutting=false,auto=null,mode='orb',lastPt=null,combing=false,lastCb=null,lastFx=null,lnS=null;
function setPose(pt,n,ya){var y=ya?ya.clone():new T.Vector3(0,1,0);y.addScaledVector(n,-y.dot(n));if(y.lengthSq()<1e-3){y.set(0,0,-1);y.addScaledVector(n,-y.dot(n))}y.normalize();var x=new T.Vector3().crossVectors(y,n);
 tq.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,n));tpos.copy(pt).addScaledVector(n,0.03);tn.copy(n);if(!clip.visible){clip.position.copy(tpos);clip.quaternion.copy(tq);clip.visible=true}}
function capY(y){return 0.02+0.43*sm((y-2.05)/1.75)}
function startAuto(){if(auto)return;setMode('clip');var rg=[];for(var y=2.0,i=0;y<=4.56;y+=0.19,i++)rg.push({y:y,d:i%2?-1:1});auto={r:rg,i:0,phi:0.9};$('auto').disabled=true;startBuzz()}
function autoStep(dt){var rg=auto.r[auto.i];if(!rg){auto=null;$('auto').disabled=false;stopBuzz();commit();return}
 auto.phi+=rg.d*3.5*dt;var lo=0.9,hi=5.38;if((rg.d>0&&auto.phi>hi)||(rg.d<0&&auto.phi<lo)){auto.i++;var nx=auto.r[auto.i];if(nx)auto.phi=nx.d>0?lo:hi;return}
 var ph2=auto.phi,o=new T.Vector3(4*Math.sin(ph2),rg.y,4*Math.cos(ph2)-0.25),dr=new T.Vector3(-Math.sin(ph2),0,-Math.cos(ph2));rc.set(o,dr);var h=rc.intersectObject(skin)[0];if(!h)return;
 var n=h.face.normal.clone();if(n.dot(dr)>0)n.negate();setPose(h.point,n);doCut(h.point,n,capY(h.point.y));th+=(ph2+0.5-th)*0.03;place();startBuzz()}

/* ================= physics ================= */
var ox=0,oy=0,pvx=0,pvy=0,cprev=new T.Vector3(),cvel=new T.Vector3();
function physUpdate(dt,tm){
 if(!PH.G){HU.uPhys.value=0;return}
 if(!PH.on){if(PH.gDirty){phWrite(PH.g);PH.gDirty=false}HU.uPhys.value=PH.gAny?1-Math.min(0.7,(cur.freq||0)*0.06):0;return}
 HU.uPhys.value=1-Math.min(0.7,(cur.freq||0)*0.06);
 var t0=performance.now(),G2=PH.G,o=PH.o,v=PH.v,gm=PH.g,i,g2,c;
 var rv=new T.Vector3().setFromMatrixColumn(cam.matrix,0),uv=new T.Vector3().setFromMatrixColumn(cam.matrix,1);
 var dd=Math.max(dt,0.008),rx=ox,ry=oy;ox=oy=0;
 var tvx=pvx+(rx/dd-pvx)*0.35,tvy=pvy+(ry/dd-pvy)*0.35,ax=(tvx-pvx)/dd,ay=(tvy-pvy)/dd;pvx=tvx;pvy=tvy;
 var F=[(-rv.x*ax+uv.x*ay)*0.0006,(-rv.y*ax+uv.y*ay)*0.0006,(-rv.z*ax+uv.z*ay)*0.0006];
 if(PH.shake>0){PH.shake=Math.max(0,PH.shake-dt);var sa=Math.sin((1.2-PH.shake)*34)*80*Math.min(1,PH.shake/0.5);F[0]+=rv.x*sa;F[1]+=rv.y*sa;F[2]+=rv.z*sa}
 var fm=Math.hypot(F[0],F[1],F[2]);if(fm>90){var s0=90/fm;F[0]*=s0;F[1]*=s0;F[2]*=s0;fm=90}
 var ca=clip.visible&&!cm&&mode==='clip',cf=PH.cf,cact=false;
 if(ca){cvel.copy(clip.position).sub(cprev).divideScalar(dd);if(cvel.length()>8)cvel.setLength(8);cf.fill(0);
  for(g2=0;g2<G2;g2++){var ex=PH.gx[g2]-clip.position.x,ey=PH.gy[g2]-clip.position.y,ez=PH.gz[g2]-clip.position.z,d2=ex*ex+ey*ey+ez*ez;
   if(d2<0.64){var f=1-Math.sqrt(d2)/0.8;f*=f*14;cf[g2*3]=cvel.x*f;cf[g2*3+1]=cvel.y*f;cf[g2*3+2]=cvel.z*f;cact=true}}
  var cs=(+$('bw').value)*LD.bl.w/0.3;CLIPU.value.set(clip.position.x,clip.position.y,clip.position.z,0.28*cs)}
 else CLIPU.value.w=0;
 cprev.copy(clip.position);
 if(S.tie.mode==='pony'){var tk=28,tcd=2*Math.sqrt(tk)*0.18,hh=Math.min(dt,0.05),wn=PH.wind*12*(0.6+0.4*Math.sin(tm*1.7));TIE.v.x+=(F[0]*0.09+wn-tk*TIE.o.x-tcd*TIE.v.x)*hh;TIE.v.y+=(F[1]*0.09-tk*TIE.o.y-tcd*TIE.v.y)*hh;TIE.v.z+=(F[2]*0.09+wn*0.3-tk*TIE.o.z-tcd*TIE.v.z)*hh;TIE.o.addScaledVector(TIE.v,hh).clampLength(0,0.6);LY.scalp.U.uTieSw.value.copy(TIE.o)}
 var force=cact||combing||PH.gDirty||PH.wind>0||fm>0.05||PH.shake>0;PH.gDirty=false;
 if(force)PH.asleep=false;
 if(PH.asleep){PH.ms=0;return}
 var steps=Math.min(3,Math.max(1,Math.ceil(dt*120))),h=Math.min(dt,0.05)/steps,E=0;
 for(var st2=0;st2<steps;st2++){
  for(g2=0;g2<G2;g2++){
   var b=g2*6,kk=PH.k*0.6/(0.2+PH.gl[g2]),cd=2*Math.sqrt(kk)*PH.damp,kc=kk*0.8;
   var wg=PH.wind>0?PH.wind*55*(0.65+0.35*Math.sin(tm*2.1+PH.gx[g2]*2.3+PH.gz[g2]*1.7)):0;
   for(c=0;c<3;c++){
    var f2=F[c]+(c===0?wg:c===2?wg*0.25:0)+(ca?cf[g2*3+c]:0);
    var o1=o[b+c],o2=o[b+3+c],v1=v[b+c],v2=v[b+3+c];
    var r1=o1-gm[b+c],r2=o2-gm[b+3+c];
    v1+=(-kk*r1-cd*v1+0.5*kc*(r2-r1)+0.4*f2)*h;
    v2+=(-0.6*kk*r2-cd*v2+kc*(r1-r2)+f2)*h;
    o1+=v1*h;o2+=v2*h;
    if(o1>0.9)o1=0.9;else if(o1<-0.9)o1=-0.9;if(o2>0.9)o2=0.9;else if(o2<-0.9)o2=-0.9;
    o[b+c]=o1;o[b+3+c]=o2;v[b+c]=v1;v[b+3+c]=v2}}}
 var tmp=PH.tmp,nb=PH.nb;tmp.set(o);
 for(g2=0;g2<G2;g2++){var cnt=0,s6=[0,0,0,0,0,0];
  for(i=0;i<26;i++){var n2=nb[g2*26+i];if(n2<0)break;cnt++;for(c=0;c<6;c++)s6[c]+=tmp[n2*6+c]}
  if(cnt)for(c=0;c<6;c++)o[g2*6+c]+=(s6[c]/cnt-o[g2*6+c])*0.25;
  for(c=0;c<6;c++){E+=v[g2*6+c]*v[g2*6+c]+(o[g2*6+c]-gm[g2*6+c])*(o[g2*6+c]-gm[g2*6+c])}}
 var Dt=PH.data;
 for(g2=0;g2<G2;g2++){var b2=g2*6;Dt[g2*4]=o[b2];Dt[g2*4+1]=o[b2+1];Dt[g2*4+2]=o[b2+2];Dt[(G2+g2)*4]=o[b2+3];Dt[(G2+g2)*4+1]=o[b2+4];Dt[(G2+g2)*4+2]=o[b2+5]}
 PH.tex.needsUpdate=true;
 if(!force&&E/G2<1e-6)PH.asleep=true;
 PH.ms=PH.ms*0.9+(performance.now()-t0)*0.1}
function phWrite(o){var G2=PH.G,Dt=PH.data;for(var g2=0;g2<G2;g2++){var b2=g2*6;Dt[g2*4]=o[b2];Dt[g2*4+1]=o[b2+1];Dt[g2*4+2]=o[b2+2];Dt[(G2+g2)*4]=o[b2+3];Dt[(G2+g2)*4+1]=o[b2+4];Dt[(G2+g2)*4+2]=o[b2+5]}PH.tex.needsUpdate=true}
/* ================= styling comb =================
 Combing moves each guide's rest target (PH.g); the springs then hold the strands there, so the groom
 survives head motion and wind while staying fully dynamic. */
var TEETH={fine:{n:31,tex:-0.6,clp:0,k:1},med:{n:21,tex:-0.2,clp:0.2,k:0.8},wide:{n:11,tex:0.2,clp:0.6,k:0.6}};
function mkCombTeeth(){var m=combM.userData.m;if(!m)return;combM.children.slice(1).forEach(function(c){combM.remove(c);c.geometry.dispose()});var n=(TEETH[S.comb.teeth]||TEETH.med).n,w=0.99/(n-1),tw=Math.min(0.03,w*0.55);for(var i=0;i<n;i++){var th=new T.Mesh(new T.BoxGeometry(tw,0.3,0.032),m);th.position.set(-0.495+i*w,-0.15,0);combM.add(th)}}
var combM=new T.Group(),cbDir=new T.Vector3(0,-1,0);
(function(){var m=new T.MeshStandardMaterial({color:0x1b1d21,roughness:0.32,metalness:0.05}),sp=new T.Mesh(new T.BoxGeometry(1.04,0.16,0.05),m);sp.position.y=0.08;combM.add(sp);
 combM.userData.m=m;mkCombTeeth()})();
combM.visible=false;scene.add(combM);
function combPose(h){var C=S.comb,sc=C.r*2;ring.visible=true;ring.position.copy(h.p).addScaledVector(h.n,0.01);ring.lookAt(h.p.clone().add(h.n));ring.scale.setScalar(C.r);
 var z=cbDir.clone().addScaledVector(h.n,-cbDir.dot(h.n));if(z.lengthSq()<1e-4){z.set(0,-1,0).addScaledVector(h.n,-h.n.y)}z.normalize();var x=new T.Vector3().crossVectors(h.n,z);
 combM.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,h.n,z));combM.scale.setScalar(sc);combM.position.copy(h.p).addScaledVector(h.n,0.24*sc+0.03);combM.visible=true}
function combAt(p,dir,amt){if(!PH.G||!PH.g)return;var C=S.comb,R=C.r,R2=R*R,g=PH.g,v=PH.v,t=C.t,i,c;
 for(i=0;i<PH.G;i++){var ex=PH.gx[i]-p.x,ey=PH.gy[i]-p.y,ez=PH.gz[i]-p.z,d2=ex*ex+ey*ey+ez*ez;if(d2>R2)continue;
  var w=1-Math.sqrt(d2)/R;w=w*w*(3-2*w)*C.str,b=i*6;
  var nx=(PH.gx[i]-HC.x)/(HR.x*HR.x),ny=(PH.gy[i]-HC.y)/(HR.y*HR.y),nz=(PH.gz[i]-HC.z)/(HR.z*HR.z),nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
  var a1=[0,0,0],a2=[0,0,0];
  if(t==='comb'){var dn=dir.x*nx+dir.y*ny+dir.z*nz,tx=dir.x-nx*dn,ty=dir.y-ny*dn,tz=dir.z-nz*dn,dd=amt*w*1.6;a1=[tx*dd*0.55,ty*dd*0.55,tz*dd*0.55];a2=[tx*dd,ty*dd,tz*dd]}
  else if(t==='lift'){var dl=amt*w*1.2;a1=[nx*dl,ny*dl,nz*dl];a2=[nx*dl*0.6,ny*dl*0.6,nz*dl*0.6]}
  else if(t==='smooth'){var nb=PH.nb,cnt=0,s6=[0,0,0,0,0,0];for(var q=0;q<26;q++){var n2=nb[i*26+q];if(n2<0)break;cnt++;for(c=0;c<6;c++)s6[c]+=g[n2*6+c]}
   if(cnt)for(c=0;c<3;c++){a1[c]=(s6[c]/cnt-g[b+c])*w*0.3;a2[c]=(s6[c+3]/cnt-g[b+3+c])*w*0.3}}
  else for(c=0;c<3;c++){a1[c]=-g[b+c]*w*0.2;a2[c]=-g[b+3+c]*w*0.2}
  if(t==='comb'){for(c=0;c<3;c++){v[b+c]+=a1[c]*8;v[b+3+c]+=a2[c]*12}}else for(c=0;c<3;c++){g[b+c]=clamp(g[b+c]+a1[c],-0.9,0.9);g[b+3+c]=clamp(g[b+3+c]+a2[c],-0.9,0.9);v[b+3+c]+=a2[c]*6}
 }
 PH.gAny=true;PH.gDirty=true;PH.asleep=false}
function combDir(d,n){var C=S.comb,v=C.dmode==='fixed'?new T.Vector3(0,-1,0):d.clone();v.addScaledVector(n,-v.dot(n));if(v.lengthSq()<1e-4)v.set(0,0,-1).addScaledVector(n,-n.z);v.normalize();if(C.ang)v.applyAxisAngle(n,C.ang*Math.PI/180);return v}
// teeth spacing sets how much each pass smooths (fine) or separates into sections (wide); C.tex is the finish
function combGroom(p,d,n){var C=S.comb,tt=TEETH[C.teeth]||TEETH.med,str=C.str*0.6;grmPaint(p,combDir(d,n),{b:'dir',r:C.r,str:str*tt.k});grmPaint(p,null,{b:'tex',r:C.r,str:str,to:clamp(C.tex+tt.tex*0.5,-1,1)});grmPaint(p,null,{b:'clp',r:C.r,str:str,to:tt.clp});grmRefresh(p,C.r)}
function combMove(e){var h=hit(e);if(!h){combM.visible=ring.visible=false;return}
 if(combing&&lastCb){var d=h.p.clone().sub(lastCb),l=d.length();if(l>1e-4){d.divideScalar(l);cbDir.lerp(d,0.5).normalize();var n=Math.max(1,Math.min(8,Math.ceil(l/(S.comb.r*0.25))));for(var s=1;s<=n;s++){var cp2=lastCb.clone().lerp(h.p,s/n);combAt(cp2,d,l/n);if(S.comb.t==='comb')combGroom(cp2,d,h.n)}}}
 if(combing)lastCb=h.p;combPose(h)}
function updPhys(){var p=S.phys;LY.scalp.U.uGravF.value=p.grav;PH.on=p.on;PH.k=p.k;PH.damp=p.damp;PH.grav=p.grav;HU.uSag.value=HU.sag0*p.grav*1.8;PH.wind=p.wind;PH.asleep=false}
function updHairLight(){cam.updateMatrixWorld();cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
 LU.uL1.value.copy(key.position).transformDirection(cam.matrixWorldInverse);LU.uL2.value.copy(rim.position).transformDirection(cam.matrixWorldInverse)}

/* ================= sculpt brushes ================= */
var ring=new T.Mesh(new T.RingGeometry(0.93,1,64),new T.MeshBasicMaterial({color:0x4fb3d9,transparent:true,opacity:0.85,depthTest:false,side:T.DoubleSide}));ring.renderOrder=10;ring.visible=false;scene.add(ring);
var sculpting=false,grab=null,lastSc=null;
function brushAt(c,n,mirror){var pa=P.array,na=N.array,r=BR.r,r2=r*r,typ=BR.t,inv=(BR.inv?-1:1)*(brushMod.inv?-1:1),str=BR.s;if(brushMod.smooth)typ='smooth';
 for(var i=0;i<NV;i++){var j=i*3,dx=pa[j]-c.x,dy=pa[j+1]-c.y,dz=pa[j+2]-c.z,d2=dx*dx+dy*dy+dz*dz;if(d2>r2)continue;var w=sm(1-Math.sqrt(d2)/r),a;
  if(typ==='draw'){a=w*str*0.012*inv;SD[j]+=n.x*a;SD[j+1]+=n.y*a;SD[j+2]+=n.z*a}
  else if(typ==='inflate'){a=w*str*0.012*inv;SD[j]+=na[j]*a;SD[j+1]+=na[j+1]*a;SD[j+2]+=na[j+2]*a}
  else if(typ==='smooth'){var ax=0,ay=0,az=0,cnt=NBO[i+1]-NBO[i];if(!cnt)continue;for(var q=NBO[i];q<NBO[i+1];q++){var m=NBI[q]*3;ax+=pa[m];ay+=pa[m+1];az+=pa[m+2]}a=w*str*0.5;SD[j]+=(ax/cnt-pa[j])*a;SD[j+1]+=(ay/cnt-pa[j+1])*a;SD[j+2]+=(az/cnt-pa[j+2])*a}
  else if(typ==='flatten'){var dd=dx*n.x+dy*n.y+dz*n.z;a=w*str*0.25;SD[j]-=n.x*dd*a;SD[j+1]-=n.y*dd*a;SD[j+2]-=n.z*dd*a}
  else if(typ==='restore'){a=1-w*str*0.25;SD[j]*=a;SD[j+1]*=a;SD[j+2]*=a}}
 if(mirror&&BR.sym&&Math.abs(c.x)>r*0.25)brushAt(new T.Vector3(-c.x,c.y,c.z),new T.Vector3(-n.x,n.y,n.z),false);defDirty=true}
var brushMod={inv:false,smooth:false};
function grabStart(h){var pa=P.array,r=BR.r,list=[];function cap(c,sx){for(var i=0;i<NV;i++){var j=i*3,d=Math.hypot(pa[j]-c.x,pa[j+1]-c.y,pa[j+2]-c.z);if(d<r)list.push(i,sm(1-d/r),sx)}}
 cap(h.p,1);if(BR.sym&&Math.abs(h.p.x)>r*0.25)cap(new T.Vector3(-h.p.x,h.p.y,h.p.z),-1);
 var nrm=new T.Vector3();cam.getWorldDirection(nrm);grab={list:list,sd0:SD.slice(),plane:new T.Plane().setFromNormalAndCoplanarPoint(nrm,h.p),p0:h.p.clone()}}
function grabMove(e){var r=cv.getBoundingClientRect();rc.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1),cam);var q=new T.Vector3();if(!rc.ray.intersectPlane(grab.plane,q))return;var d=q.sub(grab.p0),L=grab.list;
 for(var k=0;k<L.length;k+=3){var j=L[k]*3,w=L[k+1],sx=L[k+2];SD[j]=grab.sd0[j]+d.x*w*sx;SD[j+1]=grab.sd0[j+1]+d.y*w;SD[j+2]=grab.sd0[j+2]+d.z*w}defDirty=true}
function sculptHover(h){if(!h){ring.visible=false;return}ring.visible=true;ring.position.copy(h.p).addScaledVector(h.n,0.01);ring.lookAt(h.p.clone().add(h.n));ring.scale.setScalar(BR.r)}

/* ================= orbit camera / input ================= */
var tgt=new T.Vector3(0,2.8,-0.2),th=0.55,ph=1.42,dist=9.5,d0={th:th,ph:ph,dist:dist,t:tgt.clone()},camGoal=null;
function place(){cam.position.set(tgt.x+dist*Math.sin(ph)*Math.sin(th),tgt.y+dist*Math.cos(ph),tgt.z+dist*Math.sin(ph)*Math.cos(th));cam.lookAt(tgt)}
var CAMS={front:['Front','أمامي',0,1.48,9.5],q34:['¾','¾',0.75,1.45,9.5],side:['Profile','جانبي',1.57,1.48,9.5],back:['Back','خلفي',3.14159,1.45,9.5],top:['Top','علوي',0.4,0.45,9.5],close:['Close-up','قريب',0.3,1.45,5.2]};
function goCam(k){var c=CAMS[k];var d=c[2]-th;d=Math.atan2(Math.sin(d),Math.cos(d));camGoal={th:th+d,ph:c[3],dist:c[4],t:k==='close'?new T.Vector3(0,2.75,0.5):d0.t.clone()}}
var pts={},lastD=0,rc=new T.Raycaster();
function hit(e){var r=cv.getBoundingClientRect();rc.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1),cam);var h=rc.intersectObject(skin)[0];if(!h)return null;var n=h.face.normal.clone();if(n.dot(rc.ray.direction)>0)n.negate();return{p:h.point.clone(),n:n}}
function hover(e,cut){var h=hit(e);if(!h){if(!cut)clip.visible=false;return}if(cut&&lnS){setPose(h.p,h.n);lnPrevSet(lnS.p,h.p);return}setPose(h.p,h.n);
 if(cut){var cap=+$('gd').value,from=lastPt||h.p,d=from.distanceTo(h.p),rad=S.barb.tool==='line'?S.barb.lw:+$('bw').value*(S.barb.tool==='razor'?0.7:1),steps=Math.max(1,Math.ceil(d/(rad*0.4)));var fxv=h.p.clone().sub(from);fxv.addScaledVector(h.n,-fxv.dot(h.n));var fxo=fxv.lengthSq()>1e-8?fxv.normalize():lastFx;if(fxo){lastFx=fxo;setPose(h.p,h.n,fxo.clone().negate())}
  for(var s=1;s<=steps;s++)doCut(from.clone().lerp(h.p,s/steps),h.n,cap,fxo);lastPt=h.p;startBuzz()}else lastPt=null}
function sculptMove(e){var h=hit(e);sculptHover(h);if(!sculpting||!h)return;if(BR.t==='grab'&&!brushMod.smooth)return;var from=lastSc||h.p,d=from.distanceTo(h.p),steps=Math.max(1,Math.min(12,Math.ceil(d/(BR.r*0.3))));for(var s=1;s<=steps;s++)brushAt(from.clone().lerp(h.p,s/steps),h.n,true);lastSc=h.p}
st.addEventListener('contextmenu',function(e){e.preventDefault()});
st.addEventListener('pointerdown',function(e){if(e.target!==cv)return;st.setPointerCapture(e.pointerId);pts[e.pointerId]={x:e.clientX,y:e.clientY,b:e.button};camGoal=null;brushMod.inv=e.ctrlKey||e.altKey||e.metaKey;brushMod.smooth=e.shiftKey;
 if(mode==='clip'&&e.button===0&&!auto&&Object.keys(pts).length===1){cutting=true;lastPt=null;lastFx=null;if(S.barb.tool==='line'&&S.barb.straight){var h0=hit(e);if(h0){lnS={x:e.clientX,y:e.clientY,p:h0.p};setPose(h0.p,h0.n)}else cutting=false}else hover(e,true)}
 else if(mode==='sculpt'&&e.button===0&&Object.keys(pts).length===1){var h=hit(e);if(h){sculpting=true;lastSc=null;if(BR.t==='grab'&&!brushMod.smooth)grabStart(h);else sculptMove(e)}}
 else if(mode==='comb'&&e.button===0&&Object.keys(pts).length===1){var hc=hit(e);if(hc){combing=true;lastCb=hc.p;combPose(hc)}}
 else if(mode==='groom'&&e.button===0&&Object.keys(pts).length===1){var hg=hit(e);if(hg){grooming=true;lastGr=hg.p;groomAt(hg.p,null)}}
 else if(mode==='tieplace'&&e.button===0){var ht=hit(e);if(ht){var uq=ht.p.clone().sub(HC).divide(HR).normalize();S.tie.u=[uq.x,uq.y,uq.z];if(S.tie.mode==='none')S.tie.mode='pony';updTie('u');syncUI();commit();setMode('groom')}}});
function up(e){delete pts[e.pointerId];lastD=0;if(cutting){cutting=false;lastPt=null;if(lnS){lnFinish(e);lnS=null;lnPrev.visible=false}if(!auto)stopBuzz();commit()}if(sculpting){sculpting=false;grab=null;lastSc=null;commit()}if(combing){combing=false;lastCb=null;commit()}if(grooming){grooming=false;lastGr=null;commit()}}
st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
st.addEventListener('pointerleave',function(){ring.visible=false;combM.visible=false});
st.addEventListener('pointermove',function(e){var r0=cv.getBoundingClientRect();mouseN.set((e.clientX-r0.left)/r0.width*2-1,-((e.clientY-r0.top)/r0.height)*2+1);
 var p=pts[e.pointerId],ids=Object.keys(pts);
 if(mode==='clip'&&!auto&&ids.length<2)hover(e,cutting&&!!p&&p.b===0);
 if(mode==='sculpt'&&ids.length<2){brushMod.inv=e.ctrlKey||e.altKey||e.metaKey;brushMod.smooth=e.shiftKey;if(grab&&sculpting)grabMove(e);else sculptMove(e)}
 if(mode==='comb'&&ids.length<2)combMove(e);
 if(mode==='groom'&&ids.length<2)groomMove(e);
 if(!p)return;if((mode==='clip'&&p.b===0||sculpting||combing||grooming)&&ids.length<2)return;
 var dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
 if(ids.length===2){cutting=false;sculpting=false;combing=false;grooming=false;var a1=pts[ids[0]],b1=pts[ids[1]],dd=Math.hypot(a1.x-b1.x,a1.y-b1.y);if(lastD)dist=clamp(dist*lastD/dd,3,30);lastD=dd}
 else if((p.b===2&&mode==='orb')||p.b===1||e.shiftKey){var s=dist*0.0016,r=new T.Vector3().setFromMatrixColumn(cam.matrix,0),u=new T.Vector3().setFromMatrixColumn(cam.matrix,1);tgt.addScaledVector(r,-dx*s).addScaledVector(u,dy*s)}
 else{th-=dx*0.007;ph=clamp(ph-dy*0.007,0.15,3);ox+=dx;oy+=dy}place()});
st.addEventListener('wheel',function(e){e.preventDefault();camGoal=null;dist=clamp(dist*Math.exp(e.deltaY*0.001),3,30);place()},{passive:false});
function size(){var w=st.clientWidth,h=st.clientHeight;ren.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}
addEventListener('resize',size);
var HINTS={orb:['Drag to orbit · right-drag or Shift-drag to pan · scroll or pinch to zoom','اسحب للدوران · اسحب بالزر الأيمن أو مع Shift للتحريك · مرّر أو اقرص للتكبير'],
 sculpt:['Drag on the face to sculpt · Shift = smooth · Ctrl/Alt = invert · [ ] brush size · drag empty space to orbit','اسحب على الوجه للنحت · Shift = تنعيم · Ctrl/Alt = عكس · [ ] حجم الفرشاة · اسحب في الفراغ للدوران'],
 clip:['Hold and drag on the head to cut · right-drag to orbit · keys 1–6 select guard','اضغط واسحب على الرأس للقص · اسحب بالزر الأيمن للدوران · المفاتيح 1–6 لاختيار المشط'],
 comb:['Drag over the hair to comb it · teeth, finish and direction in Groom › Physical comb · right-drag to orbit','اسحب فوق الشعر لتسريحه · الأسنان واللمسة والاتجاه في التصفيف › المشط الفيزيائي · اسحب بالزر الأيمن للدوران'],
 groom:['Paint on the scalp · Ctrl/Alt = invert · [ ] brush size · right-drag to orbit','ارسم على فروة الرأس · Ctrl/Alt = عكس · [ ] حجم الفرشاة · اسحب بالزر الأيمن للدوران'],
 tieplace:['Click on the head where the hair tie goes','انقر على الرأس في مكان ربطة الشعر']};
function setMode(m){mode=m;$('tOrb').classList.toggle('on',m==='orb');$('tSculpt').classList.toggle('on',m==='sculpt');$('tClip').classList.toggle('on',m==='clip');$('tComb').classList.toggle('on',m==='comb');$('tGroom').classList.toggle('on',m==='groom');if(typeof grmViz==='function')grmViz();
 if(m!=='clip'&&!auto&&!cm)clip.visible=false;if(m!=='sculpt'&&m!=='comb'&&m!=='groom')ring.visible=false;if(m!=='comb'){combM.visible=false;combing=false}st.style.cursor=m==='orb'?'grab':'crosshair';var h=HINTS[m];$('hint').textContent=tx(h[0],h[1])}

/* ================= undo / redo ================= */
var UND=[],RED=[],last=null,restoring=false;
function snap(){return{s:JSON.stringify(S),sd:SD.slice(),cs:LY.scalp.H.n?LY.scalp.H.CAP.slice(0,LY.scalp.H.n):null,cb:LY.beard.H.n?LY.beard.H.CAP.slice(0,LY.beard.H.n):null,gm:GRM&&GRM.mod?grmGet():null,lv:LEVEL}}
function commit(){if(restoring||!ready)return;if(last)UND.push(last);if(UND.length>40)UND.shift();RED.length=0;last=snap();updUR()}
function updUR(){$('undo').disabled=!UND.length;$('redo').disabled=!RED.length}
function restore(sn){restoring=true;var old=JSON.parse(JSON.stringify(S)),nw=JSON.parse(sn.s);for(var k in nw)S[k]=nw[k];cur=S.hair;
 if(sn.lv!==LEVEL){setupMesh(sn.lv);buildAll()}else{
  if(JSON.stringify(old.hair)!==JSON.stringify(S.hair))buildScalp();
  if(JSON.stringify(old.brow)!==JSON.stringify(S.brow))buildBrow();
  if(JSON.stringify(old.beard)!==JSON.stringify(S.beard))buildBeard();
  if(JSON.stringify(old.lash)!==JSON.stringify(S.lash))buildLash()}
 if(sn.sd&&sn.sd.length===SD.length)SD.set(sn.sd);
 [[LY.scalp,sn.cs],[LY.beard,sn.cb]].forEach(function(q){var L=q[0],c=q[1],H=L.H;if(!H.n)return;H.CAP.fill(9);if(c&&c.length===H.n)H.CAP.set(c);for(var i=0;i<H.n;i++)H.MISC[i*4]=H.DH[i]?0:Math.min(H.L0[i],H.CAP[i]);L.dirty=true});
 if(sn.gm)grmSet(sn.gm);else grmReset();applyGroomAll();
 refreshAll();restoring=false}
function undo(){if(!UND.length)return;RED.push(last);last=UND.pop();restore(last);updUR()}
function redo(){if(!RED.length)return;UND.push(last);last=RED.pop();restore(last);updUR()}
function refreshAll(){shortDirty=true;updEar();updTie();updSkinU();updEyeMats();updHairCols();updHairMat();updPhys();applyLight();applyView();paintDirty=true;defDirty=true;syncUI();stats0()}

/* ================= save / load / export ================= */
function b64(ta){var u=new Uint8Array(ta.buffer,ta.byteOffset,ta.byteLength),s='';for(var i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)}
function unb64(s,Ty){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new Ty(u.buffer)}
function note(m){$('st').textContent=m}
async function download(blob,name){var dl=null;try{dl=window.claude&&await window.claude.use('downloads')}catch(e){}
 if(dl){try{await dl.save({filename:name,data:blob});return'ok'}catch(e){return e&&e.code==='declined'?'cancel':'fail'}}
 try{var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},2000);return'ok'}catch(e){return'fail'}}
function dlNote(r){note(r==='ok'?tx('Saved.','تم الحفظ.'):r==='cancel'?tx('Save cancelled.','تم إلغاء الحفظ.'):tx('Saving isn’t available here. Right-click the 3D view and choose Save image as.','الحفظ غير متاح هنا. انقر بزر الفأرة الأيمن على العرض واختر حفظ الصورة.'))}
async function savePNG(){note('');var sc=+$('pngS').value||1,trans=$('pngT').checked,pb=scene.background,pr=ren.getPixelRatio();if(trans)scene.background=null;ring.visible=false;
 ren.setPixelRatio(Math.min(pr*sc,8192/Math.max(st.clientWidth,st.clientHeight)));size();updHairLight();ren.render(scene,cam);
 var blob=await new Promise(function(r){cv.toBlob(r,'image/png')});ren.setPixelRatio(pr);scene.background=pb;size();dlNote(await download(blob,'headforge-'+Date.now()+'.png'))}
function saveJSON(){var o={app:'HeadForge Studio Pro',v:1,level:LEVEL,S:S};var any=false;for(var i=0;i<SD.length;i++)if(SD[i]){any=true;break}if(any)o.sd=b64(SD);
 [['cs',LY.scalp],['cb',LY.beard]].forEach(function(q){var H=q[1].H;if(H.n&&H.CAP.slice(0,H.n).some(function(c){return c<9}))o[q[0]]=b64(H.CAP.slice(0,H.n))});
 if(GRM&&GRM.mod){var gg=grmGet();o.gm={};for(var kg in gg)o.gm[kg]=b64(gg[kg])}
 download(new Blob([JSON.stringify(o)],{type:'application/json'}),'headforge-character.json').then(dlNote)}
function loadJSON(txt){try{var o=JSON.parse(txt);if(!o||!o.S)throw 0;var sn={s:JSON.stringify(Object.assign(JSON.parse(JSON.stringify(S)),o.S)),lv:o.level||LEVEL,sd:o.sd?unb64(o.sd,Float32Array):new Float32Array(SD.length),cs:o.cs?unb64(o.cs,Float32Array):null,cb:o.cb?unb64(o.cb,Float32Array):null,gm:o.gm?(function(){var r={};for(var kg in o.gm)r[kg]=unb64(o.gm[kg],Float32Array);return r})():null};
  var forceRebuild=sn.lv===LEVEL;if(forceRebuild){S.hair={};S.brow={};S.beard={};S.lash={}}if(sn.lv!==LEVEL){SD=new Float32Array(0)}restore(sn);if(sn.sd.length===SD.length)SD.set(sn.sd);defDirty=true;commit();toast(tx('Character loaded','تم تحميل الشخصية'))}catch(e){toast(tx('Could not read that file','تعذّرت قراءة الملف'),true)}}
function bake(L,frac){var H=L.H,U=L.U,n=H.n;if(!n||!L.obj)return null;var step=Math.max(1,Math.round(1/frac)),segs=H.segs,cnt=Math.ceil(n/step),pos=new Float32Array(cnt*(segs+1)*3),cl=new Float32Array(cnt*(segs+1)*3),q=0,hc=U.uHair.value,tc=U.uTip.value;
 var GRM=L===LY.scalp&&PH.gAny&&PH.g&&PH.G?1-Math.min(0.7,(cur.freq||0)*0.06):0,FLW=U.uFlow.value>0.5,FP=[0,0,0],clA=U.uClumpA.value,bend=U.uBend.value,curl=U.uCurl.value,sag=U.uSag.value,coil=U.uCoil.value,freq=U.uFreq.value,wa=U.uWaveA.value,wf=U.uWaveF.value,lock=U.uLock.value;
 for(var i=0;i<n;i+=step){var j=i*3,Ln=H.MISC[i*4],rx=H.RT[j],ry=H.RT[j+1],rz=H.RT[j+2],dx=H.DIR[j],dy=H.DIR[j+1],dz=H.DIR[j+2],nx=H.NRM[j],ny=H.NRM[j+1],nz=H.NRM[j+2],va=H.VAR[i],c4=i*4;
  var dn=dx*nx+dy*ny+dz*nz,tx0=dx-nx*dn,ty0=dy-ny*dn,tz0=dz-nz*dn,tl=Math.hypot(tx0,ty0,tz0);if(tl>1e-3){tx0/=tl;ty0/=tl;tz0/=tl}else{tx0=dx;ty0=dy;tz0=dz}
  var cu=new T.Vector3(),ax=new T.Vector3(dx,dy,dz);cu.crossVectors(ax,Math.abs(dy)<0.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0)).normalize();var cw=new T.Vector3().crossVectors(ax,cu);
  var sd=new T.Vector3().crossVectors(ax,new T.Vector3(0,1,0)).add(new T.Vector3(1e-4,0,0)).normalize(),sd2=new T.Vector3().crossVectors(ax,sd);if(FLW){sd.crossVectors(new T.Vector3(nx,ny,nz),ax).add(new T.Vector3(1e-4,0,0)).normalize();sd2.set(nx,ny,nz).multiplyScalar(0.2)}
  for(var s=0;s<=segs;s++){var t=s/segs,px,py,pz;
   if(FLW){flowJS(H,U,i,t*Ln,FP);px=FP[0];py=FP[1];pz=FP[2]}else{px=rx+(dx*t+(tx0-dx)*bend*t*t)*Ln;py=ry+(dy*t+(ty0-dy)*bend*t*t)*Ln-sag*Ln*Ln*t*t;pz=rz+(dz*t+(tz0-dz)*bend*t*t)*Ln}
   if(Ln<U.uHide.value)break;var cwt=clA*sm((t-0.15)/0.85)*sm((Ln-0.05)/0.35);if(FLW){var cq=curl*Ln*0.3*t*t,m2=H.MISC[c4+2]*0.7,m3=Math.abs(H.MISC[c4+3])*0.2;px+=(sd.x*m2+nx*m3)*cq+H.CC[j]*cwt;py+=(sd.y*m2+ny*m3)*cq+H.CC[j+1]*cwt;pz+=(sd.z*m2+nz*m3)*cq+H.CC[j+2]*cwt}else{px+=H.MISC[c4+2]*curl*Ln*0.3*t*t+H.CC[j]*cwt;py+=H.CC[j+1]*cwt;pz+=H.MISC[c4+3]*curl*Ln*0.3*t*t+H.CC[j+2]*cwt}
   if(coil>0){var ph0=va*40,ph2=ph0+t*Ln*freq*6.2831,rd=coil*(0.7+0.6*((va*13.7)%1)),a1=Math.cos(ph2)-Math.cos(ph0),a2=Math.sin(ph2)-Math.sin(ph0);px+=(cu.x*a1+cw.x*a2)*rd;py+=(cu.y*a1+cw.y*a2)*rd;pz+=(cu.z*a1+cw.z*a2)*rd}
   var wv=Math.sin(t*Ln*wf*6.2831+H.CL[c4])*wa*H.CL[c4+3]*sm(t/0.2),lk=lock*Ln*t*t;px+=sd.x*wv+(sd.x*H.CL[c4+1]+sd2.x*H.CL[c4+2])*lk;py+=sd.y*wv+(sd.y*H.CL[c4+1]+sd2.y*H.CL[c4+2])*lk;pz+=sd.z*wv+(sd.z*H.CL[c4+1]+sd2.z*H.CL[c4+2])*lk;
   var m=sm((t-0.15)/0.85)*0.7,b=va*(1-0.6*sm((t-0.75)/0.25));if(GRM){var gq=H.MISC[c4+1]*6,bw=Math.min(Ln,1.2)*sm((Ln-0.04)/0.36)*GRM,w1=6.75*t*t*(1-t)*bw,w2=t*t*t*bw;px+=PH.g[gq]*w1+PH.g[gq+3]*w2;py+=PH.g[gq+1]*w1+PH.g[gq+4]*w2;pz+=PH.g[gq+2]*w1+PH.g[gq+5]*w2}
        pos[q*3]=px;pos[q*3+1]=py;pos[q*3+2]=pz;var ta=H.TN[c4+3];cl[q*3]=Math.min(1,((hc.r+(tc.r-hc.r)*m)*(1-ta)+H.TN[c4])*b);cl[q*3+1]=Math.min(1,((hc.g+(tc.g-hc.g)*m)*(1-ta)+H.TN[c4+1])*b);cl[q*3+2]=Math.min(1,((hc.b+(tc.b-hc.b)*m)*(1-ta)+H.TN[c4+2])*b);q++}}
 return{pos:pos,col:cl,segs:segs,cnt:cnt}}
function exportOBJ(){var inc=$('oHair').checked,fr=(+$('oDen').value)/100,o=['# HeadForge Studio Pro export','o Head'],pa=P.array,na=N.array,ca=g.attributes.color.array,i,f=function(x){return x.toFixed(5)};
 for(i=0;i<NV;i++)o.push('v '+f(pa[i*3])+' '+f(pa[i*3+1])+' '+f(pa[i*3+2])+' '+ca[i*3].toFixed(3)+' '+ca[i*3+1].toFixed(3)+' '+ca[i*3+2].toFixed(3));
 for(i=0;i<NV;i++)o.push('vn '+f(na[i*3])+' '+f(na[i*3+1])+' '+f(na[i*3+2]));
 for(i=0;i<NT;i++){var a=IX[i*3]+1,b=IX[i*3+1]+1,c=IX[i*3+2]+1;o.push('f '+a+'//'+a+' '+b+'//'+b+' '+c+'//'+c)}
 var base=NV;if(inc)for(var n in LY){var B=bake(LY[n],fr);if(!B)continue;o.push('o Hair_'+n);var nv=B.pos.length/3;for(i=0;i<nv;i++)o.push('v '+f(B.pos[i*3])+' '+f(B.pos[i*3+1])+' '+f(B.pos[i*3+2])+' '+B.col[i*3].toFixed(3)+' '+B.col[i*3+1].toFixed(3)+' '+B.col[i*3+2].toFixed(3));
  for(var s=0;s<B.cnt;s++){var l='l';for(var k=0;k<=B.segs;k++)l+=' '+(base+s*(B.segs+1)+k+1);o.push(l)}base+=nv}
 download(new Blob([o.join('\n')],{type:'text/plain'}),'headforge.obj').then(dlNote)}
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
async function exportGLB(){note(tx('Preparing GLB…','جارٍ تجهيز GLB…'));try{if(!T.GLTFExporter)await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js')}catch(e){note(tx('Could not load the GLB exporter (offline?). Try OBJ instead.','تعذّر تحميل مُصدِّر GLB (لا يوجد اتصال؟). جرّب OBJ.'));return}
 var root=new T.Group();root.name='HeadForge';var hg=new T.BufferGeometry();hg.setAttribute('position',P.clone());hg.setAttribute('normal',N.clone());hg.setAttribute('color',g.attributes.color.clone());hg.setIndex(g.index.clone());
 var head=new T.Mesh(hg,new T.MeshStandardMaterial({vertexColors:true,roughness:S.skin.rough}));head.name='Head';root.add(head);
 eyes.forEach(function(e,i){var c=e.g.clone();c.name='Eye_'+(i?'R':'L');root.add(c)});var mc=mouthG.clone();mc.name='Mouth';root.add(mc);
 var fr=(+$('oDen').value)/100;if($('oHair').checked)for(var n in LY){var B=bake(LY[n],fr);if(!B)continue;var lg=new T.BufferGeometry();lg.setAttribute('position',new T.BufferAttribute(B.pos,3));lg.setAttribute('color',new T.BufferAttribute(B.col,3));var ix=[];for(var s=0;s<B.cnt;s++)for(var k=0;k<B.segs;k++){var b0=s*(B.segs+1)+k;ix.push(b0,b0+1)}lg.setIndex(ix);var ls=new T.LineSegments(lg,new T.LineBasicMaterial({vertexColors:true}));ls.name='Hair_'+n;root.add(ls)}
 new T.GLTFExporter().parse(root,function(buf){download(new Blob([buf],{type:'model/gltf-binary'}),'headforge.glb').then(dlNote)},{binary:true})}

/* ================= animation preview ================= */
var ANIM={mode:'none',t:0};
var EMOSEQ=['happy','surprise','angry','sad','disgust','neutral'];
function animStep(dt){if(ANIM.mode==='none'){if(animExpr){animExpr=null;defDirty=true}return}ANIM.t+=dt;var t=ANIM.t,e={},k;for(k in S.expr)e[k]=S.expr[k];function ad(k,v){e[k]=clamp((e[k]||0)+v,-1,1)}
 if(ANIM.mode==='idle'){ad('browUp',0.12*Math.max(0,Math.sin(t*0.7)*Math.sin(t*0.23)));ad('smile',0.15*(0.5+0.5*Math.sin(t*0.31)));ad('jaw',0.03*(0.5+0.5*Math.sin(t*1.1)))}
 else if(ANIM.mode==='talk'){ad('jaw',0.4*Math.abs(Math.sin(t*9)*Math.sin(t*2.3+1)));ad('pucker',0.3*Math.max(0,Math.sin(t*4.1)));ad('browUp',0.18*Math.max(0,Math.sin(t*1.3)));ad('smile',0.12*Math.max(0,Math.sin(t*0.6)))}
 else if(ANIM.mode==='emo'){var per=2.4,i=Math.floor(t/per)%EMOSEQ.length,f=sm((t%per)/0.8),A=EMO[EMOSEQ[(i+EMOSEQ.length-1)%EMOSEQ.length]][2],B=EMO[EMOSEQ[i]][2];EXPR.forEach(function(x){var id=x[0];ad(id,(A[id]||0)*(1-f)+(B[id]||0)*f)})}
 animExpr=e;defDirty=true}

/* ================= UI ================= */
function R_(p,en,ar,mn,mx,stp,dz){return'<div class="row"><label for="'+p+'">'+sp(en,ar)+'<b data-out="'+p+'"></b></label><input type="range" id="'+p+'" data-path="'+p+'" min="'+mn+'" max="'+mx+'" step="'+stp+'"'+(dz!==undefined?' data-dz="'+dz+'"':'')+'></div>'}
function C_(p,en,ar){return'<div><label>'+sp(en,ar)+'</label><input type="color" data-path="'+p+'"></div>'}
function K_(p,en,ar){return'<label class="chk"><input type="checkbox" data-path="'+p+'"> '+sp(en,ar)+'</label>'}
function Sel_(p,en,ar,os){return'<div class="row"><label>'+sp(en,ar)+'</label><select data-path="'+p+'">'+os.map(function(o){return opt(o[0],o[1],o[2])}).join('')+'</select></div>'}
function Ch_(p,os){return'<div class="chips">'+os.map(function(o){return'<button data-set="'+p+'" data-v="'+o[0]+'">'+sp(o[1],o[2])+'</button>'}).join('')+'</div>'}
function Sec_(en,ar,body,open){return'<details class="sec"'+(open?' open':'')+'><summary>'+sp(en,ar)+'</summary><div class="secb">'+body+'</div></details>'}
function Btn_(id,en,ar,cls){return'<button id="'+id+'"'+(cls?' class="'+cls+'"':'')+'>'+sp(en,ar)+'</button>'}
function Head_(en,ar,den,dar){return'<h2>'+sp(en,ar)+'</h2><p class="desc">'+sp(den,dar)+'</p>'}
var TABS=[['blend','◎','Blend','مزج'],['face','☺','Face','الوجه'],['sculpt','✦','Sculpt','نحت'],['skin','◍','Skin','البشرة'],['eyes','◉','Eyes','العيون'],['makeup','✿','Makeup','مكياج'],['hair','≋','Hair','الشعر'],['groom','✎','Groom','تصفيف'],['beard','⌇','Facial hair','شعر الوجه'],['barber','✂','Barber','الحلاقة'],['anim','◠','Expressions','التعابير'],['light','☀','Lighting','الإضاءة'],['export','⇩','Export','تصدير']];
var TONES=[['Fair','فاتح',0.12],['Light','فاتح متوسط',0.3],['Medium','متوسط',0.5],['Tan','حنطي',0.64],['Brown','أسمر',0.8],['Deep','داكن',0.95]];
var HCOL=[['#0d0907','#241a14','Black','أسود'],['#2a1b11','#6f573f','Dark brown','بني داكن'],['#4a3220','#93714d','Brown','بني'],['#6b3a1e','#a8643a','Auburn','كستنائي'],['#8a3b12','#c7652b','Ginger','أحمر'],['#8a6a3a','#d1b07a','Blonde','أشقر'],['#c9b48a','#efe2c4','Platinum','بلاتيني'],['#8c8a86','#d6d4d0','Grey','رمادي']];
var ICOL=[['#5b3a24','Brown','بني'],['#2a1810','Dark brown','بني داكن'],['#7a5a2a','Hazel','عسلي'],['#4f7a3a','Green','أخضر'],['#3f6f9f','Blue','أزرق'],['#7f8a90','Grey','رمادي'],['#a8701e','Amber','كهرماني']];
function buildUI(){
 $('rail').innerHTML=TABS.map(function(t){return'<button data-tab="'+t[0]+'"><i>'+t[1]+'</i>'+sp(t[2],t[3])+'</button>'}).join('');
 var B={};
 B.blend=Head_('Face blend','مزج الوجوه','Drag the handle between archetypes to mix a new face, then fine-tune it in Face or Sculpt.','اسحب المؤشر بين الأنماط لمزج وجه جديد، ثم عدّل التفاصيل من تبويب الوجه أو النحت.')+
  '<canvas id="wheel" width="290" height="290"></canvas><div class="chips">'+BP.map(function(b,i){return'<button data-bp="'+i+'">'+sp(b.en,b.ar)+'</button>'}).join('')+'</div>'+
  '<div class="two">'+Btn_('bNeutral','Neutral face','وجه محايد')+Btn_('bRandF','Random face','وجه عشوائي')+'</div>'+Btn_('rndAll','Randomize whole character','شخصية عشوائية بالكامل','p')+
  '<p class="desc" style="margin-top:10px">'+sp('Everything stays editable: blend, sliders, sculpt layers, skin and grooms are all non-destructive and undoable.','كل شيء يبقى قابلاً للتعديل: المزج والمنزلقات وطبقات النحت والبشرة والشعر غير مدمّرة ويمكن التراجع عنها.')+'</p>';
 var fs=R_('skin.age','Age','العمر',0,1,0.01,0);Object.keys(SECS).forEach(function(s,i){fs+=Sec_(SECS[s][0],SECS[s][1],MD.filter(function(m){return m[1]===s}).map(function(m){return R_('shape.'+m[0],m[2],m[3],-1,1,0.01,0)}).join(''),i<3)});
 B.face=Head_('Face shaping','تشكيل الوجه','Symmetric region controls. Double-click any slider to reset it.','عناصر تحكم متماثلة لكل منطقة. انقر نقراً مزدوجاً على أي منزلق لإعادته.')+fs+Btn_('resetShape','Reset all face shaping','إعادة ضبط تشكيل الوجه');
 B.sculpt=Head_('Free sculpt','النحت الحر','Paint shape directly onto the mesh. Hair, brows, lashes and eyes follow the surface automatically.','ارسم الشكل مباشرة على المجسم. يتبع الشعر والحواجب والرموش والعيون السطح تلقائياً.')+
  Ch_('brush.t',[['draw','Draw','رسم'],['inflate','Inflate','نفخ'],['grab','Grab','سحب'],['smooth','Smooth','تنعيم'],['flatten','Flatten','تسطيح'],['restore','Restore','استعادة']])+
  R_('brush.r','Radius','نصف القطر',0.05,0.8,0.01)+R_('brush.s','Strength','القوة',0.05,1,0.01)+K_('brush.sym','X symmetry','تماثل على المحور X')+K_('brush.inv','Invert (push in)','عكس (دفع للداخل)')+
  Btn_('clearSD','Clear sculpt layer','مسح طبقة النحت')+'<p class="desc" style="margin-top:10px">'+sp('Shift = smooth · Ctrl/Alt = invert · [ and ] change the brush size.','Shift = تنعيم · Ctrl/Alt = عكس · [ و ] لتغيير حجم الفرشاة.')+'</p>';
 B.skin=Head_('Skin','البشرة','Pick a tone on the melanin × undertone map, then layer age, pores, freckles and lighting response.','اختر اللون من خريطة الميلانين × الدرجة التحتية، ثم أضف العمر والمسام والنمش واستجابة الإضاءة.')+
  '<canvas id="pal" width="300" height="120"></canvas><div class="chips">'+TONES.map(function(t){return'<button data-tone="'+t[2]+'">'+sp(t[0],t[1])+'</button>'}).join('')+'</div>'+
  '<div class="cols">'+C_('skin.custom','Exact color','لون مخصص')+'</div>'+R_('skin.age','Age','العمر',0,1,0.01,0)+R_('skin.rough','Roughness','الخشونة',0.25,0.9,0.01)+R_('skin.bump','Pore detail','تفاصيل المسام',0,2,0.05)+R_('skin.freck','Freckles','النمش',0,1,0.02)+R_('skin.under','Under-eye darkness','الهالات تحت العين',0,1,0.02)+R_('skin.oil','Oily shine','لمعان دهني',0,1,0.05)+R_('skin.sss','Subsurface scattering','التشتت تحت السطح',0,1.5,0.05)+R_('skin.trn','Ear / nose translucency','شفافية الأذن والأنف',0,1.5,0.05)+R_('skin.flush','Redness / blood flow','الاحمرار / تدفق الدم',0,1,0.02)+R_('skin.blotch','Tone variation (blotches)','تفاوت اللون (بقع)',0,1,0.02)+R_('skin.micro','Micro detail (fine lines)','التفاصيل الدقيقة (خطوط ناعمة)',0,2,0.05)+R_('skin.fuzz','Peach fuzz (vellus)','الزغب الناعم',0,1,0.02)+'<div class="desc" style="margin-top:6px">'+sp('AAA skin presets','إعدادات بشرة جاهزة')+'</div><div class="chips">'+[['weathered','Weathered (photo)','خشنة (الصورة)'],['young','Young & fresh','شابة ونضرة'],['aged','Aged','متقدّمة في العمر'],['oily','Oily / sweaty','دهنية / متعرّقة']].map(function(p){return'<button data-skp="'+p[0]+'">'+sp(p[1],p[2])+'</button>'}).join('')+'</div>';
 B.eyes=Head_('Eyes','العيون','Procedural irises with fibers, crypts and limbal ring. Lashes are real strands.','قزحيات إجرائية بألياف وتجاويف وحلقة حوفية. الرموش خصلات حقيقية.')+
  '<div class="sw" id="isw">'+ICOL.map(function(c){return'<button data-iris="'+c[0]+'" style="background:'+c[0]+'" data-ten="'+c[1]+'" data-tar="'+c[2]+'"></button>'}).join('')+'</div>'+
  '<div class="cols">'+C_('eyes.c','Iris','القزحية')+C_('eyes.c2','Right iris','القزحية اليمنى')+C_('eyes.sclera','Sclera','بياض العين')+'</div>'+K_('eyes.het','Heterochromia (different right eye)','تغاير لون العينين')+
  R_('eyes.limbal','Limbal ring','الحلقة الحوفية',0,1,0.02)+R_('eyes.pupil','Pupil size','حجم البؤبؤ',0.5,1.8,0.02)+R_('eyes.size','Eyeball size','حجم مقلة العين',0.8,1.25,0.01)+R_('eyes.red','Redness','احمرار',0,1,0.02)+
  Sel_('eyes.gaze','Gaze','اتجاه النظر',[['auto','Auto (camera / clipper)','تلقائي (الكاميرا / الماكينة)'],['cam','Look at camera','النظر إلى الكاميرا'],['cursor','Follow cursor','تتبع المؤشر'],['fwd','Straight ahead','إلى الأمام']])+
  Sec_('Eyelashes','الرموش',K_('lash.on','Show eyelashes','إظهار الرموش')+R_('lash.len','Length','الطول',0.4,1.8,0.02)+'<div class="cols">'+C_('lash.c','Color','اللون')+'</div>',true);
 B.makeup=Head_('Makeup','المكياج','Layered on top of the skin and saved with the character.','طبقات فوق البشرة وتُحفظ مع الشخصية.')+
  Sec_('Lips','الشفاه','<div class="cols">'+C_('makeup.lipC','Lipstick','أحمر الشفاه')+'</div>'+R_('makeup.lip','Amount','الكمية',0,1,0.02,0)+R_('makeup.gloss','Gloss','اللمعان',0,1,0.02,0),true)+
  Sec_('Cheeks','الخدود','<div class="cols">'+C_('makeup.blushC','Blush','أحمر الخدود')+'</div>'+R_('makeup.blush','Amount','الكمية',0,1,0.02,0),true)+
  Sec_('Eyes','العيون','<div class="cols">'+C_('makeup.shadowC','Eyeshadow','ظل العيون')+'</div>'+R_('makeup.shadow','Eyeshadow','ظل العيون',0,1,0.02,0)+R_('makeup.liner','Eyeliner','كحل',0,1,0.02,0),true)+Btn_('noMakeup','Remove all makeup','إزالة كل المكياج');
 B.hair=Head_('Hair','الشعر','Up to 140k simulated strands. Styles, colors and physics update live.','حتى 140 ألف خصلة محاكاة. الأنماط والألوان والفيزياء تتحدث مباشرة.')+
  '<div class="row"><label for="pre">'+sp('Style','التسريحة')+'</label><select id="pre"><optgroup data-gen="Men" data-gar="رجالي">'+PRN.map(function(p){return opt(p[0],p[1],p[2])}).join('')+'</optgroup><optgroup data-gen="Women" data-gar="نسائي">'+PRW.map(function(p){return opt(p[0],p[1],p[2])}).join('')+'</optgroup></select></div>'+
  '<div class="sw">'+HCOL.map(function(c){return'<button data-hc="'+c[0]+','+c[1]+'" style="background:linear-gradient('+c[0]+','+c[1]+')" data-ten="'+c[2]+'" data-tar="'+c[3]+'"></button>'}).join('')+'</div>'+
  '<div class="cols">'+C_('hair.h','Root','الجذر')+C_('hair.t','Tips','الأطراف')+'</div>'+R_('hmat.grey','Grey hair','الشيب',0,1,0.02,0)+
  '<div class="two">'+Btn_('regrow2','Regrow','إعادة الإنبات')+Btn_('rd','New seed','بذرة جديدة')+'</div>'+K_('view.hair','Show hair','إظهار الشعر')+
  Sec_('Flow & volume','الانسياب والحجم',Sel_('hair.flow','Combing direction','اتجاه التسريح',[['crown','Natural crown whorl','دوّامة طبيعية من التاج'],['forward','Forward fringe','غرّة للأمام'],['back','Swept back','مسرّح للخلف'],['side','Side part','فرق جانبي'],['center','Center part (curtains)','فرق في المنتصف (ستارة)'],['up','Up & back (quiff / pompadour)','للأعلى والخلف (كويف / بومبادور)'],['legacy','Classic spiky (v2)','الشائك الكلاسيكي (v2)']])+
   R_('hair.part','Part position','موضع الفرق',-0.8,0.8,0.01)+R_('hair.vol','Volume','الحجم',0,0.4,0.005)+R_('hair.volF','Front lift (quiff)','رفعة الغرّة',0,0.6,0.01)+R_('hair.layer','Layering','الطبقات',0,1.5,0.02)+R_('hair.clump','Clumping','تجمّع الخصل',0,1,0.02)+R_('hair.oneLen','One-length cut','قصّة بطول موحّد',0,1,0.02)+R_('hair.lenVar','Length variation','تفاوت الأطوال',0,1,0.02)+R_('hair.drape','Drape onto nape','الانسدال على الرقبة',0,1.5,0.02)+Sel_('hair.bangs','Bangs','الغرّة',[['none','None','بدون'],['blunt','Blunt','مستقيمة'],['curtain','Curtain','ستارة'],['side','Side-swept','جانبية']])+R_('hair.bangLen','Bangs length','طول الغرّة',0.2,1.2,0.01)+Sel_('hair.ear','Hair at the ears','الشعر عند الأذن',[['behind','Tucked behind the ear','خلف الأذن'],['over','Covering the ear','يغطي الأذن']]),true)+
  Sec_('Ear detection & hair distribution','كشف الأذن وتوزيع الشعر','<p class="desc">'+sp('The ear is found on the mesh automatically and the hairline is cut around it. Yellow = detected ear, blue = clean outline, green = taper zone, red = sideburn and back hairline.','تُكتشف الأذن من المجسّم تلقائياً ويُقص خط الشعر حولها. الأصفر = الأذن المكتشفة، الأزرق = حدّ القص، الأخضر = منطقة التدريج، الأحمر = السالف وخط الشعر الخلفي.')+'</p><div class="two">'+Btn_('earDet','Detect ears','اكتشاف الأذن','p')+Btn_('earRst','Defaults','الافتراضي')+'</div>'+K_('ear.guides','Show ear guides','إظهار أدلة الأذن')+'<p class="note" id="earInfo"></p>'+R_('ear.margin','Clearance around the ear','المسافة حول الأذن',0,0.25,0.005)+R_('ear.taper','Taper width','عرض التدريج',0.1,1.6,0.02)+R_('ear.sb','Sideburn bottom (height)','نهاية السالف (الارتفاع)',1.9,2.9,0.01)+R_('ear.back','Back hairline: slope starts at','خط الشعر الخلفي: بداية الميل',1.8,2.8,0.01)+R_('ear.slope','Back hairline slope','ميل خط الشعر الخلفي',0,2,0.05),true)+
  Sec_('Shape','الشكل',SL.map(function(s){return R_('hair.'+s[0],s[1],s[2],s[3],s[4],s[5])}).join(''))+
  Sec_('Frizz, strays & clumps','التموّج العشوائي والشعيرات الشاردة والخصل',R_('hair.frizz','Frizz','التموّج العشوائي (فريز)',0,1,0.02,0)+R_('hair.stray','Stray hairs (fraction)','الشعيرات الشاردة (نسبة)',0,0.15,0.005)+R_('hair.csz','Clump size','حجم الخصلة',0.03,0.2,0.005))+
  Sec_('Highlights','الخصل الملوّنة',R_('hair.hl','Highlight sections','نسبة الخصل الفاتحة',0,0.8,0.02,0)+'<div class="cols">'+C_('hair.hlc','Highlight colour','لون الخصل')+'</div>')+
  Sec_('Physics (real time)','الفيزياء (لحظية)',K_('phys.on','Simulate hair','محاكاة الشعر')+R_('phys.k','Stiffness','الصلابة',40,400,5)+R_('phys.damp','Damping','التخميد',0.05,1,0.05)+R_('phys.grav','Gravity','الجاذبية',0,2,0.05)+R_('phys.wind','Wind','الرياح',0,1.5,0.05,0)+'<div class="two">'+Btn_('shk','Shake head','هزّ الرأس','p')+Btn_('stl','Settle','تهدئة')+'</div>')+
  Sec_('Material','المادة',R_('hmat.shine','Shine','اللمعان',0,2,0.05)+R_('hmat.gloss','Gloss (highlight tightness)','حدة البريق',0.4,2,0.05)+R_('hmat.trans','Backlight translucency','الشفافية مع الإضاءة الخلفية',0,2,0.05)+R_('hmat.soft','Strand softness (thin tips)','نعومة الخصلات (أطراف رفيعة)',0,1,0.02)+R_('hmat.shadow','Self-shadowing depth','عمق الظل الذاتي',0,2,0.05))+
  Sec_('Eyebrows','الحواجب',K_('brow.on','Strand eyebrows','حواجب بخصلات')+R_('brow.dens','Density','الكثافة',0.2,2,0.05)+R_('brow.len','Hair length','طول الشعر',0.4,2,0.05)+R_('brow.thick','Thickness','السماكة',0.4,2,0.05)+R_('brow.arch','Arch','التقوّس',-0.5,1.5,0.05)+K_('brow.link','Match hair color','مطابقة لون الشعر')+'<div class="cols">'+C_('brow.c','Brow color','لون الحاجب')+'</div>',true);
 B.beard=Head_('Facial hair','شعر الوجه','Beards are strand grooms bound to the face — the clipper trims them too.','اللحى خصلات مرتبطة بالوجه — ويمكن قصّها بالماكينة أيضاً.')+
  Ch_('beard.style',[['none','Clean','حليق'],['stubble','Stubble','لحية خفيفة'],['mustache','Mustache','شارب'],['goatee','Goatee','سكسوكة'],['boxed','Short boxed','لحية قصيرة'],['full','Full beard','لحية كاملة'],['long','Long beard','لحية طويلة']])+
  R_('beard.len','Length','الطول',0.3,2,0.05)+R_('beard.dens','Density','الكثافة',0.2,1.5,0.05)+R_('beard.stub','Stubble shadow','ظل اللحية',0,1,0.02,0)+K_('beard.link','Match hair color','مطابقة لون الشعر')+'<div class="cols">'+C_('beard.c','Beard color','لون اللحية')+'</div>';
 B.groom=Head_('Groom & hair ties','التصفيف وربط الشعر','Paint the hair like a groomer: length, density, flow, smooth/rough finish, sections, colour and the tie mask live on the scalp and survive restyles and haircuts.','ارسم الشعر كمصمّم محترف: الطول والكثافة والانسياب والنعومة والخشونة والخصل واللون وقناع الربط تُرسم على فروة الرأس وتبقى مع كل تعديل وقصة.')+
  Sec_('Hair painting brushes','فرش رسم الشعر',Btn_('grGo','Start painting (G)','ابدأ الرسم (G)','p')+'<div style="height:8px"></div>'+
   Sel_('groom.b','Brush','الفرشاة',[['dir','Direction (paint the flow)','الاتجاه (ارسم الانسياب)'],['len','Length (Ctrl = shorter)','الطول (Ctrl = أقصر)'],['den','Density (Ctrl = thinner)','الكثافة (Ctrl = أخف)'],['tex','Rough (Ctrl = smooth)','خشونة (Ctrl = نعومة)'],['clp','Sections / clumps (Ctrl = less)','التقسيم والخصل (Ctrl = أقل)'],['col','Colour / highlights (Ctrl = remove)','اللون / الخصل الملوّنة (Ctrl = إزالة)'],['tie','Tie mask (Ctrl = leave loose)','قناع الربط (Ctrl = اتركه مفلوتاً)'],['smooth','Blur painting','تنعيم الرسم'],['erase','Erase painting','مسح الرسم']])+
   R_('groom.r','Brush size ([ ])','حجم الفرشاة ([ ])',0.05,1.2,0.01)+R_('groom.str','Strength','القوة',0.05,1,0.01)+'<div class="cols">'+C_('groom.c','Paint colour','لون الرسم')+'</div>'+
   K_('groom.viz','Show painted map on the scalp','إظهار الخريطة المرسومة على الفروة')+K_('view.guides','Guides view (red guide curves)','عرض الأدلة (منحنيات حمراء)')+K_('groom.sym','Mirror left/right','تماثل يمين/يسار')+K_('groom.inv','Invert brush','عكس الفرشاة')+Btn_('grReset','Reset all painting','إعادة ضبط كل الرسم'),true)+
  Sec_('Physical comb','المشط الفيزيائي','<p class="desc">'+sp('The comb drags the strands through the physics and leaves them combed: the stroke sets the flow, the teeth set how smooth or sectioned the hair ends up.','المشط يسحب الخصل فيزيائياً ويتركها مسرّحة: حركة اليد تحدد الانسياب، والأسنان تحدد النعومة أو التقسيم.')+'</p>'+Btn_('combGo','Pick up the comb','أمسك المشط','p')+'<div style="height:8px"></div>'+
   Sel_('comb.t','Tool','الأداة',[['comb','Comb (direction)','تسريح (اتجاه)'],['lift','Lift (volume)','رفع (حجم)'],['smooth','Smooth','تنعيم'],['relax','Relax (undo lifting)','إرخاء (إلغاء الرفع)']])+
   Sel_('comb.teeth','Teeth','الأسنان',[['fine','Fine (silky, smooth)','ناعمة (حريري)'],['med','Medium','متوسطة'],['wide','Wide (textured sections)','عريضة (خصل واضحة)']])+
   R_('comb.tex','Finish: smooth ← → rough','اللمسة: ناعم ← → خشن',-1,1,0.05)+
   Sel_('comb.dmode','Direction','الاتجاه',[['follow','Follow the stroke','يتبع حركة اليد'],['fixed','Fixed (down the head)','ثابت (نحو الأسفل)']])+
   R_('comb.ang','Angle offset (°)','زاوية الانحراف (°)',-180,180,5)+R_('comb.r','Comb size','حجم المشط',0.15,1.2,0.01)+R_('comb.str','Strength','القوة',0.1,2,0.05)+Btn_('combReset','Reset lift','إعادة ضبط الرفع'),true)+
  Sec_('Hair ties','ربط الشعر','<div class="chips">'+[['High ponytail','ذيل حصان عالٍ','pony','all','0,0.8,-0.6'],['Low ponytail','ذيل حصان منخفض','pony','all','0,0.12,-0.99'],['Half-up bun','كعكة نصفية','bun','top','0,0.62,-0.78'],['Top knot','كعكة علوية','bun','all','0,0.96,-0.28'],['Half-up ponytail','ذيل نصفي','pony','top','0,0.55,-0.83']].map(function(b){return'<button data-tiepos="'+b[4]+'" data-tmode="'+b[2]+'" data-tsel="'+b[3]+'">'+sp(b[0],b[1])+'</button>'}).join('')+'</div>'+
   Sel_('tie.mode','Tie','الربط',[['none','Loose (untied)','مفلوت'],['pony','Ponytail','ذيل حصان'],['bun','Bun / top knot','كعكة']])+
   Sel_('tie.sel','Hair gathered','الشعر المربوط',[['all','All the hair','كل الشعر'],['top','Top half (half-up)','النصف العلوي'],['crown','Crown section','منطقة التاج']])+
   Btn_('tiePlace','Place the tie on the head (click)','ضع الربطة على الرأس (انقر)')+'<div style="height:8px"></div>'+
   R_('tie.tight','Tightness','الشدّ',0,1,0.02)+R_('tie.spread','Ponytail spread','انتشار الذيل',0,1,0.02)+R_('tie.bunR','Bun size','حجم الكعكة',0.08,0.3,0.005)+'<div class="cols">'+C_('tie.band','Band colour','لون الربطة')+'</div>'+
   '<p class="desc">'+sp('Paint with the Tie mask brush to add strands to the tie or leave them loose.','ارسم بفرشاة قناع الربط لإضافة خصل إلى الربطة أو تركها مفلوتة.')+'</p>',true);
 B.barber=Head_('Barber tools','أدوات الحلاقة','Cut scalp hair and beards with a simulated clipper, then score your fade.','قصّ شعر الرأس واللحية بماكينة محاكاة، ثم قيّم تدريجك.')+
  '<button id="cmBtn" class="p" style="margin-bottom:8px">'+sp('Customize clipper (C)','تخصيص الماكينة (C)')+'</button>'+
  Sec_('Pro barber tools','أدوات الحلاقة الاحترافية',Sel_('barb.tool','Tool','الأداة',[['clipper','Clipper (guards)','ماكينة (أمشاط)'],['razor','Straight razor (shave to skin)','موس حاد (حلاقة حتى الجلد)'],['line','Line designer (razor lines)','رسم الخطوط (خطوط بالموس)'],['trimmer','Trimmer / edger (line-up)','تريمر / تحديد الحواف'],['scissors','Scissors (cut to length)','مقص (قص بطول محدد)'],['thin','Thinning shears (remove bulk)','مقص تخفيف (إزالة الكثافة)']])+K_('barb.sym','Mirror the cut on both sides','قص متماثل على الجانبين')+R_('barb.lever','Clipper lever (open = longer)','ذراع الماكينة (مفتوح = أطول)',0,1,0.05)+R_('barb.flick','Flick-out (soft blend at the heel)','السحب للخارج (دمج ناعم)',0,1,0.05)+R_('barb.slen','Scissor length','طول القص بالمقص',0.05,2,0.01)+R_('barb.thin','Thinning amount','مقدار التخفيف',0.05,0.8,0.01)+R_('barb.lw','Line width','عرض الخط',0.015,0.12,0.005)+K_('barb.straight','Straight lines (press, drag, release)','خطوط مستقيمة (اضغط واسحب ثم أفلت)')+'<p class="desc">'+sp('The blade cuts only the hair under it, edge on to your stroke, so the line follows your hand. Fades and challenges still use the clipper.','الشفرة تقص الشعر الذي تحتها فقط وبعرض متعامد مع حركتك، فيتبع خط القص يدك. التدريج والتحديات تستخدم الماكينة.')+'</p>',true)+
  '<div class="row"><label for="gd">'+sp('Guard comb (keys 1–6)','مشط الحماية (المفاتيح 1–6)')+'</label><select id="gd">'+GD.map(function(g2,i){return'<option value="'+g2[0]+'"'+(i===2?' selected':'')+' data-en="'+(i?g2[1]+' · '+['','1.5 mm','3 mm','6 mm','10 mm','13 mm'][i]:'No guard (skin)')+'" data-ar="'+(i?g2[1]+' · '+['','1.5 مم','3 مم','6 مم','10 مم','13 مم'][i]:'بدون مشط (حتى الجلد)')+'"></option>'}).join('')+'</select></div>'+
  '<div class="row"><label for="bw">'+sp('Cut width','عرض القص')+'<b id="bwv"></b></label><input type="range" id="bw" min="0.15" max="0.6" step="0.01" value="0.3"></div>'+
  '<div class="two">'+Btn_('auto','Auto fade','تدريج تلقائي')+Btn_('regrow','Regrow hair','إعادة إنبات الشعر')+'</div>'+
  Sec_('Fade designer','مصمّم التدريج','<p class="desc">'+sp('Grade from one guard to the next (skin → #0 → #0.5 → #1 …) like a barber. Applying replaces earlier cuts on the sides and back.','تدرّج من مشط إلى الذي يليه (جلد ← #0 ← #0.5 ← #1 …) كما يفعل الحلاق. التطبيق يستبدل القصّات السابقة على الجوانب والخلف.')+'</p>'+
   '<div class="chips">'+Object.keys(FADEP).map(function(k){return'<button data-fp="'+k+'">'+sp(FADEP[k][0],FADEP[k][1])+'</button>'}).join('')+'</div>'+
   Ch_('fade.style',[['fade','Fade','تدريج'],['drop','Drop','منحدر'],['taper','Taper','تابر'],['burst','Burst','دائري']])+
   Sel_('fade.lo','Bottom guard','المشط السفلي',LAD.map(function(l){return[l[0],l[1],l[2]]}))+Sel_('fade.hi','Last guard before the top','آخر مشط قبل الأعلى',LAD.map(function(l){return[l[0],l[1],l[2]]}))+
   '<p class="desc" id="fadeSeq"></p>'+R_('fade.start','Fade start (height)','بداية التدريج (الارتفاع)',1.9,3.2,0.01)+R_('fade.top','Fade top (height)','نهاية التدريج (الارتفاع)',2.4,4.2,0.01)+R_('fade.soft','Blend: hard lines ↔ seamless','الدمج: خطوط حادة ↔ ناعم',0,1,0.02)+
   K_('fade.lines','Show guide lines','إظهار خطوط الدليل')+'<div class="two">'+Btn_('fadeApply','Apply fade','تطبيق التدريج','p')+Btn_('fadeClear','Clear fade','إزالة التدريج')+'</div>',true)+
  Sec_('Barber challenge','تحدّي الحلاق','<select id="tgt">'+opt('fade','Photo fade','تدريج الصورة')+opt('buzz','Buzz cut','حلاقة قصيرة')+opt('taper','High skin fade','تدريج عالٍ حتى الجلد')+'</select><div class="two" style="margin:6px 0 0">'+Btn_('gS','Start · 90 s','ابدأ · 90 ث','p')+Btn_('gF','Finish','إنهاء')+'</div><canvas id="mini" width="290" height="110" hidden></canvas>',true)+
  '<label class="chk"><input type="checkbox" id="snd" checked> '+sp('Clipper sound','صوت الماكينة')+'</label>';
 B.anim=Head_('Expressions & animation','التعابير والحركة','Blend facial expressions or preview live performance loops.','امزج تعابير الوجه أو اعرض حلقات أداء حيّة.')+
  '<div class="chips">'+Object.keys(EMO).map(function(k){return'<button data-emo="'+k+'">'+sp(EMO[k][0],EMO[k][1])+'</button>'}).join('')+'</div>'+
  EXPR.map(function(x){return R_('expr.'+x[0],x[1],x[2],0,1,0.01,0)}).join('')+
  Sec_('Live preview','معاينة حيّة','<div class="chips" id="animC">'+[['none','Off','إيقاف'],['idle','Idle','سكون'],['talk','Talking','تحدّث'],['emo','Emotion tour','جولة المشاعر']].map(function(a){return'<button data-anim="'+a[0]+'">'+sp(a[1],a[2])+'</button>'}).join('')+'</div>',true);
 B.light=Head_('Lighting & camera','الإضاءة والكاميرا','Production lighting rigs with matching reflections, tone mapping and lens control.','أطقم إضاءة احترافية مع انعكاسات متطابقة وتعيين الألوان والتحكم بالعدسة.')+
  Ch_('light.rig',Object.keys(RIGS).map(function(k){return[k,RIGS[k].en,RIGS[k].ar]}))+R_('light.rot','Rig rotation','دوران الإضاءة',-180,180,1,0)+R_('light.int','Intensity','الشدة',0.2,2,0.02)+R_('light.expo','Exposure','التعريض',0.3,2.5,0.02)+
  Sel_('light.tone','Tone mapping','تعيين الألوان',[['linear','Linear (original look)','خطي (المظهر الأصلي)'],['aces','ACES Filmic','ACES سينمائي'],['reinhard','Reinhard','راينهارد'],['cineon','Cineon','سينيون']])+
  Sel_('light.bg','Background','الخلفية',[['rig','Rig gradient','تدرج الإضاءة'],['solid','Solid color','لون ثابت'],['green','Green screen','شاشة خضراء'],['trans','Transparent','شفافة']])+'<div class="cols">'+C_('light.bgc','Solid color','اللون الثابت')+'</div>'+
  R_('view.focal','Focal length (mm)','البعد البؤري (مم)',18,135,1)+K_('view.turn','Turntable','قاعدة دوّارة');
 B['export']=Head_('Render & export','العرض والتصدير','High-resolution stills, 3D models and full character files.','صور عالية الدقة ونماذج ثلاثية الأبعاد وملفات شخصيات كاملة.')+
  Sec_('Image','صورة','<div class="row"><label>'+sp('Resolution','الدقة')+'</label><select id="pngS">'+opt('1','Screen (1×)','الشاشة (1×)')+opt('2','High (2×)','عالية (2×)')+opt('4','Ultra (4×)','فائقة (4×)')+'</select></div><label class="chk"><input type="checkbox" id="pngT"> '+sp('Transparent background','خلفية شفافة')+'</label>'+Btn_('sv','Save PNG','حفظ PNG','p'),true)+
  Sec_('3D model','نموذج ثلاثي الأبعاد','<label class="chk"><input type="checkbox" id="oHair" checked> '+sp('Include hair strands','تضمين خصلات الشعر')+'</label><div class="row"><label for="oDen">'+sp('Exported hair density (%)','كثافة الشعر المُصدَّر (%)')+'<b id="oDenV">25</b></label><input type="range" id="oDen" min="5" max="100" step="5" value="25"></div><div class="two">'+Btn_('xGLB','Export GLB','تصدير GLB','p')+Btn_('xOBJ','Export OBJ','تصدير OBJ')+'</div>',true)+
  Sec_('Character file','ملف الشخصية','<div class="two">'+Btn_('svJ','Save character','حفظ الشخصية','p')+Btn_('ldJ','Load character','تحميل شخصية')+'</div>',true)+
  Sec_('Mesh quality','جودة المجسم','<div class="row"><label>'+sp('Subdivision','التقسيم')+'</label><select id="meshL">'+opt('0','Low · 3.7k tris','منخفضة · 3.7 ألف مثلث')+opt('1','Medium · 15k tris','متوسطة · 15 ألف مثلث')+opt('2','High · 60k tris','عالية · 60 ألف مثلث')+'</select></div><p class="desc">'+sp('Changing quality clears the sculpt layer.','تغيير الجودة يمسح طبقة النحت.')+'</p>');
 $('panel').innerHTML=TABS.map(function(t){return'<section class="tab" data-tab="'+t[0]+'" hidden>'+B[t[0]]+'</section>'}).join('')+'<div class="tab" style="padding-top:0"><div class="note" id="st"></div></div>';
 $('vmode').innerHTML=opt('lit','Lit','مُضاء')+opt('clay','Clay','صلصال')+opt('wire','Wireframe','هيكل سلكي')+opt('topo','Lit + topology','مُضاء + الشبكة');
 $('camp').innerHTML=Object.keys(CAMS).map(function(k){return'<button data-cam="'+k+'">'+sp(CAMS[k][0],CAMS[k][1])+'</button>'}).join('');
 setT($('tOrb'),'Orbit','دوران');setT($('tSculpt'),'Sculpt','نحت');setT($('tClip'),'Clipper','الماكينة');setT($('tComb'),'Comb','مشط التسريح');setT($('tGroom'),'Groom','رسم الشعر');setT($('turn'),'⟳ Turntable','⟳ دوران تلقائي');setT($('rndTop'),'🎲 Randomize','🎲 عشوائي');setT($('rB'),'Play again','العب مجدداً');setT($('rX'),'Close','إغلاق');
 $('meshL').value=String(LEVEL);bindUI()}
function showTab(id){fadeTabOn=id==='barber';SKU.fadeShow.value=S.fade.lines&&fadeTabOn?1:0;document.querySelectorAll('.tab[data-tab]').forEach(function(s){s.hidden=s.dataset.tab!==id});document.querySelectorAll('#rail button').forEach(function(b){b.classList.toggle('on',b.dataset.tab===id)});
 if(id==='sculpt')setMode('sculpt');else if(id==='barber')setMode('clip');else if(id==='groom'){if(mode!=='comb'&&mode!=='tieplace')setMode('groom')}else if(mode!=='orb')setMode('orb');if(id==='blend')drawWheel();if(id==='skin')drawPalette();try{localStorage.setItem('hf_tab',id)}catch(e){}}
function fmt(v){return typeof v==='number'?(Math.abs(v)>=10?String(Math.round(v)):(+v.toFixed(2)).toString()):v}
function outUpd(p){var o=document.querySelector('[data-out="'+p+'"]');if(o)o.textContent=fmt(getPath(p)||0)}
function readEl(el){return el.type==='range'?+el.value:el.type==='checkbox'?el.checked:el.value}
function syncUI(){document.querySelectorAll('[data-path]').forEach(function(el){var p=el.dataset.path,v=getPath(p);
  if(el.type==='checkbox')el.checked=!!v;else if(el.type==='color')el.value=p==='skin.custom'?'#'+skinCol().getHexString():(v||'#000000');else if(el.type==='range')el.value=v===undefined?(el.dataset.dz||0):v;else if(v!==undefined)el.value=v;outUpd(p)});
 document.querySelectorAll('[data-set]').forEach(function(b){b.classList.toggle('on',String(getPath(b.dataset.set))===b.dataset.v)});
 document.querySelectorAll('[data-anim]').forEach(function(b){b.classList.toggle('on',b.dataset.anim===ANIM.mode)});
 if($('pre'))$('pre').value=cur.preset||'base';drawWheel();drawPalette()}
function onCtl(p){var a=p.split('.'),top=a[0],k=a[1];
 if(top==='shape'||top==='expr'){defDirty=true;return}
 if(top==='skin'){if(k==='mel'||k==='red')S.skin.custom='';updSkinU();if(k==='age'){defDirty=true;updHairCols()}paintDirty=true;drawPalette();return}
 if(top==='makeup'){paintDirty=true;return}
 if(top==='eyes'){updEyeMats();return}
 if(top==='ear'){updEar();return}
 if(top==='tie'){updTie(k);return}
 if(top==='comb'){if(k==='teeth')mkCombTeeth();return}
 if(top==='groom'){if(k==='r')ring.scale.setScalar(S.groom.r);grmViz();return}
 if(top==='barb')return;
 if(top==='hair'&&k==='ear'){LY.scalp.U.uEar.value=cur.ear==='over'?1:0;return}
 if(top==='hair'&&(k==='frizz'||k==='stray'||k==='hl'||k==='hlc')){hairLive(cur);return}
 if(top==='hair'){if(k==='h'||k==='t'){updHairCols();paintDirty=true;return}if(k==='stub'||k==='nape'||k==='front')paintDirty=true;sched('scalp');return}
 if(top==='hmat'){updHairMat();updHairCols();return}
 if(top==='brow'){if(k==='c'||k==='link'){updHairCols();return}paintDirty=true;sched('brow');return}
 if(top==='beard'){paintDirty=true;if(k==='c'||k==='link'){updHairCols();return}sched('beard');return}
 if(top==='lash'){if(k==='c'){updHairCols();return}sched('lash');return}
 if(top==='phys'){updPhys();return}
 if(top==='fade'){if(S.fade.on)applyFade();updFadeViz();return}
 if(top==='light'){applyLight();return}
 if(top==='view'){if(k==='guides'){LU.uGuide.value=S.view.guides?1:0;return}applyView();return}
 if(top==='brush'){if(k==='r')ring.scale.setScalar(BR.r)}}
function setCtl(p,v,c){setPath(p,v);outUpd(p);onCtl(p);if(c&&p.indexOf('brush.')!==0)commit()}
function bindUI(){var root=document.body;
 root.addEventListener('input',function(e){var el=e.target,p=el.dataset&&el.dataset.path;if(!p)return;setCtl(p,readEl(el),false)});
 root.addEventListener('change',function(e){var el=e.target,p=el.dataset&&el.dataset.path;if(!p)return;setCtl(p,readEl(el),true);if(el.type==='color'&&p==='skin.custom')drawPalette()});
 root.addEventListener('dblclick',function(e){var el=e.target;if(el.type==='range'&&el.dataset.dz!==undefined&&el.dataset.path){el.value=el.dataset.dz;setCtl(el.dataset.path,+el.dataset.dz,true)}});
 root.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button');if(!b)return;var d=b.dataset;
  if(d.tab)showTab(d.tab);
  else if(d.set){var v=d.v;setCtl(d.set,v,true);document.querySelectorAll('[data-set="'+d.set+'"]').forEach(function(x){x.classList.toggle('on',x.dataset.v===v)})}
  else if(d.cam)goCam(d.cam);
  else if(d.bp!==undefined){var a=+d.bp/BP.length*Math.PI*2-Math.PI/2,R0=wheelR();wheelSet(Math.cos(a)*R0,Math.sin(a)*R0);commit()}
  else if(d.tone!==undefined){S.skin.mel=+d.tone;S.skin.custom='';onCtl('skin.mel');syncUI();commit()}
  else if(d.iris){S.eyes.c=d.iris;updEyeMats();syncUI();commit()}
  else if(d.hc){var c=d.hc.split(',');cur.h=c[0];cur.t=c[1];updHairCols();paintDirty=true;syncUI();commit()}
  else if(d.fp){Object.assign(S.fade,FADEP[d.fp][2],{on:true});applyFade();updFadeViz();syncUI();commit()}
  else if(d.emo){S.expr=Object.assign({},EMO[d.emo][2]);defDirty=true;syncUI();commit()}
  else if(d.anim){ANIM.mode=d.anim;ANIM.t=0;syncUI()}});
 $('undo').onclick=undo;$('redo').onclick=redo;
 $('tOrb').onclick=function(){setMode('orb')};$('tSculpt').onclick=function(){showTab('sculpt')};$('tClip').onclick=function(){showTab('barber')};$('tComb').onclick=function(){showTab('groom');setMode('comb')};$('tGroom').onclick=function(){showTab('groom');setMode('groom')};
 $('turn').onclick=function(){S.view.turn=!S.view.turn;applyView()};
 $('lang').onclick=function(){LANG=LANG==='ar'?'en':'ar';try{localStorage.setItem('hf_lang',LANG)}catch(e){}applyLang()};
 $('theme').onclick=function(){var r=document.documentElement;r.dataset.theme=r.dataset.theme==='light'?'dark':'light'};
 $('rndTop').onclick=randomAll;$('rndAll').onclick=randomAll;
 $('bNeutral').onclick=function(){S.shape={};S.blend={x:0,y:0};defDirty=true;syncUI();commit()};
 $('bRandF').onclick=function(){randomFace();commit()};
 $('resetShape').onclick=function(){S.shape={};S.blend={x:0,y:0};defDirty=true;syncUI();commit()};
 $('clearSD').onclick=function(){SD.fill(0);defDirty=true;commit()};
 $('noMakeup').onclick=function(){S.makeup.lip=S.makeup.gloss=S.makeup.blush=S.makeup.shadow=S.makeup.liner=0;paintDirty=true;syncUI();commit()};
 $('pre').onchange=function(e){setP(e.target.value);grmReset();buildScalp();paintDirty=true;syncUI();commit()};
 $('fadeApply').onclick=function(){S.fade.on=true;applyFade();updFadeViz();commit()};$('fadeClear').onclick=function(){clearFade();commit()};
 $('regrow2').onclick=$('regrow').onclick=function(){if(auto)return;S.fade.on=false;buildScalp();buildBeard();commit()};
 $('rd').onclick=function(){cur.seed=1+Math.floor(Math.random()*999);buildScalp();syncUI();commit()};
 $('shk').onclick=function(){PH.shake=1.2;PH.asleep=false};
 $('stl').onclick=function(){if(PH.o){PH.o.set(PH.g);PH.v.fill(0);phWrite(PH.g)}PH.shake=0;PH.asleep=true};
 $('combGo').onclick=function(){setMode('comb')};
 var SKP={weathered:{mel:0.62,red:0.56,custom:'',bump:0.95,rough:0.54,oil:0.5,sss:0.8,trn:0.9,freck:0.3,age:0.4,under:0.45,flush:0.55,blotch:0.65,micro:1.1,fuzz:0.3},young:{bump:0.75,rough:0.55,oil:0.4,sss:0.9,freck:0.15,age:0,under:0.2,flush:0.4,blotch:0.3,micro:0.6,fuzz:0.45},aged:{bump:1.15,rough:0.62,oil:0.3,sss:0.75,freck:0.45,age:0.85,under:0.55,flush:0.6,blotch:0.8,micro:1.4,fuzz:0.25},oily:{oil:1,rough:0.42,bump:1,flush:0.55,micro:0.9}};
 document.querySelectorAll('[data-skp]').forEach(function(b){b.onclick=function(){Object.assign(S.skin,SKP[b.dataset.skp]);defDirty=true;paintDirty=true;updSkinU();updHairCols();syncUI();commit()}});$('grGo').onclick=function(){setMode('groom')};$('tiePlace').onclick=function(){setMode('tieplace')};
 $('grReset').onclick=function(){grmReset();applyGroomAll();grmViz();commit()};
 document.querySelectorAll('[data-tiepos]').forEach(function(b){b.onclick=function(){S.tie.u=b.dataset.tiepos.split(',').map(Number);S.tie.mode=b.dataset.tmode;S.tie.sel=b.dataset.tsel;updTie('sel');syncUI();commit()}});
 $('earDet').onclick=function(){detectEar();S.ear.guides=true;updEar();syncUI();toast(tx('Ears detected','تم اكتشاف الأذن'));commit()};
 $('earRst').onclick=function(){Object.assign(S.ear,{margin:0.08,sb:2.4,back:2.35,taper:0.85,slope:0.9});updEar();syncUI();commit()};
 $('combReset').onclick=function(){if(!PH.g)return;PH.g.fill(0);PH.gAny=false;PH.gDirty=true;PH.asleep=false};
 $('cmBtn').onclick=function(){toggleCM(!cm)};$('cmX').onclick=function(){toggleCM(false)};
 $('opts').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.s)LD[b.dataset.s]=SM[b.dataset.s][b.dataset.k];else if(b.dataset.t)LD[b.dataset.t]=!LD[b.dataset.t];else if(b.dataset.g){$('gd').selectedIndex=+b.dataset.g;guard()}applyLD()});
 $('gd').addEventListener('change',function(){guard();buildMenu()});$('bw').addEventListener('input',function(e){$('bwv').textContent=e.target.value});$('bwv').textContent=$('bw').value;
 $('auto').onclick=startAuto;$('gS').onclick=gStart;$('gF').onclick=gEnd;$('rB').onclick=gStart;$('rX').onclick=function(){$('res').hidden=true};
 $('sv').onclick=savePNG;$('xOBJ').onclick=exportOBJ;$('xGLB').onclick=exportGLB;$('svJ').onclick=saveJSON;$('ldJ').onclick=function(){$('ldF').click()};
 $('ldF').onchange=function(e){var f=e.target.files[0];if(!f)return;f.text().then(loadJSON);e.target.value=''};
 $('oDen').oninput=function(e){$('oDenV').textContent=e.target.value};
 $('meshL').onchange=function(e){var lv=+e.target.value;note(tx('Rebuilding mesh…','جارٍ إعادة بناء المجسم…'));setTimeout(function(){setupMesh(lv);buildAll();refreshAll();commit();note('')},30)};
 addEventListener('keydown',function(e){var tg=e.target;if((tg.tagName==='INPUT'&&tg.type!=='checkbox'&&tg.type!=='range')||tg.tagName==='SELECT'&&!e.ctrlKey&&!e.metaKey)return;var k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();return}if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();redo();return}if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(k==='c')toggleCM(!cm);else if(k==='escape')toggleCM(false);else if(k==='g')showTab('groom');else if(k>='1'&&k<='6'){$('gd').selectedIndex=+k-1;guard();buildMenu()}
  else if(k==='['||k===']'){var f9=k==='['?0.85:1.18;if(mode==='groom'){S.groom.r=clamp(S.groom.r*f9,0.05,1.2);ring.scale.setScalar(S.groom.r)}else if(mode==='comb')S.comb.r=clamp(S.comb.r*f9,0.15,1.2);else{BR.r=clamp(BR.r*f9,0.05,0.8);ring.scale.setScalar(BR.r)}syncUI()}});
 wheelUI();palUI()}

/* ---------- blend wheel ---------- */
function wheelR(){return $('wheel').width/2-40}
function drawWheel(){var c=$('wheel');if(!c||c.offsetParent===null&&ready)return;var x=c.getContext('2d'),W=c.width,cx=W/2,R0=wheelR(),dk=document.documentElement.dataset.theme!=='light';
 x.clearRect(0,0,W,W);x.fillStyle=dk?'#16181b':'#f2f0ec';x.beginPath();x.arc(cx,cx,R0+30,0,6.283);x.fill();x.strokeStyle=dk?'#2c2f35':'#d6d3ce';x.lineWidth=1;
 for(var r=1;r<=3;r++){x.beginPath();x.arc(cx,cx,R0*r/3,0,6.283);x.stroke()}
 x.font='12px system-ui';x.textAlign='center';x.textBaseline='middle';
 BP.forEach(function(b,i){var a=i/BP.length*Math.PI*2-Math.PI/2,px=cx+Math.cos(a)*R0,py=cx+Math.sin(a)*R0;x.beginPath();x.moveTo(cx,cx);x.lineTo(px,py);x.stroke();x.fillStyle='#4fb3d9';x.beginPath();x.arc(px,py,6,0,6.283);x.fill();x.fillStyle=dk?'#e9e6e1':'#1d1b19';x.fillText(tx(b.en,b.ar),cx+Math.cos(a)*(R0+20),cx+Math.sin(a)*(R0+20))});
 var hx=cx+S.blend.x,hy=cx+S.blend.y;x.fillStyle='#e0a030';x.strokeStyle=dk?'#000':'#fff';x.lineWidth=2;x.beginPath();x.arc(hx,hy,9,0,6.283);x.fill();x.stroke()}
function wheelSet(px,py){var R0=wheelR(),l=Math.hypot(px,py);if(l>R0){px*=R0/l;py*=R0/l;l=R0}S.blend={x:px,y:py};var amt=l/R0,ws=[],tot=0;
 BP.forEach(function(b,i){var a=i/BP.length*Math.PI*2-Math.PI/2,d=Math.hypot(px-Math.cos(a)*R0,py-Math.sin(a)*R0)/R0,w=Math.exp(-d*d*3);ws.push(w);tot+=w});
 var sh={};BP.forEach(function(b,i){for(var k in b.v)sh[k]=(sh[k]||0)+b.v[k]*ws[i]/tot*amt});for(var k in sh)sh[k]=Math.round(sh[k]*100)/100;S.shape=sh;defDirty=true;drawWheel();
 document.querySelectorAll('[data-path^="shape."]').forEach(function(el){el.value=S.shape[el.dataset.path.slice(6)]||0;outUpd(el.dataset.path)})}
function wheelUI(){var c=$('wheel'),dn=false;function ev(e){var r=c.getBoundingClientRect(),s=c.width/r.width;wheelSet((e.clientX-r.left)*s-c.width/2,(e.clientY-r.top)*s-c.width/2)}
 c.addEventListener('pointerdown',function(e){dn=true;c.setPointerCapture(e.pointerId);ev(e)});c.addEventListener('pointermove',function(e){if(dn)ev(e)});c.addEventListener('pointerup',function(){if(dn){dn=false;commit()}})}
/* ---------- skin tone map ---------- */
var palImg=null;
function drawPalette(){var c=$('pal');if(!c)return;var x=c.getContext('2d'),W=c.width,H=c.height;if(!palImg){palImg=x.createImageData(W,H);var t=new T.Color();for(var j=0;j<H;j++)for(var i=0;i<W;i++){skinRGB(i/(W-1),1-j/(H-1),t);var q=(j*W+i)*4;palImg.data[q]=t.r*255;palImg.data[q+1]=t.g*255;palImg.data[q+2]=t.b*255;palImg.data[q+3]=255}}
 x.putImageData(palImg,0,0);if(!S.skin.custom){var mx=S.skin.mel*(W-1),my=(1-S.skin.red)*(H-1);x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.arc(mx,my,7,0,6.283);x.stroke();x.strokeStyle='#000';x.lineWidth=1;x.beginPath();x.arc(mx,my,9,0,6.283);x.stroke()}
 x.fillStyle='rgba(0,0,0,.55)';x.font='10px system-ui';x.textAlign='left';x.fillText(tx('melanin →','الميلانين ←'),6,H-6);x.save();x.translate(W-6,H-6);x.rotate(-Math.PI/2);x.fillText(tx('rosy ↑','وردي ↑'),0,0);x.restore()}
function palUI(){var c=$('pal'),dn=false;function ev(e){var r=c.getBoundingClientRect();S.skin.mel=clamp((e.clientX-r.left)/r.width,0,1);S.skin.red=clamp(1-(e.clientY-r.top)/r.height,0,1);S.skin.custom='';updSkinU();paintDirty=true;drawPalette();var cc=document.querySelector('[data-path="skin.custom"]');if(cc)cc.value='#'+skinCol().getHexString()}
 c.addEventListener('pointerdown',function(e){dn=true;c.setPointerCapture(e.pointerId);ev(e)});c.addEventListener('pointermove',function(e){if(dn)ev(e)});c.addEventListener('pointerup',function(){if(dn){dn=false;commit()}})}

/* ---------- randomizer ---------- */
function randomFace(){var R=Math.random,a=R()*Math.PI*2,r=Math.sqrt(R())*wheelR();wheelSet(Math.cos(a)*r,Math.sin(a)*r);MD.forEach(function(m){S.shape[m[0]]=clamp((S.shape[m[0]]||0)+(R()-.5)*0.5,-1,1)});defDirty=true;syncUI()}
function randomAll(){var R=Math.random,pk=function(a){return a[Math.floor(R()*a.length)]};randomFace();
 S.skin.mel=0.05+R()*0.92;S.skin.red=0.25+R()*0.5;S.skin.custom='';S.skin.freck=R()<0.3?R()*0.8:R()*0.15;S.skin.age=R()<0.6?R()*0.3:R()*0.85;
 S.eyes.c=pk(ICOL)[0];S.eyes.het=R()<0.05;S.eyes.limbal=0.3+R()*0.6;
 var hp=pk(['hsf','beck','beck16','mi2','wLong','wWavy','wBangs','wLob','wBob','wCurly','wPixie','titanic','topgun','kroos','quiff','pomp','flowback','fade','buzz','crop','base','long','ref','curly','wavy','afro','dicap','cruise','undercut']);setP(hp);var hc=pk(HCOL.slice(0,7));cur.h=hc[0];cur.t=hc[1];cur.seed=1+Math.floor(R()*999);
 S.beard.style=hp.charAt(0)==='w'?'none':pk(['none','none','stubble','mustache','goatee','boxed','full','long']);S.beard.stub=R()*0.6;S.brow.arch=R()*1.0;S.brow.thick=0.7+R()*0.8;S.hmat.grey=R()<0.15?R()*0.6:0;
 buildScalp();buildBeard();buildBrow();refreshAll();commit()}

/* ---------- status ---------- */
function stats0(){var s=0;for(var n in LY)s+=LY[n].H.n||0;$('sbV').textContent=(NV/1000).toFixed(1)+tx('k verts · ','ألف رأس · ')+(NT/1000).toFixed(1)+tx('k tris','ألف مثلث');$('sbH').textContent=(s/1000).toFixed(1)+tx('k strands','ألف خصلة')}

/* ================= boot ================= */
var ready=false;
setupMesh(LEVEL);
skin=new T.Mesh(g,skinMat);skin.castShadow=skin.receiveShadow=true;scene.add(skin);wire=new T.Mesh(g,wireMat);wire.visible=false;scene.add(wire);
eyes=[mkEye(1),mkEye(-1)];
setP('base');buildUI();guard();applyLD();
buildAll();refreshAll();
size();place();applyLang();
var tab0='blend';try{tab0=localStorage.getItem('hf_tab')||'blend'}catch(e){}if(!TABS.some(function(t){return t[0]===tab0}))tab0='blend';
ready=true;showTab(tab0);setMode(mode);syncUI();applyDeform();paintSkin();last=snap();updUR();
var clock=new T.Clock(),fpsA=0,fpsN=0;
// HF_TEST: headless harness steps frames manually instead of running the rAF loop
if(window.HF_TEST)window.HF={SKU:SKU,geo:function(){return g},skinMat:skinMat,updShort:updShort,EARD:function(){return EARD},S:S,BR:BR,LY:LY,frame:function(n){for(var i=0;i<(n||1);i++)frame()},setCtl:setCtl,syncUI:syncUI,showTab:showTab,goCam:goCam,undo:undo,redo:redo,brushAt:brushAt,commit:commit,randomAll:randomAll,setupMesh:setupMesh,buildAll:buildAll,refreshAll:refreshAll,gStart:gStart,cutAt:cutAt,exportOBJ:exportOBJ,saveJSON:saveJSON,loadJSON:loadJSON,anim:ANIM,RIMS:function(){return RIMS},cam:function(t,p,d){th=t;ph=p;dist=d;camGoal=null;place()},setTgt:function(x,y,z){tgt.set(x,y,z);place()},snap:snap,pick:function(x,y){var h=hit({clientX:x,clientY:y});return h?h.p.toArray().map(function(v){return+v.toFixed(3)}):null},mode:function(){return mode+'/'+S.barb.tool+'/'+cutting}};
(function loop(){requestAnimationFrame(loop);if(!window.HF_TEST)frame()})();
function frame(){var dt=Math.min(clock.getDelta(),0.05),tm=clock.elapsedTime;
 if(auto)autoStep(dt);
 animStep(dt);
 if(camGoal){th+=(camGoal.th-th)*0.14;ph+=(camGoal.ph-ph)*0.14;dist+=(camGoal.dist-dist)*0.14;tgt.lerp(camGoal.t,0.14);if(Math.abs(camGoal.th-th)+Math.abs(camGoal.ph-ph)+Math.abs(camGoal.dist-dist)<0.002)camGoal=null;place()}
 if(S.view.turn&&!sculpting&&!cutting&&!combing&&!grooming){th+=dt*0.35;ox-=dt*0.35/0.007*0.02;place()}
 if(cm){var fw=new T.Vector3();cam.getWorldDirection(fw);var rg=new T.Vector3().setFromMatrixColumn(cam.matrix,0),uv=new T.Vector3().setFromMatrixColumn(cam.matrix,1);
  clip.position.copy(cam.position).addScaledVector(fw,7).addScaledVector(rg,-1.7).addScaledVector(uv,-1.3);
  clip.quaternion.copy(cam.quaternion).multiply(new T.Quaternion().setFromEuler(new T.Euler(0,Math.sin(tm*0.8)*0.8,0)));clip.scale.setScalar(1.1);tilt.rotation.z=0;clip.visible=true}
 else if(clip.visible){clip.position.lerp(tpos,0.45);clip.quaternion.slerp(tq,0.35);var sc=(+$('bw').value)*LD.bl.w/0.3;clip.scale.setScalar(sc);
  if(cutting||auto){clip.position.addScaledVector(tn,Math.sin(tm*140)*0.006*sc*LD.mt.vib);tilt.rotation.z=Math.sin(tm*95)*0.012*LD.mt.vib}else tilt.rotation.z=0}
 if(G.on){G.t-=dt;G.last+=dt;if(G.last>0.45){G.last=0;if(G.dirty){G.dirty=false;G.acc=accuracy();drawMini()}}hud();if(G.t<=0)gEnd()}
 if(defDirty)applyDeform();if(paintDirty)paintSkin();
 updEyes(dt);stepP(dt);for(var n in LY){var L=LY[n];if(L.dirty&&L.obj){L.obj.geometry.attributes.aMisc.needsUpdate=true;L.dirty=false;shortDirty=true}}if(shortDirty&&tm-shortT>0.1){shortT=tm;updShort()}physUpdate(dt,tm);updHairLight();if(earG.visible)earG.children.forEach(function(c){c.visible=c.userData.sx*cam.position.x>0});if(key.shadow.map){LU.uShMap.value=key.shadow.map.texture;LU.uShTx.value=1/key.shadow.mapSize.x;LU.uShRng.value=key.shadow.camera.far-key.shadow.camera.near;LU.uShOn.value=S.hmat.shadow>0?1:0}
 ren.render(scene,cam);
 fpsA+=dt;fpsN++;if(fpsA>0.5){$('sbF').textContent=Math.round(fpsN/fpsA)+' fps';$('phn').textContent=PH.G?(PH.G+tx(' guides · sim ',' دليل · محاكاة ')+PH.ms.toFixed(2)+' ms'+(PH.asleep?tx(' · asleep',' · ساكن'):'')):'';fpsA=fpsN=0}}
})();
