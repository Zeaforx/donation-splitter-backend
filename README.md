# Donation Splitter backend

Public read API for the separate Soroban contract. The service has no signing key and cannot move funds. It simulates `team_count` and `get_team` contract reads and exposes recent `Donation` events from Stellar RPC.

## Endpoints

- `GET /health`
- `GET /teams?page=1&limit=12`
- `GET /teams/:id`
- `GET /teams/:id/donations`

Copy `.env.example` to `.env` and set the deployed contract ID, a funded public Testnet account for read simulations, and the deployment ledger. Load the `.env` in your process manager or shell before starting Node. The donations endpoint currently returns the first RPC page of events from the deployment ledger and is **not a permanent history archive**. A durable cursor-based indexer is an intended contributor issue.

License: Apache-2.0.
