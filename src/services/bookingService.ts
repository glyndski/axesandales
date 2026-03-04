import { Booking, User } from '../types';
import { generateUUID } from '../utils';

export interface BookingInput {
  date: string;
  tableId: string;
  terrainBoxId: string;
  gameSystem: string;
  playerCount: number;
  taggedPlayerIds: string[];
}

export interface BookingValidationContext {
  cancelledDates: string[];
  user: User;
  existingBookings: Booking[];
  editingBookingId?: string;
}

export interface BookingValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate booking input before persisting.
 */
export function validateBooking(
  input: BookingInput,
  context: BookingValidationContext
): BookingValidationResult {
  if (context.cancelledDates.includes(input.date)) {
    return { valid: false, error: 'This date has been cancelled. Bookings are not allowed.' };
  }

  if (!context.user.isMember) {
    return { valid: false, error: 'Your membership is not active. Please contact an admin.' };
  }

  if (!input.tableId) {
    return { valid: false, error: 'Please select a table and enter a game system.' };
  }

  if (!input.gameSystem) {
    return { valid: false, error: 'Please select a table and enter a game system.' };
  }

  // Check table availability for the given date
  const conflicting = context.existingBookings.find(
    b => b.date === input.date &&
         b.tableId === input.tableId &&
         b.status === 'active' &&
         b.id !== context.editingBookingId
  );
  if (conflicting) {
    return { valid: false, error: `Table is already booked by ${conflicting.memberName}.` };
  }

  // Check terrain availability (if selected)
  if (input.terrainBoxId) {
    const terrainConflict = context.existingBookings.find(
      b => b.date === input.date &&
           b.terrainBoxId === input.terrainBoxId &&
           b.status === 'active' &&
           b.id !== context.editingBookingId
    );
    if (terrainConflict) {
      return { valid: false, error: `Terrain is already reserved by ${terrainConflict.memberName}.` };
    }
  }

  return { valid: true };
}

/**
 * Build a Booking object from validated input.
 * All fields are set to Firestore-safe values (no undefined).
 */
export function createBookingFromInput(
  input: BookingInput,
  user: User,
  editingBooking?: Booking | null
): Booking {
  return {
    id: editingBooking ? editingBooking.id : generateUUID(),
    date: input.date,
    tableId: input.tableId,
    terrainBoxId: input.terrainBoxId || null,
    memberName: user.name,
    memberId: user.id,
    gameSystem: input.gameSystem,
    playerCount: input.playerCount,
    taggedPlayerIds: input.taggedPlayerIds,
    timestamp: Date.now(),
    status: editingBooking ? editingBooking.status : 'active',
  };
}

/**
 * Ensure a booking object contains no undefined values (Firestore rejects them).
 */
export function sanitizeBookingForFirestore(booking: Booking): Booking {
  return {
    id: booking.id,
    date: booking.date,
    tableId: booking.tableId,
    terrainBoxId: booking.terrainBoxId ?? null,
    memberName: booking.memberName,
    memberId: booking.memberId,
    gameSystem: booking.gameSystem,
    playerCount: booking.playerCount,
    taggedPlayerIds: booking.taggedPlayerIds ?? [],
    timestamp: booking.timestamp,
    status: booking.status,
    ...(booking.cancelledAt !== undefined ? { cancelledAt: booking.cancelledAt } : {}),
    ...(booking.cancelledBy !== undefined ? { cancelledBy: booking.cancelledBy } : {}),
  };
}

/**
 * Check whether a user is allowed to cancel/edit a booking.
 */
export function canModifyBooking(booking: Booking, user: User | null): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  return booking.memberId === user.id;
}

/**
 * Build the cancellation update payload (mirrors firebaseService.cancelBooking).
 */
export function buildCancellationUpdate(cancelledByUserId: string): {
  status: 'cancelled';
  cancelledAt: number;
  cancelledBy: string;
} {
  return {
    status: 'cancelled',
    cancelledAt: Date.now(),
    cancelledBy: cancelledByUserId,
  };
}
