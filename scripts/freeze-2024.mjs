import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import nunjucks from "nunjucks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVES_ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR =
  process.env.SOURCE_DIR ||
  path.resolve(ARCHIVES_ROOT, "../chrisseckler-portfolio-site");
const OUT_DIR = path.join(ARCHIVES_ROOT, "2024");

function fixAssetPaths(html) {
  return html
    .replace(/href="css\//g, 'href="/css/')
    .replace(/src="js\//g, 'src="/js/')
    .replace(
      /document\.write\('<script src="js\//g,
      'document.write(\'<script src="/js/',
    );
}

async function fetchPersonalLinks(notion) {
  const response = await notion.databases.query({
    database_id: process.env.LINKS_NOTION_DATABASE_ID,
    sorts: [{ property: "title", direction: "ascending" }],
  });

  return response.results
    .filter((page) => !!page.properties.isActive.checkbox)
    .map((page) => ({
      url: page.properties.url.rich_text[0].plain_text,
      imgSrc: page.properties.imgSrc.rich_text[0].plain_text,
      title: page.properties.title.title[0].plain_text,
      description: page.properties.description.rich_text[0].plain_text,
      imageAlt: page.properties.title.title[0].plain_text,
    }));
}

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".DS_Store") continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  const envPath = path.join(SOURCE_DIR, ".env");
  dotenv.config({ path: envPath });

  if (!process.env.NOTION_API_KEY || !process.env.LINKS_NOTION_DATABASE_ID) {
    throw new Error(
      `Missing Notion credentials in ${envPath}. Set NOTION_API_KEY and LINKS_NOTION_DATABASE_ID.`,
    );
  }

  const constantsModule = await import(
    pathToFileURL(path.join(SOURCE_DIR, "constants.js")).href
  );
  const { constants, projectCategories } = constantsModule;
  const { navBarLinks, skills, projects } = constants;

  nunjucks.configure(path.join(SOURCE_DIR, "views"), {
    autoescape: true,
    noCache: true,
  });

  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const myLinks = await fetchPersonalLinks(notion);

  const homeHtml = nunjucks.render("home.njk", {
    navBarLinks,
    skills,
    projects,
    projectCategories: Object.values(projectCategories),
  });

  const linksHtml = nunjucks.render("links.njk", {
    myLinks,
    pageName: "Links",
    navBarLinks,
  });

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(path.join(OUT_DIR, "links"), { recursive: true });

  await fs.writeFile(
    path.join(OUT_DIR, "index.html"),
    fixAssetPaths(homeHtml),
    "utf8",
  );
  await fs.writeFile(
    path.join(OUT_DIR, "links/index.html"),
    fixAssetPaths(linksHtml),
    "utf8",
  );

  await copyDirectory(
    path.join(SOURCE_DIR, "public"),
    OUT_DIR,
  );

  await fs.writeFile(
    path.join(OUT_DIR, "vercel.json"),
    JSON.stringify({ cleanUrls: true }, null, 2) + "\n",
    "utf8",
  );

  const frozenAt = new Date().toISOString();
  await fs.writeFile(
    path.join(OUT_DIR, "FROZEN.md"),
    `# 2024 portfolio snapshot\n\nFrozen at: ${frozenAt}\n\nSource: ${SOURCE_DIR}\n\nRegenerate with \`npm run freeze:2024\` from the archives repo root.\n`,
    "utf8",
  );

  console.log(`Wrote ${OUT_DIR}`);
  console.log(`  index.html (${myLinks.length} links baked into /links)`);
  console.log(`  Frozen at ${frozenAt}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
