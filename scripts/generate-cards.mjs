#!/usr/bin/env node
// Generates static repo stat cards (SVG) for the org profile README.
// Requires GITHUB_TOKEN. Output: assets/cards/<repo>.svg

import { mkdir, writeFile } from "node:fs/promises";

const REPOS = [
  "mainsail",
  "MainsailOS",
  "crowsnest",
  "mainsail-config",
  "moonraker-timelapse",
  "sonar",
  "virtual-klipper-printer",
];

const ORG = "mainsail-crew";
const OUT_DIR = "assets/cards";

const theme = {
  bg: "#1e1e1e",
  border: "#2d2d2d",
  title: "#ffffff",
  text: "#9e9e9e",
  icon: "#D41216",
};

// Primer Octicons (MIT), 16x16
const icons = {
  repo: "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z",
  star: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
  fork: "M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z",
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n));

// ponytail: greedy wrap at 52 chars, max 2 lines, close enough at 12px
function wrap(text, max = 52, maxLines = 2) {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      if (lines.length === maxLines - 1) {
        lines.push(line.trim() + "…");
        return lines;
      }
      lines.push(line.trim());
      line = w;
    } else {
      line += " " + w;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function renderCard(repo) {
  const descLines = wrap(repo.description)
    .map((l, i) => `<tspan x="25" dy="${i === 0 ? 0 : 16}">${esc(l)}</tspan>`)
    .join("");
  const lang = repo.primaryLanguage;
  const stats = [];
  let x = 25;
  if (lang) {
    stats.push(
      `<circle cx="${x + 5}" cy="100" r="5" fill="${esc(lang.color || theme.text)}"/>` +
        `<text x="${x + 16}" y="104" class="stat">${esc(lang.name)}</text>`,
    );
    x += 16 + lang.name.length * 7 + 24;
  }
  stats.push(
    `<g transform="translate(${x},92)"><path d="${icons.star}" fill="${theme.icon}"/></g>` +
      `<text x="${x + 22}" y="104" class="stat">${fmt(repo.stargazerCount)}</text>`,
  );
  x += 22 + fmt(repo.stargazerCount).length * 7 + 24;
  stats.push(
    `<g transform="translate(${x},92)"><path d="${icons.fork}" fill="${theme.icon}"/></g>` +
      `<text x="${x + 22}" y="104" class="stat">${fmt(repo.forkCount)}</text>`,
  );

  const title = esc(repo.name) + (repo.isArchived ? " (archived)" : "");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120" role="img" aria-labelledby="t">
  <title id="t">${esc(repo.name)}: ${esc(repo.description ?? "")}</title>
  <style>
    text { font-family: 'Segoe UI', Ubuntu, Sans-Serif; }
    .title { fill: ${theme.title}; font-size: 16px; font-weight: 600; }
    .desc { fill: ${theme.text}; font-size: 12px; }
    .stat { fill: ${theme.text}; font-size: 12px; }
  </style>
  <rect x="0.5" y="0.5" width="399" height="119" rx="6" fill="${theme.bg}" stroke="${theme.border}"/>
  <g transform="translate(25,20)"><path d="${icons.repo}" fill="${theme.icon}"/></g>
  <text x="50" y="33" class="title">${title}</text>
  <text x="25" y="60" class="desc">${descLines}</text>
  ${stats.join("\n  ")}
</svg>
`;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN is required");
    process.exit(1);
  }

  const query = `{ ${REPOS.map(
    (r, i) =>
      `r${i}: repository(owner: "${ORG}", name: "${r}") { name description stargazerCount forkCount isArchived primaryLanguage { name color } }`,
  ).join(" ")} }`;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    console.error(`GitHub API error: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const { data, errors } = await res.json();
  if (errors?.length || !data) {
    console.error("GraphQL errors:", JSON.stringify(errors));
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  for (const repo of Object.values(data)) {
    const file = `${OUT_DIR}/${repo.name.toLowerCase()}.svg`;
    await writeFile(file, renderCard(repo));
    console.log(`wrote ${file}`);
  }
}

// self-check: node scripts/generate-cards.mjs --test
if (process.argv.includes("--test")) {
  console.assert(fmt(999) === "999" && fmt(1000) === "1k" && fmt(1234) === "1.2k", "fmt");
  console.assert(esc(`a&<>"'`) === "a&amp;&lt;&gt;&quot;&#39;", "esc");
  const w = wrap("word ".repeat(40).trim());
  console.assert(w.length === 2 && w[1].endsWith("…"), "wrap");
  console.assert(wrap("short text").length === 1, "wrap short");
  console.log("self-check ok");
} else {
  main();
}
