import { HttpMethod } from '@activepieces/pieces-common';
import { createAction, Property } from '@activepieces/pieces-framework';
import { hermosoAuth } from '../auth';
import { hermosoApi } from '../common/client';
import { hermosoProps } from '../common/props';

// Launch: hosted pages and sites, domains, domain email and payments. Each action is one call to
// POST /v1/tools/{tool} with the tool's own arguments, and returns Hermoso's sentence as `message`
// next to the structured data.

const pageName = Property.ShortText({
  displayName: 'Page Name',
  description: 'The page name, which is also its address: spring-sale is served at https://spring-sale.hermoso.page.',
  required: true,
});

const hostname = Property.ShortText({
  displayName: 'Domain',
  description: 'The address to serve the page on: a subdomain such as www.yourbrand.com or go.yourbrand.com.',
  required: true,
});

const files = Property.Array({
  displayName: 'Files',
  description:
    'Optional. Files of the site. Each needs a path (such as index.html or css/site.css) and either its text content or a public link to the file.',
  required: false,
  properties: {
    path: Property.ShortText({ displayName: 'Path', required: true }),
    content: Property.LongText({ displayName: 'Content', description: 'The file text.', required: false }),
    url: Property.ShortText({ displayName: 'File Link', description: 'Instead of content: a public https link to the file.', required: false }),
  },
});

async function runTool({
  apiKey,
  brand,
  tool,
  args,
  runId,
  stepName,
}: {
  apiKey: string;
  brand: string | null | undefined;
  tool: string;
  args: Record<string, unknown>;
  runId?: string;
  stepName?: string;
}): Promise<Record<string, unknown>> {
  const { text, data } = await hermosoApi.callTool({
    apiKey,
    brand: brand ?? undefined,
    name: tool,
    args,
    idempotencyKey:
      runId && stepName
        ? hermosoApi.idempotencyKey({ runId, stepName, operation: tool, payload: args })
        : undefined,
  });
  return { message: text, ...data };
}

function fileList(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const rows = value
    .filter(hermosoApi.isRecord)
    .map((row) =>
      hermosoApi.compact({
        path: hermosoApi.text(row['path']).trim(),
        content: hermosoApi.text(row['content']) || undefined,
        url: hermosoApi.text(row['url']).trim() || undefined,
      })
    )
    .filter((row) => hermosoApi.text(row['path']).length > 0);
  return rows.length > 0 ? rows : undefined;
}

function listOrWord(value: string): string | string[] {
  const parts = value
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length === 1 ? parts[0] : parts;
}

function addresses(value: string | undefined): string[] | undefined {
  const parts = (value ?? '')
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts : undefined;
}

function optionalNumber(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionalFlag(value: string | null | undefined): boolean | undefined {
  if (value === 'on') {
    return true;
  }
  if (value === 'off') {
    return false;
  }
  return undefined;
}

const onOff = (displayName: string, description: string) =>
  Property.StaticDropdown({
    displayName,
    description,
    required: false,
    options: {
      options: [
        { label: 'Leave as it is', value: '' },
        { label: 'On', value: 'on' },
        { label: 'Off', value: 'off' },
      ],
    },
  });

export const publishPageAction = createAction({
  auth: hermosoAuth,
  name: 'publish_page',
  classification: 'WRITE',
  displayName: 'Publish Page',
  description: 'Puts a web page or a small static site live at https://<name>.hermoso.page from HTML you provide.',
  audience: 'both',
  aiMetadata: {
    description:
      'Publishes HTML (or a set of files) as a hosted Hermoso page at https://<name>.hermoso.page, with the brand tag and lead forms wired in. Hermoso hosts the files as sent and does not write them. Returns the live and preview URLs. Free. Republishing the same name adds a new version.',
    idempotent: false,
  },
  props: {
    brand: hermosoProps.brand,
    name: pageName,
    html: Property.LongText({
      displayName: 'HTML',
      description: 'The full HTML of the page. It becomes index.html. Use Files instead for a site with several files.',
      required: false,
    }),
    files,
    title: Property.ShortText({ displayName: 'Title', description: 'Optional. Defaults to the page <title>.', required: false }),
    live: Property.Checkbox({
      displayName: 'Make It Live',
      description: 'Off saves this version as a preview only.',
      required: false,
      defaultValue: true,
    }),
    note: Property.ShortText({ displayName: 'Version Note', description: 'Optional. What this version changes.', required: false }),
  },
  async run(context) {
    const p = context.propsValue;
    const html = (p.html ?? '').trim();
    const fileRows = fileList(p.files);
    if (!html && !fileRows) {
      throw new Error('Add the page HTML, or at least one file, to publish.');
    }
    return runTool({
      apiKey: context.auth.secret_text,
      brand: p.brand,
      tool: 'publish_page',
      args: hermosoApi.compact({
        name: p.name.trim(),
        html: html || undefined,
        files: fileRows,
        title: p.title?.trim(),
        live: p.live === false ? false : undefined,
        note: p.note?.trim(),
      }),
      runId: context.run.id,
      stepName: context.step.name,
    });
  },
});

export const updatePageAction = createAction({
  auth: hermosoAuth,
  name: 'update_page',
  classification: 'WRITE',
  displayName: 'Update Page',
  description: 'Changes a hosted page: replace its HTML, add or remove files, or make an earlier version live.',
  audience: 'both',
  aiMetadata: {
    description:
      'Updates a page made with Publish Page. Files sent are added or replaced and the rest are kept; Remove deletes paths; HTML replaces index.html; Make Version Live restores an existing version without sending files. Each change is a new version with its own preview link. Free.',
    idempotent: false,
  },
  props: {
    brand: hermosoProps.brand,
    name: pageName,
    html: Property.LongText({ displayName: 'HTML', description: 'Optional. The new index.html.', required: false }),
    files,
    remove: Property.Array({
      displayName: 'Remove Files',
      description: 'Optional. Paths to delete, such as old.html.',
      required: false,
    }),
    replace: Property.Checkbox({
      displayName: 'Replace All Files',
      description: 'On: the new version holds exactly the files sent here.',
      required: false,
      defaultValue: false,
    }),
    live: Property.Checkbox({
      displayName: 'Make It Live',
      description: 'Off saves this version as a preview only.',
      required: false,
      defaultValue: true,
    }),
    set_live: Property.Number({
      displayName: 'Make Version Live',
      description: 'Optional. A version number to put back live. No files needed.',
      required: false,
    }),
    badge: onOff('Made with Hermoso Badge', 'Off takes the small badge off (paid plans).'),
    cookie_banner: onOff('Cookie Banner', 'A cookie banner and privacy page.'),
    title: Property.ShortText({ displayName: 'Title', required: false }),
    note: Property.ShortText({ displayName: 'Version Note', description: 'Optional. What this version changes.', required: false }),
  },
  async run(context) {
    const p = context.propsValue;
    const remove = hermosoApi.textList(p.remove);
    return runTool({
      apiKey: context.auth.secret_text,
      brand: p.brand,
      tool: 'update_page',
      args: hermosoApi.compact({
        name: p.name.trim(),
        html: (p.html ?? '').trim() || undefined,
        files: fileList(p.files),
        remove: remove.length > 0 ? remove : undefined,
        replace: p.replace === true ? true : undefined,
        live: p.live === false ? false : undefined,
        setLive: optionalNumber(p.set_live),
        badge: optionalFlag(p.badge),
        cookieBanner: optionalFlag(p.cookie_banner),
        title: p.title?.trim(),
        note: p.note?.trim(),
      }),
      runId: context.run.id,
      stepName: context.step.name,
    });
  },
});

export const listPagesAction = createAction({
  auth: hermosoAuth,
  name: 'list_pages',
  classification: 'READ',
  displayName: 'List Pages',
  description: 'Lists the brand hosted pages with their status, live address, version and leads.',
  audience: 'both',
  aiMetadata: {
    description:
      'Lists the hosted pages of a Hermoso brand: name, status (live, preview, unpublished, taken down), live URL, version, file count and leads from its forms. Read-only and free.',
    idempotent: true,
  },
  props: { brand: hermosoProps.brand },
  async run(context) {
    return runTool({ apiKey: context.auth.secret_text, brand: context.propsValue.brand, tool: 'list_pages', args: {} });
  },
});

export const getPageAction = createAction({
  auth: hermosoAuth,
  name: 'get_page',
  classification: 'READ',
  displayName: 'Get Page',
  description: 'Gets one hosted page: its addresses, versions, files and leads, or the source of one file.',
  audience: 'both',
  aiMetadata: {
    description:
      'Reads one hosted page: live and preview URLs, every version, its files and the leads from its forms. With File it returns that file source (optionally of one version) to edit and send back with Update Page. With Ad Platform it returns a UTM-tagged ad destination. Read-only and free.',
    idempotent: true,
  },
  props: {
    brand: hermosoProps.brand,
    name: pageName,
    file: Property.ShortText({ displayName: 'File', description: 'Optional. A file to read, such as index.html.', required: false }),
    version: Property.Number({ displayName: 'Version', description: 'Optional, with File. Default is the live version.', required: false }),
    platform: Property.StaticDropdown({
      displayName: 'Ad Platform',
      description: 'Optional. Returns the page link tagged for ads on this platform.',
      required: false,
      options: {
        options: [
          { label: 'Meta', value: 'meta' },
          { label: 'Google', value: 'google' },
          { label: 'TikTok', value: 'tiktok' },
          { label: 'LinkedIn', value: 'linkedin' },
          { label: 'Microsoft', value: 'microsoft' },
          { label: 'Reddit', value: 'reddit' },
          { label: 'Pinterest', value: 'pinterest' },
          { label: 'Snapchat', value: 'snapchat' },
          { label: 'X', value: 'x' },
          { label: 'ChatGPT', value: 'chatgpt' },
        ],
      },
    }),
    campaign: Property.ShortText({ displayName: 'Campaign', description: 'Optional. utm_campaign for the ad link.', required: false }),
    content: Property.ShortText({ displayName: 'Ad Name', description: 'Optional. utm_content for the ad link.', required: false }),
    path: Property.ShortText({ displayName: 'Path', description: 'Optional. A page of the site other than the home page, such as pricing.html.', required: false }),
  },
  async run(context) {
    const p = context.propsValue;
    return runTool({
      apiKey: context.auth.secret_text,
      brand: p.brand,
      tool: 'get_page',
      args: hermosoApi.compact({
        name: p.name.trim(),
        file: p.file?.trim(),
        version: optionalNumber(p.version),
        platform: p.platform,
        campaign: p.campaign?.trim(),
        content: p.content?.trim(),
        path: p.path?.trim(),
      }),
    });
  },
});

export const unpublishPageAction = createAction({
  auth: hermosoAuth,
  name: 'unpublish_page',
  classification: 'WRITE',
  displayName: 'Unpublish Page',
  description: 'Takes a hosted page offline. With Confirm off it only reports what would go offline.',
  audience: 'both',
  aiMetadata: {
    description:
      'Takes a hosted page offline: its live address and every preview link stop serving it, ads pointing at it included. With Confirm off nothing changes and the step returns what it would take down. Versions are kept, so Update Page with Make Version Live brings it back. Free.',
    idempotent: true,
  },
  props: {
    brand: hermosoProps.brand,
    name: pageName,
    confirm: Property.Checkbox({
      displayName: 'Confirm',
      description: 'On takes the page offline. Off only checks what would be taken down.',
      required: false,
      defaultValue: false,
    }),
  },
  async run(context) {
    const p = context.propsValue;
    return runTool({
      apiKey: context.auth.secret_text,
      brand: p.brand,
      tool: 'unpublish_page',
      args: hermosoApi.compact({ name: p.name.trim(), confirm: p.confirm === true ? true : undefined }),
    });
  },
});

export const rollbackPageAction = createAction({
  auth: hermosoAuth,
  name: 'rollback_page',
  classification: 'WRITE',
  displayName: 'Roll Back Page',
  description: 'Puts a hosted page back on its previous version, or on a version you name.',
  audience: 'both',
  aiMetadata: {
    description:
      'Puts a hosted page back on the version live before the current one (running it again undoes the rollback), or on the version given. Page files and server code go back; database rows, uploads and secrets do not. Free.',
    idempotent: false,
  },
  props: {
    brand: hermosoProps.brand,
    name: pageName,
    version: Property.Number({ displayName: 'Version', description: 'Optional. Default is the version live before this one.', required: false }),
  },
  async run(context) {
    const p = context.propsValue;
    return runTool({
      apiKey: context.auth.secret_text,
      brand: p.brand,
      tool: 'rollback_page',
      args: hermosoApi.compact({ name: p.name.trim(), version: optionalNumber(p.version) }),
    });
  },
});

export const findDomainAction = createAction({
  auth: hermosoAuth,
  name: 'find_domain',
  classification: 'SEARCH',
  displayName: 'Find Domain',
  description: 'Checks whether domains are available to buy through Hermoso and what they cost. Reserves nothing.',
  audience: 'both',
  aiMetadata: {
    description:
      'Checks domain availability and price in dollars (first year and yearly renewal). Give full names (yourbrand.com) or one brand word to try across common endings. Read-only, reserves nothing, free.',
    idempotent: true,
  },
  props: {
    brand: hermosoProps.brand,
    names: Property.ShortText({
      displayName: 'Domains or Brand Word',
      description: 'One brand word, such as beanclub, or full domains separated by commas, such as beanclub.com, beanclub.co.',
      required: true,
    }),
  },
  async run(context) {
    return runTool({
      apiKey: context.auth.secret_text,
      brand: context.propsValue.brand,
      tool: 'find_domain',
      args: { names: listOrWord(context.propsValue.names) },
    });
  },
});

export const buyDomainAction = createAction({
  auth: hermosoAuth,
  name: 'buy_domain',
  classification: 'WRITE',
  displayName: 'Buy Domain',
  description:
    'Buys a domain through Hermoso. With Confirm off it only returns the exact fees and the registration agreement. With Confirm on it returns a payment link to open and pay by card.',
  audience: 'both',
  aiMetadata: {
    description:
      'Buys a domain. With Confirm off nothing happens and the step returns the fees and the registration agreement. With Confirm on and Accept Registration Agreement on, it returns a card payment link for a person to open and pay; the domain registers about a minute after payment. Nothing is charged by this step itself. Needs a paid plan or bought credits. Spends real money once paid: never turn Confirm on without the owner approving the exact domain and price.',
    idempotent: false,
  },
  props: {
    brand: hermosoProps.brand,
    domain: Property.ShortText({ displayName: 'Domain', description: 'The domain to buy, such as yourbrand.com.', required: true }),
    first_name: Property.ShortText({ displayName: 'Owner First Name', required: true }),
    last_name: Property.ShortText({ displayName: 'Owner Last Name', required: true }),
    email: Property.ShortText({ displayName: 'Owner Email', required: true }),
    phone: Property.ShortText({ displayName: 'Owner Phone', description: 'In the form +1.4155550100.', required: true }),
    address1: Property.ShortText({ displayName: 'Street Address', required: true }),
    city: Property.ShortText({ displayName: 'City', required: true }),
    state: Property.ShortText({ displayName: 'State or Region', required: true }),
    zip: Property.ShortText({ displayName: 'Postal Code', required: true }),
    country: Property.ShortText({ displayName: 'Country', description: 'Two letters, such as US.', required: true }),
    company_name: Property.ShortText({ displayName: 'Company Name', required: false }),
    page: Property.ShortText({ displayName: 'Page Name', description: 'Optional. The hosted page this domain is for.', required: false }),
    accept_registration_agreement: Property.Checkbox({
      displayName: 'Accept Registration Agreement',
      description: 'On only after the domain owner has read and accepted the registration agreement returned with Confirm off.',
      required: false,
      defaultValue: false,
    }),
    confirm: Property.Checkbox({
      displayName: 'Confirm Purchase',
      description: 'Off returns the price only. On asks for the payment link. Turn it on only after the owner approved this domain and price.',
      required: false,
      defaultValue: false,
    }),
  },
  async run(context) {
    const p = context.propsValue;
    const confirm = p.confirm === true;
    if (confirm && p.accept_registration_agreement !== true) {
      throw new Error('Turn on Accept Registration Agreement after the owner accepts it, or turn Confirm Purchase off to see the price first.');
    }
    return runTool({
      apiKey: context.auth.secret_text,
      brand: p.brand,
      tool: 'buy_domain',
      args: hermosoApi.compact({
        domain: p.domain.trim(),
        registrant: hermosoApi.compact({
          firstName: p.first_name.trim(),
          lastName: p.last_name.trim(),
          email: p.email.trim(),
          phone: p.phone.trim(),
          address1: p.address1.trim(),
          city: p.city.trim(),
          state: p.state.trim(),
          zip: p.zip.trim(),
          country: p.country.trim().toUpperCase(),
          companyName: p.company_name?.trim(),
        }),
        page: p.page?.trim(),
        acceptRegistrationAgreement: confirm ? true : undefined,
        confirm: confirm ? true : undefined,
      }),
      runId: context.run.id,
      stepName: context.step.name,
    });
  },
});

export const connectDomainAction = createAction({
  auth: hermosoAuth,
  name: 'connect_domain',
  classification: 'WRITE',
  displayName: 'Connect Domain',
  description: 'Serves a hosted page on a domain you already own, and returns the one DNS record to add.',
  audience: 'both',
  aiMetadata: {
    description:
      'Connects a subdomain the customer owns (www.brand.com or go.brand.com; a bare root cannot take the CNAME) to a hosted page and returns the single CNAME record to add at the DNS host. The HTTPS certificate is issued automatically once it resolves. Use Domain Status to follow it. Free.',
    idempotent: true,
  },
  props: { brand: hermosoProps.brand, name: pageName, hostname },
  async run(context) {
    const p = context.propsValue;
    return runTool({
      apiKey: context.auth.secret_text,
      brand: p.brand,
      tool: 'connect_domain',
      args: { name: p.name.trim(), hostname: p.hostname.trim().toLowerCase() },
    });
  },
});

export const domainStatusAction = createAction({
  auth: hermosoAuth,
  name: 'domain_status',
  classification: 'READ',
  displayName: 'Domain Status',
  description: 'Checks whether a connected domain serves its page yet, and what is left to do.',
  audience: 'both',
  aiMetadata: {
    description:
      'Reports whether a domain connected with Connect Domain serves its page yet: waiting for the DNS record (with the record to add), certificate being issued, live, or what went wrong. Read-only and free.',
    idempotent: true,
  },
  props: { brand: hermosoProps.brand, name: pageName, hostname },
  async run(context) {
    const p = context.propsValue;
    return runTool({
      apiKey: context.auth.secret_text,
      brand: p.brand,
      tool: 'domain_status',
      args: { name: p.name.trim(), hostname: p.hostname.trim().toLowerCase() },
    });
  },
});

export const listDomainsAction = createAction({
  auth: hermosoAuth,
  name: 'list_domains',
  classification: 'READ',
  displayName: 'List Domains',
  description: 'Lists the domains bought through Hermoso, with status, expiry and renewal price.',
  audience: 'both',
  aiMetadata: {
    description: 'Lists the domains this account bought through Hermoso: status, expiry, renewal price and auto-renew. Read-only and free.',
    idempotent: true,
  },
  props: { brand: hermosoProps.brand },
  async run(context) {
    return runTool({ apiKey: context.auth.secret_text, brand: context.propsValue.brand, tool: 'list_domains', args: {} });
  },
});

export const listDomainMailAction = createAction({
  auth: hermosoAuth,
  name: 'list_domain_mail',
  classification: 'READ',
  displayName: 'List Domain Mail',
  description: 'Lists the email conversations in your domain inbox, newest first.',
  audience: 'both',
  aiMetadata: {
    description:
      'Lists the conversations in the Hermoso domain inbox, newest first, one per thread: sender, address, subject and whether it was answered. Domain or Address narrow it. Read-only and free.',
    idempotent: true,
  },
  props: {
    brand: hermosoProps.brand,
    domain: Property.ShortText({ displayName: 'Domain', description: 'Optional. Only this domain.', required: false }),
    address: Property.ShortText({ displayName: 'Address', description: 'Optional. Only this address, such as hello@yourbrand.com.', required: false }),
    unanswered_only: Property.Checkbox({ displayName: 'Unanswered Only', required: false, defaultValue: false }),
    limit: Property.Number({ displayName: 'Limit', description: 'Optional. How many conversations to return.', required: false }),
  },
  async run(context) {
    const p = context.propsValue;
    return runTool({
      apiKey: context.auth.secret_text,
      brand: p.brand,
      tool: 'list_domain_mail',
      args: hermosoApi.compact({
        domain: p.domain?.trim(),
        address: p.address?.trim(),
        unansweredOnly: p.unanswered_only === true ? true : undefined,
        limit: optionalNumber(p.limit),
      }),
    });
  },
});

export const sendDomainMailAction = createAction({
  auth: hermosoAuth,
  name: 'send_domain_mail',
  classification: 'WRITE',
  displayName: 'Send Domain Mail',
  description: 'Starts a one-to-one email conversation from an address on your domain. Replies come back to the domain inbox.',
  audience: 'both',
  aiMetadata: {
    description:
      'Sends one email from a domain inbox address (such as hello@yourbrand.com) to the given people, with optional HTML, cc, bcc and attachments as links. For one-to-one conversations: newsletters and list sends are refused. Each run sends a new email; a retry of the same step in the same flow run does not send twice.',
    idempotent: false,
  },
  props: {
    brand: hermosoProps.brand,
    from: Property.ShortText({ displayName: 'From', description: 'An address on your domain, such as hello@yourbrand.com.', required: true }),
    from_name: Property.ShortText({ displayName: 'From Name', required: false }),
    to: Property.ShortText({ displayName: 'To', description: 'One or more addresses, separated by commas.', required: true }),
    cc: Property.ShortText({ displayName: 'Cc', required: false }),
    bcc: Property.ShortText({ displayName: 'Bcc', required: false }),
    subject: Property.ShortText({ displayName: 'Subject', required: true }),
    text: Property.LongText({ displayName: 'Text', required: true }),
    html: Property.LongText({ displayName: 'HTML', description: 'Optional. An HTML version of the message.', required: false }),
    attachments: Property.Array({
      displayName: 'Attachments',
      description: 'Optional. Public links to files, up to 10 MB in all.',
      required: false,
    }),
  },
  async run(context) {
    const p = context.propsValue;
    const attachments = hermosoApi.textList(p.attachments);
    return runTool({
      apiKey: context.auth.secret_text,
      brand: p.brand,
      tool: 'send_domain_mail',
      args: hermosoApi.compact({
        from: p.from.trim(),
        fromName: p.from_name?.trim(),
        to: addresses(p.to),
        cc: addresses(p.cc),
        bcc: addresses(p.bcc),
        subject: p.subject.trim(),
        text: p.text,
        html: p.html || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      }),
      runId: context.run.id,
      stepName: context.step.name,
    });
  },
});

export const businessStatusAction = createAction({
  auth: hermosoAuth,
  name: 'business_status',
  classification: 'READ',
  displayName: 'Business Status',
  description: 'Reads the brand launch plan: each step, what is done, and what comes next.',
  audience: 'both',
  aiMetadata: {
    description: 'Reads the launch plan of a brand live: each step status, what is done, the next step and any link a person must open. Read-only and free.',
    idempotent: true,
  },
  props: { brand: hermosoProps.brand },
  async run(context) {
    return runTool({ apiKey: context.auth.secret_text, brand: context.propsValue.brand, tool: 'business_status', args: {} });
  },
});

export const paymentsStatusAction = createAction({
  auth: hermosoAuth,
  name: 'payments_status',
  classification: 'READ',
  displayName: 'Payments Status',
  description: 'Checks whether Hermoso Payments is ready for the brand, and what is still needed.',
  audience: 'both',
  aiMetadata: {
    description: 'Reports whether Hermoso Payments is ready for this brand, what is still needed, which sites use it, and the fee and payout terms. Read-only and free.',
    idempotent: true,
  },
  props: { brand: hermosoProps.brand },
  async run(context) {
    return runTool({ apiKey: context.auth.secret_text, brand: context.propsValue.brand, tool: 'payments_status', args: {} });
  },
});

export const listSitePaymentsAction = createAction({
  auth: hermosoAuth,
  name: 'list_site_payments',
  classification: 'READ',
  displayName: 'List Site Payments',
  description: 'Lists payments taken on the brand hosted sites: amount, product, buyer, status and fees.',
  audience: 'both',
  aiMetadata: {
    description: 'Lists payments taken on the brand hosted sites through Hermoso Payments: amount, product, buyer, status and fees. Optional page name and status filter. Read-only and free.',
    idempotent: true,
  },
  props: {
    brand: hermosoProps.brand,
    name: Property.ShortText({ displayName: 'Page Name', description: 'Optional. Only this site.', required: false }),
    status: Property.StaticDropdown({
      displayName: 'Status',
      required: false,
      options: {
        options: [
          { label: 'Paid', value: 'paid' },
          { label: 'Refunded', value: 'refunded' },
          { label: 'Partly refunded', value: 'partly_refunded' },
          { label: 'Disputed', value: 'disputed' },
          { label: 'Failed', value: 'failed' },
        ],
      },
    }),
    limit: Property.Number({ displayName: 'Limit', required: false }),
  },
  async run(context) {
    const p = context.propsValue;
    return runTool({
      apiKey: context.auth.secret_text,
      brand: p.brand,
      tool: 'list_site_payments',
      args: hermosoApi.compact({ name: p.name?.trim(), status: p.status, limit: optionalNumber(p.limit) }),
    });
  },
});

export const callToolAction = createAction({
  auth: hermosoAuth,
  name: 'call_tool',
  classification: 'WRITE',
  displayName: 'Call Any Hermoso Tool',
  description: 'Runs any Hermoso tool by name with your own arguments, so every Hermoso tool is reachable from a flow.',
  audience: 'both',
  aiMetadata: {
    description:
      'Runs one Hermoso tool by its name (such as hermoso_credits, schedule_post or list_scheduled) with a JSON object of its arguments, and returns the tool result. The tool list and each tool schema are at https://hermoso.ai/docs/api/. With Wait for the Result off, a render returns its queued job at once; Get Render Job collects it. A retry of the same step in the same flow run returns the first result.',
    idempotent: false,
  },
  props: {
    brand: hermosoProps.brand,
    tool: Property.ShortText({
      displayName: 'Tool Name',
      description: 'The Hermoso tool to run, such as hermoso_credits or list_scheduled. The full list is in the API guide.',
      required: true,
    }),
    args: Property.Json({
      displayName: 'Arguments',
      description: 'The tool arguments as a JSON object. Use {} for a tool that takes none.',
      required: false,
      defaultValue: {},
    }),
    wait_for_result: Property.Checkbox({
      displayName: 'Wait for the Result',
      description: 'Off: a render returns its queued job at once instead of the finished file.',
      required: false,
      defaultValue: true,
    }),
  },
  async run(context) {
    const p = context.propsValue;
    const tool = p.tool.trim();
    if (!/^[a-z0-9_]+$/i.test(tool)) {
      throw new Error('Tool Name must be a Hermoso tool name such as hermoso_credits, with letters, numbers and underscores only.');
    }
    const raw: unknown = typeof p.args === 'string' ? parseArgs(p.args) : p.args ?? {};
    if (!hermosoApi.isRecord(raw)) {
      throw new Error('Arguments must be a JSON object, such as {"limit": 5}.');
    }
    const wait = p.wait_for_result !== false;
    const response = await hermosoApi.send<unknown>({
      apiKey: context.auth.secret_text,
      brand: p.brand ?? undefined,
      method: HttpMethod.POST,
      path: `/tools/${tool}`,
      body: raw,
      queryParams: wait ? undefined : { wait: '0' },
      headers: {
        'Idempotency-Key': hermosoApi.idempotencyKey({
          runId: context.run.id,
          stepName: context.step.name,
          operation: tool,
          payload: raw,
        }),
      },
    });
    const body = hermosoApi.isRecord(response.body) ? response.body : {};
    if (response.status === 202 || body['object'] === 'job') {
      return { queued: true, ...body };
    }
    const data = hermosoApi.isRecord(body['data']) ? body['data'] : {};
    return { tool: hermosoApi.text(body['tool']) || tool, message: hermosoApi.text(body['text']), data };
  },
});

function parseArgs(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return {};
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error('Arguments must be valid JSON, such as {"limit": 5}.');
  }
}

export const launchActions = [
  publishPageAction,
  updatePageAction,
  listPagesAction,
  getPageAction,
  unpublishPageAction,
  rollbackPageAction,
  findDomainAction,
  buyDomainAction,
  connectDomainAction,
  domainStatusAction,
  listDomainsAction,
  listDomainMailAction,
  sendDomainMailAction,
  businessStatusAction,
  paymentsStatusAction,
  listSitePaymentsAction,
];
