// Build GOAT SOCIETY STUDIO as one self-contained HTML file for a claude.ai
// artifact: `npm run build:artifact` → dist-artifact/goat-society-studio.html
//
// The artifact viewer only runs inline code (plus a few CDNs), blocks plain
// downloads and wraps the page in its own <html>/<head>/<body> skeleton. So
// the Vite artifact build (one JS bundle, one CSS file, fonts as data URIs)
// is inlined here into page content without a document skeleton of its own.
// Also writes preview.html, the same content wrapped the way the viewer
// wraps it, for local testing.
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
// ARTIFACT_DIR builds somewhere else (e.g. while the last build is still being tested).
const out = path.resolve(root, process.env.ARTIFACT_DIR ?? 'dist-artifact')

execSync(`npx vite build --mode artifact --outDir ${JSON.stringify(out)} --emptyOutDir`, { cwd: root, stdio: 'inherit' })

const index = fs.readFileSync(path.join(out, 'index.html'), 'utf8')
const jsRef = /<script type="module"[^>]*src="\.\/([^"]+\.js)"[^>]*><\/script>/.exec(index)
const cssRef = /<link rel="stylesheet"[^>]*href="\.\/([^"]+\.css)"[^>]*>/.exec(index)
if (!jsRef || !cssRef) throw new Error(`Could not find the bundle in ${out}/index.html`)

let js = fs.readFileSync(path.join(out, jsRef[1]), 'utf8')
let css = fs.readFileSync(path.join(out, cssRef[1]), 'utf8')

// Everything must be inside the two files: no chunks, fonts or images left on disk.
const leftovers = fs.readdirSync(path.join(out, 'assets')).filter((f) => f !== path.basename(jsRef[1]) && f !== path.basename(cssRef[1]))
if (leftovers.length) throw new Error(`Assets were not inlined: ${leftovers.join(', ')}`)
if (/["'`(]\.\/assets\//.test(js) || /url\(\.?\/?assets\//.test(css)) throw new Error('The bundle still references ./assets/ files')

// A literal "</script" or "<!--" inside the inline module would end or derail
// the <script> element. They only occur in strings; escape them there.
js = js.replace(/<\/(script)/gi, '<\\/$1')
if (js.includes('<!--')) js = js.replaceAll('<!--', '<\\!--')
css = css.replace(/<\/(style)/gi, '<\\/$1')

// The viewer's reset (14 px system font, light color-scheme) is unlayered, so it
// beats Tailwind's layered base styles: restate the studio's own base here.
const overrides = `:root:root{color-scheme:dark;background:#08090b}html body{margin:0;background:#08090b;color:#f3f0e8;font:400 16px/1.5 'Inter Variable',ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}`

const page = [
  '<title>GOAT Society Studio</title>',
  '<meta name="description" content="Estudio gráfico para carruseles y posts de fútbol con la identidad GOAT SOCIETY.">',
  '<meta name="theme-color" content="#08090B">',
  `<style>${css}</style>`,
  `<style>${overrides}</style>`,
  '<div id="root"></div>',
  `<script type="module">${js}</script>`,
  '',
].join('\n')

const file = path.join(out, 'goat-society-studio.html')
fs.writeFileSync(file, page)

// Local stand-in for the viewer's skeleton (charset, viewport-fit=cover, small reset).
const reset = ':root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}'
fs.writeFileSync(
  path.join(out, 'preview.html'),
  `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${reset}</style></head><body>${page}</body></html>`,
)

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`
console.log(`\n${path.relative(root, file)}: ${mb(Buffer.byteLength(page))} (JS ${mb(Buffer.byteLength(js))}, CSS ${mb(Buffer.byteLength(css))})`)
