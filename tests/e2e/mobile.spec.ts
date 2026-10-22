// Phone-sized end-to-end test: every major flow of the mobile editor with
// touch input on an iPhone-sized viewport.
import { test, expect, devices, type Page } from '@playwright/test'
import JSZip from 'jszip'
import fs from 'node:fs'
import zlib from 'node:zlib'

// Chromium with the iPhone viewport, touch and user agent (WebKit is not installed).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType, ...iPhone } = devices['iPhone 13']
test.use({ ...iPhone, deviceScaleFactor: 1.5 })

/** Small solid PNG (round badge) built without external tools. */
function makePng(size: number, rgb: [number, number, number]): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf: Buffer) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4
      const inside = (x - size / 2) ** 2 + (y - size / 2) ** 2 < (size / 2.2) ** 2
      raw[i] = rgb[0]
      raw[i + 1] = rgb[1]
      raw[i + 2] = rgb[2]
      raw[i + 3] = inside ? 255 : 0
    }
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

async function state<T>(page: Page, fn: string): Promise<T> {
  return page.evaluate(`(() => { const g = window.__goat; const ed = g.editor.getState(); const ui = g.ui.getState(); const slide = ed.project.slides.find(x => x.id === ed.activeSlideId); ${fn} })()`) as Promise<T>
}

const selectedNames = (page: Page) => state<string[]>(page, 'return slide.elements.filter(e => ed.selection.includes(e.id)).map(e => e.name)')
const elementCount = (page: Page) => state<number>(page, 'return slide.elements.length')
const pageCount = (page: Page) => state<number>(page, 'return ed.project.slides.length')

/** Tap the centre of the first element matching a JS predicate. */
async function tapElement(page: Page, predicate: string) {
  const c = await state<{ x: number; y: number }>(
    page,
    `const el = slide.elements.find(${predicate});
     const ws = document.querySelector('[data-testid=canvas-workspace]').getBoundingClientRect();
     return { x: ws.left + ui.pan.x + (el.x + el.width / 2) * ui.zoom, y: ws.top + ui.pan.y + (el.y + el.height / 2) * ui.zoom }`,
  )
  await page.touchscreen.tap(c.x, c.y)
}

/** Tap empty pasteboard to clear the selection. */
async function tapEmpty(page: Page) {
  const ws = (await page.getByTestId('canvas-workspace').boundingBox())!
  await page.touchscreen.tap(ws.x + 6, ws.y + 6)
}

const HEADLINE = `e => e.type === 'text' && e.fontSize >= 100`

test('mobile editor: create, edit, pages, elements, photos, preview, export', async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /STUDIO/ })).toBeVisible({ timeout: 30_000 })

  // New carousel: vertical 3:4 is the default and the phone gets the mobile editor.
  await page.getByTestId('new-project').tap()
  await page.getByTestId('create-project').tap()
  await expect(page.getByTestId('mobile-editor')).toBeVisible()
  await expect(page.getByTestId('m-page')).toHaveCount(7)
  expect(await state<string>(page, 'return ed.project.format.preset')).toBe('vertical')
  // The canvas fills most of the screen.
  const ws = (await page.getByTestId('canvas-workspace').boundingBox())!
  expect(ws.height).toBeGreaterThan(page.viewportSize()!.height * 0.55)

  // Select the headline with a tap: floating pill + contextual tools appear.
  await tapElement(page, HEADLINE)
  await expect(page.getByTestId('selection-pill')).toBeVisible()
  await expect(page.getByTestId('context-bar')).toBeVisible()

  // Edit text: the sheet shows real words (not {tokens}) and changes ONLY this text.
  const headlineBefore = await state<string>(page, 'return ed.project.match.headline')
  await page.getByTestId('pill-edit').tap()
  const box = page.getByTestId('m-text-sheet').getByLabel('Texto')
  await expect(box).toBeVisible()
  await expect(box).not.toHaveValue(/\{/)
  await box.fill('El Barça no perdona en [[casa]]')
  await page.getByTestId('m-text-done').tap()
  expect(await state<string>(page, `return slide.elements.find(${HEADLINE}).text`)).toBe('El Barça no perdona en [[casa]]')
  expect(await state<string>(page, 'return ed.project.match.headline')).toBe(headlineBefore)

  // Style tools: metallic/gradient finish.
  await page.getByTestId('tool-effect').tap()
  await page.getByRole('button', { name: 'Degradado' }).tap()
  expect(await state<string>(page, 'return slide.elements.find(e => ed.selection.includes(e.id)).effect')).toBe('gradient')

  // Duplicate, delete and one-tap undo (no confirmation dialog).
  const n0 = await elementCount(page)
  await page.getByTestId('pill-duplicate').tap()
  expect(await elementCount(page)).toBe(n0 + 1)
  await page.getByTestId('pill-delete').tap()
  expect(await elementCount(page)).toBe(n0)
  await page.getByTestId('toast-action').tap()
  expect(await elementCount(page)).toBe(n0 + 1)

  // Copy on page 1, paste on page 2.
  await tapElement(page, HEADLINE)
  await page.getByTestId('pill-more').tap()
  await page.getByTestId('more-copy').tap()
  await page.getByTestId('m-page').nth(1).tap()
  const p2 = await elementCount(page)
  await page.getByTestId('m-paste').tap()
  expect(await elementCount(page)).toBe(p2 + 1)
  await expect(page.getByTestId('m-paste')).toHaveCount(0)
  await tapEmpty(page)

  // Multi-selection: three elements move together by the same amount, one tap removes one.
  await page.getByTestId('m-page').first().tap()
  await tapElement(page, HEADLINE)
  await page.getByTestId('tool-multi').tap()
  await expect(page.getByTestId('m-multi-banner')).toBeVisible()
  await tapElement(page, `e => e.type === 'crest' && e.side === 'home'`)
  await tapElement(page, `e => e.type === 'crest' && e.side === 'away'`)
  expect(await state<number>(page, 'return ed.selection.length')).toBe(3)
  const ys = () => state<number[]>(page, 'return slide.elements.filter(e => ed.selection.includes(e.id)).map(e => e.y)')
  const y0 = await ys()
  const from = await state<{ x: number; y: number }>(page, `const el = slide.elements.find(e => e.type === 'crest' && e.side === 'home'); const ws = document.querySelector('[data-testid=canvas-workspace]').getBoundingClientRect(); return { x: ws.left + ui.pan.x + (el.x + el.width / 2) * ui.zoom, y: ws.top + ui.pan.y + (el.y + el.height / 2) * ui.zoom }`)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] })
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x, y: from.y + i * 5 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(async () => (await ys())[0]).not.toBe(y0[0])
  const dy = (await ys()).map((y, i) => Math.round(y - y0[i]))
  expect(new Set(dy).size).toBe(1)
  await tapElement(page, `e => e.type === 'crest' && e.side === 'away'`)
  expect(await state<number>(page, 'return ed.selection.length')).toBe(2)
  await page.getByTestId('m-multi-done').tap()
  await expect(page.getByTestId('m-multi-banner')).toHaveCount(0)
  await tapEmpty(page)

  // Elements library: add an «Acertado» badge.
  await page.getByTestId('m-nav-elements').tap()
  await page.getByRole('tab', { name: 'Etiquetas' }).tap()
  await page.getByTestId('m-el-badge-hit').tap()
  expect(await selectedNames(page)).toEqual(['Acertado'])
  await tapEmpty(page)

  // Templates: add a photo news page, then fill its photo from the bottom nav.
  await page.getByTestId('m-nav-templates').tap()
  await page.getByRole('tab', { name: 'Noticias' }).tap()
  await page.getByTestId('m-template-breaking-news').tap()
  await expect(page.getByTestId('m-page')).toHaveCount(8)
  await page.getByTestId('m-nav-photos').tap()
  await page.getByTestId('m-photo-input').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: makePng(320, [40, 120, 200]) })
  await expect.poll(() => state<boolean>(page, `return !!slide.elements.find(e => e.type === 'image' && e.name === 'Foto').assetId`)).toBe(true)
  expect(await selectedNames(page)).toEqual(['Foto'])
  // The photo darkens itself under the content on top; the «Sombra» tool adjusts it.
  await page.getByTestId('tool-shade').tap()
  await page.getByTestId('tool-panel').getByLabel('Sombra').fill('0.4')
  expect(await state<number>(page, `return slide.elements.find(e => e.name === 'Foto').autoShade`)).toBeCloseTo(0.4, 2)
  await tapEmpty(page)

  // Crest replacement from the canvas updates the match (every page).
  await page.getByTestId('m-page').first().tap()
  await tapElement(page, `e => e.type === 'crest'`)
  await page.getByTestId('tool-crest').tap()
  await page.getByTestId('m-photo-input').setInputFiles({ name: 'escudo.png', mimeType: 'image/png', buffer: makePng(256, [165, 0, 68]) })
  await expect.poll(() => state<string | null>(page, 'return ed.project.match.home.crestAssetId')).not.toBeNull()
  await tapEmpty(page)

  // Page actions: duplicate, delete with undo, blank page with chrome.
  await page.getByTestId('m-page').first().tap() // active page → options
  await page.getByTestId('page-duplicate').tap()
  expect(await pageCount(page)).toBe(9)
  await page.getByTestId('m-page').nth(1).tap()
  await page.getByTestId('page-delete').tap()
  expect(await pageCount(page)).toBe(8)
  await page.getByTestId('toast-action').tap()
  expect(await pageCount(page)).toBe(9)
  await page.getByTestId('m-add-page').tap()
  await page.getByTestId('new-blank').tap()
  expect(await pageCount(page)).toBe(10)
  expect(await state<string[]>(page, 'return slide.elements.map(e => e.name)')).toEqual(expect.arrayContaining(['Nº de página']))

  // Format change with undo.
  await page.getByTestId('m-nav-style').tap()
  await page.getByRole('button', { name: /Story/ }).first().tap()
  expect(await state<string>(page, 'return ed.project.format.preset')).toBe('story')
  await page.getByTestId('toast-action').tap()
  expect(await state<string>(page, 'return ed.project.format.preset')).toBe('vertical')
  await page.getByRole('button', { name: 'Cerrar' }).first().tap()

  // Focus mode and full-screen preview.
  await page.getByTestId('m-menu').tap()
  await page.getByTestId('menu-focus').tap()
  await expect(page.getByTestId('m-nav')).toHaveCount(0)
  await page.getByTestId('m-exit-focus').tap()
  await expect(page.getByTestId('m-nav')).toBeVisible()
  await page.getByTestId('m-preview').tap()
  await expect(page.getByTestId('m-preview-screen').getByTestId('preview-frame')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('m-preview-close').tap()

  // «Guardar en Fotos»: without a share sheet (headless browser) the press-and-hold screen opens.
  await page.getByTestId('m-download').tap()
  await page.getByTestId('save-photos').tap()
  await expect(page.getByTestId('photo-gallery')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId('photo-gallery').locator('img')).toHaveCount(10)
  await page.getByTestId('photo-gallery-close').tap()
  await expect(page.getByTestId('photo-gallery')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cerrar' }).first().tap()

  // Export everything as a ZIP of 3:4 PNGs.
  await page.getByTestId('m-download').tap()
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 180_000 }), page.getByTestId('do-export').tap()])
  expect(download.suggestedFilename()).toMatch(/\.zip$/)
  const zipPath = test.info().outputPath('mobile.zip')
  await download.saveAs(zipPath)
  const zip = await JSZip.loadAsync(fs.readFileSync(zipPath))
  const names = Object.keys(zip.files)
  expect(names).toHaveLength(10)
  for (const name of names) {
    const buf = await zip.files[name].async('nodebuffer')
    expect(buf.readUInt32BE(16)).toBe(1080)
    expect(buf.readUInt32BE(20)).toBe(1440)
  }
})
