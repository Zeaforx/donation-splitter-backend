# Roadmap for Stellar Wave

## Before applying

- Install dependencies and verify TypeScript, API behavior, and contract reads against the deployed Testnet contract.
- Replace the single-page RPC event query with a durable indexer that stores cursors and donation events.
- Return complete, paginated donation history and distinguish unavailable RPC from a missing team.
- Add API tests and publish an example response for every endpoint.

## Scoped contributor issues after the baseline works

1. **Cursor persistence:** store the last processed RPC cursor and resume after a restart. Acceptance: no duplicate or missing donation event across restarts.
2. **Donation pagination:** implement a stable cursor for `GET /teams/:id/donations`. Acceptance: a team with more than 200 donations can be fully traversed.
3. **OpenAPI description:** document all endpoints and error codes. Acceptance: examples match live Testnet responses.

The backend never signs or submits a payment. Keep all keys out of its configuration.
