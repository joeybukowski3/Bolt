#!/usr/bin/env node
// monitoring/run_tests.js
// Reads golden_cases.json, calls each API, compares results, exits 1 if anything fails.
// No external dependencies — requires Node 18+ (built-in fetch).

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(__dirname, "golden_cases.json"), "utf8"));

const YEAR_NOW = new Date().getFullYear();
let passed = 0;
let failed = 0;

// ── Helpers ──────────────────────────────────────────────────────────────────

function ageBandFromNumeric(ageNumeric) {
  if (ageNumeric == null) return null;
  const n = Math.round(ageNumeric);
  if (n < 5)  return "0-5 years";
  if (n < 10) return "5-10 years";
  if (n < 15) return "10-15 years";
  return "15+ years";
}

function pass(label, field, got, expected) {
  console.log(`  ✅ ${field}: got "${got}" (expected "${expected}")`);
}

function fail(label, field, got, expected) {
  console.log(`  ❌ ${field}: got "${got}" — expected "${expected}"`);
  failed++;
}

function checkField(label, field, got, expected) {
  if (expected == null) {
    // null means "don't assert this field"
    console.log(`  ⏭  ${field}: skipped (no expected value)`);
    return;
  }
  if (String(got).toLowerCase().includes(String(expected).toLowerCase())) {
    passed++;
    pass(label, field, got, expected);
  } else {
    fail(label, field, got, expected);
  }
}

function checkYear(label, field, got, expected, tolerance = 1) {
  const gotNum = parseInt(got, 10);
  const expNum = parseInt(expected, 10);
  if (isNaN(gotNum) || isNaN(expNum)) {
    fail(label, field, got, expected);
    return;
  }
  if (Math.abs(gotNum - expNum) <= tolerance) {
    passed++;
    pass(label, field, gotNum, expected);
  } else {
    fail(label, field, gotNum, expected);
  }
}

// ── Site-specific request/response adapters ───────────────────────────────────

async function callItemAssist(endpoint, input) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: input.query }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function extractItemAssist(response) {
  return {
    brand: response.brand ?? null,
    estimatedYear: response.estimatedYear ?? null,     // string like "2014" or null
    yearRange: response.yearRange ?? null,             // string like "2010-2015" or null
  };
}

async function callBoltResearch(endpoint, input) {
  const params = new URLSearchParams({ query: input.query, mode: input.mode || "research-fast" });
  const res = await fetch(`${endpoint}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function extractBoltResearch(response) {
  const ageNumeric = response?.releaseDate?.ageNumeric ?? null;
  const manufactureYear = ageNumeric != null ? YEAR_NOW - Math.round(ageNumeric) : null;
  return {
    brand: response?.analysis?.quickSummary ?? null,  // brand name appears in summary
    manufactureYear,
    ageBand: ageBandFromNumeric(ageNumeric),
  };
}

// ── Site dispatch ─────────────────────────────────────────────────────────────

const ADAPTERS = {
  "itemassist.com": {
    call: callItemAssist,
    extract: extractItemAssist,
    yearField: "estimatedYear",
    rangeField: "yearRange",
  },
  "boltresearchteam.com": {
    call: callBoltResearch,
    extract: extractBoltResearch,
    yearField: "manufactureYear",
    rangeField: "ageBand",
  },
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function runAll() {
  for (const [siteName, siteConfig] of Object.entries(cases.sites)) {
    const adapter = ADAPTERS[siteName];
    if (!adapter) {
      console.warn(`\n⚠️  No adapter for site "${siteName}" — skipping.`);
      continue;
    }

    console.log(`\n🌐 ${siteName} (${siteConfig.method} ${siteConfig.endpoint})`);

    for (const tc of siteConfig.cases) {
      console.log(`\n  📋 ${tc.label}`);
      let raw;
      try {
        raw = await adapter.call(siteConfig.endpoint, tc.input);
      } catch (err) {
        console.log(`  ❌ REQUEST FAILED: ${err.message}`);
        failed++;
        continue;
      }

      const got = adapter.extract(raw);
      const exp = tc.expected;

      const { yearField, rangeField } = adapter;
      checkField(tc.label, "brand",     got.brand,           exp.brand);
      checkYear(tc.label,  yearField,   got[yearField],      exp[yearField]);
      checkField(tc.label, rangeField,  got[rangeField],     exp[rangeField]);
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All tests passed.`);
  }
}

runAll().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
