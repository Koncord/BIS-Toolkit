import { Edds } from '../../packages/edds/src';

// DOM refs
let dropZone: HTMLElement;
let fileInput: HTMLInputElement;
let infoPanel: HTMLElement;
let viewerPanel: HTMLElement;
let errorPanel: HTMLElement;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let fileNameEl: HTMLElement;
let fileFormatEl: HTMLElement;
let fileDxgiEl: HTMLElement;
let fileDimensionsEl: HTMLElement;
let fileMipmapsEl: HTMLElement;
let formatChip: HTMLElement;
let mipmapLevel: HTMLInputElement;
let mipValue: HTMLElement;
let canvasSizeEl: HTMLElement;
let mipBadge: HTMLElement;
let exportBtn: HTMLButtonElement;
let resetBtn: HTMLButtonElement;
let errorResetBtn: HTMLButtonElement;
let canvasFrame: HTMLElement;
let lightbox: HTMLElement;
let lightboxCanvas: HTMLCanvasElement;
let lightboxCtx: CanvasRenderingContext2D;
let lightboxClose: HTMLElement;
let lightboxBackdrop: HTMLElement;
let lightboxTitle: HTMLElement;

// State
let currentTexture: Edds | null = null;
let currentBuffer: Uint8Array | null = null;
let currentFileName = '';

function qs(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) {
        throw new Error(`Missing element #${id}`);
    }
    return el;
}

function initializeDOM(): void {
    dropZone = qs('dropZone');
    fileInput = qs('fileInput') as HTMLInputElement;
    infoPanel = qs('infoPanel');
    viewerPanel = qs('viewerPanel');
    errorPanel = qs('errorPanel');
    canvas = qs('canvas') as HTMLCanvasElement;
    ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    fileNameEl = qs('fileName');
    fileFormatEl = qs('fileFormat');
    fileDxgiEl = qs('fileDxgi');
    fileDimensionsEl = qs('fileDimensions');
    fileMipmapsEl = qs('fileMipmaps');
    formatChip = qs('formatChip');
    mipmapLevel = qs('mipmapLevel') as HTMLInputElement;
    mipValue = qs('mipmapValue');
    canvasSizeEl = qs('canvasSize');
    mipBadge = qs('mipBadge');

    exportBtn = qs('exportBtn') as HTMLButtonElement;
    resetBtn = qs('resetBtn') as HTMLButtonElement;
    errorResetBtn = qs('errorResetBtn') as HTMLButtonElement;
    canvasFrame = qs('canvasFrame');

    lightbox = qs('lightbox');
    lightboxCanvas = qs('lightboxCanvas') as HTMLCanvasElement;
    lightboxCtx = lightboxCanvas.getContext('2d', { willReadFrequently: true })!;
    lightboxClose = qs('lightboxClose');
    lightboxBackdrop = qs('lightboxBackdrop');
    lightboxTitle = qs('lightboxTitle');

    // Ensure controls start disabled/hidden states
    canvasFrame.setAttribute('aria-disabled', 'true');
}

function setupEventListeners(): void {
    const handleBrowse = () => fileInput.click();
    dropZone.addEventListener('click', handleBrowse);

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drop--active');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drop--active');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drop--active');
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            void handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
            void handleFile(files[0]);
        }
    });

    mipmapLevel.addEventListener('input', (e) => {
        const level = Number((e.target as HTMLInputElement).value);
        renderMip(level);
    });

    exportBtn.addEventListener('click', exportAsPng);
    canvasFrame.addEventListener('click', openLightbox);
    canvasFrame.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox();
        }
    });
    resetBtn.addEventListener('click', resetUi);
    errorResetBtn.addEventListener('click', resetUi);
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxBackdrop.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !lightbox.hidden) {
            closeLightbox();
        }
    });
}

async function handleFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.edds') && !file.name.toLowerCase().endsWith('.dds')) {
        showError('Please pick an .edds (or raw .dds) file.');
        return;
    }

    currentFileName = file.name;
    try {
        const buffer = new Uint8Array(await file.arrayBuffer());
        currentBuffer = buffer;
        currentTexture = new Edds();
        currentTexture.read(buffer);

        displayFileInfo();
        renderMip(0);

        dropZone.hidden = true;
        infoPanel.hidden = false;
        viewerPanel.hidden = false;
        errorPanel.hidden = true;
    } catch (err) {
        console.error(err);
        showError((err as Error).message || 'Failed to read the file');
    }
}

function displayFileInfo(): void {
    if (!currentTexture) return;

    fileNameEl.textContent = currentFileName;
    fileFormatEl.textContent = currentTexture.format || '-';
    fileDxgiEl.textContent = currentTexture.formatDetails || '-';

    if (currentTexture.mipmaps.length > 0) {
        const top = currentTexture.mipmaps[0];
        fileDimensionsEl.textContent = `${top.width} × ${top.height}`;
    }
    fileMipmapsEl.textContent = currentTexture.mipmaps.length.toString();
    formatChip.textContent = currentTexture.formatName || 'Unknown';

    mipmapLevel.max = Math.max(0, currentTexture.mipmaps.length - 1).toString();
    mipmapLevel.value = '0';
    mipmapLevel.disabled = currentTexture.mipmaps.length <= 1;
    mipValue.textContent = '0';
    mipBadge.textContent = 'mip 0';

    canvasFrame.setAttribute('aria-disabled', 'false');
}

function renderMip(level: number): void {
    if (!currentTexture || !currentBuffer) return;
    try {
        const mip = currentTexture.mipmaps[level];
        const rgba = currentTexture.getRgbaPixelData(level);

        canvas.width = mip.width;
        canvas.height = mip.height;

        const imageData = ctx.createImageData(mip.width, mip.height);
        imageData.data.set(rgba);
        ctx.putImageData(imageData, 0, 0);

        canvasSizeEl.textContent = `${mip.width} × ${mip.height}`;
        mipValue.textContent = level.toString();
        mipBadge.textContent = `mip ${level}`;
    } catch (err) {
        console.error(err);
        showError((err as Error).message || 'Failed to render mipmap');
    }
}

function exportAsPng(): void {
    try {
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const level = Number(mipmapLevel.value);
            a.download = `${currentFileName.replace('.edds', '')}_mip${level}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    } catch (err) {
        console.error(err);
        showError((err as Error).message || 'Failed to export PNG');
    }
}

function openLightbox(): void {
    if (canvasFrame.getAttribute('aria-disabled') === 'true') {
        return;
    }
    if (!currentTexture || !canvas.width || !canvas.height) {
        return;
    }

    const level = Number(mipmapLevel.value);
    const mip = currentTexture?.mipmaps?.[level];
    lightboxTitle.textContent = `${currentFileName} - Mipmap ${level} (${mip.width}x${mip.height})`;

    lightboxCanvas.width = canvas.width;
    lightboxCanvas.height = canvas.height;

    const dataUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
        lightboxCtx.clearRect(0, 0, lightboxCanvas.width, lightboxCanvas.height);
        lightboxCtx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;

    lightbox.hidden = false;
}

function closeLightbox(): void {
    lightbox.hidden = true;
}

function resetUi(): void {
    currentTexture = null;
    currentBuffer = null;
    currentFileName = '';
    fileInput.value = '';

    canvasFrame.setAttribute('aria-disabled', 'true');
    closeLightbox();

    dropZone.hidden = false;
    infoPanel.hidden = true;
    viewerPanel.hidden = true;
    errorPanel.hidden = true;
}

function showError(message: string): void {
    const msgEl = qs('errorMessage');
    msgEl.textContent = message;
    errorPanel.hidden = false;
    dropZone.hidden = true;
    infoPanel.hidden = true;
    viewerPanel.hidden = true;
}

document.addEventListener('DOMContentLoaded', () => {
    initializeDOM();
    setupEventListeners();
});
