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
