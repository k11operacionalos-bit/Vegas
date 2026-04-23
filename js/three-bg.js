/* ═══════════════════════════════════════════════════════════════════
   TITAN v5 — three-bg.js
   Background 3D animado com Three.js — versão épica
   Neural network + hexagonal grid + particles + connections
   Responsivo e com mouse interaction
═══════════════════════════════════════════════════════════════════ */

function initThreeBackground(){
  if(!window.THREE){ console.warn("Three.js não carregado"); return; }

  const canvas = document.getElementById("three-canvas");
  if(!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 35);

  /* ── COLORS ── */
  const C_COPPER = 0xd97757;
  const C_ACCENT = 0x2f78f0;
  const C_GREEN  = 0x0fd98a;
  const C_PURPLE = 0x9c7df5;
  const C_CYAN   = 0x18d4f0;
  const C_RED    = 0xf43060;

  const palette = [
    new THREE.Color(C_COPPER),
    new THREE.Color(C_ACCENT),
    new THREE.Color(C_GREEN),
    new THREE.Color(C_PURPLE),
    new THREE.Color(C_CYAN),
  ];

  /* ── MOUSE ── */
  const mouse = new THREE.Vector2(0,0);
  document.addEventListener("mousemove", e=>{
    mouse.x = (e.clientX/window.innerWidth)*2-1;
    mouse.y = -(e.clientY/window.innerHeight)*2+1;
  },{passive:true});

  /* ── PARTICLES ── */
  const PARTICLE_COUNT = window.innerWidth < 768 ? 80 : 160;
  const positions      = new Float32Array(PARTICLE_COUNT*3);
  const pColors        = new Float32Array(PARTICLE_COUNT*3);
  const pVelocities    = new Float32Array(PARTICLE_COUNT*3);
  const pSizes         = new Float32Array(PARTICLE_COUNT);

  for(let i=0; i<PARTICLE_COUNT; i++){
    positions[i*3]   = (Math.random()-0.5)*100;
    positions[i*3+1] = (Math.random()-0.5)*80;
    positions[i*3+2] = (Math.random()-0.5)*50;
    pVelocities[i*3]   = (Math.random()-0.5)*0.015;
    pVelocities[i*3+1] = (Math.random()-0.5)*0.010;
    pVelocities[i*3+2] = (Math.random()-0.5)*0.008;
    const c = palette[Math.floor(Math.random()*palette.length)];
    pColors[i*3]=c.r; pColors[i*3+1]=c.g; pColors[i*3+2]=c.b;
    pSizes[i] = Math.random()*0.4+0.15;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position",new THREE.BufferAttribute(positions,3));
  particleGeo.setAttribute("color",   new THREE.BufferAttribute(pColors,3));

  const particleMat = new THREE.PointsMaterial({
    size:0.3, vertexColors:true,
    transparent:true, opacity:0.75,
    sizeAttenuation:true,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* ── CONNECTION LINES ── */
  const CONNECTION_THRESHOLD = 14;
  const lineGroup = new THREE.Group();
  scene.add(lineGroup);

  function rebuildLines(){
    lineGroup.clear();
    for(let i=0;i<PARTICLE_COUNT;i++){
      for(let j=i+1;j<PARTICLE_COUNT;j++){
        const ax=positions[i*3],ay=positions[i*3+1],az=positions[i*3+2];
        const bx=positions[j*3],by=positions[j*3+1],bz=positions[j*3+2];
        const dist=Math.sqrt((ax-bx)**2+(ay-by)**2+(az-bz)**2);
        if(dist<CONNECTION_THRESHOLD){
          const opacity = (1-dist/CONNECTION_THRESHOLD)*0.12;
          const geo=new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(ax,ay,az),
            new THREE.Vector3(bx,by,bz)
          ]);
          // Blend color from particles
          const c1=new THREE.Color(pColors[i*3],pColors[i*3+1],pColors[i*3+2]);
          const c2=new THREE.Color(pColors[j*3],pColors[j*3+1],pColors[j*3+2]);
          c1.lerp(c2,0.5);
          const mat=new THREE.LineBasicMaterial({color:c1,transparent:true,opacity});
          lineGroup.add(new THREE.Line(geo,mat));
        }
      }
    }
  }
  rebuildLines();

  /* ── HEX GRID ── */
  const hexGroup = new THREE.Group();
  scene.add(hexGroup);

  function createHexRing(radius, y, color, opacity){
    const segments = 6;
    const pts = [];
    for(let i=0;i<=segments;i++){
      const angle = (i/segments)*Math.PI*2;
      pts.push(new THREE.Vector3(Math.cos(angle)*radius, y, Math.sin(angle)*radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({color, transparent:true, opacity});
    return new THREE.Line(geo, mat);
  }

  // Floating hex rings at different depths
  const hexRings = [
    {r:8,  y:-5,  color:C_COPPER, op:0.04},
    {r:15, y:2,   color:C_ACCENT, op:0.03},
    {r:22, y:-8,  color:C_CYAN,   op:0.025},
    {r:5,  y:6,   color:C_PURPLE, op:0.05},
    {r:18, y:10,  color:C_GREEN,  op:0.03},
    {r:12, y:-12, color:C_COPPER, op:0.035},
  ];
  hexRings.forEach(h=>hexGroup.add(createHexRing(h.r, h.y, h.color, h.op)));

  /* ── PULSING NODES ── */
  const nodeCount = 12;
  const nodeGroup = new THREE.Group();
  scene.add(nodeGroup);
  const nodeData = [];

  for(let i=0;i<nodeCount;i++){
    const c = palette[i%palette.length];
    const geo = new THREE.SphereGeometry(0.25+Math.random()*0.2, 8, 8);
    const mat = new THREE.MeshBasicMaterial({color:c, transparent:true, opacity:0.6});
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random()-0.5)*70,
      (Math.random()-0.5)*50,
      (Math.random()-0.5)*30
    );
    nodeGroup.add(mesh);
    nodeData.push({
      mesh,
      baseScale: 1,
      phase: Math.random()*Math.PI*2,
      speed: 0.5+Math.random()*1.5,
    });
  }

  /* ── TITAN LOGO ── */
  const logoGroup = new THREE.Group();
  scene.add(logoGroup);

  // Outer hex frame
  function createHexOutline(r, color, opacity){
    const pts = [];
    for(let i=0;i<=6;i++){
      const a=(i/6)*Math.PI*2-Math.PI/6;
      pts.push(new THREE.Vector3(Math.cos(a)*r, Math.sin(a)*r, 0));
    }
    const geo=new THREE.BufferGeometry().setFromPoints(pts);
    const mat=new THREE.LineBasicMaterial({color,transparent:true,opacity});
    return new THREE.Line(geo,mat);
  }

  logoGroup.add(createHexOutline(3.5, C_COPPER, 0.12));
  logoGroup.add(createHexOutline(2.5, C_ACCENT, 0.08));
  logoGroup.position.set(0, 0, -20);

  /* ── WARP LINES (speed effect) ── */
  const warpGroup = new THREE.Group();
  scene.add(warpGroup);

  function createWarpLine(){
    const len = 3+Math.random()*8;
    const x=(Math.random()-0.5)*100, y=(Math.random()-0.5)*80, z=(Math.random()-0.5)*40;
    const pts=[new THREE.Vector3(x,y,z), new THREE.Vector3(x,y+len,z)];
    const geo=new THREE.BufferGeometry().setFromPoints(pts);
    const c=palette[Math.floor(Math.random()*palette.length)];
    const mat=new THREE.LineBasicMaterial({color:c,transparent:true,opacity:0.04+Math.random()*0.04});
    return new THREE.Line(geo,mat);
  }

  for(let i=0;i<30;i++) warpGroup.add(createWarpLine());

  /* ── ANIMATION ── */
  let frame=0;
  const clock = new THREE.Clock();
  let lineRebuildCounter = 0;

  function animate(){
    requestAnimationFrame(animate);
    const t  = clock.getElapsedTime();
    const dt = clock.getDelta()||0.016;
    frame++;

    // Move particles
    for(let i=0;i<PARTICLE_COUNT;i++){
      positions[i*3]   += pVelocities[i*3];
      positions[i*3+1] += pVelocities[i*3+1];
      positions[i*3+2] += pVelocities[i*3+2];

      // Boundary bounce
      if(Math.abs(positions[i*3])   >50){ pVelocities[i*3]*=-1;   positions[i*3]=Math.sign(positions[i*3])*50; }
      if(Math.abs(positions[i*3+1]) >40){ pVelocities[i*3+1]*=-1; positions[i*3+1]=Math.sign(positions[i*3+1])*40; }
      if(Math.abs(positions[i*3+2]) >25){ pVelocities[i*3+2]*=-1; positions[i*3+2]=Math.sign(positions[i*3+2])*25; }
    }
    particleGeo.attributes.position.needsUpdate=true;

    // Rebuild lines every 20 frames
    lineRebuildCounter++;
    if(lineRebuildCounter>=20){ rebuildLines(); lineRebuildCounter=0; }

    // Pulsing nodes
    nodeData.forEach(n=>{
      const s = 1+Math.sin(t*n.speed+n.phase)*0.3;
      n.mesh.scale.setScalar(s);
      n.mesh.material.opacity = 0.3+Math.sin(t*n.speed+n.phase)*0.3;
    });

    // Rotate groups slowly
    hexGroup.rotation.y = t*0.03;
    hexGroup.rotation.x = Math.sin(t*0.02)*0.1;
    logoGroup.rotation.z = t*0.05;
    logoGroup.rotation.y = Math.sin(t*0.03)*0.2;

    // Mouse parallax
    camera.position.x += (mouse.x*3-camera.position.x)*0.02;
    camera.position.y += (mouse.y*2-camera.position.y)*0.02;
    camera.lookAt(0,0,0);

    // Warp lines drift
    warpGroup.children.forEach((l,i)=>{
      l.position.y = ((l.position.y+0.05)%80)-40;
    });

    // Particle opacity pulse
    particleMat.opacity = 0.6+Math.sin(t*0.3)*0.15;

    renderer.render(scene, camera);
  }

  animate();

  /* ── RESIZE ── */
  function onResize(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize, {passive:true});
}
