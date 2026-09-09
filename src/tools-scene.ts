import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import fontData from "./fonts/helvetiker_bold.typeface.json";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Set a model URL here to replace a procedural module with a Blender export.
// Models should face +Z and be centred in a roughly 1.7-unit square.
export const toolModels: {
  name: string;
  label: string;
  modelUrl?: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}[] = [
  {
    name: "After Effects",
    label: "Ae",
    position: [0.55, 1.05, 0.55],
    rotation: [0.18, -0.35, -0.16],
    scale: 0.85,
  },
  {
    name: "Premiere Pro",
    label: "Pr",
    position: [2.65, -0.85, 0.7],
    rotation: [-0.18, -0.38, 0.15],
    scale: 0.82,
  },
  {
    name: "Visual Studio Code",
    label: "code",
    position: [-1.7, -0.55, 0.65],
    rotation: [0.16, 0.38, -0.2],
    scale: 0.88,
  },
  {
    name: "Blender",
    label: "blender",
    position: [-2.0, 1.85, -0.7],
    rotation: [0.3, 0.25, 0.14],
    scale: 0.72,
  },
  {
    name: "Photoshop",
    label: "Ps",
    position: [0.1, -2.45, 0.15],
    rotation: [-0.12, 0.28, -0.12],
    scale: 0.86,
  },
  {
    name: "DaVinci Resolve",
    label: "resolve",
    position: [2.9, 2.05, -0.75],
    rotation: [0.18, -0.32, 0.17],
    scale: 0.77,
  },
  {
    name: "Illustrator",
    label: "Ai",
    position: [0.25, 3.15, -0.9],
    rotation: [0.22, 0.3, -0.1],
    scale: 0.72,
  },
];
export async function createToolsScene(
  host: HTMLElement,
  motion: MediaQueryList,
) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
  } catch {
    host.dataset.fallback = "true";
    return () => {};
  }
  renderer.setPixelRatio(
    Math.min(devicePixelRatio, innerWidth < 700 ? 1.1 : 1.35),
  );
  renderer.setClearColor(0x55a630, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  host.append(renderer.domElement);
  const fallback = host.querySelector<HTMLElement>(".scene-fallback")!;
  fallback.hidden = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 60);
  camera.position.set(0, 0, 11.8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.AmbientLight(0x8fd45f, 0.4));
  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fd45f, 3);
  rim.position.set(5, 2, -2);
  scene.add(rim);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.3,
    metalness: 0.55,
  });
  const sideMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.34,
    metalness: 0.4,
  });
  const symbolMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.25,
    metalness: 0.3,
  });
  // The tools take their colours from the stylesheet, so one palette drives both
  // the page and the scene, and a theme switch repaints the materials in place.
  const themed: [THREE.MeshStandardMaterial, string, number][] = [
    [bodyMaterial, "--tool-body", 0x0f1e09],
    [sideMaterial, "--tool-side", 0x2f6b1e],
    [symbolMaterial, "--tool-symbol", 0x55a630],
  ];
  const readTheme = () => {
    const style = getComputedStyle(document.documentElement);
    for (const [material, token, fallback] of themed) {
      const value = style.getPropertyValue(token).trim();
      if (value) material.color.set(value);
      else material.color.setHex(fallback);
    }
  };
  readTheme();
  const themeWatcher = new MutationObserver(readTheme);
  themeWatcher.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const group = new THREE.Group();
  scene.add(group);
  const font = new FontLoader().parse(fontData);
  const modules: THREE.Group[] = [];
  let disposed = false;
  const blockGeometry = new RoundedBoxGeometry(1.8, 1.8, 0.36, 4, 0.13);
  const faceGeometry = new RoundedBoxGeometry(1.63, 1.63, 0.06, 3, 0.095);
  const shapeMesh = (points: number[][]) => {
    const s = new THREE.Shape();
    points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    return new THREE.Mesh(
      new THREE.ExtrudeGeometry(s, {
        depth: 0.055,
        bevelEnabled: true,
        bevelSize: 0.012,
        bevelThickness: 0.01,
        bevelSegments: 2,
        steps: 1,
      }),
      symbolMaterial,
    );
  };
  for (const spec of toolModels) {
    const module = new THREE.Group();
    module.name = spec.name;
    module.position.set(...spec.position);
    module.rotation.set(...spec.rotation);
    module.scale.setScalar(spec.scale);
    group.add(module);
    modules.push(module);
    const procedural = new THREE.Group();
    module.add(procedural);
    procedural.add(new THREE.Mesh(blockGeometry, sideMaterial));
    const face = new THREE.Mesh(faceGeometry, bodyMaterial);
    face.position.z = 0.195;
    procedural.add(face);
    const symbol = new THREE.Group();
    symbol.position.z = 0.24;
    procedural.add(symbol);
    if (["Ae", "Pr", "Ps", "Ai"].includes(spec.label)) {
      const geo = new TextGeometry(spec.label, {
        font,
        size: 0.64,
        depth: 0.045,
        curveSegments: 6,
        bevelEnabled: true,
        bevelThickness: 0.009,
        bevelSize: 0.007,
        bevelSegments: 2,
      });
      geo.computeBoundingBox();
      const box = geo.boundingBox!;
      geo.translate(
        -(box.max.x + box.min.x) / 2,
        -(box.max.y + box.min.y) / 2,
        0,
      );
      symbol.add(new THREE.Mesh(geo, symbolMaterial));
    } else if (spec.label === "code") {
      symbol.add(
        shapeMesh([
          [-0.6, 0.28],
          [-0.42, 0.42],
          [0.35, -0.25],
          [0.35, 0.63],
          [0.65, 0.49],
          [0.65, -0.5],
          [0.35, -0.63],
          [-0.42, 0.08],
          [-0.6, 0.22],
        ]),
      );
      symbol.add(
        shapeMesh([
          [-0.6, -0.28],
          [-0.42, -0.42],
          [0.35, 0.25],
          [0.35, 0.63],
          [-0.6, -0.22],
        ]),
      );
    } else if (spec.label === "resolve") {
      const petal = new THREE.Shape();
      petal.moveTo(-0.09, 0.1);
      petal.bezierCurveTo(-0.3, 0.23, -0.36, 0.49, -0.2, 0.62);
      petal.bezierCurveTo(-0.06, 0.74, 0.17, 0.68, 0.23, 0.52);
      petal.bezierCurveTo(0.3, 0.34, 0.15, 0.19, 0.09, 0.1);
      petal.quadraticCurveTo(0, 0.03, -0.09, 0.1);
      const geometry = new THREE.ExtrudeGeometry(petal, {
        depth: 0.065,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 3,
        curveSegments: 12,
        steps: 1,
      });
      for (let i = 0; i < 3; i++) {
        const lobe = new THREE.Mesh(geometry, symbolMaterial);
        lobe.rotation.z = (i * Math.PI * 2) / 3;
        symbol.add(lobe);
      }
    } else {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.105, 10, 40),
        symbolMaterial,
      );
      ring.scale.y = 0.8;
      ring.position.set(0.1, -0.08, 0.035);
      symbol.add(ring);
      symbol.add(
        shapeMesh([
          [-0.12, 0.2],
          [-0.66, 0.21],
          [-0.73, 0.07],
          [-0.18, 0.04],
        ]),
      );
      symbol.add(
        shapeMesh([
          [-0.03, 0.19],
          [-0.47, 0.55],
          [-0.32, 0.64],
          [0.36, 0.25],
        ]),
      );
      symbol.add(
        shapeMesh([
          [-0.13, 0.1],
          [-0.66, -0.3],
          [-0.7, -0.12],
          [-0.2, 0.29],
        ]),
      );
      const center = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.045, 32),
        symbolMaterial,
      );
      center.rotation.x = Math.PI / 2;
      center.position.set(0.1, -0.08, 0.06);
      symbol.add(center);
    }
    if (spec.modelUrl) {
      import("three/addons/loaders/GLTFLoader.js").then(({ GLTFLoader }) =>
        new GLTFLoader().load(
          spec.modelUrl!,
          (gltf) => {
            if (disposed) return;
            module.remove(procedural);
            module.add(gltf.scene);
          },
          undefined,
          () => {},
        ),
      );
    }
  }
  let visible = false;
  let pointerX = 0,
    pointerY = 0;
  let raf = 0;
  let phase = 0;
  let previous = 0;
  const mobilePositions: [number, number, number][] = [
    [-1.05, 2.5, 0.2],
    [1.05, 0.8, 0.3],
    [-1.05, -0.8, 0.4],
    [1.05, 2.6, -0.5],
    [-1.05, -2.55, 0.1],
    [1.05, -2.5, -0.35],
    [-1.05, 0.85, -0.25],
  ];
  let compact = host.clientWidth < 500;
  let selected = -1,
    dragX = 0,
    dragY = 0;
  // Each tool keeps a displacement the visitor gave it by dragging, applied
  // on top of its resting position so the idle float still works.
  const offsets = toolModels.map(() => ({ x: 0, y: 0 }));
  let dragIndex = -1;
  let visHalfW = 4.05,
    visHalfH = 4.05,
    spreadX = 1;
  const markMoved = () => {
    host.dataset.moved = String(
      offsets.filter((o) => o.x !== 0 || o.y !== 0).length,
    );
  };
  const render = (now: number) => {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    if (!motion.matches) phase += dt;
    modules.forEach((module, i) => {
      const spec = toolModels[i];
      const position = compact ? mobilePositions[i] : spec.position;
      module.position.x = position[0] * spreadX + offsets[i].x;
      module.position.y =
        position[1] +
        offsets[i].y +
        (motion.matches ? 0 : Math.sin(phase * 0.55 + i * 1.7) * 0.085);
      module.rotation.y =
        spec.rotation[1] +
        (motion.matches ? 0 : Math.sin(phase * 0.3 + i) * 0.045);
      const focused = selected === i;
      module.position.z = THREE.MathUtils.lerp(
        module.position.z,
        position[2] + (focused ? 0.55 : 0),
        motion.matches ? 1 : 0.1,
      );
      module.scale.setScalar(
        THREE.MathUtils.lerp(
          module.scale.x,
          (compact ? 0.72 : spec.scale) * (focused ? 1.12 : 1),
          motion.matches ? 1 : 0.1,
        ),
      );
    });
    const rect = host.getBoundingClientRect();
    const scroll = motion.matches
      ? 0
      : Math.max(
          -1,
          Math.min(
            1,
            (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight,
          ),
        );
    group.rotation.y = THREE.MathUtils.lerp(
      group.rotation.y,
      dragX + (motion.matches ? 0 : pointerX * 0.16),
      motion.matches ? 1 : 0.045,
    );
    group.rotation.x = THREE.MathUtils.lerp(
      group.rotation.x,
      dragY + (motion.matches ? 0 : pointerY * 0.08 + scroll * 0.1),
      motion.matches ? 1 : 0.045,
    );
    group.position.y = scroll * 0.18;
    renderer.render(scene, camera);
    if (!motion.matches) raf = requestAnimationFrame(render);
  };
  const request = () => {
    if (!raf && visible && !document.hidden) {
      previous = performance.now();
      raf = requestAnimationFrame(render);
    }
  };
  const resize = () => {
    const width = host.clientWidth,
      height = host.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    compact = width < 500;
    const halfHeight = compact ? 3.65 : 4.05;
    const halfWidth = compact ? 2.2 : 4.05;
    camera.position.z =
      Math.max(halfHeight, halfWidth / camera.aspect) /
        Math.tan(THREE.MathUtils.degToRad(16.5)) +
      1.3;
    camera.updateProjectionMatrix();
    visHalfH = Math.tan(THREE.MathUtils.degToRad(16.5)) * camera.position.z;
    visHalfW = visHalfH * camera.aspect;
    // The scene now spans the whole section, so use the extra width.
    spreadX = compact ? 1 : Math.max(1, Math.min(2.4, visHalfW / 4.2));
    request();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) request();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    { threshold: 0.02 },
  );
  observer.observe(host);
  const abort = new AbortController();
  const signal = abort.signal;
  const status = document.querySelector<HTMLElement>(".tool-status")!;
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-tool]"),
  ];
  const select = (index: number) => {
    selected = index;
    buttons.forEach((button, i) =>
      button.setAttribute("aria-pressed", String(i === index)),
    );
    status.textContent =
      index < 0 ? "The creative toolkit" : toolModels[index].name;
    host.dataset.selected = String(index);
    request();
  };
  buttons.forEach((button, i) =>
    button.addEventListener("click", () => select(selected === i ? -1 : i), {
      signal,
    }),
  );
  document.querySelector("[data-reset-tools]")!.addEventListener(
    "click",
    () => {
      dragX = 0;
      dragY = 0;
      host.dataset.rotation = "0.000";
      offsets.forEach((o) => {
        o.x = 0;
        o.y = 0;
      });
      markMoved();
      select(-1);
      request();
    },
    { signal },
  );
  const toolAt = (clientX: number, clientY: number) => {
    const bounds = host.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((clientX - bounds.left) / bounds.width) * 2 - 1,
        (-(clientY - bounds.top) / bounds.height) * 2 + 1,
      ),
      camera,
    );
    const hit = ray.intersectObjects(modules, true)[0];
    if (!hit) return -1;
    let target: THREE.Object3D = hit.object;
    while (target.parent && target.parent !== group) target = target.parent;
    return modules.indexOf(target as THREE.Group);
  };
  let pointerId: number | null = null,
    startX = 0,
    lastX = 0,
    lastY = 0,
    moved = false;
  host.addEventListener(
    "pointerdown",
    (e) => {
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      lastY = e.clientY;
      moved = false;
      dragIndex = toolAt(e.clientX, e.clientY);
      host.dataset.grabbing = dragIndex >= 0 ? String(dragIndex) : "";
      host.setPointerCapture(e.pointerId);
    },
    { signal },
  );
  host.addEventListener(
    "pointermove",
    (e) => {
      if (pointerId !== e.pointerId) return;
      const dx = e.clientX - lastX;
      if (dragIndex >= 0) {
        // Screen pixels to world units on the plane this tool sits on, so it
        // tracks the finger exactly, then clamped to stay inside the section.
        const spec = toolModels[dragIndex];
        const base = compact ? mobilePositions[dragIndex] : spec.position;
        const depth = camera.position.z - base[2];
        const perPixel =
          (2 * Math.tan(THREE.MathUtils.degToRad(16.5)) * depth) /
          host.clientHeight;
        const offset = offsets[dragIndex];
        const restX = base[0] * spreadX;
        const margin = 1.05;
        offset.x = THREE.MathUtils.clamp(
          offset.x + dx * perPixel,
          -visHalfW + margin - restX,
          visHalfW - margin - restX,
        );
        offset.y = THREE.MathUtils.clamp(
          offset.y - (e.clientY - lastY) * perPixel,
          -visHalfH + margin - base[1],
          visHalfH - margin - base[1],
        );
        lastX = e.clientX;
        lastY = e.clientY;
        moved ||= Math.abs(e.clientX - startX) > 5;
        markMoved();
        request();
        return;
      }
      dragX = THREE.MathUtils.clamp(dragX + dx * 0.006, -0.8, 0.8);
      if (e.pointerType === "mouse")
        dragY = THREE.MathUtils.clamp(
          dragY + (e.clientY - lastY) * 0.004,
          -0.35,
          0.35,
        );
      lastX = e.clientX;
      lastY = e.clientY;
      moved ||= Math.abs(e.clientX - startX) > 5;
      host.dataset.rotation = dragX.toFixed(3);
      request();
    },
    { signal },
  );
  host.addEventListener(
    "pointerup",
    (e) => {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      dragIndex = -1;
      host.dataset.grabbing = "";
      if (!moved) {
        const bounds = host.getBoundingClientRect();
        const ray = new THREE.Raycaster();
        ray.setFromCamera(
          new THREE.Vector2(
            ((e.clientX - bounds.left) / bounds.width) * 2 - 1,
            (-(e.clientY - bounds.top) / bounds.height) * 2 + 1,
          ),
          camera,
        );
        const hit = ray.intersectObjects(modules, true)[0];
        if (hit) {
          let target: THREE.Object3D = hit.object;
          while (target.parent && target.parent !== group)
            target = target.parent;
          const index = modules.indexOf(target as THREE.Group);
          if (index >= 0) select(index === selected ? -1 : index);
        }
      }
    },
    { signal },
  );
  host.addEventListener(
    "pointercancel",
    () => {
      pointerId = null;
    },
    { signal },
  );
  host.addEventListener(
    "keydown",
    (e) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(
          e.key,
        )
      )
        return;
      e.preventDefault();
      if (e.key === "Home") {
        dragX = dragY = 0;
        select(-1);
      } else if (e.key === "ArrowLeft") dragX -= 0.12;
      else if (e.key === "ArrowRight") dragX += 0.12;
      else if (e.key === "ArrowUp") dragY -= 0.08;
      else dragY += 0.08;
      dragX = THREE.MathUtils.clamp(dragX, -0.8, 0.8);
      dragY = THREE.MathUtils.clamp(dragY, -0.35, 0.35);
      host.dataset.rotation = dragX.toFixed(3);
      request();
    },
    { signal },
  );
  addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "mouse" && !motion.matches) {
        pointerX = (e.clientX / innerWidth) * 2 - 1;
        pointerY = (e.clientY / innerHeight) * 2 - 1;
      }
    },
    { passive: true, signal },
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else request();
    },
    { signal },
  );
  motion.addEventListener("change", request, { signal });
  renderer.domElement.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
      renderer.domElement.hidden = true;
      fallback.hidden = false;
    },
    { signal },
  );
  return () => {
    disposed = true;
    abort.abort();
    cancelAnimationFrame(raf);
    observer.disconnect();
    resizeObserver.disconnect();
    themeWatcher.disconnect();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        materials.forEach((m) => m.dispose());
      }
    });
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
