import { beforeEach, describe, expect, it } from 'vitest'
import { activeSlideOf, useEditor } from './editor'
import { newProject } from '../model/defaults'
import { buildMatchCarousel } from '../templates'
import { text } from '../model/elements'

function openCarousel() {
  const p = newProject({ preset: 'story' })
  p.slides = buildMatchCarousel(p)
  useEditor.getState().open(p)
  return p
}

beforeEach(() => {
  useEditor.getState().close()
})

describe('editor store', () => {
  it('opens a carousel on its first slide', () => {
    const p = openCarousel()
    expect(useEditor.getState().activeSlideId).toBe(p.slides[0].id)
  })

  it('undoes and redoes edits', () => {
    openCarousel()
    const ed = useEditor.getState()
    ed.update((d) => void (d.match.away.name = 'Getafe'))
    expect(useEditor.getState().project!.match.away.name).toBe('Getafe')
    useEditor.getState().undo()
    expect(useEditor.getState().project!.match.away.name).toBe('Barcelona')
    useEditor.getState().redo()
    expect(useEditor.getState().project!.match.away.name).toBe('Getafe')
  })

  it('coalesces rapid edits with the same key into one undo step', () => {
    openCarousel()
    const ed = useEditor.getState()
    for (const v of ['G', 'Ge', 'Get', 'Geta']) ed.update((d) => void (d.match.away.name = v), { key: 'typing' })
    expect(useEditor.getState().past).toHaveLength(1)
    useEditor.getState().undo()
    expect(useEditor.getState().project!.match.away.name).toBe('Barcelona')
  })

  it('adds, duplicates, copies/pastes, reorders and deletes elements', () => {
    openCarousel()
    const ed = useEditor.getState()
    const el = text({ name: 'Nuevo' })
    ed.addElement(el)
    expect(useEditor.getState().selection).toEqual([el.id])
    useEditor.getState().duplicateSelection()
    const slide = activeSlideOf(useEditor.getState())!
    expect(slide.elements.filter((e) => e.name === 'Nuevo')).toHaveLength(2)
    useEditor.getState().copySelection()
    useEditor.getState().paste()
    expect(activeSlideOf(useEditor.getState())!.elements.filter((e) => e.name === 'Nuevo')).toHaveLength(3)
    useEditor.getState().reorderSelection('bottom')
    expect(activeSlideOf(useEditor.getState())!.elements[0].name).toBe('Nuevo')
    useEditor.getState().deleteSelection()
    expect(activeSlideOf(useEditor.getState())!.elements.filter((e) => e.name === 'Nuevo')).toHaveLength(2)
  })

  it('never deletes locked elements', () => {
    openCarousel()
    const locked = activeSlideOf(useEditor.getState())!.elements.find((e) => e.locked)!
    useEditor.getState().select([locked.id])
    useEditor.getState().deleteSelection()
    expect(activeSlideOf(useEditor.getState())!.elements.some((e) => e.id === locked.id)).toBe(true)
  })

  it('duplicates, reorders and deletes slides', () => {
    const p = openCarousel()
    const ed = useEditor.getState()
    ed.duplicateSlide(p.slides[0].id)
    expect(useEditor.getState().project!.slides).toHaveLength(8)
    const copy = useEditor.getState().project!.slides[1]
    expect(copy.id).not.toBe(p.slides[0].id)
    expect(copy.elements[0].id).not.toBe(p.slides[0].elements[0].id)
    useEditor.getState().moveSlide(0, 7)
    expect(useEditor.getState().project!.slides[7].id).toBe(p.slides[0].id)
    useEditor.getState().deleteSlide(copy.id)
    expect(useEditor.getState().project!.slides).toHaveLength(7)
  })
})
