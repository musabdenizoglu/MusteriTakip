/* Müşteri Takip — referans musteritakip.html'deki yardımcı betiklerin birebir kopyası.
   (sütun başlıklarını hizalama, liste yüksekliği, isim genişliği ölçümü vb.)
   Her blok ayrı try/catch içindedir; biri hata verirse diğerleri çalışmaya devam eder. */

/* ==== polishJs ==== */
try {
(function(){
  var CLK='#custList li, .home-rec-row, .hist-row.kasa-row, .top-cust-row, li.linkable, td.cp-name, .m-stat';
  var last=null;
  document.addEventListener('focusin',function(e){ if(!e.target.closest('.modal, [class*="modal"]')) last=e.target; });
  function tag(){
    document.querySelectorAll(CLK).forEach(function(el){
      if(el.hasAttribute('tabindex')||el.tagName==='BUTTON') return;
      el.setAttribute('tabindex','0'); el.setAttribute('data-kb','1'); if(!el.getAttribute('role')) el.setAttribute('role','button');
    });
    document.querySelectorAll('.hist-row').forEach(function(r){
      var d=(r.querySelector('.hist-desc')||{}).textContent||'', dt=(r.querySelector('.hist-date')||{}).textContent||'';
      var nm=(r.querySelector('.hist-cust')||{}).textContent||'';
      var lab=[nm,d,dt].map(function(x){return (x||'').trim()}).filter(Boolean).join(', ');
      var e=r.querySelector('button.edit'), x=r.querySelector('button.del');
      if(e&&lab) e.setAttribute('aria-label','Düzenle: '+lab);
      if(x&&lab) x.setAttribute('aria-label','Sil: '+lab);
    });
    document.querySelectorAll('#custList li').forEach(function(li){
      var n=(li.querySelector('.cl-name, .name, strong')||li).textContent.trim().split('\n')[0].slice(0,60);
      var b=li.querySelector('.cl-edit'); if(b&&n) b.setAttribute('aria-label','Müşteri bilgilerini düzenle: '+n);
    });
    document.querySelectorAll('.home-btn, .seg-tabs button, #mTabbar button').forEach(function(b){
      if(b.classList.contains('active')||b.classList.contains('on')) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
    var cs=document.getElementById('custSearch'); if(cs&&!cs.getAttribute('aria-label')) cs.setAttribute('aria-label','Müşteri ara');
    var ub=document.getElementById('undoBar'); if(ub&&!ub.getAttribute('role')) ub.setAttribute('role','status');
    var ms=document.getElementById('mainScreen'); if(ms&&!ms.getAttribute('role')){ ms.setAttribute('role','main'); ms.id!=='main'&&ms.setAttribute('aria-label','Müşteri Takip'); }
    document.querySelectorAll('.modal-card, .confirm-card, [role=dialog]').forEach(function(m){ if(!m.getAttribute('aria-modal')) m.setAttribute('aria-modal','true'); if(!m.getAttribute('role')) m.setAttribute('role','dialog'); });
    document.querySelectorAll('.m-sheet-card[role=menu]').forEach(function(m){ m.removeAttribute('role'); });
  }
  var pend=false; function sched(){ if(pend) return; pend=true; requestAnimationFrame(function(){ pend=false; try{tag();}catch(e){} }); }
  document.addEventListener('keydown',function(e){
    if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches(CLK)&&((e.target.getAttribute('data-kb')==='1')||(e.key===' '&&e.target.classList.contains('m-stat')))){ e.preventDefault(); e.target.click(); }
  });
  // modal kapanınca odağı geri ver
  var openSet=new WeakMap();
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      if(m.type==='attributes'&&m.attributeName==='class'){
        var el=m.target; if(!el.classList||!/modal/i.test(el.id+' '+el.className)) return;
        var was=openSet.get(el), now=el.classList.contains('open');
        if(now&&!was){ openSet.set(el,last||true); }
        else if(!now&&was){ openSet.set(el,false); if(was&&was!==true&&document.contains(was)){ try{was.focus();}catch(e){} } }
      }
    });
    sched();
  }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  var sk=document.createElement('a'); sk.className='skip-link'; sk.href='#mainScreen'; sk.textContent='İçeriğe geç';
  sk.addEventListener('click',function(){ var m=document.getElementById('mainScreen'); if(m){ m.setAttribute('tabindex','-1'); m.focus(); } });
  document.body.insertBefore(sk,document.body.firstChild);
  sched();
})();
} catch (e) { console.warn('ui-polish: polishJs', e); }

/* ==== tickerJs ==== */
try {
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-ms=cikis]");if(b){var sh=b.closest(".m-sheet");try{if(sh)sh.classList.remove("open")}catch(x){} document.getElementById("logoutBtn").click();}});
(function(){ function chk(){ var t=document.getElementById('liveTicker'); if(!t) return; var v=(t.textContent||'').replace(/Dolar|Gram|Altın|Alış|Satış|[\s—\-]/g,''); t.classList.toggle('no-data', v.length===0); }
 setInterval(chk,2000); setTimeout(chk,500); })();
} catch (e) { console.warn('ui-polish: tickerJs', e); }

/* ==== homeMeasureJs ==== */
try {
(function(){
  var raf=0;
  function measure(){
    var list=document.getElementById('homeRecentList'); if(!list) return;
    var rows=list.querySelectorAll('.home-rec-row'); if(!rows.length) return;
    var cv=measure.cv||(measure.cv=document.createElement('canvas').getContext('2d'));
    var maxN=0,maxM=0;
    rows.forEach(function(r){
      var c=r.querySelector('.cust .cin'), m=r.querySelector('.model .cin');
      if(c){ cv.font=getComputedStyle(c).font; maxN=Math.max(maxN,cv.measureText(c.textContent).width); }
      if(m){ cv.font=getComputedStyle(m).font; maxM=Math.max(maxM,cv.measureText(m.textContent).width); }
    });
    list.style.setProperty('--cw',Math.ceil(maxN+6)+'px'); list.style.setProperty('--mw',Math.ceil(maxM+2)+'px');
  }
  function sched(){ cancelAnimationFrame(raf); raf=requestAnimationFrame(measure); }
  var l=document.getElementById('homeRecentList');
  if(l) new MutationObserver(sched).observe(l,{childList:true});
  window.addEventListener('resize',sched); setTimeout(sched,300);
})();
} catch (e) { console.warn('ui-polish: homeMeasureJs', e); }

/* ==== colHeadJs ==== */
try {
(function(){
  function fitHomeCust(list, h){
    var rows = list.querySelectorAll('.home-rec-row'); if(!rows.length) return;
    var w = 0, pad = 12;
    rows.forEach(function(r){
      var c = r.querySelector('.cust .cin'); if(!c) return;
      var old = c.style.cssText;
      c.style.cssText = 'display:inline-block !important;width:auto !important;max-width:none !important;white-space:nowrap !important;overflow:visible !important;';
      w = Math.max(w, c.getBoundingClientRect().width);
      c.style.cssText = old;
    });
    var sp = h.querySelectorAll('span')[3];
    var hw = 0; if(sp){ var rg = document.createRange(); rg.selectNodeContents(sp); hw = rg.getBoundingClientRect().width; }
    // sol ayraç(1px) + sol boşluk 12 + isim + sağ boşluk 12 (soldakiyle aynı)
    list.parentNode.style.setProperty('--hc4', (Math.ceil(Math.max(w, hw)) + pad * 2 + 1) + 'px');
  }
  function setup(listId, defs){
    var list = document.getElementById(listId); if(!list) return;
    var hid = listId + 'Head', raf = 0;
    function head(){
      var h = document.getElementById(hid);
      if(!h){ h = document.createElement('div'); h.id = hid; h.className = 'col-head'; h.setAttribute('aria-hidden', 'true'); list.parentNode.insertBefore(h, list); }
      return h;
    }
    function sync(){
      var h = head(), row = list.querySelector('.rec-row, .hist-row');
      if(!row || !list.offsetParent){ h.style.display = 'none'; return; }
      h.style.display = 'grid';
      if(h.nextSibling !== list) list.parentNode.insertBefore(h, list);
      var cs = getComputedStyle(list), pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
      h.style.width = (list.clientWidth - pl - pr) + 'px'; h.style.marginLeft = pl + 'px';
      var out = '';
      defs.forEach(function(d, i){
        out += '<span class="' + (i === 0 ? 'first' : '') + (d[3] ? ' nb' : '') + '" style="grid-column:' + d[0] + (d[2] > 1 ? ' / span ' + d[2] : '') + ';grid-row:1">' + d[1] + '</span>';
      });
      h.innerHTML = out;
      if(listId === 'homeRecentList') fitHomeCust(list, h);
    }
    function sched(){ cancelAnimationFrame(raf); raf = requestAnimationFrame(function(){ sync(); setTimeout(sync, 200); setTimeout(sync, 600); }); }
    new MutationObserver(sched).observe(list, {childList:true});
    if(window.ResizeObserver) new ResizeObserver(sched).observe(list);
    window.addEventListener('resize', sched);
    document.addEventListener('click', function(){ setTimeout(sched, 120); });
    setTimeout(sched, 400);
  }
  setup('homeRecentList', [[1,'Tarih',1],[2,'Model Resmi',1],[3,'Müşteri Kodu',1],[4,'Müşteri',1],[5,'Model İsmi',1]]);
  setup('recordsList', [[2,'Tarih',1],[3,'Model Resmi',1],[4,'Model Kodu',1],[5,'Model İsmi',2],[7,'Fiyat',1],[8,'',1]]);
  setup('expenseList', [[1,'Tarih',1],[2,'Gider Türü',1],[3,'Açıklama',1],[4,'Tutar',1],[5,'',1]]);
  setup('historyList', [[2,'Tarih',1],[3,'Tür',1],[4,'Model Kodu',1],[5,'Açıklama',2],[7,'Fiyat',1],[8,'',1]]);
  setup('kasaList', [[2,'Tarih',1],[3,'Tür',1],[4,'Müşteri',1],[5,'Model İsmi',2],[7,'Tutar',1],[8,'',1]]);
})();
} catch (e) { console.warn('ui-polish: colHeadJs', e); }

/* ==== histCodeJs ==== */
try {
(function(){
  var raf=0;
  function measure(){
    var l=document.getElementById('historyList'); if(!l) return;
    var m=0; l.querySelectorAll('.hist-code .mcode, .hist-code .mcode-none').forEach(function(e){ m=Math.max(m, e.offsetWidth); });
    if(m) l.style.setProperty('--hcw', (m+1)+'px');
  }
  function sched(){ cancelAnimationFrame(raf); raf=requestAnimationFrame(function(){ measure(); setTimeout(measure,250); }); }
  var l=document.getElementById('historyList');
  if(l){ new MutationObserver(sched).observe(l,{childList:true}); if(window.ResizeObserver) new ResizeObserver(sched).observe(l); }
  window.addEventListener('resize',sched); document.addEventListener('click',function(){ setTimeout(sched,150); }); setTimeout(sched,400);
})();
} catch (e) { console.warn('ui-polish: histCodeJs', e); }

/* ==== giderBarJs ==== */
try {
(function(){
  var panel=document.getElementById('panelGiderler'), btn=document.getElementById('giderOpenBtn'); if(!panel||!btn) return;
  var tabs=panel.querySelector('.seg-tabs'); if(!tabs) return;
  var row=document.createElement('div'); row.className='seg-row';
  tabs.parentNode.insertBefore(row,tabs); row.appendChild(tabs); row.appendChild(btn);
})();
} catch (e) { console.warn('ui-polish: giderBarJs', e); }

/* ==== custTileSyncJs ==== */
try {
(function(){
  function norm(t){return (t||'').trim();}
  function sync(){
    var ref={};
    document.querySelectorAll('.kasa-strip .kasa-stat').forEach(function(el){
      var lb=el.querySelector('.label'); if(lb) ref[norm(lb.textContent)]=el;
    });
    document.querySelectorAll('.cust-stats .kasa-stat').forEach(function(el){
      var lb=el.querySelector('.label'); if(!lb) return;
      var r=ref[norm(lb.textContent)]; if(!r) return;
      var c=getComputedStyle(r).getPropertyValue('--c').trim(); if(c) el.style.setProperty('--c',c,'important');
      var ri=r.querySelector('.kt-ico'), ei=el.querySelector('.kt-ico');
      if(ri&&ei&&ei.innerHTML!==ri.innerHTML) ei.innerHTML=ri.innerHTML;
    });
  }
  document.addEventListener('DOMContentLoaded',function(){sync();setTimeout(sync,400);setTimeout(sync,1500);});
  document.addEventListener('click',function(){setTimeout(sync,200);});
})();
} catch (e) { console.warn('ui-polish: custTileSyncJs', e); }

/* ==== custHeadSbJs ==== */
try {
(function(){
  function fit(){
    var ul=document.getElementById('custList'), h=document.getElementById('custListHead'); if(!ul||!h) return;
    var sb=Math.max(0, ul.offsetWidth-ul.clientWidth);
    h.style.paddingRight=(8+sb)+'px';
  }
  var raf=0; function sched(){cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){fit();setTimeout(fit,200);});}
  window.addEventListener('resize',sched);
  document.addEventListener('click',function(){setTimeout(sched,150);});
  document.addEventListener('input',function(){setTimeout(sched,150);});
  document.addEventListener('DOMContentLoaded',function(){var ul=document.getElementById('custList'); if(ul) new MutationObserver(sched).observe(ul,{childList:true}); sched();});
})();
} catch (e) { console.warn('ui-polish: custHeadSbJs', e); }

/* ==== kindUnderPhoneJs ==== */
try {
(function(){var p=document.getElementById('activeCustPhone'),k=document.querySelector('#custBalanceBlock .cust-kind-row');if(!p||!k)return;var c=document.createElement('div');c.className='phone-col';p.parentNode.insertBefore(c,p);c.appendChild(p);c.appendChild(k);})();
} catch (e) { console.warn('ui-polish: kindUnderPhoneJs', e); }

/* ==== nameColJs ==== */
try {
(function(){var h=document.getElementById('activeCustName'),b=document.getElementById('custBalBadge'),p=document.getElementById('activeCustPhone');if(!h||!p)return;
var col=document.createElement('div');col.className='name-col';var top=document.createElement('div');top.className='name-top';
h.parentNode.insertBefore(col,h);top.appendChild(h);if(b)top.appendChild(b);col.appendChild(top);col.appendChild(p);
var e=document.createElement('span');e.className='cust-email';e.id='activeCustEmail';e.hidden=true;col.appendChild(e);})();
} catch (e) { console.warn('ui-polish: nameColJs', e); }

/* ==== modelUpperJs ==== */
try {
(function(){var i=document.getElementById('recordModel');if(!i)return;
i.addEventListener('input',function(){var a=i.selectionStart,b=i.selectionEnd,u=i.value.toLocaleUpperCase('tr-TR');if(u!==i.value){i.value=u;try{i.setSelectionRange(a,b);}catch(e){}}});})();
} catch (e) { console.warn('ui-polish: modelUpperJs', e); }

/* ==== expTagErrJs ==== */
try {
(function(){var s=document.getElementById('expenseTag');if(!s)return;
function clr(){if(s.classList.contains('invalid'))s.classList.remove('invalid');var e=document.getElementById('expenseTagErr');if(e&&!e.hidden)e.hidden=true;}
s.addEventListener('change',clr);
var f=document.getElementById('expenseForm');if(f)f.addEventListener('reset',clr);
s.addEventListener('input',clr);
})();
} catch (e) { console.warn('ui-polish: expTagErrJs', e); }

/* ==== dropZoneJs ==== */
try {
(function(){
  // Resim kutularına ve pencerelere sürükle-bırak: seçili dosyayı ilgili dosya kutusuna verir ve normal "change" akışını (sıkıştırma + filigran) çalıştırır
  function hasFiles(e){ try{ return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types||[], 'Files') >= 0; }catch(_){ return false; } }
  function give(inputId, file){
    const inp = document.getElementById(inputId);
    if(!inp || !file || !/^image\//i.test(file.type||'')) return;
    try{
      const dt = new DataTransfer(); dt.items.add(file); inp.files = dt.files;
      inp.dispatchEvent(new Event('change', {bubbles:true}));
    }catch(_){}
  }
  window.__dzGive = give;
  // Buton üstüne bırakma: resmi sakla ve butonu çalıştır (yeni sipariş penceresi resimle açılır)
  var BTN_SEL = '#goOrderBtn, #newRecordBtn, #mhPlus, .mt-order[data-mt="order"], #fmSide .fm-item[data-k="order"]';
  function btnZones(){
    let cur = null;
    function clearCur(){ if(cur){ cur.classList.remove('dz-over'); cur = null; } }
    function tgt(e){ return e.target && e.target.closest ? e.target.closest(BTN_SEL) : null; }
    document.addEventListener('dragover', function(e){
      if(!hasFiles(e)) return; const t = tgt(e);
      if(!t){ clearCur(); return; }
      e.preventDefault(); try{ e.dataTransfer.dropEffect = 'copy'; }catch(_){}
      if(cur !== t){ clearCur(); cur = t; t.classList.add('dz-over'); }
    }, true);
    document.addEventListener('dragleave', function(e){ if(!e.relatedTarget) clearCur(); }, true);
    document.addEventListener('drop', function(e){
      if(!hasFiles(e)) return; const t = tgt(e); clearCur();
      if(!t) return;
      e.preventDefault(); e.stopPropagation();
      const f = Array.prototype.find.call(e.dataTransfer.files||[], function(x){ return /^image\//i.test(x.type||''); });
      if(!f) return;
      window.__dropImg = f; t.click();
    }, true);
  }
  function zone(el, inputId){
    if(!el) return;
    let depth = 0;
    el.addEventListener('dragenter', function(e){ if(!hasFiles(e)) return; e.preventDefault(); depth++; el.classList.add('dz-over'); });
    el.addEventListener('dragover', function(e){ if(!hasFiles(e)) return; e.preventDefault(); try{ e.dataTransfer.dropEffect = 'copy'; }catch(_){} });
    el.addEventListener('dragleave', function(){ depth = Math.max(0, depth-1); if(!depth) el.classList.remove('dz-over'); });
    el.addEventListener('drop', function(e){
      if(!hasFiles(e)) return;
      e.preventDefault(); e.stopPropagation(); depth = 0; el.classList.remove('dz-over');
      const f = Array.prototype.find.call(e.dataTransfer.files||[], function(x){ return /^image\//i.test(x.type||''); });
      give(inputId, f);
    });
  }
  // Sipariş kartı (#recModal) sonradan pencere olarak eklendiği için belge düzeyinde dinlenir
  function recZone(){
    let cur = null;
    function card(e){ return e.target && e.target.closest ? e.target.closest('#recModal .rec-card') : null; }
    function clearCur(){ if(cur){ cur.classList.remove('dz-over'); cur = null; } }
    document.addEventListener('dragover', function(e){
      if(!hasFiles(e)) return; const c = card(e);
      if(!c){ clearCur(); return; }
      e.preventDefault(); try{ e.dataTransfer.dropEffect = 'copy'; }catch(_){}
      if(cur !== c){ clearCur(); cur = c; c.classList.add('dz-over'); }
    });
    document.addEventListener('dragleave', function(e){ if(cur && (!e.relatedTarget || !cur.contains(e.relatedTarget))) clearCur(); });
    document.addEventListener('drop', function(e){
      if(!hasFiles(e)) return; const c = card(e); clearCur();
      if(!c) return;
      e.preventDefault(); e.stopPropagation();
      const f = Array.prototype.find.call(e.dataTransfer.files||[], function(x){ return /^image\//i.test(x.type||''); });
      give('recordImage', f);
    });
  }
  function init(){
    btnZones();
    recZone();
    zone(document.getElementById('custEditForm') || document.getElementById('custEditModal'), 'ceImage');
    const pf = document.getElementById('custProfileImage'), ef = document.getElementById('custEntryImage');
    zone(pf && pf.closest('.upload-btn'), 'custProfileImage');
    zone(ef && ef.closest('.upload-btn'), 'custEntryImage');
    // dosya yanlışlıkla boş yere bırakılırsa tarayıcı resmi açıp sayfadan çıkmasın
    ['dragover','drop'].forEach(function(t){ window.addEventListener(t, function(e){ if(hasFiles(e)) e.preventDefault(); }); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
} catch (e) { console.warn('ui-polish: dropZoneJs', e); }

/* ==== autoKind ==== */
try {
(function(){function sync(){var g=document.getElementById('recAltinGr'),m=document.getElementById('recAltinMilyem'),k=document.getElementById('recordKind');if(!g||!m||!k)return;k.value=(g.value.trim()!==''&&m.value.trim()!=='')?'Altın':'Kalıp';}
['recAltinGr','recAltinMilyem'].forEach(function(id){var e=document.getElementById(id);if(e)e.addEventListener('input',sync);});})();
} catch (e) { console.warn('ui-polish: autoKind', e); }

/* ==== reqBubbleJs ==== */
try {
(function(){
var form=document.getElementById('recordForm');if(!form)return;form.setAttribute('novalidate','');
var bubbles=[],armed=false;
function $(i){return document.getElementById(i)}
function missing(){var m=$('recordModel'),pr=$('recordPrice'),g=$('recAltinGr'),ml=$('recAltinMilyem');
 var gf=g.value.trim()!=='',mf=ml.value.trim()!=='',o=[];
 if(m.value.trim()==='')o.push(m);if(gf&&!mf)o.push(ml);if(mf&&!gf)o.push(g);if(pr.value==='')o.push(pr);return o;}
function clearB(){bubbles.forEach(function(b){b.remove()});bubbles=[];}
function show(el){var b=document.createElement('div');b.className='rf-bubble';b.innerHTML='<i>!</i><span>Lütfen bu alanı doldurun.</span>';document.body.appendChild(b);
 var r=el.getBoundingClientRect();b.style.left=Math.max(8,r.left)+'px';b.style.top=(r.bottom+9)+'px';bubbles.push(b);}
function render(){clearB();var miss=missing();
 ['recordModel','recordPrice','recAltinGr','recAltinMilyem'].forEach(function(id){var e=$(id);e.classList.toggle('rf-bad',armed&&miss.indexOf(e)>-1);});
 if(armed)miss.forEach(show);return miss;}
function disarm(){armed=false;render();}
['recordModel','recordPrice','recAltinGr','recAltinMilyem'].forEach(function(id){$(id).addEventListener('input',function(){if(armed)render();});});
['input','change','click'].forEach(function(t){form.addEventListener(t,function(){if(armed)setTimeout(render,0);});});
document.addEventListener('submit',function(ev){
 if(ev.target!==form)return;
 armed=true;var miss=render();
 if(!miss.length){disarm();return;}
 ev.preventDefault();ev.stopImmediatePropagation();miss[0].focus();
},true);
window.addEventListener('resize',function(){if(armed)render()});document.addEventListener('scroll',function(){if(armed)render()},true);
setInterval(function(){if(armed&&!form.offsetParent)disarm();},400);
})();
} catch (e) { console.warn('ui-polish: reqBubbleJs', e); }

/* ==== codeFit ==== */
try {
(function(){
function fit(){var l=document.querySelector('label[for=recordCustCode]'),a=document.getElementById('recordCustCode'),n=document.getElementById('recordNo'),d=document.querySelector('#recordForm .code-dash'),pair=document.querySelector('#recordForm .code-pair');
 if(!l||!a||!n||!d||!l.firstChild||!l.offsetParent)return;
 var t=l.firstChild.textContent,i=t.indexOf('Model no');if(i<0)return;
 function rg(x,y){var r=document.createRange();r.setStart(l.firstChild,x);r.setEnd(l.firstChild,y);return r.getBoundingClientRect();}
 var r1=rg(0,t.indexOf(' –')>0?t.indexOf(' –'):12),r2=rg(i,t.length);
 var w1=r1.width,w2=r2.width,gap=r2.left-r1.right;if(!(w1>20&&w2>20&&gap>=0))return;
 pair.style.setProperty('gap','0','important');
 [[a,w1],[n,w2],[d,gap]].forEach(function(p){var e=p[0],w=p[1]+'px';e.style.setProperty('width',w,'important');e.style.setProperty('flex','0 0 '+w,'important');e.style.setProperty('min-width','0','important');});
 d.style.setProperty('padding','0','important');d.style.setProperty('overflow','hidden','important');
}
window.__fitCode=fit;
var m=document.getElementById('recModal');if(m)new MutationObserver(function(){setTimeout(fit,0);setTimeout(fit,150);}).observe(m,{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',fit);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
document.addEventListener('input',function(e){if(e.target&&e.target.id==='recordCustCode')setTimeout(fit,0);});
})();
} catch (e) { console.warn('ui-polish: codeFit', e); }

/* ==== histFilterJs ==== */
try {
(function(){
function norm(t){return String(t||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function prefix(v){var d=new Date(),y=d.getFullYear(),m=d.getMonth(),pad=function(n){return String(n).padStart(2,'0')};
 if(v==='m0')return y+'-'+pad(m+1);if(v==='m1'){var pm=new Date(y,m-1,1);return pm.getFullYear()+'-'+pad(pm.getMonth()+1);}
 if(v==='y0')return String(y);if(v==='y1')return String(y-1);return '';}
function rowDate(r){var e=r.querySelector('.hist-date,.date');var m=e&&e.textContent.match(/(\d{2})\.(\d{2})\.(\d{4})/);return m?m[3]+'-'+m[2]:'';}
var CFG=[{bar:'recSelBar',list:'recordsList',per:false,pre:'rec'},{bar:'histSelBar',list:'historyList',per:true,pre:'hist'}];
function apply(c){var list=document.getElementById(c.list);if(!list)return;
 var q=document.getElementById(c.pre+'Search'),pe=document.getElementById(c.pre+'Period');
 var terms=q?q.value.split(',').map(norm).map(function(x){return x.trim()}).filter(Boolean):[];
 var pf=pe?prefix(pe.value):'';
 Array.prototype.forEach.call(list.children,function(r){
  if(!/rec-row|hist-row/.test(r.className))return;
  var ok=true;
  if(terms.length){var t=norm(r.textContent+' '+(r.classList.contains('kr-payment')?'ödeme tahsilat':'')+(r.classList.contains('kr-price')?' borç sipariş':''));ok=terms.some(function(x){return t.indexOf(x)>-1});}
  if(ok&&pf){ok=rowDate(r).indexOf(pf)===0;}
  if(ok)r.style.removeProperty('display');else r.style.setProperty('display','none','important');});
 var rows=Array.prototype.filter.call(list.children,function(r){return /rec-row|hist-row/.test(r.className)});
 var shown=rows.filter(function(r){return r.style.display!=='none'}).length;
 var id=c.pre+'FilterEmpty',el=document.getElementById(id);
 if(!el){el=document.createElement('div');el.id=id;el.className='empty-note';list.appendChild(el);}
 var active=terms.length>0||!!pf;
 if(rows.length&&!shown&&active){var src=document.querySelector('#historyEmptyNote .es svg')||document.querySelector('#kasaEmptyNote .es svg');
  var t=pf&&!terms.length?'Bu dönemde hareket yok':'Sonuç bulunamadı';var sub=pf&&!terms.length?'Seçilen dönemde kayıt yok. Başka bir dönem seçin.':'Aramanıza uyan kayıt yok. Aramayı değiştirin veya temizleyin.';
  el.innerHTML='<div class="es">'+(src?src.outerHTML:'')+'<div class="es-t">'+t+'</div><div class="es-s">'+sub+'</div></div>';el.style.display='block';}
 else{el.style.display='none';}}
function inject(){CFG.forEach(function(c){var bar=document.getElementById(c.bar);if(!bar||bar.querySelector('.hs-filter'))return;
 var d=document.createElement('div');d.className='hs-filter';
 d.innerHTML='<input type="text" id="'+c.pre+'Search" placeholder="'+(c.per?'Borç, ödeme, model, tarih, tür…':'Model, kod, tarih, tür…')+'" aria-label="Ara" title="Virgülle birden fazla arama yapabilirsiniz">'+(c.per?'<select id="'+c.pre+'Period" aria-label="Dönem"><option value="">Dönem: Tümü</option><option value="m0">Bu ay</option><option value="m1">Geçen ay</option><option value="y0">Bu yıl</option><option value="y1">Geçen yıl</option></select>':'');
 bar.appendChild(d);
 d.addEventListener('input',function(){apply(c)});d.addEventListener('change',function(){apply(c)});
 var list=document.getElementById(c.list);if(list)new MutationObserver(function(){apply(c)}).observe(list,{childList:true});});}
new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});inject();
})();
} catch (e) { console.warn('ui-polish: histFilterJs', e); }

/* ==== selFit ==== */
try {
(function(){
var cv=document.createElement('canvas').getContext('2d');
function fit(sel){if(!sel.offsetParent||sel.multiple||sel.size>1)return;
 var cs=getComputedStyle(sel);cv.font=cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
 var w=0;for(var i=0;i<sel.options.length;i++){var t=sel.options[i].text;if(sel.options[i].hidden)continue;w=Math.max(w,cv.measureText(t).width);}
 var need=Math.ceil(w+parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight)+ (parseFloat(cs.borderLeftWidth)||0)+(parseFloat(cs.borderRightWidth)||0)+26);
 if(sel.getBoundingClientRect().width<need-1){sel.style.setProperty('min-width',need+'px','important');if(cs.width&&parseFloat(cs.width)<need)sel.style.setProperty('width',need+'px','important');sel.style.setProperty('flex-shrink','0','important');}
}
function all(){document.querySelectorAll('select').forEach(fit);}
setInterval(all,800);document.addEventListener('click',function(){setTimeout(all,50)});document.addEventListener('change',function(){setTimeout(all,50)});window.addEventListener('resize',all);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(all);all();
})();
} catch (e) { console.warn('ui-polish: selFit', e); }

/* ==== hasBoxJs ==== */
try {
(function(){
  function sync(){ var src=document.getElementById('pmHurdaMil'), b=document.getElementById('pmHasShow'); if(!src||!b||src.offsetParent===null) return;
    var c=getComputedStyle(src);
    b.style.boxSizing='border-box'; b.style.display='flex'; b.style.alignItems='center';
    b.style.height=c.height; b.style.paddingTop='0'; b.style.paddingBottom='0'; b.style.paddingLeft=c.paddingLeft; b.style.paddingRight=c.paddingRight;
    b.style.backgroundColor=c.backgroundColor; b.style.border=c.borderTopWidth+' '+c.borderTopStyle+' '+c.borderTopColor; b.style.borderRadius=c.borderTopLeftRadius; }
  var m=document.getElementById('payModal'); if(!m) return;
  ['input','change','click'].forEach(function(ev){ m.addEventListener(ev,function(){ setTimeout(sync,0); }); });
  new MutationObserver(function(){ setTimeout(sync,30); }).observe(m,{attributes:true,attributeFilter:['class']});
  new MutationObserver(function(){ setTimeout(sync,30); }).observe(document.documentElement,{attributes:true,attributeFilter:['data-skin','data-theme']});
})();
} catch (e) { console.warn('ui-polish: hasBoxJs', e); }

/* ==== kasaColFit ==== */
try {
(function(){
  var sc=document.getElementById('kasaScroll'), list=document.getElementById('kasaList'); if(!sc||!list) return;
  var busy=false;
  function fit(){
    if(busy) return; busy=true;
    try{
      if(list.offsetParent===null){ return; }
      // Tutar sütunu: en geniş tutar (altın hesabı satırı dahil) sığacak kadar
      var ka=parseFloat(list.style.getPropertyValue('--kamt'))||0, kaw=Math.max(196, Math.ceil(ka)+26);
      sc.style.setProperty('--kaw', kaw+'px');
      // Müşteri sütunu en uzun isme göre
      var w=0, cells=list.querySelectorAll('.hist-row > .cust');
      for(var i=0;i<cells.length;i++){ var r=document.createRange(); r.selectNodeContents(cells[i]); w=Math.max(w, r.getBoundingClientRect().width); }
      if(w>0){
        var want=Math.ceil(w)+10+16, room=list.clientWidth-(416+kaw)-210;   // 416 + tutar: sabit sütunlar, 210: açıklama için en az yer (sığmayan isim iki satıra iner)
        var cw=Math.max(110, Math.min(want, Math.max(110, room)));
        sc.style.setProperty('--kcw', cw+'px');
      } else sc.style.removeProperty('--kcw');
    } finally { busy=false; }
  }
  var t=null; function later(){ clearTimeout(t); t=setTimeout(fit, 30); }
  new MutationObserver(later).observe(list,{childList:true,subtree:true,characterData:true});
  new MutationObserver(later).observe(list,{attributes:true,attributeFilter:['style']});
  if(window.ResizeObserver) new ResizeObserver(later).observe(list);
  window.addEventListener('resize', later);
  var pk=document.getElementById('panelKasa'); if(pk) new MutationObserver(later).observe(pk,{attributes:true,attributeFilter:['class']});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(later);
  later();
})();
} catch (e) { console.warn('ui-polish: kasaColFit', e); }

/* ==== pmCustDdJs ==== */
try {
(function(){
  var inp=document.getElementById('pmCust'), wrap=document.getElementById('pmCustWrap'), dl=document.getElementById('pmCustList'); if(!inp||!wrap||!dl) return;
  inp.removeAttribute('list');   // tarayıcının kendi listesi, isim otomatik tamamlanınca açılmıyordu
  var dd=document.createElement('div'); dd.id='pmCustDd'; dd.hidden=true; dd.setAttribute('role','listbox'); wrap.appendChild(dd);
  var hi=-1, items=[], picking=false, isOpen=false, hideT=null;
  var arrow=document.createElement('button'); arrow.type='button'; arrow.id='pmCustArrow'; arrow.tabIndex=-1; arrow.setAttribute('aria-label','Müşteri listesini aç/kapat');
  arrow.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  wrap.appendChild(arrow);
  function place(){ if(inp.offsetHeight){ arrow.style.height=inp.offsetHeight+'px'; arrow.style.top=inp.offsetTop+'px'; } }
  function show(){ clearTimeout(hideT); place(); dd.hidden=false; void dd.offsetWidth; dd.classList.add('open'); arrow.classList.add('open'); isOpen=true; }
  arrow.addEventListener('mousedown', function(e){ e.preventDefault(); if(isOpen){ close(); } else { if(document.activeElement!==inp) inp.focus(); render(); } });
  function low(t){ return String(t||'').toLocaleLowerCase('tr-TR'); }
  function names(){ return Array.prototype.map.call(dl.querySelectorAll('option'), function(o){ return o.value; }); }
  function typed(){   // otomatik tamamlanan (seçili) kısım hariç, kullanıcının yazdığı kısım
    var v=inp.value, a=inp.selectionStart, b=inp.selectionEnd;
    if(document.activeElement===inp && a!==b && b===v.length) v=v.slice(0,a);
    return v.trim();
  }
  function render(){
    var all=names(), q=low(typed()), exact=all.some(function(n){ return low(n)===low(inp.value.trim()); });
    var list = (!q || (exact && low(inp.value.trim())===q)) ? all.slice() : all.filter(function(n){ return low(n).indexOf(q)>=0; });
    if(q && !(exact && low(inp.value.trim())===q)) list.sort(function(x,y){ return (low(x).indexOf(q)===0?0:1)-(low(y).indexOf(q)===0?0:1); });
    items=list; dd.innerHTML='';
    try{ var card=document.querySelector('#payModal .pay-card'), cs=getComputedStyle(card); dd.style.background=cs.backgroundColor; dd.style.color=cs.color; }catch(e){}
    if(!list.length){ var d=document.createElement('div'); d.className='dd-none'; d.textContent='Eşleşen müşteri yok'; dd.appendChild(d); hi=-1; }
    else{
      var cur=low(inp.value.trim()); hi=-1;
      list.forEach(function(n,i){ var d=document.createElement('div'); d.className='dd-it'; d.textContent=n; d.setAttribute('role','option');
        if(low(n)===cur){ d.classList.add('sel'); }
        d.addEventListener('mousedown', function(e){ e.preventDefault(); pick(n); });
        dd.appendChild(d); });
    }
    show();
  }
  function mark(){ Array.prototype.forEach.call(dd.querySelectorAll('.dd-it'), function(d,i){ d.classList.toggle('on', i===hi); if(i===hi) d.scrollIntoView({block:'nearest'}); }); }
  function close(){ isOpen=false; hi=-1; dd.classList.remove('open'); arrow.classList.remove('open'); clearTimeout(hideT); hideT=setTimeout(function(){ if(!isOpen) dd.hidden=true; }, 200); }
  function pick(n){
    inp.value=n; try{ inp.setSelectionRange(n.length,n.length); }catch(e){}
    var ev; try{ ev=new InputEvent('input',{bubbles:true,inputType:'deleteByCut'}); }catch(e){ ev=new Event('input',{bubbles:true}); }
    picking=true; close();
    inp.dispatchEvent(ev); inp.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(function(){ picking=false; },50);
  }
  inp.addEventListener('input', function(){ if(picking) return; setTimeout(render,0); });
  inp.addEventListener('focus', function(){ setTimeout(render,0); });
  inp.addEventListener('click', function(){ if(!isOpen) render(); });
  inp.addEventListener('blur', function(){ setTimeout(close,150); });
  inp.addEventListener('keydown', function(e){
    if(e.key==='ArrowDown' || e.key==='ArrowUp'){ if(!isOpen) render(); if(items.length){ hi=(hi+(e.key==='ArrowDown'?1:-1)+items.length)%items.length; if(hi<0) hi=0; mark(); } e.preventDefault(); }
    else if(e.key==='Enter' && isOpen && hi>=0 && items[hi]){ e.preventDefault(); e.stopPropagation(); pick(items[hi]); }
    else if(e.key==='Escape' && isOpen){ e.preventDefault(); e.stopPropagation(); close(); }
  }, true);
  new MutationObserver(function(){ if(!document.getElementById('payModal').classList.contains('open')){ if(isOpen) close(); } else setTimeout(place, 50); }).observe(document.getElementById('payModal'),{attributes:true,attributeFilter:['class']});
})();
} catch (e) { console.warn('ui-polish: pmCustDdJs', e); }

/* ==== recNoteEnter ==== */
try {
(function(){
  var t=document.getElementById('recordNote'); if(!t) return;
  t.addEventListener('keydown', function(e){
    if(e.key!=='Enter' || e.isComposing) return;
    if(e.shiftKey && !e.ctrlKey && !e.metaKey) return;          // Shift+Enter: tarayıcı alt satıra geçer
    e.preventDefault(); e.stopPropagation();
    if(e.ctrlKey || e.metaKey){                                  // Ctrl+Enter: alt satır
      var a=t.selectionStart, b=t.selectionEnd, v=t.value;
      t.value=v.slice(0,a)+'\n'+v.slice(b); t.selectionStart=t.selectionEnd=a+1;
      t.dispatchEvent(new Event('input',{bubbles:true}));
      return;
    }
    var btn=document.getElementById('recordSubmitBtn'); if(btn) btn.focus();   // yalnız Enter: Siparişi kaydet tuşuna geç
  }, true);
})();
} catch (e) { console.warn('ui-polish: recNoteEnter', e); }

/* ==== homeFixedScrollJs ==== */
try {
(function(){
  var t=null;
  function fit(){
    var hc=document.querySelector('.home-content'), pr=document.getElementById('panelRecent'); if(!hc||!pr) return;
    var pc=document.getElementById('panelCustomer');
    var on=(hc.classList.contains('recent-mode') && pr.classList.contains('active')) || (hc.classList.contains('cust-mode') && pc && pc.classList.contains('active'));
    if(!on || window.innerWidth<761 || hc.offsetParent===null){ return; }
    if(window.scrollY) window.scrollTo(0,0);
    var h=Math.max(260, Math.floor(window.innerHeight - hc.getBoundingClientRect().top - 14));
    hc.style.setProperty('--hrh', h+'px');
  }
  function later(){ clearTimeout(t); t=setTimeout(fit,40); }
  window.addEventListener('resize', later);
  var hc=document.querySelector('.home-content'), pr=document.getElementById('panelRecent'), ms=document.getElementById('mainScreen');
  [hc,pr,ms,document.getElementById('panelCustomer')].forEach(function(e){ if(e) new MutationObserver(later).observe(e,{attributes:true,attributeFilter:['class','style','hidden']}); });
  new MutationObserver(later).observe(document.documentElement,{attributes:true,attributeFilter:['data-skin','data-theme']});
  var l=document.getElementById('homeRecentList'); if(l) new MutationObserver(later).observe(l,{childList:true});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(later);
  later(); setTimeout(fit,600);
})();
} catch (e) { console.warn('ui-polish: homeFixedScrollJs', e); }

/* ==== a11yFix ==== */
try {
(function(){function f(){var m={importFile:'Yedek dosyası seç',archFile:'Arşiv dosyası seç',abEmail:'E-posta adresi',importBtn:'Yedeği yükle: yedekteki kayıtları geri yükle'};for(var k in m){var e=document.getElementById(k);if(e&&e.getAttribute('aria-label')!==m[k])e.setAttribute('aria-label',m[k]);}}
f();document.addEventListener('DOMContentLoaded',f);setTimeout(f,800);setTimeout(f,3000);})();
} catch (e) { console.warn('ui-polish: a11yFix', e); }
