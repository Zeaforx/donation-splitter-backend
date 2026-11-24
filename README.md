# Donation Splitter backend

Public read API for the separate Soroban contract. The service has no signing key and cannot move funds. It simulates `team_count` and `get_team` contract reads and persists `Donation` events from Stellar RPC into a local JSON store with a cursor.

## Endpoints

- `GET /health`
- `GET /teams?page=1&limit=12`
- `GET /teams/:id`
- `GET /teams/:id/donations?before=<event-id>&limit=20`

Copy `.env.example` to `.env` and set the deployed contract ID, a funded public Testnet account for read simulations, and the deployment ledger. The service loads `.env` on startup. The indexer must start before Stellar RPC prunes its deployment events; keep its `data/events.json` file across restarts. A database-backed indexer and stronger recovery behavior are future improvements.

License: Apache-2.0.
# donation-splitter-backend
