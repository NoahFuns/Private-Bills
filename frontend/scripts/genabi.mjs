import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const CONTRACT_NAME = "PrivateBills";

// <root>/PrivateBills/backend
const rel = "../backend";

// <root>/PrivateBills/frontend/abi
const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

const dir = path.resolve(rel);
const dirname = path.basename(dir);

const line =
  "\n===================================================================\n";

if (!fs.existsSync(dir)) {
  console.error(
    `${line}Unable to locate ${rel}. Expecting PrivateBills/${dirname}${line}`
  );
  process.exit(1);
}

if (!fs.existsSync(outdir)) {
  console.error(`${line}Unable to locate ${outdir}.${line}`);
  process.exit(1);
}

const deploymentsDir = path.join(dir, "deployments");

function readChainIdFromDir(chainDir) {
  const candidates = [
    path.join(chainDir, "chainId"),
    path.join(chainDir, ".chainId"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, "utf-8").trim();
        const n = Number(raw);
        if (!Number.isNaN(n) && n > 0) return n;
      } catch (_) {}
    }
  }
  return undefined;
}

function collectDeployments(contractName) {
  if (!fs.existsSync(deploymentsDir)) {
    return [];
  }
  const entries = fs
    .readdirSync(deploymentsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const results = [];
  for (const chainName of entries) {
    const chainDir = path.join(deploymentsDir, chainName);
    const file = path.join(chainDir, `${contractName}.json`);
    if (!fs.existsSync(file)) {
      continue; // skip networks without this contract
    }
    try {
      const jsonString = fs.readFileSync(file, "utf-8");
      const obj = JSON.parse(jsonString);
      const chainId = obj.chainId ?? readChainIdFromDir(chainDir);
      if (!chainId) {
        console.warn(`[genabi] skip '${chainName}': cannot determine chainId`);
        continue;
      }
      results.push({
        chainName,
        chainId,
        address: obj.address,
        abi: obj.abi,
      });
    } catch (e) {
      console.warn(`[genabi] skip '${chainName}': ${e}`);
    }
  }
  return results;
}

const deployments = collectDeployments(CONTRACT_NAME);

let abiRef = undefined;
const addresses = {};
for (const d of deployments) {
  if (!abiRef) {
    abiRef = d.abi;
  } else if (JSON.stringify(abiRef) !== JSON.stringify(d.abi)) {
    console.warn(
      `${line}Warning: ABI mismatch on network '${d.chainName}'. This network will be skipped in addresses output.${line}`
    );
    continue;
  }
  addresses[String(d.chainId)] = {
    address: d.address,
    chainId: d.chainId,
    chainName: d.chainName,
  };
}

const finalAbi = abiRef ?? [];

const tsCode = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi: finalAbi }, null, 2)} as const;
\n`;
const tsAddresses = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}Addresses = ${JSON.stringify(addresses, null, 2)} as const;
`;

console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}ABI.ts`)}`);
console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}Addresses.ts`)}`);
console.log(tsAddresses);

fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsCode, "utf-8");
fs.writeFileSync(
  path.join(outdir, `${CONTRACT_NAME}Addresses.ts`),
  tsAddresses,
  "utf-8"
);


