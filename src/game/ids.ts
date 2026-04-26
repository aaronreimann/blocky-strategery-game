let unitCounter = 0;
export function nextUnitId(): string {
  unitCounter += 1;
  return `u${unitCounter}`;
}

let cityCounter = 0;
export function nextCityId(): string {
  cityCounter += 1;
  return `c${cityCounter}`;
}

// On load, sync counters past the highest existing id so new ids don't collide.
export function syncIdCounters(maxUnitId: number, maxCityId: number): void {
  unitCounter = Math.max(unitCounter, maxUnitId);
  cityCounter = Math.max(cityCounter, maxCityId);
}

export function parseIdNum(id: string): number {
  const n = parseInt(id.slice(1), 10);
  return Number.isFinite(n) ? n : 0;
}
