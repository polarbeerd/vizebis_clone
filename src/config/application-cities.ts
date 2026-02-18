/**
 * Application cities per country.
 * Keys are Turkish country names (matching `countries.name` in the DB).
 * Each city has a `value` (stored in DB) and locale labels.
 */

export interface CityOption {
  value: string;
  label_tr: string;
  label_en: string;
}

function city(tr: string, en?: string): CityOption {
  return { value: tr, label_tr: tr, label_en: en ?? tr };
}

const CITIES_BY_COUNTRY: Record<string, CityOption[]> = {
  "İtalya": [
    city("Adana"),
    city("Ankara"),
    city("Antalya"),
    city("Bodrum"),
    city("Bursa"),
    city("Gaziantep"),
    city("İstanbul", "Istanbul"),
    city("İzmir", "Izmir"),
    city("Trabzon"),
  ],
  "İspanya": [
    city("Ankara"),
    city("Antalya"),
    city("İstanbul", "Istanbul"),
    city("İzmir", "Izmir"),
  ],
  "Yunanistan": [
    city("Ankara"),
    city("Antalya"),
    city("Bursa"),
    city("Gaziantep"),
    city("İstanbul", "Istanbul"),
    city("İzmir", "Izmir"),
    city("Trabzon"),
  ],
  "Hollanda": [
    city("Ankara"),
    city("Antalya"),
    city("Bodrum"),
    city("Bursa"),
    city("Edirne"),
    city("Gaziantep"),
    city("İstanbul", "Istanbul"),
    city("İzmir", "Izmir"),
  ],
  "Portekiz": [
    city("Ankara"),
    city("İstanbul", "Istanbul"),
  ],
  "Avusturya": [
    city("Ankara"),
    city("Antalya"),
    city("Bodrum"),
    city("Bursa"),
    city("Edirne"),
    city("Gaziantep"),
    city("İstanbul", "Istanbul"),
    city("İzmir", "Izmir"),
    city("Trabzon"),
  ],
  "İsviçre": [
    city("Ankara"),
    city("İstanbul", "Istanbul"),
  ],
  "Danimarka": [
    city("Ankara"),
    city("Antalya"),
    city("Gaziantep"),
    city("İstanbul", "Istanbul"),
    city("İzmir", "Izmir"),
  ],
  "Çekya": [
    city("Ankara"),
    city("Antalya"),
    city("İstanbul", "Istanbul"),
    city("İzmir", "Izmir"),
  ],
};

/** Max cities that fit in a segmented pill control */
export const SEGMENTED_THRESHOLD = 4;

export function getCitiesForCountry(countryName: string): CityOption[] {
  return CITIES_BY_COUNTRY[countryName] ?? [];
}
