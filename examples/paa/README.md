# PAA Viewer

Interactive viewer for PAA texture files from Bohemia Interactive games (Arma, DayZ).

## Features

- **Drag & Drop**: Drop .paa files directly into the browser
- **Mipmap Browsing**: Switch between different mipmap levels
- **Format Support**: Full DXT compression and uncompressed formats
- **Export**: Export any mipmap level as PNG
- **Channel Inspection**: View individual RGBA channels
- **Modern UI**: Dark theme with real-time preview

## Supported Formats

- **DXT1/DXT2/DXT3/DXT4/DXT5**: BC1/BC2/BC3 compressed textures
- **RGBA 5551**: 16-bit color with 1-bit alpha
- **RGBA 4444**: 16-bit color with 4-bit alpha
- **RGBA 8888**: 32-bit true color
- **AI88**: 8-bit grayscale with alpha

## Usage

```bash
npm install
npm run demo
```

This will build the viewer and open it in your default browser.

## File Support

- `.paa` - PAA texture files

## Controls

- **Drop Zone**: Drag and drop files to load
- **Mipmap Slider**: Navigate through mipmap levels
- **Channel Buttons**: Toggle RGBA channel view
- **Export Button**: Save current mipmap as PNG

## Development

```bash
npm run build   # Build the viewer
npm run serve   # Serve without rebuilding
```
