export interface AgentCandidate {
  id: string;
  userId: string;
  zoneId: string;
  availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  currentLat: number | null;
  currentLng: number | null;
  updatedAt: Date;
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

export function findNearestAvailableAgent(
  pickupZoneId: string,
  candidates: AgentCandidate[],
  pickupLat?: number | null,
  pickupLng?: number | null
): AgentCandidate | null {
  // Candidate pool: AVAILABLE agents in the pickup zone
  const availableAgents = candidates.filter(
    a => a.availability === 'AVAILABLE' && a.zoneId === pickupZoneId
  );

  if (availableAgents.length === 0) {
    return null;
  }

  // If pickup lat/lng is available, rank by distance to agents that have lat/lng
  if (pickupLat != null && pickupLng != null) {
    const agentsWithLocation = availableAgents.filter(
      a => a.currentLat != null && a.currentLng != null
    );

    if (agentsWithLocation.length > 0) {
      agentsWithLocation.sort((a, b) => {
        const distA = calculateHaversineDistance(pickupLat, pickupLng, a.currentLat!, a.currentLng!);
        const distB = calculateHaversineDistance(pickupLat, pickupLng, b.currentLat!, b.currentLng!);
        return distA - distB;
      });
      return agentsWithLocation[0];
    }
  }

  // Fall back to FIFO by updatedAt (oldest idle time first)
  availableAgents.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  return availableAgents[0];
}
