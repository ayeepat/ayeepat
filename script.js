(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- hero: split the title into letters ---------- */
  document.querySelectorAll("[data-split]").forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.textContent = "";
    [...text].forEach((ch, i) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--i", i);
      s.textContent = ch;
      el.appendChild(s);
    });
  });
  requestAnimationFrame(() => document.body.classList.add("ready"));

  /* ---------- scroll reveals ---------- */
  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          revealIO.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));

  /* ---------- progress bar and nav state ---------- */
  const bar = document.getElementById("progress");
  const nav = document.getElementById("nav");
  let ticking = false;
  const onScroll = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight || 1;
    bar.style.transform = `scaleX(${window.scrollY / max})`;
    nav.classList.toggle("scrolled", window.scrollY > 24);
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );
  onScroll();

  /* ---------- magnetic buttons (fine pointers only) ---------- */
  if (fine && !reduceMotion) {
    document.querySelectorAll("[data-magnet]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ---------- pixel artworks ---------- */
  // Each shape maps a grid point (u, v in -1..1) and a time t to a 3D position.
  const P = [0, 0, 0];
  const shapes = {
    surface(u, v, t) {
      P[0] = u * 1.1;
      P[1] = 0.42 * Math.sin(3.2 * u + t) * Math.cos(2.6 * v - t * 0.7) + 0.16 * Math.sin(5 * v + t * 0.5);
      P[2] = v * 1.1;
    },
    sphere(u, v, t) {
      const th = u * Math.PI;
      const ph = v * (Math.PI / 2);
      const d = 1 + 0.2 * Math.sin(4 * th + t) * Math.cos(3 * ph - t * 0.6);
      P[0] = Math.cos(ph) * Math.cos(th) * d;
      P[1] = Math.sin(ph) * d;
      P[2] = Math.cos(ph) * Math.sin(th) * d;
    },
    torus(u, v, t) {
      const th = (u + 1) * Math.PI;
      const ph = (v + 1) * Math.PI;
      const r = 0.28 + 0.07 * Math.sin(3 * th + t);
      const k = 0.7 + r * Math.cos(ph);
      P[0] = k * Math.cos(th);
      P[1] = r * Math.sin(ph);
      P[2] = k * Math.sin(th);
    },
  };

  // HSL to RGB, returns 0..255 channels
  const hsl = (h, s, l) => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = ((h % 360) + 360) % 360 / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hp < 1) [r, g, b] = [c, x, 0];
    else if (hp < 2) [r, g, b] = [x, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, x];
    else if (hp < 4) [r, g, b] = [0, x, c];
    else if (hp < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const m = l - c / 2;
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  };

  // One shared pointer. Dots light up only near the cursor and cool down behind it.
  const pointer = { x: -9999, y: -9999 };
  const clearPointer = () => { pointer.x = pointer.y = -9999; };
  window.addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  window.addEventListener("pointerdown", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  window.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") clearPointer(); });
  window.addEventListener("pointercancel", clearPointer);
  document.documentElement.addEventListener("pointerleave", clearPointer);

  function createArt(host) {
    const canvas = host.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const fn = shapes[host.dataset.art];
    const soft = host.dataset.tone === "soft";
    const N = Math.min(Number(host.dataset.n) || 48, window.innerWidth < 620 ? 38 : 999);
    const heat = new Float32Array(N * N);
    const pts = Array.from({ length: N * N }, () => [0, 0, 0, 0]);
    const seed = Math.random() * 10;
    const toneLo = soft ? 0.6 : 0.06;
    const toneHi = soft ? 0.86 : 0.78;
    let W = 0, H = 0;
    let angle = seed;
    let last = 0;
    let running = false;
    let raf = 0;

    const size = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      const t = reduceMotion ? seed : now / 1000 + seed;
      angle += dt * (reduceMotion ? 0 : 0.32);

      ctx.clearRect(0, 0, W, H);

      const rect = canvas.getBoundingClientRect();
      const mx = pointer.x - rect.left;
      const my = pointer.y - rect.top;
      const radius = Math.max(64, Math.min(W, H) * 0.17);
      const near = mx > -radius && my > -radius && mx < W + radius && my < H + radius;
      const decay = Math.exp(-dt * 1.5);

      // touch screens: a band of colour crosses corner to corner every few seconds
      let band = -1;
      if (!fine && !reduceMotion) {
        const phase = (t % 4.2) / 1.4;
        if (phase < 1) band = -0.15 + 1.3 * phase;
      }

      const s = Math.min(W, H) * 0.34;
      const cx = W / 2;
      const cy = H / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const cosT = Math.cos(0.45);
      const sinT = Math.sin(0.45);
      const cell = (s * 2.1) / N;

      let k = 0;
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++, k++) {
          const u = (i / (N - 1)) * 2 - 1;
          const v = (j / (N - 1)) * 2 - 1;
          fn(u, v, t * 0.8);
          const x = P[0], y = P[1], z = P[2];
          const x1 = x * cosA + z * sinA;
          const z1 = -x * sinA + z * cosA;
          const y2 = y * cosT - z1 * sinT;
          const z2 = y * sinT + z1 * cosT;
          const p = 1 / (1 + z2 * 0.28);
          const px = cx + x1 * s * p;
          const py = cy + y2 * s * p;

          let f = 0;
          if (near) {
            const d = Math.hypot(px - mx, py - my);
            if (d < radius) { f = 1 - d / radius; f = f * f * (3 - 2 * f); }
          }
          let hk = Math.max(heat[k] * decay, f);
          heat[k] = hk;
          // the band is not stored as heat, so it passes as a narrow glint with no trail
          if (band >= 0) {
            let b = 1 - Math.abs((px / W + py / H) / 2 - band) / 0.06;
            if (b > 0) { b = b * b * (3 - 2 * b); if (b > hk) hk = b; }
          }

          const q = pts[k];
          q[0] = px; q[1] = py; q[2] = z2; q[3] = hk;
        }
      }
      pts.sort((a, b) => a[2] - b[2]);

      for (let n = 0; n < pts.length; n++) {
        const q = pts[n];
        const z = q[2];
        const mix = q[3];
        const g = Math.min(1, Math.max(0, (z + 1.3) / 2.6));
        const sz = cell * (0.45 + 0.6 * g) * (1 + 0.35 * mix);
        const m = (toneLo + (toneHi - toneLo) * g) * 255;
        if (mix < 0.01) {
          ctx.fillStyle = `rgb(${m | 0},${m | 0},${m | 0})`;
        } else {
          const [r, gg, b] = hsl(190 + 200 * g + t * 6, 0.85, 0.3 + 0.3 * g);
          ctx.fillStyle = `rgb(${(m + (r - m) * mix) | 0},${(m + (gg - m) * mix) | 0},${(m + (b - m) * mix) | 0})`;
        }
        ctx.fillRect(q[0] - sz / 2, q[1] - sz / 2, sz, sz);
      }

      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    size();
    new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
      { threshold: 0 }
    ).observe(host);
  }

  document.querySelectorAll("[data-art]").forEach(createArt);
})();
