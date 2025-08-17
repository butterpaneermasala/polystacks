# Polystacks

A Clarity v3.2 prediction market-style smart contract with tests and deployment plan.

- Network: Stacks Testnet
- Contract: `ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK.polystacks`
- Clarity version: 3

<!-- Frontend UI screenshot -->
<p align="center">
  <img src="frontend/screenshot-ui.png" alt="Polystacks frontend UI" width="900" />
  
</p>
<sub>Save your screenshot as <code>frontend/screenshot-ui.png</code> to update this image.</sub>

## Overview
Polystacks lets an admin create markets with a question, deadline, resolver, and fee settings. Users can stake on Yes/No. After the deadline, the resolver sets the outcome. Winners can withdraw their stake plus proportional winnings. The fee recipient can withdraw protocol fees.

## Current Implementation
- __Clarity 3.2__: Uses map schemas and optional matching idioms; compiled for epoch 3.2.
- __Binary markets__: Single yes/no outcome per market.
- __Per-market config__: `resolver`, `fee-bps`, `fee-recipient`, `deadline` stored on each market.
- __Staking__: Users stake STX on either side before `deadline`.
- __Resolution__: Only the market `resolver` can resolve after `deadline` to `true` or `false`.
- __Payouts__: Proportional payout to winners from the losing side, minus protocol fee.
- __Fees__: Fee (basis points) routed to `fee-recipient` and claimable once per market.
- __Claims tracking__: Prevents double-withdraw for winners and double fee-claim.
- __Admin__: Admin can be updated by current admin via `set-admin`.
- __Views__: Read-only helpers to inspect markets, totals, stakes, claim state.
- __Tests__: Vitest + Simnet coverage for core flows (create, stake, resolve, withdraw, fee, deadlines, permissions).

Limitations (by design for MVP):
- Only STX staking is supported (no SIP-010 tokens yet).
- No market cancellation/invalid outcome flow.
- No dispute/appeal process for resolutions.
- No multi-outcome markets (binary only).

## Contract Address
- Testnet: `ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK.polystacks`

### Block Explorer
- Hiro Explorer: https://explorer.hiro.so/txid/ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK.polystacks?chain=testnet

### Assets
- Frontend screenshot reference: `frontend/screenshot-ui.png` (add/replace this file to update the image shown above)

## Public Functions
- `set-admin(principal)`
  - Sets contract admin. Only current admin can call.
- `create-market(question: (string-utf8 256), deadline: uint, resolver: principal, fee-bps: uint, fee-recipient: principal) -> (response uint uint)`
  - Returns market id.
- `stake-yes(id: uint, amount: uint) -> (response bool uint)`
- `stake-no(id: uint, amount: uint) -> (response bool uint)`
- `resolve(id: uint, outcome: bool) -> (response bool uint)`
  - Only `resolver` after `deadline`.
- `withdraw(id: uint) -> (response bool uint)`
  - Claim winnings if user staked on winning side.
- `withdraw-fee(id: uint) -> (response bool uint)`
  - Fee recipient withdraws protocol fee for a resolved market.

Note: Return types are expressed as `response <ok> <err>` in Clarity; some functions return additional data as needed by implementation.

## Read-Only Functions
- `get-admin() -> principal`
- `get-market(id: uint) -> (optional { question: (string-utf8 256), deadline: uint, resolver: principal, fee-bps: uint, fee-recipient: principal, status: uint, outcome: (optional bool) })`
- `get-stake-yes(id: uint, who: principal) -> (response uint uint)` or `uint` depending on environment
- `get-stake-no(id: uint, who: principal) -> (response uint uint)` or `uint` depending on environment
- `has-claimed(id: uint, who: principal) -> bool`
- `fee-claimed(id: uint) -> bool`
- `is-open(id: uint) -> bool`
- `get-totals(id: uint) -> { yes: uint, no: uint }`
- `compute-fee(total: uint, bps: uint) -> uint`

Implementation specifics may vary slightly; see `contracts/polystacks.clar` for authoritative signatures.

## Error Codes (common)
- `u100` ERR-NOT-ADMIN
- `u101` ERR-MARKET-NOT-FOUND
- `u102` ERR-MARKET-CLOSED / NOT-OPEN
- `u103` ERR-BEFORE-DEADLINE
- `u104` ERR-NOT-RESOLVER
- `u105` ERR-NOT-RESOLVED
- `u106` ERR-ALREADY-CLAIMED
- `u107` ERR-FEE-ALREADY-CLAIMED

Check the contract for full list and exact meanings.

## Typical Flows
- Create market (admin):
  1. `set-admin(admin)` (once)
  2. `create-market(question, deadline, resolver, feeBps, feeRecipient)`
- Participate:
  1. `stake-yes(id, amount)` or `stake-no(id, amount)` before deadline
- Resolve & withdraw:
  1. After deadline, `resolve(id, outcome)` by `resolver`
  2. Winners call `withdraw(id)`
  3. Fee recipient calls `withdraw-fee(id)`

## Development
### Requirements
- Node.js (v18+ recommended)
- Clarinet

### Install
```bash
npm install
```

### Run Tests
Tests are implemented with Vitest and `vitest-environment-clarinet` (Simnet).

```bash
npm test -s
```

Test file: `tests/polystacks.test.ts`

### Lint/Typecheck
```bash
npm run lint
npm run typecheck
```

## Deployment (Testnet)
1. Generate a deployment plan (manual cost):
```bash
clarinet deployments generate --testnet --manual-cost
```
This creates `deployments/default.testnet-plan.yaml`.

2. Apply the plan to testnet:
```bash
clarinet deployments apply --testnet
```
Notes:
- If you see a mnemonic error, update `settings/Testnet.toml` with a valid 12/15/18/21/24-word mnemonic for the deploying address.
- The generated plan should include:
  - `contract-name: polystacks`
  - `expected-sender: ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK`
  - `path: contracts/polystacks.clar`
  - `clarity-version: 3`

## Interacting (Examples)
### Clarinet Console (deployed address)
Open Clarinet console and call against the deployed testnet contract principal:
```clarity
;; create-market (must be admin on deployed contract)
(contract-call? 'ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK .polystacks create-market u"Example?" u{deadline} 'ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK u100 'ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK)

;; stake
(contract-call? 'ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK .polystacks stake-yes u{id} u1000)
(contract-call? 'ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK .polystacks stake-no  u{id} u500)

;; resolve and withdraw
(contract-call? 'ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK .polystacks resolve u{id} true)
(contract-call? 'ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK .polystacks withdraw u{id})
(contract-call? 'ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK .polystacks withdraw-fee u{id})
```

### Hiro API (read-only) via curl
Read-only calls use hex-encoded Clarity values. Example: `get-market(id)` on testnet.

1) Generate hex for arguments (Node/TypeScript):
```ts
import { uintCV, cvToHex } from '@stacks/transactions';
console.log(cvToHex(uintCV(1))); // prints hex for u1, e.g. 0x...
```

2) Call the read-only endpoint:
```bash
curl -s -X POST \
  "https://api.testnet.hiro.so/v2/contracts/call-read/ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK/polystacks/get-market" \
  -H 'content-type: application/json' \
  -d '{
    "sender": "ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK",
    "arguments": ["<hex-from-cvToHex>"]
  }'
```

For other read-onlys, encode each argument similarly using `@stacks/transactions` constructors and `cvToHex`.

## Files
- `contracts/polystacks.clar` — Contract source
- `tests/polystacks.test.ts` — Simnet test suite (Vitest)
- `deployments/default.testnet-plan.yaml` — Testnet deployment plan

## Notes
- Read-only return shapes may differ between environments (raw CV vs ResponseOk). In tests we normalize via an `unwrap` and `unwrapOk` helper.
- Some test flows mine extra blocks to avoid timing races around deadlines.

## Future Plans
- __SIP-010 token support__: Allow staking/settlement in fungible tokens.
- __Market cancellation/invalid__: Admin or resolver-initiated cancellation with refunds.
- __Dispute/appeal mechanisms__: Optional multi-sig/oracle or community challenge windows.
- __Multi-outcome markets__: Support >2 outcomes with proportional settlement.
- __AMM/liquidity pools__: Automated pricing and continuous trading pre-deadline.
- __Events/analytics__: Emit richer events; indexer and dashboard for markets and volumes.
- __Treasury/fee strategy__: Tiered fees, revenue sharing, and DAO treasury wiring.
- __Access controls__: Guardian/pausable mode and rate limits for safety.
- __Batch operations__: Batch withdrawals/claims for gas optimization.
- __Frontend dApp__: Web UI for creating, participating, resolving, and claiming.
- __Mainnet readiness__: Harden tests (property/fuzz), threat modeling, audits, and deployment scripts.

## License
MIT
