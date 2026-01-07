import { Paa, PaaType, ChannelSwizzle } from '../../packages/paa/src';

type ChannelMode = 'rgba' | 'r' | 'g' | 'b' | 'a';

// Format names mapping
const formatNames: Record<number, string> = {
    [PaaType.DXT1]: 'DXT1 (BC1)',
    [PaaType.DXT2]: 'DXT2 (BC2)',
    [PaaType.DXT3]: 'DXT3 (BC2)',
    [PaaType.DXT4]: 'DXT4 (BC3)',
    [PaaType.DXT5]: 'DXT5 (BC3)',
    [PaaType.RGBA_5551]: 'RGBA 5551',
    [PaaType.RGBA_4444]: 'RGBA 4444',
    [PaaType.RGBA_8888]: 'RGBA 8888',
    [PaaType.AI88]: 'AI88 (Grayscale)',
};

const channelSwizzleNames: Record<number, string> = {
    [ChannelSwizzle.Alpha]: 'A',
    [ChannelSwizzle.Red]: 'R',
    [ChannelSwizzle.Green]: 'G',
    [ChannelSwizzle.Blue]: 'B',
    [ChannelSwizzle.InvertedAlpha]: '1-A',
    [ChannelSwizzle.InvertedRed]: '1-R',
    [ChannelSwizzle.InvertedGreen]: '1-G',
    [ChannelSwizzle.InvertedBlue]: '1-B',
    [ChannelSwizzle.One]: '1',
};

// DOM Elements
let dropZone: HTMLElement;
let fileInput: HTMLInputElement;
let infoPanel: HTMLElement;
let viewerPanel: HTMLElement;
let errorPanel: HTMLElement;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let fileName: HTMLElement;
let formatChip: HTMLElement;
let fileFormat: HTMLElement;
let fileDimensions: HTMLElement;
let fileMipmaps: HTMLElement;
let fileAlpha: HTMLElement;
let fileTransparent: HTMLElement;
let fileSwizzle: HTMLElement;
let canvasSize: HTMLElement;
let mipBadge: HTMLElement;
let mipmapLevel: HTMLInputElement;
let mipmapLevelText: HTMLElement;
let exportBtn: HTMLButtonElement;
let resetBtn: HTMLButtonElement;
let errorResetBtn: HTMLButtonElement;
let errorMessage: HTMLElement;
let canvasContainer: HTMLElement;
let lightbox: HTMLElement;
let lightboxCanvas: HTMLCanvasElement;
let lightboxCtx: CanvasRenderingContext2D;
let lightboxClose: HTMLButtonElement;
let lightboxBackdrop: HTMLElement;
let lightboxTitle: HTMLElement;

// State
let currentTexture: Paa | null = null;
let currentBuffer: Uint8Array | null = null;
let currentFileName = '';
let currentChannel: ChannelMode = 'rgba';

function initializeDOM(): void {
    dropZone = document.getElementById('dropZone')!;
    fileInput = document.getElementById('fileInput') as HTMLInputElement;
    infoPanel = document.getElementById('infoPanel')!;
    viewerPanel = document.getElementById('viewerPanel')!;
    errorPanel = document.getElementById('errorPanel')!;
    canvas = document.getElementById('canvas') as HTMLCanvasElement;
    ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    fileName = document.getElementById('fileName')!;
    formatChip = document.getElementById('formatChip')!;
    fileFormat = document.getElementById('fileFormat')!;
    fileDimensions = document.getElementById('fileDimensions')!;
    fileMipmaps = document.getElementById('fileMipmaps')!;
    fileAlpha = document.getElementById('fileAlpha')!;
    fileTransparent = document.getElementById('fileTransparent')!;
    fileSwizzle = document.getElementById('fileSwizzle')!;
    canvasSize = document.getElementById('canvasSize')!;
    mipBadge = document.getElementById('mipBadge')!;

    mipmapLevel = document.getElementById('mipmapLevel') as HTMLInputElement;
    mipmapLevelText = document.getElementById('mipmapLevelText')!;
    exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    errorResetBtn = document.getElementById('errorResetBtn') as HTMLButtonElement;
    errorMessage = document.getElementById('errorMessage')!;

    canvasContainer = document.getElementById('canvasContainer')!;
    lightbox = document.getElementById('lightbox')!;
    lightboxCanvas = document.getElementById('lightboxCanvas') as HTMLCanvasElement;
    lightboxCtx = lightboxCanvas.getContext('2d', { willReadFrequently: true })!;
    lightboxClose = document.getElementById('lightboxClose') as HTMLButtonElement;
    lightboxBackdrop = document.getElementById('lightboxBackdrop')!;
    lightboxTitle = document.getElementById('lightboxTitle')!

    // Ensure controls start disabled/hidden states
    canvasContainer.setAttribute('aria-disabled', 'true');
}

function setupEventListeners(): void {
    dropZone.addEventListener('click', () => fileInput.click());

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
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            void handleFile(target.files[0]);
        }
    });

    mipmapLevel.addEventListener('input', (e) => {
        const level = parseInt((e.target as HTMLInputElement).value);
        renderMipmap(level);
    });

    // Channel selector buttons
    document.querySelectorAll('.channel-buttons .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.channel-buttons .btn').forEach(b => b.classList.remove('active'));
            (e.target as HTMLElement).classList.add('active');
            currentChannel = (e.target as HTMLElement).dataset.channel as ChannelMode;
            const level = parseInt(mipmapLevel.value);
            renderMipmap(level);
        });
    });

    exportBtn.addEventListener('click', exportAsPng);
    resetBtn.addEventListener('click', resetUi);
    errorResetBtn.addEventListener('click', resetUi);

    // Lightbox handlers
    canvasContainer.addEventListener('click', openLightbox);
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxBackdrop.addEventListener('click', closeLightbox);
}

function openLightbox(): void {
    if (canvasContainer.getAttribute('aria-disabled') === 'true') {
        return;
    }
    if (!currentTexture || !currentBuffer) return;

    const level = parseInt(mipmapLevel.value);
    const mip = currentTexture.mipmaps[level];

    // Copy current canvas to lightbox canvas
    lightboxCanvas.width = canvas.width;
    lightboxCanvas.height = canvas.height;
    lightboxCtx.drawImage(canvas, 0, 0);

    lightboxTitle.textContent = `${currentFileName} - Mipmap ${level} (${mip.width}x${mip.height})`;
    lightbox.hidden = false;
}

function closeLightbox(): void {
    lightbox.hidden = true;
}

async function handleFile(file: File): Promise<void> {
    if (!file.name.toLowerCase().endsWith('.paa')) {
        showError('Invalid file type. Please select a .paa file.');
        return;
    }

    currentFileName = file.name;

    try {
        const arrayBuffer = await file.arrayBuffer();
        currentBuffer = new Uint8Array(arrayBuffer);

        currentTexture = new Paa();
        currentTexture.read(currentBuffer);

        displayFileInfo();
        renderMipmap(0);

        dropZone.hidden = true;
        infoPanel.hidden = false;
        viewerPanel.hidden = false;
        errorPanel.hidden = true;
        canvasContainer.setAttribute('aria-disabled', 'false');
    } catch (error) {
        console.error('Error loading PAA file:', error);
        showError(`Failed to load PAA file: ${(error as Error).message}`);
    }
}

function displayFileInfo(): void {
    if (!currentTexture) return;

    fileName.textContent = currentFileName;
    const format = formatNames[currentTexture.type] || `Unknown (0x${currentTexture.type.toString(16)})`;
    formatChip.textContent = format;
    fileFormat.textContent = format;
    fileAlpha.textContent = currentTexture.isAlpha ? 'Yes' : 'No';
    fileTransparent.textContent = currentTexture.isTransparent ? 'Yes' : 'No';

    // Display channel swizzle information
    const swiz = currentTexture.channelSwizzle;
    const swizzleStr = `R=${channelSwizzleNames[swiz.swizRed]}, G=${channelSwizzleNames[swiz.swizGreen]}, B=${channelSwizzleNames[swiz.swizBlue]}, A=${channelSwizzleNames[swiz.swizAlpha]}`;
    fileSwizzle.textContent = swizzleStr;

    fileMipmaps.textContent = currentTexture.mipmaps.length.toString();

    if (currentTexture.mipmaps.length > 0) {
        const mainMip = currentTexture.mipmaps[0];
        fileDimensions.textContent = `${mainMip.width}×${mainMip.height}`;

        mipmapLevel.max = (currentTexture.mipmaps.length - 1).toString();
        mipmapLevel.value = '0';
        mipmapLevel.disabled = currentTexture.mipmaps.length <= 1;
        mipmapLevelText.textContent = '0';
    }
}

function renderMipmap(level: number): void {
    if (!currentTexture || !currentBuffer) return;

    try {
        const mip = currentTexture.mipmaps[level];
        // getArgb32PixelData returns BGRA format with channel swizzle applied
        const pixelData = currentTexture.getArgb32PixelData(currentBuffer, level);

        canvas.width = mip.width;
        canvas.height = mip.height;

        const imageData = ctx.createImageData(mip.width, mip.height);

        // Convert BGRA to RGBA for canvas and apply channel filter
        // getArgb32PixelData returns: B=i+0, G=i+1, R=i+2, A=i+3
        for (let i = 0; i < pixelData.length; i += 4) {
            const b = pixelData[i + 0];
            const g = pixelData[i + 1];
            const r = pixelData[i + 2];
            const a = pixelData[i + 3];

            switch (currentChannel) {
                case 'r':
                    imageData.data[i] = r;
                    imageData.data[i + 1] = r;
                    imageData.data[i + 2] = r;
                    imageData.data[i + 3] = 255;
                    break;
                case 'g':
                    imageData.data[i] = g;
                    imageData.data[i + 1] = g;
                    imageData.data[i + 2] = g;
                    imageData.data[i + 3] = 255;
                    break;
                case 'b':
                    imageData.data[i] = b;
                    imageData.data[i + 1] = b;
                    imageData.data[i + 2] = b;
                    imageData.data[i + 3] = 255;
                    break;
                case 'a':
                    imageData.data[i] = a;
                    imageData.data[i + 1] = a;
                    imageData.data[i + 2] = a;
                    imageData.data[i + 3] = 255;
                    break;
                default: // 'rgba'
                    imageData.data[i] = r;
                    imageData.data[i + 1] = g;
                    imageData.data[i + 2] = b;
                    imageData.data[i + 3] = a;
                    break;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        canvasSize.textContent = `${mip.width}×${mip.height}`;
        mipBadge.textContent = `mip ${level}`;
        mipmapLevelText.textContent = level.toString();

    } catch (error) {
        console.error('Error rendering mipmap:', error);
        showError(`Failed to render texture: ${(error as Error).message}`);
    }
}

function exportAsPng(): void {
    try {
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const level = parseInt(mipmapLevel.value);
            a.download = `${currentFileName.replace('.paa', '')}_mip${level}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    } catch (err) {
        console.error(err);
        showError((err as Error).message || 'Failed to export PNG');
    }
}

function resetUi(): void {
    currentTexture = null;
    currentBuffer = null;
    currentFileName = '';
    currentChannel = 'rgba';
    fileInput.value = '';

    canvasContainer.setAttribute('aria-disabled', 'true');
    closeLightbox();

    // Reset channel buttons
    document.querySelectorAll('.channel-buttons .btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.channel-buttons .btn[data-channel="rgba"]')?.classList.add('active');

    dropZone.hidden = false;
    infoPanel.hidden = true;
    viewerPanel.hidden = true;
    errorPanel.hidden = true;
}

function showError(message: string): void {
    if (errorMessage && errorPanel && dropZone && infoPanel && viewerPanel) {
        errorMessage.textContent = message;
        errorPanel.hidden = false;
        dropZone.hidden = true;
        infoPanel.hidden = true;
        viewerPanel.hidden = true;
    } else {
        console.error('Error (DOM not ready):', message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeDOM();
    setupEventListeners();
});
