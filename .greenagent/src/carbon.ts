/**
 * Carbon estimation for LLM inference.
 *
 * Based on:
 * - Google's AI Environmental Report (2025): ~0.3 Wh per typical prompt
 * - IEA World Energy Outlook: regional carbon intensity
 * - Luccioni et al. (2023): Power Hungry Processing
 */

// Energy per token (Wh) — estimated from public research
const ENERGY_PER_TOKEN_WH = 0.0003;

// Datacenter PUE — industry middle ground
const PUE_FACTOR = 1.2;

// Regional carbon intensity (gCO2/kWh) — from IEA 2024
export const CARBON_INTENSITY: Record<string, number> = {
  eu_avg:      250,
  nordics:     30,
  lithuania:   120,
  us_avg:      390,
  us_west:     220,
  us_east:     350,
  uk:          200,
  germany:     340,
  france:      60,
  india:       700,
  china:       550,
  global_avg:  450,
};

// Water per token (mL)
const WATER_PER_TOKEN_ML = 0.000325;

export function estimateEnergyWh(totalTokens: number): number {
  return totalTokens * ENERGY_PER_TOKEN_WH * PUE_FACTOR;
}

export function estimateCarbonMg(energyWh: number, region: string = 'eu_avg'): number {
  const intensity = CARBON_INTENSITY[region] ?? CARBON_INTENSITY['global_avg'];
  return (energyWh / 1000) * intensity * 1000;
}

export function estimateWaterMl(totalTokens: number): number {
  return totalTokens * WATER_PER_TOKEN_ML;
}

// Comparisons for making numbers relatable
const COMPARISONS = {
  smartphoneChargeWh: 14.0,
  googleSearchWh:     0.3,
  ledBulbHourWh:      10.0,
  kmDrivenGco2:       120.0,
  cupOfCoffeeGco2:    21.0,
  emailGco2:          4.0,
};

export function makeRelatable(energyWh: number = 0, carbonMg: number = 0): string[] {
  const comparisons: string[] = [];

  if (energyWh > 0) {
    const searches = energyWh / COMPARISONS.googleSearchWh;
    const phonePct = (energyWh / COMPARISONS.smartphoneChargeWh) * 100;
    comparisons.push(`≈ ${searches.toFixed(1)} Google searches`);
    comparisons.push(`≈ ${phonePct.toFixed(2)}% of a smartphone charge`);
  }

  if (carbonMg > 0) {
    const carbonG = carbonMg / 1000;
    const km = carbonG / COMPARISONS.kmDrivenGco2;
    const emails = carbonG / COMPARISONS.emailGco2;
    comparisons.push(`≈ driving ${(km * 1000).toFixed(1)} meters`);
    comparisons.push(`≈ ${emails.toFixed(1)} emails worth of CO₂`);
  }

  return comparisons;
}
