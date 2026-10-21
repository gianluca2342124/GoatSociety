// Inside the artifact viewer, files must go through window.claude.use('downloads').
import { afterEach, describe, expect, it, vi } from 'vitest'

type Save = (r: { filename: string; data: unknown }) => Promise<{ status: string }>

async function loadWithViewer(save: Save | null) {
  vi.resetModules()
  ;(globalThis as unknown as { claude?: unknown }).claude = { use: async (name: string) => (name === 'downloads' ? (save ? { save } : null) : null) }
  return import('./render/exporter')
}

afterEach(() => {
  delete (globalThis as unknown as { claude?: unknown }).claude
  vi.resetModules()
})

describe('downloads inside the artifact viewer', () => {
  it('hands the file to the viewer instead of clicking a download link', async () => {
    const save = vi.fn<Save>(async () => ({ status: 'saved' }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    const { downloadBlob, canShareFiles } = await loadWithViewer(save)
    const blob = new Blob(['x'], { type: 'image/png' })
    await expect(downloadBlob(blob, 'goat-01.png')).resolves.toBe(true)
    expect(save).toHaveBeenCalledWith({ filename: 'goat-01.png', data: blob })
    expect(click).not.toHaveBeenCalled()
    expect(canShareFiles()).toBe(false)
    click.mockRestore()
  })

  it('treats a declined prompt as a cancel, not an error', async () => {
    const { downloadBlob, downloadFiles } = await loadWithViewer(async () => Promise.reject({ code: 'declined' }))
    await expect(downloadBlob(new Blob(['x']), 'a.zip')).resolves.toBe(false)
    await expect(downloadFiles([new File(['x'], 'a.png'), new File(['y'], 'b.png')])).resolves.toBe(0)
  })

  it('explains other failures in Spanish', async () => {
    const { downloadBlob } = await loadWithViewer(async () => Promise.reject({ code: 'rate_limited' }))
    await expect(downloadBlob(new Blob(['x']), 'a.zip')).rejects.toThrow(/confirmación/)
  })

  it('says saving is unavailable when the viewer offers no downloads', async () => {
    const { downloadBlob } = await loadWithViewer(null)
    await expect(downloadBlob(new Blob(['x']), 'a.zip')).rejects.toThrow(/no permite guardar/)
  })
})
