/* Situation Normal listening station. JOS-001 receiver.
   Static, client-side only. No passphrase or payoff plaintext ever goes in this repo. */
(function () {
  'use strict';

  // ---- config -------------------------------------------------------------
  var YT = { mike: 'UGfrBqloiOg', king: 'IVY_KING_VIDEO_ID' }; // set before launch
  var KING_LIVE_AT = Date.parse('2026-11-15T23:30:00Z');
  var TUNE = (window.SN && window.SN.tune) || 640;

  var STATIONS = [
    { f: 500, kind: 'static', note: 'Distress watch. Awaiting activation.',
      usb: '··· −−− ···  ··· −−− ···\nAUTOMATED. NO OPERATOR ON WATCH.',
      lsb: 'WATCH ROSTER: 1 OF 2 PRESENT.\nSECOND OPERATOR: NOT HUMAN.' },
    { f: 640, kind: 'active',
      usb: 'LOG 19:14:59Z · REEL 2 ROLLING\nCMD FRAGMENT RECEIVED: /iv_ _ _ _ _',
      lsb: 'S&P 3.3 IN EFFECT.\nthe algorithm reports: GRID LOCK HOLDING.' },
    { f: 1240, kind: 'static', note: 'Scheduled. Hometown relay standing by.',
      usb: 'RELAY TEST · RELAY TEST · DISREGARD\nORIGIN: SOMEWHERE IN THE MIDDLE OF THE MAP',
      lsb: 'ENGINEER ON SITE SINCE 1931.' },
    { f: 2182, kind: 'static', note: 'Silence period in effect. Keep listening.',
      usb: '. . . . . . . . . .\n(SILENCE IS ALSO A TRANSMISSION)',
      lsb: 'IF YOU CAN READ THIS, YOU ARE NOT LISTENING.' },
    { f: 3260, kind: 'numbers', hidden: true,
      usb: 'KEY PAGE 07 REFERENCED.\nSEE RUNBOOK.', lsb: 'THIS FREQUENCY DOES NOT EXIST.' },
    { f: 5000, kind: 'static', note: 'Time signal offline. Awaiting final transmission.',
      usb: 'AT THE TONE, THE TIME WILL BE: [WITHHELD]', lsb: 'NO CARRIER EXPECTED UNTIL FINAL TRANSMISSION.' }
  ];
  var MINOR = [550, 600, 700, 800, 900, 1000, 1100, 1400, 1600, 1800, 2000, 2500, 3000, 3500, 4000, 4500];
  var tOf = function (f) { return Math.log10(f / 500); };
  var pos = function (t) { return (3 + 94 * t).toFixed(2) + '%'; };
  var kingLive = function () { return Date.now() >= KING_LIVE_AT; };

  // ---- markup -------------------------------------------------------------
  var SYMBOL = '<svg width="64" height="64" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#0E0E0C"/><circle cx="50" cy="50" r="44" fill="#F2C200"/><circle cx="50" cy="50" r="40" fill="#0E0E0C"/><polygon points="50,50 30,15.36 70,15.36" fill="#F2C200"/><polygon points="50,50 90,50 70,84.64" fill="#F2C200"/><polygon points="50,50 30,84.64 10,50" fill="#F2C200"/></svg>';
  var SMALL_KNOBS = [{ id: 'vol', label: 'VOLUME' }, { id: 'sq', label: 'SQUELCH' }, { id: 'clr', label: 'CLARIFIER' }];
  var app = document.getElementById('app');
  app.innerHTML =
    '<div class="wrap"><div class="col">' +
    '<header>' + SYMBOL + '<div><h1 class="typewriter">SITUATION NORMAL</h1><p>LISTENING STATION · RECEIVER JOS · TUNE TO AN ACTIVE FREQUENCY</p></div></header>' +
    '<section class="receiver" aria-label="Receiver">' +
      '<div class="dim" data-dim style="display:flex;flex-direction:column;gap:24px">' +
        '<div class="readout"><div><div class="lbl">FREQUENCY</div><div class="freq typewriter" id="freq"></div></div>' +
        '<div style="text-align:right"><div class="lbl">STATUS</div><div class="status" id="status"></div></div></div>' +
        '<div class="dial" id="dial"><div class="line"></div><span class="band" id="bandlbl"></span><div class="needle" id="needle"></div></div>' +
      '</div>' +
      '<div class="controls">' +
        '<div class="stack"><button type="button" class="knob" id="knob" aria-label="Tuning knob. Drag to turn, or use the arrow keys."><div class="cap" id="cap"><i id="capmark"></i></div></button><span class="lbl">TUNING</span></div>' +
        '<div class="smallknobs">' + SMALL_KNOBS.map(function (k) {
          return '<div class="stack"><button type="button" class="knob sm" id="k-' + k.id + '" role="slider" aria-label="' + k.label + '. Drag up or down, scroll, or use the arrow keys." aria-valuemin="0" aria-valuemax="100"><div class="cap" id="kc-' + k.id + '"><i id="km-' + k.id + '"></i></div></button>' +
            '<span class="lbl">' + k.label + '</span>' + (k.id === 'sq' ? '<div style="display:flex;align-items:center;gap:6px"><div class="lamp" id="busy"></div><span class="lbl" style="font-size:10px">BUSY</span></div>' : '') + '</div>';
        }).join('') + '</div>' +
        '<div class="memory"><span class="lbl">MEMORY</span><div class="row" id="presets"></div></div>' +
        '<div class="stack" style="align-items:flex-start"><span class="lbl">SIDEBAND</span><div class="seg" id="modes"></div>' +
          '<button type="button" class="btn" id="audio" style="font-size:13px"></button></div>' +
        '<div class="stack"><button type="button" class="power" id="power" aria-label="Power"><div id="rtop">ON</div><div id="rbot">OFF</div></button>' +
          '<div style="display:flex;align-items:center;gap:8px"><div class="lamp" id="plamp"></div><span class="lbl">POWER</span></div></div>' +
      '</div>' +
      '<div class="sideband hidden" id="sideband"><span class="lbl" id="sbname"></span><span class="txt" id="sbtext"></span></div>' +
      '<div class="panels dim" data-dim>' +
        '<div class="panel signal"><span class="lbl">SIGNAL</span><div class="meter" id="meter"></div><span style="font-size:13px;color:#CFCABB" id="meternote"></span></div>' +
        '<div class="panel receiving"><span class="lbl">RECEIVING</span><div id="rx"></div></div>' +
        '<div class="monitor hidden" id="monitor"><div class="bar">' +
          '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:18px"><span class="lbl">MONITOR · JOS-001 · 640 kc</span>' +
          '<div class="tally"><i id="tlamp"></i><span id="ttext"></span></div></div>' +
          '<div class="row" id="builds"></div></div>' +
          '<div class="crt" id="crt"><div class="lines"></div></div>' +
        '</div>' +
      '</div>' +
    '</section>' +
    '<section class="terminal" aria-label="Operator terminal"><span class="lbl">OPERATOR TERMINAL</span><span>&gt; for help type /help</span>' +
      '<form id="term"><label for="cmd">&gt;</label><input id="cmd" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="enter command or passphrase"><button class="send" type="submit">TRANSMIT</button></form>' +
      '<div class="reply"><span id="reply"></span><span class="cursor">_</span></div></section>' +
    '<footer><span class="typewriter">Let us face without panic the reality of our times.</span><span>Every release ships with a runbook. Read the documentation.</span></footer>' +
    '</div></div>';

  var $ = function (id) { return document.getElementById(id); };
  var dial = $('dial');
  MINOR.forEach(function (m) { var d = document.createElement('div'); d.className = 'tick'; d.style.left = pos(tOf(m)); dial.insertBefore(d, $('bandlbl')); });
  STATIONS.filter(function (s) { return !s.hidden; }).forEach(function (s, i, all) {
    var d = document.createElement('div'); d.className = 'mark' + (i === 0 ? ' first' : (i === all.length - 1 ? ' last' : '')); d.style.left = pos(tOf(s.f));
    d.innerHTML = '<span>' + s.f + '</span><i></i>'; dial.insertBefore(d, $('bandlbl'));
  });
  // CONELRAD: sets sold 1953-63 carried the Civil Defense triangle at 640 and 1240
  [640, 1240].forEach(function (f) {
    var c = document.createElement('div'); c.className = 'cd'; c.style.left = pos(tOf(f)); c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<svg width="20" height="18" viewBox="0 0 20 18"><polygon points="10,1.5 18.5,16.5 1.5,16.5" fill="none" stroke="#F2C200" stroke-width="1.4"/>' +
      '<text x="10" y="14.2" text-anchor="middle" font-size="6.5" font-weight="700" fill="#F2C200" font-family="IBM Plex Mono, monospace">CD</text></svg>';
    dial.insertBefore(c, $('bandlbl'));
  });

  // ---- state --------------------------------------------------------------
  var savedVol = 0.6;
  try { var sv = parseFloat(localStorage.getItem('sn.vol')); if (sv >= 0 && sv <= 1) savedVol = sv; } catch (e) {}
  // vol, sq, clr are knob positions 0..1 (clarifier centre = 0.5)
  var S = { power: false, t: tOf(TUNE), band: 'MF', mode: 'AM', audio: true, monitor: false, build: kingLive() ? 'king' : 'mike', playing: null,
            vol: savedVol, sq: 0, clr: 0.5 };
  var fails = 0;
  var set = function (p) { for (var k in p) S[k] = p[k]; render(); };
  // Touching the receiver takes it back from the monitor: the monitor closes, the video stops, the radio returns.
  var radio = function (p) { p.monitor = false; p.playing = null; set(p); };
  var setT = function (t) { radio({ t: Math.max(0, Math.min(1, t)), band: 'MF' }); };
  var setKnob = function (id, v) {
    var p = {}; p[id] = Math.max(0, Math.min(1, v));
    if (id === 'vol') { try { localStorage.setItem('sn.vol', p.vol.toFixed(3)); } catch (e) {} }
    radio(p);
  };

  function tuneInfo() {
    var best = null, bestD = 9;
    STATIONS.forEach(function (s) { var d = Math.abs(tOf(s.f) - S.t); if (d < bestD) { bestD = d; best = s; } });
    return { best: best, bestD: bestD, lockedOn: bestD < 0.012 };
  }

  // ---- audio (all generated in the browser) -------------------------------
  // Chain: noise + voice -> master (volume) -> squelch gate -> limiter -> out.
  // The meter reads the signal, not the speaker, so it still moves at zero volume or with the squelch closed.
  var A = null;
  var rnd = Math.random;
  // Carrier strength per station kind (0..1). The unlisted station sits just above the noise floor on purpose.
  function signalStrength() {
    if (!S.power || S.band === 'L') return 0;
    var ti = tuneInfo(), prox = ti.lockedOn ? 1 : (ti.bestD < 0.045 ? 1 - ti.bestD / 0.045 : 0);
    var k = ti.best.kind, base = k === 'active' ? 0.85 : (k === 'numbers' ? 0.22 : (S.mode !== 'AM' ? 0.5 : 0));
    return base * prox;
  }
  // Each station's sideband has its own clarifier sweet spot, and even the sweet spot is a hair off.
  function sweetSpot(f) { return 0.5 + (((f * 37) % 100) / 100 - 0.5) * 0.7; }
  // iPhone: page-generated sound counts as "ambient" and the silent switch mutes it.
  // Asking for a playback session (iOS 17+), or holding a looping silent media element (older iOS), makes it a radio, not a game.
  var keepAlive = null;
  function silentWavUrl() {
    var rate = 8000, n = rate / 2, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
    var w = function (o, str) { for (var i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  function holdPlaybackSession() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      if (!keepAlive) { keepAlive = document.createElement('audio'); keepAlive.src = silentWavUrl(); keepAlive.loop = true; keepAlive.setAttribute('playsinline', ''); }
      var pr = keepAlive.play(); if (pr && pr.catch) pr.catch(function () {});
    } catch (e) {}
  }
  function startAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    holdPlaybackSession();
    if (A) { try { A.ac.resume(); } catch (e) {} return; }
    var ac = new AC();
    try { ac.resume(); } catch (e) {}
    var limiter = ac.createDynamicsCompressor(); limiter.threshold.value = -10; limiter.ratio.value = 12; limiter.connect(ac.destination);
    var sqGain = ac.createGain(); sqGain.gain.value = 1; sqGain.connect(limiter);
    var master = ac.createGain(); master.gain.value = 0; master.connect(sqGain);
    var buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = rnd() * 2 - 1;
    var noise = ac.createBufferSource(); noise.buffer = buf; noise.loop = true;
    var nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1400; nf.Q.value = 0.4;
    var noiseGain = ac.createGain(); noiseGain.gain.value = 0;
    noise.connect(nf); nf.connect(noiseGain); noiseGain.connect(master); noise.start();
    // voice: buzz through two moving formants, held to the 300-3000 Hz voice band
    var osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 130;
    var f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 700; f1.Q.value = 5;
    var f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1300; f2.Q.value = 5;
    var hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300; hp.Q.value = 0.7;
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; lp.Q.value = 0.7;
    osc.connect(f1); osc.connect(f2); f1.connect(hp); f2.connect(hp); hp.connect(lp);
    // mistuned SSB = ring modulation; the clarifier slows the ring and lets a little of the straight voice through
    var ring = ac.createGain(); ring.gain.value = 0;
    var carrier = ac.createOscillator(); carrier.type = 'sine'; carrier.frequency.value = 420; carrier.connect(ring.gain);
    var ringOut = ac.createGain(); ringOut.gain.value = 1;
    var dry = ac.createGain(); dry.gain.value = 0;
    lp.connect(ring); ring.connect(ringOut); lp.connect(dry);
    var gate = ac.createGain(); gate.gain.value = 0;
    var voiceGain = ac.createGain(); voiceGain.gain.value = 0;
    ringOut.connect(gate); dry.connect(gate); gate.connect(voiceGain); voiceGain.connect(master);
    osc.start(); carrier.start();

    // phrasing: syllables grouped into words and sentences, pitch falling across each sentence, breath pauses between
    var left = 0, len = 1, pitch = 150;
    (function syllable() {
      var now = ac.currentTime;
      if (left <= 0) {
        len = left = 6 + Math.floor(rnd() * 9); pitch = 130 + rnd() * 40;
        gate.gain.setTargetAtTime(0, now, 0.03);
        setTimeout(syllable, 320 + rnd() * 650); return;
      }
      var dur = 0.08 + rnd() * 0.15;
      var p = pitch * (0.78 + 0.32 * (left / len)) * (rnd() < 0.18 ? 1.18 : 1);
      if (left === 1 && rnd() < 0.3) p *= 1.25; // the odd question
      osc.frequency.setTargetAtTime(p, now, 0.04);
      f1.frequency.setTargetAtTime(300 + rnd() * 600, now, 0.02);
      f2.frequency.setTargetAtTime(900 + rnd() * 1500, now, 0.02);
      f1.frequency.setTargetAtTime(300 + rnd() * 600, now + dur * 0.5, 0.03); // vowel glide
      gate.gain.setTargetAtTime(1, now, 0.012);
      gate.gain.setTargetAtTime(0, now + dur * 0.85, 0.02);
      left--;
      var gap = rnd() < 0.3 ? 0.05 + rnd() * 0.1 : 0.012; // gaps between words
      setTimeout(syllable, (dur + gap) * 1000);
    })();

    // squelch: open while the received level (signal, or the wandering noise floor) beats the knob; short tail on close
    var open = true;
    setInterval(function () {
      var now = ac.currentTime, sig = signalStrength();
      var rssi = Math.max(0.12 + (rnd() - 0.5) * 0.08, sig * (1 + (rnd() - 0.5) * 0.12));
      var o = S.sq < 0.02 || rssi > S.sq;
      if (o && !open) sqGain.gain.setTargetAtTime(1, now, 0.004);
      if (!o && open) sqGain.gain.setTargetAtTime(0, now + 0.11, 0.008);
      open = o;
      var lamp = $('busy'), lit = S.power && o && S.sq >= 0.02;
      lamp.style.background = lit ? '#F2C200' : '#2A2922'; lamp.style.boxShadow = lit ? '0 0 8px #F2C200' : 'none';
    }, 60);

    // 500 kc: automated CW distress, only audible with the BFO on (sideband modes). Slow SOS x3, then a long gap.
    var bfo = ac.createOscillator(); bfo.type = 'sine'; bfo.frequency.value = 700;
    var key = ac.createGain(); key.gain.value = 0;
    var cwGain = ac.createGain(); cwGain.gain.value = 0;
    bfo.connect(key); key.connect(cwGain); cwGain.connect(master); bfo.start();
    var DIT = 0.1, MORSE = { S: '...', O: '---' };
    (function sendCW() {
      var t = ac.currentTime + 0.05;
      ['SOS', 'SOS', 'SOS'].forEach(function (word) {
        word.split('').forEach(function (ch) {
          MORSE[ch].split('').forEach(function (el) {
            var len = el === '.' ? DIT : DIT * 3;
            key.gain.setTargetAtTime(1, t, 0.004); key.gain.setTargetAtTime(0, t + len, 0.004);
            t += len + DIT;
          });
          t += DIT * 2;
        });
        t += DIT * 4;
      });
      setTimeout(sendCW, (t - ac.currentTime + 6) * 1000);
    })();

    A = { ac: ac, master: master, noiseGain: noiseGain, voiceGain: voiceGain, carrier: carrier, ringOut: ringOut, dry: dry, bfo: bfo, cwGain: cwGain };
    applyAudio();
  }
  function applyAudio() {
    if (!A) return;
    var now = A.ac.currentTime, ti = tuneInfo();
    var lvl = ti.lockedOn ? 1 : (ti.bestD < 0.045 ? 1 - ti.bestD / 0.045 : 0);
    var live = S.power && S.audio && S.band !== 'L' && !S.monitor;
    var sb = S.mode !== 'AM';
    // let go of the media session while the monitor (YouTube) has the floor; take it back when the radio returns
    if (keepAlive) { if (S.monitor || !S.power) keepAlive.pause(); else if (keepAlive.paused) holdPlaybackSession(); }
    var vol = 0.14 * Math.pow(S.vol / 0.6, 2); // 60% on the knob = the old fixed level
    A.master.gain.setTargetAtTime(live ? vol : 0, now, 0.08);
    A.noiseGain.gain.setTargetAtTime(sb ? 0.35 - 0.12 * lvl : 0.9 - 0.6 * lvl, now, 0.08);
    var cw = sb && ti.best.f === 500; // distress watch is Morse, not voice
    A.voiceGain.gain.setTargetAtTime(sb && !cw ? 0.15 + 0.85 * lvl : 0, now, 0.08);
    A.cwGain.gain.setTargetAtTime(cw ? 0.35 * lvl : 0, now, 0.08);
    A.bfo.frequency.setTargetAtTime(Math.max(250, Math.min(1200, (S.mode === 'LSB' ? 600 : 700) + (S.clr - 0.5) * 900)), now, 0.05);
    var off = Math.min(1, Math.abs(S.clr - sweetSpot(ti.best.f)) * 1.6);
    var clarity = 1 - off;
    A.carrier.frequency.setTargetAtTime((S.mode === 'LSB' ? 0.8 : 1) * (38 + 560 * off), now, 0.05);
    A.ringOut.gain.setTargetAtTime(1 - 0.45 * clarity * clarity, now, 0.05);
    A.dry.gain.setTargetAtTime(0.5 * clarity * clarity, now, 0.05);
  }

  // ---- render -------------------------------------------------------------
  var WAVE = ''; for (var w = 0; w < 24; w++) WAVE += '<i style="animation-delay:' + ((-(w * 37) % 900) / 1000) + 's"></i>';
  function btn(label, on, cls, attr) { return '<button type="button" class="btn ' + (cls || '') + (on ? ' on' : '') + '" ' + attr + '>' + label + '</button>'; }

  function render() {
    var on = S.power, locked = S.band === 'L', ti = tuneInfo(), best = ti.best, bestD = ti.bestD, lockedOn = ti.lockedOn;
    var f = 500 * Math.pow(10, S.t);
    var near = !lockedOn && bestD < 0.045 && best.kind !== 'static';
    var ozma = kingLive(); // breadcrumb 1: faint carrier on the locked band after the Ivy King final
    var level = 0;
    if (on && !locked) {
      if (lockedOn && best.kind === 'active') level = 5;
      else if (lockedOn && best.kind === 'numbers') level = 3;
      else if (near) level = Math.max(1, Math.round(4 * (1 - bestD / 0.045)));
      else level = 1;
    } else if (on && locked && ozma) level = 1;
    var status = 'POWER OFF', sc = '#5A574A';
    if (on) {
      if (locked) { status = 'LOCKED'; sc = '#E8542E'; }
      else if (lockedOn && best.kind === 'active') { status = 'TRANSMISSION ACTIVE'; sc = '#F2C200'; }
      else if (lockedOn && best.kind === 'numbers') { status = 'UNLISTED'; sc = '#E8542E'; }
      else if (near) { status = 'CARRIER'; sc = '#F2C200'; }
      else { status = 'NO CARRIER'; sc = '#8C887A'; }
    }
    document.querySelectorAll('[data-dim]').forEach(function (el) { el.style.opacity = on ? '1' : '0.25'; });
    $('freq').textContent = !on ? '— — —' : (locked ? '1420 Mc' : (lockedOn ? best.f : Math.round(f / 5) * 5) + ' kc');
    var st = $('status'); st.textContent = status; st.style.color = sc; st.style.borderColor = sc;
    $('bandlbl').textContent = locked ? 'BAND L · 1420 Mc' : 'BAND MF/HF · 500–5000 kc';
    $('needle').style.left = locked ? '50%' : pos(S.t);
    $('cap').style.transform = 'rotate(' + (-135 + 270 * S.t).toFixed(1) + 'deg)';
    $('capmark').style.background = on ? '#F2C200' : '#8C887A';
    SMALL_KNOBS.forEach(function (k) {
      $('kc-' + k.id).style.transform = 'rotate(' + (-135 + 270 * S[k.id]).toFixed(1) + 'deg)';
      $('km-' + k.id).style.background = on ? '#F2C200' : '#8C887A';
      $('k-' + k.id).setAttribute('aria-valuenow', Math.round(S[k.id] * 100));
    });

    $('presets').innerHTML = STATIONS.filter(function (s) { return !s.hidden; }).map(function (s) {
      return btn(s.f + ' kc', on && !locked && lockedOn && best.f === s.f, '', 'data-f="' + s.f + '"');
    }).join('') + btn('BAND: ' + (locked ? 'L' : 'MF/HF'), false, '', 'data-band="1"');
    $('modes').innerHTML = ['AM', 'USB', 'LSB'].map(function (m) { return btn(m, S.mode === m, 'red', 'data-mode="' + m + '" aria-pressed="' + (S.mode === m) + '"'); }).join('');
    $('audio').textContent = 'AUDIO: ' + (S.audio ? 'ON' : 'MUTED');

    $('rtop').style.background = on ? '#D63B2B' : '#5A2A24'; $('rtop').style.color = '#0E0E0C';
    $('rtop').style.boxShadow = on ? 'inset 0 -4px 0 rgba(0,0,0,.35)' : 'none';
    $('rbot').style.background = on ? '#2A2922' : '#3A382F'; $('rbot').style.color = '#E8E4D8';
    $('rbot').style.boxShadow = on ? 'none' : 'inset 0 -4px 0 rgba(0,0,0,.35)';
    $('power').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('plamp').style.background = on ? '#E8542E' : '#3A2A24'; $('plamp').style.boxShadow = on ? '0 0 10px #E8542E' : 'none';

    var showSb = on && !locked && S.mode !== 'AM';
    $('sideband').classList.toggle('hidden', !showSb);
    if (showSb) {
      $('sbname').textContent = 'SIDEBAND TRAFFIC · ' + (S.mode === 'USB' ? 'UPPER SIDEBAND' : 'LOWER SIDEBAND');
      $('sbtext').textContent = bestD < 0.045 ? (S.mode === 'USB' ? best.usb : best.lsb) : 'Unintelligible. Tune closer to a carrier.';
    }

    var meter = ''; for (var i = 0; i < 5; i++) meter += '<i style="height:' + (12 + i * 9) + 'px;background:' + (i < level ? '#F2C200' : '#2A2922') + '"></i>';
    $('meter').innerHTML = meter;
    $('meternote').textContent = !on ? 'No reading.' : (locked ? (ozma ? 'Faint carrier. Unreadable.' : 'No reading.') : (level >= 5 ? 'Strong. Clear channel.' : (level >= 2 ? 'Rising. Fine-tune.' : 'Noise floor only.')));

    var active = on && !locked && lockedOn && best.kind === 'active';
    var rx = '';
    if (!on) rx = '<span style="font-size:18px;color:#8C887A">Receiver off. Throw the power switch.</span>';
    else if (locked) rx = '<div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:18px;color:#CFCABB">BAND LOCKED</span><span style="font-size:13px;color:#A9A493">1420 Mc. Listening for something that is not on any tracklist. Clearance required.</span></div>';
    else if (active) rx = '<div style="display:flex;flex-direction:column;gap:12px"><span style="font-size:18px;color:#F2C200">▶ JOS-001 · 640 kc · ' + (kingLive() ? 'v0.1.1 “Ivy King”' : 'v0.1.0 “Ivy Mike”') + '</span><div class="wave" aria-hidden="true">' + WAVE + '</div><span style="font-size:13px;color:#CFCABB">Transmission active. Runbook attached.</span>' +
      '<button type="button" class="btn on" id="openmon" style="align-self:flex-start;font-weight:600">' + (S.monitor ? 'CLOSE MONITOR' : 'OPEN MONITOR') + '</button></div>';
    else if (lockedOn && best.kind === 'numbers') rx = '<div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:13px;letter-spacing:2px;color:#E8542E">UNLISTED FREQUENCY · DO NOT LOG</span><span style="font-size:22px;letter-spacing:4px;line-height:1.6">47213 90816 33025 71148<br>06529 18834 52071 69903</span><span style="font-size:13px;color:#A9A493">Message repeats. Key not included.</span></div>';
    else if (near) rx = '<div style="display:flex;flex-direction:column;gap:10px"><span class="noise" style="color:#CFCABB">· ··▮· ·▮·· ▮ ·· ▮·· · ▮</span><span style="font-size:18px;color:#F2C200">Carrier detected. Keep turning.</span></div>';
    else rx = '<div style="display:flex;flex-direction:column;gap:10px"><span class="noise">· ·· ·  ··· ·  · ·· ··· ·  ·· · ·</span><span style="font-size:18px;color:#CFCABB">NO CARRIER</span><span style="font-size:13px;color:#A9A493">' + ((lockedOn && best.note) ? best.note : 'Noise floor only. Keep turning.') + '</span></div>';
    var rxEl = $('rx'); if (rxEl.getAttribute('data-k') !== rx) { rxEl.innerHTML = rx; rxEl.setAttribute('data-k', rx); }

    var showMon = S.monitor && active;
    $('monitor').classList.toggle('hidden', !showMon);
    if (showMon) renderMonitor();
    applyAudio();
  }

  function renderMonitor() {
    var live = S.build === 'mike' || kingLive();
    $('builds').innerHTML = btn('v0.1.0 IVY MIKE', S.build === 'mike', '', 'data-build="mike"') + btn('v0.1.1 IVY KING', S.build === 'king', '', 'data-build="king"');
    var tl = $('tlamp'), tt = $('ttext');
    tl.style.background = live ? '#FF8A2B' : '#8A1C10';
    tl.style.boxShadow = live ? '0 0 6px #FF8A2B, 0 0 16px rgba(255,120,30,.7)' : '0 0 4px rgba(190,35,20,.55), 0 0 9px rgba(160,25,15,.3)';
    tl.style.animation = live ? 'sn-nixie 3.7s linear infinite' : 'none';
    tt.textContent = live ? 'TRANSMISSION ACTIVE' : 'STANDING BY';
    tt.style.color = live ? '#FF9A40' : '#8A5A50';
    tt.style.textShadow = live ? '0 0 8px rgba(255,120,30,.8)' : 'none';
    var crt = $('crt'), key = S.build + (S.playing === S.build ? ':play' : '') + (live ? ':live' : '');
    if (crt.getAttribute('data-k') === key) return;
    crt.setAttribute('data-k', key);
    if (S.playing === S.build && live) {
      crt.innerHTML = '<iframe src="https://www.youtube.com/embed/' + YT[S.build] + '?autoplay=1&rel=0&playsinline=1" title="JOS-001 640 kc" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      return;
    }
    var title = S.build === 'king' ? 'v0.1.1 “IVY KING”' : 'v0.1.0 “IVY MIKE”';
    var note = live ? (S.build === 'king' ? 'TRANSMITTED 15 · XI · 2026.' : 'TRANSMITTED 31 · X · 2026.') : 'SCHEDULED · 15 · XI · 23:30Z ANNIVERSARY. NOT YET TRANSMITTED.';
    crt.innerHTML = '<div class="lines"></div><div class="card"><span class="typewriter" style="font-size:28px;color:#F2C200">' + title + '</span><span style="font-size:14px;color:#CFCABB">' + note + '</span>' +
      (live ? '<button type="button" class="btn on" id="play" style="font-weight:600">PLAY TRANSMISSION</button>' : '') + '</div>';
  }

  // ---- terminal -----------------------------------------------------------
  function fallback(c) {
    var w = c.replace(/^\//, '').trim();
    var has = function (l) { return l.some(function (k) { return w.indexOf(k) !== -1; }); };
    var is = function (l) { return l.indexOf(w) !== -1; };
    var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
    if (!w) return 'NO TRAFFIC RECEIVED.';
    if (is(['help', '?', 'h', 'man', 'commands'])) return 'for help type /help';
    if (has(['fuck', 'shit', 'bitch', 'cunt', 'asshole', 'dick', 'piss', 'bastard', 'damn'])) return pick(['LANGUAGE LOGGED. THIS RECEIVER HAS BEEN NOTED.', 'TRAFFIC REJECTED. PROFANITY IS NOT A RECOGNIZED PROTOCOL.', 'the algorithm has heard worse. COMMAND NOT RECOGNIZED.']);
    if (has(['hack', 'sudo', 'root', 'admin', 'exploit', 'shell', 'passwd', 'password', 'login', 'rm -rf', 'drop table', '<scr', "' or", '1=1', 'nmap', 'ssh'])) return pick(['INTRUSION ATTEMPT LOGGED. the algorithm observes.', 'listener is not in the sudoers file. This incident will be reported.', 'ACCESS DENIED. ATTEMPT TIMESTAMPED ' + new Date().toISOString().slice(11, 19) + 'Z.']);
    if (is(['whoami'])) return 'LISTENER. UNREGISTERED. FOR NOW.';
    if (has(['operator', 'who are you', 'who is'])) return 'The Operator: [REDACTED]. the algorithm: PRESENT.';
    if (has(['play', 'download', 'mp3', 'stream', 'spotify', 'album'])) return 'THIS STATION DOES NOT HOLD THE SIGNAL. IT TUNES TO IT.';
    if (is(['sing', 'singer', 'vocals', 'vocalist']) || has(['lyric'])) return 'NO VOCALIST FOUND.';
    if (has(['panic', 'scared', 'afraid'])) return 'LET US FACE WITHOUT PANIC THE REALITY OF OUR TIMES.';
    if (has(['sos', 'mayday'])) return '··· −−− ···  DISTRESS NOTED. 500 kc STANDING BY.';
    if (is(['exit', 'quit', 'logout', 'bye', 'q'])) return 'THERE IS NO EXIT. REMAIN TUNED.';
    if (is(['hello', 'hi', 'hey', 'yo', 'greetings'])) return 'ACKNOWLEDGED. STATE YOUR TRAFFIC.';
    if (is(['ai']) || has(['gpt', 'claude', 'chatbot', 'robot'])) return 'the algorithm does not answer to that name.';
    if (has(['1420', 'ozma', 'alien', 'ufo', 'hydrogen'])) return 'BAND LOCKED. CLEARANCE REQUIRED.';
    if (is(['ls', 'dir', 'pwd', 'cd']) || has(['cat '])) return 'PERMISSION DENIED. SEE RUNBOOK.';
    if (has(['ivy'])) return 'PARTIAL MATCH. CHECK YOUR TRAFFIC.';
    fails++;
    if (fails >= 4) return 'REPEATED UNRECOGNIZED TRAFFIC. THIS RECEIVER IS NOW UNDER OBSERVATION.';
    return pick(['AUTHORIZATION NOT RECOGNIZED.', 'COMMAND NOT ON FILE.', 'UNKNOWN TRAFFIC. DISCARDED.']);
  }
  var COMMANDS = {
    '/help': 'AVAILABLE: /help /status /log. ALL OTHER COMMANDS REQUIRE CLEARANCE.',
    '/status': 'the algorithm: ON DUTY. The Operator: [REDACTED]. SITUATION: NORMAL.',
    '/log': 'JOS-001 640 kc ACTIVE. 3 FREQUENCIES PENDING. 1 FREQUENCY NOT LISTED.',
    '/ivyking': 'AUTH ACCEPTED. OPERATOR LOG 0001. THIS RECEIVER IS NOW ON LISTENING WATCH.\nIN THE EVENT OF A TRANSMISSION, REMAIN TUNED TO THIS STATION OR @SitNormControl.',
    '/elugelab': 'FILE: OPERATION IVY · ENEWETAK ATOLL · 1952\nMIKE  31 OCT 1952 19:14:59Z · 10.4 MT · SURFACE · ELUGELAB\nKING  15 NOV 1952 23:30:00Z · 500 KT · AIR DROP · RUNIT\nELUGELAB: ISLAND NOT FOUND.'
  };
  $('term').addEventListener('submit', function (e) {
    e.preventDefault();
    var c = $('cmd').value.trim().toLowerCase().replace(/^auth:?\s*/, '');
    var r = COMMANDS.hasOwnProperty(c) ? COMMANDS[c] : null;
    if (r === null) r = fallback(c); else fails = 0;
    $('reply').textContent = r; $('cmd').value = '';
  });

  // ---- input --------------------------------------------------------------
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'power') { if (!S.power) startAudio(); radio({ power: !S.power }); }
    else if (b.dataset.f) setT(tOf(+b.dataset.f));
    else if (b.dataset.band) radio({ band: S.band === 'L' ? 'MF' : 'L' });
    else if (b.dataset.mode) radio({ mode: b.dataset.mode });
    else if (b.id === 'audio') radio({ audio: !S.audio });
    else if (b.id === 'openmon') set({ monitor: !S.monitor, playing: null });
    else if (b.dataset.build) set({ build: b.dataset.build, playing: null });
    else if (b.id === 'play') set({ playing: S.build });
  });
  var knob = $('knob'), dragging = false;
  function angle(e) {
    var r = knob.getBoundingClientRect();
    var a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
    return Math.max(-135, Math.min(135, a));
  }
  knob.addEventListener('pointerdown', function (e) { dragging = true; knob.setPointerCapture(e.pointerId); setT((angle(e) + 135) / 270); });
  knob.addEventListener('pointermove', function (e) { if (dragging) setT((angle(e) + 135) / 270); });
  knob.addEventListener('pointerup', function (e) { dragging = false; try { knob.releasePointerCapture(e.pointerId); } catch (x) {} });
  knob.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setT(S.t + 0.004); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setT(S.t - 0.004); }
  });

  // small knobs: drag up/right to turn clockwise, scroll wheel, arrow keys
  SMALL_KNOBS.forEach(function (k) {
    var el = $('k-' + k.id), drag = null;
    el.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, v: S[k.id] }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', function (e) { if (drag) setKnob(k.id, drag.v + ((drag.y - e.clientY) + (e.clientX - drag.x)) / 180); });
    el.addEventListener('pointerup', function (e) { drag = null; try { el.releasePointerCapture(e.pointerId); } catch (x) {} });
    el.addEventListener('wheel', function (e) { e.preventDefault(); setKnob(k.id, S[k.id] + (e.deltaY < 0 ? 0.03 : -0.03)); }, { passive: false });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setKnob(k.id, S[k.id] + 0.02); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setKnob(k.id, S[k.id] - 0.02); }
    });
  });

  render();
})();
