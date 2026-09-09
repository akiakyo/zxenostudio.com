import * as THREE from "three";

// Silhouette traced from the supplied ZXENO Main Logo, with real extruded depth.
const contours = [
  [
    [0, 0],
    [456, 0],
    [456, 456],
    [908, 980],
    [908, 984],
    [456, 984],
    [444, 975],
    [0, 462],
  ],
  [
    [0, 1460],
    [456, 980],
    [456, 1600],
    [0, 1600],
  ],
  [
    [1104, 0],
    [1560, 0],
    [1560, 621],
    [1104, 621],
  ],
  [
    [648, 615],
    [1104, 615],
    [1560, 1140],
    [1560, 1600],
    [1104, 1600],
    [1104, 1144],
  ],
];
export function createIntroLogo(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    stencil: false,
    powerPreference: "high-performance",
  });
  // The intro shares the frame with an animated full-screen SVG mask, so the
  // buffer stays modest: fill rate, not geometry, is what drops frames here.
  const cores = navigator.hardwareConcurrency || 8;
  const cap = innerWidth < 700 || cores <= 4 ? 1 : 1.35;
  renderer.setPixelRatio(Math.min(devicePixelRatio, cap));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    35,
    innerWidth / innerHeight,
    0.1,
    40,
  );
  camera.position.z = 8;
  scene.add(new THREE.HemisphereLight(0x8cf43a, 0x000000, 2));
  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8cf43a, 5);
  rim.position.set(4, 1, -3);
  scene.add(rim);
  const face = new THREE.MeshStandardMaterial({
    color: 0x080c06,
    roughness: 0.3,
    metalness: 0.45,
  });
  const edge = new THREE.MeshStandardMaterial({
    color: 0x56c506,
    roughness: 0.26,
    metalness: 0.5,
  });
  const group = new THREE.Group();
  scene.add(group);
  contours.forEach((points) => {
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) => {
      const px = (x - 780) / 560,
        py = (800 - y) / 560;
      i ? shape.lineTo(px, py) : shape.moveTo(px, py);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      bevelSegments: 3,
      steps: 1,
    });
    geometry.translate(0, 0, -0.21);
    group.add(new THREE.Mesh(geometry, [face, edge]));
  });
  const resize = () => {
    // Render just the sculpture's bounds rather than a transparent full screen.
    const side = Math.min(innerWidth * 0.9, innerHeight * 0.78, 640);
    host.style.inset = "auto";
    host.style.left = "50%";
    host.style.top = "50%";
    host.style.width = `${side}px`;
    host.style.height = `${side}px`;
    host.style.transform = "translate(-50%,-50%)";
    renderer.setSize(side, side);
    camera.aspect = 1;
    camera.position.z = 6;
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener("resize", resize);
  let px = 0,
    py = 0;
  const pointer = (e: PointerEvent) => {
    px = (e.clientX / innerWidth) * 2 - 1;
    py = (e.clientY / innerHeight) * 2 - 1;
  };
  host.addEventListener("pointermove", pointer);
  let lastOpacity = "";
  let smoothX = 0,
    smoothY = 0;
  return {
    // Returns true once the mark has faded out and no longer needs drawing.
    render(t: number, reduced: boolean) {
      const fade = reduced ? 0 : THREE.MathUtils.smoothstep(t, 1.95, 2.2);
      if (fade === 1) {
        // Fully faded: stop issuing draw calls, but leave the node in place so
        // the mark keeps the same box until the intro tears down.
        if (lastOpacity !== "0") {
          host.style.opacity = "0";
          lastOpacity = "0";
        }
        return true;
      }
      const assemble = reduced
        ? 1
        : THREE.MathUtils.smootherstep(t, 0.05, 0.95);
      const flatten = THREE.MathUtils.smootherstep(t, 1.05, 2.0);
      smoothX = THREE.MathUtils.lerp(smoothX, px, 0.075);
      smoothY = THREE.MathUtils.lerp(smoothY, py, 0.075);
      const projectedHeight =
        (1600 /
          560 /
          (2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * camera.position.z)) *
        host.clientHeight;
      const portalScale =
        (320 * Math.min(innerWidth / 700, 1) * 0.68) / projectedHeight;
      group.scale.setScalar(
        reduced
          ? 0.82
          : THREE.MathUtils.lerp(0.14 + 0.86 * assemble, portalScale, flatten),
      );
      group.rotation.set(
        reduced ? -0.12 : (-0.23 + smoothY * 0.08) * (1 - flatten),
        reduced
          ? -0.3
          : (-0.64 + smoothX * 0.18 + Math.sin(t * 0.7) * 0.1) * (1 - flatten),
        reduced ? 0 : -0.07 * (1 - flatten),
      );
      group.children.forEach((piece, i) => {
        piece.position.z = (1 - assemble) * (i % 2 ? 1 : -1) * 1.4;
        piece.position.x = (1 - assemble) * (i < 2 ? -0.28 : 0.28);
      });
      const opacity = (1 - fade).toFixed(3);
      if (opacity !== lastOpacity) {
        host.style.opacity = opacity;
        lastOpacity = opacity;
      }
      renderer.render(scene, camera);
      return false;
    },
    dispose() {
      removeEventListener("resize", resize);
      host.removeEventListener("pointermove", pointer);
      group.children.forEach((piece) =>
        (piece as THREE.Mesh).geometry.dispose(),
      );
      face.dispose();
      edge.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
