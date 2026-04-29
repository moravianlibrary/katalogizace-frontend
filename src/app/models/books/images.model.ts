import { ID } from '../shared/id.model';

export type PageType =
  | 'TitlePage'
  | 'TableOfContents'
  | 'FrontCover'
  | 'BackCover'
  | 'Impressum'
  | 'LastPageRoman'
  | 'LastPageArabic'
  | 'Fiducial'
  | 'Article'
  | 'Map'
  | 'Unknown';

export interface ApiImageItem {
  image_id: ID;
  page_categories: PageType[];
}

export type ImgItem = {
  id: ID;
  pageType: string | null;

  thumbUrl: string | null;
  thumbLoading: boolean;
  thumbError: string | null;

  fullUrl: string | null;
  fullLoading: boolean;
  fullError: string | null;
};
