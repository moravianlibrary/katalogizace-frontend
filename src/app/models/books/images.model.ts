import { UUID } from '../shared/id.model';

export type PageType =
  | 'TitlePage'
  | 'TableOfContents'
  | 'FrontCover'
  | 'BackCover'
  | 'Impressum'
  | 'EndPage'
  | 'Unknown';

export interface ApiImageItem {
  image_id: UUID;
  page_type: PageType | null;
}

export interface ImgItem {
  id: string;
  url: string;
  loading: boolean;
  error: string | null;
  pageType: string;
}
