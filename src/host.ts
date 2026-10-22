// Where the app is running. Inside a claude.ai artifact viewer the page is
// sandboxed: plain downloads and the share sheet are blocked, so files go
// through the viewer's «downloads» capability (the viewer asks to confirm).

interface DownloadsCapability {
  save: (request: { filename: string; data: Blob | string | ArrayBuffer }) => Promise<{ status: 'saved' | 'delivered' }>
}

type ClaudeHost = { use?: (name: string) => Promise<unknown> }

function host(): ClaudeHost | undefined {
  return (globalThis as unknown as { claude?: ClaudeHost }).claude
}

/** True inside a claude.ai artifact viewer. */
export const inArtifact = typeof host()?.use === 'function'

let downloads: Promise<DownloadsCapability | null> | null = null

/** The viewer's downloads capability, or null outside an artifact (or when the viewer can't save files). */
export function hostDownloads(): Promise<DownloadsCapability | null> {
  if (!inArtifact) return Promise.resolve(null)
  // A refusal is not remembered: the next save asks the viewer again.
  downloads ??= host()!
    .use!('downloads')
    .then((d) => (d as DownloadsCapability | null) ?? null)
    .catch(() => null)
    .then((d) => {
      if (!d) downloads = null
      return d
    })
  return downloads
}

/** Spanish message for a failed viewer save; null when the viewer simply declined. */
export function saveErrorMessage(code: string | undefined, filename = ''): string | null {
  switch (code) {
    case 'declined':
      return null
    case 'rate_limited':
      return 'Ya hay una descarga esperando tu confirmación. Acéptala o cancélala y vuelve a intentarlo.'
    case 'too_large':
      if (filename.endsWith('.zip')) return 'El ZIP es demasiado grande para este visor. Prueba con menos páginas, en JPG o con «Imágenes sueltas».'
      if (filename.endsWith('.json')) return 'El proyecto pesa demasiado para guardarlo desde este visor por las fotos que incluye. Descarga las imágenes en su lugar.'
      return 'La imagen es demasiado grande para este visor. Prueba en JPG o con calidad Normal.'
    case 'rejected_extension':
    case 'extension_not_enabled':
      return 'Este visor no permite descargar este tipo de archivo.'
    default:
      return 'Este visor no permite guardar archivos ahora mismo.'
  }
}
