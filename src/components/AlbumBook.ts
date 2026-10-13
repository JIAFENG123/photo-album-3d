import * as THREE from 'three';
import gsap from 'gsap';
import { PageMesh } from './PageMesh.ts';
import { TextureGenerator, PageContent } from '../core/TextureGenerator.ts';

export interface AlbumBookOptions {
  pageWidth?: number;
  pageHeight?: number;
  leatherTextures: {
    frontMap: THREE.CanvasTexture;
    backMap: THREE.CanvasTexture;
    liningMap: THREE.CanvasTexture;
    bumpMap: THREE.CanvasTexture;
  };
}

export class AlbumBook extends THREE.Group {
  public pageWidth: number;
  public pageHeight: number;
  public sheets: PageMesh[] = []; // All physical sheets: [0: FrontCover, 1..N: InnerPhotos, Last: BackCover]
  public currentTurningSheetIndex: number = 0; // Index of the sheet currently resting on the right ready to turn
  public isAnimating: boolean = false;

  private spineMesh!: THREE.Mesh;

  constructor(options: AlbumBookOptions) {
    super();

    this.pageWidth = options.pageWidth ?? 2.4;
    this.pageHeight = options.pageHeight ?? 3.4;

    this.createBookSheets(options.leatherTextures);

    // Natural 3D reading angle tilted slightly toward camera
    this.rotation.x = -Math.PI / 2 + 0.12;
    this.position.set(0, 0, 0);
  }

  private createBookSheets(leatherTextures: {
    frontMap: THREE.CanvasTexture;
    backMap: THREE.CanvasTexture;
    liningMap: THREE.CanvasTexture;
    bumpMap: THREE.CanvasTexture;
  }) {
    // 5 Inner photo spreads = 5 physical photo sheets
    // + 1 Front cover sheet (index 0)
    // + 1 Back cover sheet (index 6)
    // Total physical sheets = 7
    const photoContents: PageContent[] = [
      {
        title: 'Alpine Sunrise',
        subtitle: 'First light caressing the jagged limestone peaks',
        date: 'Oct 2024',
        location: 'Swiss Alps, 2450m',
        theme: 'mountain'
      },
      {
        title: 'Mediterranean Dusk',
        subtitle: 'Gentle waves rolling in quiet harmony beneath twilight cliffs',
        date: 'Aug 2024',
        location: 'Positano Coast',
        theme: 'sea'
      },
      {
        title: 'Modern Architecture',
        subtitle: 'Where light sculpts raw geometry into timeless spatial poetry',
        date: 'May 2024',
        location: 'Modern Art Space, Tokyo',
        theme: 'architecture'
      },
      {
        title: 'Arashiyama Forest',
        subtitle: 'Golden leaves whispering secrets along the silent moss path',
        date: 'Nov 2024',
        location: 'Kyoto Bamboo Grove',
        theme: 'forest'
      },
      {
        title: 'Misty Horizon',
        subtitle: 'Endless tranquil tide where water dissolves into pale sky',
        date: 'Jul 2024',
        location: 'Nordic Coast, Lofoten',
        theme: 'minimal'
      }
    ];

    const totalSheets = 1 + photoContents.length + 1; // 7 sheets

    // --- Sheet 0: Front Cover Sheet ---
    // Front: Leather Front Cover with gold title ("PHOTO ALBUM")
    // Back: Archival Lining (inside left cover when opened)
    const frontCoverSheet = new PageMesh({
      width: this.pageWidth,
      height: this.pageHeight,
      pageIndex: 0,
      totalPages: totalSheets,
      pageThickness: 0.004,
      frontTexture: leatherTextures.frontMap,
      backTexture: leatherTextures.liningMap,
      isCover: true
    });
    this.sheets.push(frontCoverSheet);
    this.add(frontCoverSheet);

    // --- Sheets 1 .. 5: Inner Photo Sheets ---
    for (let i = 0; i < photoContents.length; i++) {
      const frontContent = photoContents[i];
      const backContent = photoContents[(i + 1) % photoContents.length];

      const frontTexture = TextureGenerator.createPhotoPageTexture(frontContent, i * 2 + 1, false);
      const backTexture = TextureGenerator.createPhotoPageTexture(backContent, i * 2 + 2, true);

      const innerSheet = new PageMesh({
        width: this.pageWidth,
        height: this.pageHeight,
        pageIndex: i + 1,
        totalPages: totalSheets,
        pageThickness: 0.003,
        frontTexture,
        backTexture,
        isCover: false
      });
      this.sheets.push(innerSheet);
      this.add(innerSheet);
    }

    // --- Sheet 6: Back Cover Sheet ---
    // Front: Inside lining of back cover
    // Back: Plain Leather Back Cover
    const backCoverSheet = new PageMesh({
      width: this.pageWidth,
      height: this.pageHeight,
      pageIndex: totalSheets - 1,
      totalPages: totalSheets,
      pageThickness: 0.004,
      frontTexture: leatherTextures.liningMap,
      backTexture: leatherTextures.backMap,
      isCover: true
    });
    this.sheets.push(backCoverSheet);
    this.add(backCoverSheet);

    // Rounded Spine Binding at x = 0
    const coverH = this.pageHeight + 0.14;
    const spineRadius = 0.055;
    const spineGeom = new THREE.CylinderGeometry(spineRadius, spineRadius, coverH, 24);
    const spineMat = new THREE.MeshPhysicalMaterial({
      map: leatherTextures.backMap,
      bumpMap: leatherTextures.bumpMap,
      bumpScale: 0.008,
      roughness: 0.65,
      metalness: 0.08
    });
    this.spineMesh = new THREE.Mesh(spineGeom, spineMat);
    this.spineMesh.position.set(0, 0, -0.015);
    this.spineMesh.castShadow = true;
    this.spineMesh.receiveShadow = true;
    this.add(this.spineMesh);

    // Initial state: Start on Spread 1 (Front cover is open, displaying Photo 1)
    // Front cover (Sheet 0) is turned to left (progress = 1.0)
    // All other sheets (1..6) are on the right (progress = 0.0)
    this.sheets[0].setProgress(1.0, 0);
    this.currentTurningSheetIndex = 1;
  }

  /**
   * Turns the next page sheet forward (from right to left)
   */
  public turnNext(duration: number = 0.85): boolean {
    if (this.isAnimating) return false;
    // Can turn forward until all sheets are on the left (including back cover)
    if (this.currentTurningSheetIndex >= this.sheets.length) return false;

    const sheet = this.sheets[this.currentTurningSheetIndex];
    this.isAnimating = true;

    const tilt = 0.12;

    gsap.to(sheet, {
      progress: 1.0,
      tilt: 0.0,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        sheet.setProgress(sheet.progress, tilt * (1.0 - sheet.progress));
      },
      onComplete: () => {
        sheet.setProgress(1.0, 0.0);
        this.currentTurningSheetIndex++;
        this.isAnimating = false;
      }
    });

    return true;
  }

  /**
   * Turns the previous page sheet backward (from left to right)
   */
  public turnPrev(duration: number = 0.85): boolean {
    if (this.isAnimating) return false;
    // Can turn backward until all sheets are back on the right (closing front cover)
    if (this.currentTurningSheetIndex <= 0) return false;

    const targetIndex = this.currentTurningSheetIndex - 1;
    const sheet = this.sheets[targetIndex];
    this.isAnimating = true;

    const tilt = -0.12;

    gsap.to(sheet, {
      progress: 0.0,
      tilt: 0.0,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        sheet.setProgress(sheet.progress, tilt * sheet.progress);
      },
      onComplete: () => {
        sheet.setProgress(0.0, 0.0);
        this.currentTurningSheetIndex--;
        this.isAnimating = false;
      }
    });

    return true;
  }

  /**
   * Returns sheet currently on top of the right stack ready to turn forward
   */
  public getActiveRightSheet(): PageMesh | null {
    if (this.currentTurningSheetIndex < this.sheets.length) {
      return this.sheets[this.currentTurningSheetIndex];
    }
    return null;
  }

  /**
   * Returns sheet currently on top of the left stack ready to turn backward
   */
  public getActiveLeftSheet(): PageMesh | null {
    if (this.currentTurningSheetIndex > 0) {
      return this.sheets[this.currentTurningSheetIndex - 1];
    }
    return null;
  }

  /**
   * Status description of the album's current open state
   */
  public getStatusText(): string {
    if (this.currentTurningSheetIndex === 0) {
      return '相册已合上 (正面封面)';
    } else if (this.currentTurningSheetIndex === this.sheets.length) {
      return '相册已合上 (背面封底)';
    } else {
      // Inner photos (1 to 5)
      const photoPage = this.currentTurningSheetIndex;
      const totalPhotos = this.sheets.length - 2;
      return `第 ${photoPage} / ${totalPhotos} 页`;
    }
  }
}
