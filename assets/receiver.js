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
    '<section class="console" aria-label="Receiver">' +
      '<div class="bezel"><div class="bezel-l"><span class="lbl">MONITOR · JOS-001</span><span class="lbl" id="viewlbl"></span></div>' +
        '<div class="tally"><i id="tlamp"></i><span id="ttext"></span></div></div>' +
      '<div class="screen" id="screen"><div class="lines"></div>' +
        '<div class="view radio" id="v-radio">' +
          '<div class="readout dim" data-dim><div><div class="lbl">FREQUENCY</div><div class="freq" id="freq" aria-live="off"></div></div>' +
            '<div class="sideband hidden" id="sideband"><span class="lbl" id="sbname"></span><span class="txt" id="sbtext"></span></div>' +
            '<div class="rside"><div class="meter" id="meter" aria-hidden="true"></div><div class="status" id="status"></div></div></div>' +
          '<div class="dial dim" data-dim id="dial"><div class="line"></div><span class="band" id="bandlbl"></span><div class="needle" id="needle"></div></div>' +
          '<div class="rx" id="rx" aria-live="polite"></div>' +
        '</div>' +
        '<div class="view term hidden" id="v-term" aria-label="Operator terminal">' +
          '<div class="tlog" id="tlog"><div>OPERATOR TERMINAL</div><div>for help type /help</div></div>' +
          '<form id="term"><label for="cmd">&gt;</label><input id="cmd" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="enter command or passphrase"><button class="send" type="submit">TRANSMIT</button></form>' +
        '</div>' +
        '<div class="view play hidden" id="v-play"></div>' +
      '</div>' +
      '<div class="deck">' +
        '<div class="stack tuning"><button type="button" class="knob" id="knob" aria-label="Tuning knob. Drag to turn, or use the arrow keys."><div class="cap" id="cap"><i id="capmark"></i></div></button><span class="lbl">TUNING</span></div>' +
        '<div class="smallknobs">' + SMALL_KNOBS.map(function (k) {
          return '<div class="stack"><button type="button" class="knob sm" id="k-' + k.id + '" role="slider" aria-label="' + k.label + '. Drag up or down, scroll, or use the arrow keys." aria-valuemin="0" aria-valuemax="100"><div class="cap" id="kc-' + k.id + '"><i id="km-' + k.id + '"></i></div></button>' +
            '<span class="lbl">' + k.label + '</span>' + (k.id === 'sq' ? '<div style="display:flex;align-items:center;gap:6px"><div class="lamp" id="busy"></div><span class="lbl" style="font-size:10px">BUSY</span></div>' : '') + '</div>';
        }).join('') + '</div>' +
        '<div class="memory"><span class="lbl">MEMORY</span><div class="row" id="presets"></div></div>' +
        '<div class="stack sbctl" style="align-items:flex-start"><span class="lbl">SIDEBAND</span><div class="seg" id="modes"></div>' +
          '<button type="button" class="btn" id="audio" style="font-size:13px"></button></div>' +
        '<div class="switches">' +
          '<div class="stack"><button type="button" class="toggle" id="viewsel" aria-label="Screen selector. Up for radio, down for terminal."><span class="tl" id="tl-radio">RADIO</span><div class="lever"><i></i></div><span class="tl" id="tl-term">TERM</span></button><span class="lbl">SCREEN</span></div>' +
          '<div class="stack"><button type="button" class="power" id="power" aria-label="Power"><div id="rtop">ON</div><div id="rbot">OFF</div></button>' +
            '<div style="display:flex;align-items:center;gap:8px"><div class="lamp" id="plamp"></div><span class="lbl">POWER</span></div></div>' +
        '</div>' +
      '</div>' +
    '</section>' +
    '<section class="lpt" id="lpt" aria-label="Line printer LPT1">' +
      '<div class="lpt-win idle" id="lpt-win"><div class="lpt-content" id="lpt-content">' +
        '<div id="lpt-top"></div>' +
        '<div class="lpt-paper" id="lpt-paper"><div class="lpt-tractor l"></div><div class="lpt-text" id="lpt-text" role="document"></div><div class="lpt-tractor r"></div></div>' +
        '<div id="lpt-bot"></div>' +
        '<div class="lpt-housing" id="lpt-housing"><div class="lpt-slot"><div class="lpt-ribbon"></div><div class="lpt-head park" id="lpt-head"></div></div>' +
          '<div class="lpt-badge">LPT1</div>' +
          '<div class="lpt-panel"><button type="button" class="btn hidden" id="lpt-tear">TEAR OFF</button><span><span class="lpt-led on" id="lpt-ledon"></span>ON LINE</span><span><span class="lpt-led on"></span>PAPER</span></div></div>' +
      '</div></div>' +
    '</section>' +
    '<footer><span class="typewriter">Let us face without panic the reality of our times.</span><span>Every release ships with a runbook. Read the documentation.</span></footer>' +
    '</div></div>';

  var $ = function (id) { return document.getElementById(id); };
  var dial = $('dial');
  MINOR.forEach(function (m) { var d = document.createElement('div'); d.className = 'tick'; d.style.left = pos(tOf(m)); dial.insertBefore(d, $('bandlbl')); });
  STATIONS.filter(function (s) { return !s.hidden; }).forEach(function (s, i, all) {
    var d = document.createElement('div'); d.className = 'mark f' + s.f + (i === 0 ? ' first' : (i === all.length - 1 ? ' last' : '')); d.style.left = pos(tOf(s.f));
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
  // view: what the one screen shows. 'radio' (dial, or the transmission once PLAY is pressed) or 'term' (operator terminal).
  var S = { power: false, t: tOf(TUNE), band: 'MF', mode: 'AM', audio: true, view: 'radio', build: kingLive() ? 'king' : 'mike', playing: null,
            vol: savedVol, sq: 0, clr: 0.5 };
  var fails = 0;
  var set = function (p) { for (var k in p) S[k] = p[k]; render(); };
  // Touching the receiver takes the screen back: the video stops, the dial returns.
  var radio = function (p) { p.playing = null; set(p); };
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

    // squelch: open while the received level (signal, or the wandering noise floor) beats the knob.
    // Hysteresis so the jitter at the threshold doesn't chatter; the close tail is a hold-off, never a
    // future-scheduled ramp (a reopen scheduled before a pending close would lose to it and stick shut).
    var open = true, belowSince = 0;
    setInterval(function () {
      var now = ac.currentTime, sig = signalStrength();
      var rssi = Math.max(0.12 + (rnd() - 0.5) * 0.08, sig * (1 + (rnd() - 0.5) * 0.12));
      var want = S.sq < 0.02 || rssi > (open ? S.sq - 0.04 : S.sq);
      if (want) {
        belowSince = 0;
        if (!open) { sqGain.gain.cancelScheduledValues(now); sqGain.gain.setTargetAtTime(1, now, 0.004); open = true; }
      } else {
        if (!belowSince) belowSince = now;
        if (open && now - belowSince > 0.11) { sqGain.gain.cancelScheduledValues(now); sqGain.gain.setTargetAtTime(0, now, 0.008); open = false; }
      }
      var lamp = $('busy'), lit = S.power && open && S.sq >= 0.02;
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
    var live = S.power && S.audio && S.band !== 'L' && !S.playing;
    var sb = S.mode !== 'AM';
    // let go of the media session while the transmission (YouTube) has the screen; take it back when the radio returns
    if (keepAlive) { if (S.playing || !S.power) keepAlive.pause(); else if (keepAlive.paused) holdPlaybackSession(); }
    var vol = 0.14 * Math.pow(S.vol / 0.6, 2); // 60% on the knob = the old fixed level
    A.master.gain.setTargetAtTime(live ? vol : 0, now, 0.08);
    // full quieting: a strong carrier pushes the hiss down to a faint floor instead of a third
    A.noiseGain.gain.setTargetAtTime(sb ? 0.35 - 0.29 * lvl : 0.9 - 0.82 * lvl, now, 0.08);
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

  // ---- seven-segment readout ----------------------------------------------
  // a b c d e f g: top, upper right, lower right, bottom, lower left, upper left, middle
  var SEG = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
  var SEGP = { a: '2,0 18,0 20,2 18,4 2,4 0,2', b: '20,2 22,4 22,18 20,20 18,18 18,4', c: '20,20 22,22 22,36 20,38 18,36 18,22',
               d: '2,36 18,36 20,38 18,40 2,40 0,38', e: '0,22 2,20 4,22 4,36 2,38 0,36', f: '0,2 2,0 4,2 4,18 2,20 0,18', g: '2,18 18,18 20,20 18,22 2,22 0,20' };
  function sevenSeg(str, unit, on) {
    var cells = str.split(''), W = 28, out = '<svg viewBox="0 0 ' + (cells.length * W) + ' 40" aria-hidden="true">';
    cells.forEach(function (ch, i) {
      var lit = SEG[ch] || '';
      out += '<g transform="translate(' + (i * W + 2) + ' 0) skewX(-6)">';
      'abcdefg'.split('').forEach(function (k) {
        var isOn = on && lit.indexOf(k) !== -1;
        out += '<polygon points="' + SEGP[k] + '" fill="' + (isOn ? '#F2C200' : '#F2C200') + '" fill-opacity="' + (isOn ? 1 : 0.07) + '"/>';
      });
      out += '</g>';
    });
    return out + '</svg><span class="unit">' + unit + '</span>';
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
    var fs = !on ? '    ' : String(locked ? 1420 : (lockedOn ? best.f : Math.round(f / 5) * 5));
    while (fs.length < 4) fs = ' ' + fs;
    var fk = fs + (locked ? 'M' : 'k') + (on ? 1 : 0), fe = $('freq');
    if (fe.getAttribute('data-k') !== fk) { fe.setAttribute('data-k', fk); fe.innerHTML = sevenSeg(fs, locked ? 'Mc' : 'kc', on); fe.setAttribute('aria-label', on ? fs.trim() + (locked ? ' Mc' : ' kc') : 'off'); }
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

    var meter = ''; for (var i = 0; i < 5; i++) meter += '<i style="height:' + (8 + i * 5) + 'px;background:' + (i < level ? '#F2C200' : '#2A2922') + '"></i>';
    $('meter').innerHTML = meter;
    var meternote = !on ? 'No reading.' : (locked ? (ozma ? 'Faint carrier. Unreadable.' : 'No reading.') : (level >= 5 ? 'Strong. Clear channel.' : (level >= 2 ? 'Rising. Fine-tune.' : 'Noise floor only.')));

    var active = on && !locked && lockedOn && best.kind === 'active';
    var buildLive = S.build === 'mike' || kingLive();
    var rx = '';
    if (!on) rx = '<span style="font-size:18px;color:#8C887A">Receiver off. Throw the power switch.</span>';
    else if (locked) rx = '<div class="card"><span style="font-size:18px;color:#CFCABB">BAND LOCKED</span><span style="font-size:13px;color:#A9A493">1420 Mc. Listening for something that is not on any tracklist. Clearance required.</span></div>';
    else if (active) {
      var note = buildLive ? (S.build === 'king' ? 'TRANSMITTED 15 · XI · 2026. Runbook attached.' : 'TRANSMITTED 31 · X · 2026. Runbook attached.') : 'SCHEDULED · 15 · XI · 23:30Z ANNIVERSARY. NOT YET TRANSMITTED.';
      rx = '<div class="card"><span style="font-size:18px;color:#F2C200">▶ JOS-001 · 640 kc · ' + (S.build === 'king' ? 'v0.1.1 “Ivy King”' : 'v0.1.0 “Ivy Mike”') + '</span><div class="wave" aria-hidden="true">' + WAVE + '</div>' +
        '<span style="font-size:13px;color:#CFCABB">' + note + '</span>' +
        '<div class="row">' + btn('v0.1.0 IVY MIKE', S.build === 'mike', '', 'data-build="mike"') + btn('v0.1.1 IVY KING', S.build === 'king', '', 'data-build="king"') +
        (buildLive ? btn('▶ PLAY TRANSMISSION', true, '', 'id="play" style="font-weight:600"') : '') + '</div></div>';
    }
    else if (lockedOn && best.kind === 'numbers') rx = '<div class="card"><span style="font-size:13px;letter-spacing:2px;color:#E8542E">UNLISTED FREQUENCY · DO NOT LOG</span><span style="font-size:22px;letter-spacing:4px;line-height:1.6">47213 90816 33025 71148<br>06529 18834 52071 69903</span><span style="font-size:13px;color:#A9A493">Message repeats. Key not included.</span></div>';
    else if (near) rx = '<div class="card"><span class="noise" style="color:#CFCABB">· ··▮· ·▮·· ▮ ·· ▮·· · ▮</span><span style="font-size:18px;color:#F2C200">Carrier detected. Keep turning.</span><span style="font-size:13px;color:#A9A493">' + meternote + '</span></div>';
    else rx = '<div class="card"><span class="noise">· ·· ·  ··· ·  · ·· ··· ·  ·· · ·</span><span style="font-size:18px;color:#CFCABB">NO CARRIER</span><span style="font-size:13px;color:#A9A493">' + ((lockedOn && best.note) ? best.note : meternote) + '</span></div>';
    var rxEl = $('rx'); if (rxEl.getAttribute('data-k') !== rx) { rxEl.innerHTML = rx; rxEl.setAttribute('data-k', rx); }

    // tally lamp on the bezel: lit while a transmission is on the air at the tuned frequency
    var tl = $('tlamp'), tt = $('ttext'), lit = active && buildLive;
    tl.style.background = lit ? '#FF8A2B' : (on ? '#8A1C10' : '#3A2A24');
    tl.style.boxShadow = lit ? '0 0 6px #FF8A2B, 0 0 16px rgba(255,120,30,.7)' : (on ? '0 0 4px rgba(190,35,20,.55)' : 'none');
    tl.style.animation = lit ? 'sn-nixie 3.7s linear infinite' : 'none';
    tt.textContent = lit ? 'TRANSMISSION ACTIVE' : 'STANDING BY';
    tt.style.color = lit ? '#FF9A40' : '#8A5A50';
    tt.style.textShadow = lit ? '0 0 8px rgba(255,120,30,.8)' : 'none';

    // the one screen: radio, playback, or terminal
    var playing = S.view === 'radio' && active && buildLive && S.playing === S.build;
    $('v-radio').classList.toggle('hidden', S.view !== 'radio' || playing);
    $('v-term').classList.toggle('hidden', S.view !== 'term');
    $('v-play').classList.toggle('hidden', !playing);
    $('viewlbl').textContent = S.view === 'term' ? '· TERMINAL' : (playing ? '· PLAYBACK' : '· RADIO');
    $('viewsel').classList.toggle('term', S.view === 'term');
    $('viewsel').setAttribute('aria-pressed', S.view === 'term' ? 'true' : 'false');
    $('tl-radio').classList.toggle('on', S.view === 'radio');
    $('tl-term').classList.toggle('on', S.view === 'term');
    var vp = $('v-play'), pk = playing ? S.build : '';
    if (vp.getAttribute('data-k') !== pk) {
      vp.setAttribute('data-k', pk);
      vp.innerHTML = playing ? '<iframe src="https://www.youtube.com/embed/' + YT[S.build] + '?autoplay=1&rel=0&playsinline=1" title="JOS-001 640 kc" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>' : '';
    }
    applyAudio();
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
    '/log': 'JOS-001 640 kc ACTIVE. 3 FREQUENCIES PENDING. 1 FREQUENCY NOT LISTED.'
  };

  // ---- sealed traffic -------------------------------------------------------
  // Clearance commands exist here only as salted hashes (assets/sealed.js). A hit derives its own key
  // from what was typed; the runbook key comes from the passphrase and is kept once earned.
  var SEALED = window.SN_SEALED || null, KEY_SLOT = 'sn.jos001.lpt', heldKey = null;
  var subtle = window.crypto && window.crypto.subtle;
  var te = new TextEncoder(), td = new TextDecoder();
  function unb64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function tob64(u) { var s = ''; u = new Uint8Array(u); for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  async function deriveKey(pass, salt) {
    var base = await subtle.importKey('raw', te.encode(pass), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: SEALED.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  }
  async function open(box, key) { return td.decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct))); }
  async function sealedReply(word) {
    if (!SEALED || !subtle || !word) return null;
    var id = hex(await subtle.digest('SHA-256', te.encode(SEALED.ns + word)));
    var box = SEALED.cmds[id]; if (!box) return null;
    var reply = await open(box, await deriveKey(word, unb64(box.s)));
    // does this word also clear the runbook?
    try {
      var rk = await deriveKey(word, unb64(SEALED.runbook.s));
      await open(SEALED.runbook, rk);
      var raw = tob64(await subtle.exportKey('raw', rk)); heldKey = raw;
      try { localStorage.setItem(KEY_SLOT, raw); } catch (e) {}
    } catch (e) {}
    return reply;
  }
  async function releaseRunbook() {
    var raw = heldKey; if (!raw) { try { raw = localStorage.getItem(KEY_SLOT); } catch (e) {} }
    if (!raw || !SEALED || !subtle) return null;
    try {
      var key = await subtle.importKey('raw', unb64(raw), 'AES-GCM', false, ['decrypt']);
      return JSON.parse(await open(SEALED.runbook, key));
    } catch (e) { try { localStorage.removeItem(KEY_SLOT); } catch (x) {} heldKey = null; return null; }
  }

  // ---- terminal output ------------------------------------------------------
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var busy = false;
  // the terminal is a scrollback on the screen: what was typed, then what came back
  var LOG_MAX = 80;
  function logLine(text, cls) {
    var log = $('tlog'), d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = text; log.appendChild(d);
    while (log.children.length > LOG_MAX) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
    return d;
  }
  async function typeOut(str, speed) {
    var el = logLine(''), log = $('tlog');
    for (var i = 1; i <= str.length; i++) { el.textContent = str.slice(0, i); log.scrollTop = log.scrollHeight; if (speed) await sleep(speed); }
    await sleep(220);
  }

  // ---- LPT1: dot-matrix printer ---------------------------------------------
  var LPT = (function () {
    var G = {
      ' ': '0,0,0,0,0,0,0',
      '0': '01110,10001,10011,10101,11001,10001,01110', '1': '00100,01100,00100,00100,00100,00100,01110',
      '2': '01110,10001,00001,00010,00100,01000,11111', '3': '11111,00010,00100,00010,00001,10001,01110',
      '4': '00010,00110,01010,10010,11111,00010,00010', '5': '11111,10000,11110,00001,00001,10001,01110',
      '6': '00110,01000,10000,11110,10001,10001,01110', '7': '11111,00001,00010,00100,01000,01000,01000',
      '8': '01110,10001,10001,01110,10001,10001,01110', '9': '01110,10001,10001,01111,00001,00010,01100',
      'A': '01110,10001,10001,10001,11111,10001,10001', 'B': '11110,10001,10001,11110,10001,10001,11110',
      'C': '01110,10001,10000,10000,10000,10001,01110', 'D': '11100,10010,10001,10001,10001,10010,11100',
      'E': '11111,10000,10000,11110,10000,10000,11111', 'F': '11111,10000,10000,11110,10000,10000,10000',
      'G': '01110,10001,10000,10111,10001,10001,01111', 'H': '10001,10001,10001,11111,10001,10001,10001',
      'I': '01110,00100,00100,00100,00100,00100,01110', 'J': '00111,00010,00010,00010,00010,10010,01100',
      'K': '10001,10010,10100,11000,10100,10010,10001', 'L': '10000,10000,10000,10000,10000,10000,11111',
      'M': '10001,11011,10101,10101,10001,10001,10001', 'N': '10001,10001,11001,10101,10011,10001,10001',
      'O': '01110,10001,10001,10001,10001,10001,01110', 'P': '11110,10001,10001,11110,10000,10000,10000',
      'Q': '01110,10001,10001,10001,10101,10010,01101', 'R': '11110,10001,10001,11110,10100,10010,10001',
      'S': '01111,10000,10000,01110,00001,00001,11110', 'T': '11111,00100,00100,00100,00100,00100,00100',
      'U': '10001,10001,10001,10001,10001,10001,01110', 'V': '10001,10001,10001,10001,10001,01010,00100',
      'W': '10001,10001,10001,10101,10101,10101,01010', 'X': '10001,10001,01010,00100,01010,10001,10001',
      'Y': '10001,10001,10001,01010,00100,00100,00100', 'Z': '11111,00001,00010,00100,01000,10000,11111',
      'a': '00000,00000,01110,00001,01111,10001,01111', 'b': '10000,10000,10110,11001,10001,10001,11110',
      'c': '00000,00000,01110,10000,10000,10001,01110', 'd': '00001,00001,01101,10011,10001,10001,01111',
      'e': '00000,00000,01110,10001,11111,10000,01110', 'f': '00110,01001,01000,11100,01000,01000,01000',
      'g': '00000,00000,01111,10001,10001,10001,01111,00001,01110', 'h': '10000,10000,10110,11001,10001,10001,10001',
      'i': '00100,00000,01100,00100,00100,00100,01110', 'j': '00010,00000,00110,00010,00010,00010,00010,10010,01100',
      'k': '10000,10000,10010,10100,11000,10100,10010', 'l': '01100,00100,00100,00100,00100,00100,01110',
      'm': '00000,00000,11010,10101,10101,10101,10101', 'n': '00000,00000,10110,11001,10001,10001,10001',
      'o': '00000,00000,01110,10001,10001,10001,01110', 'p': '00000,00000,11110,10001,10001,10001,11110,10000,10000',
      'q': '00000,00000,01111,10001,10001,10001,01111,00001,00001', 'r': '00000,00000,10110,11001,10000,10000,10000',
      's': '00000,00000,01111,10000,01110,00001,11110', 't': '01000,01000,11100,01000,01000,01001,00110',
      'u': '00000,00000,10001,10001,10001,10011,01101', 'v': '00000,00000,10001,10001,10001,01010,00100',
      'w': '00000,00000,10001,10001,10101,10101,01010', 'x': '00000,00000,10001,01010,00100,01010,10001',
      'y': '00000,00000,10001,10001,10001,10001,01111,00001,01110', 'z': '00000,00000,11111,00010,00100,01000,11111',
      '.': '00000,00000,00000,00000,00000,01100,01100', ',': '00000,00000,00000,00000,00000,01100,00100,01000',
      ':': '00000,01100,01100,00000,01100,01100,00000', '-': '00000,00000,00000,11111,00000,00000,00000',
      '[': '01110,01000,01000,01000,01000,01000,01110', ']': '01110,00010,00010,00010,00010,00010,01110',
      '?': '01110,10001,00001,00010,00100,00000,00100', '(': '00010,00100,01000,01000,01000,00100,00010',
      ')': '01000,00100,00010,00010,00010,00100,01000', '/': '00000,00001,00010,00100,01000,10000,00000',
      '@': '01110,10001,10111,10101,10111,10000,01110', '·': '00000,00000,00000,01100,01100,00000,00000'
    };
    var CELL = 6, TOP = 1, OFF_H = 12, CPS = 190, MAXC = 76, PITCH = 1.15, HOUSING = 82;
    var INK = '#1c1c22', RED = '#b0241c';
    var win = $('lpt-win'), content = $('lpt-content'), paper = $('lpt-paper'), text = $('lpt-text'), head = $('lpt-head'), housing = $('lpt-housing');
    var doc = null, lines = [], g = {}, state = 'idle', ac = null, buzz = null, soundOn = function () { return true; };

    // -- reflow: the same runbook at any column count (76 on desktop, ~36-44 on a phone) --
    function tokens(s) { // words, but a [BRACKETED NOTE] stays in one piece
      var out = [], re = /\[[^\]]*\]|\S+/g, m; while ((m = re.exec(s))) out.push(m[0]); return out;
    }
    function wrap(s, cols, first, cont) {
      var out = [], cur = first, fresh = true;
      tokens(s).forEach(function (w) {
        if (!fresh && cur.length + 1 + w.length > cols) { out.push(cur); cur = cont; fresh = true; }
        while (w.length > cols - cur.length) { var room = cols - cur.length; out.push(cur + w.slice(0, room)); w = w.slice(room); cur = cont; }
        cur += (fresh ? '' : ' ') + w; fresh = false;
      });
      out.push(cur); return out;
    }
    var pad = function (s, n) { while (s.length < n) s += ' '; return s; };
    function layout(blocks, cols) {
      var L = [], push = function (arr, b) { arr.forEach(function (t) { L.push({ t: t, b: !!b }); }); };
      var wide = cols >= 70;
      blocks.forEach(function (k) {
        if (k.k === 'gap') L.push({ t: '' });
        else if (k.k === 'rule') L.push({ t: new Array(cols + 1).join('-') });
        else if (k.k === 'hdr') {
          if (k.l.length + 2 + k.r.length <= cols) push([pad(k.l, cols - k.r.length) + k.r], 1);
          else { push(wrap(k.l, cols, '', ''), 1); push(wrap(k.r, cols, '', ''), 1); }
        }
        else if (k.k === 'p') { var ind = new Array((k.i || 0) + 1).join(' '); push(wrap(k.t, cols, ind, ind + (k.i ? '  ' : '')), k.b); }
        else if (k.k === 'step') {
          var lead = '  ' + k.n + '. ', hang = wide ? lead.length + 12 : lead.length;
          var body = (wide ? pad(k.w, 12) : k.w + ' ') + k.t + '  ' + k.note;
          // keep the word column intact on wide paper: wrap the remainder after it
          if (wide) { var w0 = wrap(k.t + '  ' + k.note, cols, lead + pad(k.w, 12), new Array(hang + 1).join(' ')); push(w0); }
          else push(wrap(body, cols, lead, new Array(hang + 1).join(' ')));
        }
        else if (k.k === 'lab') {
          var hang2 = wide ? k.w.length + 2 : 2;
          push(wrap(k.t, cols, k.w + '  ', new Array(hang2 + 1).join(' ')));
        }
        else if (k.k === 'build') {
          var rowW = 9 + 10 + 21 + k.rows[0][3].length;
          if (cols >= rowW) {
            push([pad('VERSION', 9) + pad('CODENAME', 10) + pad('SHOT TIME (Z)', 21) + 'CHECKSUM']);
            k.rows.forEach(function (r) { push([pad(r[0], 9) + pad(r[1], 10) + pad(r[2], 21) + r[3]]); });
          } else {
            // narrow paper: one record per two lines; the checksum's five groups never split
            push(['VERSION CODENAME SHOT TIME (Z)', '  CHECKSUM']);
            k.rows.forEach(function (r) {
              var top = r[0] + '  ' + r[1] + '  ' + r[2];
              if (top.length <= cols) push([top]); else push([r[0] + '  ' + r[1], '  ' + r[2]]);
              push(['  ' + r[3]]);
            });
          }
        }
      });
      return L;
    }

    function dotsOf(str) {
      var out = [], red = false;
      Array.prototype.forEach.call(str, function (ch, i) {
        if (ch === '[') red = true;
        (G[ch] || G['?']).split(',').forEach(function (row, y) { for (var x = 0; x < 5; x++) if (row[x] === '1') out.push({ x: i * CELL + x, y: y + TOP, r: red }); });
        if (ch === ']') red = false;
      });
      return out;
    }

    function geometry() {
      var W = win.clientWidth, narrow = W < 620;
      var tr = narrow ? 18 : 34, mg = narrow ? 10 : 22;
      var textW = Math.min(900, W - (narrow ? 8 : 24) - 2 * (tr + mg));
      var cols = textW / (CELL * MAXC) >= PITCH ? MAXC : Math.max(28, Math.floor(textW / (CELL * PITCH)));
      var scale = Math.min(textW / (cols * CELL), 900 / (MAXC * CELL));
      textW = cols * CELL * scale;
      return { tr: tr, mg: mg, cols: cols, scale: scale, textW: textW, lineH: OFF_H * scale, paperW: textW + 2 * (tr + mg) };
    }

    function build() {
      g = geometry();
      var dpr = Math.min(window.devicePixelRatio || 1, 3); g.dpr = dpr;
      var st = document.documentElement.style;
      st.setProperty('--lpt-lineH', g.lineH + 'px'); st.setProperty('--lpt-tr', g.tr + 'px'); st.setProperty('--lpt-mg', g.mg + 'px');
      st.setProperty('--lpt-hole', Math.max(3, g.tr * 0.16) + 'px');
      paper.style.width = g.paperW + 'px';
      content.style.width = Math.max(win.clientWidth, g.paperW + 8) + 'px';
      text.innerHTML = '<div class="lpt-pad"></div>';
      var flat = layout(doc, g.cols);
      text.setAttribute('aria-label', flat.map(function (l) { return l.t; }).join('\n'));
      lines = flat.map(function (d) {
        var tr = d.t.replace(/\s+$/, ''), first = tr.search(/\S/);
        var c = document.createElement('canvas');
        c.width = Math.round(g.textW * dpr); c.height = Math.round(g.lineH * dpr);
        c.style.width = g.textW + 'px'; c.style.height = g.lineH + 'px';
        text.appendChild(c);
        return { d: d, dots: dotsOf(d.t), first: first, last: tr.length - 1, empty: first < 0, ctx: c.getContext('2d'), c: c, seed: Math.random() };
      });
      var pb = document.createElement('div'); pb.className = 'lpt-padb'; text.appendChild(pb);
    }
    function feedSpace(on) {
      $('lpt-top').style.height = on ? Math.max(0, win.clientHeight - HOUSING - g.lineH * 4) + 'px' : '12px';
      $('lpt-bot').style.height = on ? win.clientHeight + 'px' : '12px';
    }
    var lineTop = function (i) { return lines[i].c.offsetTop + paper.offsetTop; };
    var targetFor = function (i) { return lineTop(i) + g.lineH - (win.clientHeight - HOUSING) + 2; };
    var colX = function (col) { return paper.offsetLeft + g.tr + g.mg + col * CELL * g.scale; };

    function rnd(s) { var x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); }
    function drawDot(L, dot, k) {
      var ctx = L.ctx, p = g.scale * g.dpr;
      var fade = 0.78 + 0.22 * rnd(L.seed * 97 + dot.x * 0.13), weak = dot.y === 4 ? 0.72 : 1; // worn ribbon, one tired pin
      var jx = (rnd(k * 1.7 + L.seed) - 0.5) * 0.16 * p, jy = (rnd(k * 2.3 + L.seed) - 0.5) * 0.16 * p;
      ctx.fillStyle = dot.r ? RED : INK;
      ctx.globalAlpha = Math.min(1, fade * weak * (0.82 + 0.18 * rnd(k + L.seed * 7)));
      var cx = (dot.x + 0.5) * p + jx, cy = (dot.y + 0.5) * p + jy, r = p * 0.4;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();
      if (L.d.b) { ctx.globalAlpha *= 0.85; ctx.beginPath(); ctx.arc(cx + p * 0.38, cy, r, 0, 6.2832); ctx.fill(); }
    }
    function drawAll() { lines.forEach(function (L) { L.dots.forEach(function (d, k) { drawDot(L, d, k); }); }); }

    // -- sound: synthesized, no files --
    function initAudio() {
      if (ac) { try { ac.resume(); } catch (e) {} return; }
      try {
        var AC = window.AudioContext || window.webkitAudioContext; ac = new AC();
        var master = ac.createGain(); master.gain.value = 0.45; master.connect(ac.destination);
        var nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), ch = nb.getChannelData(0);
        for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
        ac._noise = nb; ac._master = master;
        var n = ac.createBufferSource(); n.buffer = nb; n.loop = true;
        var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.3;
        var tone = ac.createOscillator(); tone.type = 'square'; tone.frequency.value = 1180;
        var bp2 = ac.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 1750; bp2.Q.value = 4;
        var toneG = ac.createGain(); toneG.gain.value = 0.35;
        var am = ac.createGain(); am.gain.value = 0.6;
        var lfo = ac.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 74;
        var lfoG = ac.createGain(); lfoG.gain.value = 0.4; lfo.connect(lfoG); lfoG.connect(am.gain);
        buzz = ac.createGain(); buzz.gain.value = 0;
        n.connect(bp); bp.connect(am); tone.connect(bp2); bp2.connect(toneG); toneG.connect(am); am.connect(buzz); buzz.connect(master);
        n.start(); tone.start(); lfo.start();
      } catch (e) { ac = null; }
    }
    function setBuzz(on) { if (ac && buzz) buzz.gain.setTargetAtTime(on && soundOn() ? 0.2 : 0, ac.currentTime, 0.006); }
    function thunk() {
      if (!ac || !soundOn()) return;
      var s = ac.createBufferSource(); s.buffer = ac._noise;
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
      var gn = ac.createGain(), t = ac.currentTime;
      gn.gain.setValueAtTime(0.9, t); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      s.connect(lp); lp.connect(gn); gn.connect(ac._master); s.start(t); s.stop(t + 0.08);
    }

    function run() {
      return new Promise(function (resolve) {
        var li = 0, revealed = 0, ptr = 0, phase = 'print', feedT = 0, nonEmpty = 0, reverse = false, last = performance.now();
        function prep(i) {
          var L = lines[i]; ptr = 0; revealed = 0;
          if (!L.empty) {
            reverse = nonEmpty % 2 === 1; nonEmpty++; // bidirectional head, like the real thing
            L.order = L.dots.slice().sort(function (a, b) { return reverse ? b.x - a.x : a.x - b.x; });
            head.style.left = colX(reverse ? L.last + 1 : L.first) + 'px';
          }
        }
        prep(0);
        function frame(now) {
          var dt = Math.min(0.05, (now - last) / 1000); last = now;
          var L = lines[li];
          if (phase === 'print') {
            if (L.empty) { phase = 'feed'; feedT = 0.035; }
            else {
              setBuzz(true); head.classList.add('busy');
              revealed += CPS * dt;
              var span = L.last + 1 - L.first;
              var edge = reverse ? (L.last + 1 - revealed) * CELL : (L.first + revealed) * CELL;
              while (ptr < L.order.length && (reverse ? L.order[ptr].x >= edge : L.order[ptr].x <= edge)) { drawDot(L, L.order[ptr], ptr); ptr++; }
              head.style.left = colX(reverse ? Math.max(L.first, L.last + 1 - revealed) : Math.min(L.last + 1, L.first + revealed)) + 'px';
              if (revealed >= span && ptr >= L.order.length) { setBuzz(false); head.classList.remove('busy'); phase = 'feed'; feedT = 0.07; thunk(); }
            }
          } else {
            feedT -= dt;
            if (feedT <= 0) {
              li++;
              if (li >= lines.length) { setBuzz(false); head.classList.remove('busy'); resolve(); return; }
              prep(li); phase = 'print';
            }
          }
          win.scrollTop += (targetFor(Math.min(li, lines.length - 1)) - win.scrollTop) * 0.35; // paper advances
          requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    }

    // idle: the head drifts to a new park position now and then, so the printer reads as a machine, not a picture
    var PARK = 48;
    function park() { head.classList.add('park'); head.style.left = (PARK + Math.round(Math.random() * 60)) + 'px'; }
    setInterval(function () { if (state === 'idle' || state === 'torn') park(); }, 9000 + Math.random() * 6000);

    async function print(blocks, sound) {
      doc = blocks; soundOn = sound; state = 'printing';
      $('lpt-tear').classList.add('hidden'); head.classList.remove('park');
      win.classList.remove('idle'); win.classList.remove('free'); paper.classList.remove('torn');
      build(); feedSpace(true);
      win.scrollTop = targetFor(0); head.style.left = colX(0) + 'px';
      $('lpt').scrollIntoView({ behavior: 'smooth', block: 'start' });
      await sleep(450);
      $('lpt-ledon').classList.add('blink');
      await run();
      $('lpt-ledon').classList.remove('blink');
      state = 'printed'; $('lpt-tear').classList.remove('hidden');
    }
    function tear() {
      if (state !== 'printed') return;
      thunk(); state = 'torn';
      paper.classList.add('torn'); $('lpt-tear').classList.add('hidden');
      setTimeout(function () {
        win.classList.add('free'); feedSpace(false); win.scrollTop = 0; park();
        $('lpt').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 650);
    }
    $('lpt-tear').addEventListener('click', tear);
    // re-set the sheet for a new width (phone rotation); the print job never restarts mid-run
    var rt = null;
    addEventListener('resize', function () {
      if (state === 'idle' || state === 'printing') return;
      clearTimeout(rt); rt = setTimeout(function () {
        build(); drawAll();
        if (state === 'printed') { feedSpace(true); win.scrollTop = targetFor(lines.length - 1); } else feedSpace(false);
      }, 150);
    });
    return { print: print, init: initAudio, busy: function () { return state === 'printing'; } };
  })();

  // once clearance is held, the terminal offers the print job as a button on the screen
  function offerRunbook(line) {
    if ($('printrb')) return;
    var d = logLine(line || 'DOCUMENT ON FILE.');
    var b = document.createElement('button'); b.type = 'button'; b.id = 'printrb'; b.className = 'btn on'; b.style.cssText = 'margin-left:12px;font-weight:600;min-height:36px';
    b.textContent = 'PRINT RUNBOOK'; d.appendChild(b); $('tlog').scrollTop = $('tlog').scrollHeight;
  }
  async function printRunbook() {
    if (busy) return;
    LPT.init(); // inside the tap, so iPhone lets the printer make noise
    busy = true; fails = 0;
    try { await runbookCmd(); } finally { busy = false; }
  }
  async function runbookCmd() {
    var doc = await releaseRunbook();
    if (!doc) { await typeOut('ACCESS DENIED · AUTHORIZATION REQUIRED.', 8); return; }
    await typeOut('AUTH VERIFIED.', 8);
    await typeOut('DOCUMENT RELEASED ON PRIOR AUTHORIZATION.', 8);
    await typeOut('PRINTING JOS-001 RUNBOOK ON LPT1 ...', 8);
    $('lpt').scrollIntoView({ behavior: 'auto', block: 'start' }); // read the three lines, then snap to the printer
    await LPT.print(doc, function () { return S.audio; });
    await sleep(300);
    await typeOut('PRINT COMPLETE · 1 SHEET · TEAR ALONG PERFORATION.', 8);
  }

  $('term').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (busy) return;
    var raw = $('cmd').value.trim();
    var c = raw.toLowerCase().replace(/^auth:?\s*/, '');
    $('cmd').value = '';
    logLine(raw, 'in');
    if (c === '/runbook' || c === 'runbook') { await printRunbook(); return; } // quiet reprint; never advertised
    var r = COMMANDS.hasOwnProperty(c) ? COMMANDS[c] : null, hadKey = !!heldKey;
    if (r === null) {
      var word = c.replace(/^\//, '');
      if (word && SEALED && subtle && /^[a-z0-9]{3,24}$/.test(word)) {
        busy = true;
        try { r = await sealedReply(word); } catch (x) { r = null; } finally { busy = false; }
      }
    }
    if (r === null) r = fallback(c); else fails = 0;
    logLine(r);
    if (heldKey && !hadKey) offerRunbook('DOCUMENT RELEASED.');
  });
  // a returning listener who already cleared the runbook finds it waiting
  releaseRunbook().then(function (doc) { if (doc) offerRunbook(); });

  // ---- switch click: a bat-handle toggle, synthesized, inside the tap so phones allow it ----
  var clickAc = null;
  function click(down) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      if (!clickAc) clickAc = new AC(); if (clickAc.state === 'suspended') clickAc.resume();
      var ac = clickAc, t = ac.currentTime;
      var n = ac.createBufferSource(), buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.03), ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      n.buffer = buf;
      var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = down ? 1900 : 2600; bp.Q.value = 1.2;
      var g = ac.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      // the body thunk under the snap
      var o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(down ? 160 : 210, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.05);
      var og = ac.createGain(); og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      n.connect(bp); bp.connect(g); g.connect(ac.destination); o.connect(og); og.connect(ac.destination);
      n.start(t); o.start(t); o.stop(t + 0.07);
    } catch (e) {}
  }

  // ---- input --------------------------------------------------------------
  // on a phone the deck sits under the screen; a control that changes the picture brings the screen back up
  function showScreen() {
    var r = $('screen').getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) $('screen').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'power') { if (!S.power) startAudio(); radio({ power: !S.power }); }
    else if (b.dataset.f) setT(tOf(+b.dataset.f));
    else if (b.dataset.band) radio({ band: S.band === 'L' ? 'MF' : 'L' });
    else if (b.dataset.mode) radio({ mode: b.dataset.mode });
    else if (b.id === 'audio') radio({ audio: !S.audio });
    else if (b.id === 'viewsel') { // flipping the selector takes the screen; a playing transmission stops
      var toTerm = S.view !== 'term';
      click(toTerm);
      set({ view: toTerm ? 'term' : 'radio', playing: null });
      showScreen();
      if (toTerm) { try { $('cmd').focus({ preventScroll: true }); } catch (x) {} }
    }
    else if (b.dataset.build) set({ build: b.dataset.build, playing: null });
    else if (b.id === 'play') { set({ playing: S.build }); showScreen(); }
    else if (b.id === 'printrb') printRunbook();
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

  // the CRT never hides radio traffic: if the radio card runs taller than the screen (a sideband box on a short window),
  // the screen grows to fit it, and settles back once the card is shorter. Measured once per frame at most.
  var scr = $('screen'), vr = $('v-radio'), fitQ = false;
  function fitScreen() {
    fitQ = false;
    if (vr.classList.contains('hidden')) { scr.style.height = ''; return; }
    scr.style.height = '';
    var need = vr.scrollHeight, have = vr.clientHeight;
    if (need > have + 1) scr.style.height = (scr.offsetHeight + need - have) + 'px';
  }
  function queueFit() { if (!fitQ) { fitQ = true; requestAnimationFrame(fitScreen); } }
  if ('MutationObserver' in window) new MutationObserver(queueFit).observe(scr, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', queueFit);
  queueFit();

  // the dial face tunes too: click to jump the needle, drag to sweep it (the knob follows). Inverse of pos().
  var dialDrag = false;
  function dialT(e) { var r = dial.getBoundingClientRect(); return ((e.clientX - r.left) / r.width * 100 - 3) / 94; }
  dial.addEventListener('pointerdown', function (e) { if (e.button > 0) return; dialDrag = true; dial.setPointerCapture(e.pointerId); setT(dialT(e)); });
  dial.addEventListener('pointermove', function (e) { if (dialDrag) setT(dialT(e)); });
  dial.addEventListener('pointerup', function (e) { dialDrag = false; try { dial.releasePointerCapture(e.pointerId); } catch (x) {} });
  dial.addEventListener('pointercancel', function () { dialDrag = false; });

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
