import gsap from 'gsap';
import { SceneManager } from './core/SceneManager.ts';
import { TextureGenerator } from './core/TextureGenerator.ts';
import { AlbumBook } from './components/AlbumBook.ts';
import { InteractionController } from './controllers/InteractionController.ts';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // 1. Scene Manager with 360-degree OrbitControls
  const sceneManager = new SceneManager(container);

  // 2. Leather Cover Textures (Front, Back, Lining)
  const leatherTextures = TextureGenerator.createLeatherTextures();

  // 3. Album Book with Integrated Turnable Covers
  const album = new AlbumBook({
    pageWidth: 2.4,
    pageHeight: 3.4,
    leatherTextures
  });
  sceneManager.scene.add(album);

  // 4. Interaction Controller
  const interactionController = new InteractionController(sceneManager, album);

  // 5. UI Elements
  const pageCounter = document.getElementById('page-counter') as HTMLElement;
  const btnNext = document.getElementById('btn-next') as HTMLButtonElement;
  const btnPrev = document.getElementById('btn-prev') as HTMLButtonElement;
  const btnAutoplay = document.getElementById('btn-autoplay') as HTMLButtonElement;
  const btnResetView = document.getElementById('btn-reset-view') as HTMLButtonElement;

  const updatePageCounter = (statusText: string) => {
    if (pageCounter) {
      pageCounter.textContent = statusText;
    }
  };

  interactionController.onPageChange(updatePageCounter);
  updatePageCounter(album.getStatusText());

  // Next / Prev Button Controls
  btnNext?.addEventListener('click', () => {
    if (album.turnNext()) {
      updatePageCounter(album.getStatusText());
    }
  });

  btnPrev?.addEventListener('click', () => {
    if (album.turnPrev()) {
      updatePageCounter(album.getStatusText());
    }
  });

  // Reset Camera View smoothly
  btnResetView?.addEventListener('click', () => {
    gsap.to(sceneManager.camera.position, {
      x: 0,
      y: 3.8,
      z: 4.8,
      duration: 1.0,
      ease: 'power3.out'
    });
    gsap.to(sceneManager.controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 1.0,
      ease: 'power3.out',
      onUpdate: () => {
        sceneManager.controls.update();
      }
    });
  });

  // Autoplay Slideshow
  let isAutoplaying = false;
  let autoplayTimer: number | null = null;

  btnAutoplay?.addEventListener('click', () => {
    isAutoplaying = !isAutoplaying;
    if (isAutoplaying) {
      btnAutoplay.textContent = '暂停演示';
      btnAutoplay.classList.add('primary');

      const step = () => {
        if (!isAutoplaying) return;
        if (album.currentTurningSheetIndex < album.sheets.length) {
          album.turnNext(1.0);
          updatePageCounter(album.getStatusText());
          autoplayTimer = window.setTimeout(step, 2400);
        } else {
          // Reset to front cover
          resetToStart(() => {
            autoplayTimer = window.setTimeout(step, 1800);
          });
        }
      };
      step();
    } else {
      stopAutoplay();
    }
  });

  const stopAutoplay = () => {
    isAutoplaying = false;
    if (autoplayTimer !== null) {
      clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
    btnAutoplay.textContent = '自动演示';
    btnAutoplay.classList.remove('primary');
  };

  const resetToStart = (onComplete?: () => void) => {
    if (album.isAnimating) return;
    album.isAnimating = true;

    // Reset so Sheet 0 is open (progress = 1.0) and all others are 0.0
    const turnedSheets = album.sheets
      .filter((s, idx) => idx > 0 && s.progress > 0)
      .reverse();

    if (turnedSheets.length === 0) {
      album.isAnimating = false;
      if (onComplete) onComplete();
      return;
    }

    turnedSheets.forEach((sheet, idx) => {
      gsap.to(sheet, {
        progress: 0.0,
        tilt: 0.0,
        duration: 0.5,
        delay: idx * 0.12,
        ease: 'power2.out',
        onUpdate: () => {
          sheet.setProgress(sheet.progress, 0);
        },
        onComplete: () => {
          if (idx === turnedSheets.length - 1) {
            album.currentTurningSheetIndex = 1;
            album.isAnimating = false;
            updatePageCounter(album.getStatusText());
            if (onComplete) onComplete();
          }
        }
      });
    });
  };

  // Keyboard Navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      album.turnNext();
      updatePageCounter(album.getStatusText());
    } else if (e.key === 'ArrowLeft') {
      album.turnPrev();
      updatePageCounter(album.getStatusText());
    }
  });

  console.log('3D Photo Album with seamless cover open/close drag ready!');
});
