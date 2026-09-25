import { supabase, isLiveSupabase, localStore, BookingEntity, SpaceEntity } from '../config/supabase.js';

export interface OverlapCheckParams {
  space_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  exclude_booking_id?: string;
  seats?: number;
}

export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

export function doTimesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = parseTimeToMinutes(startA);
  const aEnd = parseTimeToMinutes(endA);
  const bStart = parseTimeToMinutes(startB);
  const bEnd = parseTimeToMinutes(endB);

  return aStart < bEnd && aEnd > bStart;
}

export function calculateTotalPrice(
  start_time: string,
  end_time: string,
  price_per_hour: number,
  seats: number = 1
): number {
  const startMin = parseTimeToMinutes(start_time);
  const endMin = parseTimeToMinutes(end_time);
  const durationHours = (endMin - startMin) / 60;
  return Math.round(durationHours * price_per_hour * seats * 100) / 100;
}

export class BookingService {
  /**
   * Vérifie si un créneau est disponible compte tenu de la capacité de l'espace et des places demandées
   */
  static async checkOverlap(params: OverlapCheckParams): Promise<{
    hasOverlap: boolean;
    conflictingBooking?: BookingEntity;
    availableSeats?: number;
    totalCapacity?: number;
  }> {
    const { space_id, booking_date, start_time, end_time, exclude_booking_id, seats = 1 } = params;
    const space = await this.getSpace(space_id);
    const cap = space ? (space.capacity || 1) : 1;
    const isExclusiveRoom = !space || ['office', 'booth'].includes(space.type) || cap <= 1;

    if (isLiveSupabase) {
      // Requête Supabase PostgreSQL
      const query = supabase
        .from('bookings')
        .select('*')
        .eq('space_id', space_id)
        .eq('booking_date', booking_date)
        .in('status', ['pending', 'confirmed'])
        .lt('start_time', end_time)
        .gt('end_time', start_time);

      if (exclude_booking_id) {
        query.neq('id', exclude_booking_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        if (isExclusiveRoom) {
          return { hasOverlap: true, conflictingBooking: data[0] as BookingEntity, availableSeats: 0, totalCapacity: cap };
        }
        const bookedSeats = data.reduce((sum: number, b: any) => sum + (b.seats !== undefined ? Number(b.seats) : 1), 0);
        if (bookedSeats + seats > cap) {
          return {
            hasOverlap: true,
            conflictingBooking: data[0] as BookingEntity,
            availableSeats: Math.max(0, cap - bookedSeats),
            totalCapacity: cap
          };
        }
      }
      return { hasOverlap: false, availableSeats: cap, totalCapacity: cap };
    }

    // Local in-memory check
    const overlapping = localStore.bookings.filter((b) => {
      if (b.space_id !== space_id) return false;
      if (b.booking_date !== booking_date) return false;
      if (b.status === 'cancelled') return false;
      if (exclude_booking_id && b.id === exclude_booking_id) return false;

      return doTimesOverlap(start_time, end_time, b.start_time, b.end_time);
    });

    if (overlapping.length > 0) {
      if (isExclusiveRoom) {
        return { hasOverlap: true, conflictingBooking: overlapping[0], availableSeats: 0, totalCapacity: cap };
      }
      const bookedSeats = overlapping.reduce((sum, b) => sum + (b.seats !== undefined ? Number(b.seats) : 1), 0);
      if (bookedSeats + seats > cap) {
        return {
          hasOverlap: true,
          conflictingBooking: overlapping[0],
          availableSeats: Math.max(0, cap - bookedSeats),
          totalCapacity: cap
        };
      }
    }

    return {
      hasOverlap: false,
      availableSeats: cap,
      totalCapacity: cap
    };
  }

  /**
   * Récupère un espace par son identifiant
   */
  static async getSpace(spaceId: string): Promise<SpaceEntity | null> {
    if (isLiveSupabase) {
      const { data, error } = await supabase.from('spaces').select('*').eq('id', spaceId).single();
      if (error || !data) return null;
      return data as SpaceEntity;
    }
    const cleanId = String(spaceId);
    return (
      localStore.spaces.find(
        (s) =>
          s.id === cleanId ||
          s.id.endsWith(cleanId.padStart(12, '0')) ||
          s.id === `10000000-0000-0000-0000-${cleanId.padStart(12, '0')}`
      ) || null
    );
  }
}
