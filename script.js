// ================= SCENE =================
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 6, 50);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.z = 15;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ================= PARTICLES =================
const COUNT = 6000;
const geometry = new THREE.BufferGeometry();

const positions = new Float32Array(COUNT * 3);
const colors = new Float32Array(COUNT * 3);
const color = new THREE.Color();

const templates = ["heart", "flower", "saturn", "firework", "sphere"];
let templateIndex = 0;

function applyTemplate(type) {
  for (let i = 0; i < COUNT; i++) {
    let x = 0, y = 0, z = 0;

    if (type === "heart") {
      const t = Math.random() * Math.PI * 2;
      x = 16 * Math.pow(Math.sin(t), 3);
      y =
        13 * Math.cos(t) -
        5 * Math.cos(2 * t) -
        2 * Math.cos(3 * t) -
        Math.cos(4 * t);
      z = (Math.random() - 0.5) * 4;
    } 
    else if (type === "flower") {
      const t = Math.random() * Math.PI * 2;
      const r = Math.sin(5 * t) * 4;
      x = r * Math.cos(t);
      y = r * Math.sin(t);
      z = (Math.random() - 0.5) * 3;
    } 
    else if (type === "saturn") {
      const a = Math.random() * Math.PI * 2;
      const r = 5 + Math.random();
      x = r * Math.cos(a);
      z = r * Math.sin(a);
      y = (Math.random() - 0.5) * 0.4;
    } 
    else if (type === "firework") {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * 5;
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.cos(phi);
      z = r * Math.sin(phi) * Math.sin(theta);
    } 
    else {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      x = 4 * Math.sin(phi) * Math.cos(theta);
      y = 4 * Math.cos(phi);
      z = 4 * Math.sin(phi) * Math.sin(theta);
    }

    positions[i * 3] = x * 0.15;
    positions[i * 3 + 1] = y * 0.15;
    positions[i * 3 + 2] = z * 0.15;

    color.setHSL(Math.random(), 1, 0.6);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

applyTemplate("heart");

const material = new THREE.PointsMaterial({
  size: 0.06,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// ================= HAND TRACKING =================
const video = document.getElementById("video");

const hands = new Hands({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

let targetScale = 1;
let targetHue = 0.5;

hands.onResults((results) => {
  if (!results.multiHandLandmarks?.length) return;

  const lm = results.multiHandLandmarks[0];

  // Scale
  const dx = lm[4].x - lm[8].x;
  const dy = lm[4].y - lm[8].y;
  targetScale = THREE.MathUtils.clamp(
    Math.sqrt(dx * dx + dy * dy) * 10,
    0.6,
    3
  );

  // Color
  targetHue = lm[0].x;

  // Fingers → template
  let fingers = 0;
  if (lm[8].y < lm[6].y) fingers++;
  if (lm[12].y < lm[10].y) fingers++;
  if (lm[16].y < lm[14].y) fingers++;
  if (lm[20].y < lm[18].y) fingers++;

  const idx = fingers % templates.length;
  if (idx !== templateIndex) {
    templateIndex = idx;
    applyTemplate(templates[idx]);
  }
});

new Camera(video, {
  onFrame: async () => await hands.send({ image: video }),
  width: 640,
  height: 480,
}).start();

// ================= ANIMATION =================
function animate() {
  requestAnimationFrame(animate);

  particles.rotation.y += 0.002;
  particles.rotation.x += 0.001;
  particles.scale.lerp(
    new THREE.Vector3(targetScale, targetScale, targetScale),
    0.1
  );

  const attr = geometry.attributes.color;
  for (let i = 0; i < COUNT; i++) {
    color.setHSL(targetHue, 1, 0.6);
    attr.array[i * 3] += (color.r - attr.array[i * 3]) * 0.02;
    attr.array[i * 3 + 1] += (color.g - attr.array[i * 3 + 1]) * 0.02;
    attr.array[i * 3 + 2] += (color.b - attr.array[i * 3 + 2]) * 0.02;
  }
  attr.needsUpdate = true;

  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
