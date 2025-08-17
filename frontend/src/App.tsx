import React, { useMemo, useState } from 'react';
import { connectWallet, getAddress, isSignedIn, signOut, userSession } from './lib/wallet';
import { CONTRACT_ADDRESS } from './lib/constants';
import { roGetMarket, callCreateMarket, callStakeYes, callStakeNo, callResolve, callWithdraw, callWithdrawFee } from './lib/contract';

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="kv"><b>{props.label}</b></div>
      {props.children}
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<string>('');
  const authed = isSignedIn();
  const addr = getAddress();

  // create market state
  const [q, setQ] = useState('Will BTC be >$100k by EOY?');
  const [deadline, setDeadline] = useState<number>(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7);
  const [resolver, setResolver] = useState<string>(CONTRACT_ADDRESS);
  const [feeBps, setFeeBps] = useState<number>(100);
  const [feeRecipient, setFeeRecipient] = useState<string>(CONTRACT_ADDRESS);

  // common
  const [marketId, setMarketId] = useState<number>(1);
  const [stakeAmt, setStakeAmt] = useState<number>(1000);
  const [outcome, setOutcome] = useState<boolean>(true);

  const onConnect = async () => {
    try {
      await connectWallet();
      window.location.reload();
    } catch (e: any) {
      setStatus(e.message || String(e));
    }
  };

  const onCreate = async () => {
    setStatus('Opening wallet to create market...');
    try {
      await callCreateMarket({ question: q, deadline, resolver, feeBps, feeRecipient });
      setStatus('Transaction submitted in Leather. Check your wallet.');
    } catch (e: any) {
      setStatus('Create failed: ' + (e.message || String(e)));
    }
  };

  const onStakeYes = async () => {
    setStatus('Opening wallet to stake YES...');
    try { await callStakeYes(marketId, stakeAmt); setStatus('Stake YES submitted.'); }
    catch (e: any) { setStatus('Stake YES failed: ' + (e.message || String(e))); }
  };

  const onStakeNo = async () => {
    setStatus('Opening wallet to stake NO...');
    try { await callStakeNo(marketId, stakeAmt); setStatus('Stake NO submitted.'); }
    catch (e: any) { setStatus('Stake NO failed: ' + (e.message || String(e))); }
  };

  const onResolve = async () => {
    setStatus('Opening wallet to resolve...');
    try { await callResolve(marketId, outcome); setStatus('Resolve submitted.'); }
    catch (e: any) { setStatus('Resolve failed: ' + (e.message || String(e))); }
  };

  const onWithdraw = async () => {
    setStatus('Opening wallet to withdraw winnings...');
    try { await callWithdraw(marketId); setStatus('Withdraw submitted.'); }
    catch (e: any) { setStatus('Withdraw failed: ' + (e.message || String(e))); }
  };

  const onWithdrawFee = async () => {
    setStatus('Opening wallet to withdraw fee...');
    try { await callWithdrawFee(marketId); setStatus('Withdraw fee submitted.'); }
    catch (e: any) { setStatus('Withdraw fee failed: ' + (e.message || String(e))); }
  };

  const [inspectId, setInspectId] = useState<number>(1);
  const [inspectData, setInspectData] = useState<any>(null);
  const onInspect = async () => {
    setStatus('Fetching market...');
    try {
      const data = await roGetMarket(inspectId);
      setInspectData(data);
      setStatus('Fetched.');
    } catch (e: any) {
      setStatus('Read-only failed: ' + (e.message || String(e)));
    }
  };

  return (
    <>
      <header className="header">
        <div className="brand">POLYSTACKS</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="badge">testnet</span>
          {!authed ? (
            <button className="btn primary" onClick={onConnect}>Connect Leather</button>
          ) : (
            <>
              <span className="kv"><b>addr</b>: {addr}</span>
              <button className="btn" onClick={() => { signOut(); window.location.reload(); }}>Sign out</button>
            </>
          )}
        </div>
      </header>

      <main className="container">
        <div className="grid">
          <section className="card">
            <h3>Create Market</h3>
            <Field label="Question">
              <input className="input" value={q} onChange={e => setQ(e.target.value)} />
            </Field>
            <div className="row">
              <Field label="Deadline (unix)">
                <input className="input" type="number" value={deadline} onChange={e => setDeadline(Number(e.target.value))} />
              </Field>
              <Field label="Fee bps">
                <input className="input" type="number" value={feeBps} onChange={e => setFeeBps(Number(e.target.value))} />
              </Field>
            </div>
            <div className="row">
              <Field label="Resolver">
                <input className="input" value={resolver} onChange={e => setResolver(e.target.value)} />
              </Field>
              <Field label="Fee recipient">
                <input className="input" value={feeRecipient} onChange={e => setFeeRecipient(e.target.value)} />
              </Field>
            </div>
            <button className="btn primary full" onClick={onCreate} disabled={!authed}>Create</button>
          </section>

          <section className="card">
            <h3>Stake</h3>
            <div className="row">
              <Field label="Market id">
                <input className="input" type="number" value={marketId} onChange={e => setMarketId(Number(e.target.value))} />
              </Field>
              <Field label="Amount (uSTX)">
                <input className="input" type="number" value={stakeAmt} onChange={e => setStakeAmt(Number(e.target.value))} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={onStakeYes} disabled={!authed}>Stake YES</button>
              <button className="btn" onClick={onStakeNo} disabled={!authed}>Stake NO</button>
            </div>
          </section>

          <section className="card">
            <h3>Resolve</h3>
            <div className="row">
              <Field label="Market id">
                <input className="input" type="number" value={marketId} onChange={e => setMarketId(Number(e.target.value))} />
              </Field>
              <Field label="Outcome">
                <select className="select" value={String(outcome)} onChange={e => setOutcome(e.target.value === 'true')}>
                  <option value="true">true (YES)</option>
                  <option value="false">false (NO)</option>
                </select>
              </Field>
            </div>
            <button className="btn primary full" onClick={onResolve} disabled={!authed}>Resolve</button>
          </section>

          <section className="card">
            <h3>Withdraw</h3>
            <Field label="Market id">
              <input className="input" type="number" value={marketId} onChange={e => setMarketId(Number(e.target.value))} />
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={onWithdraw} disabled={!authed}>Withdraw Winnings</button>
              <button className="btn" onClick={onWithdrawFee} disabled={!authed}>Withdraw Fee</button>
            </div>
          </section>

          <section className="card">
            <h3>Inspect Market</h3>
            <div className="row">
              <Field label="Market id">
                <input className="input" type="number" value={inspectId} onChange={e => setInspectId(Number(e.target.value))} />
              </Field>
              <div>
                <div className="kv"><b>&nbsp;</b></div>
                <button className="btn" onClick={onInspect}>Fetch</button>
              </div>
            </div>
            <pre className="status" style={{ minHeight: 120 }}>{inspectData ? JSON.stringify(inspectData, null, 2) : '—'}</pre>
          </section>
        </div>

        <div className="status">{status}</div>
      </main>

      <footer className="footer">
        <div>Contract: {CONTRACT_ADDRESS}.polystacks (testnet)</div>
      </footer>
    </>
  );
}
