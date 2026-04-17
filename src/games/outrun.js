/**
 * Outrun — master compressor dashboard with sunset road visualization.
 * Factory returns a Game bound to the injected arcade deps.
 */
export default function createOutrun(deps) {
  const {
    keys, playNote, setScore, getScore, ctx, W, H, cloneState,
    compressorState, setCompressorParam, toggleCompressorBypass,
    getCompressorReduction, COMPRESSOR_DEFAULTS,
  } = deps;

  const params = [
    { key: 'threshold', label: 'THRESH',  min: -60, max: 0,  step: 1,     fmt: v => v.toFixed(0) + 'dB' },
    { key: 'ratio',     label: 'RATIO',   min: 1,   max: 20, step: 0.5,   fmt: v => v.toFixed(1) + ':1' },
    { key: 'knee',      label: 'KNEE',    min: 0,   max: 40, step: 1,     fmt: v => v.toFixed(0) + 'dB' },
    { key: 'attack',    label: 'ATTACK',  min: 0,   max: 1,  step: 0.005, fmt: v => (v * 1000).toFixed(1) + 'ms' },
    { key: 'release',   label: 'RELEASE', min: 0,   max: 1,  step: 0.01,  fmt: v => (v * 1000).toFixed(0) + 'ms' },
    { key: 'makeup',    label: 'MAKEUP',  min: 0,   max: 2,  step: 0.05,  fmt: v => v.toFixed(2) + 'x' },
  ];

  const self = {
    id: 'outrun',
    name: 'Outrun',
    emoji: '\u{1F334}',
    desc: 'Master compressor / sunset drive',
    params,

    init() {
      this.sel = 0;
      this.tick = 0;
      this.roadOffset = 0;
      this._spaceDown = false;
      this._lastNav = -999;
      this._lastAdj = -999;
      setScore(0);
    },

    update() {
      this.tick++;
      this.roadOffset = (this.roadOffset + 1.2) % 40;

      // Space toggles compressor bypass
      if (keys[' ']) {
        if (!this._spaceDown) { toggleCompressorBypass(); this._spaceDown = true; }
      } else {
        this._spaceDown = false;
      }

      // Left/right selects param (throttled)
      if (this.tick - this._lastNav > 10) {
        if (keys['ArrowLeft'] || keys['a']) {
          this.sel = (this.sel + params.length - 1) % params.length;
          this._lastNav = this.tick;
        } else if (keys['ArrowRight'] || keys['d']) {
          this.sel = (this.sel + 1) % params.length;
          this._lastNav = this.tick;
        }
      }

      // Up/down adjusts selected param (throttled)
      if (this.tick - this._lastAdj > 2) {
        const p = params[this.sel];
        const cur = compressorState[p.key];
        if (keys['ArrowUp'] || keys['w']) {
          setCompressorParam(p.key, Math.min(p.max, Math.round((cur + p.step) / p.step) * p.step));
          this._lastAdj = this.tick;
        } else if (keys['ArrowDown'] || keys['s']) {
          setCompressorParam(p.key, Math.max(p.min, Math.round((cur - p.step) / p.step) * p.step));
          this._lastAdj = this.tick;
        }
      }
    },

    draw() {
      const HORIZON = 200;
      const DASH_Y = 300;

      // Sky gradient (sunset)
      const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
      sky.addColorStop(0, '#150033');
      sky.addColorStop(0.35, '#5d0a5e');
      sky.addColorStop(0.75, '#ff2d95');
      sky.addColorStop(1, '#ffaa22');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, HORIZON);

      // Sun disk with horizontal bands
      const sunCX = W / 2, sunCY = HORIZON - 12, sunR = 58;
      ctx.save();
      ctx.beginPath(); ctx.arc(sunCX, sunCY, sunR, 0, Math.PI * 2); ctx.clip();
      const sunG = ctx.createLinearGradient(0, sunCY - sunR, 0, sunCY + sunR);
      sunG.addColorStop(0, '#ffde4a');
      sunG.addColorStop(0.55, '#ff6644');
      sunG.addColorStop(1, '#b829dd');
      ctx.fillStyle = sunG;
      ctx.fillRect(sunCX - sunR, sunCY - sunR, sunR * 2, sunR * 2);
      ctx.fillStyle = 'rgba(20,0,40,0.85)';
      for (let i = 0; i < 7; i++) {
        const bh = 3 + i * 1.2;
        const by = sunCY + 6 + i * 8;
        ctx.fillRect(sunCX - sunR, by, sunR * 2, bh);
      }
      ctx.restore();

      // Far mountains silhouette
      ctx.fillStyle = '#2a0a3a';
      ctx.beginPath(); ctx.moveTo(0, HORIZON);
      const peaks = [
        [40, 180], [90, 170], [140, 182], [200, 164], [260, 178],
        [320, 166], [380, 182], [440, 172], [W, HORIZON - 4],
      ];
      for (const [x, y] of peaks) ctx.lineTo(x, y);
      ctx.lineTo(W, HORIZON); ctx.closePath(); ctx.fill();

      // Ground fill
      ctx.fillStyle = '#0a0612';
      ctx.fillRect(0, HORIZON, W, DASH_Y - HORIZON);

      // Road: perspective triangle
      const roadTop = 4, roadBottom = 180, vpx = W / 2;
      ctx.fillStyle = '#1a0a2a';
      ctx.beginPath();
      ctx.moveTo(vpx - roadTop, HORIZON); ctx.lineTo(vpx + roadTop, HORIZON);
      ctx.lineTo(vpx + roadBottom, DASH_Y); ctx.lineTo(vpx - roadBottom, DASH_Y);
      ctx.closePath(); ctx.fill();

      // Road edges (neon)
      ctx.strokeStyle = '#ff2d95'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(vpx - roadTop, HORIZON); ctx.lineTo(vpx - roadBottom, DASH_Y);
      ctx.moveTo(vpx + roadTop, HORIZON); ctx.lineTo(vpx + roadBottom, DASH_Y);
      ctx.stroke();

      // Horizontal perspective grid lines (animated)
      ctx.strokeStyle = 'rgba(255,45,149,0.45)'; ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const t = ((i * 0.1) + (this.roadOffset / 40) * 0.1) % 1;
        const ease = t * t;
        const y = HORIZON + ease * (DASH_Y - HORIZON);
        const half = roadTop + ease * (roadBottom - roadTop);
        ctx.beginPath(); ctx.moveTo(vpx - half, y); ctx.lineTo(vpx + half, y); ctx.stroke();
      }

      // Center dashed divider
      ctx.strokeStyle = 'rgba(255,222,74,0.8)'; ctx.lineWidth = 2;
      ctx.setLineDash([10, 14]);
      ctx.lineDashOffset = -this.roadOffset * 2;
      ctx.beginPath(); ctx.moveTo(vpx, HORIZON); ctx.lineTo(vpx, DASH_Y); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;

      // Palm trees silhouettes at the roadside
      const drawPalm = (x, y, h) => {
        ctx.fillStyle = '#0a0010';
        ctx.fillRect(x - 1, y - h, 3, h);
        ctx.beginPath(); ctx.ellipse(x - 10, y - h + 2, 12, 4, 0.25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 10, y - h + 2, 12, 4, -0.25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x - 6, y - h - 4, 10, 3, 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 6, y - h - 4, 10, 3, -0.6, 0, Math.PI * 2); ctx.fill();
      };
      drawPalm(28, HORIZON + 14, 36);
      drawPalm(W - 28, HORIZON + 14, 36);
      drawPalm(74, HORIZON + 40, 30);
      drawPalm(W - 74, HORIZON + 40, 30);

      // Stars above the horizon
      for (let i = 0; i < 18; i++) {
        const sx = (i * 89) % W, sy = (i * 37) % 60 + 4;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + Math.sin(this.tick * 0.05 + i) * 0.3) + ')';
        ctx.fillRect(sx, sy, 1, 1);
      }

      // Dashboard background
      ctx.fillStyle = '#120820';
      ctx.fillRect(0, DASH_Y, W, H - DASH_Y);
      ctx.strokeStyle = '#b829dd'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, DASH_Y + 0.5); ctx.lineTo(W, DASH_Y + 0.5); ctx.stroke();

      // Gain reduction meter (top of dashboard)
      const grDb = Math.abs(getCompressorReduction());
      const meterW = 240, meterH = 6;
      const mx = (W - meterW) / 2, my = DASH_Y + 6;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(mx, my, meterW, meterH);
      const grFill = Math.min(1, grDb / 20);
      const grGrad = ctx.createLinearGradient(mx, 0, mx + meterW, 0);
      grGrad.addColorStop(0, '#22eeff');
      grGrad.addColorStop(0.5, '#ffaa22');
      grGrad.addColorStop(1, '#ff2d95');
      ctx.fillStyle = grGrad;
      ctx.fillRect(mx, my, meterW * grFill, meterH);
      ctx.strokeStyle = 'rgba(184,41,221,0.6)';
      ctx.strokeRect(mx - 0.5, my - 0.5, meterW + 1, meterH + 1);
      ctx.font = '6px "Press Start 2P"';
      ctx.fillStyle = '#b829dd';
      ctx.fillText('GR', mx - 18, my + 5);
      ctx.fillStyle = compressorState.bypass ? '#8866aa' : '#22eeff';
      ctx.fillText(
        compressorState.bypass ? 'BYPASS' : '-' + grDb.toFixed(1) + 'dB',
        mx + meterW + 8, my + 5,
      );

      // Parameter boxes (3 x 2 grid)
      const cols = 3, rows = 2, bw = W / cols, bh = 36, py0 = DASH_Y + 20;
      for (let i = 0; i < params.length; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        const bx = col * bw + 4, by = py0 + row * (bh + 4), w = bw - 8;
        const sel = (i === this.sel);
        ctx.fillStyle = sel ? 'rgba(255,170,34,0.14)' : 'rgba(184,41,221,0.08)';
        ctx.fillRect(bx, by, w, bh);
        ctx.strokeStyle = sel ? '#ffaa22' : '#5533aa';
        ctx.lineWidth = sel ? 2 : 1;
        ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, bh - 1);
        ctx.font = '6px "Press Start 2P"';
        ctx.fillStyle = sel ? '#ffaa22' : '#b829dd';
        ctx.fillText(params[i].label, bx + 6, by + 11);
        // Value bar under label
        const p = params[i];
        const cur = compressorState[p.key];
        const t = Math.max(0, Math.min(1, (cur - p.min) / (p.max - p.min)));
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(bx + 6, by + 16, w - 12, 3);
        ctx.fillStyle = sel ? '#ffaa22' : '#ff2d95';
        ctx.fillRect(bx + 6, by + 16, (w - 12) * t, 3);
        // Formatted value
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = sel ? '#fff' : '#f0d8ff';
        ctx.fillText(p.fmt(cur), bx + 6, by + 31);
      }

      // Shortcut hint at bottom
      ctx.font = '6px "Press Start 2P"';
      ctx.fillStyle = '#8866aa';
      const hint = '<-/-> SEL  ^/v ADJ  SPACE BYPASS';
      const tw = ctx.measureText(hint).width;
      ctx.fillText(hint, (W - tw) / 2, H - 4);
    },

    getState() {
      return cloneState({ sel: this.sel, compressor: compressorState });
    },

    loadState(s) {
      if (!s) return;
      this.sel = s.sel || 0;
      const c = s.compressor || {};
      for (const k of Object.keys(COMPRESSOR_DEFAULTS)) {
        if (k === 'bypass') continue;
        if (k in c) setCompressorParam(k, c[k]);
      }
      if ('bypass' in c && c.bypass !== compressorState.bypass) {
        toggleCompressorBypass();
      }
    },
  };

  return self;
}
