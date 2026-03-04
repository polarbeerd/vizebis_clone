// Simple in-process FX rate cache (1 hour TTL)
let fxCache: { EUR_TRY: number; EUR_DKK: number; fetchedAt: number } | null =
  null;
const FX_TTL_MS = 60 * 60 * 1000;

export async function fetchFxRates(): Promise<{
  EUR_TRY: number;
  EUR_DKK: number;
}> {
  if (fxCache && Date.now() - fxCache.fetchedAt < FX_TTL_MS) {
    return { EUR_TRY: fxCache.EUR_TRY, EUR_DKK: fxCache.EUR_DKK };
  }
  const resp = await fetch("https://open.er-api.com/v6/latest/EUR");
  if (!resp.ok) throw new Error("FX API unavailable");
  const data = await resp.json();
  const rates = {
    EUR_TRY: data.rates?.TRY as number,
    EUR_DKK: data.rates?.DKK as number,
  };
  if (!rates.EUR_TRY || !rates.EUR_DKK)
    throw new Error("Incomplete FX response");
  fxCache = { ...rates, fetchedAt: Date.now() };
  return rates;
}
