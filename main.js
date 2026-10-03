/* Levedad — una pieza generativa sobre la ligereza del ser y el pensamiento abstracto. */
(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = matchMedia("(max-width: 720px)").matches;
  const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  /* ---------- Ruido de Perlin 3D (compacto) ---------- */
  const perm = new Uint8Array(512);
  {
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y, z) => {
    const u = (h & 15) < 8 ? x : y;
    const v = (h & 15) < 4 ? y : (h & 15) === 12 || (h & 15) === 14 ? x : z;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  function noise(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
           lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
           lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
      w);
  }

  /* ---------- Infraestructura de escenas ---------- */
  class Scene {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.section = canvas.closest("section");
      this.active = false;
      this.mouse = { x: -9999, y: -9999, inside: false };
      this.t = 0;
      this.resize();
      const toLocal = (e) => {
        const r = this.canvas.getBoundingClientRect();
        const pt = e.touches ? e.touches[0] : e;
        return { x: pt.clientX - r.left, y: pt.clientY - r.top };
      };
      this.section.addEventListener("pointermove", (e) => {
        Object.assign(this.mouse, toLocal(e), { inside: true });
      });
      this.section.addEventListener("pointerleave", () => { this.mouse.inside = false; });
      this.section.addEventListener("pointerdown", (e) => {
        if (e.target.closest("input, a, label")) return;
        const p = toLocal(e);
        this.onPress && this.onPress(p.x, p.y);
      });
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = this.canvas.getBoundingClientRect();
      this.w = r.width; this.h = r.height; this.dpr = dpr;
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.onResize && this.onResize();
    }
  }

  /* ---------- I · Campo de flujo: levedad ---------- */
  class Flow extends Scene {
    onResize() {
      const n = Math.round((this.w * this.h) / (small ? 900 : 1300));
      this.particles = Array.from({ length: Math.min(n, 1600) }, () => this.spawn({}));
      this.ctx.fillStyle = "#f3efe7";
      this.ctx.fillRect(0, 0, this.w, this.h);
    }
    spawn(p) {
      p.x = rand(this.w); p.y = rand(this.h);
      p.px = p.x; p.py = p.y;
      p.life = rand(80, 320);
      p.speed = rand(0.4, 1.3);
      p.hue = Math.random() < 0.12 ? "coral" : Math.random() < 0.1 ? "gold" : "ink";
      return p;
    }
    step() {
      const { ctx, w, h, mouse } = this;
      this.t += 0.0016;
      ctx.fillStyle = "rgba(243,239,231,0.06)";
      ctx.fillRect(0, 0, w, h);
      const s = 0.0016;
      ctx.lineWidth = 0.8;
      const colors = {
        ink: "rgba(56,74,122,0.45)",
        coral: "rgba(224,122,95,0.65)",
        gold: "rgba(201,163,91,0.5)",
      };
      for (const key of ["ink", "coral", "gold"]) {
        ctx.strokeStyle = colors[key];
        ctx.beginPath();
        for (const p of this.particles) {
          if (p.hue !== key) continue;
          const a = noise(p.x * s, p.y * s, this.t) * TAU * 1.6 - Math.PI / 2;
          let vx = Math.cos(a) * p.speed;
          let vy = Math.sin(a) * p.speed - 0.25; // una leve tendencia a elevarse
          if (mouse.inside) {
            const dx = p.x - mouse.x, dy = p.y - mouse.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 32000) {
              const f = (1 - d2 / 32000) * 2.2;
              const d = Math.sqrt(d2) || 1;
              vx += (-dy / d) * f + (dx / d) * f * 0.3;
              vy += (dx / d) * f + (dy / d) * f * 0.3;
            }
          }
          p.px = p.x; p.py = p.y;
          p.x += vx; p.y += vy;
          if (--p.life < 0 || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
            this.spawn(p);
            continue;
          }
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
    }
  }

  /* ---------- II · Semillas: peso y levedad ---------- */
  class Seeds extends Scene {
    constructor(canvas) {
      super(canvas);
      this.weight = -0.35;
      const input = document.getElementById("weight");
      input.addEventListener("input", () => { this.weight = parseFloat(input.value); });
    }
    onResize() {
      if (!this.seeds) {
        this.seeds = Array.from({ length: small ? 70 : 140 }, () => this.make(rand(this.w), rand(this.h)));
      }
    }
    make(x, y, burst) {
      return {
        x, y,
        vx: burst ? rand(-2, 2) : 0,
        vy: burst ? rand(-2, 1) : 0,
        size: rand(5, 13),
        rot: rand(TAU),
        spin: rand(-0.01, 0.01),
        mass: rand(0.6, 1.4),
        seed: rand(1000),
        filaments: (rand(9, 15)) | 0,
      };
    }
    onPress(x, y) {
      for (let i = 0; i < 18; i++) this.seeds.push(this.make(x + rand(-10, 10), y + rand(-10, 10), true));
      if (this.seeds.length > 420) this.seeds.splice(0, this.seeds.length - 420);
    }
    step() {
      const { ctx, w, h, mouse } = this;
      this.t += 0.004;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#efeadf");
      g.addColorStop(1, "#e6dfcf");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // horizonte
      ctx.strokeStyle = "rgba(31,37,64,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h - 2);
      ctx.lineTo(w, h - 2);
      ctx.stroke();

      const gravity = this.weight * 0.06;
      for (const s of this.seeds) {
        const wind = noise(s.seed, this.t, 0.5) * 0.08;
        s.vx += wind + noise(s.x * 0.004, s.y * 0.004, this.t) * 0.03;
        s.vy += gravity * s.mass + noise(s.seed, 0.3, this.t) * 0.02;
        if (mouse.inside) {
          const dx = s.x - mouse.x, dy = s.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 12000) {
            const f = (1 - d2 / 12000) * 0.25;
            s.vx += dx * f * 0.02; s.vy += dy * f * 0.02;
          }
        }
        s.vx *= 0.975; s.vy *= 0.975;
        s.x += s.vx; s.y += s.vy;
        s.rot += s.spin + s.vx * 0.01;
        if (s.x < -30) s.x = w + 30;
        if (s.x > w + 30) s.x = -30;
        const floor = h - 4 - s.size * 0.2;
        if (s.y > floor) {
          if (this.weight > 0) { s.y = floor; s.vy *= -0.15; s.vx *= 0.85; }
          else s.y = floor;
        }
        if (s.y < -40) { s.y = h + 20; s.x = rand(w); }
        this.draw(s);
      }
    }
    draw(s) {
      const { ctx } = this;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.sin(s.rot) * 0.5 + s.vx * 0.08);
      // tallo
      ctx.strokeStyle = "rgba(31,37,64,0.45)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, s.size * 1.1);
      ctx.stroke();
      ctx.fillStyle = "rgba(224,122,95,0.75)";
      ctx.beginPath();
      ctx.ellipse(0, s.size * 1.15, 1.2, 2.4, 0, 0, TAU);
      ctx.fill();
      // vilano
      ctx.strokeStyle = "rgba(56,74,122,0.28)";
      ctx.beginPath();
      for (let i = 0; i < s.filaments; i++) {
        const a = -Math.PI / 2 + (i / (s.filaments - 1) - 0.5) * Math.PI * 1.25;
        const r = s.size * (0.9 + 0.2 * Math.sin(i * 3.1 + s.seed));
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------- III · Constelación de ideas ---------- */
  const WORDS = [
    "tiempo", "azar", "forma", "vacío", "eterno retorno", "memoria", "infinito",
    "nada", "sentido", "luz", "número", "sueño", "límite", "ser", "devenir",
    "eco", "silencio", "simetría", "deseo", "levedad", "peso", "origen", "umbral",
  ];
  const HUES = ["169,180,255", "224,122,95", "201,163,91", "232,228,244"];

  class Ideas extends Scene {
    onResize() {
      if (!this.nodes) {
        this.nodes = [];
        this.ripples = [];
        this.pulses = [];
        const n = small ? 38 : 70;
        for (let i = 0; i < n; i++) this.add(rand(this.w), rand(this.h), i % 4 === 0);
      }
    }
    add(x, y, labeled) {
      const group = (Math.random() * HUES.length) | 0;
      this.nodes.push({
        x, y,
        vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3),
        r: rand(1, 2.6),
        group,
        word: labeled ? pick(WORDS) : null,
        born: this.t,
        phase: rand(TAU),
      });
      if (this.nodes.length > 130) this.nodes.shift();
    }
    onPress(x, y) {
      this.add(x, y, true);
      this.ripples.push({ x, y, r: 0, a: 0.8 });
    }
    step() {
      const { ctx, w, h, mouse, nodes } = this;
      this.t += 1;
      ctx.clearRect(0, 0, w, h);
      const D = small ? 120 : 150;
      const D2 = D * D;

      // física: cohesión suave entre ideas del mismo grupo
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > D2 * 2 || d2 < 1) continue;
          const d = Math.sqrt(d2);
          const same = a.group === b.group;
          const f = same ? 0.0009 : -0.0006 * (1 - d / (D * 1.42));
          a.vx += dx / d * f * d * 0.05; a.vy += dy / d * f * d * 0.05;
          b.vx -= dx / d * f * d * 0.05; b.vy -= dy / d * f * d * 0.05;
          if (d < 18) { a.vx -= dx * 0.002; a.vy -= dy * 0.002; b.vx += dx * 0.002; b.vy += dy * 0.002; }
        }
      }
      for (const n of nodes) {
        n.vx += noise(n.x * 0.002, n.y * 0.002, this.t * 0.002) * 0.02;
        n.vy += noise(n.y * 0.002, n.x * 0.002, this.t * 0.002 + 9) * 0.02;
        if (mouse.inside) {
          const dx = mouse.x - n.x, dy = mouse.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 40000) { n.vx += dx * 0.00012; n.vy += dy * 0.00012; }
        }
        n.vx *= 0.985; n.vy *= 0.985;
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) { n.x = 0; n.vx *= -1; }
        if (n.x > w) { n.x = w; n.vx *= -1; }
        if (n.y < 0) { n.y = 0; n.vy *= -1; }
        if (n.y > h) { n.y = h; n.vy *= -1; }
      }

      // conexiones curvas
      ctx.lineWidth = 0.7;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > D2) continue;
          const k = 1 - d2 / D2;
          const col = a.group === b.group ? HUES[a.group] : "232,228,244";
          ctx.strokeStyle = `rgba(${col},${(k * (a.group === b.group ? 0.55 : 0.18)).toFixed(3)})`;
          const mx = (a.x + b.x) / 2 - dy * 0.18, my = (a.y + b.y) / 2 + dx * 0.18;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(mx, my, b.x, b.y);
          ctx.stroke();
          if (k > 0.5 && Math.random() < 0.0015 && this.pulses.length < 40) {
            this.pulses.push({ a, b, mx, my, t: 0, col: HUES[a.group] });
          }
        }
        if (mouse.inside) {
          const dx = mouse.x - a.x, dy = mouse.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < D2 * 1.3) {
            ctx.strokeStyle = `rgba(232,228,244,${(0.35 * (1 - d2 / (D2 * 1.3))).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      // pulsos: un pensamiento viajando de una idea a otra
      this.pulses = this.pulses.filter((p) => {
        p.t += 0.012;
        if (p.t >= 1) return false;
        const u = 1 - p.t;
        const x = u * u * p.a.x + 2 * u * p.t * p.mx + p.t * p.t * p.b.x;
        const y = u * u * p.a.y + 2 * u * p.t * p.my + p.t * p.t * p.b.y;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
        g.addColorStop(0, `rgba(${p.col},0.9)`);
        g.addColorStop(1, `rgba(${p.col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill();
        return true;
      });

      // nodos y palabras
      ctx.font = `300 ${small ? 11 : 13}px "Cormorant Garamond", serif`;
      ctx.textAlign = "left";
      for (const n of nodes) {
        const tw = 0.6 + 0.4 * Math.sin(this.t * 0.03 + n.phase);
        const grow = Math.min(1, (this.t - n.born) / 60);
        ctx.fillStyle = `rgba(${HUES[n.group]},${(0.9 * tw).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * grow * (n.word ? 1.6 : 1), 0, TAU); ctx.fill();
        if (n.word) {
          ctx.fillStyle = `rgba(232,228,244,${(0.55 * tw * grow).toFixed(3)})`;
          ctx.fillText(n.word, n.x + 7, n.y - 6);
        }
      }

      // ondas al sembrar una idea
      this.ripples = this.ripples.filter((r) => {
        r.r += 2.2; r.a *= 0.965;
        ctx.strokeStyle = `rgba(169,180,255,${r.a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
        return r.a > 0.02;
      });
    }
  }

  /* ---------- IV · Armonógrafo: respirar ---------- */
  class Harmonograph extends Scene {
    onResize() { this.reset(true); }
    reset(clear) {
      const ratios = [[2, 3], [3, 4], [1, 2], [3, 5], [2, 5], [4, 5], [1, 3]];
      const [a, b] = pick(ratios);
      const det = () => rand(-0.006, 0.006);
      this.p = {
        f1: a + det(), f2: b + det(), f3: a + det(), f4: b + det(),
        p1: rand(TAU), p2: rand(TAU), p3: rand(TAU), p4: rand(TAU),
        d1: rand(0.0008, 0.002), d2: rand(0.0008, 0.002),
        d3: rand(0.0008, 0.002), d4: rand(0.0008, 0.002),
      };
      this.ht = 0;
      this.fadeOut = 0;
      this.hue = Math.random() < 0.5 ? "56,74,122" : "224,122,95";
      if (clear) {
        this.ctx.fillStyle = "#f3efe7";
        this.ctx.fillRect(0, 0, this.w, this.h);
      }
      this.last = this.point(0);
    }
    point(t) {
      const { p } = this;
      const R = Math.min(this.w, this.h) * 0.22;
      const cx = this.w / 2, cy = this.h / 2;
      const x = R * (Math.sin(t * p.f1 + p.p1) * Math.exp(-p.d1 * t) + Math.sin(t * p.f2 + p.p2) * Math.exp(-p.d2 * t));
      const y = R * (Math.sin(t * p.f3 + p.p3) * Math.exp(-p.d3 * t) + Math.sin(t * p.f4 + p.p4) * Math.exp(-p.d4 * t));
      return [cx + x, cy + y];
    }
    step() {
      const { ctx, w, h } = this;
      if (this.fadeOut > 0) {
        ctx.fillStyle = "rgba(243,239,231,0.05)";
        ctx.fillRect(0, 0, w, h);
        if (--this.fadeOut === 0) this.reset(false);
        return;
      }
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = `rgba(${this.hue},0.22)`;
      ctx.beginPath();
      ctx.moveTo(this.last[0], this.last[1]);
      for (let i = 0; i < 40; i++) {
        this.ht += 0.02;
        this.last = this.point(this.ht);
        ctx.lineTo(this.last[0], this.last[1]);
      }
      ctx.stroke();
      if (this.ht > 1800) this.fadeOut = 140;
    }
  }

  /* ---------- Arranque ---------- */
  const registry = { flow: Flow, seeds: Seeds, ideas: Ideas, harmonograph: Harmonograph };
  const scenes = [...document.querySelectorAll("canvas[data-scene]")].map(
    (c) => new registry[c.dataset.scene](c)
  );

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const s = scenes.find((x) => x.section === e.target);
      if (s) s.active = e.isIntersecting;
    }
  }, { threshold: 0.01 });
  scenes.forEach((s) => io.observe(s.section));

  let resizeTimer;
  let lastW = innerWidth;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // en móvil la barra de direcciones cambia la altura: solo redimensionamos si cambia el ancho
      if (small && innerWidth === lastW) return;
      lastW = innerWidth;
      scenes.forEach((s) => s.resize());
    }, 200);
  });

  let frame = 0;
  function loop() {
    frame++;
    // con movimiento reducido, avanzamos uno de cada cuatro fotogramas
    if (!reduced || frame % 4 === 0) {
      for (const s of scenes) if (s.active) s.step();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------- Título con letras que flotan ---------- */
  const title = document.querySelector(".float-title");
  if (title) {
    const text = title.dataset.text;
    title.setAttribute("aria-label", text);
    text.split(" ").forEach((word, wi, words) => {
      const w = document.createElement("span");
      w.className = "w";
      w.setAttribute("aria-hidden", "true");
      [...word].forEach((ch) => {
        const c = document.createElement("span");
        c.className = "ch";
        c.textContent = ch;
        c.style.setProperty("--dy", `${rand(-16, -4).toFixed(1)}px`);
        c.style.setProperty("--rot", `${rand(-4, 4).toFixed(1)}deg`);
        c.style.animationDelay = `${rand(-7, 0).toFixed(2)}s`;
        c.style.animationDuration = `${rand(5, 9).toFixed(2)}s`;
        w.appendChild(c);
      });
      title.appendChild(w);
      if (wi < words.length - 1) title.appendChild(document.createTextNode(" "));
    });
  }

  /* ---------- Respiración ---------- */
  const word = document.querySelector(".breath-word");
  if (word) {
    let inhale = true;
    setInterval(() => {
      inhale = !inhale;
      word.style.opacity = 0;
      setTimeout(() => { word.textContent = inhale ? "inhala" : "exhala"; word.style.opacity = 1; }, 600);
    }, 5000);
  }

  /* ---------- Revelado y navegación ---------- */
  const revealables = document.querySelectorAll(".content > *");
  revealables.forEach((el, i) => {
    el.classList.add("reveal");
    el.style.transitionDelay = `${(i % 6) * 0.12}s`;
  });
  const rio = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) e.target.classList.add("in");
  }, { threshold: 0.2 });
  revealables.forEach((el) => rio.observe(el));

  const dots = [...document.querySelectorAll(".dots a")];
  const nio = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      dots.forEach((d) => d.classList.toggle("active", d.getAttribute("href") === `#${e.target.id}`));
    }
  }, { threshold: 0.55 });
  document.querySelectorAll("section").forEach((s) => nio.observe(s));
})();
