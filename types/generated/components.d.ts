import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksGallery extends Struct.ComponentSchema {
  collectionName: 'components_blocks_galleries';
  info: {
    description: 'Squelette SOCLE, enrichi par CONTENU';
    displayName: 'Gallery';
    icon: 'picture';
  };
  attributes: {
    images: Schema.Attribute.Media<'images', true>;
  };
}

export interface BlocksQuote extends Struct.ComponentSchema {
  collectionName: 'components_blocks_quotes';
  info: {
    description: 'Squelette SOCLE, enrichi par CONTENU';
    displayName: 'Quote';
    icon: 'quote';
  };
  attributes: {
    author: Schema.Attribute.String;
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface BlocksRichText extends Struct.ComponentSchema {
  collectionName: 'components_blocks_rich_texts';
  info: {
    description: 'Squelette SOCLE, enrichi par CONTENU';
    displayName: 'Rich text';
    icon: 'align-left';
  };
  attributes: {
    body: Schema.Attribute.Blocks;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: 'Metadonnees SEO, partage entre article et category';
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 70;
      }>;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'blocks.gallery': BlocksGallery;
      'blocks.quote': BlocksQuote;
      'blocks.rich-text': BlocksRichText;
      'shared.seo': SharedSeo;
    }
  }
}
