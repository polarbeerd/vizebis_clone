import { getActiveCountries } from "../actions";
import { ApplyClient } from "./apply-client";

export default async function ApplyPage() {
  const countries = await getActiveCountries();
  return <ApplyClient countries={countries} />;
}
