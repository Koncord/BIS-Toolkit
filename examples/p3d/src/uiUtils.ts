import type { IDomElements } from './DomElements';

export interface ModelStats {
    modelType?: string;
    version?: number | string;
    lodCount?: number;
    totalVertices?: number;
    totalFaces?: number;
    mass?: number;
    skeleton?: string;
}

export interface LodInfo {
    resolutionName: string;
    verticesCount: number;
    facesCount: number;
}

export interface SelectionInfo {
    name: string;
    faceCount: number;
    vertexCount: number;
}

export interface TextureSlotData {
    key: string;
    name: string;
    texture: boolean;
    url?: string;
    fileName?: string;
    roughnessUrl?: string | null;
    metalnessUrl?: string | null;
    specularIntensityUrl?: string | null;
    specularColorUrl?: string | null;
}

export interface MaterialData {
    name: string;
    path: string;
    loaded: boolean;
    textureCount?: number;
}

export interface PropertyInfo {
    name: string;
    value: string;
}

export class UIUtils {
    constructor(private dom: IDomElements) { }

    setupPanelCollapse(): void {
        if (!this.dom.controlsPanel) return;

        const setControlsCollapsed = (collapsed: boolean) => {
            this.dom.controlsPanel.classList.toggle('collapsed', collapsed);

            if (this.dom.controlsToggle) {
                this.dom.controlsToggle.setAttribute('aria-expanded', (!collapsed).toString());
                this.dom.controlsToggle.title = collapsed ? 'Show Panel' : 'Hide Panel';
            }

            if (this.dom.showPanelBtn) {
                this.dom.showPanelBtn.style.display = collapsed ? 'flex' : 'none';
            }
        };

        this.dom.controlsToggle?.addEventListener('click', () => {
            setControlsCollapsed(true);
        });

        this.dom.showPanelBtn?.addEventListener('click', () => {
            setControlsCollapsed(false);
        });

        setControlsCollapsed(false);
    }

    setupTextureSlotsCollapse(): void {
        if (!this.dom.textureSlotsToggle || !this.dom.textureSlots_container) return;

        const toggle = () => {
            const isCollapsed = this.dom.textureSlots_container.classList.toggle('collapsed');
            this.dom.textureSlotsToggle!.textContent = isCollapsed ? '+' : '−';
            this.dom.textureSlotsToggle!.setAttribute('aria-expanded', (!isCollapsed).toString());
        };

        this.dom.textureSlotsToggle.addEventListener('click', toggle);
    }

    /**
     * Show error message in error panel
     */
    showError(message: string): void {
        if (this.dom.errorMessage) {
            this.dom.errorMessage.textContent = message;
        }
        if (this.dom.errorPanel) {
            this.dom.errorPanel.style.display = 'block';
        }
        console.error(message);
    }

    setupDropZone(onFilesDropped: (files: File[]) => void): void {
        if (!this.dom.dropZone) return;

        this.dom.dropZone.addEventListener('click', () => {
            this.dom.fileInput?.click();
        });

        this.dom.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dom.dropZone.classList.add('drop--active');
        });

        this.dom.dropZone.addEventListener('dragleave', () => {
            this.dom.dropZone.classList.remove('drop--active');
        });

        this.dom.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dom.dropZone.classList.remove('drop--active');

            if (e.dataTransfer?.files.length) {
                onFilesDropped(Array.from(e.dataTransfer.files));
            }
        });

        this.dom.fileInput?.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files?.length) {
                onFilesDropped(Array.from(target.files));
            }
        });
    }

    resetUI(): void {
        this.dom.infoPanel.style.display = 'none';
        this.dom.errorPanel.style.display = 'none';
        this.dom.dropZone.removeAttribute('hidden');
        if (this.dom.controlsPanel) this.dom.controlsPanel.style.display = 'none';
    }

    showModel(): void {
        this.dom.errorPanel.style.display = 'none';
        this.dom.infoPanel.style.display = 'block';
        if (this.dom.controlsPanel) {
            this.dom.controlsPanel.style.display = 'block';
            this.dom.controlsPanel.classList.remove('collapsed');
        }
        this.dom.dropZone.setAttribute('hidden', '');
    }

    updateModelInfo(stats: ModelStats): void {
        this.dom.modelType.textContent = stats.modelType ?? 'Unknown';
        this.dom.version.textContent = stats.version?.toString() ?? 'Unknown';
        this.dom.lodCount.textContent = stats.lodCount?.toString() ?? 'Unknown';
        this.dom.vertexCount.textContent = stats.totalVertices?.toString() ?? 'Unknown';
        this.dom.faceCount.textContent = stats.totalFaces?.toString() ?? 'Unknown';
        this.dom.mass.textContent = stats.mass ? stats.mass.toFixed(2) : 'N/A';
        this.dom.skeleton.textContent = stats.skeleton || 'None';
    }

    populateLodSelector(lods: LodInfo[]): void {
        this.dom.lodSelect.innerHTML = '';
        lods.forEach((lod: LodInfo, index: number) => {
            const option = document.createElement('option');
            option.value = index.toString();
            const name = lod.resolutionName;
            const vertexCount = lod.verticesCount;
            const faceCount = lod.facesCount;
            option.textContent = `${name} (${vertexCount} vertices, ${faceCount} faces)`;
            this.dom.lodSelect.appendChild(option);
        });
    }

    updateSelectionList(
        selections: SelectionInfo[],
        onSelectionClick: (selection: SelectionInfo, element: HTMLElement) => void
    ): void {
        if (!this.dom.selectionList) return;

        if (selections.length > 0) {
            const template = document.getElementById('selection-item-template') as HTMLTemplateElement;
            this.dom.selectionList.innerHTML = '';

            selections.forEach((sel: SelectionInfo) => {
                const clone = template.content.cloneNode(true) as DocumentFragment;
                const item = clone.querySelector('.selection-item') as HTMLElement;
                const nameEl = clone.querySelector('.selection-name') as HTMLElement;
                const infoEl = clone.querySelector('.selection-info') as HTMLElement;

                nameEl.textContent = sel.name;
                infoEl.textContent = `${sel.faceCount} faces, ${sel.vertexCount} vertices`;
                item.addEventListener('click', () => onSelectionClick(sel, item));

                this.dom.selectionList!.appendChild(clone);
            });
        } else {
            this.dom.selectionList.innerHTML = '<div class="selection-list-empty">No named selections</div>';
        }
    }

    clearSelectionHighlight(): void {
        if (this.dom.selectionList) {
            this.dom.selectionList.querySelectorAll('.selection-item').forEach(item => {
                item.classList.remove('selected');
            });
        }
    }

    renderTextureSlots(
        slots: TextureSlotData[],
        specularHex: string | null,
        onClearSlot: (slotKey: string) => void,
        onLoadTexture: (slotKey: string, file: File) => Promise<void>
    ): void {
        if (!this.dom.textureSlots_container) return;

        const emptyTemplate = document.getElementById('texture-slot-empty-template') as HTMLTemplateElement;
        const filledTemplate = document.getElementById('texture-slot-filled-template') as HTMLTemplateElement;
        const derivedMapTemplate = document.getElementById('derived-map-template') as HTMLTemplateElement;
        const specTintTemplate = document.getElementById('specular-tint-note-template') as HTMLTemplateElement;

        this.dom.textureSlots_container.innerHTML = '';

        for (const slot of slots) {
            const template = slot.texture ? filledTemplate : emptyTemplate;
            const clone = template.content.cloneNode(true) as DocumentFragment;
            const slotElement = clone.querySelector('.texture-slot') as HTMLElement;
            const label = clone.querySelector('.texture-slot-label') as HTMLElement;

            label.textContent = slot.name;

            if (slot.texture) {
                const img = clone.querySelector('.texture-slot-img') as HTMLImageElement;
                const removeBtn = clone.querySelector('.texture-slot-remove') as HTMLButtonElement;
                const filename = clone.querySelector('.texture-slot-filename') as HTMLElement;

                img.src = slot.url!;
                img.alt = slot.fileName || 'Texture';
                filename.textContent = slot.fileName || 'Unknown';
                filename.title = slot.fileName || '';

                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    onClearSlot(slot.key);
                };
            }

            // Event handlers
            slotElement.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                slotElement.classList.add('drag-over');
            });

            slotElement.addEventListener('dragleave', (e) => {
                e.stopPropagation();
                slotElement.classList.remove('drag-over');
            });

            slotElement.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                slotElement.classList.remove('drag-over');

                if (e.dataTransfer!.files.length > 0) {
                    const file = e.dataTransfer!.files[0];
                    await onLoadTexture(slot.key, file);
                }
            });

            slotElement.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.paa,.png,.jpg,.jpeg';
                input.onchange = async (e) => {
                    if ((e.target as HTMLInputElement).files!.length > 0) {
                        await onLoadTexture(slot.key, (e.target as HTMLInputElement).files![0]);
                    }
                };
                input.click();
            });

            this.dom.textureSlots_container.appendChild(clone);

            // Add derived maps if SMDI slot
            if (slot.key === 'smdi' && (slot.roughnessUrl || slot.metalnessUrl || slot.specularIntensityUrl || slot.specularColorUrl)) {
                const container = document.createElement('div');
                container.className = 'derived-maps';

                if (specularHex) {
                    const tintClone = specTintTemplate.content.cloneNode(true) as DocumentFragment;
                    const chip = tintClone.querySelector('.spec-chip') as HTMLElement;
                    chip.style.backgroundColor = specularHex;
                    container.appendChild(tintClone);
                }

                const addDerived = (labelText: string, url?: string | null) => {
                    if (!url) return;
                    const mapClone = derivedMapTemplate.content.cloneNode(true) as DocumentFragment;
                    const labelEl = mapClone.querySelector('.derived-map-label') as HTMLElement;
                    const imgEl = mapClone.querySelector('.derived-map-preview') as HTMLImageElement;

                    labelEl.textContent = labelText;
                    imgEl.src = url;
                    imgEl.alt = labelText;

                    container.appendChild(mapClone);
                };

                addDerived('Roughness (1 - gloss B)', slot.roughnessUrl);
                addDerived('Metalness (specular G)', slot.metalnessUrl);
                addDerived('Spec Intensity (G)', slot.specularIntensityUrl);
                addDerived('Spec Color (G * specular[])', slot.specularColorUrl);

                slotElement.appendChild(container);
            }
        }
    }

    renderMaterialList(
        materials: MaterialData[],
        onLoadRvmat: (file: File) => Promise<void>
    ): void {
        if (materials.length === 0) {
            this.dom.materialList.innerHTML = '<div class="material-list-empty">No materials defined. Model will use default material.</div>';
            return;
        }

        const template = document.getElementById('material-item-template') as HTMLTemplateElement;
        this.dom.materialList.innerHTML = '';

        for (const material of materials) {
            const clone = template.content.cloneNode(true) as DocumentFragment;
            const item = clone.querySelector('.material-item') as HTMLElement;
            const nameLabel = clone.querySelector('.material-name') as HTMLElement;
            const status = clone.querySelector('.material-status') as HTMLElement;

            if (material.loaded) item.classList.add('loaded');
            nameLabel.textContent = material.name;
            nameLabel.title = material.path;

            const statusText = material.loaded && material.textureCount !== undefined
                ? `${material.textureCount} textures`
                : (material.loaded ? 'Loaded' : 'Missing');
            status.textContent = statusText;

            if (!material.loaded) {
                item.setAttribute('draggable', 'false');

                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    item.classList.add('drag-over');
                });

                item.addEventListener('dragleave', (e) => {
                    e.stopPropagation();
                    item.classList.remove('drag-over');
                });

                item.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    item.classList.remove('drag-over');

                    if (e.dataTransfer!.files.length > 0) {
                        const file = e.dataTransfer!.files[0];
                        if (file.name.toLowerCase().endsWith('.rvmat')) {
                            await onLoadRvmat(file);
                        } else {
                            this.showError('Please drop an RVMAT file');
                        }
                    }
                });

                item.style.cursor = 'pointer';
                item.title = 'Drop RVMAT file here or click to browse';

                item.addEventListener('click', () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.rvmat';
                    input.onchange = async (e) => {
                        if ((e.target as HTMLInputElement).files!.length > 0) {
                            await onLoadRvmat((e.target as HTMLInputElement).files![0]);
                        }
                    };
                    input.click();
                });
            }

            this.dom.materialList.appendChild(item);
        }
    }

    renderProperties(properties: PropertyInfo[]): void {
        if (!this.dom.propertiesList) return;

        if (properties.length === 0) {
            this.dom.propertiesList.innerHTML = '<div class="properties-list-empty">No properties</div>';
            return;
        }

        const template = document.getElementById('property-item-template') as HTMLTemplateElement;
        this.dom.propertiesList.innerHTML = '';

        for (const prop of properties) {
            const clone = template.content.cloneNode(true) as DocumentFragment;
            const nameEl = clone.querySelector('.property-name') as HTMLElement;
            const valueEl = clone.querySelector('.property-value') as HTMLElement;

            nameEl.textContent = prop.name + ':';
            valueEl.textContent = prop.value;

            this.dom.propertiesList.appendChild(clone);
        }
    }
}
