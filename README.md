# Polystacks

A Clarity v3.2 prediction market-style smart contract with tests and deployment plan.

- Network: Stacks Testnet
- Contract: `ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK.polystacks`
- Clarity version: 3

## Overview
Polystacks lets an admin create markets with a question, deadline, resolver, and fee settings. Users can stake on Yes/No. After the deadline, the resolver sets the outcome. Winners can withdraw their stake plus proportional winnings. The fee recipient can withdraw protocol fees.

## Contract Address
- Testnet: `ST3JY6NFBQY89NCKPDCDX9NZZ7D4VPSEY7N0NRXEK.polystacks`

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
Using Clarinet console (adapt to your env):
```clarity
(contract-call? .polystacks create-market u"Example?" u{deadline} 'ST... u100 'ST...)
(contract-call? .polystacks stake-yes u{id} u1000)
(contract-call? .polystacks stake-no u{id} u500)
(contract-call? .polystacks resolve u{id} true)
(contract-call? .polystacks withdraw u{id})
(contract-call? .polystacks withdraw-fee u{id})
```

## Files
- `contracts/polystacks.clar` — Contract source
- `tests/polystacks.test.ts` — Simnet test suite (Vitest)
- `deployments/default.testnet-plan.yaml` — Testnet deployment plan

## Notes
- Read-only return shapes may differ between environments (raw CV vs ResponseOk). In tests we normalize via an `unwrap` and `unwrapOk` helper.
- Some test flows mine extra blocks to avoid timing races around deadlines.

## License
MIT
