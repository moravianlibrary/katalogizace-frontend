export type CatalogueBase = 'SKC' | 'NKC' | 'AUT' | 'SCK';

export type AutocompleteSuggestion = {
  value: string;
  count: number;
};

export type AutocompleteResponse = {
  query: string;
  field: string;
  subfield: string;
  suggestions: AutocompleteSuggestion[];
};

export type AutocompletDictionaryResponse = {
  '7': string | null;
  a: string;
};
