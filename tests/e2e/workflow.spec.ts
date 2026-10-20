// End-to-end test of the complete GOAT SOCIETY STUDIO workflow (brief §21).
import { test, expect, type Page } from '@playwright/test'
import JSZip from 'jszip'
import fs from 'node:fs'
import zlib from 'node:zlib'

/** Minimal valid PNG (solid color badge) generated without external tools. */
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
  return page.evaluate(`(() => { const g = window.__goat; const ed = g.editor.getState(); const ui = g.ui.getState(); ${fn} })()`) as Promise<T>
}

async function elementCenter(page: Page, name: string) {
  return state<{ x: number; y: number; w: number; h: number; left: number; top: number }>(
    page,
    `const s = ed.project.slides.find(x => x.id === ed.activeSlideId);
     const el = s.elements.find(e => e.name === ${JSON.stringify(name)});
     const ws = document.querySelector('[data-testid=canvas-workspace]').getBoundingClientRect();
     return { x: ws.left + ui.pan.x + (el.x + el.width / 2) * ui.zoom, y: ws.top + ui.pan.y + (el.y + el.height / 2) * ui.zoom, w: el.width * ui.zoom, h: el.height * ui.zoom, left: ws.left + ui.pan.x + el.x * ui.zoom, top: ws.top + ui.pan.y + el.y * ui.zoom }`,
  )
}

test('complete carousel workflow: create, edit, save, reload, export', async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /STUDIO/ })).toBeVisible({ timeout: 30_000 })

  // 1–3. New carousel, select a match and enter two team names.
  await page.getByTestId('new-project').click()
  await page.getByTestId('mode-carousel').click()
  await page.getByLabel('Equipo local').fill('Barcelona')
  await page.getByRole('button', { name: 'Barcelona' }).first().click()
  await page.getByLabel('Equipo visitante').fill('Getafe')
  await page.getByRole('button', { name: 'Getafe' }).first().click()
  await page.getByTestId('create-project').click()
  await expect(page.getByTestId('canvas-workspace')).toBeVisible()
  await expect(page.getByTestId('slide-thumb')).toHaveCount(7)
  expect(await state<string>(page, 'return ed.project.match.home.name + "|" + ed.project.match.away.name')).toBe('Barcelona|Getafe')

  // 4. Upload two club badges (applied project-wide).
  await page.getByTestId('tab-teams').click()
  await page.getByLabel('Equipos').getByTestId('asset-file-input').setInputFiles({ name: 'barcelona.png', mimeType: 'image/png', buffer: makePng(256, [165, 0, 68]) })
  await expect.poll(() => state<string | null>(page, 'return ed.project.match.home.crestAssetId')).not.toBeNull()
  await page.getByRole('radio', { name: 'Getafe' }).click()
  await page.getByLabel('Equipos').getByTestId('asset-file-input').setInputFiles({ name: 'getafe.png', mimeType: 'image/png', buffer: makePng(256, [0, 89, 153]) })
  await expect.poll(() => state<string | null>(page, 'return ed.project.match.away.crestAssetId')).not.toBeNull()

  // 5–6. Update the match date and create a headline.
  await page.getByTestId('tab-match').click()
  await page.getByLabel('Fecha', { exact: true }).fill('2026-11-08')
  await page.getByLabel('Titular principal').fill('El Barça no perdona en [[casa]]')
  expect(await state<string>(page, 'return ed.project.match.date')).toBe('2026-11-08')
  expect(await state<string>(page, 'return ed.project.match.headline')).toContain('[[casa]]')

  // 7–9. Add a statistic comparison, change the values and verify the bars update.
  await page.getByTestId('tab-stats').click()
  await page.getByRole('button', { name: 'Añadir métrica' }).click()
  const row = page.getByTestId('stat-row').last()
  await row.getByLabel('Nombre de la métrica').fill('Goles esperados')
  await row.getByLabel('Barça Goles esperados').fill('5,43')
  await row.getByLabel('Getafe Goles esperados').fill('1,57')
  const awayBar = row.locator('div.rounded-full > div').nth(1)
  await expect.poll(async () => Number(/width: ([\d.]+)%/.exec((await awayBar.getAttribute('style')) ?? '')?.[1])).toBeCloseTo((1.57 / 5.43) * 100, 1)
  await row.getByLabel('Barça Goles esperados').fill('3,20')
  await expect.poll(async () => Number(/width: ([\d.]+)%/.exec((await awayBar.getAttribute('style')) ?? '')?.[1])).toBeCloseTo((1.57 / 3.2) * 100, 1)
  // Also place a comparison chart on the current slide.
  await page.getByTestId('tab-charts').click()
  await page.getByTestId('add-chart-Barras enfrentadas').click()
  expect(await state<number>(page, 'return ed.project.slides.find(s => s.id === ed.activeSlideId).elements.filter(e => e.type === "statBars").length')).toBeGreaterThan(0)

  // 10–11. Create a tactical slide, move players and add arrows.
  await page.getByTestId('tab-templates').click()
  await page.getByTestId('template-tactical-board').getByRole('button').first().click()
  await expect(page.getByTestId('slide-thumb')).toHaveCount(8)
  const board = await elementCenter(page, 'Pizarra')
  await page.mouse.dblclick(board.x, board.y)
  await expect.poll(() => state<string | null>(page, 'return ui.tacticsEditId')).not.toBeNull()
  const positions = 'return JSON.stringify(ed.project.slides.find(s => s.id === ed.activeSlideId).elements.find(e => e.type === "tactics").tactics.players.map(p => [p.x, p.y]))'
  const before = await state<string>(page, positions)
  // Drag a player handle (Konva circle) found through the stage.
  const handle = await page.evaluate(() => {
    const K = (window as unknown as { Konva: { stages: { find: (s: string) => { draggable: () => boolean; getClientRect: () => { x: number; y: number; width: number; height: number } }[]; container: () => HTMLElement }[] } }).Konva
    const stage = K.stages[0]
    const circles = stage.find('Circle').filter((c) => c.draggable())
    const r = circles[Math.floor(circles.length / 2)].getClientRect()
    const box = stage.container().getBoundingClientRect()
    return { x: box.left + r.x + r.width / 2, y: box.top + r.y + r.height / 2 }
  })
  await page.mouse.move(handle.x, handle.y)
  await page.mouse.down()
  await page.mouse.move(handle.x + 40, handle.y - 50, { steps: 10 })
  await page.mouse.up()
  await expect.poll(() => state<string>(page, positions)).not.toBe(before)
  const annBefore = await state<number>(page, 'return ed.project.slides.find(s => s.id === ed.activeSlideId).elements.find(e => e.type === "tactics").tactics.annotations.length')
  await page.getByRole('button', { name: 'Flecha', exact: true }).first().click()
  await page.mouse.move(board.left + board.w * 0.3, board.top + board.h * 0.7)
  await page.mouse.down()
  await page.mouse.move(board.left + board.w * 0.6, board.top + board.h * 0.35, { steps: 12 })
  await page.mouse.up()
  await expect.poll(() => state<number>(page, 'return ed.project.slides.find(s => s.id === ed.activeSlideId).elements.find(e => e.type === "tactics").tactics.annotations.length')).toBe(annBefore + 1)
  await page.keyboard.press('Escape')

  // 12–13. Add a locked prediction slide and change its blur intensity.
  await page.getByTestId('template-locked-prediction').getByRole('button').first().click()
  await expect(page.getByTestId('slide-thumb')).toHaveCount(9)
  await page.evaluate(() => {
    const g = (window as unknown as { __goat: { editor: { getState: () => { project: { slides: { id: string; elements: { id: string; type: string }[] }[] }; activeSlideId: string; select: (ids: string[]) => void } } } }).__goat
    const ed = g.editor.getState()
    const s = ed.project.slides.find((x) => x.id === ed.activeSlideId)!
    ed.select([s.elements.find((e) => e.type === 'prediction')!.id])
  })
  const blur = page.getByLabel('Intensidad del desenfoque')
  await blur.fill('41')
  await expect.poll(() => state<number>(page, 'return ed.project.slides.find(s => s.id === ed.activeSlideId).elements.find(e => e.type === "prediction").blurIntensity')).toBe(41)

  // 14. Add a Telegram promotional slide (the templates panel is still open).
  if (!(await page.getByTestId('template-community').isVisible())) await page.getByTestId('tab-templates').click()
  await page.getByTestId('template-community').getByRole('button').first().click()
  await expect(page.getByTestId('slide-thumb')).toHaveCount(10)

  // 15–17. Save, reload and verify the project is intact.
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByTestId('save-state')).toContainText('Guardado')
  const snapshot = await state<string>(page, 'return JSON.stringify({ n: ed.project.slides.length, home: ed.project.match.home.name, away: ed.project.match.away.name, date: ed.project.match.date, crest: ed.project.match.home.crestAssetId, stats: ed.project.match.stats.length })')
  await page.reload()
  await expect(page.getByTestId('project-card').first()).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('project-card').first().getByRole('button').first().click()
  await expect(page.getByTestId('slide-thumb')).toHaveCount(10)
  expect(await state<string>(page, 'return JSON.stringify({ n: ed.project.slides.length, home: ed.project.match.home.name, away: ed.project.match.away.name, date: ed.project.match.date, crest: ed.project.match.home.crestAssetId, stats: ed.project.match.stats.length })')).toBe(snapshot)
  expect(await state<number>(page, 'return ed.project.slides.flatMap(s => s.elements).find(e => e.type === "prediction" && e.mode === "locked").blurIntensity')).toBe(41)

  // 18. Export the full carousel as a ZIP.
  await page.getByTestId('open-export').click()
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 180_000 }), page.getByTestId('do-export').click()])
  expect(download.suggestedFilename()).toBe('goat-society-barcelona-getafe.zip')
  const zipPath = test.info().outputPath('carousel.zip')
  await download.saveAs(zipPath)

  // 19. Verify every image: name, dimensions and real rendered content.
  const zip = await JSZip.loadAsync(fs.readFileSync(zipPath))
  const names = Object.keys(zip.files).sort()
  expect(names).toEqual(Array.from({ length: 10 }, (_, i) => `goat-society-barcelona-getafe-${String(i + 1).padStart(2, '0')}.png`))
  for (const name of names) {
    const buf = await zip.files[name].async('nodebuffer')
    expect(buf.readUInt32BE(16)).toBe(1080)
    expect(buf.readUInt32BE(20)).toBe(1920)
    const stats = await page.evaluate(async (b64) => {
      const img = new Image()
      img.src = `data:image/png;base64,${b64}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = 270
      c.height = 480
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, 270, 480)
      const d = ctx.getImageData(0, 0, 270, 480).data
      let sum = 0
      let sum2 = 0
      let transparent = 0
      for (let i = 0; i < d.length; i += 4) {
        const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11
        sum += l
        sum2 += l * l
        if (d[i + 3] < 250) transparent++
      }
      const n = d.length / 4
      return { std: Math.sqrt(sum2 / n - (sum / n) ** 2), transparent }
    }, buf.toString('base64'))
    // Opaque, non-blank, real content (text, crests, charts).
    expect(stats.transparent).toBe(0)
    expect(stats.std).toBeGreaterThan(8)
  }
})
