import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { createPiece, PieceCategory } from '@activepieces/pieces-framework';
import { createPostAction } from './lib/actions/create-post';
import { generateImageAction } from './lib/actions/generate-image';
import { generateVideoAction } from './lib/actions/generate-video';
import { getRenderJobAction } from './lib/actions/get-render-job';
import { callToolAction, launchActions } from './lib/actions/launch';
import { listLibraryAction } from './lib/actions/list-library';
import { researchAdsAction } from './lib/actions/research-ads';
import { searchMetaAdsAction } from './lib/actions/search-meta-ads';
import { hermosoAuth } from './lib/auth';
import { HERMOSO_API_URL, hermosoApi } from './lib/common/client';
import { newLibraryItemTrigger } from './lib/triggers/new-library-item';

export const hermoso = createPiece({
  displayName: 'Hermoso',
  description:
    'AI marketing agent: research the ads winning in your market, make on-brand image and video ads, publish or schedule posts, and put sites live with domains, domain email and payments.',
  auth: hermosoAuth,
  minimumSupportedRelease: '0.36.1',
  logoUrl: 'https://hermoso.ai/assets/brand/apple-touch-icon.png',
  categories: [PieceCategory.MARKETING, PieceCategory.ARTIFICIAL_INTELLIGENCE],
  authors: ['hermoso-dev'],
  actions: [
    generateImageAction,
    generateVideoAction,
    getRenderJobAction,
    createPostAction,
    listLibraryAction,
    searchMetaAdsAction,
    researchAdsAction,
    ...launchActions,
    callToolAction,
    createCustomApiCallAction({
      baseUrl: () => HERMOSO_API_URL,
      auth: hermosoAuth,
      authMapping: async (auth, propsValue) => {
        hermosoApi.assertHermosoUrl(propsValue['url']?.['url']);
        return { Authorization: `Bearer ${auth.secret_text}` };
      },
    }),
  ],
  triggers: [newLibraryItemTrigger],
});
