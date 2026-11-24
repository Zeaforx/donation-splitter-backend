# Roadmap for Stellar Wave

## Before applying

- Install dependencies and verify TypeScript, API behavior, and contract reads against the deployed Testnet contract.
- Verify the cursor-based local event indexer against a deployed Testnet contract and test restart recovery.
- Distinguish unavailable RPC from a missing team.
- Add API tests and publish an example response for every endpoint.

## Scoped contributor issues after the baseline works

1. **Database-backed event store:** migrate the local JSON store to a transactional database. Acceptance: no duplicate or missing donation event across restarts, and concurrent readers do not block indexing.
2. **History recovery:** add an archive RPC fallback if the deployment ledger is older than the primary RPC retention window. Acceptance: a fresh installation can backfill an old contract's events.
3. **OpenAPI description:** document all endpoints and error codes. Acceptance: examples match live Testnet responses.

The backend never signs or submits a payment. Keep all keys out of its configuration.
