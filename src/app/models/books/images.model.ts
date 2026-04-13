import { ID } from '../shared/id.model';

export type PageType =
  | 'TitlePage'
  | 'TableOfContents'
  | 'FrontCover'
  | 'BackCover'
  | 'Impressum'
  | 'EndPage'
  | 'Fiducial'
  | 'Article'
  | 'Unknown';

export interface ApiImageItem {
  image_id: ID;
  page_type: PageType | null;
}

export interface ImgItem {
  id: ID;
  url: string;
  loading: boolean;
  error: string | null;
  pageType: string;
}
