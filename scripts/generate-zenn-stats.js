import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZENN_USERNAME = 'hrtk92';

async function fetchZennStats() {
  try {
    const articlesResponse = await axios.get(`https://zenn.dev/api/articles?username=${ZENN_USERNAME}&order=latest`);
    const articles = articlesResponse.data.articles;

    const latestArticles = articles.slice(0, 10);

    const articleDetails = await Promise.all(
      latestArticles.map(async (article) => {
        try {
          const detailResponse = await axios.get(`https://zenn.dev/api/articles/${article.slug}`);
          return {
            title: article.title,
            slug: article.slug,
            likes: detailResponse.data.article.liked_count || 0,
            published_at: article.published_at,
            url: `https://zenn.dev/${ZENN_USERNAME}/articles/${article.slug}`
          };
        } catch (error) {
          console.error(`Error fetching details for ${article.slug}:`, error.message);
          return {
            title: article.title,
            slug: article.slug,
            likes: 0,
            published_at: article.published_at,
            url: `https://zenn.dev/${ZENN_USERNAME}/articles/${article.slug}`
          };
        }
      })
    );

    const sortedArticles = articleDetails.sort((a, b) => b.likes - a.likes);

    return sortedArticles;
  } catch (error) {
    console.error('Error fetching Zenn stats:', error.message);
    return [];
  }
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

async function generateStatsImage(articles) {
  const width = 800;
  const height = 500;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0d1117;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#161b22;stop-opacity:1" />
      </linearGradient>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.3"/>
      </filter>
    </defs>

    <rect width="${width}" height="${height}" fill="url(#bg)" rx="12"/>

    <text x="${width/2}" y="40" font-family="'Segoe UI', Arial, sans-serif" font-size="28" font-weight="600"
          fill="#f0f6fc" text-anchor="middle">❤️ Top Zenn Articles by Likes</text>

    <text x="${width/2}" y="65" font-family="'Segoe UI', Arial, sans-serif" font-size="14"
          fill="#8b949e" text-anchor="middle">Updated: ${new Date().toLocaleDateString()}</text>`;

  let yOffset = 90;
  const cardWidth = 360;
  const cardHeight = 120;
  const cardSpacing = 20;
  const leftMargin = 30;

  articles.slice(0, 4).forEach((article, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = leftMargin + col * (cardWidth + cardSpacing);
    const y = yOffset + row * (cardHeight + cardSpacing);

    svg += `
    <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}"
          fill="#21262d" stroke="#30363d" stroke-width="1" rx="8" filter="url(#shadow)"/>

    <text x="${x + 20}" y="${y + 30}" font-family="'Segoe UI', Arial, sans-serif" font-size="16"
          font-weight="600" fill="#f0f6fc">${truncateText(article.title, 35)}</text>

    <text x="${x + 20}" y="${y + 55}" font-family="'Segoe UI', Arial, sans-serif" font-size="18"
          font-weight="700" fill="#da3633">❤️ ${article.likes} likes</text>

    <text x="${x + 20}" y="${y + 75}" font-family="'Segoe UI', Arial, sans-serif" font-size="12"
          fill="#8b949e">📅 ${new Date(article.published_at).toLocaleDateString()}</text>

    <text x="${x + 20}" y="${y + 95}" font-family="'Segoe UI', Arial, sans-serif" font-size="11"
          fill="#58a6ff">🔗 zenn.dev/${ZENN_USERNAME}/articles/${article.slug.substring(0, 20)}...</text>`;
  });

  svg += `
    <rect x="0" y="${height - 40}" width="${width}" height="40" fill="#0d1117" opacity="0.8"/>
    <text x="${width/2}" y="${height - 15}" font-family="'Segoe UI', Arial, sans-serif" font-size="14"
          font-weight="500" fill="#58a6ff" text-anchor="middle">🌟 @${ZENN_USERNAME} on Zenn</text>
  </svg>`;

  const outputDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, 'zenn-stats.svg'), svg);

  console.log('Zenn stats SVG generated successfully!');
}

async function main() {
  console.log('Fetching Zenn articles...');
  const articles = await fetchZennStats();

  if (articles.length > 0) {
    console.log(`Found ${articles.length} articles`);
    await generateStatsImage(articles);
  } else {
    console.log('No articles found');
  }
}

main().catch(console.error);
