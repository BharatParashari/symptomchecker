/**
 * ABDM Health Facility Registry (HFR) integration.
 *
 * Provides real lookups against India's government registry of verified
 * hospitals, clinics and diagnostic centres. Activates automatically once
 * ABDM sandbox credentials (ABDM_CLIENT_ID / ABDM_CLIENT_SECRET) are set.
 *
 * DESIGN PRINCIPLE: when unconfigured we return an empty result with a clear
 * status — never fabricated facility data. Sending a patient to a made-up
 * hospital is a real harm, so this module refuses to invent listings.
 *
 * The gateway session auth (clientId/clientSecret -> short-lived access token)
 * follows ABDM's documented flow. The exact facility-search path can vary by
 * sandbox version, so it is overridable via ABDM_SEARCH_PATH.
 */

import { config, isAbdmConfigured } from '../config/index.js';

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 30_000) return cachedToken;

  const res = await fetch(`${config.abdm.baseUrl}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: config.abdm.clientId,
      clientSecret: config.abdm.clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`ABDM auth failed (${res.status})`);
  }
  const data = await res.json();
  cachedToken = data.accessToken || data.token;
  // Default 10-minute cache if expiry not provided.
  tokenExpiry = Date.now() + (data.expiresIn ? data.expiresIn * 1000 : 600_000);
  return cachedToken;
}

function normalizeFacility(f = {}) {
  return {
    id: f.facilityId || f.id || f.hprId || null,
    name: f.facilityName || f.name || 'Unknown facility',
    type: f.facilityType || f.type || null,
    ownership: f.ownership || f.facilityOwnership || null,
    address: f.address || f.completeAddress || null,
    state: f.stateName || f.state || null,
    district: f.districtName || f.district || null,
    pincode: f.pincode || null,
  };
}

/**
 * Search the HFR for facilities.
 * @param {{ state?:string, district?:string, name?:string, page?:number }} q
 * @returns {Promise<{configured:boolean, facilities:object[], message?:string}>}
 */
export async function searchFacilities({ state, district, name, page = 0 } = {}) {
  if (!isAbdmConfigured()) {
    return {
      configured: false,
      facilities: [],
      message:
        'Facility lookup is not yet configured. Add ABDM_CLIENT_ID and ABDM_CLIENT_SECRET to enable real hospital search across India.',
    };
  }

  const token = await getAccessToken();
  const searchPath = process.env.ABDM_SEARCH_PATH || '/api/v1/facility/search';

  const res = await fetch(`${config.abdm.baseUrl}${searchPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ownershipCode: '',
      stateLGDCode: state || '',
      districtLGDCode: district || '',
      facilityName: name || '',
      page,
      resultsPerPage: 20,
    }),
  });

  if (!res.ok) {
    throw new Error(`ABDM facility search failed (${res.status})`);
  }

  const data = await res.json();
  const list = data.facilities || data.data || data.results || [];
  return {
    configured: true,
    facilities: list.map(normalizeFacility),
    total: data.totalFacilities ?? data.total ?? list.length,
  };
}
