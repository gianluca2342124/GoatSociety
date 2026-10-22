// «Deshacer» on toasts must only ever undo the change it was shown for.
import { beforeEach, describe, expect, it } from 'vitest'
import { useEditor } from '../store/editor'
import { useUI } from '../store/ui'
import { newProject } from '../model/defaults'
import { buildMatchCarousel } from '../templates'
import { changeFormat, deletePage, hideSelection } from './actions'

function openCarousel() {
  const p = newProject({ preset: 'vertical' })
  p.slides = buildMatchCarousel(p)
  useEditor.getState().open(p)
  useUI.setState({ toasts: [] })
  return p
}

const undoToasts = () => useUI.getState().toasts.filter((t) => t.action)

beforeEach(() => useEditor.getState().close())

describe('undo toasts', () => {
  it('stay bound to their change when the history is full', () => {
    openCarousel()
    for (let i = 0; i < 130; i++) useEditor.getState().update((d) => void (d.name = `N${i}`))
    deletePage()
    expect(undoToasts()).toHaveLength(1)
    useEditor.getState().update((d) => void (d.name = 'Newer'))
    expect(undoToasts()).toHaveLength(0)
  })

  it('do not offer «Deshacer» when nothing changed', () => {
    const p = openCarousel()
    const el = p.slides[0].elements[0]
    useEditor.getState().updateElement(el.id, { visible: false })
    useEditor.getState().update((d) => void (d.name = 'Other'))
    useUI.setState({ toasts: [] })
    useEditor.getState().select([el.id])
    hideSelection()
    expect(undoToasts()).toHaveLength(0)
    expect(useEditor.getState().project!.name).toBe('Other')
  })
})

describe('format changes', () => {
  it('give an edited page back exactly after trying other formats', () => {
    const p = openCarousel()
    const head = p.slides[0].elements.find((e) => e.type === 'text')!
    useEditor.getState().updateElement(head.id, { x: head.x + 3 })
    const before = JSON.stringify(useEditor.getState().project!.slides[0])
    changeFormat('story')
    changeFormat('landscape')
    changeFormat('vertical')
    expect(JSON.stringify(useEditor.getState().project!.slides[0])).toBe(before)
  })
})
