import type { UnitKind } from '@/src/data/units';

export type Player = {
  idx: number;
  name: string;
  color: string;
  isHuman: boolean;
};

export type Unit = {
  id: string;
  kind: UnitKind;
  ownerIdx: number;
  x: number;
  y: number;
  movesLeft: number;
};

export type City = {
  id: string;
  ownerIdx: number;
  name: string;
  x: number;
  y: number;
  population: number;
  building: UnitKind | null;
  production: number;
  productionPerTurn: number;
};
