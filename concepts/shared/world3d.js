// Shared 3D props for the portfolio concepts (three.js r128, global THREE).
// Needs: three.min.js + examples/js/loaders/SVGLoader.js loaded first.
(function () {
  const W = {};

  // Apple-style silhouette drawn by hand. Swap in an official SVG string to replace it:
  // any <path> based logo works with makeSvgLogo().
  W.APPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 112">
    <path d="M50,32 C58,32 66,26 76,26 C84,26 92,30 96,38 C86,44 82,52 82,62 C82,72 88,80 98,84 C94,96 84,110 72,110 C64,110 60,105 50,105 C40,105 36,110 28,110 C14,110 2,86 2,62 C2,40 14,26 26,26 C36,26 42,32 50,32 Z"/>
    <path d="M50,26 C50,14 58,4 70,2 C70,14 62,24 50,26 Z"/></svg>`;

  // Image-based lighting so metal (the chrome apple) has something to reflect.
  // lights: [[color, [x,y,z], [w,h]], ...]
  W.makeEnv = (renderer, bg, lights) => {
    const s = new THREE.Scene();
    s.background = new THREE.Color(bg);
    lights.forEach(([c, p, sz]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sz[0], sz[1]), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
      m.position.set(...p); m.lookAt(0, 0, 0); s.add(m);
    });
    const pm = new THREE.PMREMGenerator(renderer);
    const tex = pm.fromScene(s, 0.02).texture;
    pm.dispose();
    return tex;
  };

  // Extruded, bevelled logo from an SVG string, centred, `height` units tall.
  W.makeSvgLogo = (svg, { height = 3, material }) => {
    const data = new THREE.SVGLoader().parse(svg);
    const shapes = [];
    data.paths.forEach(p => shapes.push(...THREE.SVGLoader.createShapes(p)));
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 16, bevelEnabled: true, bevelThickness: 4, bevelSize: 2.5, bevelSegments: 10, curveSegments: 64 });
    geo.center();
    geo.computeBoundingBox();
    const bb = geo.boundingBox, s = height / (bb.max.y - bb.min.y);
    const mesh = new THREE.Mesh(geo, material);
    mesh.rotation.x = Math.PI; // SVG y points down
    mesh.scale.setScalar(s);
    mesh.castShadow = true;
    const g = new THREE.Group(); g.add(mesh);
    return g;
  };

  // window.__FONT_JSON / window.__LAND_JSON let a bundled single-file build skip the network.
  W.loadFont = () => window.__FONT_JSON ? Promise.resolve(new THREE.FontLoader().parse(window.__FONT_JSON)) : new Promise((res, rej) =>
    new THREE.FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json', res, undefined, rej));

  // Extruded wordmark, centred and scaled to `width` units.
  W.makeWordmark = (font, text, { width = 3, depth = 0.25, material }) => {
    const geo = new THREE.TextGeometry(text, { font, size: 1, height: depth, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3 });
    geo.center();
    geo.computeBoundingBox();
    const bb = geo.boundingBox, s = width / (bb.max.x - bb.min.x);
    const m = new THREE.Mesh(geo, material);
    m.scale.set(s, s, 1);
    m.castShadow = true;
    return m;
  };

  // El Castillo (Temple of Kukulcán), Chichén Itzá: 9 terraces, 4 stairways
  // with serpent balustrades, temple on top. ~10 units wide, ~5.5 tall.
  W.makeChichenItza = ({ stone = 0x222222, temple = stone, edge = null, edgeOpacity = 0.9 } = {}) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: stone, roughness: 0.85, flatShading: true });
    const tmat = new THREE.MeshStandardMaterial({ color: temple, roughness: 0.8, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 });
    const lineMat = edge === null ? null : new THREE.LineBasicMaterial({ color: edge, transparent: true, opacity: edgeOpacity });
    const box = (parent, w, h, d, x, y, z, m = mat) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b);
      if (lineMat) b.add(new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), lineMat));
      return b;
    };
    const T = 9, H = 0.45, B = 10, dS = 0.8, top = T * H, run = (T - 1) * dS / 2, N = 18;
    for (let i = 0; i < T; i++) { const s = B - i * dS; box(g, s, H, s, 0, H * i + H / 2, 0); }
    const len = Math.hypot(top, run), ang = Math.atan2(top, run);
    for (let side = 0; side < 4; side++) {
      const sg = new THREE.Group(); sg.rotation.y = side * Math.PI / 2; g.add(sg);
      for (let k = 0; k < N; k++) {
        const zOut = B / 2 + 0.25 - k * run / N;
        box(sg, 1.6, top / N, zOut, 0, (k + 0.5) * top / N, zOut / 2);
      }
      [-0.95, 0.95].forEach(x => {
        const b = box(sg, 0.26, 0.3, len, x, top / 2 + 0.15, B / 2 + 0.25 - run / 2);
        b.rotation.x = ang;
        box(sg, 0.36, 0.3, 0.5, x, 0.15, B / 2 + 0.5); // serpent head
      });
    }
    box(g, 2.8, 1.3, 2.8, 0, top + 0.65, 0, tmat);
    box(g, 3.2, 0.25, 3.2, 0, top + 1.42, 0, tmat);
    for (let side = 0; side < 4; side++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.05), dark);
      const a = side * Math.PI / 2; d.position.set(Math.sin(a) * 1.41, top + 0.5, Math.cos(a) * 1.41); d.rotation.y = a; g.add(d);
    }
    return g;
  };

  W.makeTrophy = (material) => {
    const pts = [[0, 0], [0.5, 0], [0.5, 0.1], [0.15, 0.2], [0.12, 0.6], [0.2, 0.7], [0.55, 1.0], [0.6, 1.6], [0.55, 1.62], [0.0, 0.9]].map(p => new THREE.Vector2(p[0], p[1]));
    const g = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), material); cup.castShadow = true; g.add(cup);
    [-1, 1].forEach(s => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 10, 24, Math.PI), material); h.position.set(s * 0.6, 1.3, 0); h.rotation.z = s * -Math.PI / 2; g.add(h); });
    return g;
  };

  W.makeBall = (r, fill, edge) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), fill);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: edge })));
    m.castShadow = true;
    return m;
  };

  // Small feed-forward network with a looping forward pass.
  // tick(t, dt, active): active in [0,1] fades the activity in/out.
  W.makeNetwork = ({ sizes = [3, 5, 6, 5, 2], dx = 1.5, dy = 0.65, radius = 0.16, nodeColor = 0xc9d0da, glow = 0xff6b1a, lineColor = 0x9aa5b5, lineActive = 0x2f6bff, pulseColor = 0x2f6bff, baseGlow = 0 } = {}) => {
    const g = new THREE.Group(), layers = [], conns = [];
    sizes.forEach((n, i) => {
      const L = [];
      for (let j = 0; j < n; j++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), new THREE.MeshStandardMaterial({ color: nodeColor, roughness: 0.35, emissive: glow, emissiveIntensity: baseGlow }));
        m.position.set((i - (sizes.length - 1) / 2) * dx, (j - (n - 1) / 2) * dy, Math.sin(i * 1.3 + j) * 0.3);
        m.castShadow = true; g.add(m); L.push(m);
      }
      layers.push(L);
    });
    const byLayer = [];
    for (let i = 0; i < layers.length - 1; i++) {
      byLayer.push([]);
      layers[i].forEach(a => layers[i + 1].forEach(b => {
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.position, b.position]), new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.2 }));
        g.add(l); const c = { l, a: a.position, b: b.position, i }; conns.push(c); byLayer[i].push(c);
      }));
    }
    const pm = new THREE.MeshBasicMaterial({ color: pulseColor, transparent: true });
    const pulses = Array.from({ length: 40 }, (_, k) => { const p = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.32, 8, 6), pm); p.userData.seed = k; g.add(p); return p; });
    const cOff = new THREE.Color(lineColor), cOn = new THREE.Color(lineActive);
    g.tick = (t, dt, active) => {
      const phase = (t * 1.3) % (sizes.length + 0.6), Lp = Math.floor(phase), fr = phase - Lp;
      layers.forEach((L, i) => L.forEach(s => {
        const k = Math.max(0, 1 - Math.abs(phase - i - 0.1) * 1.4) * active;
        s.material.emissiveIntensity += (baseGlow + k * 1.2 - s.material.emissiveIntensity) * Math.min(1, dt * 12);
        s.scale.setScalar(1 + k * 0.3);
      }));
      conns.forEach(c => { const on = active > 0.05 && c.i === Lp; c.l.material.opacity = 0.2 + (on ? 0.55 * active : 0); c.l.material.color.copy(on ? cOn : cOff); });
      pm.opacity = active;
      pulses.forEach(p => {
        const set = byLayer[Lp];
        if (!set || active < 0.05) { p.visible = false; return; }
        const c = set[(p.userData.seed * 7 + Lp * 13) % set.length];
        p.visible = true; p.position.lerpVectors(c.a, c.b, fr);
      });
    };
    return g;
  };

  // ---------- flights ----------
  // Legs are intervals in "stage space" (stage i = milestone card i centred on screen).
  W.FLIGHTS = [
    { a: -0.46, b: -0.06, from: 'MEX', to: 'IST', y: '2011', why: 'RoboCup Istanbul' },
    { a: 0.18, b: 0.82, from: 'IST', to: 'MEX', y: '2011', why: 'back home' },
    { a: 1.18, b: 1.82, from: 'MEX', to: 'BRA', y: '2014', why: 'LatAm Robotics Competition' },
    { a: 2.18, b: 2.82, from: 'BRA', to: 'MEX', y: '2014', why: 'back with the trophy' },
    { a: 4.12, b: 4.88, from: 'MEX', to: 'SWE', y: '2022', why: 'moving to Sweden' },
  ];
  W.flightAt = (s, legs = W.FLIGHTS) => {
    for (const leg of legs) if (s > leg.a && s < leg.b) return { leg, u: (s - leg.a) / (leg.b - leg.a) };
    return null;
  };
  // Pose along a leg: show = plane visibility (character boards / gets off),
  // alt = altitude, pitch = nose angle. len = ground distance of the leg in world units.
  W.flightPose = (u, H, len) => {
    const sm = THREE.MathUtils.smoothstep;
    const altAt = v => H * sm(v, 0.1, 0.42) * (1 - sm(v, 0.58, 0.9));
    const e = 0.01, alt = altAt(u);
    return { show: sm(u, 0, 0.08) * (1 - sm(u, 0.92, 1)), alt, pitch: Math.atan2(altAt(u + e) - altAt(u - e), 2 * e * len) };
  };

  // Low-poly jet, nose pointing -z. Returns outer group (heading) with .inner (pitch/roll).
  W.makePlane = ({ body = 0xfafafa, accent = 0xff6b1a, glass = 0x5fd4ff, edge = null } = {}) => {
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner); g.inner = inner;
    const mb = new THREE.MeshStandardMaterial({ color: body, roughness: 0.3, metalness: 0.1, flatShading: !!edge });
    const ma = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, emissive: edge ? accent : 0, emissiveIntensity: edge ? 0.6 : 0 });
    const mg = new THREE.MeshBasicMaterial({ color: glass });
    const lm = edge === null ? null : new THREE.LineBasicMaterial({ color: edge });
    const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; inner.add(o);
      if (lm) o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 30), lm));
      return o;
    };
    add(new THREE.CylinderGeometry(0.3, 0.3, 2.4, 14), mb, 0, 0, 0, Math.PI / 2);
    add(new THREE.ConeGeometry(0.3, 0.7, 14), mb, 0, 0, -1.55, -Math.PI / 2);
    add(new THREE.ConeGeometry(0.3, 0.8, 14), mb, 0, 0.04, 1.6, Math.PI / 2);
    add(new THREE.BoxGeometry(3.4, 0.06, 0.7), mb, 0, -0.08, -0.1, 0, 0, 0).geometry.translate(0, 0, 0);
    add(new THREE.BoxGeometry(1.3, 0.05, 0.35), mb, 0, 0.12, 1.55);
    add(new THREE.BoxGeometry(0.06, 0.75, 0.5), ma, 0, 0.45, 1.6, -0.35);
    add(new THREE.BoxGeometry(2.42, 0.08, 0.05), ma, 0, 0.12, 0.02, 0, Math.PI / 2); // stripe
    [-0.85, 0.85].forEach(x => add(new THREE.CylinderGeometry(0.13, 0.11, 0.55, 12), ma, x, -0.28, -0.2, Math.PI / 2));
    add(new THREE.BoxGeometry(0.4, 0.12, 0.2), mg, 0, 0.17, -1.35, -0.4);
    for (let k = 0; k < 6; k++) [-1, 1].forEach(s => add(new THREE.BoxGeometry(0.02, 0.08, 0.12), mg, s * 0.3, 0.1, -0.8 + k * 0.32));
    return g;
  };

  // Puffy low-poly clouds scattered in a box; set .material.opacity to fade them.
  W.makeClouds = (n, box, { color = 0xffffff, edge = null } = {}) => {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, transparent: true, opacity: 0, depthWrite: false });
    const lm = edge === null ? null : new THREE.LineBasicMaterial({ color: edge, transparent: true, opacity: 0 });
    for (let i = 0; i < n; i++) {
      const c = new THREE.Group();
      c.position.set(box.x[0] + Math.random() * (box.x[1] - box.x[0]), box.y[0] + Math.random() * (box.y[1] - box.y[0]), box.z[0] + Math.random() * (box.z[1] - box.z[0]));
      for (let k = 0; k < 4; k++) {
        const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + Math.random() * 0.7, 0), m);
        p.position.set((k - 1.5) * 0.8, Math.random() * 0.4, Math.random() * 0.5); c.add(p);
        if (lm) p.add(new THREE.LineSegments(new THREE.EdgesGeometry(p.geometry), lm));
      }
      g.add(c);
    }
    g.setOpacity = o => { m.opacity = o * 0.9; if (lm) lm.opacity = o * 0.6; g.visible = o > 0.01; };
    g.setOpacity(0);
    return g;
  };

  // ---------- route: ground stops + flights between map regions ----------
  // nodes: [{type:'ground', pos:Vector3 (world)}, {type:'flight', leg:{...}}, ...]
  // A flight node always sits between two ground nodes. k is a float node index
  // (driven by scroll). Ground nodes "dwell" for ±dwell around their index.
  // walk: world vector travelled per unit k while dwelling (also the travel direction).
  W.makeRoute = (nodes, { walk, dwell = 0.3, Dtot = 110, H = 9 }) => {
    const dir = walk.clone().normalize(), sm = THREE.MathUtils.smoothstep;
    const P = (i, dk) => nodes[i].pos.clone().addScaledVector(walk, THREE.MathUtils.clamp(dk, -dwell, dwell));
    const n = nodes.length;
    const altAt = u => H * sm(u, 0.12, 0.38) * (1 - sm(u, 0.62, 0.88));
    const distAt = u => Dtot * (0.6 * u + 0.4 * (u - Math.sin(2 * Math.PI * u) / (2 * Math.PI)));
    return k => {
      k = THREE.MathUtils.clamp(k, 0, n - 1);
      for (let i = 1; i < n - 1; i++) {
        if (nodes[i].type !== 'flight') continue;
        const a = i - 1 + dwell, b = i + 1 - dwell;
        if (k <= a || k >= b) continue;
        const u = (k - a) / (b - a), d = distAt(u), A = P(i - 1, dwell), B = P(i + 1, -dwell), e = 0.005;
        const pos = u < 0.5 ? A.addScaledVector(dir, d) : B.addScaledVector(dir, -(Dtot - d));
        const alt = altAt(u);
        return { k, pos, alt, dist: d, u, leg: nodes[i].leg, flight: i,
          pitch: Math.atan2(altAt(u + e) - altAt(u - e), distAt(u + e) - distAt(u - e)),
          show: sm(u, 0, 0.05) * (1 - sm(u, 0.95, 1)),
          node: u < 0.5 ? i - 1 : i + 1 };
      }
      const j = Math.round(k);
      if (Math.abs(k - j) <= dwell) return { k, pos: P(j, k - j), alt: 0, pitch: 0, show: 0, node: j, dist: 0 };
      const j0 = Math.floor(k), t = (k - (j0 + dwell)) / (1 - 2 * dwell);
      return { k, pos: P(j0, dwell).lerp(P(j0 + 1, -dwell), t), alt: 0, pitch: 0, show: 0, node: t < 0.5 ? j0 : j0 + 1, dist: 0 };
    };
  };

  // Scroll -> k: interpolate between the vertical centres of the node elements.
  W.scrollK = (els) => {
    const v = innerHeight * 0.5, c = els.map(e => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; });
    if (v <= c[0]) return 0;
    for (let i = 0; i < c.length - 1; i++) if (v <= c[i + 1]) return i + (v - c[i]) / (c[i + 1] - c[i]);
    return c.length - 1;
  };

  // A sea of clouds that streams past the plane. Forward is local -z;
  // rotate the group to match the heading, position it at the plane, call update(dist).
  W.makeCloudSea = (n, { color = 0xffffff, edge = null, spread = 34, depth = 46 } = {}) => {
    const g = W.makeClouds(n, { x: [-spread, spread], y: [-2.5, 1.5], z: [-depth, depth] }, { color, edge });
    const base = g.children.map(c => c.position.z);
    g.update = d => g.children.forEach((c, i) => { c.position.z = ((base[i] + d + depth) % (2 * depth) + 2 * depth) % (2 * depth) - depth; });
    return g;
  };

  // ---------- globe shown during the cruise part of a flight ----------
  W.CITIES = { MEX: [19.43, -99.13, 'MEXICO CITY'], IST: [41.01, 28.98, 'ISTANBUL'], BRA: [-23.55, -46.63, 'BRAZIL'], SWE: [57.78, 14.16, 'JÖNKÖPING'] };
  W.ll = (lat, lon, r) => { const p = lat * Math.PI / 180, l = lon * Math.PI / 180; return new THREE.Vector3(r * Math.cos(p) * Math.sin(l), r * Math.sin(p), r * Math.cos(p) * Math.cos(l)); };
  // Coastlines come from world-atlas (needs topojson-client loaded as window.topojson); without them
  // the globe still shows the graticule, cities and the route.
  W.makeGlobe = ({ bg, ocean, grid, coast, arc, city, label = '#ffffff', font = 'monospace', plane = {} }) => {
    const R = 5, scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 0.1, 300); scene.add(cam);
    const mats = []; const T = m => { m.transparent = true; mats.push([m, m.opacity]); return m; };
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), T(new THREE.MeshBasicMaterial({ color: bg, depthTest: false, depthWrite: false })));
    back.position.z = -150; back.renderOrder = -1; cam.add(back);
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), T(new THREE.MeshBasicMaterial({ color: ocean }))));
    const gp = [], r1 = R * 1.002;
    for (let lat = -75; lat <= 75; lat += 15) for (let lon = -180; lon < 180; lon += 4) gp.push(W.ll(lat, lon, r1), W.ll(lat, lon + 4, r1));
    for (let lon = -180; lon < 180; lon += 15) for (let lat = -88; lat < 88; lat += 4) gp.push(W.ll(lat, lon, r1), W.ll(lat + 4, lon, r1));
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(gp), T(new THREE.LineBasicMaterial({ color: grid, opacity: 0.35 }))));
    const coastMat = T(new THREE.LineBasicMaterial({ color: coast }));
    if (window.topojson) (window.__LAND_JSON ? Promise.resolve(window.__LAND_JSON) : fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json').then(r => r.json())).then(topo => {
      const m = topojson.mesh(topo, topo.objects.land), pts = [];
      m.coordinates.forEach(line => { for (let i = 0; i < line.length - 1; i++) pts.push(W.ll(line[i][1], line[i][0], R * 1.004), W.ll(line[i + 1][1], line[i + 1][0], R * 1.004)); });
      scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), coastMat));
    }).catch(() => {});
    // cities
    const dotMat = T(new THREE.MeshBasicMaterial({ color: city }));
    Object.entries(W.CITIES).forEach(([code, [lat, lon, name]]) => {
      const p = W.ll(lat, lon, R * 1.01);
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), dotMat); d.position.copy(p); scene.add(d);
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const x = cv.getContext('2d');
      x.font = `600 44px ${font}`; x.fillStyle = label; x.textBaseline = 'middle'; x.fillText(name, 8, 48);
      const sp = new THREE.Sprite(T(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false })));
      sp.scale.set(2, 0.375, 1); sp.center.set(-0.06, 0.5); sp.position.copy(W.ll(lat, lon, R * 1.03)); scene.add(sp);
    });
    // route arc + mini plane
    const N = 120, arcGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: N + 1 }, () => new THREE.Vector3()));
    const arcLine = new THREE.Line(arcGeo, T(new THREE.LineBasicMaterial({ color: arc })));
    const ghostGeo = arcGeo.clone(), ghost = new THREE.Line(ghostGeo, T(new THREE.LineDashedMaterial({ color: arc, dashSize: 0.12, gapSize: 0.1, opacity: 0.35 })));
    scene.add(ghost, arcLine);
    const mini = W.makePlane(plane); mini.scale.setScalar(0.22); scene.add(mini);
    let key = '', A = new THREE.Vector3(), B = new THREE.Vector3(), om = 0, fit = 1;
    const at = t => {
      const s = Math.sin(om), p = om < 1e-4 ? A.clone() : A.clone().multiplyScalar(Math.sin((1 - t) * om) / s).addScaledVector(B, Math.sin(t * om) / s);
      return p.normalize().multiplyScalar(R * (1.02 + (0.06 + 0.25 * om / Math.PI) * Math.sin(Math.PI * t)));
    };
    const up = new THREE.Vector3();
    return {
      scene, cam,
      // pull the camera back on portrait screens so the whole globe fits
      resize: aspect => { cam.aspect = aspect; cam.updateProjectionMatrix(); fit = aspect < 1 ? Math.min(2.2, 1.05 / aspect) : 1; },
      update(leg, t, fade) {
        mats.forEach(([m, o]) => m.opacity = o * fade);
        const k = leg.from + leg.to;
        if (k !== key) {
          key = k; const a = W.CITIES[leg.from], b = W.CITIES[leg.to];
          A = W.ll(a[0], a[1], 1); B = W.ll(b[0], b[1], 1); om = Math.acos(THREE.MathUtils.clamp(A.dot(B), -1, 1));
          [arcGeo, ghostGeo].forEach(g => { const pos = g.attributes.position; for (let i = 0; i <= N; i++) { const p = at(i / N); pos.setXYZ(i, p.x, p.y, p.z); } pos.needsUpdate = true; });
          ghost.computeLineDistances();
        }
        arcLine.geometry.setDrawRange(0, Math.max(2, Math.round(t * N) + 1));
        const p = at(t), q = at(Math.min(1, t + 0.01)), back2 = p.clone().multiplyScalar(2).sub(q);
        mini.position.copy(p); mini.up.copy(up.copy(p).normalize()); mini.lookAt(back2); mini.scale.setScalar(0.22 * fade + 0.001);
        const mid = at(0.5).normalize(), dirC = mid.lerp(p.clone().normalize(), 0.55).normalize();
        cam.position.copy(dirC.multiplyScalar((15 - 2 * Math.sin(Math.PI * t)) * fit)); cam.up.set(0, 1, 0); cam.lookAt(0, 0, 0);
      },
    };
  };

  // ---------- landmarks ----------
  // style: { fill: hex => Material, edge: hex|null, edgeOpacity }
  const mk = (st, geo, color, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, st.fill(color)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m);
    if (st.edge != null) {
      st._lines = st._lines || new THREE.LineBasicMaterial({ color: st.edge, transparent: true, opacity: st.edgeOpacity == null ? 0.85 : st.edgeOpacity });
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), st._lines));
    }
    return m;
  };
  W.mk = mk;

  // Ottoman mosque (Blue Mosque / Hagia Sophia silhouette): dome, half domes, 4 minarets.
  W.makeMosque = (st, { wall = 0xdcccb2, dome = 0x7d8c99, accent = 0xc9a14a } = {}) => {
    const g = new THREE.Group();
    mk(st, new THREE.BoxGeometry(7, 2.6, 7), wall, g, 0, 1.3, 0);
    mk(st, new THREE.CylinderGeometry(2.1, 2.1, 0.8, 20), wall, g, 0, 3, 0);
    mk(st, new THREE.SphereGeometry(2.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dome, g, 0, 3.4, 0);
    mk(st, new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), accent, g, 0, 5.9, 0);
    [[2.4, 0], [-2.4, 0], [0, 2.4], [0, -2.4]].forEach(([x, z]) => mk(st, new THREE.SphereGeometry(1.25, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), dome, g, x, 2.6, z));
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
      mk(st, new THREE.SphereGeometry(0.7, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), dome, g, a * 2.65, 2.6, b * 2.65);
      const x = a * 4.3, z = b * 4.3;
      mk(st, new THREE.CylinderGeometry(0.17, 0.2, 7.4, 10), wall, g, x, 3.7, z);
      mk(st, new THREE.CylinderGeometry(0.32, 0.32, 0.14, 12), wall, g, x, 5.4, z);
      mk(st, new THREE.CylinderGeometry(0.3, 0.3, 0.14, 12), wall, g, x, 6.6, z);
      mk(st, new THREE.ConeGeometry(0.2, 1.5, 10), accent, g, x, 8.15, z);
    });
    return g;
  };

  W.makeGalata = (st, { wall = 0xc9b79a, roof = 0x4a5866 } = {}) => {
    const g = new THREE.Group();
    mk(st, new THREE.CylinderGeometry(1, 1.1, 6, 16), wall, g, 0, 3, 0);
    mk(st, new THREE.CylinderGeometry(1.25, 1.25, 0.2, 16), wall, g, 0, 5.4, 0);
    mk(st, new THREE.ConeGeometry(1.15, 2.4, 16), roof, g, 0, 7.2, 0);
    return g;
  };

  // Suspension bridge whose deck runs from z=0 to z=-len (rotate the group for other headings).
  W.makeBridge = (st, { len = 40, towerH = 9, deck = 0x2a2f38, cable = 0xffffff, width = 4.4 } = {}) => {
    const g = new THREE.Group();
    mk(st, new THREE.BoxGeometry(width, 0.3, len), deck, g, 0, -0.15, -len / 2);
    const tz = [-len * 0.2, -len * 0.8];
    tz.forEach(z => [-1, 1].forEach(s => mk(st, new THREE.BoxGeometry(0.35, towerH, 0.5), deck, g, s * (width / 2 + 0.2), towerH / 2 - 0.3, z)));
    tz.forEach(z => mk(st, new THREE.BoxGeometry(width + 0.8, 0.35, 0.5), deck, g, 0, towerH - 0.6, z));
    const cm = new THREE.LineBasicMaterial({ color: cable, transparent: true, opacity: 0.85 });
    [-1, 1].forEach(s => {
      const x = s * (width / 2 + 0.2), pts = [], hang = [];
      for (let i = 0; i <= 40; i++) {
        const z = i / 40 * -len, a = tz[0], b = tz[1];
        let y;
        if (z > a) y = towerH - 0.5 - (towerH - 1) * (z - a) / (0 - a);           // side span down to deck
        else if (z < b) y = towerH - 0.5 - (towerH - 1) * (z - b) / (-len - b);
        else { const t = (z - a) / (b - a); y = 1.2 + (towerH - 1.7) * Math.pow(2 * t - 1, 2); }
        pts.push(new THREE.Vector3(x, y, z));
        if (i % 2 === 0) hang.push(new THREE.Vector3(x, y, z), new THREE.Vector3(x, 0, z));
      }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cm));
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(hang), cm));
    });
    return g;
  };

  // Corcovado with Christ the Redeemer on top (~16 tall).
  W.makeCorcovado = (st, { rock = 0x3f6d45, stone = 0xe9e5dc, h = 12 } = {}) => {
    const g = new THREE.Group();
    const m = mk(st, new THREE.ConeGeometry(h * 0.55, h, 7, 2), rock, g, 0, h / 2, 0); m.rotation.y = 0.3;
    const s = new THREE.Group(); s.position.y = h - 0.3; g.add(s);
    mk(st, new THREE.BoxGeometry(0.9, 1.1, 0.9), stone, s, 0, 0.55, 0);
    mk(st, new THREE.CylinderGeometry(0.26, 0.46, 2.3, 8), stone, s, 0, 2.25, 0);
    mk(st, new THREE.BoxGeometry(2.8, 0.28, 0.3), stone, s, 0, 3.1, 0);
    mk(st, new THREE.SphereGeometry(0.23, 10, 8), stone, s, 0, 3.62, 0);
    return g;
  };

  W.makeSugarloaf = (st, { rock = 0x6f7a6a, h = 9 } = {}) => {
    const g = new THREE.Group();
    const a = mk(st, new THREE.SphereGeometry(2.6, 10, 8), rock, g, 0, 0, 0); a.scale.set(1, h / 2.6, 1.1);
    const b = mk(st, new THREE.SphereGeometry(2.4, 9, 7), rock, g, -6, 0, 1.5); b.scale.set(1.2, 1.4, 1);
    const cm = new THREE.LineBasicMaterial({ color: st.edge != null ? st.edge : 0x333333 });
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-6, 3.3, 1.5), new THREE.Vector3(-3, 4.6, .8), new THREE.Vector3(0, h - 0.2, 0)]), cm));
    return g;
  };

  W.makePalm = (st, { trunk = 0x8a6a45, leaf = 0x2f9e4f, h = 4 } = {}) => {
    const g = new THREE.Group();
    let y = 0, x = 0;
    for (let i = 0; i < 5; i++) { const seg = mk(st, new THREE.CylinderGeometry(0.12, 0.16, h / 5, 6), trunk, g, x, y + h / 10, 0); seg.rotation.z = -0.06 * i; x += 0.06 * i * 0.5; y += h / 5; }
    for (let k = 0; k < 7; k++) {
      const p = new THREE.Group(); p.position.set(x, y, 0); p.rotation.y = k / 7 * Math.PI * 2; g.add(p);
      const l = mk(st, new THREE.BoxGeometry(1.8, 0.04, 0.34), leaf, p, 0.85, -0.25, 0); l.rotation.z = -0.35;
    }
    return g;
  };

  // Turning Torso, Malmö: 9 stacked cubes twisting 90° (~11 tall).
  W.makeTurningTorso = (st, { color = 0xe8ecef } = {}) => {
    const g = new THREE.Group();
    for (let i = 0; i < 9; i++) { const b = mk(st, new THREE.BoxGeometry(2.1, 1.12, 2.1), color, g, 0.5, i * 1.2 + 0.56, 0); b.rotation.y = i * (Math.PI / 2) / 8; }
    mk(st, new THREE.CylinderGeometry(0.35, 0.35, 11, 10), color, g, -0.55, 5.5, 0);
    return g;
  };

  W.makeCottage = (st, { wall = 0xa8231b, roof = 0x2b2b2b, trim = 0xffffff } = {}) => {
    const g = new THREE.Group();
    mk(st, new THREE.BoxGeometry(2.6, 1.6, 1.9), wall, g, 0, 0.8, 0);
    const sh = new THREE.Shape(); sh.moveTo(-1.5, 0); sh.lineTo(1.5, 0); sh.lineTo(0, 1.1); sh.lineTo(-1.5, 0);
    const rg = new THREE.ExtrudeGeometry(sh, { depth: 2.2, bevelEnabled: false }); rg.translate(0, 0, -1.1);
    const r = mk(st, rg, roof, g, 0, 1.6, 0); r.rotation.y = Math.PI / 2;
    mk(st, new THREE.BoxGeometry(0.5, 0.9, 0.05), trim, g, 0.5, 0.45, 0.96);
    mk(st, new THREE.BoxGeometry(0.45, 0.4, 0.05), trim, g, -0.6, 0.95, 0.96);
    return g;
  };

  W.makePine = (st, { color = 0x2f6b4a, snow = null, h = 1 } = {}) => {
    const g = new THREE.Group();
    mk(st, new THREE.CylinderGeometry(0.12, 0.16, 1, 6), 0x5a4030, g, 0, 0.5, 0);
    [[1.3, 0.95], [1.9, 0.72], [2.45, 0.5]].forEach(([y, r]) => mk(st, new THREE.ConeGeometry(r, 1, 7), color, g, 0, y, 0));
    if (snow != null) mk(st, new THREE.ConeGeometry(0.28, 0.36, 7), snow, g, 0, 2.85, 0);
    g.scale.setScalar(h);
    return g;
  };

  W.makeJungleTree = (st, { trunk = 0x7a5a3a, leaf = 0x3aa55a } = {}) => {
    const g = new THREE.Group();
    mk(st, new THREE.CylinderGeometry(0.12, 0.16, 1.2, 6), trunk, g, 0, 0.6, 0);
    [[0, 1.7, 0, 0.9], [0.5, 1.4, 0.2, 0.6], [-0.45, 1.5, -0.1, 0.65]].forEach(([a, b, c, r]) => mk(st, new THREE.IcosahedronGeometry(r, 0), leaf, g, a, b, c));
    return g;
  };

  // ---------- style switcher (top-centre pill linking the two versions) ----------
  W.isMobile = () => matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  W.mountSwitcher = (current, t) => {
    const links = window.__SWITCH_LINKS || { neon: '1-cyberpunk.html', lab: '5-ai-robotics.html' };
    const css = document.createElement('style');
    css.textContent = `.vswitch{position:fixed;z-index:20;top:12px;left:50%;transform:translateX(-50%);display:flex;gap:2px;padding:3px;
      background:${t.bg};border:1px solid ${t.border};border-radius:${t.radius};font:${t.font};backdrop-filter:blur(8px);box-shadow:0 6px 20px rgba(0,0,0,.18)}
      .vswitch a{display:inline-block;margin:0;padding:7px 14px;border-radius:${t.radius};color:${t.fg};text-decoration:none;white-space:nowrap;opacity:.75}
      .vswitch a:hover{opacity:1}.vswitch a.on{background:${t.acc};color:${t.accFg};opacity:1}
      @media (max-width:760px){.vswitch{top:auto;bottom:calc(14px + env(safe-area-inset-bottom));font-size:12px}.vswitch a{padding:8px 14px}}`;
    document.head.appendChild(css);
    const nav = document.createElement('div'); nav.className = 'vswitch'; nav.setAttribute('role', 'navigation'); nav.setAttribute('aria-label', 'Choose a style');
    nav.innerHTML = `<a href="${links.neon}" class="${current === 'neon' ? 'on' : ''}">Neon Run</a><a href="${links.lab}" class="${current === 'lab' ? 'on' : ''}">Neural Lab</a>`;
    document.body.appendChild(nav);
  };

  window.W3D = W;
})();
