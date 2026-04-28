// @vitest-environment node
import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import {
  getSlotStyles,
  getSlotAria,
  getCellAria,
  getHoverProps,
  getAnimationProps,
  validateForm,
} from '../utils/animationProps'

// ─── Property 2: TimeSlot state styles match spec ─────────────────────────────
// Feature: liquid-glass-design-system, Property 2: TimeSlot state styles match spec
describe('Property 2: TimeSlot state styles match spec', () => {
  it('selected slot has blue background and white text', () => {
    fc.assert(
      fc.property(
        fc.record({ available: fc.boolean(), selected: fc.constant(true) }),
        (slot) => {
          const styles = getSlotStyles(slot)
          return styles.background === '#007AFF' && styles.color === '#FFFFFF'
        },
      ),
      { numRuns: 100 },
    )
  })

  it('available (not selected) slot has light blue background and pointer cursor', () => {
    fc.assert(
      fc.property(
        fc.record({ available: fc.constant(true), selected: fc.constant(false) }),
        (slot) => {
          const styles = getSlotStyles(slot)
          return styles.background === '#E5F4FF' && styles.cursor === 'pointer'
        },
      ),
      { numRuns: 100 },
    )
  })

  it('unavailable slot has occupied background and default cursor', () => {
    fc.assert(
      fc.property(
        fc.record({ available: fc.constant(false), selected: fc.constant(false) }),
        (slot) => {
          const styles = getSlotStyles(slot)
          return styles.background === '#F2F2F7' && styles.cursor === 'default'
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── Property 5: hover spring params match spec ───────────────────────────────
// Feature: liquid-glass-design-system, Property 5: hover spring params match spec
describe('Property 5: hover spring params match spec', () => {
  it('all interactive elements use spring with stiffness=300 damping=20', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('timeslot' as const, 'calendar-cell' as const, 'event-card' as const),
        (elementType) => {
          const hover = getHoverProps(elementType)
          const t = hover.transition as { type?: string; stiffness?: number; damping?: number } | undefined
          return (
            t?.type === 'spring' &&
            t?.stiffness === 300 &&
            t?.damping === 20
          )
        },
      ),
      { numRuns: 100 },
    )
  })

  it('timeslot and event-card hover scale is 1.02', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('timeslot' as const, 'event-card' as const),
        (elementType) => (getHoverProps(elementType).scale as number) === 1.02,
      ),
      { numRuns: 100 },
    )
  })

  it('calendar-cell hover scale is 1.05', () => {
    fc.assert(
      fc.property(
        fc.constant('calendar-cell' as const),
        (elementType) => (getHoverProps(elementType).scale as number) === 1.05,
      ),
      { numRuns: 100 },
    )
  })
})

// ─── Property 6: reduced motion disables transforms ───────────────────────────
// Feature: liquid-glass-design-system, Property 6: reduced motion disables transforms
describe('Property 6: reduced motion disables transforms', () => {
  it('all components have no x/y transforms when prefers-reduced-motion', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'timeslot' as const,
          'calendar-cell' as const,
          'page-transition' as const,
          'event-details' as const,
        ),
        (component) => {
          const anim = getAnimationProps(component, { prefersReducedMotion: true })
          const hasTransform =
            (anim.initial && ('x' in anim.initial || 'y' in anim.initial)) ||
            (anim.animate && ('x' in anim.animate || 'y' in anim.animate)) ||
            (anim.exit && ('x' in anim.exit || 'y' in anim.exit))
          return !hasTransform
        },
      ),
      { numRuns: 100 },
    )
  })

  it('opacity transition duration is <= 0.01 when prefers-reduced-motion', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'page-transition' as const,
          'event-details' as const,
        ),
        (component) => {
          const anim = getAnimationProps(component, { prefersReducedMotion: true })
          const duration = (anim.transition as { duration?: number })?.duration ?? 1
          return duration <= 0.01
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── Property 7: form validation error messages ───────────────────────────────
// Feature: liquid-glass-design-system, Property 7: form validation error messages
describe('Property 7: form validation error messages', () => {
  it('whitespace-only names produce nameError', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\s*$/),
        (emptyName) => {
          const result = validateForm({ name: emptyName, email: 'valid@test.com' })
          return result.nameError === 'Введите имя'
        },
      ),
      { numRuns: 100 },
    )
  })

  it('emails without @ produce emailError', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes('@')),
        (invalidEmail) => {
          const result = validateForm({ name: 'Иван', email: invalidEmail })
          return result.emailError === 'Введите корректный email'
        },
      ),
      { numRuns: 100 },
    )
  })

  it('valid name and email produce no errors', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.trim().length > 0),
        fc.string().filter((s) => s.includes('@') && s.trim().length > 0),
        (name, email) => {
          const result = validateForm({ name, email })
          return !result.nameError && !result.emailError
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── Property 3: TimeSlot aria-label format ───────────────────────────────────
// Feature: liquid-glass-design-system, Property 3: TimeSlot aria-label format
describe('Property 3: TimeSlot aria-label format', () => {
  const TIME_REGEX = /^\d{2}:\d{2} – \d{2}:\d{2} — (Свободно|Занято)$/

  it('aria-label matches HH:MM – HH:MM — Status format', () => {
    const baseTs = new Date('2026-04-09T09:00:00.000Z').getTime()
    fc.assert(
      fc.property(
        fc.record({
          available: fc.boolean(),
          selected: fc.boolean(),
          startTime: fc.integer({ min: 0, max: 86400000 }).map((offset) => new Date(baseTs + offset).toISOString()),
          endTime: fc.integer({ min: 0, max: 86400000 }).map((offset) => new Date(baseTs + offset).toISOString()),
        }),
        (slot) => {
          const { ariaLabel } = getSlotAria(slot)
          return TIME_REGEX.test(ariaLabel)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('ariaPressed reflects selected state', () => {
    fc.assert(
      fc.property(
        fc.record({
          available: fc.boolean(),
          selected: fc.boolean(),
          startTime: fc.constant('2026-04-09T09:00:00.000Z'),
          endTime: fc.constant('2026-04-09T09:30:00.000Z'),
        }),
        (slot) => {
          const { ariaPressed } = getSlotAria(slot)
          return ariaPressed === slot.selected
        },
      ),
      { numRuns: 100 },
    )
  })
})

// ─── Property 4: CalendarGrid cell aria attributes ────────────────────────────
// Feature: liquid-glass-design-system, Property 4: CalendarGrid cell aria attributes
describe('Property 4: CalendarGrid cell aria attributes', () => {
  const DATE_LABEL_REGEX = /^\d{2}\.\d{2}\.\d{4}, .+$/

  it('aria-label matches DD.MM.YYYY, N slots format', () => {
    fc.assert(
      fc.property(
        fc.record({
          date: fc.integer({ min: 1, max: 28 }).map((d) => `2026-04-${String(d).padStart(2, '0')}`),
          count: fc.nat(20),
          selected: fc.boolean(),
          disabled: fc.boolean(),
        }),
        (cell) => {
          const { ariaLabel } = getCellAria(cell)
          return DATE_LABEL_REGEX.test(ariaLabel)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('ariaPressed reflects selected state', () => {
    fc.assert(
      fc.property(
        fc.record({
          date: fc.constant('2026-04-09'),
          count: fc.nat(10),
          selected: fc.boolean(),
          disabled: fc.boolean(),
        }),
        (cell) => getCellAria(cell).ariaPressed === cell.selected,
      ),
      { numRuns: 100 },
    )
  })

  it('ariaDisabled reflects disabled state', () => {
    fc.assert(
      fc.property(
        fc.record({
          date: fc.constant('2026-04-09'),
          count: fc.nat(10),
          selected: fc.boolean(),
          disabled: fc.boolean(),
        }),
        (cell) => getCellAria(cell).ariaDisabled === cell.disabled,
      ),
      { numRuns: 100 },
    )
  })
})
