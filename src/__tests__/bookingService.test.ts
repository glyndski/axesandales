import { describe, it, expect } from 'vitest';
import {
  validateBooking,
  createBookingFromInput,
  sanitizeBookingForFirestore,
  BookingInput,
  BookingValidationContext,
} from '../services/bookingService';
import { Booking, User } from '../types';

// ─── Test helpers ───────────────────────────────────────

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  isMember: true,
  isAdmin: false,
  ...overrides,
});

const makeInput = (overrides: Partial<BookingInput> = {}): BookingInput => ({
  date: '2026-03-10',
  tableId: 'L1',
  terrainBoxId: '',
  gameSystem: 'Warhammer 40k',
  playerCount: 2,
  taggedPlayerIds: [],
  ...overrides,
});

const makeBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'booking-1',
  date: '2026-03-10',
  tableId: 'L1',
  terrainBoxId: null,
  memberName: 'Other User',
  memberId: 'user-2',
  gameSystem: 'Warhammer 40k',
  playerCount: 2,
  taggedPlayerIds: [],
  timestamp: 1000,
  status: 'active',
  ...overrides,
});

const makeContext = (overrides: Partial<BookingValidationContext> = {}): BookingValidationContext => ({
  cancelledDates: [],
  user: makeUser(),
  existingBookings: [],
  ...overrides,
});

// ─── validateBooking ────────────────────────────────────

describe('validateBooking', () => {
  it('accepts a valid booking', () => {
    const result = validateBooking(makeInput(), makeContext());
    expect(result).toEqual({ valid: true });
  });

  it('rejects a booking on a cancelled date', () => {
    const result = validateBooking(
      makeInput(),
      makeContext({ cancelledDates: ['2026-03-10'] })
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/cancelled/i);
  });

  it('rejects a booking from a non-member', () => {
    const result = validateBooking(
      makeInput(),
      makeContext({ user: makeUser({ isMember: false }) })
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/membership/i);
  });

  it('rejects when no table is selected', () => {
    const result = validateBooking(
      makeInput({ tableId: '' }),
      makeContext()
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/table/i);
  });

  it('rejects when no game system is entered', () => {
    const result = validateBooking(
      makeInput({ gameSystem: '' }),
      makeContext()
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/game system/i);
  });

  it('rejects when the table is already booked on that date', () => {
    const existing = makeBooking({ id: 'other-booking', tableId: 'L1', date: '2026-03-10' });
    const result = validateBooking(
      makeInput({ tableId: 'L1', date: '2026-03-10' }),
      makeContext({ existingBookings: [existing] })
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/already booked/i);
  });

  it('allows the same table when editing that booking', () => {
    const existing = makeBooking({ id: 'booking-1', tableId: 'L1', date: '2026-03-10' });
    const result = validateBooking(
      makeInput({ tableId: 'L1', date: '2026-03-10' }),
      makeContext({ existingBookings: [existing], editingBookingId: 'booking-1' })
    );
    expect(result.valid).toBe(true);
  });

  it('allows a table booked on a different date', () => {
    const existing = makeBooking({ tableId: 'L1', date: '2026-03-17' });
    const result = validateBooking(
      makeInput({ tableId: 'L1', date: '2026-03-10' }),
      makeContext({ existingBookings: [existing] })
    );
    expect(result.valid).toBe(true);
  });

  it('ignores cancelled bookings when checking table conflicts', () => {
    const cancelled = makeBooking({ tableId: 'L1', date: '2026-03-10', status: 'cancelled' });
    const result = validateBooking(
      makeInput({ tableId: 'L1', date: '2026-03-10' }),
      makeContext({ existingBookings: [cancelled] })
    );
    expect(result.valid).toBe(true);
  });

  it('rejects when terrain is already reserved on that date', () => {
    const existing = makeBooking({ terrainBoxId: 'terrain-1', date: '2026-03-10' });
    const result = validateBooking(
      makeInput({ terrainBoxId: 'terrain-1', date: '2026-03-10', tableId: 'L2' }),
      makeContext({ existingBookings: [existing] })
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/terrain.*reserved/i);
  });

  it('allows terrain reserved on a different date', () => {
    const existing = makeBooking({ terrainBoxId: 'terrain-1', date: '2026-03-17' });
    const result = validateBooking(
      makeInput({ terrainBoxId: 'terrain-1', date: '2026-03-10', tableId: 'L2' }),
      makeContext({ existingBookings: [existing] })
    );
    expect(result.valid).toBe(true);
  });

  it('allows no-terrain booking even if terrain is taken', () => {
    const existing = makeBooking({ terrainBoxId: 'terrain-1', date: '2026-03-10' });
    const result = validateBooking(
      makeInput({ terrainBoxId: '', date: '2026-03-10', tableId: 'L2' }),
      makeContext({ existingBookings: [existing] })
    );
    expect(result.valid).toBe(true);
  });
});

// ─── createBookingFromInput ─────────────────────────────

describe('createBookingFromInput', () => {
  it('creates a new booking with active status and a generated ID', () => {
    const user = makeUser();
    const input = makeInput({ taggedPlayerIds: ['user-3'] });
    const booking = createBookingFromInput(input, user);

    expect(booking.id).toBeTruthy();
    expect(booking.date).toBe('2026-03-10');
    expect(booking.tableId).toBe('L1');
    expect(booking.terrainBoxId).toBeNull(); // empty string -> null
    expect(booking.memberName).toBe('Test User');
    expect(booking.memberId).toBe('user-1');
    expect(booking.gameSystem).toBe('Warhammer 40k');
    expect(booking.playerCount).toBe(2);
    expect(booking.taggedPlayerIds).toEqual(['user-3']);
    expect(booking.status).toBe('active');
    expect(booking.timestamp).toBeGreaterThan(0);
  });

  it('preserves existing ID and status when editing', () => {
    const existingBooking = makeBooking({ id: 'existing-id', status: 'active' });
    const user = makeUser();
    const input = makeInput({ gameSystem: 'Age of Sigmar' });
    const booking = createBookingFromInput(input, user, existingBooking);

    expect(booking.id).toBe('existing-id');
    expect(booking.status).toBe('active');
    expect(booking.gameSystem).toBe('Age of Sigmar');
  });

  it('sets terrainBoxId to null when no terrain selected', () => {
    const booking = createBookingFromInput(makeInput({ terrainBoxId: '' }), makeUser());
    expect(booking.terrainBoxId).toBeNull();
  });

  it('preserves terrainBoxId when terrain is selected', () => {
    const booking = createBookingFromInput(makeInput({ terrainBoxId: 'terrain-1' }), makeUser());
    expect(booking.terrainBoxId).toBe('terrain-1');
  });

  it('always sets taggedPlayerIds as an array, never undefined', () => {
    const booking = createBookingFromInput(makeInput({ taggedPlayerIds: [] }), makeUser());
    expect(booking.taggedPlayerIds).toEqual([]);
    expect(booking.taggedPlayerIds).not.toBeUndefined();
  });
});

// ─── sanitizeBookingForFirestore ────────────────────────

describe('sanitizeBookingForFirestore', () => {
  it('returns a booking with no undefined values', () => {
    const booking = makeBooking();
    const sanitized = sanitizeBookingForFirestore(booking);

    // Check every field is defined
    for (const [key, value] of Object.entries(sanitized)) {
      expect(value, `field '${key}' should not be undefined`).not.toBeUndefined();
    }
  });

  it('converts undefined taggedPlayerIds to empty array', () => {
    // Simulate old data loaded from Firestore that may lack taggedPlayerIds
    const raw = { ...makeBooking() } as Record<string, unknown>;
    delete raw.taggedPlayerIds;
    const sanitized = sanitizeBookingForFirestore(raw as unknown as Booking);
    expect(sanitized.taggedPlayerIds).toEqual([]);
  });

  it('converts undefined terrainBoxId to null', () => {
    const raw = { ...makeBooking() } as Record<string, unknown>;
    delete raw.terrainBoxId;
    const sanitized = sanitizeBookingForFirestore(raw as unknown as Booking);
    expect(sanitized.terrainBoxId).toBeNull();
  });

  it('preserves cancellation metadata when present', () => {
    const booking = makeBooking({
      status: 'cancelled',
      cancelledAt: 12345,
      cancelledBy: 'admin-1',
    });
    const sanitized = sanitizeBookingForFirestore(booking);
    expect(sanitized.cancelledAt).toBe(12345);
    expect(sanitized.cancelledBy).toBe('admin-1');
  });

  it('omits cancellation metadata when not present', () => {
    const booking = makeBooking();
    const sanitized = sanitizeBookingForFirestore(booking);
    expect('cancelledAt' in sanitized).toBe(false);
    expect('cancelledBy' in sanitized).toBe(false);
  });
});
