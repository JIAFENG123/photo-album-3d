import * as THREE from 'three';

export interface PageContent {
  title: string;
  subtitle: string;
  date: string;
  location: string;
  theme: 'mountain' | 'sea' | 'minimal' | 'forest' | 'architecture';
}

export class TextureGenerator {
  /**
   * Generates photorealistic leather cover textures (front title, back minimal)
   */
  public static createLeatherTextures(): {
    frontMap: THREE.CanvasTexture;
    backMap: THREE.CanvasTexture;
    liningMap: THREE.CanvasTexture;
    bumpMap: THREE.CanvasTexture;
  } {
    const size = 1024;

    // 1. Front Cover Canvas with gold embossing
    const frontCanvas = document.createElement('canvas');
    frontCanvas.width = size;
    frontCanvas.height = size;
    const fCtx = frontCanvas.getContext('2d')!;

    fCtx.fillStyle = '#1c1514';
    fCtx.fillRect(0, 0, size, size);

    // Leather organic grain
    const imgData = fCtx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 0.85));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.7));
    }
    fCtx.putImageData(imgData, 0, 0);

    // Gold embossed perimeter stitch
    fCtx.strokeStyle = '#c49a55';
    fCtx.lineWidth = 2.5;
    fCtx.setLineDash([9, 7]);
    fCtx.strokeRect(36, 36, size - 72, size - 72);
    fCtx.setLineDash([]);

    // Debossed gold lettering
    fCtx.fillStyle = '#d4af37';
    fCtx.font = 'bold 44px "Cinzel", "Georgia", serif';
    fCtx.textAlign = 'center';
    fCtx.fillText('• PHOTO ALBUM •', size / 2, size * 0.44);

    fCtx.font = '22px "Georgia", serif';
    fCtx.fillStyle = '#bfa157';
    fCtx.fillText('COLLECTED MOMENTS', size / 2, size * 0.5);

    const frontMap = new THREE.CanvasTexture(frontCanvas);
    frontMap.colorSpace = THREE.SRGBColorSpace;

    // 2. Back Cover Canvas (Plain leather with stitching)
    const backCanvas = document.createElement('canvas');
    backCanvas.width = size;
    backCanvas.height = size;
    const bCtx = backCanvas.getContext('2d')!;

    bCtx.fillStyle = '#1c1514';
    bCtx.fillRect(0, 0, size, size);
    bCtx.putImageData(imgData, 0, 0);

    bCtx.strokeStyle = '#c49a55';
    bCtx.lineWidth = 2.5;
    bCtx.setLineDash([9, 7]);
    bCtx.strokeRect(36, 36, size - 72, size - 72);
    bCtx.setLineDash([]);

    bCtx.fillStyle = 'rgba(212, 175, 55, 0.4)';
    bCtx.font = '16px "Georgia", serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('— FINE ART ARCHIVE —', size / 2, size * 0.5);

    const backMap = new THREE.CanvasTexture(backCanvas);
    backMap.colorSpace = THREE.SRGBColorSpace;

    // 3. Inside Lining (Warm Archival Endpaper)
    const liningCanvas = document.createElement('canvas');
    liningCanvas.width = size;
    liningCanvas.height = size;
    const lCtx = liningCanvas.getContext('2d')!;
    lCtx.fillStyle = '#f5f0e6';
    lCtx.fillRect(0, 0, size, size);
    lCtx.fillStyle = 'rgba(0, 0, 0, 0.015)';
    for (let i = 0; i < 3000; i++) {
      lCtx.fillRect(Math.random() * size, Math.random() * size, 1.2, 1.2);
    }
    const liningMap = new THREE.CanvasTexture(liningCanvas);
    liningMap.colorSpace = THREE.SRGBColorSpace;

    // 4. Bump Map
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = 512;
    bumpCanvas.height = 512;
    const bumpCtx = bumpCanvas.getContext('2d')!;
    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, 512, 512);
    const bImg = bumpCtx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < bImg.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 45;
      const v = Math.min(255, Math.max(0, 128 + n));
      bImg.data[i] = v;
      bImg.data[i + 1] = v;
      bImg.data[i + 2] = v;
    }
    bumpCtx.putImageData(bImg, 0, 0);
    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = THREE.RepeatWrapping;
    bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.repeat.set(4, 4);

    return { frontMap, backMap, liningMap, bumpMap };
  }

  /**
   * Generates high-res fine art photo page textures
   */
  public static createPhotoPageTexture(
    content: PageContent,
    pageNumber: number,
    isLeftSpread = false
  ): THREE.CanvasTexture {
    const width = 1024;
    const height = 1440;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Warm Japanese archival matte paper (#f8f6f0)
    ctx.fillStyle = '#f8f6f0';
    ctx.fillRect(0, 0, width, height);

    // Paper fiber grain
    ctx.fillStyle = 'rgba(0, 0, 0, 0.012)';
    for (let i = 0; i < 3000; i++) {
      ctx.fillRect(Math.random() * width, Math.random() * height, 1.2, 1.2);
    }

    // Spine binding shadow gradient
    const spineGrad = ctx.createLinearGradient(
      isLeftSpread ? width : 0,
      0,
      isLeftSpread ? width - 80 : 80,
      0
    );
    spineGrad.addColorStop(0, 'rgba(30, 20, 10, 0.18)');
    spineGrad.addColorStop(0.35, 'rgba(30, 20, 10, 0.05)');
    spineGrad.addColorStop(1, 'rgba(30, 20, 10, 0)');
    ctx.fillStyle = spineGrad;
    ctx.fillRect(0, 0, width, height);

    // Outer margin line
    ctx.strokeStyle = 'rgba(140, 120, 100, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Photographic Artwork
    this.renderPhotograph(ctx, content, width, height, isLeftSpread);

    // Typography
    this.renderTypography(ctx, content, width, height, pageNumber, isLeftSpread);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    return texture;
  }

  private static renderPhotograph(
    ctx: CanvasRenderingContext2D,
    content: PageContent,
    width: number,
    height: number,
    isLeftSpread: boolean
  ) {
    const photoW = width - 180;
    const photoH = height * 0.58;
    const photoX = isLeftSpread ? 80 : 100;
    const photoY = 110;

    // Photo shadow on archival paper
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    // White photo mount
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(photoX - 10, photoY - 10, photoW + 20, photoH + 20);
    ctx.shadowColor = 'transparent';

    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoW, photoH);
    ctx.clip();

    switch (content.theme) {
      case 'mountain':
        this.paintMountain(ctx, photoX, photoY, photoW, photoH);
        break;
      case 'sea':
        this.paintSea(ctx, photoX, photoY, photoW, photoH);
        break;
      case 'minimal':
        this.paintMinimal(ctx, photoX, photoY, photoW, photoH);
        break;
      case 'forest':
        this.paintForest(ctx, photoX, photoY, photoW, photoH);
        break;
      case 'architecture':
        this.paintArchitecture(ctx, photoX, photoY, photoW, photoH);
        break;
      default:
        this.paintMountain(ctx, photoX, photoY, photoW, photoH);
    }

    // 35mm film grain
    const imgData = ctx.getImageData(photoX, photoY, photoW, photoH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = (Math.random() - 0.5) * 14;
      d[i] = Math.min(255, Math.max(0, d[i] + g));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + g));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + g));
    }
    ctx.putImageData(imgData, photoX, photoY);

    // Photo paper gloss
    const gloss = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
    gloss.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    gloss.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    gloss.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
    ctx.fillStyle = gloss;
    ctx.fillRect(photoX, photoY, photoW, photoH);

    ctx.restore();
  }

  private static paintMountain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const sky = ctx.createLinearGradient(x, y, x, y + h * 0.7);
    sky.addColorStop(0, '#f28352');
    sky.addColorStop(0.4, '#f8b988');
    sky.addColorStop(1, '#fffaeb');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);

    ctx.beginPath();
    ctx.arc(x + w * 0.7, y + h * 0.35, 45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 235, 0.9)';
    ctx.fill();

    ctx.fillStyle = 'rgba(150, 120, 160, 0.45)';
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.65);
    ctx.lineTo(x + w * 0.28, y + h * 0.35);
    ctx.lineTo(x + w * 0.52, y + h * 0.55);
    ctx.lineTo(x + w * 0.78, y + h * 0.28);
    ctx.lineTo(x + w, y + h * 0.6);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.fill();

    ctx.fillStyle = '#37475a';
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.75);
    ctx.lineTo(x + w * 0.22, y + h * 0.42);
    ctx.lineTo(x + w * 0.48, y + h * 0.72);
    ctx.lineTo(x + w * 0.7, y + h * 0.38);
    ctx.lineTo(x + w, y + h * 0.68);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.fill();

    const lake = ctx.createLinearGradient(x, y + h * 0.72, x, y + h);
    lake.addColorStop(0, '#2d4255');
    lake.addColorStop(0.6, '#3e6378');
    lake.addColorStop(1, '#ffb885');
    ctx.fillStyle = lake;
    ctx.fillRect(x, y + h * 0.72, w, h * 0.28);
  }

  private static paintSea(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const sky = ctx.createLinearGradient(x, y, x, y + h * 0.6);
    sky.addColorStop(0, '#151e36');
    sky.addColorStop(0.5, '#d94b4b');
    sky.addColorStop(1, '#ffb547');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);

    ctx.beginPath();
    ctx.arc(x + w * 0.45, y + h * 0.58, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#fff4cc';
    ctx.fill();

    const sea = ctx.createLinearGradient(x, y + h * 0.58, x, y + h);
    sea.addColorStop(0, '#e56b36');
    sea.addColorStop(0.35, '#2e3d4d');
    sea.addColorStop(1, '#121820');
    ctx.fillStyle = sea;
    ctx.fillRect(x, y + h * 0.58, w, h * 0.42);

    ctx.fillStyle = '#0e141a';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.76, y + h);
    ctx.lineTo(x + w * 0.72, y + h * 0.66);
    ctx.lineTo(x + w * 0.9, y + h * 0.58);
    ctx.lineTo(x + w, y + h * 0.64);
    ctx.lineTo(x + w, y + h);
    ctx.fill();
  }

  private static paintMinimal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, '#e8ecef');
    bg.addColorStop(0.5, '#c5cfd6');
    bg.addColorStop(0.7, '#8f9da8');
    bg.addColorStop(1, '#47535e');
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#21272c';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.47, y + h * 0.52);
    ctx.lineTo(x + w * 0.53, y + h * 0.52);
    ctx.lineTo(x + w * 0.62, y + h);
    ctx.lineTo(x + w * 0.38, y + h);
    ctx.fill();
  }

  private static paintForest(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, '#ed6b3b');
    bg.addColorStop(0.45, '#d88e2c');
    bg.addColorStop(1, '#3b2014');
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#26140b';
    const trunks = [0.15, 0.3, 0.5, 0.7, 0.85];
    for (const t of trunks) {
      const tx = x + w * t;
      ctx.beginPath();
      ctx.moveTo(tx - 10, y + h);
      ctx.lineTo(tx - 5, y);
      ctx.lineTo(tx + 5, y);
      ctx.lineTo(tx + 10, y + h);
      ctx.fill();
    }
  }

  private static paintArchitecture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = '#eae4dc';
    ctx.fillRect(x, y, w, h);

    const beam = ctx.createLinearGradient(x, y, x + w, y + h);
    beam.addColorStop(0, '#ffffff');
    beam.addColorStop(0.5, '#d4c5b3');
    beam.addColorStop(1, '#3a3028');
    ctx.fillStyle = beam;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#2b231d';
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.55, w * 0.4, Math.PI, 0);
    ctx.lineTo(x + w * 0.9, y + h);
    ctx.lineTo(x + w * 0.1, y + h);
    ctx.fill();
  }

  private static renderTypography(
    ctx: CanvasRenderingContext2D,
    content: PageContent,
    width: number,
    height: number,
    pageNumber: number,
    isLeftSpread: boolean
  ) {
    const textX = 110;
    const baseY = height * 0.78;

    ctx.fillStyle = '#1e1a17';
    ctx.font = '600 36px "Cinzel", "Georgia", serif';
    ctx.textAlign = 'left';
    ctx.fillText(content.title, textX, baseY);

    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(textX, baseY + 18);
    ctx.lineTo(textX + 220, baseY + 18);
    ctx.stroke();

    ctx.fillStyle = '#5c5249';
    ctx.font = 'italic 19px "Georgia", serif';
    ctx.fillText(content.subtitle, textX, baseY + 52);

    ctx.fillStyle = '#8a7d71';
    ctx.font = '13px "Helvetica Neue", "Arial", sans-serif';
    ctx.fillText(`${content.location}  •  ${content.date}`, textX, baseY + 84);

    ctx.fillStyle = '#ab9e91';
    ctx.font = '14px "Cinzel", "Georgia", serif';
    ctx.textAlign = isLeftSpread ? 'left' : 'right';
    const footerX = isLeftSpread ? 80 : width - 80;
    ctx.fillText(`—  ${pageNumber}  —`, footerX, height - 70);
  }
}
