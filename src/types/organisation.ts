/** Flat organisation object from `GET /organisation`. */
export interface Organisation {
  id?: number;
  name?: string;
  registrationCode?: string;
  legalCountryCode?: string;
  legalAddress?: string;
  legalCity?: string;
  legalPostcode?: string;
  email?: string;
  vatNumber?: string;
  mainCurrencyCode?: string;
  mainLanguageCode?: string;
  [key: string]: unknown;
}
