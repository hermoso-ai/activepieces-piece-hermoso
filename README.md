# Hermoso piece for Activepieces

[Hermoso](https://hermoso.ai) is an AI marketing agent: research the ads winning in your market, make on-brand image and video ads, and publish or schedule posts to your own social channels. This piece brings Hermoso into your [Activepieces](https://www.activepieces.com) flows.

## Install

Activepieces installs custom pieces from npm on any platform that allows custom pieces (self-hosted Community or Enterprise editions, and cloud platforms with custom pieces enabled).

1. Sign in as a platform admin.
2. Open **Platform Admin ▸ Pieces** (on Community edition: **Settings ▸ Pieces**) and click **Install Piece**.
3. Choose **NPM Registry**, enter the package name `@hermoso/piece-hermoso` and the version (for example `0.1.0`), then install.
4. Open any flow, add a step and search for **Hermoso**.

Over the API (platform admin token):

```bash
curl -X POST "$AP_URL/api/v1/pieces" \
  -H "Authorization: Bearer $AP_TOKEN" -H "Content-Type: application/json" \
  -d '{"packageType":"REGISTRY","scope":"PLATFORM","pieceName":"@hermoso/piece-hermoso","pieceVersion":"0.1.0"}'
```

## Connect

1. Sign in at [app.hermoso.ai](https://app.hermoso.ai) (free to start).
2. Open **MCP & CLI** and create an API key (it starts with `hmk_`).
3. In Activepieces, create a Hermoso connection and paste the key.

## Actions

| Action | What it does |
| --- | --- |
| Generate Image | A finished image ad from a prompt, using the product photos and logo saved on your brand. |
| Generate Video | A video from a prompt; returns the finished file (one to three minutes). |
| Get Render Job | The status of a render, and the finished file once it is done. |
| Create Post | Publish a post now, at a set time, or in the next free slot of the brand posting queue, on your connected channels. |
| List Library Items | The newest images and videos in a brand Library. |
| Search Meta Ads | Ads running on Facebook and Instagram, by keyword or advertiser. |
| Research Ads | A written answer to an open question about the ads in a market, such as which angles competitors run. |
| Custom API Call | Any [Hermoso API](https://hermoso.ai/docs/api/) endpoint with your connection's key. |

## Triggers

| Trigger | When it fires |
| --- | --- |
| New Library Item | A finished image or video lands in the brand Library. |

Generation and ad research use Hermoso credits; listing, reading jobs and publishing are free (posts to X use credits). See [pricing](https://hermoso.ai/pricing/).

## Links

- Setup guide: https://hermoso.ai/connect/activepieces/
- API reference: https://hermoso.ai/docs/api/
- Support: hello@hermoso.ai

## Source and building

The piece source is in [`piece/`](piece/). It builds inside the [Activepieces monorepo](https://github.com/activepieces/activepieces):

```bash
git clone https://github.com/activepieces/activepieces.git
cp -R piece activepieces/packages/pieces/community/hermoso
cd activepieces && bun install
npm run build-piece hermoso      # bundles to packages/pieces/community/hermoso/dist
```

The published npm package is that self-contained bundle (`src/index.js`), so installing it needs no other packages.

## License

MIT
