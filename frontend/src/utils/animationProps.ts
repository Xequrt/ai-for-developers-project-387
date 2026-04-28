/**
 * Pure utility functions for styles, ARIA attributes, animations and form validation.
 * Used by components and property-based tests.
 */

import type { TargetAndTransition } from 'motion/react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SlotInput {
  available: boolean
  selected: boolean
  startTime: string
  endTime: string
}

export interface CellInput {
  date: string        // YYYY-MM-DD
  count: number
  selected: boolean
  disabled: boolean
}

export type ElementType = 'timeslot' | 'calendar-cell' | 'event-card'
export type AnimatedComponent = 'timeslot' | 'calendar-cell' | 'page-transition' | 'event-details'

export interface SlotStyles {
  background: string
  border: string
  cursor: string
  color: string
  boxShadow?: string
}

export interface SlotAria {
  ariaLabel: string
  ariaPressed: boolean
}

export interface CellAria {
  ariaLabel: string
  ariaPressed: boolean
  ariaDisabled: boolean
}

export type HoverProps = TargetAndTransition

export interface AnimationProps {
  initial?: TargetAndTransition
  animate?: TargetAndTransition
  exit?: TargetAndTransition
  transition?: Record<string, unknown>
  whileHover?: TargetAndTransition
}

export interface FormValidationResult {
  nameError?: string
  emailError?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ─── Slot styles ─────────────────────────────────────────────────────────────

export function getSlotStyles(slot: Pick<SlotInput, 'available' | 'selected'>): SlotStyles {
  if (slot.selected) {
    return {
      background: '#007AFF',
      border: '2px solid #007AFF',
      cursor: 'pointer',
      color: '#FFFFFF',
      boxShadow: '0 2px 8px rgba(0,122,255,0.3)',
    }
  }
  if (slot.available) {
    return {
      background: '#E5F4FF',
      border: '2px solid transparent',
      cursor: 'pointer',
      color: '#1C1C1E',
    }
  }
  return {
    background: '#F2F2F7',
    border: '2px solid transparent',
    cursor: 'default',
    color: '#C7C7CC',
  }
}

// ─── Slot ARIA ────────────────────────────────────────────────────────────────

export function getSlotAria(slot: SlotInput): SlotAria {
  const start = formatTime(slot.startTime)
  const end = formatTime(slot.endTime)
  const status = slot.available ? 'Свободно' : 'Занято'
  return {
    ariaLabel: `${start} – ${end} — ${status}`,
    ariaPressed: slot.selected,
  }
}

// ─── Cell ARIA ────────────────────────────────────────────────────────────────

export function getCellAria(cell: CellInput): CellAria {
  const dateLabel = formatDateLabel(cell.date)
  const countLabel = cell.count > 0
    ? `${cell.count} свободных слотов`
    : 'нет слотов'
  return {
    ariaLabel: `${dateLabel}, ${countLabel}`,
    ariaPressed: cell.selected,
    ariaDisabled: cell.disabled,
  }
}

// ─── Hover props ──────────────────────────────────────────────────────────────

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 20 }

export function getHoverProps(elementType: ElementType): HoverProps {
  if (elementType === 'calendar-cell') {
    return { scale: 1.05, transition: SPRING }
  }
  return {
    scale: 1.02,
    boxShadow: '0 4px 12px rgba(0,122,255,0.15)',
    transition: SPRING,
  }
}

// ─── Animation props ──────────────────────────────────────────────────────────

export function getAnimationProps(
  component: AnimatedComponent,
  options: { prefersReducedMotion?: boolean } = {},
): AnimationProps {
  const { prefersReducedMotion = false } = options

  if (prefersReducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.01 },
    }
  }

  if (component === 'page-transition') {
    return {
      initial: { opacity: 0, x: 50 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -50 },
      transition: { duration: 0.3, ease: 'easeInOut' },
    }
  }

  if (component === 'event-details') {
    return {
      initial: { opacity: 0, y: 4 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -4 },
      transition: { duration: 0.2 },
    }
  }

  // timeslot, calendar-cell
  const hover = getHoverProps(component as ElementType)
  return {
    whileHover: hover,
  }
}

// ─── Form validation ──────────────────────────────────────────────────────────

export function validateForm(values: { name: string; email: string }): FormValidationResult {
  const result: FormValidationResult = {}
  if (!values.name.trim()) {
    result.nameError = 'Введите имя'
  }
  if (!values.email.trim() || !values.email.includes('@')) {
    result.emailError = 'Введите корректный email'
  }
  return result
}
