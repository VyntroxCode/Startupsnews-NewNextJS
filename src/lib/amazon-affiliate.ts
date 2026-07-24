export interface AmazonProduct {
  title: string;
  imageUrl: string;
  price: string;
  url: string;
}

// Curated founder/startup picks on Amazon.in — ASINs are looked up live via GetItems;
// the static fields here are only the fallback used if that call fails.
const CURATED_PRODUCTS: (AmazonProduct & { asin: string })[] = [
  {
    asin: '0307887898',
    title: 'The Lean Startup — Eric Ries',
    imageUrl: 'https://m.media-amazon.com/images/I/81-QB7nDh4L._AC_UY218_.jpg',
    price: '₹399',
    url: 'https://www.amazon.in/dp/0307887898?tag=snf-21',
  },
  {
    asin: '0804139296',
    title: 'Zero to One — Peter Thiel',
    imageUrl: 'https://images-na.ssl-images-amazon.com/images/P/0804139296.01._SCLZZZZZZZ_.jpg',
    price: '₹299',
    url: 'https://www.amazon.in/dp/0804139296?tag=snf-21',
  },
  {
    asin: '0062273205',
    title: 'The Hard Thing About Hard Things — Ben Horowitz',
    imageUrl: 'https://images-na.ssl-images-amazon.com/images/P/0062273205.01._SCLZZZZZZZ_.jpg',
    price: '₹449',
    url: 'https://www.amazon.in/dp/0062273205?tag=snf-21',
  },
];

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const clientId = process.env.AMAZON_PA_CLIENT_ID;
  const clientSecret = process.env.AMAZON_PA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const resp = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'creatorsapi::default',
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { access_token: string; expires_in: number };
    tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return tokenCache.token;
  } catch { return null; }
}

interface GetItemsResponse {
  items?: Array<{
    asin?: string;
    images?: { primary?: { medium?: { url?: string } } };
    itemInfo?: { title?: { displayValue?: string } };
    offersV2?: { listings?: Array<{ price?: { money?: { displayAmount?: string } } }> };
  }>;
}

export async function getAmazonProducts(limit = 3): Promise<AmazonProduct[]> {
  const fallback = CURATED_PRODUCTS.slice(0, limit).map(({ asin: _asin, ...p }) => p);

  try {
    const token = await getAccessToken();
    if (!token) return fallback;

    const tag = process.env.AMAZON_ASSOCIATE_TAG || 'snf-21';
    const items = CURATED_PRODUCTS.slice(0, limit);
    const resp = await fetch('https://creatorsapi.amazon/catalog/v1/getItems', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-marketplace': 'www.amazon.in' },
      body: JSON.stringify({
        itemIds: items.map(p => p.asin),
        itemIdType: 'ASIN',
        marketplace: 'www.amazon.in',
        partnerTag: tag,
        resources: ['images.primary.medium', 'itemInfo.title', 'offersV2.listings.price'],
      }),
    });
    if (!resp.ok) return fallback;

    const data = await resp.json() as GetItemsResponse;
    if (!data.items?.length) return fallback;

    return items.map((curated) => {
      const live = data.items!.find(i => i.asin === curated.asin);
      const imageUrl = live?.images?.primary?.medium?.url;
      const title = live?.itemInfo?.title?.displayValue;
      const price = live?.offersV2?.listings?.[0]?.price?.money?.displayAmount;
      if (!imageUrl) return curated;
      return { title: title || curated.title, imageUrl, price: price || curated.price, url: curated.url };
    });
  } catch {
    return fallback;
  }
}

function esc(s: string | null | undefined): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Native in-feed sponsored slot — appears after sector blocks.
 * Matches the bordered "Sponsored" box in the template.
 */
export function buildAmazonNativeBlock(product: AmazonProduct): string {
  return `
      <tr>
        <td style="padding:22px 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #F0DDE5;border-radius:8px;">
            <tr>
              <td style="padding:14px 16px;">
                <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;color:#B9B9B9;">Sponsored</span>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                  <tr>
                    <td width="64" valign="top">
                      <a href="${esc(product.url)}" style="display:block;text-decoration:none;">
                        <img src="${esc(product.imageUrl)}" width="56" height="56" alt="${esc(product.title)}" style="display:block;border-radius:6px;width:56px;height:56px;object-fit:cover;">
                      </a>
                    </td>
                    <td valign="top" style="padding-left:12px;">
                      <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;font-weight:bold;color:#1A1A1A;">${esc(product.title)}</p>
                      <span style="font-family:Arial,Helvetica,sans-serif;font-size:11.5px;color:#9A9A9A;">Amazon.in${product.price ? ' &middot; ' + esc(product.price) : ''}</span>
                      <br>
                      <a href="${esc(product.url)}" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#C13E70;text-decoration:none;display:inline-block;margin-top:4px;">Shop on Amazon &rarr;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
}

/**
 * Rectangle banner slot — appears after events, before footer.
 * Shows remaining 2 products in a 2-col grid styled like a sponsored rectangle.
 */
export function buildAmazonBannerBlock(products: AmazonProduct[]): string {
  if (!products.length) return '';
  const cols = products.slice(0, 2).map((p, i) => {
    const pad = i === 0 ? 'padding-right:6px;' : 'padding-left:6px;';
    return `
                  <td width="50%" valign="top" style="${pad}">
                    <a href="${esc(p.url)}" style="display:block;text-decoration:none;">
                      <img src="${esc(p.imageUrl)}" width="100%" alt="${esc(p.title)}" style="display:block;border-radius:8px;width:100%;height:auto;">
                    </a>
                    <p style="margin:6px 0 2px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#1A1A1A;line-height:1.4;">${esc(p.title)}</p>
                    ${p.price ? `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#C13E70;">${esc(p.price)}</p>` : ''}
                    <a href="${esc(p.url)}" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#C13E70;text-decoration:none;">Buy on Amazon &rarr;</a>
                  </td>`;
  }).join('');

  return `
      <tr>
        <td style="padding:26px 24px 0;">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;color:#B9B9B9;">Advertisement</span>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background:#FAF7F8;border:1px dashed #E3CBD6;border-radius:8px;">
            <tr>
              <td style="padding:20px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>${cols}
                  </tr>
                </table>
                <p style="margin:14px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif;">
                  <a href="https://www.amazon.in/?tag=snf-21" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#C13E70;text-decoration:none;font-weight:bold;">&#128722; Browse all deals on Amazon.in &rarr;</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
}
