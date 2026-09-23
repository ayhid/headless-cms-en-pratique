import type { Schema, Struct } from '@strapi/strapi';

export interface BlocksGallery extends Struct.ComponentSchema {
  collectionName: 'components_blocks_galleries';
  info: {
    description: 'Plusieurs images affich\u00E9es en grille, avec une l\u00E9gende commune';
    displayName: 'Galerie';
    icon: 'picture';
  };
  attributes: {
    caption: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    images: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required;
  };
}

export interface BlocksQuote extends Struct.ComponentSchema {
  collectionName: 'components_blocks_quotes';
  info: {
    description: 'Citation mise en avant, avec son auteur et son r\u00F4le';
    displayName: 'Citation';
    icon: 'quote';
  };
  attributes: {
    author: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    role: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    text: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
  };
}

export interface BlocksRichText extends Struct.ComponentSchema {
  collectionName: 'components_blocks_rich_texts';
  info: {
    description: "Paragraphes, titres, listes et liens r\u00E9dig\u00E9s dans l'\u00E9diteur riche";
    displayName: 'Texte riche';
    icon: 'write';
  };
  attributes: {
    body: Schema.Attribute.Blocks & Schema.Attribute.Required;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: "M\u00E9tadonn\u00E9es SEO (titre, description, image de partage), partag\u00E9es par l'article et la cat\u00E9gorie";
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
