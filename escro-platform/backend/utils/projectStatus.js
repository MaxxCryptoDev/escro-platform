/**
 * Centralized status state-machine for projects.
 * Use these constants and helpers instead of inline status arrays in controllers.
 */

// Statuses where a prestator can be (re)assigned
export const ASSIGNABLE_STATUSES = [
  'pending_admin_approval',
  'pending_assignment',
  'pending_expert_approval',
  'open',
  'assigned',
  'in_progress',
];

// Terminal statuses where most mutations are blocked
export const TERMINAL_STATUSES = ['completed', 'cancelled', 'rejected'];

// Statuses where admin can still edit (before contract signed)
export const ADMIN_EDITABLE_STATUSES = ['pending_admin_approval', 'pending_client_approval'];

// Statuses where the project is "active" (work in progress)
export const ACTIVE_STATUSES = ['assigned', 'open', 'in_progress', 'delivered'];

// Statuses where unassign is allowed (block on terminal/disputed/delivered)
export const UNASSIGNABLE_TERMINAL = [...TERMINAL_STATUSES, 'disputed', 'delivered'];

export function isAssignable(status) {
  return ASSIGNABLE_STATUSES.includes(status);
}

export function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

export function isAdminEditable(status) {
  return ADMIN_EDITABLE_STATUSES.includes(status);
}

export function canUnassign(status) {
  return !UNASSIGNABLE_TERMINAL.includes(status);
}

export function canCancel(status) {
  return !isTerminal(status);
}
