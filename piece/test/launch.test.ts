import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buyDomainAction,
  callToolAction,
  findDomainAction,
  unpublishPageAction,
} from '../src/lib/actions/launch';

const sendRequest = vi.fn();

vi.mock('@activepieces/pieces-common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@activepieces/pieces-common')>();
  return {
    ...actual,
    httpClient: {
      sendRequest: (...args: unknown[]) => sendRequest(...args),
    },
  };
});

function ctx(props: Record<string, unknown>) {
  return {
    auth: { type: 'SECRET_TEXT', secret_text: 'hmk_test' },
    propsValue: props,
    run: { id: 'run_1' },
    step: { name: 'step_1' },
  } as never;
}

function lastRequest() {
  return sendRequest.mock.calls[sendRequest.mock.calls.length - 1][0];
}

describe('launch actions', () => {
  beforeEach(() => {
    sendRequest.mockReset();
    sendRequest.mockResolvedValue({ status: 200, headers: {}, body: { object: 'tool_result', tool: 't', text: 'ok', data: { ok: true } } });
  });

  it('never confirms an unpublish unless Confirm is on', async () => {
    await unpublishPageAction.run(ctx({ name: ' spring-sale ' }));
    expect(lastRequest().url).toBe('https://app.hermoso.ai/v1/tools/unpublish_page');
    expect(lastRequest().body).toEqual({ name: 'spring-sale' });
  });

  it('refuses a confirmed purchase without the accepted agreement and sends nothing', async () => {
    const props = {
      domain: 'beanclub.com',
      first_name: 'A',
      last_name: 'B',
      email: 'a@example.com',
      phone: '+1.4155550100',
      address1: '1 Main St',
      city: 'Portland',
      state: 'OR',
      zip: '97201',
      country: 'us',
      confirm: true,
    };
    await expect(buyDomainAction.run(ctx(props))).rejects.toThrow(/Registration Agreement/);
    expect(sendRequest).not.toHaveBeenCalled();
  });

  it('asks only for the price when Confirm is off', async () => {
    await buyDomainAction.run(
      ctx({ domain: 'beanclub.com', first_name: 'A', last_name: 'B', email: 'a@example.com', phone: '+1.4155550100', address1: '1', city: 'c', state: 's', zip: 'z', country: 'us', accept_registration_agreement: true })
    );
    const body = lastRequest().body;
    expect(body.confirm).toBeUndefined();
    expect(body.acceptRegistrationAgreement).toBeUndefined();
    expect(body.registrant.country).toBe('US');
  });

  it('sends one brand word as a string and several domains as a list', async () => {
    await findDomainAction.run(ctx({ names: 'beanclub' }));
    expect(lastRequest().body).toEqual({ names: 'beanclub' });
    await findDomainAction.run(ctx({ names: 'beanclub.com, beanclub.co' }));
    expect(lastRequest().body).toEqual({ names: ['beanclub.com', 'beanclub.co'] });
  });

  it('calls any tool by name, with wait=0 when asked not to wait', async () => {
    const out = await callToolAction.run(ctx({ tool: 'hermoso_credits', args: {}, wait_for_result: true }));
    expect(lastRequest().url).toBe('https://app.hermoso.ai/v1/tools/hermoso_credits');
    expect(lastRequest().queryParams).toBeUndefined();
    expect(out).toMatchObject({ tool: 't', message: 'ok', data: { ok: true } });
    await callToolAction.run(ctx({ tool: 'generate_video', args: '{"prompt":"x"}', wait_for_result: false }));
    expect(lastRequest().queryParams).toEqual({ wait: '0' });
    expect(lastRequest().body).toEqual({ prompt: 'x' });
  });

  it('refuses a tool name that is not a plain name', async () => {
    await expect(callToolAction.run(ctx({ tool: '../brands', args: {} }))).rejects.toThrow(/Tool Name/);
    expect(sendRequest).not.toHaveBeenCalled();
  });
});
