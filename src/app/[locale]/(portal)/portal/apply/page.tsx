import {
  getActiveCountries,
  getActiveVisaTypes,
  getFormFields,
  getSmartFieldAssignments,
} from "../actions";
import { ApplyClient } from "./apply-client";

export default async function ApplyPage() {
  const [countries, visaTypes, formFields, smartAssignments] =
    await Promise.all([
      getActiveCountries(),
      getActiveVisaTypes(),
      getFormFields(),
      getSmartFieldAssignments(),
    ]);
  return (
    <ApplyClient
      countries={countries}
      visaTypes={visaTypes}
      formFields={formFields}
      smartAssignments={smartAssignments}
    />
  );
}
