# EDDS Viewer

Interactive viewer for EDDS (DDS) texture files supporting various compression formats.

## Features

- **Drag & Drop**: Drop .edds files directly into the browser
- **Mipmap Browsing**: Switch between different mipmap levels
- **Format Support**: BC1/BC2/BC3 and RGBA/BGRA textures
- **Export**: Export any mipmap level as PNG
- **Interactive UI**: Modern interface with real-time preview

## Supported Formats

- **BC1/BC2/BC3**: DXT1/DXT2/DXT3/DXT4/DXT5 compressed textures
- **RGBA/BGRA**: Uncompressed textures

## Usage

```bash
npm install
npm run demo
```

This will build the viewer and open it in your default browser.

## File Support

- `.edds` - DDS texture files

## Controls

- **Drop Zone**: Drag and drop files to load
- **Mipmap Slider**: Navigate through mipmap levels
- **Export Button**: Save current mipmap as PNG

## Development

```bash
npm run build   # Build the viewer
npm run serve   # Serve without rebuilding
```

## Notes

- Cubemaps and BC4/BC5+ are parsed but not fully rendered yet
- If you change the library code, re-run the build before refreshing
