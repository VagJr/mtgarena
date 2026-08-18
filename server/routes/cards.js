const express = require('express');
const router = express.Router();

const SCRYFALL_BASE = 'https://api.scryfall.com';
const SCRYFALL_HEADERS = {
  'User-Agent': 'MTGArenaSocial/1.0',
  'Accept': 'application/json'
};

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// Rate limiter - max 2 req/sec to Scryfall for card endpoints
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests

async function scryfallFetch(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();

  const response = await fetch(url, { headers: SCRYFALL_HEADERS });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ details: 'Unknown error' }));
    throw new Error(error.details || `Scryfall API error: ${response.status}`);
  }

  const data = await response.json();
  cache.set(url, { data, time: Date.now() });
  return data;
}

// MTG Specific Terminology Refinements for Portuguese
function refineMtgPortuguese(text) {
  if (!text) return '';
  return text
    .replace(/\bmills\b/gi, 'tritura')
    .replace(/\bmill\b/gi, 'triturar')
    .replace(/\bmilled\b/gi, 'triturou')
    .replace(/\bmilling\b/gi, 'triturando')
    .replace(/\bthat many cards\b/gi, 'aquela mesma quantidade de cards')
    .replace(/\bcards?\b/gi, 'card')
    .replace(/\bcard(s)?\b/gi, 'card$1')
    .replace(/\btoque mortal\b/gi, 'toque mortífero')
    .replace(/\bímpeto\b/gi, 'ímpeto')
    .replace(/\bvínculo vital\b/gi, 'vínculo com a vida')
    .replace(/\bataque primeiro\b/gi, 'iniciativa')
    .replace(/\bgolpe primeiro\b/gi, 'iniciativa')
    .replace(/\bduplo golpe\b/gi, 'golpe duplo')
    .replace(/\bataque duplo\b/gi, 'golpe duplo')
    .replace(/\barrolhar\b/gi, 'atropelar')
    .replace(/\bdefensor\b/gi, 'defensor')
    .replace(/\blampejo\b/gi, 'lampejo')
    .replace(/\bameaça\b/gi, 'ameaça')
    .replace(/\balcance\b/gi, 'alcance')
    .replace(/\bresistência à magia\b/gi, 'resistência a magia')
    .replace(/\bindestrutível\b/gi, 'indestrutível')
    .replace(/\bcampo de batalha\b/gi, 'campo de batalha')
    .replace(/\bcemitério\b/gi, 'cemitério')
    .replace(/\bgrimório\b/gi, 'grimório')
    .replace(/\bcompre um card\b/gi, 'compre um card')
    .replace(/\bsacrifique\b/gi, 'sacrifique')
    .replace(/\banule a mágica alvo\b/gi, 'anule a mágica alvo')
    .replace(/\bquando (.+) morrer\b/gi, 'quando $1 morre')
    .replace(/\btoda vez que (.+) atacar\b/gi, 'toda vez que $1 ataca')
    .replace(/\bentra no campo de batalha\b/gi, 'entra no campo de batalha');
}

// Neural Translation Helper using standard free endpoint with MTG terminology preservation
async function translateSentence(text, targetLang = 'pt', sourceLang = 'en') {
  if (!text || !text.trim() || targetLang === 'en') return text;

  const cacheKey = `trans_${targetLang}_${text}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Translation service unavailable');
    const data = await res.json();
    let translated = data[0].map(s => s[0]).join('');

    if (targetLang === 'pt') {
      translated = refineMtgPortuguese(translated);
    }

    cache.set(cacheKey, translated);
    return translated;
  } catch (err) {
    console.error('Translation error:', err.message);
    return text; // Return original text on failure
  }
}

// Translate Full Card API Endpoint
router.post('/translate', async (req, res) => {
  try {
    const { card_id, card_name, type_line, oracle_text, flavor_text, set_code, target_lang = 'pt' } = req.body;

    let officialPrintedCard = null;

    // 1. Try to search Scryfall for official printed card in target language
    if (card_name && target_lang !== 'en') {
      try {
        const query = `!"${card_name}" lang:${target_lang}`;
        const searchUrl = `${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(query)}&include_multilingual=true`;
        const sfData = await scryfallFetch(searchUrl);
        if (sfData && sfData.data && sfData.data.length > 0) {
          officialPrintedCard = sfData.data[0];
        }
      } catch (e) {
        // Official printed card not found for this language, proceed to neural translation
      }
    }

    if (officialPrintedCard) {
      return res.json({
        name: officialPrintedCard.printed_name || officialPrintedCard.name,
        type_line: officialPrintedCard.printed_type_line || officialPrintedCard.type_line,
        oracle_text: officialPrintedCard.printed_text || officialPrintedCard.oracle_text,
        flavor_text: officialPrintedCard.flavor_text || '',
        is_official: true,
        lang: target_lang
      });
    }

    // 2. Perform complete neural translation of sentences
    const [translatedName, translatedType, translatedOracle, translatedFlavor] = await Promise.all([
      card_name ? translateSentence(card_name, target_lang) : Promise.resolve(''),
      type_line ? translateSentence(type_line, target_lang) : Promise.resolve(''),
      oracle_text ? translateSentence(oracle_text, target_lang) : Promise.resolve(''),
      flavor_text ? translateSentence(flavor_text, target_lang) : Promise.resolve('')
    ]);

    res.json({
      name: translatedName || card_name,
      type_line: translatedType || type_line,
      oracle_text: translatedOracle || oracle_text,
      flavor_text: translatedFlavor || flavor_text,
      is_official: false,
      lang: target_lang
    });
  } catch (err) {
    console.error('Card translation error:', err);
    res.status(500).json({ error: 'Failed to translate card' });
  }
});

// Search cards
router.get('/search', async (req, res) => {
  try {
    const { q, page, order, dir, unique } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

    let url = `${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(q)}`;
    if (page) url += `&page=${page}`;
    if (order) url += `&order=${order}`;
    if (dir) url += `&dir=${dir}`;
    if (unique) url += `&unique=${unique}`;

    const data = await scryfallFetch(url);
    res.json(data);
  } catch (err) {
    res.status(err.message.includes('404') ? 404 : 500).json({ error: err.message });
  }
});

// Named card (exact or fuzzy)
router.get('/named', async (req, res) => {
  try {
    const { exact, fuzzy } = req.query;
    if (!exact && !fuzzy) return res.status(400).json({ error: 'Parameter "exact" or "fuzzy" required' });

    let url = `${SCRYFALL_BASE}/cards/named?`;
    if (exact) url += `exact=${encodeURIComponent(exact)}`;
    else url += `fuzzy=${encodeURIComponent(fuzzy)}`;

    const data = await scryfallFetch(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Autocomplete
router.get('/autocomplete', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

    const data = await scryfallFetch(`${SCRYFALL_BASE}/cards/autocomplete?q=${encodeURIComponent(q)}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Random card
router.get('/random', async (req, res) => {
  try {
    const { q } = req.query;
    let url = `${SCRYFALL_BASE}/cards/random`;
    if (q) url += `?q=${encodeURIComponent(q)}`;

    const response = await fetch(url, { headers: SCRYFALL_HEADERS });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get card by ID
router.get('/id/:id', async (req, res) => {
  try {
    const data = await scryfallFetch(`${SCRYFALL_BASE}/cards/${req.params.id}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all sets
router.get('/sets', async (req, res) => {
  try {
    const data = await scryfallFetch(`${SCRYFALL_BASE}/sets`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get set by code
router.get('/sets/:code', async (req, res) => {
  try {
    const data = await scryfallFetch(`${SCRYFALL_BASE}/sets/${req.params.code}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get cards from a specific set (for boosters)
router.get('/sets/:code/cards', async (req, res) => {
  try {
    const { code } = req.params;
    const { page } = req.query;
    let url = `${SCRYFALL_BASE}/cards/search?q=set:${code}+is:booster&order=set`;
    if (page) url += `&page=${page}`;

    const data = await scryfallFetch(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Card symbols (mana symbols)
router.get('/symbols', async (req, res) => {
  try {
    const data = await scryfallFetch(`${SCRYFALL_BASE}/symbology`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
