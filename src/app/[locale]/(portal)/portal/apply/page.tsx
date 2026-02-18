import { getActiveCountries, getActiveVisaTypes } from "../actions";
import { ApplyClient } from "./apply-client";

export default async function ApplyPage() {
  const [countries, visaTypes] = await Promise.all([
    getActiveCountries(),
    getActiveVisaTypes(),
  ]);
  return <ApplyClient countries={countries} visaTypes={visaTypes} />;
}
