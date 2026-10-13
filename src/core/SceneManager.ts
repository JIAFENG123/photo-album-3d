import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  private container: HTMLElement;
  private animFrameId: number | null = null;
  private onRenderCallbacks: Array<(delta: number) => void> = [];
  private clock: THREE.Clock;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Pure Dark Minimalist Studio Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0c);

    // 2. Camera with balanced perspective
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 50);
    this.camera.position.set(0, 3.8, 4.8);
    this.camera.lookAt(0, 0, 0);

    // 3. WebGLRenderer with Soft PCF Shadows & ACES Filmic Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);

    // 4. OrbitControls: Full 3D rotation, damping & smooth panning
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 12.0;
    this.controls.target.set(0, 0, 0);

    // Standard intuitive controls:
    // Left click rotates camera (when not dragging pages)
    // Right click pans camera
    // Wheel zooms
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    // 5. Studio Key, Ambient, and Rim Lighting
    this.setupLighting();

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private setupLighting() {
    // Warm Key Light (Directional, high resolution soft shadows)
    const keyLight = new THREE.DirectionalLight(0xfff6ec, 2.4);
    keyLight.position.set(3.5, 6.5, 4.0);
    keyLight.castShadow = true;

    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -4.5;
    keyLight.shadow.camera.right = 4.5;
    keyLight.shadow.camera.top = 4.5;
    keyLight.shadow.camera.bottom = -4.5;
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.radius = 2.4;

    this.scene.add(keyLight);

    // Soft Ambient Fill Light
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.6);
    this.scene.add(ambientLight);

    // Subtle Cool Rim / Edge Light from the back
    const rimLight = new THREE.DirectionalLight(0x9ab8dc, 0.8);
    rimLight.position.set(-4.0, 3.5, -3.5);
    this.scene.add(rimLight);
  }

  private onResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  public addRenderCallback(cb: (delta: number) => void) {
    this.onRenderCallbacks.push(cb);
  }

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();

    this.controls.update();

    for (const cb of this.onRenderCallbacks) {
      cb(delta);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
