# P3D Viewer

Unified interactive 3D viewer for P3D model files supporting both MLOD (text-based) and ODOL (binary) formats.

## Features

- **Auto-detection**: Automatically detects MLOD vs ODOL format
- **Drag & Drop**: Drop .p3d files directly into the browser
- **Multiple LODs**: Switch between different Level of Detail (LOD) models
- **Material Support**: Load and apply .rvmat files
- **Texture Loading**: Support for .paa, .png, and .jpg textures
- **PBR Rendering**: Full physically-based rendering with normal maps, specular, etc.
- **Named Selections**: View and inspect model named selections
- **Wireframe Mode**: Toggle wireframe overlay
- **Camera Controls**: Orbit, zoom, and pan controls

## Supported Formats

- **MLOD**: Text-based P3D format
- **ODOL**: Binary P3D format (versions 28-73+)

## Usage

```bash
npm install
npm run demo
```

This will build the viewer and open it in your default browser.

## File Support

- `.p3d` - Model files (both MLOD and ODOL)
- `.rvmat` - Material definitions
- `.paa` - Texture files (DXT compressed)
- `.png`, `.jpg` - Standard texture formats

## Controls

- **Left Mouse**: Rotate camera
- **Right Mouse**: Pan camera
- **Scroll**: Zoom in/out
- **Drop Zone**: Drag and drop files to load

## Development

```bash
npm run build   # Build the viewer
npm run serve   # Serve without rebuilding
```
