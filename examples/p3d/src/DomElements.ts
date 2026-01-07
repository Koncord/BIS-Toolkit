export interface IDomElements {
    dropZone: HTMLElement;
    fileInput: HTMLInputElement;
    canvas: HTMLCanvasElement;
    infoPanel: HTMLElement;
    errorPanel: HTMLElement;
    viewerContainer: HTMLElement;
    controlsPanel: HTMLElement;
    controlsToggle: HTMLElement;
    showPanelBtn: HTMLElement;
    version: HTMLElement;
    modelType: HTMLElement;
    lodCount: HTMLElement;
    vertexCount: HTMLElement;
    faceCount: HTMLElement;
    lodSelect: HTMLSelectElement;
    wireframeBtn: HTMLButtonElement;
    resetCameraBtn: HTMLButtonElement;
    normalsBtn: HTMLButtonElement;
    errorResetBtn: HTMLButtonElement;
    errorMessage: HTMLElement;
    materialList: HTMLElement;
    textureSlots_container: HTMLElement;
    textureSlotsToggle: HTMLButtonElement;
    selectionList?: HTMLElement;
    propertiesList?: HTMLElement;
    mass: HTMLElement;
    skeleton: HTMLElement;
}

export class DomElements implements IDomElements {
    dropZone: HTMLElement;
    fileInput: HTMLInputElement;
    canvas: HTMLCanvasElement;
    infoPanel: HTMLElement;
    errorPanel: HTMLElement;
    viewerContainer: HTMLElement;
    controlsPanel: HTMLElement;
    controlsToggle: HTMLElement;
    showPanelBtn: HTMLElement;
    version: HTMLElement;
    modelType: HTMLElement;
    lodCount: HTMLElement;
    vertexCount: HTMLElement;
    faceCount: HTMLElement;
    mass: HTMLElement;
    skeleton: HTMLElement;
    lodSelect: HTMLSelectElement;
    wireframeBtn: HTMLButtonElement;
    resetCameraBtn: HTMLButtonElement;
    normalsBtn: HTMLButtonElement;
    errorResetBtn: HTMLButtonElement;
    errorMessage: HTMLElement;
    materialList: HTMLElement;
    textureSlots_container: HTMLElement;
    textureSlotsToggle: HTMLButtonElement;
    selectionList: HTMLElement;
    propertiesList: HTMLElement;

    constructor() {
        this.dropZone = this.getElementById('dropZone');
        this.fileInput = this.getElementById<HTMLInputElement>('fileInput');
        this.canvas = this.getElementById<HTMLCanvasElement>('canvas');
        if (!this.canvas.parentElement) {
            throw new Error('Canvas element has no parent');
        }
        this.viewerContainer = this.canvas.parentElement;
        this.controlsPanel = this.getElementById('controlsPanel')!;
        this.controlsToggle = this.getElementById('controlsToggle');
        this.showPanelBtn = this.getElementById('showPanelBtn');
        this.infoPanel = this.getElementById('infoPanel');
        this.errorPanel = this.getElementById('errorPanel');

        this.version = this.getElementById('version');
        this.modelType = this.getElementById('modelType');
        this.lodCount = this.getElementById('lodCount');
        this.vertexCount = this.getElementById('vertexCount');
        this.faceCount = this.getElementById('faceCount');
        this.mass = this.getElementById('mass');
        this.skeleton = this.getElementById('skeleton');
        this.lodSelect = this.getElementById<HTMLSelectElement>('lodSelect');

        this.wireframeBtn = this.getElementById<HTMLButtonElement>('wireframeBtn');
        this.resetCameraBtn = this.getElementById<HTMLButtonElement>('resetCameraBtn');
        this.normalsBtn = this.getElementById<HTMLButtonElement>('normalsBtn');
        this.errorResetBtn = this.getElementById<HTMLButtonElement>('errorResetBtn');
        this.errorMessage = this.getElementById('errorMessage');
        this.materialList = this.getElementById('materialList');
        this.textureSlots_container = this.getElementById('textureSlots');
        this.textureSlotsToggle = this.getElementById<HTMLButtonElement>('textureSlotsToggle');
        this.selectionList = this.getElementById('selectionList');
        this.propertiesList = this.getElementById('propertiesList');
    }

    private getElementById<T extends HTMLElement>(id: string): T {
        const elem = document.getElementById(id);
        if (!elem) {
            throw new Error(`Element with ID "${id}" not found`);
        }
        return elem as T;
    }
}
