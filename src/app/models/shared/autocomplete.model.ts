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
