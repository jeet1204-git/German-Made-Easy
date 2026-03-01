const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

exports.handler = async function (event) {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS configuration
  const allowedOrigins = [
    'https://german-made-easy.netlify.app',
    'https://germanmadeeasy.com',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
  ];
  const origin = event.headers.origin || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // Get Firebase project info
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Firebase project ID not configured' }),
      };
    }

    // Get Firestore database info
    const db = admin.firestore();
    const collections = await db.listCollections();

    const projectInfo = {
      projectId,
      database: 'firestore',
      collectionsCount: collections.length,
      collections: collections.map(col => col.id),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        project: projectInfo,
      }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to list Firebase projects',
        message: err.message,
      }),
    };
  }
};
