import * as THREE from 'three';
import gsap from 'gsap';
import { AlbumBook } from '../components/AlbumBook.ts';
import { PageMesh } from '../components/PageMesh.ts';
import { SceneManager } from '../core/SceneManager.ts';

export type PageChangeCallback = (statusText: string) => void;

export class InteractionController {
  private sceneManager: SceneManager;
  private album: AlbumBook;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private dragPlane: THREE.Plane;
  private planeIntersectPoint: THREE.Vector3;

  private isDraggingPage: boolean = false;
  private dragMode: 'forward' | 'backward' | null = null;
  private activeDragSheet: PageMesh | null = null;
  private pointerDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private currentProgress: number = 0;
  private currentTilt: number = 0;

  private onPageChangeCallbacks: PageChangeCallback[] = [];

  constructor(sceneManager: SceneManager, album: AlbumBook) {
    this.sceneManager = sceneManager;
    this.album = album;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.planeIntersectPoint = new THREE.Vector3();

    // Interaction plane in world space matching the album top surface
    const bookNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(album.quaternion);
    const bookPoint = album.position.clone();
    this.dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(bookNormal, bookPoint);

    this.bindEvents();
  }

  private bindEvents() {
    const dom = this.sceneManager.renderer.domElement;

    // Use capture phase to intercept book drags before orbit controls
    dom.addEventListener('pointerdown', this.onPointerDown, true);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);

    dom.addEventListener('pointermove', this.onHoverCheck);
  }

  public onPageChange(cb: PageChangeCallback) {
    this.onPageChangeCallbacks.push(cb);
  }

  private emitPageChange() {
    const status = this.album.getStatusText();
    for (const cb of this.onPageChangeCallbacks) {
      cb(status);
    }
  }

  private updatePointer(e: PointerEvent) {
    const rect = this.sceneManager.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onHoverCheck = (e: PointerEvent) => {
    if (this.isDraggingPage) return;
    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);

    const intersects = this.raycaster.intersectObjects(this.album.children, true);
    const dom = this.sceneManager.renderer.domElement;

    if (intersects.length > 0) {
      dom.style.cursor = 'grab';
    } else {
      dom.style.cursor = 'default';
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (this.album.isAnimating) return;

    this.updatePointer(e);
    this.pointerDownPos = { x: e.clientX, y: e.clientY };

    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);
    const intersects = this.raycaster.intersectObjects(this.album.children, true);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      const localHit = this.album.worldToLocal(hitPoint.clone());

      if (localHit.x > 0.05) {
        // Clicked on right side of book -> turn sheet forward (towards left)
        const sheet = this.album.getActiveRightSheet();
        if (sheet) {
          this.isDraggingPage = true;
          this.dragMode = 'forward';
          this.activeDragSheet = sheet;
          this.sceneManager.controls.enabled = false; // Disable camera orbit while dragging sheet
          this.sceneManager.renderer.domElement.style.cursor = 'grabbing';
          return;
        }
      } else if (localHit.x < -0.05) {
        // Clicked on left side of book -> turn sheet backward (towards right)
        const sheet = this.album.getActiveLeftSheet();
        if (sheet) {
          this.isDraggingPage = true;
          this.dragMode = 'backward';
          this.activeDragSheet = sheet;
          this.sceneManager.controls.enabled = false;
          this.sceneManager.renderer.domElement.style.cursor = 'grabbing';
          return;
        }
      }
    }

    // Outside the book pages: Left-click smoothly rotates the 3D scene!
    this.sceneManager.controls.enabled = true;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDraggingPage || !this.activeDragSheet || !this.dragMode) return;

    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.sceneManager.camera);

    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersectPoint)) {
      const local = this.album.worldToLocal(this.planeIntersectPoint.clone());
      const w = this.album.pageWidth;
      const h = this.album.pageHeight;

      // 1:1 mapping of pointer X to turn progress
      const progress = THREE.MathUtils.clamp((w - local.x) / (2.0 * w), 0.0, 1.0);
      const tilt = THREE.MathUtils.clamp((local.y / (h * 0.5)) * 0.35, -0.4, 0.4);

      this.currentProgress = progress;
      this.currentTilt = tilt;
      this.activeDragSheet.setProgress(progress, tilt);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    this.sceneManager.controls.enabled = true;

    if (!this.isDraggingPage || !this.activeDragSheet || !this.dragMode) {
      return;
    }

    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    const isClick = dist < 7;

    const sheet = this.activeDragSheet;
    const mode = this.dragMode;

    this.isDraggingPage = false;
    this.activeDragSheet = null;
    this.dragMode = null;
    this.sceneManager.renderer.domElement.style.cursor = 'grab';

    // Click quick turn
    if (isClick) {
      if (mode === 'forward') {
        this.album.turnNext();
        this.emitPageChange();
      } else {
        this.album.turnPrev();
        this.emitPageChange();
      }
      return;
    }

    // Drag-to-turn release physics
    this.album.isAnimating = true;

    if (mode === 'forward') {
      if (this.currentProgress >= 0.5) {
        gsap.to(sheet, {
          progress: 1.0,
          tilt: 0.0,
          duration: 0.55,
          ease: 'power2.out',
          onUpdate: () => {
            sheet.setProgress(sheet.progress, this.currentTilt * (1.0 - sheet.progress));
          },
          onComplete: () => {
            sheet.setProgress(1.0, 0.0);
            this.album.currentTurningSheetIndex++;
            this.album.isAnimating = false;
            this.emitPageChange();
          }
        });
      } else {
        gsap.to(sheet, {
          progress: 0.0,
          tilt: 0.0,
          duration: 0.45,
          ease: 'power2.out',
          onUpdate: () => {
            sheet.setProgress(sheet.progress, this.currentTilt * sheet.progress);
          },
          onComplete: () => {
            sheet.setProgress(0.0, 0.0);
            this.album.isAnimating = false;
            this.emitPageChange();
          }
        });
      }
    } else {
      if (this.currentProgress <= 0.5) {
        gsap.to(sheet, {
          progress: 0.0,
          tilt: 0.0,
          duration: 0.55,
          ease: 'power2.out',
          onUpdate: () => {
            sheet.setProgress(sheet.progress, this.currentTilt * sheet.progress);
          },
          onComplete: () => {
            sheet.setProgress(0.0, 0.0);
            this.album.currentTurningSheetIndex--;
            this.album.isAnimating = false;
            this.emitPageChange();
          }
        });
      } else {
        gsap.to(sheet, {
          progress: 1.0,
          tilt: 0.0,
          duration: 0.45,
          ease: 'power2.out',
          onUpdate: () => {
            sheet.setProgress(sheet.progress, this.currentTilt * (1.0 - sheet.progress));
          },
          onComplete: () => {
            sheet.setProgress(1.0, 0.0);
            this.album.isAnimating = false;
            this.emitPageChange();
          }
        });
      }
    }
  };

  public dispose() {
    const dom = this.sceneManager.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown, true);
    dom.removeEventListener('pointermove', this.onHoverCheck);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }
}
