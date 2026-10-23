// Renders the GOAT SOCIETY identity proposals to brand/proposals/.
// Needs the Vite dev server: `npx vite --port 5173` in another terminal, then
// `node scripts/brand/export.mjs`. Uses the project's own Playwright Chromium.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const out = path.join(root, 'brand/proposals')
const url = process.env.GOAT_DEV ?? 'http://localhost:5173/'
const only = process.argv[2]

fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
page.on('pageerror', (e) => console.error('[page]', e.message))
await page.goto(url)
await page.waitForTimeout(1500)

const files = await page.evaluate(async (only) => {
  const id = await import('/scripts/brand/identity.ts')
  await id.ready()
  const png = (c) => c.toDataURL('image/png')
  const res = {}
  const avatars = [
    ['avatar-1-marfil', id.LOOKS.marfil],
    ['avatar-2-obsidiana', id.LOOKS.obsidiana],
    ['avatar-3-halo-verde', id.LOOKS.halo],
  ]
  for (const [name, look] of avatars) if (!only || name.includes(only)) res[name] = png(id.renderAvatar(look))
  const crests = [
    ['crest-1-anillo', 'anillo'],
    ['crest-2-bicolor', 'bicolor'],
    ['crest-3-minimal', 'minimal'],
  ]
  for (const [name, design] of crests) if (!only || name.includes(only)) res[name] = png(id.renderCrest(id.LOOKS.marfil, design))
  return res
}, only)

for (const [name, data] of Object.entries(files)) {
  fs.writeFileSync(path.join(out, `${name}.png`), Buffer.from(data.split(',')[1], 'base64'))
  console.log('wrote', `brand/proposals/${name}.png`)
}
await browser.close()
