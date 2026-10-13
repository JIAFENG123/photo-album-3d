import * as THREE from 'three';

export interface PageMeshOptions {
  width: number;
  height: number;
  pageIndex: number;
  totalPages: number;
  pageThickness?: number;
  frontTexture: THREE.Texture;
  backTexture: THREE.Texture;
  isCover?: boolean; // Covers have stiffer curvature
}

export class PageMesh extends THREE.Group {
  public pageIndex: number;
  public totalPages: number;
  public progress: number = 0; // 0 = flat on right, 1 = flat on left
  public tilt: number = 0; // Corner drag tilt
  public isCover: boolean;

  public width: number;
  public height: number;

  private frontMesh: THREE.Mesh;
  private backMesh: THREE.Mesh;

  private basePositions: Float32Array;
  private frontGeom: THREE.BufferGeometry;
  private backGeom: THREE.BufferGeometry;

  private stackZRight: number;
  private stackZLeft: number;

  constructor(options: PageMeshOptions) {
    super();

    const {
      width,
      height,
      pageIndex,
      totalPages,
      pageThickness = 0.0035,
      frontTexture,
      backTexture,
      isCover = false
    } = options;

    this.width = width;
    this.height = height;
    this.pageIndex = pageIndex;
    this.totalPages = totalPages;
    this.isCover = isCover;

    // Physical stacking height
    const baseElevation = 0.004;
    this.stackZRight = baseElevation + (totalPages - 1 - pageIndex) * pageThickness;
    this.stackZLeft = baseElevation + pageIndex * pageThickness;

    // High density mesh for silky curl
    const segmentsX = 48;
    const segmentsY = 16;
    this.frontGeom = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
    this.frontGeom.translate(width / 2, 0, 0);

    this.basePositions = this.frontGeom.attributes.position.array.slice() as Float32Array;

    // Back geometry with horizontally flipped UVs
    this.backGeom = this.frontGeom.clone();
    const backUvs = this.backGeom.attributes.uv;
    for (let i = 0; i < backUvs.count; i++) {
      backUvs.setX(i, 1.0 - backUvs.getX(i));
    }
    backUvs.needsUpdate = true;

    // Materials: Covers have leather roughness, inner pages have semi-matte photo paper feel
    const frontMat = new THREE.MeshPhysicalMaterial({
      map: frontTexture,
      roughness: isCover ? 0.65 : 0.35,
      metalness: isCover ? 0.08 : 0.02,
      clearcoat: isCover ? 0.15 : 0.3,
      clearcoatRoughness: isCover ? 0.4 : 0.2,
      side: THREE.FrontSide
    });

    const backMat = new THREE.MeshPhysicalMaterial({
      map: backTexture,
      roughness: isCover ? 0.65 : 0.35,
      metalness: isCover ? 0.08 : 0.02,
      clearcoat: isCover ? 0.15 : 0.3,
      clearcoatRoughness: isCover ? 0.4 : 0.2,
      side: THREE.BackSide
    });

    this.frontMesh = new THREE.Mesh(this.frontGeom, frontMat);
    this.frontMesh.castShadow = true;
    this.frontMesh.receiveShadow = true;
    this.add(this.frontMesh);

    this.backMesh = new THREE.Mesh(this.backGeom, backMat);
    this.backMesh.castShadow = true;
    this.backMesh.receiveShadow = true;
    this.add(this.backMesh);

    this.setProgress(0.0, 0.0);
  }

  /**
   * Sets page turn progress (0.0 to 1.0) with isometric natural cylindrical curling
   */
  public setProgress(progress: number, tilt: number = this.tilt) {
    this.progress = THREE.MathUtils.clamp(progress, 0, 1);
    this.tilt = THREE.MathUtils.clamp(tilt, -0.45, 0.45);

    const p = this.progress;
    const tiltVal = this.tilt;
    const PI = Math.PI;

    // Base stacking elevation
    const stackZ = THREE.MathUtils.lerp(this.stackZRight, this.stackZLeft, p);

    // Rotation angle around spine Y axis
    const angle = p * PI;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Curvature intensity: covers are slightly stiffer (0.28), inner pages more flexible (0.42)
    const curl = Math.sin(p * PI);
    const maxKappa = this.isCover ? 0.26 : 0.42;
    const baseKappa = curl * maxKappa;

    const frontPos = this.frontGeom.attributes.position;
    const backPos = this.backGeom.attributes.position;
    const base = this.basePositions;
    const count = frontPos.count;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const x = base[idx];
      const y = base[idx + 1];

      if (x <= 0.0001) {
        frontPos.setXYZ(i, 0, y, stackZ);
        backPos.setXYZ(i, 0, y, stackZ);
        continue;
      }

      const vNorm = y / (this.height * 0.5);
      const kappa = baseKappa * (1.0 + tiltVal * vNorm * 0.35);

      let px: number, pz: number;
      if (Math.abs(kappa) < 0.0001) {
        px = x;
        pz = 0;
      } else {
        const R = 1.0 / kappa;
        const arcAngle = x * kappa;
        px = R * Math.sin(arcAngle);
        pz = R * (1.0 - Math.cos(arcAngle));
      }

      // Rotate around spine Y axis
      const finalX = px * cosA - pz * sinA;
      const finalZ = px * sinA + pz * cosA + stackZ;

      frontPos.setXYZ(i, finalX, y, finalZ);
      backPos.setXYZ(i, finalX, y, finalZ);
    }

    frontPos.needsUpdate = true;
    backPos.needsUpdate = true;

    this.frontGeom.computeVertexNormals();
    this.backGeom.computeVertexNormals();
  }
}
