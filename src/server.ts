import express from 'express';
import cors from 'cors';
import { BASE_FEE, Contract, Networks, TransactionBuilder, rpc, scValToNative, nativeToScVal, xdr } from '@stellar/stellar-sdk';
import { existsSync } from 'node:fs';
import { createIndexer } from './indexer.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const contractId = process.env.SPLITTER_CONTRACT_ID ?? '';
const readAccount = process.env.READ_ACCOUNT ?? '';
const startLedger = Number(process.env.DEPLOYMENT_LEDGER ?? 0);
if (!contractId || !readAccount || !Number.isSafeInteger(startLedger) || startLedger <= 0) {
  throw new Error('Set SPLITTER_CONTRACT_ID, READ_ACCOUNT and DEPLOYMENT_LEDGER');
}
const passphrase = process.env.STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;
const server = new rpc.Server(process.env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org');
const indexer = createIndexer(server, contractId, startLedger, process.env.EVENT_STORE_PATH ?? 'data/events.json');
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.PUBLIC_ORIGIN ?? 'http://localhost:5173' }));

function jsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, jsonSafe(v)]));
  return value;
}

async function read(method: string, args: xdr.ScVal[] = []) {
  const account = await server.getAccount(readAccount);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: passphrase })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30).build();
  const result = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(result) || !('result' in result) || !result.result) throw new Error(`Contract read failed: ${method}`);
  return jsonSafe(scValToNative(result.result.retval));
}

app.get('/health', (_req, res) => res.json({ ok: true, network: passphrase === Networks.TESTNET ? 'testnet' : 'custom' }));

app.get('/teams', async (req, res) => {
  try {
    const count = Number(await read('team_count'));
    const page = Math.max(1, Math.min(Number(req.query.page) || 1, 100000));
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 12, 20));
    const ids = Array.from({ length: Math.max(0, Math.min(limit, count - (page - 1) * limit)) }, (_, i) => count - (page - 1) * limit - i);
    const teams = await Promise.all(ids.map(async id => {
      try { return await read('get_team', [rpcId(id)]); } catch { return null; }
    }));
    res.json({ count, page, teams: teams.filter(Boolean) });
  } catch (error) { fail(res, error); }
});

app.get('/teams/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return void res.status(400).json({ error: 'Invalid team ID' });
  try { res.json(await read('get_team', [rpcId(id)])); }
  catch { res.status(404).json({ error: 'Team not found or temporarily unavailable' }); }
});

app.get('/teams/:id/donations', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return void res.status(400).json({ error: 'Invalid team ID' });
  const before = typeof req.query.before === 'string' ? req.query.before : undefined;
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
  res.json(indexer.donations(id, before, limit));
});

function rpcId(id: number) {
  return nativeToScVal(BigInt(id), { type: 'u64' });
}

function fail(res: express.Response, error: unknown) {
  console.error(error);
  res.status(502).json({ error: 'Stellar RPC is unavailable or the contract is not configured correctly' });
}

app.listen(Number(process.env.PORT ?? 8080), () => console.log('Donation Splitter API listening'));
