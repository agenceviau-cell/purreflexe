const PRICE_AMOUNTS = {
  'price_1TTJ0KKdJsUHW9Mrs4H2tAcy': 2190,
  'price_1TTJ1kKdJsUHW9MrD5NJdhl0': 3990,
  'price_1TTJ2qKdJsUHW9MrTC78jgoE': 5490,
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  let priceId;
  try {
    ({ priceId } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Corps invalide' }) };
  }

  if (!PRICE_AMOUNTS[priceId]) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Offre invalide' }) };
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Clé Stripe manquante' }) };
  }

  const origin = event.headers.origin || event.headers.referer || 'https://purreflexe.fr';
  const base = origin.startsWith('http') ? origin.split('/').slice(0,3).join('/') : 'https://purreflexe.fr';

  const amount = PRICE_AMOUNTS[priceId];

  const params = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(amount),
    'line_items[0][price_data][product_data][name]': 'Pur reflexe',
    'line_items[0][price_data][product_data][description]': 'Spray détachant textile premium',
    'line_items[0][quantity]': '1',
    success_url: `${base}/merci.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/#offres`,
    locale: 'fr',
    'shipping_address_collection[allowed_countries][0]': 'FR',
    'shipping_address_collection[allowed_countries][1]': 'BE',
    'shipping_address_collection[allowed_countries][2]': 'CH',
    'shipping_address_collection[allowed_countries][3]': 'LU',
    'phone_number_collection[enabled]': 'true',
  });

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: session.error?.message || 'Erreur Stripe' }) };
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
