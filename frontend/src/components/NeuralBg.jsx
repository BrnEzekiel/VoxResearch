import { useEffect, useRef } from "react";

// Ambient particle field in the Antigravity style: slow-drifting colored
// specks that link up faintly, brighten near the cursor, gently flee it,
// and burst wherever you click. Tuned for the light theme.
export default function NeuralBg() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, raf = 0;
    let nodes = [];
    let bursts = [];
    const mouse = { x: -1000, y: -1000, active: false };

    const COLORS = ["30,58,138", "14,116,144", "124,58,237", "249,115,22", "14,165,233", "99,102,241"];
    const LINK = 110;
    const HOVER = 150;

    function spawn(count) {
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: 1 + Math.random() * 1.4,
          c: COLORS[(Math.random() * COLORS.length) | 0],
        });
      }
    }

    function resize() {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = [];
      spawn(w < 640 ? 42 : 75);
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        // Hover antigravity: flee the cursor a little.
        if (mouse.active) {
          const dx = n.x - mouse.x, dy = n.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d > 1 && d < HOVER) {
            const f = ((HOVER - d) / HOVER) * 0.9;
            n.x += (dx / d) * f;
            n.y += (dy / d) * f;
          }
        }
        if (n.x < -8) n.x = w + 8;
        if (n.x > w + 8) n.x = -8;
        if (n.y < -8) n.y = h + 8;
        if (n.y > h + 8) n.y = -8;
      }

      // Faint links between neighbours.
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(99,102,241,${(0.1 * (1 - d / LINK)).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Cursor links + brighten.
      if (mouse.active) {
        for (const n of nodes) {
          const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
          if (d < HOVER) {
            ctx.strokeStyle = `rgba(249,115,22,${(0.35 * (1 - d / HOVER)).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        let alpha = 0.5, r = n.r;
        if (mouse.active) {
          const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
          if (d < HOVER) {
            const k = 1 - d / HOVER;
            alpha = 0.5 + k * 0.5;
            r = n.r * (1 + k * 0.9);
          }
        }
        ctx.fillStyle = `rgba(${n.c},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Click bursts.
      bursts = bursts.filter((b) => b.life > 0);
      for (const b of bursts) {
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.96;
        b.vy *= 0.96;
        b.life -= 0.02;
        ctx.fillStyle = `rgba(${b.c},${Math.max(0, b.life * 0.8).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * Math.max(0.2, b.life), 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduced) raf = requestAnimationFrame(frame);
    }

    const onMove = (e) => {
      const t = e.touches && e.touches[0];
      mouse.x = t ? t.clientX : e.clientX;
      mouse.y = t ? t.clientY : e.clientY;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };
    const onClick = (e) => {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = Math.random() * 3 + 1;
        bursts.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          r: 1.5 + Math.random() * 1.5,
          c: COLORS[(Math.random() * COLORS.length) | 0],
          life: 1,
        });
      }
      if (bursts.length > 220) bursts.splice(0, bursts.length - 220);
    };

    resize();
    frame();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
