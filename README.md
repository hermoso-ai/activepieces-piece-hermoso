# Hermoso piece for Activepieces

[Hermoso](https://hermoso.ai) is an AI marketing agent: research the ads winning in your market, make on-brand image and video ads, publish or schedule posts to your own social channels, and put sites live with a domain, domain email and payments. This piece brings Hermoso into your [Activepieces](https://www.activepieces.com) flows.

## Install

Activepieces installs custom pieces from npm on any platform that allows custom pieces (self-hosted Community or Enterprise editions, and cloud platforms with custom pieces enabled).

1. Sign in as a platform admin.
2. Open **Platform Admin ▸ Pieces** (on Community edition: **Settings ▸ Pieces**) and click **Install Piece**.
3. Choose **NPM Registry**, enter the package name `@hermoso/piece-hermoso` and the version (for example `0.2.0`), then install.
4. Open any flow, add a step and search for **Hermoso**.

Over the API (platform admin token):

```bash
curl -X POST "$AP_URL/api/v1/pieces" \
  -H "Authorization: Bearer $AP_TOKEN" -H "Content-Type: application/json" \
  -d '{"packageType":"REGISTRY","scope":"PLATFORM","pieceName":"@hermoso/piece-hermoso","pieceVersion":"0.2.0"}'
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
| Publish Page | Puts a page or a small static site live at https://<name>.hermoso.page from HTML you provide. |
| Update Page | Replaces a page's HTML, adds or removes files, or makes an earlier version live. |
| List Pages | The brand's hosted pages with status, live address, version and leads. |
| Get Page | One hosted page: addresses, versions, files, leads, or one file's source. |
| Unpublish Page | Takes a page offline. With Confirm off it only reports what would go offline. |
| Roll Back Page | Puts a page back on its previous version, or a version you name. |
| Find Domain | Whether domains are available to buy and what they cost. Reserves nothing. |
| Buy Domain | With Confirm off, the exact fees and the registration agreement. With Confirm on, a card payment link for you to open. |
| Connect Domain | Serves a page on a domain you own and returns the one DNS record to add. |
| Domain Status | Whether a connected domain serves its page yet, and what is left to do. |
| List Domains | The domains bought through Hermoso, with expiry and renewal price. |
| List Domain Mail | The conversations in your domain inbox, newest first. |
| Send Domain Mail | A one-to-one email from an address on your domain; replies come back to the inbox. |
| Business Status | The brand's launch plan: each step, what is done, what comes next. |
| Payments Status | Whether Hermoso Payments is ready for the brand, and what is still needed. |
| List Site Payments | Payments taken on the brand's hosted sites. |
| Call Any Hermoso Tool | Runs any Hermoso tool by name with a JSON object of its arguments. |
| Custom API Call | Any [Hermoso API](https://hermoso.ai/docs/api/) endpoint with your connection's key. |

## Triggers

| Trigger | When it fires |
| --- | --- |
| New Library Item | A finished image or video lands in the brand Library. |

Generation and ad research use Hermoso credits; listing, reading jobs, publishing posts and the page, domain and mail actions are free (posts to X use credits). A domain itself is paid by card through the link Buy Domain returns. See [pricing](https://hermoso.ai/pricing/).

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
