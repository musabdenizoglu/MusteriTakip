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
    var modeBtn = $('#modeBtn');
    function syncModeBtn() { if (modeBtn) modeBtn.textContent = html.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙'; }
    if (modeBtn) {
        syncModeBtn();
        modeBtn.addEventListener('click', function () {
            var dark = html.getAttribute('data-theme') !== 'dark';
            html.setAttribute('data-theme', dark ? 'dark' : 'light');
            store.set('mt_mode', dark ? 'dark' : 'light');
            syncModeBtn();
        });
    }
    var sideToggle = $('#sideToggle');
    if (sideToggle) sideToggle.addEventListener('click', function () {
        var on = !html.classList.contains('side-mini');
        html.classList.toggle('side-mini', on);
        store.set('mt_side_mini', on ? '1' : '');
    });
    $$('[data-theme-key]').forEach(function (b) {
        var cur = store.get('mt_theme') || 'orijinal';
        b.classList.toggle('active', b.dataset.themeKey === cur);
        b.addEventListener('click', function () {
            var k = b.dataset.themeKey;
            if (k === 'orijinal') html.removeAttribute('data-skin'); else html.setAttribute('data-skin', k);
            store.set('mt_theme', k);
            $$('[data-theme-key]').forEach(function (x) { x.classList.toggle('active', x === b); });
        });
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
            async function () { var j = await fetchJson('https://finans.truncgil.com/today.json'); return { usd: ltPair(j.USD), gold: ltPair(j['gram-altin'] || j.GRA) }; },
            async function () { var j = await fetchJson('https://finans.truncgil.com/v4/today.json'); return { usd: ltPair(j.USD), gold: ltPair(j.GRA || j['gram-altin']) }; },
            async function () {
                var j = await fetchJson('https://data-api.binance.vision/api/v3/ticker/bookTicker?symbols=' + encodeURIComponent('["USDTTRY","PAXGUSDT"]'));
                var u = j.find(function (x) { return x.symbol === 'USDTTRY'; }), g = j.find(function (x) { return x.symbol === 'PAXGUSDT'; });
                var ub = Number(u.bidPrice), ua = Number(u.askPrice), gb = Number(g.bidPrice), ga = Number(g.askPrice), OZ = 31.1034768;
                return { usd: [ub, ua], gold: [gb * ub / OZ, ga * ua / OZ] };
            }
        ];
        for (var i = 0; i < sources.length; i++) {
            try { var r = await sources[i](); if (ok(r.usd) && ok(r.gold)) { r.at = Date.now(); return r; } } catch (e) { }
        }
        return null;
    }
    function setLt(id, v, prev) {
        var el = document.getElementById(id); if (!el) return;
        el.textContent = v > 0 ? trNum(v, id.indexOf('Usd') >= 0 ? 4 : 2) : '—';
        el.classList.remove('up', 'down');
        if (prev > 0 && v > 0 && v !== prev) el.classList.add(v > prev ? 'up' : 'down');
    }
    function renderTicker(d, stale) {
        var p = window.__mtLT;
        setLt('ltUsdBuy', d.usd[0], p && p.usd[0]); setLt('ltUsdSell', d.usd[1], p && p.usd[1]);
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
    // "Güncel kur" düğmeleri: data-live-rate="hedefId" (boşsa aynı alandaki number input)
    $$('[data-live-rate]').forEach(function (b) {
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
    $$('[data-live-gold-usd]').forEach(function (b) {
        b.addEventListener('click', async function () {
            var target = b.dataset.liveGoldUsd ? document.getElementById(b.dataset.liveGoldUsd) : b.parentElement.querySelector('input[type=number]');
            var d = await liveData();
            if (d && d.gold[0] > 0 && d.usd[1] > 0 && target) { target.value = (Math.round(d.gold[0] / d.usd[1] * 100) / 100).toString(); target.dispatchEvent(new Event('input', { bubbles: true })); }
            else alert('Canlı altın fiyatı alınamadı. Fiyatı elle yazın.');
        });
    });

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

    $$('[data-image-input]').forEach(function (inp) {
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
    var of = $('[data-order-form]');
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
        var rowHtml = function () { return '<div class="rec-exp-row"><input type="text" class="rx-d" placeholder="Açıklama"><input type="number" class="rx-a" min="0" step="0.01" placeholder="$" data-calc="exp"><button type="button" class="rx-x" title="Satırı sil">✕</button></div>'; };
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
    var pf = $('[data-pay-form]');
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
    var ef = $('[data-expense-form]');
    if (ef) {
        var ea = $('[data-exp="amount"]', ef), er = $('[data-exp="rate"]', ef), ep = $('#expenseUsdPreview');
        var prev = function () { var a = num(ea), r = num(er); ep.textContent = (a >= 0 && r > 0 && a !== null) ? '= ' + money(a / r) : ''; };
        ef.addEventListener('input', prev);
        var fill = function () { if (!er.value && window.__mtLT && window.__mtLT.usd[1] > 0) { er.value = (Math.round(window.__mtLT.usd[1] * 10000) / 10000).toString(); prev(); } };
        document.addEventListener('mt:ticker', fill); fill(); prev();
    }
})();
