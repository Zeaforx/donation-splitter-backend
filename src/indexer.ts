import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { rpc, scValToNative } from '@stellar/stellar-sdk';

export type DonationRecord = {
  id: string;
  teamId: number;
  ledger: number;
  transactionHash: string;
  donor: string;
  token: string;
  amount: string;
};

type Store = { cursor?: string; donations: DonationRecord[] };

function readStore(path: string): Store {
  if (!existsSync(path)) return { donations: [] };
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Store;
  if (!Array.isArray(parsed.donations)) throw new Error('Invalid event store');
  return parsed;
}

function saveStore(path: string, store: Store) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  writeFileSync(temp, JSON.stringify(store));
  renameSync(temp, path);
}

export function createIndexer(server: rpc.Server, contractId: string, startLedger: number, path: string) {
  const store = readStore(path);
  let active = false;

  async function poll() {
    if (active) return;
    active = true;
    try {
      const known = new Set(store.donations.map(item => item.id));
      for (let pageNumber = 0; pageNumber < 20; pageNumber++) {
        const request: rpc.Api.GetEventsRequest = {
          filters: [{ type: 'contract', contractIds: [contractId] }],
          limit: 200,
          ...(store.cursor ? { cursor: store.cursor } : { startLedger }),
        };
        const page = await server.getEvents(request);
        for (const event of page.events) {
          const topics = event.topic.map(value => scValToNative(value));
          if (topics[0] !== 'donation') continue;
          const teamId = Number(topics[1]);
          const payload = scValToNative(event.value) as { token?: string; amount?: bigint };
          if (!Number.isSafeInteger(teamId) || !payload || known.has(event.id)) continue;
          store.donations.push({
            id: event.id,
            teamId,
            ledger: event.ledger,
            transactionHash: event.txHash,
            donor: String(topics[2]),
            token: String(payload.token ?? ''),
            amount: String(payload.amount ?? ''),
          });
          known.add(event.id);
        }
        if (page.cursor) store.cursor = page.cursor;
        saveStore(path, store);
        if (page.events.length < 200 || !page.cursor) break;
      }
    } catch (error) {
      console.error('Indexer poll failed:', error);
    } finally {
      active = false;
    }
  }

  function donations(teamId: number, before?: string, limit = 20) {
    const list = store.donations.filter(item => item.teamId === teamId).reverse();
    const start = before ? list.findIndex(item => item.id === before) + 1 : 0;
    const offset = before && start === 0 ? list.length : start;
    const page = list.slice(offset, offset + limit);
    return {
      donations: page,
      nextCursor: list.length > offset + limit ? page.at(-1)?.id ?? null : null,
    };
  }

  void poll();
  const timer = setInterval(() => void poll(), 15_000);
  timer.unref();
  return { donations, poll };
}
