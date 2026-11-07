/*
 * Three.js holographic hero — replaces the old everywhere-on particle backdrop.
 * Uses the existing Three.js CDN from index.html, no additional build tooling.
 * Gracefully falls back to the CSS sculpture when WebGL is unavailable.
 */
(function () {
    'use strict';
    const canvas = document.getElementById('hero-canvas');
    const visual = document.querySelector('.hero-visual');
    const THREE = window.THREE;
    if (!canvas || !visual || !THREE) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(pointer:fine)').matches;
    const mobile = window.matchMedia('(max-width: 680px)').matches;
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: !mobile,
            powerPreference: 'low-power'
        });
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.8));
        if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    } catch (error) {
        console.info('WebGL is unavailable; using decorative CSS artwork instead.', error);
        return;
    }
    document.documentElement.classList.add('three-ready');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.set(0, 0, 12.5);

    const ambient = new THREE.AmbientLight(0x819bdf, .75);
    scene.add(ambient);
    const keyLight = new THREE.PointLight(0x8cf5e9, 2.1, 28);
    keyLight.position.set(5, 6, 8);
    scene.add(keyLight);
    const violetLight = new THREE.PointLight(0x8873ff, 2.6, 30);
    violetLight.position.set(-5, -4, 5);
    scene.add(violetLight);
    const rimLight = new THREE.PointLight(0x5997ff, 1.5, 20);
    rimLight.position.set(0, 2, -3);
    scene.add(rimLight);

    const artwork = new THREE.Group();
    scene.add(artwork);
    artwork.rotation.x = .12;
    artwork.rotation.y = -.24;

    // Semi-translucent faceted inner core.
    const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.52, 2),
        new THREE.MeshPhongMaterial({
            color: 0x29367e, specular: 0x9ac9ff, shininess: 110,
            transparent: true, opacity: .8, flatShading: true, side: THREE.DoubleSide
        })
    );
    artwork.add(core);

    // Iridescent woven surface gives the form its recognizable 3D identity.
    const knotGeometry = new THREE.TorusKnotGeometry(1.56, .24, 210, 22, 2, 3);
    const knot = new THREE.Mesh(knotGeometry, new THREE.MeshPhongMaterial({
        color: 0x68cfd7, emissive: 0x123c68, specular: 0xe9ffff,
        shininess: 125, transparent: true, opacity: .93
    }));
    knot.rotation.set(.33, -.25, .48);
    artwork.add(knot);
    const knotFilament = new THREE.Mesh(
        new THREE.TorusKnotGeometry(1.62, .012, 230, 8, 2, 3),
        new THREE.MeshBasicMaterial({ color: 0xb3a0ff, transparent: true, opacity: .54 })
    );
    knotFilament.rotation.copy(knot.rotation);
    artwork.add(knotFilament);

    const innerWire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.84, 2),
        new THREE.MeshBasicMaterial({
            color: 0xa4a4ff, wireframe: true, transparent: true, opacity: .18,
            depthWrite: false
        })
    );
    artwork.add(innerWire);

    // Engineering-inspired concentric orbital tracks, satellites, and paths.
    function orbit(radius, color, opacity, tube, rx, ry, rz) {
        const mesh = new THREE.Mesh(
            new THREE.TorusGeometry(radius, tube, 8, 180),
            new THREE.MeshBasicMaterial({color, transparent:true, opacity, depthWrite:false})
        );
        mesh.rotation.set(rx, ry, rz);
        artwork.add(mesh);
        return mesh;
    }
    const orbitA = orbit(2.77, 0x68dacc, .69, .018, .73, .18, -.32);
    const orbitB = orbit(3.17, 0x9b8fff, .34, .014, -.28, .72, .44);
    const orbitC = orbit(2.45, 0x90b5ff, .23, .010, 1.14, .17, .52);
    // Broken-track segments read like precision instrument UI.
    const brokenOrbit = new THREE.Mesh(
        new THREE.TorusGeometry(3.47, .016, 6, 100, Math.PI * 1.3),
        new THREE.MeshBasicMaterial({ color: 0x79ffe6, transparent: true, opacity: .58, depthWrite: false })
    );
    brokenOrbit.rotation.set(.16, .7, .36);
    artwork.add(brokenOrbit);

    const satellites = [];
    const satelliteGeometry = new THREE.IcosahedronGeometry(.08, 1);
    [
        {color:0x8cf8e2, r:2.77, angle:.2, orbit:orbitA},
        {color:0xafa1ff, r:3.17, angle:2.65, orbit:orbitB},
        {color:0xc9e7ff, r:2.45, angle:4.4, orbit:orbitC}
    ].forEach(item => {
        const satellite = new THREE.Mesh(satelliteGeometry, new THREE.MeshBasicMaterial({color:item.color}));
        artwork.add(satellite);
        satellites.push({...item, satellite});
    });

    // Restrained 3D starfield. Fewer vertices and capped DPR keep mobile smooth.
    const count = mobile ? 105 : 185;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - .5) * 12;
        positions[i * 3 + 1] = (Math.random() - .5) * 11;
        positions[i * 3 + 2] = (Math.random() - .5) * 7 - 2;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dustMaterial = new THREE.PointsMaterial({
        color: 0x9abfff, size: .03, transparent:true, opacity:.55,
        depthWrite:false, sizeAttenuation:true
    });
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dust);

    let pointerX = 0, pointerY = 0;
    let paused = reducedMotion.matches;
    let inView = true;
    let needsRender = true;
    let lastTime = 0;
    let clock = 0;

    if (finePointer) {
        visual.addEventListener('pointermove', event => {
            if (paused) return;
            const bounds = visual.getBoundingClientRect();
            pointerX = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
            pointerY = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
        }, {passive:true});
        visual.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; }, {passive:true});
    }

    function resize() {
        const width = Math.max(1, Math.round(visual.clientWidth));
        const height = Math.max(1, Math.round(visual.clientHeight));
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        needsRender = true;
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(visual);
    else window.addEventListener('resize', resize, {passive:true});

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            if (inView) needsRender = true;
        }, {threshold:0.01}).observe(visual);
    }

    function setTheme(theme) {
        const light = theme === 'light';
        dustMaterial.color.setHex(light ? 0x667bb2 : 0x9abfff);
        dustMaterial.opacity = light ? .35 : .55;
        innerWire.material.color.setHex(light ? 0x6862d7 : 0xa4a4ff);
        core.material.color.setHex(light ? 0x6262aa : 0x29367e);
        orbitA.material.opacity = light ? .8 : .69;
        needsRender = true;
    }
    window.updateThreeJsTheme = setTheme;
    window.setThreeJsPaused = function (value) { paused = !!value; needsRender = true; };
    setTheme(document.documentElement.getAttribute('data-theme'));
    reducedMotion.addEventListener?.('change', event => {
        paused = event.matches;
        needsRender = true;
    });

    const tempPosition = new THREE.Vector3();
    function animate(time) {
        requestAnimationFrame(animate);
        if (!inView || document.hidden) return;
        if (paused && !needsRender) return;
        if (!paused && time - lastTime < (mobile ? 31 : 16)) return;
        const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : .016;
        lastTime = time;
        if (!paused) {
            clock += delta;
            artwork.rotation.y += ((pointerX * .18 - .24) - artwork.rotation.y) * .033;
            artwork.rotation.x += ((-pointerY * .14 + .12) - artwork.rotation.x) * .033;
            core.rotation.y = clock * .11;
            core.rotation.x = clock * -.07;
            knot.rotation.y = -.25 + clock * .23;
            knot.rotation.z = .48 + clock * .08;
            knotFilament.rotation.copy(knot.rotation);
            innerWire.rotation.y = clock * -.095;
            innerWire.rotation.z = clock * .045;
            orbitA.rotation.z += delta * .038;
            orbitB.rotation.y += delta * -.032;
            orbitC.rotation.x += delta * .026;
            brokenOrbit.rotation.z += delta * .032;
            dust.rotation.y = Math.sin(clock * .1) * .03;
            artwork.position.y = Math.sin(clock * .68) * .08;
            satellites.forEach((entry, i) => {
                const angle = entry.angle + clock * (i % 2 ? -.22 : .21);
                tempPosition.set(Math.cos(angle) * entry.r, Math.sin(angle) * entry.r, 0);
                // Track satellites in the rotated plane of their own ring.
                tempPosition.applyEuler(entry.orbit.rotation);
                entry.satellite.position.copy(tempPosition);
            });
        }
        renderer.render(scene, camera);
        needsRender = false;
    }
    requestAnimationFrame(animate);
})();
