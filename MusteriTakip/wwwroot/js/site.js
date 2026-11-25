/* Müşteri Takip — tarayıcı tarafı: tema, canlı kur, resim sıkıştırma + filigran, form hesapları */

// Liste filtreleri için satır gizle/göster. site.css'te satırlara ID'li seçicilerle "display:grid !important"
// verildiğinden yalnızca hidden yetmez; HTML'deki gibi satır içi display:none !important kullanılır.
window.mtHide = function (el, hide) {
    el.hidden = !!hide;
    if (hide) el.style.setProperty('display', 'none', 'important'); else el.style.removeProperty('display');
};
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
    // ---- Sol menü geçişleri (HTML: fmLayoutJs) ----
    // HTML tek sayfadır: menüye tıklayınca sadece sınıflar değişir, CSS geçişleri ve nabız boşta olan sayfada
    // akıcı oynar. Burada tıklama yeni sayfa açar; animasyon yeni sayfa yüklenirken oynarsa tarayıcı meşgul
    // olduğundan kare atlar (takılır). Bu yüzden: menünün yeni durumu HTML'deki gibi HEMEN bu sayfada uygulanır,
    // hedef sayfa aynı anda arka planda hazırlanır (destekleyen tarayıcılarda önceden çizilir) ve animasyon
    // bitince açılır — yeni sayfa menüyü zaten son hâliyle gösterir.
    var FM_PULSE_MS = 420, FM_KID_MS = 220;
    var fmSideEl = $('#fmSide'), fmLeaving = false, fmReady = {};
    var fmMarks = $$('#fmSide .fm-item[data-k], #fmSide .fm-kid'), fmGrps = $$('#fmSide .fm-grp');
    var fmOrig = fmMarks.concat(fmGrps).map(function (el) { return [el, el.className]; });
    function fmPrepare(url) {
        if (!url || fmReady[url]) return; fmReady[url] = 1;
        try {
            if (window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
                var s = document.createElement('script'); s.type = 'speculationrules';
                s.textContent = JSON.stringify({ prerender: [{ source: 'list', urls: [url] }] });
                document.head.appendChild(s);
            } else {
                var l = document.createElement('link'); l.rel = 'prefetch'; l.href = url; document.head.appendChild(l);
            }
        } catch (e) { }
    }
    function fmSetState(onKey, openGrp) {
        fmMarks.forEach(function (el) { el.classList.toggle('on', el.dataset.k === onKey); });
        fmGrps.forEach(function (g) { g.classList.toggle('open', g === openGrp); });
    }
    function fmGo(url, onKey, openGrp, wait) {
        if (fmLeaving) return; fmLeaving = true;
        fmPrepare(url);
        // Yeni sayfa ilk çizildiğinde tarayıcı farenin nerede olduğunu henüz bilmez; üzerine gelinmiş (sağa kaymış)
        // buton önce eski yerine döner, sonra tekrar kayar (yazı git-gel yapar). Bu yüzden farenin altındaki öğe
        // saklanır, yeni sayfa onu ilk kareden "üzerine gelinmiş" çizer (bkz. _Layout.cshtml "fmHoverKeep").
        try {
            var hovEls = $$('#fmSide .fm-item, #fmSide .fm-ghead, #fmSide .fm-kid');
            var hi = hovEls.findIndex(function (el) { return el.matches(':hover'); });
            if (hi >= 0) sessionStorage.setItem('mt_fmhov', JSON.stringify({ i: hi, t: Date.now() }));
        } catch (e) { }
        fmSetState(onKey, openGrp);
        setTimeout(function () { location.href = url; }, wait);
    }
    function fmPulse(t) {
        var el = t.classList.contains('fm-ghead') ? t.parentNode : t;
        el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
        setTimeout(function () { el.classList.remove('pulse'); }, 520);
    }
    function fmPlainClick(e) { return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey; }
    if (fmSideEl) {
        // Hedef sayfayı fareyle üzerine gelince / basınca hazırlamaya başla
        var fmHrefOf = function (t) { return t.dataset.href || (t.tagName === 'A' && !t.hasAttribute('data-modal') ? t.href : ''); };
        ['pointerdown', 'mouseover'].forEach(function (ev) {
            fmSideEl.addEventListener(ev, function (e) {
                var t = e.target.closest('.fm-item, .fm-ghead, .fm-kid, .fm-logo'); if (!t) return;
                var u = fmHrefOf(t);
                if (ev === 'mouseover') { clearTimeout(t._fmHov); t._fmHov = setTimeout(function () { if (t.matches(':hover')) fmPrepare(u); }, 120); }
                else fmPrepare(u);
            });
        });
        fmSideEl.addEventListener('click', function (e) {
            var t = e.target.closest('.fm-item, .fm-ghead, .fm-kid, .fm-logo'); if (!t) return;
            if (fmLeaving) { e.preventDefault(); return; }
            if (t.classList.contains('fm-ghead')) {
                // Grup başlığı: o bölümdeysek aç/kapat; değilsek grubu aç ve ilk sayfasına git
                var g = t.parentNode, col = html.classList.contains('fm-col');
                fmPulse(t);
                if (col || !g.classList.contains('act')) {
                    var first = g.querySelector('.fm-kid');
                    fmGo(t.dataset.href, first ? first.dataset.k : null, col ? null : g, FM_PULSE_MS);
                } else g.classList.toggle('open');
                return;
            }
            if (t.tagName !== 'A' || !fmPlainClick(e)) { if (t.classList.contains('fm-item')) fmPulse(t); return; }
            if (t.hasAttribute('data-modal')) { fmPulse(t); return; } // Yeni Sipariş: pencere açılır, sayfa değişmez
            e.preventDefault();
            if (t.classList.contains('fm-kid')) { fmGo(t.href, t.dataset.k, t.closest('.fm-grp'), FM_KID_MS); return; }
            if (t.classList.contains('fm-logo')) { fmGo(t.href, 'home', null, FM_KID_MS); return; }
            fmPulse(t);
            fmGo(t.href, t.dataset.k || null, null, FM_PULSE_MS);
        });
        // Geri tuşuyla bu sayfaya dönülürse (tarayıcı önbelleği) menüyü sayfanın asıl durumuna döndür
        window.addEventListener('pageshow', function (e) {
            if (!e.persisted) return;
            fmLeaving = false;
            fmOrig.forEach(function (x) { x[0].className = x[1]; });
        });
    }
    // Düzenlenip kaydedilen siparişin satırı kısa süre yeşil yanar.
    // Renk satırın kendi arka planına satır içi !important olarak yazılır (bazı tablolarda arka plan
    // stil dosyasında !important). Satırın asıl zemini (renk/geçiş) yeşilin altında korunur.
    // Söndürme adım adım JS ile yapılır; CSS'teki hareket azaltma kuralı geçiş/animasyonları sıfırlıyor.
    // Başarı mesajı ve satır vurgusu tek bir zamanlayıcıyla birlikte söner: aynı anda başlar, aynı anda biter.
    var OK_DUR = 2200, OK_HOLD = 0.45;   // toplam süre; ilk %45 tam görünür, sonra söner
    function okAlpha(p) { return p < OK_HOLD ? 1 : 1 - Math.pow((p - OK_HOLD) / (1 - OK_HOLD), 2); }   // yumuşak sönüş
    function okRun(dur, frame, end) {
        var t0 = performance.now();
        (function step(now) {
            var p = Math.min(1, ((now || t0) - t0) / dur);
            if (p >= 1) { end(); return; }
            frame(okAlpha(p)); requestAnimationFrame(step);
        })();
    }
    window.mtOkPulse = function (flash, id) {
        var parts = [];
        // Satır(lar): renk satırın kendi arka planına satır içi !important olarak yazılır (bazı tablolarda
        // arka plan stil dosyasında !important); satırın asıl zemini yeşilin altında korunur.
        var rows = id ? $$('[data-rec="' + id + '"]') : [];
        var vis = rows.filter(function (r) { return r.offsetParent !== null; });
        if (vis[0]) {
            var b = vis[0].getBoundingClientRect();
            if (b.top < 0 || b.bottom > window.innerHeight) vis[0].scrollIntoView({ block: 'center' });
        }
        // Renk "Sipariş güncellendi" mesajının zemininden (mvc.css --ok-rgb / --ok-a) alınır
        var rs = getComputedStyle(document.documentElement);
        var rgb = rs.getPropertyValue('--ok-rgb').trim() || '200, 234, 214', A = parseFloat(rs.getPropertyValue('--ok-a')) || 1;
        rows.forEach(function (r) {
            r.style.removeProperty('background-image');
            var img = getComputedStyle(r).backgroundImage, base = img && img !== 'none' ? ', ' + img : '';
            parts.push({
                frame: function (a) { var c = 'rgba(' + rgb + ',' + (A * a).toFixed(3) + ')'; r.style.setProperty('background-image', 'linear-gradient(' + c + ',' + c + ')' + base, 'important'); },
                end: function () { r.style.removeProperty('background-image'); }
            });
        });
        // Mesaj: eski yerinde ve ölçüsünde kalır; satırla birlikte solar, sonra kapladığı yer kapanır
        if (flash) {
            flash.classList.add('pulsing');
            parts.push({
                frame: function (a) { flash.style.opacity = a; flash.style.transform = 'translateY(' + (-8 * (1 - a)).toFixed(1) + 'px)'; },
                end: function () {
                    flash.style.opacity = 0;
                    flash.style.height = flash.offsetHeight + 'px'; void flash.offsetHeight;
                    flash.classList.remove('pulsing'); flash.classList.add('out');
                    setTimeout(function () { flash.remove(); }, 750);   // yer kapanınca (hareket azaltma açıksa da) kaldır
                }
            });
        }
        if (!parts.length) return;
        // Satırla eşleşmeyen mesajlar (ör. "Müşteri kaydedildi") okunabilsin diye daha uzun kalır
        okRun(rows.length ? OK_DUR : 4000, function (a) { parts.forEach(function (x) { x.frame(a); }); }, function () { parts.forEach(function (x) { x.end(); }); });
    };
    window.mtOkPulse(document.querySelector('.flash.ok'), document.body.dataset.editedRec);
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
    $$('a[href*="/Backup/Export"]').forEach(function (a) { if (a !== bk) a.addEventListener('click', function () { store.set('mt_last_backup', String(Date.now())); setTimeout(renderBkChip, 50); }); });
    renderBkChip();
    // Yedek onay penceresi (HTML: bk-pop) — çipe tıklayınca çipin altında açılır; açılış/kapanış site.css'teki
    // .bk-pop → .bk-pop.open geçişiyle olur (yukarıdan 14px kayarak belirme, 0,18 sn).
    if (bk) (function () {
        var pop = null;
        function close() { if (!pop) return; var x = pop; pop = null; x.classList.remove('open'); setTimeout(function () { x.remove(); }, 200); }
        function open() {
            if (pop) { close(); return; }
            var last = Number(store.get('mt_last_backup')) || 0;
            pop = document.createElement('div'); pop.className = 'bk-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Yedek onayı');
            pop.innerHTML = '<div class="bk-pop-t">Şimdi yedek alınsın mı?</div><div class="bk-pop-s">' + (last ? 'Son yedek: ' + new Date(last).toLocaleString('tr-TR') : 'Henüz yedek alınmadı.') + '</div><div class="bk-pop-a"><button type="button" class="btn secondary" id="bkPopNo">Vazgeç</button><button type="button" class="btn" id="bkPopYes">Yedek al</button></div>';
            document.body.appendChild(pop);
            var r = bk.getBoundingClientRect(), w = Math.min(290, window.innerWidth - 24);
            pop.style.width = w + 'px';
            pop.style.top = (r.bottom + 8) + 'px';
            pop.style.left = Math.max(12, Math.min(r.right - w, window.innerWidth - w - 12)) + 'px';
            requestAnimationFrame(function () { if (pop) pop.classList.add('open'); });
            $('#bkPopNo').addEventListener('click', close);
            $('#bkPopYes').addEventListener('click', function () {
                close();
                store.set('mt_last_backup', String(Date.now())); setTimeout(renderBkChip, 50);
                location.href = bk.href; // dosya iner, sayfa değişmez
            });
            $('#bkPopYes').focus();
        }
        bk.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); open(); });
        document.addEventListener('mousedown', function (e) { if (pop && !e.target.closest('.bk-pop') && !e.target.closest('#bkChip')) close(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pop) { e.stopPropagation(); close(); } }, true);
        window.addEventListener('resize', close);
    })();
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
    // ---------- GENEL ARAMA (HTML: "GENEL ARAMA" — yazdıkça açılan müşteri/sipariş listesi) ----------
    (function () {
        var inp = document.getElementById('gsInput'), pop = document.getElementById('gsPop'), form = document.getElementById('gSearch');
        if (!inp || !pop || !form) return;
        var data = null, loading = null, items = [], cur = -1;
        var detailsUrl = (form.getAttribute('action') || '/Customers').replace(/\/(Index)?$/, '') + '/Details/';
        function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
        // Türkçe küçük harf; Türkçe karakterler korunur ("sms" yazınca "ŞMS" bulunmaz)
        function norm(t) { return String(t == null ? '' : t).toLocaleLowerCase('tr-TR'); }
        // Virgülle ayrılmış terimler; kaydın hepsini içermesi gerekir
        function terms(v) { return norm(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
        function hl(text, qs) {
            var t = String(text == null ? '' : text), n = norm(t);
            if (n.length !== t.length) return esc(t);
            for (var k = 0; k < qs.length; k++) {
                var q = qs[k], i = n.indexOf(q);
                if (i >= 0) return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
            }
            return esc(t);
        }
        function fdate(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
        function hasAll(hay, qs) { return qs.every(function (q) { return hay.indexOf(q) >= 0 || hay.indexOf(q.replace(/\s/g, '')) >= 0; }); }
        function money(v) { return (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'; }
        function load() {
            if (data) return Promise.resolve(data);
            if (!loading) loading = fetch(detailsUrl.replace(/Details\/$/, 'SearchData'), { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' })
                .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
                .then(function (j) { var byId = {}; j.customers.forEach(function (c) { byId[c.id] = c; }); j.records.forEach(function (r) { r.c = byId[r.cid]; }); data = j; return j; })
                .catch(function (e) { loading = null; throw e; });
            return loading;
        }
        function search(qs) {
            var cs = [], rs = [];
            data.customers.forEach(function (c) {
                // ad, kod, telefon (boşluklu/boşluksuz)
                var hay = norm([c.name, c.code, c.phone, String(c.phone || '').replace(/\s/g, '')].join(' '));
                if (hasAll(hay, qs)) cs.push({ type: 'c', c: c });
            });
            data.records.forEach(function (r) {
                if (!r.c) return;
                // model, sipariş kodu, not, müşteri adı/kodu, tarih ve değiştirme tarihi (gg.aa.yyyy ve yyyy-aa-gg)
                var hay = norm([r.model, r.code, r.note, r.c.name, r.c.code, fdate(r.date), r.date, r.edited].join(' '));
                if (hasAll(hay, qs)) rs.push({ type: 'r', c: r.c, r: r });
            });
            rs.sort(function (a, b) { return (b.r.date || '').localeCompare(a.r.date || '') || b.r.id - a.r.id; });
            return cs.slice(0, 8).concat(rs.slice(0, 14));
        }
        function render() {
            var q = terms(inp.value);
            if (!q.length) { pop.hidden = true; items = []; return; }
            if (!data) { load().then(render, function () { pop.innerHTML = '<div class="gs-empty">Arama verisi yüklenemedi.</div>'; pop.hidden = false; }); return; }
            items = search(q); cur = items.length ? 0 : -1;
            if (!items.length) { pop.innerHTML = '<div class="gs-empty">Sonuç bulunamadı.</div>'; pop.hidden = false; return; }
            var h = '', lastT = '';
            items.forEach(function (it, i) {
                if (it.type !== lastT) { h += '<div class="gs-h">' + (it.type === 'c' ? 'Müşteriler' : 'Siparişler') + '</div>'; lastT = it.type; }
                if (it.type === 'c') {
                    var sub = [it.c.code ? hl(it.c.code, q) : '', it.c.phone ? hl(it.c.phone, q) : ''].filter(Boolean).join(' · ') || 'Müşteri';
                    h += '<div class="gs-it" data-i="' + i + '"><span class="gs-ph" style="display:flex;align-items:center;justify-content:center;font-weight:700;">' + esc((it.c.name || '?').trim().charAt(0).toLocaleUpperCase('tr')) + '</span><span class="gs-t"><b>' + hl(it.c.name, q) + '</b><small>' + sub + '</small></span></div>';
                } else {
                    var r = it.r;
                    h += '<div class="gs-it" data-i="' + i + '">' + (r.image ? '<img src="' + esc(r.image) + '" alt="">' : '<span class="gs-ph"></span>') +
                        '<span class="gs-t"><b>' + hl(r.model || '(isimsiz)', q) + (r.code ? ' · ' + hl(r.code, q) : '') + '</b><small>' + hl(it.c.name, q) + ' · ' + hl(fdate(r.date), q) + (r.price != null ? ' · ' + money(r.price) : '') + '</small></span></div>';
                }
            });
            pop.innerHTML = h; pop.hidden = false; mark();
        }
        function mark() { pop.querySelectorAll('.gs-it').forEach(function (el) { el.classList.toggle('on', +el.dataset.i === cur); }); var on = pop.querySelector('.gs-it.on'); if (on) on.scrollIntoView({ block: 'nearest' }); }
        function go(i) {
            var it = items[i]; if (!it) return;
            pop.hidden = true; inp.value = ''; inp.blur();
            location.href = detailsUrl + it.c.id + (it.type === 'r' ? '#rec-' + it.r.id : '');
        }
        inp.addEventListener('input', render);
        inp.addEventListener('focus', function () { load().catch(function () { }); if (inp.value.trim()) render(); });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { cur = (cur + 1) % items.length; mark(); } }
            else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { cur = (cur - 1 + items.length) % items.length; mark(); } }
            else if (e.key === 'Enter') { e.preventDefault(); if (items.length) go(cur); }
            else if (e.key === 'Escape') { e.stopPropagation(); pop.hidden = true; inp.value = ''; inp.blur(); }
        });
        form.addEventListener('submit', function (e) { e.preventDefault(); });
        pop.addEventListener('mousedown', function (e) { var el = e.target.closest('.gs-it'); if (el) { e.preventDefault(); go(+el.dataset.i); } });
        document.addEventListener('mousedown', function (e) { if (!e.target.closest('#gSearch')) pop.hidden = true; });
    })();
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

    // ---------------- Soru kartı (HTML: showConfirm / #confirmModal) ----------------
    // mtAsk(mesaj, { okLabel, cancelLabel, onOk, onCancel }) — boş alana tıklama / Esc yalnızca kartı kapatır.
    window.mtAsk = function (msg, o) {
        o = o || {};
        var m = document.getElementById('mtAskModal');
        if (!m) {
            m = document.createElement('div'); m.className = 'confirm-modal'; m.id = 'mtAskModal';
            m.innerHTML = '<div class="confirm-card" role="dialog" aria-modal="true"><p id="mtAskMsg"></p><div class="confirm-actions">'
                + '<button class="btn secondary" id="mtAskNo" type="button"></button><button class="btn save-record" id="mtAskOk" type="button"></button></div></div>';
            m.addEventListener('click', function (e) { if (e.target === m) m.__close(); });
            window.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && m.classList.contains('open')) { e.preventDefault(); e.stopImmediatePropagation(); m.__close(); }
            }, true);
        }
        document.body.appendChild(m); // açık pencerelerin üstünde dursun
        m.querySelector('#mtAskMsg').textContent = msg;
        var ok = m.querySelector('#mtAskOk'), no = m.querySelector('#mtAskNo');
        ok.textContent = o.okLabel || 'Tamam'; no.textContent = o.cancelLabel || 'Vazgeç';
        m.__close = function () { m.classList.remove('open'); };
        ok.onclick = function () { m.__close(); if (o.onOk) o.onOk(); };
        no.onclick = function () { m.__close(); if (o.onCancel) o.onCancel(); };
        m.classList.add('open');
        setTimeout(function () { ok.focus(); }, 30);
    };

    // Sipariş düzenlemesi kaydedilirken: Kasa listesinde en üste taşınsın mı?
    document.addEventListener('submit', function (e) {
        var f = e.target;
        if (!f.dataset || !f.dataset.bumpAsk || f.__bumpAsked) return;
        e.preventDefault(); e.stopPropagation();
        var go = function (v) { f.querySelector('[name="Bump"]').value = v ? 'true' : 'false'; f.__bumpAsked = true; f.requestSubmit(); };
        mtAsk('Güncellenen kayıt Kasa listesinde en üste taşınsın mı?', {
            okLabel: 'Evet, en üste taşı', cancelLabel: 'Hayır, yerinde kalsın',
            onOk: function () { go(true); }, onCancel: function () { go(false); }
        });
    }, true);

    // ---------------- Onay soran formlar ----------------
    document.addEventListener('submit', function (e) {
        var f = e.target;
        if (f.dataset.confirm && !window.confirm(f.dataset.confirm)) { e.preventDefault(); return; }
        if (f.dataset.confirmIf) {
            var cb = document.getElementById(f.dataset.confirmIf);
            if (cb && cb.checked && !window.confirm(f.dataset.confirmText || 'Emin misiniz?')) e.preventDefault();
        }
    }, true);

    // Düzenleme notu: başlık + metin (ikinci balon / resim altındaki ikinci not)
    function mtNote2(el, text) {
        el.innerHTML = '';
        var h = document.createElement('b'); h.className = 'n2-h'; h.textContent = '✎ Düzenleme notu';
        var t = document.createElement('div'); t.textContent = text;
        el.appendChild(h); el.appendChild(t);
    }

    // ---------------- Resim büyütme ----------------
    // Ortada açılır; altında sipariş notu. Tekerlek = yakınlaştır/uzaklaştır, sol tuşla sürükle = gezin, çift tık = sıfırla
    var modal = $('#imgModal');
    if (modal) {
        var mImg = $('#imgModalImg'), stage = $('#imgStage'), cap = $('#imgModalCap');
        var imgZoom = 1, imgBase = 1, drag = null;
        function fitBase() {
            var nw = mImg.naturalWidth || 1, nh = mImg.naturalHeight || 1;
            return Math.min(window.innerWidth * 0.94 / nw, window.innerHeight * 0.78 / nh, 2.5);
        }
        function applyZoom(ax, ay) {
            var nw = mImg.naturalWidth || 1, nh = mImg.naturalHeight || 1;
            var rx = 0.5, ry = 0.5, r = stage.getBoundingClientRect();
            if (ax !== undefined && mImg.offsetWidth) {   // imlecin altındaki nokta yerinde kalsın
                rx = (stage.scrollLeft + ax - r.left) / mImg.offsetWidth;
                ry = (stage.scrollTop + ay - r.top) / mImg.offsetHeight;
            }
            mImg.style.width = (nw * imgBase * imgZoom).toFixed(2) + 'px';
            mImg.style.height = (nh * imgBase * imgZoom).toFixed(2) + 'px';
            stage.classList.toggle('zoomed', imgZoom > 1.001);
            r = stage.getBoundingClientRect();
            var px = ax !== undefined ? ax - r.left : stage.clientWidth / 2;
            var py = ay !== undefined ? ay - r.top : stage.clientHeight / 2;
            stage.scrollLeft = rx * mImg.offsetWidth - px;
            stage.scrollTop = ry * mImg.offsetHeight - py;
        }
        // Akıcı yakınlaştırma: hedef büyütmeye her karede yumuşakça yaklaşır, imlecin altındaki nokta sabit kalır
        var tZoom = 1, zAnim = 0, zAx, zAy;
        function stopAnim() { if (zAnim) cancelAnimationFrame(zAnim); zAnim = 0; }
        function zoomStep() {
            var d = tZoom - imgZoom;
            if (Math.abs(d) < 0.002) { imgZoom = tZoom; applyZoom(zAx, zAy); zAnim = 0; return; }
            imgZoom += d * 0.2;
            applyZoom(zAx, zAy);
            zAnim = requestAnimationFrame(zoomStep);
        }
        function zoomTo(z, x, y) {
            tZoom = Math.min(Math.max(z, 1), 6); zAx = x; zAy = y;
            if (!zAnim) zAnim = requestAnimationFrame(zoomStep);
        }
        function openImg(src, note, note2) {
            cap.innerHTML = '';
            if (note) { var d = document.createElement('div'); d.className = 'mc-note'; d.textContent = note; cap.appendChild(d); }
            if (note2) { var d2 = document.createElement('div'); d2.className = 'mc-note mc-note2'; mtNote2(d2, note2); cap.appendChild(d2); }
            stopAnim(); imgZoom = tZoom = 1; mImg.style.width = ''; mImg.style.height = '';
            mImg.onload = function () { imgBase = fitBase(); imgZoom = 1; applyZoom(); };
            mImg.src = src;
            modal.classList.add('open');
            if (mImg.complete && mImg.naturalWidth) { imgBase = fitBase(); applyZoom(); }
        }
        function closeImg() {
            if (!modal.classList.contains('open')) return;
            modal.classList.remove('open'); mImg.onload = null; mImg.removeAttribute('src'); stopAnim(); imgZoom = tZoom = 1; drag = null;
        }
        document.addEventListener('click', function (e) {
            var img = e.target.closest('[data-zoom]');
            if (!img) return;
            var th = img.closest('.thumb, .rd-img');
            openImg(img.src, (th && th.dataset.note || '').trim(), (th && th.dataset.note2 || '').trim());
        });
        modal.addEventListener('click', function (e) {
            if (e.target === modal || e.target.classList.contains('modal-inner') || e.target.closest('.modal-close')) closeImg();
        });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeImg(); });
        stage.addEventListener('wheel', function (e) {
            e.preventDefault();
            // Tekerlek/touchpad kaydırma miktarıyla orantılı, kademesiz büyütme (bir tekerlek çentiği ≈ %22)
            var dy = e.deltaMode === 1 ? e.deltaY * 33 : (e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY);
            dy = Math.max(-150, Math.min(150, dy));
            zoomTo(tZoom * Math.exp(-dy * 0.002), e.clientX, e.clientY);
        }, { passive: false });
        // Tek tık: tıklanan nokta 1,75 kat büyür / tekrar tıkla sıfırla (sürükleme sonrası bırakılan tık sayılmaz)
        var dragMoved = false;
        stage.addEventListener('click', function (e) {
            if (dragMoved) { dragMoved = false; return; }
            zoomTo(tZoom > 1.001 ? 1 : 1.75, e.clientX, e.clientY);
        });
        stage.addEventListener('mousedown', function (e) {
            dragMoved = false;
            if (e.button !== 0 || imgZoom <= 1.001) return;
            e.preventDefault();
            drag = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
            stage.classList.add('dragging');
        });
        window.addEventListener('mousemove', function (e) {
            if (!drag) return;
            if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) dragMoved = true;
            stage.scrollLeft = drag.sl - (e.clientX - drag.x);
            stage.scrollTop = drag.st - (e.clientY - drag.y);
        });
        window.addEventListener('mouseup', function () { if (drag) { drag = null; stage.classList.remove('dragging'); } });
        window.addEventListener('resize', function () { if (modal.classList.contains('open')) { imgBase = fitBase(); applyZoom(); } });
    }

    // ---------------- Sipariş notu balonu ----------------
    // (i) işaretine tıklanınca hemen altında açılır; ✕, Esc, kaydırma ya da boş yere tıklayınca kapanır
    var notePop = $('#notePop');
    if (notePop) {
        var npBtn = null, notePop2 = $('#notePop2');
        function hideNote() { notePop.hidden = true; if (notePop2) notePop2.hidden = true; if (npBtn) npBtn.classList.remove('on'); npBtn = null; }
        function showNote(btn) {
            if (npBtn && npBtn !== btn) npBtn.classList.remove('on');
            npBtn = btn; btn.classList.add('on');
            var n1 = (btn.dataset.note || '').trim(), n2 = (btn.dataset.note2 || '').trim();
            // Yalnız düzenleme notu varsa ilk balonda o gösterilir; ikisi de varsa ikinci balon altında açılır
            if (n1) $('#notePopText').textContent = n1; else mtNote2($('#notePopText'), n2);
            if (notePop2) notePop2.hidden = true;
            notePop.classList.add('pinned');
            notePop.hidden = false; notePop.classList.remove('up');
            var r = btn.getBoundingClientRect(), pw = notePop.offsetWidth, ph = notePop.offsetHeight;
            var left = Math.min(Math.max(8, r.left + r.width / 2 - 20), window.innerWidth - pw - 8);
            var top = r.bottom + 10;
            if (top + ph > window.innerHeight - 8) { top = r.top - ph - 10; notePop.classList.add('up'); }
            notePop.style.left = left + 'px'; notePop.style.top = top + 'px';
            notePop.style.setProperty('--ax', Math.max(10, Math.min(pw - 22, r.left + r.width / 2 - left - 6)) + 'px');
            if (n1 && n2 && notePop2) {
                mtNote2(notePop2, n2); notePop2.hidden = false;
                var p2h = notePop2.offsetHeight, p2w = notePop2.offsetWidth;
                var t2 = notePop.classList.contains('up') ? top - p2h - 8 : top + ph + 8;
                notePop2.style.left = Math.min(left, window.innerWidth - p2w - 8) + 'px'; notePop2.style.top = Math.max(8, t2) + 'px';
            }
        }
        document.addEventListener('click', function (e) {
            var b = e.target.closest('.note-info');
            if (b) { e.preventDefault(); e.stopPropagation(); if (npBtn === b && !notePop.hidden) hideNote(); else showNote(b); return; }
            if (e.target.closest('#notePop, #notePop2') && !e.target.closest('#notePopX')) return;
            if (!notePop.hidden) hideNote();
        }, true);
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !notePop.hidden) hideNote(); });
        document.addEventListener('scroll', function () { if (!notePop.hidden) hideNote(); }, true);
        window.addEventListener('resize', function () { if (!notePop.hidden) hideNote(); });
    }

    // Model resminin üzerinde: not, fare imlecinin altında balonda belirir ve imleçle hareket eder; resimden çıkınca kaybolur
    var noteFollow = $('#noteFollow');
    if (noteFollow) {
        var NF_SEL = ':is(#recordsList, #homeRecentList) .thumb:is([data-note], [data-note2])', nf2 = $('#noteFollow2');
        var n1Of = function (t) { return (t.dataset.note || '').trim(); }, n2Of = function (t) { return (t.dataset.note2 || '').trim(); };
        function nfThumb(el) { var t = el && el.closest && el.closest(NF_SEL); return t && (n1Of(t) || n2Of(t)) ? t : null; }
        function nfHide() { noteFollow.hidden = true; if (nf2) nf2.hidden = true; }
        document.addEventListener('mousemove', function (e) {
            var t = nfThumb(e.target);
            if (!t || modal && modal.classList.contains('open')) { if (!noteFollow.hidden) nfHide(); return; }
            var a = n1Of(t), b = n2Of(t), key = a + '\u0001' + b;
            if (noteFollow.hidden || noteFollow.dataset.for !== key) {
                // Not yoksa ilk balonda düzenleme notu; ikisi de varsa düzenleme notu ikinci balonda
                if (a) noteFollow.textContent = a; else mtNote2(noteFollow, b);
                noteFollow.dataset.for = key; noteFollow.hidden = false;
                if (nf2) { if (a && b) { mtNote2(nf2, b); nf2.hidden = false; } else nf2.hidden = true; }
            }
            var two = nf2 && !nf2.hidden;
            var w = Math.max(noteFollow.offsetWidth, two ? nf2.offsetWidth : 0), h1 = noteFollow.offsetHeight, h = h1 + (two ? nf2.offsetHeight + 6 : 0);
            var x = e.clientX + 14, y = e.clientY + 18;
            if (x + w > window.innerWidth - 8) x = e.clientX - w - 10;
            if (y + h > window.innerHeight - 8) y = e.clientY - h - 12;
            noteFollow.style.left = x + 'px'; noteFollow.style.top = y + 'px';
            if (two) { nf2.style.left = x + 'px'; nf2.style.top = (y + h1 + 6) + 'px'; }
        });
        document.addEventListener('mouseout', function (e) { if (nfThumb(e.target) && !nfThumb(e.relatedTarget)) nfHide(); });
        document.addEventListener('scroll', nfHide, true);
        document.addEventListener('click', function (e) { if (nfThumb(e.target)) nfHide(); }, true);
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
    // Kalan altının bugünkü karşılığı
    function renderGoldVals(d) {
        if (!d || !d.gold || !d.usd) return;
        $$('[data-gold-value]').forEach(function (el) {
            var gr = parseFloat(el.dataset.goldValue) || 0;
            if (Math.abs(gr) < 0.0005 || !(d.gold[0] > 0)) { el.textContent = ''; return; }
            var t = gr * d.gold[0], usd = d.usd[1] > 0 ? t / d.usd[1] : null;
            el.textContent = '≈ ' + (usd !== null ? money(usd) + ' · ' : '') + tl(t);
        });
    }
    window.mtGoldVals = function () { renderGoldVals(window.__mtLT); };
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
        renderGoldVals(d);
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
        $$('[data-upper]', root).forEach(function (el) {
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
                if (thumb) {   // önizlemeyi değiştir; "resmi kaldır" (×) düğmesi yerinde kalsın
                    var tx = thumb.querySelector('.thumb-x');
                    // .ph: yer tutucu simge (CSS ile resim varken gizlenir, resim silinince geri gelir)
                    Array.prototype.slice.call(thumb.childNodes).forEach(function (n) { if (n !== tx && !(n.classList && n.classList.contains('ph'))) n.remove(); });
                    var im = document.createElement('img'); im.src = raw; im.alt = '';
                    thumb.insertBefore(im, tx || null);
                }
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

        // ---------------- Ödeme formu (HTML #payModal → #dnFields: tür seçimsiz ödeme kartı) ----------------
        // Aynı anda tek ödeme türü dolu olur ($, ₺, €, altın gr, hurda); tür kutudan anlaşılır.
        // Gizli alanlar (PayType, Amount, CountAsCash) sunucuya gider; sağdaki "Hesap Sonucu" canlı hesaplanır.
        var pf = $('[data-dn-pay]', root);
        if (pf) {
            var D = {}; $$('[data-dn]', pf).forEach(function (el) { (D[el.dataset.dn] = D[el.dataset.dn] || []).push(el); });
            var hType = $('[data-dn-type]', pf), hAmt = $('[data-dn-amount]', pf), hCash = $('[data-dn-cash]', pf);
            var gP = $('#dnGoldP', pf), rT = $('#dnRate', pf), eR = $('#dnEurRate', pf), eqP = $('#pmGoldEqPriceIn', pf), chk = $('#dnGoldChk', pf);
            var prevB = parseFloat(pf.dataset.prev) || 0, remG = parseFloat(pf.dataset.goldRemaining) || 0;
            var r2 = function (v) { return Math.round(v * 100) / 100; }, r3 = function (v) { return Math.round(v * 1000) / 1000; };
            var lt = function () { return window.__mtLT || null; };
            var liveRate = function () { var d = lt(); return d && d.usd && d.usd[1] > 0 ? Math.round(d.usd[1] * 10000) / 10000 : 0; };
            var liveGold = function () { var d = lt(); return d && d.gold && d.gold[1] > 0 && d.usd[1] > 0 ? r2(d.gold[1] / d.usd[1]) : 0; };
            var liveParity = function () { var d = lt(); return d && d.eur && d.eur[1] > 0 && d.usd[1] > 0 ? Math.round(d.eur[1] / d.usd[1] * 10000) / 10000 : 0; };
            var filled = function (k) { return (D[k] || []).some(function (i) { return i.value.trim() !== ''; }); };
            var dnType = function () { return filled('gr') ? 'gr' : filled('hurda') ? 'hurda' : filled('tl') ? 'tl' : filled('eur') ? 'eur' : 'usd'; };
            var v = function (k, i) { return num(D[k][i || 0]) || 0; };
            var paint = function () {
                var type = dnType(), act = document.activeElement;
                if (!num(gP) && liveGold()) gP.value = liveGold();
                if (!num(rT) && liveRate()) rT.value = liveRate();
                if (eqP && !num(eqP) && liveGold()) eqP.value = liveGold();
                if (!num(eR) && liveParity()) eR.value = liveParity();
                var gp = num(gP) || 0, rt = num(rT) || 0, par = num(eR) || liveParity();
                $('#dnGoldPWrap', pf).hidden = !((type === 'gr' || type === 'hurda') && (!gp || act === gP));
                $('#dnRateWrap', pf).hidden = !(type === 'tl' && (!rt || act === rT));
                $('#dnEurRateWrap', pf).hidden = !(type === 'eur' && (!par || act === eR));
                // Has karşılığı ve dolar tutarı
                var has = 0, usd = 0;
                if (type === 'gr') { has = v('gr'); usd = has * gp; }
                else if (type === 'hurda') { var hg = v('hurda', 0), hm = v('hurda', 1); has = hg > 0 && hm > 0 ? Math.floor(hg * hm + 1e-9) / 1000 : 0; usd = has * gp; }
                else {
                    usd = type === 'tl' ? (rt > 0 ? v('tl') / rt : 0) : type === 'eur' ? v('eur') * par : v('usd');
                    var pr = (eqP && num(eqP)) || liveGold(); has = usd > 0 && pr > 0 ? usd / pr : 0;
                }
                usd = r2(usd);
                $('#dnHas', pf).value = has > 0 ? trNum(r3(has), 3) + ' gr' : '';
                hType.value = type;
                hAmt.value = usd > 0 ? usd.toFixed(2) : '';
                // Altın borcu kutusu (yalnız nakit ödemelerde)
                var cashPay = type !== 'gr' && type !== 'hurda';
                var gc = $('#pmGoldClose', pf); if (gc) gc.hidden = !cashPay;
                var toGold = !!(chk && chk.checked && cashPay && remG > 0.0005);
                hCash.value = toGold ? 'false' : 'true';
                var gq = eqP ? (num(eqP) || 0) : 0, payU = 0, payG = 0;
                if (!cashPay) payG = r3(has);
                else if (toGold && gq > 0) { payG = Math.min(r3(usd / gq), remG); var left = usd - payG * gq; payU = left < gq * 0.001 ? 0 : r2(left); }
                else payU = usd;
                if (gc) {
                    var pNow = gq || liveGold();
                    $('#pmGoldCloseInfo', pf).innerHTML = 'Kalan altın borcu: <b>' + trNum(remG, 3) + ' gr</b>' + (pNow > 0 ? ' ≈ <b>' + money(remG * pNow) + '</b> <span class="gc-p">(bugün ' + trNum(pNow, 2) + ' $/gr)</span>' : '');
                    $('#dnGoldText', pf).textContent = 'Bu ödeme altın borcuna sayılsın' + (toGold && payG > 0 ? ' → ' + trNum(payG, 3) + ' gr' + (payU > 0.005 ? ' (altın borcu kapanıyor, artan ' + money(payU) + ' nakit borcundan düşer)' : '') : '');
                    $('#pmGoldCloseBtn', pf).disabled = !(pNow > 0);
                }
                // Hesap Sonucu
                var restU = r2(prevB - payU);
                $('#psPrev', pf).textContent = money(prevB);
                $('#psPay', pf).textContent = payU > 0 ? money(payU) : '—';
                $('#psRest', pf).textContent = money(restU);
                $('#psRestRow', pf).classList.toggle('ok', restU <= 0.005);
                if ($('#psGPay', pf)) {
                    var restG = Math.max(0, r3(remG - payG));
                    $('#psGPay', pf).textContent = payG > 0 ? trNum(payG, 3) + ' gr' : '—';
                    $('#psGRest', pf).textContent = trNum(restG, 3) + ' gr';
                    $('#psGRestRow', pf).classList.toggle('ok', restG <= 0.0005);
                }
            };
            var clearAll = function (keep) { Object.keys(D).forEach(function (k) { if (k !== keep) D[k].forEach(function (i) { i.value = ''; }); }); };
            pf.addEventListener('input', function (e) {
                var k = e.target.dataset && e.target.dataset.dn;
                if (k && e.target.value.trim() !== '') clearAll(k);   // aynı anda tek ödeme türü
                paint();
            });
            pf.addEventListener('change', paint);
            pf.addEventListener('focusout', function () { setTimeout(paint, 0); });
            var gcBtn = $('#pmGoldCloseBtn', pf);
            if (gcBtn) gcBtn.addEventListener('click', function () {   // kalan altın borcu × $/gr → $ tutarı, altına sayılır
                var pr = num(eqP) || liveGold(); if (!(pr > 0) || !(remG > 0)) return;
                eqP.value = pr; clearAll(); D.usd[0].value = r2(remG * pr).toFixed(2); chk.checked = true; paint();
            });
            var cb = $('#pmCloseBal', pf);
            if (cb) cb.addEventListener('click', function () {   // kalan bakiyenin tamamı dolar ödemesi
                clearAll(); D.usd[0].value = prevB.toFixed(2); if (chk) chk.checked = false; paint(); D.usd[0].focus();
            });
            pf.addEventListener('submit', function () { paint(); }, true);
            document.addEventListener('mt:ticker', paint);
            paint();
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
            window.__dropImg = null;   // vazgeçildi: butona bırakılan resim bir sonraki siparişe taşınmasın
            if (injected) { m.classList.remove('open'); setTimeout(function () { m.remove(); }, 200); }
            else if (m.dataset.back) location.href = m.dataset.back;
            else history.back();
        }
        m.__close = close;
        // Boş alana tıklama: basış da bırakış da arka planda olmalı. Yoksa kartın dışına taşan bir
        // listeden seçim (liste basışta kapanınca tıklama arka plana düşer) pencereyi kapatıyordu.
        var downOnBg = false;
        m.addEventListener('mousedown', function (e) { downOnBg = e.target === m; });
        m.addEventListener('click', function (e) {
            if (e.target.closest('.x-close, [data-close]')) { e.preventDefault(); close(); return; }
            if (e.target === m && downOnBg) { e.preventDefault(); close(); }
            downOnBg = false;
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
            mountModal(m);
            // "Yeni Sipariş" butonuna bırakılan resim: sipariş kartı açılınca resim alanına eklenir
            if (window.__dropImg) {
                if (m.querySelector('#recordImage') && window.__dzGive) { window.__dzGive('recordImage', window.__dropImg); window.__dropImg = null; }
                else if (m.querySelector('#profileFile') && window.__dzGive) { window.__dzGive('profileFile', window.__dropImg); window.__dropImg = null; }   // Yeni Müşteri butonuna bırakılan resim → profil resmi
                else if (m.id !== 'pickCustModal') window.__dropImg = null;
            }
        } catch (err) { location.href = url; }
    }, true);

    // Sunucudan gelen pencereyi sayfaya ekleyip açar
    function mountModal(m) {
        document.body.appendChild(m);
        m.removeAttribute('data-standalone'); m.classList.add('open');
        // Düzenleme kaydedilince bu sayfaya dönülsün
        m.querySelectorAll('input[data-return-url]').forEach(function (i) { if (!i.value) i.value = location.pathname + location.search; });
        initForms(m); wireModal(m, true);
        m.querySelectorAll('script').forEach(function (old) { var s = document.createElement('script'); s.textContent = old.textContent; old.replaceWith(s); });
        // Sipariş düzenleme formu sayfa yenilenmeden kaydedilir (resim filigranı sonrası of.submit() de buraya düşer)
        $$('form', m).forEach(function (f) {
            if (f.querySelector('input[data-return-url]')) f.submit = function () { ajaxSave(f, m); };
        });
    }

    // ---------------- Sipariş düzenlemesini sayfa yenilenmeden kaydet ----------------
    // Form arka planda gönderilir. Sunucu düzenlemenin açıldığı sayfaya yönlendirir; o sayfanın
    // güncel hâlinden yalnızca [data-sync] işaretli alanlar (tablolar, toplamlar) alınıp yerine konur.
    // Böylece kaydırma konumu, arama/dönem filtresi ve seçimler korunur. Hata varsa pencere hatalarla yenilenir.
    document.addEventListener('submit', function (e) {
        var f = e.target;
        if (e.defaultPrevented || !f.querySelector || !f.querySelector('input[data-return-url]')) return;
        var m = f.closest('.confirm-modal'); if (!m || m.hasAttribute('data-standalone')) return;
        e.preventDefault();
        ajaxSave(f, m);
    });
    async function ajaxSave(f, m) {
        if (f.__saving) return; f.__saving = true;
        var btns = $$('button[type=submit], button:not([type])', f); btns.forEach(function (b) { b.disabled = true; });
        var saved = false;
        try {
            var res = await fetch(f.action, { method: 'POST', body: new FormData(f), credentials: 'same-origin' });
            var doc = new DOMParser().parseFromString(await res.text(), 'text/html');
            var here = location.pathname + location.search, u = new URL(res.url);
            if (res.ok && res.redirected) {
                saved = true;
                if (u.origin !== location.origin || u.pathname + u.search !== here) { location.href = res.url; return; }
                syncPage(doc);
                if (m.__close) m.__close(); else m.remove();
                var fl = doc.querySelector('.flash.ok'), host = document.querySelector('.home-content');
                if (fl && host) { $$('.flash', host).forEach(function (x) { x.remove(); }); host.insertBefore(fl, host.firstChild); } else fl = null;
                window.mtOkPulse(fl, doc.body.dataset.editedRec);
                return;
            }
            var nm = res.ok && doc.querySelector('.confirm-modal');
            if (!nm) throw new Error('beklenmeyen yanıt');
            // Kayıt hatası: pencere hata mesajlarıyla yeniden açılır
            nm = document.importNode(nm, true);
            m.remove(); mountModal(nm);
        } catch (err) {
            if (saved) location.reload();                        // kayıt tamam, ekran güncellenemedi
            else HTMLFormElement.prototype.submit.call(f);      // olmazsa klasik gönderim
        } finally {
            f.__saving = false; btns.forEach(function (b) { b.disabled = false; });
        }
    }
    function syncPage(doc) {
        // Kaydırma konumlarını sakla (sayfa ve kaydırılan kutular)
        var scrolls = [[document.scrollingElement, document.scrollingElement.scrollTop]];
        $$('[data-sync="html"]').forEach(function (el) {
            for (var p = el; p && p !== document.body; p = p.parentElement) if (p.scrollTop > 0) scrolls.push([p, p.scrollTop]);
        });
        $$('[data-sync][id]').forEach(function (el) {
            var n = doc.getElementById(el.id); if (!n) return;
            if (el.dataset.sync === 'html') {
                // Seçili kutular yenilenen satırlarda da seçili kalsın
                var sel = $$('.hsel-box:checked', el).map(function (b) { return b.dataset.key; });
                el.innerHTML = n.innerHTML;
                sel.forEach(function (k) { var b = el.querySelector('.hsel-box[data-key="' + k + '"]'); if (b) b.checked = true; });
                var any = el.querySelector('.hsel-box'); if (any) any.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                el.innerHTML = n.innerHTML; el.className = n.className;
                if (n.dataset.goldValue !== undefined) el.dataset.goldValue = n.dataset.goldValue;
            }
        });
        if (window.mtGoldVals) window.mtGoldVals();
        // Arama ve dönem filtrelerini yeni satırlara yeniden uygula
        $$('.hs-filter input').forEach(function (i) { i.dispatchEvent(new Event('input', { bubbles: true })); });
        $$('.hs-filter select').forEach(function (s) { s.dispatchEvent(new Event('change', { bubbles: true })); });
        if (window.mtFit) window.mtFit();
        scrolls.forEach(function (x) { x[0].scrollTop = x[1]; });
    }
})();

// ---------------- Boş durum kutuları (HTML: "ARAYÜZ: BOŞ DURUM ÇİZİMLERİ") ----------------
// Her kutu iki blok taşır: .es-def (hiç kayıt yok) ve .es-nf (arama/dönem sonucu boş).
// mtEmptyNf(id, nf, başlık?, alt yazı?) ile hangisinin görüneceği seçilir.
(function () {
    var ic = {
        ring: '<svg viewBox="0 0 96 96" fill="none"><circle cx="48" cy="48" r="44" fill="var(--teal)" fill-opacity=".08"/><path d="M38 20h20l6 9-16 12-16-12z" fill="var(--amber)" fill-opacity=".85"/><circle cx="48" cy="58" r="20" stroke="var(--teal)" stroke-width="5"/><circle cx="72" cy="28" r="3" fill="var(--amber)"/><circle cx="22" cy="40" r="2" fill="var(--teal)"/></svg>',
        user: '<svg viewBox="0 0 96 96" fill="none"><circle cx="48" cy="48" r="44" fill="var(--teal)" fill-opacity=".08"/><circle cx="48" cy="38" r="13" fill="var(--teal)" fill-opacity=".75"/><path d="M24 74c3-13 13-19 24-19s21 6 24 19" fill="var(--teal)" fill-opacity=".45"/><circle cx="74" cy="26" r="9" fill="var(--amber)"/><path d="M74 21v10M69 26h10" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>',
        cash: '<svg viewBox="0 0 96 96" fill="none"><circle cx="48" cy="48" r="44" fill="var(--teal)" fill-opacity=".08"/><rect x="18" y="32" width="60" height="34" rx="6" fill="var(--teal)" fill-opacity=".7"/><circle cx="48" cy="49" r="9" fill="var(--panel)"/><text x="48" y="53.5" text-anchor="middle" font-size="12" font-weight="700" fill="var(--teal)">$</text><rect x="24" y="24" width="48" height="6" rx="3" fill="var(--amber)" fill-opacity=".8"/></svg>',
        list: '<svg viewBox="0 0 96 96" fill="none"><circle cx="48" cy="48" r="44" fill="var(--teal)" fill-opacity=".08"/><rect x="26" y="20" width="44" height="56" rx="6" fill="var(--panel)" stroke="var(--teal)" stroke-width="3"/><path d="M35 36h26M35 46h26M35 56h16" stroke="var(--amber)" stroke-width="4" stroke-linecap="round"/></svg>'
    };
    var NF_SUB = 'Aramanıza uyan kayıt yok. Aramayı değiştirin veya temizleyin.';
    // id: [ikon, başlık, alt yazı, düğme yazısı, tıklanacak öğe, "bulunamadı" başlığı]
    var ES = {
        homeRecentEmptyNote: ['ring', 'Henüz sipariş yok', 'İlk siparişinizi kaydedin; resmiyle birlikte burada görünür.', 'İlk siparişi ekle', '#fmSide a[data-k="order"]', 'Sonuç bulunamadı'],
        recordsEmptyNote: ['ring', 'Bu müşteri için sipariş yok', 'Resim, fiyat ve tarih girerek ilk siparişi ekleyin.', '+ İlk siparişi ekle', '#newRecordBtn', 'Sonuç bulunamadı'],
        custEmptyNote: ['user', 'Henüz müşteri yok', 'İlk müşterinizi kaydedin; siparişlerini ve ödemelerini takip edin.', 'Müşteri Ekle', '#custNewBtn', 'Kayıtlı müşteri bulunamadı'],
        historyEmptyNote: ['cash', 'Henüz hareket yok', 'Sipariş ve ödeme ekledikçe hesap burada oluşur.', null, null, 'Sonuç bulunamadı'],
        kasaEmptyNote: ['cash', 'Kasa boş', 'Ödeme ve giderler burada tarih sırasıyla listelenir.', null, null, 'Sonuç bulunamadı'],
        expenseEmptyNote: ['list', 'Henüz gider yok', '“Gider Ekle” ile ilk giderinizi ekleyin; kategoriye göre raporlanır.', null, null, null]
    };
    Object.keys(ES).forEach(function (id) {
        var el = document.getElementById(id); if (!el) return;
        var c = ES[id];
        el.innerHTML = '<div class="es es-def">' + ic[c[0]] + '<div class="es-t">' + c[1] + '</div><div class="es-s">' + c[2] + '</div>'
            + (c[3] ? '<button type="button" class="btn sm">' + c[3] + '</button>' : '') + '</div>'
            + (c[5] ? '<div class="es es-nf">' + ic[c[0]] + '<div class="es-t">' + c[5] + '</div><div class="es-s">' + NF_SUB + '</div></div>' : '');
        if (c[3]) el.querySelector('.es-def button').addEventListener('click', function () { var t = document.querySelector(c[4]); if (t) t.click(); });
    });
    window.mtEmptyNf = function (id, nf, title, sub) {
        var el = document.getElementById(id); if (!el) return;
        el.classList.toggle('nf', !!nf);
        var b = el.querySelector('.es-nf'); if (!b) return;
        if (!b.dataset.t) { b.dataset.t = b.querySelector('.es-t').textContent; b.dataset.s = b.querySelector('.es-s').textContent; }
        b.querySelector('.es-t').textContent = title || b.dataset.t;
        b.querySelector('.es-s').textContent = sub || b.dataset.s;
    };
})();
