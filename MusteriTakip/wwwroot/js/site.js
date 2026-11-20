/* Müşteri Takip — tarayıcı tarafı: tema, canlı kur, resim sıkıştırma + filigran, form hesapları */
(function () {
    'use strict';
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var trNum = function (v, d) { return (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }); };
    var money = function (v) { return trNum(v, 2) + ' $'; };
    var tl = function (v) { return trNum(v, 2) + ' ₺'; };
    var num = function (el) { if (!el) return null; var s = String(el.value).trim().replace(',', '.'); if (s === '') return null; var n = parseFloat(s); return isNaN(n) ? null : n; };
    var store = {
        get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
    };

    // ---------------- Görünüm: koyu mod, menü, tema, yazı boyutu ----------------
    var html = document.documentElement;
    // Koyu / açık görünüm (üst çubuktaki ay/güneş düğmesi)
    var MOON = '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path></svg>';
    var SUN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    var modeBtn = $('#modeBtn'), fmMode = $('#fmMode');
    function syncModeBtn() {
        var dark = html.getAttribute('data-theme') === 'dark';
        if (modeBtn) modeBtn.textContent = dark ? '☀️' : '🌙';
        if (fmMode) { fmMode.innerHTML = dark ? SUN : MOON; fmMode.title = dark ? 'Açık görünüme geç' : 'Koyu görünüme geç'; }
    }
    function toggleMode() {
        var dark = html.getAttribute('data-theme') !== 'dark';
        html.setAttribute('data-theme', dark ? 'dark' : 'light');
        store.set('mt_mode', dark ? 'dark' : 'light');
        syncModeBtn();
    }
    syncModeBtn();
    if (modeBtn) modeBtn.addEventListener('click', toggleMode);
    if (fmMode) fmMode.addEventListener('click', toggleMode);

    // Sol menü: daralt / genişlet (HTML: fmBurger, mt_fmcol)
    var burger = $('#fmBurger');
    if (burger) {
        burger.title = html.classList.contains('fm-col') ? 'Menüyü aç' : 'Menüyü daralt';
        burger.addEventListener('click', function () {
            var c = html.classList.toggle('fm-col');
            burger.title = c ? 'Menüyü aç' : 'Menüyü daralt';
            store.set('mt_fmcol', c ? '1' : '0');
        });
    }
    // Menü grupları (Müşteriler, Kasa): başlığa tıklayınca aç/kapat; o bölümde değilsek ilk sayfasına git
    $$('#fmSide .fm-ghead').forEach(function (h) {
        h.addEventListener('click', function () {
            var g = h.parentNode;
            if (html.classList.contains('fm-col') || !g.classList.contains('act')) { location.href = h.dataset.href; return; }
            g.classList.toggle('open');
        });
    });
    // Sol menüde tıklama "nabız" efekti
    $$('#fmSide .fm-item, #fmSide .fm-ghead').forEach(function (t) {
        t.addEventListener('click', function () {
            var el = t.classList.contains('fm-ghead') ? t.parentNode : t;
            el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
            setTimeout(function () { el.classList.remove('pulse'); }, 520);
        });
    });
    // Kullanıcı menüsü (sağ üst)
    var fmUser = $('#fmUser');
    if (fmUser) {
        fmUser.addEventListener('click', function (e) { if (e.target.closest('form')) return; fmUser.classList.toggle('open'); });
        document.addEventListener('click', function (e) { if (!fmUser.contains(e.target)) fmUser.classList.remove('open'); });
    }
    // Yedek durumu çipi (HTML: renderBkChip) — son yedek zamanı bu tarayıcıda tutulur
    var bk = $('#bkChip');
    function renderBkChip() {
        if (!bk) return;
        var last = Number(store.get('mt_last_backup')) || 0, age = Date.now() - last, days = Math.floor(age / 86400000), t, cls = '';
        if (!last) { t = 'hiç alınmadı'; cls = 'bad'; }
        else if (age < 3600000) t = 'az önce';
        else if (age < 86400000) t = 'bugün';
        else { t = days + ' gün önce'; cls = days >= 4 ? 'bad' : 'warn'; }
        $('#bkChipT').textContent = t; bk.className = 'bk-chip ' + cls;
        bk.title = last ? 'Son yedek: ' + new Date(last).toLocaleString('tr-TR') + ' — tıklayınca şimdi yedek alır' : 'Henüz yedek alınmadı — tıklayınca şimdi yedek alır';
    }
    $$('a[href*="/Backup/Export"]').forEach(function (a) { a.addEventListener('click', function () { store.set('mt_last_backup', String(Date.now())); setTimeout(renderBkChip, 50); }); });
    renderBkChip();
    // Sayfaya giden düğmeler (✎ düzenle vb.): <button data-href="..."> — HTML'deki düğme görünümü korunur
    document.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-href]');
        if (b && !b.closest('#fmSide') && !b.hasAttribute('data-modal')) { e.preventDefault(); e.stopPropagation(); location.href = b.dataset.href; }
    }, true);
    // İçerik alanı pencereyi doldursun, yalnızca liste kaysın (HTML: fitKasaHeight)
    function fitKasaHeight() {
        var hc = $('.home-content'); if (!hc) return;
        if (window.innerWidth <= 760) { hc.style.height = ''; hc.style.maxHeight = ''; return; }
        var avail = Math.max(420, window.innerHeight - hc.getBoundingClientRect().top - window.scrollY - 16) + 'px';
        hc.style.maxHeight = avail;
        hc.style.height = (hc.classList.contains('kasa-mode') || hc.classList.contains('exp-mode') || hc.classList.contains('cust-mode')) ? avail : '';
    }
    // Özet kutuları: rakamlar sığmazsa sütun sayısını azalt (HTML: fitStats)
    function fitStats() {
        $$('.kasa-stats').forEach(function (box) {
            if (!box.offsetParent) return;
            var full = box.classList.contains('cust-stats') ? [null, 'cols-1'] : [null, 'cols-2', 'cols-1'];
            for (var i = 0; i < full.length; i++) {
                box.classList.remove('cols-2', 'cols-1');
                if (full[i]) box.classList.add(full[i]);
                var overflow = $$('.amount', box).some(function (a) {
                    var cell = a.parentElement, cs = getComputedStyle(cell);
                    return a.scrollWidth > cell.clientWidth - (parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) + 0.5;
                });
                if (!overflow) break;
            }
        });
    }
    // Özet kutularının sol simgesi (HTML'de JS ile eklenir): Ciro, Tahsilat, Gider, diğerleri cüzdan
    (function () {
        var I = ['<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', '<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/>', '<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>', '<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l12-4v4"/>'];
        var BY = { 'Ciro': 0, 'Tahsilat': 1, 'Gider': 2 };
        $$('.kasa-stat').forEach(function (el) {
            if ($('.kt-ico', el)) return;
            var lb = ($('.label', el) || {}).textContent || '';
            var grp = el.closest('.kasa-gold-stats') || el.classList.contains('result') ? 3 : (BY[lb.trim()] !== undefined ? BY[lb.trim()] : 3);
            var sp = document.createElement('span'); sp.className = 'kt-ico';
            sp.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + I[grp] + '</svg>';
            el.insertBefore(sp, el.firstChild);
        });
    })();
    // ---- Liste sütun genişlikleri (HTML: measureRec, fitKasaCust, fitHistDesc, gider --tw) ----
    var cvs = document.createElement('canvas').getContext('2d');
    function textW(el) { var r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; }
    function measureRec() {
        var wrap = $('#recordsList'); if (!wrap) return;
        wrap.style.removeProperty('--rmw'); wrap.style.removeProperty('--pw');
        var names = $$('.rec-model .mname', wrap);
        if (!names.length || !names[0].offsetParent) return;
        var cs = getComputedStyle(names[0]); cvs.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        var mw = 0; names.forEach(function (n) { mw = Math.max(mw, cvs.measureText((n.textContent || '').trim()).width); });
        wrap.style.setProperty('--rmw', Math.max(60, Math.min(300, Math.ceil(mw) + 4)) + 'px');
        var pw = 0; $$('.pc-in', wrap).forEach(function (el) { pw = Math.max(pw, el.offsetWidth); });
        if (pw) wrap.style.setProperty('--pw', pw + 'px');
    }
    function fitKasaCust() {
        var wrap = $('#kasaList'); if (!wrap || !wrap.offsetParent) return;
        wrap.style.removeProperty('--kcust');
        var w = 0; $$('.hist-row .cust', wrap).forEach(function (el) { w = Math.max(w, textW(el)); });
        if (w) wrap.style.setProperty('--kcust', Math.min(Math.ceil(w) + 20, 280) + 'px');
        wrap.style.removeProperty('--kdesc');
        var dw = 0; $$('.hist-row .hist-desc', wrap).forEach(function (el) { dw = Math.max(dw, textW(el)); });
        wrap.style.removeProperty('--kamt');
        var aw = 0, amts = $$('.hist-row .hist-amount .amt-wrap', wrap);
        amts.forEach(function (el) { el.style.width = 'auto'; aw = Math.max(aw, el.scrollWidth, textW(el)); });
        amts.forEach(function (el) { el.style.removeProperty('width'); });
        if (aw) wrap.style.setProperty('--kamt', Math.ceil(aw) + 'px');
        wrap.style.setProperty('--kdesc', Math.max(60, Math.min(Math.ceil(dw) + 7, 420)) + 'px');
    }
    function fitHistDesc() {
        var hl = $('#historyList'), ds = hl ? $$('.hist-desc', hl) : [];
        if (ds.length && ds[0].offsetParent) {
            var cs = getComputedStyle(ds[0]); cvs.font = (cs.fontWeight || '600') + ' ' + cs.fontSize + ' ' + cs.fontFamily;
            var mw = 0;
            ds.forEach(function (d) {
                var dm = $('.desc-main', d), ps = dm ? [dm.textContent, ($('.desc-sub', d) || {}).textContent || ''] : [d.textContent || ''];
                ps.forEach(function (t, i) { mw = Math.max(mw, cvs.measureText(t.trim()).width * (i ? 0.82 : 1)); });
            });
            hl.style.setProperty('--dw', Math.max(60, Math.min(340, Math.ceil(mw) + 13)) + 'px');
        }
        $$('#historyList .hist-desc, #kasaList .hist-desc').forEach(function (el) {
            if (!el.offsetParent) return;
            el.style.fontSize = ''; el.style.whiteSpace = ''; el.style.lineHeight = ''; el.style.textOverflow = '';
            if ($('.desc-main', el)) { el.title = el.innerText.trim(); return; }
            var size = parseFloat(getComputedStyle(el).fontSize);
            while (el.scrollWidth > el.clientWidth + 0.5 && size > 11) { size -= 0.5; el.style.fontSize = size + 'px'; }
            if (el.scrollWidth > el.clientWidth + 0.5 && el.closest('#kasaList')) {
                el.style.whiteSpace = 'normal'; el.style.lineHeight = '1.15'; el.style.textOverflow = 'clip'; el.style.fontSize = '12px';
                if (el.scrollWidth > el.clientWidth + 0.5) el.style.fontSize = '11px';
            }
            el.title = el.textContent.trim();
        });
    }
    function fitExpType() {
        var wrap = $('#expenseList'); if (!wrap) return;
        var mw = 0; $$('.exp-type-in', wrap).forEach(function (el) { mw = Math.max(mw, el.offsetWidth); });
        wrap.style.setProperty('--tw', (mw ? mw + 2 : 0) + 'px');
    }
    function fitLists() { try { measureRec(); fitKasaCust(); fitHistDesc(); fitExpType(); } catch (e) { } }
    window.mtFitLists = fitLists;
    window.addEventListener('resize', function () { requestAnimationFrame(fitLists); });
    fitLists();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLists);
    window.mtFit = function () { fitKasaHeight(); fitStats(); fitLists(); };
    window.addEventListener('resize', window.mtFit);
    window.mtFit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitStats);
    // Kart küçültme (−) — HTML: "PANEL TASARIMI: kart küçültme"
    $$('.home-recent, .report-card').forEach(function (c) {
        if (c.querySelector(':scope > .card-min')) return;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'card-min'; b.textContent = '−'; b.title = 'Küçült / aç';
        b.addEventListener('click', function () { c.classList.toggle('collapsed'); b.textContent = c.classList.contains('collapsed') ? '+' : '−'; });
        var hd = c.querySelector(':scope > .report-head, :scope > .records-head');
        if (hd) hd.insertBefore(b, hd.firstChild); else c.appendChild(b);
    });
    // Ctrl+K: genel arama kutusuna odaklan
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { var g = $('#gsInput'); if (g) { e.preventDefault(); g.focus(); g.select(); } }
    });
    $$('[data-fs]').forEach(function (b) {
        if (b.tagName !== 'BUTTON') return;
        var cur = store.get('mt_fs') || 'n';
        b.classList.toggle('active', b.dataset.fs === cur);
        b.addEventListener('click', function () {
            var f = b.dataset.fs;
            if (f === 'n') html.removeAttribute('data-fs'); else html.setAttribute('data-fs', f);
            store.set('mt_fs', f);
            $$('button[data-fs]').forEach(function (x) { x.classList.toggle('active', x === b); });
        });
    });

    // ---------------- Onay soran formlar ----------------
    document.addEventListener('submit', function (e) {
        var f = e.target;
        if (f.dataset.confirm && !window.confirm(f.dataset.confirm)) { e.preventDefault(); return; }
        if (f.dataset.confirmIf) {
            var cb = document.getElementById(f.dataset.confirmIf);
            if (cb && cb.checked && !window.confirm(f.dataset.confirmText || 'Emin misiniz?')) e.preventDefault();
        }
    }, true);

    // ---------------- Resim büyütme ----------------
    var modal = $('#imgModal');
    if (modal) {
        document.addEventListener('click', function (e) {
            var img = e.target.closest('[data-zoom]');
            if (!img) return;
            $('#imgModalImg').src = img.src;
            $('#imgModalCap').textContent = img.dataset.caption || '';
            modal.classList.add('open');
        });
        modal.addEventListener('click', function (e) { if (e.target === modal || e.target.classList.contains('modal-close')) modal.classList.remove('open'); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') modal.classList.remove('open'); });
    }

    // ---------------- Canlı Dolar / Gram Altın ----------------
    var LT_KEY = 'mt_live_ticker';
    async function fetchJson(url, ms) {
        var ctrl = new AbortController();
        var t = setTimeout(function () { ctrl.abort(); }, ms || 8000);
        try {
            var res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } finally { clearTimeout(t); }
    }
    function ltNum(v) { if (v === undefined || v === null) return null; if (typeof v === 'number') return v; var s = String(v).replace(/[^0-9.,]/g, ''); if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); var n = parseFloat(s); return isNaN(n) ? null : n; }
    function ltPair(o) { return o ? [ltNum(o.Buying !== undefined ? o.Buying : o['Alış']), ltNum(o.Selling !== undefined ? o.Selling : o['Satış'])] : [null, null]; }
    async function fetchLiveTicker() {
        var ok = function (q) { return q && q[0] > 0 && q[1] > 0; };
        var sources = [
            async function () { var j = await fetchJson('https://finans.truncgil.com/today.json'); return { usd: ltPair(j.USD), eur: ltPair(j.EUR), gold: ltPair(j['gram-altin'] || j.GRA) }; },
            async function () { var j = await fetchJson('https://finans.truncgil.com/v4/today.json'); return { usd: ltPair(j.USD), eur: ltPair(j.EUR), gold: ltPair(j.GRA || j['gram-altin']) }; },
            async function () {
                var j = await fetchJson('https://data-api.binance.vision/api/v3/ticker/bookTicker?symbols=' + encodeURIComponent('["USDTTRY","PAXGUSDT","EURUSDT"]'));
                var u = j.find(function (x) { return x.symbol === 'USDTTRY'; }), g = j.find(function (x) { return x.symbol === 'PAXGUSDT'; });
                var ub = Number(u.bidPrice), ua = Number(u.askPrice), gb = Number(g.bidPrice), ga = Number(g.askPrice), OZ = 31.1034768;
                var e = j.find(function (x) { return x.symbol === 'EURUSDT'; });
                return { usd: [ub, ua], eur: e ? [Number(e.bidPrice) * ub, Number(e.askPrice) * ua] : [null, null], gold: [gb * ub / OZ, ga * ua / OZ] };
            }
        ];
        for (var i = 0; i < sources.length; i++) {
            try { var r = await sources[i](); if (ok(r.usd) && ok(r.gold)) { r.at = Date.now(); return r; } } catch (e) { }
        }
        return null;
    }
    function setLt(id, v, prev) {
        var el = document.getElementById(id); if (!el) return;
        el.textContent = v > 0 ? trNum(v, id.indexOf('Gold') >= 0 ? 2 : 4) : '—';
        el.classList.remove('up', 'down');
        if (prev > 0 && v > 0 && v !== prev) el.classList.add(v > prev ? 'up' : 'down');
    }
    function renderTicker(d, stale) {
        var p = window.__mtLT;
        setLt('ltUsdBuy', d.usd[0], p && p.usd[0]); setLt('ltUsdSell', d.usd[1], p && p.usd[1]);
        var pe = (p && p.eur) || [];
        if (d.eur) { setLt('ltEurBuy', d.eur[0], pe[0]); setLt('ltEurSell', d.eur[1], pe[1]); }
        setLt('ltGoldBuy', d.gold[0], p && p.gold[0]); setLt('ltGoldSell', d.gold[1], p && p.gold[1]);
        var box = $('#liveTicker'); if (box) box.classList.toggle('stale', !!stale);
        window.__mtLT = d;
        // Sipariş formundaki gizli alanlar (kayıt anındaki kur/altın)
        $$('[data-live="usd"]').forEach(function (i) { if (!i.value) i.value = (Math.round(d.usd[1] * 10000) / 10000).toString(); });
        $$('[data-live="gold"]').forEach(function (i) { if (!i.value) i.value = (Math.round(d.gold[1] * 100) / 100).toString(); });
        // Kalan altının bugünkü karşılığı
        $$('[data-gold-value]').forEach(function (el) {
            var gr = parseFloat(el.dataset.goldValue) || 0;
            if (Math.abs(gr) < 0.0005 || !(d.gold[0] > 0)) { el.textContent = ''; return; }
            var t = gr * d.gold[0], usd = d.usd[1] > 0 ? t / d.usd[1] : null;
            el.textContent = '≈ ' + (usd !== null ? money(usd) + ' · ' : '') + tl(t);
        });
        document.dispatchEvent(new CustomEvent('mt:ticker'));
    }
    async function refreshTicker() {
        var d = await fetchLiveTicker();
        if (d) { renderTicker(d, false); store.set(LT_KEY, JSON.stringify(d)); store.set('mt_last_rate', JSON.stringify({ rate: d.usd[1], at: d.at })); }
        return d;
    }
    try { var cached = JSON.parse(store.get(LT_KEY) || 'null'); if (cached && cached.usd) renderTicker(cached, true); } catch (e) { }
    if ($('#liveTicker')) { refreshTicker(); setInterval(function () { if (!document.hidden) refreshTicker(); }, 60000); }

    async function liveData() {
        var d = window.__mtLT;
        if (!(d && d.at && Date.now() - d.at < 90000)) d = (await refreshTicker()) || window.__mtLT;
        return d;
    }
    // ---------------- Resim: sıkıştır, (sipariş resminde) filigran ekle ----------------
    function readFile(file) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(file); }); }
    function compressImage(dataUrl, maxSide, quality) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () {
                var scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
                var w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
                try {
                    var c = document.createElement('canvas'); c.width = w; c.height = h;
                    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
                    var out = c.toDataURL('image/jpeg', quality || 0.9);
                    resolve(out.length < dataUrl.length || scale < 1 ? out : dataUrl);
                } catch (e) { resolve(dataUrl); }
            };
            img.onerror = function () { resolve(dataUrl); };
            img.src = dataUrl;
        });
    }

    // HTML sürümündeki filigran: marka + model kodu, 25° eğik, fotoğrafa dağılmış, parlaklığa göre koyu/açık renk
    function watermarkImage(dataUrl, wmText, brand) {
        return new Promise(function (resolve) {
            wmText = String(wmText || '').trim();
            if (!wmText || !/^data:image\//i.test(dataUrl || '')) { resolve(dataUrl); return; }
            var img = new Image();
            img.onload = function () {
                try {
                    var w = img.naturalWidth, h = img.naturalHeight;
                    if (!w || !h) { resolve(dataUrl); return; }
                    var BR = brand || 'ARTE DESIGN', SER = 'Georgia,"Times New Roman",serif';
                    var rad = 25 * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
                    var M = Math.max(6, Math.round(Math.min(w, h) * 0.008));
                    var base = document.createElement('canvas'); base.width = w; base.height = h;
                    var bg = base.getContext('2d'); bg.drawImage(img, 0, 0, w, h);
                    // yerel (bulanık) parlaklık haritası
                    var sw = Math.max(8, Math.round(w / 24)), sh = Math.max(8, Math.round(h / 24));
                    var sm = document.createElement('canvas'); sm.width = sw; sm.height = sh;
                    var sg = sm.getContext('2d'); sg.imageSmoothingQuality = 'high'; sg.drawImage(img, 0, 0, sw, sh);
                    var mid = document.createElement('canvas'); mid.width = sw * 2; mid.height = sh * 2;
                    var mg = mid.getContext('2d'); mg.imageSmoothingQuality = 'high'; mg.drawImage(sm, 0, 0, sw * 2, sh * 2);
                    var lc = document.createElement('canvas'); lc.width = w; lc.height = h;
                    var lg = lc.getContext('2d'); lg.imageSmoothingQuality = 'high'; lg.drawImage(mid, 0, 0, w, h);
                    var L = lg.getImageData(0, 0, w, h).data;
                    // yazı maskesi
                    var mk = document.createElement('canvas'); mk.width = w; mk.height = h;
                    var x = mk.getContext('2d');
                    x.fillStyle = '#000'; x.strokeStyle = '#000'; x.textAlign = 'center'; x.textBaseline = 'middle';
                    var measure = function (K) {
                        var u = w * 0.034 * K; x.font = '700 ' + u + 'px ' + SER; var tw = x.measureText(BR).width;
                        return { u: u, hw: (tw * cs + u * 0.8 * sn) / 2 + w * 0.012 * K, hh: (tw * sn + u * 0.8 * cs) / 2 + w * 0.02 * K };
                    };
                    var K = 1.45, mm = measure(K);
                    for (var n = 0; n < 40; n++) {
                        var rx = w / 2 - M - mm.hw, ry = h / 2 - M - mm.hh;
                        if (rx >= 1.55 * mm.hw && ry >= 1.7 * mm.hh) break;
                        K *= 0.96; mm = measure(K);
                    }
                    var u = mm.u, hw = mm.hw, hh = mm.hh;
                    var fBR = '700 ' + u + 'px ' + SER, fCD = '600 ' + (w * 0.02 * K) + 'px ' + SER;
                    var cx = w / 2, cy = h / 2;
                    var roomX = Math.max(0, w / 2 - M - hw), roomY = Math.max(0, h / 2 - M - hh);
                    var kx = Math.max(1, Math.floor(roomX / Math.max(1.55 * hw, roomY * 1.0)));
                    var ky = Math.max(1, Math.floor(roomY / Math.max(1.7 * hh, roomX * 1.0)));
                    var dx = roomX > 0 ? roomX / kx : w, dy = roomY > 0 ? roomY / ky : h;
                    var lw = Math.max(1.2, w / 900), L2 = w * 0.08 * K;
                    var put = function (px, py) {
                        x.save(); x.translate(px, py); x.rotate(-rad);
                        x.lineWidth = lw; x.beginPath();
                        x.moveTo(-L2, -w * 0.03 * K); x.lineTo(L2, -w * 0.03 * K); x.moveTo(-L2, w * 0.032 * K); x.lineTo(L2, w * 0.032 * K); x.stroke();
                        x.font = fBR; x.fillText(BR, 0, -w * 0.004 * K);
                        x.font = fCD; x.fillText(wmText, w * 0.008 * K, w * 0.02 * K);
                        x.restore();
                    };
                    for (var j = -ky; j <= ky; j++) {
                        var py = cy + j * dy; if (py - hh < M - 1 || py + hh > h - M + 1) continue;
                        for (var i = -kx; i <= kx; i++) {
                            var px = cx + i * dx;
                            if (px - hw < M - 1 || px + hw > w - M + 1) continue;
                            put(px, py);
                        }
                    }
                    var A = x.getImageData(0, 0, w, h).data;
                    var im = bg.getImageData(0, 0, w, h), D = im.data;
                    for (var k = 0; k < D.length; k += 4) {
                        var a = A[k + 3]; if (!a) continue;
                        var lum = L[k] / 255 * 0.2126 + L[k + 1] / 255 * 0.7152 + L[k + 2] / 255 * 0.0722;
                        var t = (lum - 0.45) / 0.08; t = t < 0 ? 0 : t > 1 ? 1 : t; t = t * t * (3 - 2 * t);
                        var cr = 255 + (50 - 255) * t; // parlakta koyu gri, koyuda beyaz
                        var boost = 1 + 0.7 * Math.max(0, 1 - Math.abs(lum - 0.5) / 0.3);
                        var op = Math.min(0.30, (0.10 + 0.08 * t) * boost) * (a / 255);
                        D[k] += (cr - D[k]) * op; D[k + 1] += (cr - D[k + 1]) * op; D[k + 2] += (cr - D[k + 2]) * op;
                    }
                    bg.putImageData(im, 0, 0);
                    resolve(base.toDataURL('image/jpeg', 0.9));
                } catch (e) { resolve(dataUrl); }
            };
            img.onerror = function () { resolve(dataUrl); };
            img.src = dataUrl;
        });
    }

    // ---------------- Formlar (sayfa açılışında ve pencerede yüklenen formlarda çalışır) ----------------
    function initForms(root) {
        root = root || document;
        // Yazılan metin büyük harfe (Türkçe kurala göre) — HTML: modelUpperJs
        $('[data-upper]', root).forEach(function (el) {
            el.addEventListener('input', function () { var p = el.selectionStart, u = el.value.toLocaleUpperCase('tr-TR'); if (u !== el.value) { el.value = u; try { el.setSelectionRange(p, p); } catch (e) { } } });
        });
        // "Güncel kur" düğmeleri: data-live-rate="hedefId" (boşsa aynı alandaki number input)
        $$('[data-live-rate]', root).forEach(function (b) {
            b.addEventListener('click', async function () {
                var target = b.dataset.liveRate ? document.getElementById(b.dataset.liveRate) : b.parentElement.querySelector('input[type=number]');
                b.disabled = true; var old = b.textContent; b.textContent = '…';
                var d = await liveData();
                b.disabled = false; b.textContent = old;
                if (d && d.usd[1] > 0 && target) { target.value = (Math.round(d.usd[1] * 10000) / 10000).toString(); target.dispatchEvent(new Event('input', { bubbles: true })); }
                else alert('Güncel kur alınamadı. Kuru elle yazın.');
            });
        });
        // "Canlı gr/$" düğmeleri: gram altın (TL) ÷ dolar = $/gr
        $$('[data-live-gold-usd]', root).forEach(function (b) {
            b.addEventListener('click', async function () {
                var target = b.dataset.liveGoldUsd ? document.getElementById(b.dataset.liveGoldUsd) : b.parentElement.querySelector('input[type=number]');
                var d = await liveData();
                if (d && d.gold[0] > 0 && d.usd[1] > 0 && target) { target.value = (Math.round(d.gold[0] / d.usd[1] * 100) / 100).toString(); target.dispatchEvent(new Event('input', { bubbles: true })); }
                else alert('Canlı altın fiyatı alınamadı. Fiyatı elle yazın.');
            });
        });


        $$('[data-image-input]', root).forEach(function (inp) {
            inp.addEventListener('change', async function () {
                var f = inp.files && inp.files[0]; if (!f) return;
                var form = inp.closest('form');
                var hidden = form.querySelector('[name="' + inp.dataset.imageInput + '"]');
                var raw = await compressImage(await readFile(f), parseInt(inp.dataset.max, 10) || 1600, 0.9);
                if (inp.hasAttribute('data-watermark')) { form.__rawImage = raw; hidden.value = ''; }
                else hidden.value = raw;
                var thumb = form.querySelector('[data-thumb]');
                if (thumb) thumb.innerHTML = '<img src="' + raw + '" alt="">';
                var rm = form.querySelector('[name="RemoveImage"][type=checkbox]'); if (rm) rm.checked = false;
            });
        });

        // ---------------- Sipariş formu: otomatik hesap (HTML'deki recalcForm) ----------------
        var of = $('[data-order-form]', root);
        if (of) {
            var F = {}; $$('[data-calc]', of).forEach(function (el) { if (el.dataset.calc !== 'exp') F[el.dataset.calc] = el; });
            var setMum = parseFloat(of.dataset.setMum) || 0, setGumus = parseFloat(of.dataset.setGumus) || 0, setAltin = parseFloat(of.dataset.setAltin) || 0;
            var autoPrice = false;
            var setMoney = function (el, v) { el.value = v === null ? '' : (Math.round(v * 100) / 100).toFixed(2); };
            var expSum = function () { return $$('.rx-a', of).reduce(function (t, i) { return t + (num(i) || 0); }, 0); };
            var recalc = function (changed) {
                if (changed === 'mumGr' && setMum > 0) setMoney(F.mumUsd, num(F.mumGr) === null ? null : num(F.mumGr) * setMum);
                if (changed === 'gumusGr' && setGumus > 0) setMoney(F.gumusUsd, num(F.gumusGr) === null ? null : num(F.gumusGr) * setGumus);
                if (changed === 'altinGr' && setAltin > 0) setMoney(F.altinUsd, num(F.altinGr) === null ? null : num(F.altinGr) * setAltin);
                if (changed === 'altinGr' || changed === 'milyem') {
                    var g = num(F.altinGr), m = num(F.milyem);
                    F.cikis.value = (g === null || m === null) ? '' : (Math.floor(g * m + 1e-9) / 1000).toFixed(3);
                }
                var hint = $('#kindHint');
                if (hint) hint.innerHTML = (num(F.altinGr) !== null && num(F.milyem) !== null) ? 'Bu sipariş <b>Altın</b> olarak kaydedilecek.' : 'Altın gr ve milyem girilmediği için <b>Kalıp</b> olarak kaydedilecek.';
                if (changed === 'price') return;
                var parts = [F.cizim, F.altinUsd, F.mumUsd, F.gumusUsd].map(num);
                var ex = expSum();
                var any = parts.some(function (v) { return v !== null; }) || ex > 0;
                var sum = parts.reduce(function (t, v) { return t + (v || 0); }, 0) + ex;
                var note = $('#calcNote');
                // Fiyat bir üst tam dolara yuvarlanır (örn. 271,62 → 272)
                if (any) { F.price.value = String(Math.ceil(sum - 1e-9)); autoPrice = true; if (note) note.textContent = 'Parçalar + masraflar = ' + money(sum) + ' → ' + money(Math.ceil(sum - 1e-9)); }
                else if (autoPrice) { F.price.value = ''; autoPrice = false; if (note) note.textContent = ''; }
            };
            of.addEventListener('input', function (e) {
                var k = e.target.dataset ? e.target.dataset.calc : null;
                if (!k) return;
                if (k === 'price') { autoPrice = false; return; }
                recalc(k === 'exp' ? 'exp' : k);
            });
            ['mumGr', 'gumusGr'].forEach(function (k) {
                if (F[k]) F[k].addEventListener('blur', function () { var v = num(F[k]); if (v !== null) F[k].value = (Math.floor(v * 1000 + 1e-9) / 1000).toFixed(3); });
            });
            recalc('init');

            // masraf satırları
            var box = $('#recExps', of);
            var rowHtml = function () { return '<div class="rec-exp-row"><input type="text" class="rx-d" spellcheck="true" lang="tr" placeholder="Masraf açıklaması" aria-label="Masraf açıklaması"><input type="number" class="rx-a" min="0" step="0.01" placeholder="0,00 $" aria-label="Masraf tutarı ($)" data-calc="exp"><button type="button" class="rx-x" title="Satırı sil" aria-label="Satırı sil">✕</button></div>'; };
            $('#recExpAdd', of).addEventListener('click', function () { box.insertAdjacentHTML('beforeend', rowHtml()); var d = $$('.rx-d', box); d[d.length - 1].focus(); });
            box.addEventListener('click', function (e) {
                var b = e.target.closest('.rx-x'); if (!b) return;
                b.parentElement.remove();
                if (!box.children.length) box.insertAdjacentHTML('beforeend', rowHtml());
                recalc('exp');
            });

            // kaydederken: masraf adlarını sırala, resme filigran ekle
            of.addEventListener('submit', async function (e) {
                $$('.rec-exp-row', box).forEach(function (r, i) {
                    r.querySelector('.rx-d').name = 'Expenses[' + i + '].Desc';
                    r.querySelector('.rx-a').name = 'Expenses[' + i + '].Amount';
                });
                if (of.__rawImage && !of.__done) {
                    e.preventDefault();
                    var cc = ($('[data-code-cust]', of).value || '').trim().toLocaleUpperCase('tr-TR');
                    var no = ($('[data-code-no]', of).value || '').replace(/\D/g, '');
                    if (no) no = ('0000' + parseInt(no, 10)).slice(-Math.max(4, String(parseInt(no, 10)).length));
                    var code = cc ? cc + (no ? '-' + no : '') : '';
                    var data = code ? await watermarkImage(of.__rawImage, code, of.dataset.brand) : of.__rawImage;
                    of.querySelector('[name="ImageData"]').value = data;
                    of.__done = true;
                    of.submit();
                }
            });
        }

        // ---------------- Ödeme formu ----------------
        var pf = $('[data-pay-form]', root);
        if (pf) {
            var kindSel = $('[data-pm-kind]', pf), typeSel = $('[data-pm-type]', pf);
            var P = {}; $$('[data-pm]', pf).forEach(function (el) { P[el.dataset.pm] = el; });
            var cash = $('[data-pm-cash]', pf);
            var amountTouched = false;
            var sync = function () {
                var kind = kindSel.value, type = kind === 'Kalıp' ? 'kalip' : typeSel.value;
                $$('[data-show-kind]', pf).forEach(function (el) { el.hidden = el.dataset.showKind !== kind; });
                $$('[data-show-type]', pf).forEach(function (el) {
                    var okT = el.dataset.showType.split(' ').indexOf(type) >= 0;
                    if (el.dataset.showKind) okT = okT && el.dataset.showKind === kind;
                    el.hidden = !okT;
                });
                $$('[data-hide-type]', pf).forEach(function (el) { el.hidden = el.dataset.hideType === type; });
                var eq = $('[data-goldeq]', pf); if (eq && cash) eq.hidden = cash.checked;
            };
            var calc = function (changed) {
                var type = kindSel.value === 'Kalıp' ? 'kalip' : typeSel.value, out = $('#pmCalc'), has = null;
                if (type === 'hurda') {
                    var hg = num(P.hurdaGr), hm = num(P.hurdaMil);
                    has = (hg > 0 && hm > 0) ? Math.floor(hg * hm + 1e-9) / 1000 : null;
                    $('#pmHasShow').textContent = has !== null ? trNum(has, 3) + ' gr' : '—';
                }
                if (type === 'gr') has = num(P.gram);
                if ((type === 'gr' || type === 'hurda') && !amountTouched) {
                    var gp = num(P.goldPrice);
                    if (has > 0 && gp > 0) { P.amount.value = (Math.round(has * gp * 100) / 100).toFixed(2); out.textContent = trNum(has, 3) + ' gr × ' + money(gp) + ' = ' + money(has * gp) + ' (altın hesabına işlenir)'; }
                    else out.textContent = 'Has altın ödemesi müşterinin altın hesabından düşer; tutar bilgi amaçlıdır.';
                } else if (type === 'tl' && !amountTouched) {
                    var t = num(P.tl), r = num(P.rate);
                    if (t > 0 && r > 0) { P.amount.value = (Math.round(t / r * 100) / 100).toFixed(2); out.textContent = tl(t) + ' ÷ ' + trNum(r, 4) + ' = ' + money(t / r); }
                    else out.textContent = "Dolar karşılığı için kuru girin ya da “Güncel kur”a basın.";
                } else if (type !== 'gr' && type !== 'hurda' && type !== 'tl') out.textContent = '';
                var eqOut = $('#pmEq');
                if (eqOut && P.goldEqPrice) {
                    var a = num(P.amount), gpq = num(P.goldEqPrice), rem = parseFloat(pf.dataset.goldRemaining) || 0;
                    eqOut.textContent = (a > 0 && gpq > 0) ? '≈ ' + trNum(Math.min(Math.round(a / gpq * 1000) / 1000, rem), 3) + ' gr altın borcundan düşülür' : '';
                }
            };
            pf.addEventListener('input', function (e) {
                if (e.target === P.amount) { amountTouched = P.amount.value !== ''; calc('amount'); return; }
                if (e.target.dataset && e.target.dataset.pm) { if (e.target.dataset.pm !== 'goldEqPrice' && e.target.dataset.pm !== 'rate') amountTouched = false; if (e.target.dataset.pm === 'rate') amountTouched = false; calc(e.target.dataset.pm); }
            });
            pf.addEventListener('change', function (e) { if (e.target === kindSel || e.target === typeSel || e.target === cash) { amountTouched = false; sync(); calc(); } });
            amountTouched = !!(P.amount && P.amount.value);
            sync(); calc();
            // TL / Dolar ödemede kur boşsa canlı kuru yaz
            document.addEventListener('mt:ticker', function () { if (P.rate && !P.rate.value && (typeSel.value === 'tl' || typeSel.value === 'usd') && window.__mtLT) { P.rate.value = (Math.round(window.__mtLT.usd[1] * 10000) / 10000).toString(); calc('rate'); } });
            if (window.__mtLT && P.rate && !P.rate.value) document.dispatchEvent(new CustomEvent('mt:ticker'));
        }

        // ---------------- Gider formu: ₺ ÷ kur = $ önizleme ----------------
        var ef = $('[data-expense-form]', root);
        if (ef) {
            var ea = $('[data-exp="amount"]', ef), er = $('[data-exp="rate"]', ef), ep = $('#expenseUsdPreview');
            var autoRate = null;
            var prev = function () {
                var a = num(ea), r = num(er);
                if (a !== null && a >= 0 && r > 0) ep.textContent = '= ' + money(a / r);
                else ep.textContent = autoRate && String(r) === String(autoRate) ? 'Canlı kur otomatik alındı: ' + trNum(autoRate, 2) + ' (üst çubuk · Satış)' : '';
            };
            ef.addEventListener('input', prev);
            var fill = function () { if (!er.value && window.__mtLT && window.__mtLT.usd[1] > 0) { autoRate = Math.round(window.__mtLT.usd[1] * 10000) / 10000; er.value = autoRate.toString(); prev(); } };
            document.addEventListener('mt:ticker', fill); fill(); prev();
        }
    }
    window.mtInitForms = initForms;
    initForms(document);

    // ---------------- Açılır pencere formları (HTML'deki .confirm-modal) ----------------
    // data-modal işaretli bağlantılar sayfayı değiştirmeden formu sunucudan alıp pencere olarak açar.
    // Sayfa doğrudan açıldıysa (ör. kayıt hatası sonrası) pencere zaten açık gelir; kapatınca geri dönülür.
    function wireModal(m, injected) {
        if (m.__wired) return; m.__wired = true;
        function close() {
            if (injected) { m.classList.remove('open'); setTimeout(function () { m.remove(); }, 200); }
            else if (m.dataset.back) location.href = m.dataset.back;
            else history.back();
        }
        m.addEventListener('click', function (e) {
            if (e.target === m || e.target.closest('.x-close, [data-close]')) { e.preventDefault(); close(); }
        });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape' && document.contains(m) && m.classList.contains('open')) { close(); if (injected) document.removeEventListener('keydown', esc); }
        });
        var first = m.querySelector('[autofocus], input:not([type=hidden]):not([type=file]):not([readonly]), select');
        if (first) setTimeout(function () { try { first.focus(); } catch (e) { } }, 60);
    }
    $$('.confirm-modal[data-standalone]').forEach(function (m) { wireModal(m, false); });

    // Resmi kaldır (×) — sipariş / müşteri resmi
    document.addEventListener('click', function (e) {
        var x = e.target.closest('.thumb-x'); if (!x) return;
        e.preventDefault(); e.stopPropagation();
        var form = x.closest('form'), thumb = x.closest('.thumb');
        if (form) {
            form.__rawImage = null;
            $$('[name="ImageData"]', form).forEach(function (h) { h.value = ''; });
            var rm = form.querySelector('[name="RemoveImage"]'); if (rm) rm.checked = true;
            $$('input[type=file]', form).forEach(function (i) { i.value = ''; });
        }
        if (thumb) { $$('img', thumb).forEach(function (i) { i.remove(); }); if (!thumb.firstChild || thumb.firstChild === x) thumb.insertBefore(document.createTextNode(thumb.dataset.ph || '＋'), x); }
    });
    // Sesle yaz (Türkçe) — HTML'deki mikrofon düğmesi
    document.addEventListener('click', function (e) {
        var b = e.target.closest('.mic-btn'); if (!b) return;
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        var el = b.parentElement.querySelector('input, textarea'); if (!el) return;
        if (!SR) { alert('Bu tarayıcı sesli yazmayı desteklemiyor (Chrome/Edge kullanın).'); return; }
        if (b.__rec) { try { b.__rec.stop(); } catch (x) { } return; }
        var rec = new SR(), base = el.value.trim(); rec.lang = 'tr-TR'; rec.continuous = true; rec.interimResults = true;
        rec.onresult = function (ev) {
            var fin = '', tmp = '';
            for (var i = ev.resultIndex; i < ev.results.length; i++) { var t = ev.results[i][0].transcript; if (ev.results[i].isFinal) fin += t; else tmp += t; }
            if (fin) base += (base ? ' ' : '') + fin.trim();
            el.value = (base + (tmp ? (base ? ' ' : '') + tmp : '')).trim();
            el.dispatchEvent(new Event('input', { bubbles: true }));
        };
        rec.onend = function () { b.__rec = null; b.classList.remove('rec'); };
        b.__rec = rec; b.classList.add('rec'); try { rec.start(); } catch (x) { b.__rec = null; b.classList.remove('rec'); }
    });
    document.addEventListener('click', async function (e) {
        var a = e.target.closest('[data-modal]'); if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
        var url = a.getAttribute('href') || a.dataset.href || a.dataset.modal;
        e.preventDefault(); e.stopPropagation();
        try {
            var res = await fetch(url, { headers: { 'X-Modal': '1' }, credentials: 'same-origin' });
            if (!res.ok || res.redirected) { location.href = url; return; }
            var wrap = document.createElement('div'); wrap.innerHTML = await res.text();
            var m = wrap.querySelector('.confirm-modal'); if (!m) { location.href = url; return; }
            document.body.appendChild(m);
            m.removeAttribute('data-standalone'); m.classList.add('open');
            initForms(m); wireModal(m, true);
            m.querySelectorAll('script').forEach(function (old) { var s = document.createElement('script'); s.textContent = old.textContent; old.replaceWith(s); });
        } catch (err) { location.href = url; }
    }, true);
})();
