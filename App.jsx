import React, { useEffect, useState } from 'react'
import * as api from './api'

function formatCurrency(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BigButton({children, onClick, style}) {
  return (
    <button onClick={onClick} style={{
      padding: '14px 18px',
      fontSize: '18px',
      borderRadius: 12,
      border: '2px solid #222',
      background: '#fff',
      cursor: 'pointer',
      minWidth: 140,
      ...style
    }}>
      {children}
    </button>
  )
}

export default function App(){
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('dashboard'); // dashboard, list, detail, add
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState({name:'', principal:'', interest:'', dueDate:'', notes:''});

  useEffect(()=>{ loadLoans(); }, []);

  async function loadLoans(){
    setLoading(true); setError('');
    try {
      const data = await api.fetchLoans();
      setLoans(data || []);
    } catch(err){
      console.error(err);
      setError('Could not load data. Check backend URL and network.');
    } finally { setLoading(false); }
  }

  function totalsCalc() {
    return loans.reduce((acc, l) => {
      const paid = (l.payments || []).reduce((s,p)=>s+Number(p.amount||0),0);
      const balance = Math.max(0, Number(l.principal||0) + (Number(l.interest||0)/100)*Number(l.principal||0) - paid);
      acc.totalPrincipal += Number(l.principal||0);
      acc.totalBalance += balance;
      acc.totalPaid += paid;
      if (!acc.nextDue || (l.dueDate && new Date(l.dueDate) < new Date(acc.nextDue))) acc.nextDue = l.dueDate;
      return acc;
    }, {totalPrincipal:0,totalBalance:0,totalPaid:0,nextDue:null});
  }

  async function handleCreateOrUpdate(e){
    e && e.preventDefault();
    try {
      if (!form.name || !form.principal) return alert('Enter name and principal');
      if (form.id){
        await api.updateLoan(form.id, { name: form.name, principal: Number(form.principal), interest: Number(form.interest||0), dueDate: form.dueDate, notes: form.notes });
      } else {
        await api.createLoan({ name: form.name, principal: Number(form.principal), interest: Number(form.interest||0), dueDate: form.dueDate, notes: form.notes });
      }
      setForm({name:'', principal:'', interest:'', dueDate:'', notes:''});
      setView('list');
      loadLoans();
    } catch(err){
      alert('Failed: ' + (err.message || err));
    }
  }

  async function handleDeleteLoan(id){
    if (!confirm('Delete this loan?')) return;
    try {
      await api.deleteLoan(id);
      loadLoans();
    } catch(err){ alert('Delete failed: '+err.message); }
  }

  async function handleAddPayment(loanId, amount, note, clear){
    try {
      if (!amount || Number(amount)<=0) return alert('Enter valid amount');
      await api.addPayment(loanId, { amount: Number(amount), note });
      clear && clear();
      loadLoans();
    } catch(err){ alert('Payment failed: '+err.message); }
  }

  async function handleDeletePayment(pid){
    if (!confirm('Delete payment?')) return;
    try {
      await api.deletePayment(pid);
      loadLoans();
    } catch(err){ alert('Delete payment failed: '+err.message); }
  }

  const totals = totalsCalc();

  // Views
  if (loading) return <div style={{padding:20}}>Loading...</div>;

  return (
    <div style={{fontFamily:'system-ui, Arial', padding:20, maxWidth:900, margin:'0 auto'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18}}>
        <div>
          <h1 style={{margin:0,fontSize:26}}>LoanTracker</h1>
          <div style={{fontSize:14}}>Easy loan & payment tracker for older users</div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button onClick={()=>{setView('dashboard')}} style={{padding:8}}>Dashboard</button>
          <button onClick={()=>{setView('list')}} style={{padding:8}}>Loans</button>
        </div>
      </header>

      {error && <div style={{padding:10, background:'#fee', border:'1px solid #f99', marginBottom:12}}>{error}</div>}

      {view === 'dashboard' && (
        <div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12}}>
            <div style={{padding:12, border:'2px solid #222', borderRadius:10, textAlign:'center'}}>
              <div style={{fontSize:14}}>Total Principal</div>
              <div style={{fontSize:20, fontWeight:700}}>₱ {formatCurrency(totals.totalPrincipal)}</div>
            </div>
            <div style={{padding:12, border:'2px solid #222', borderRadius:10, textAlign:'center'}}>
              <div style={{fontSize:14}}>Total Balance</div>
              <div style={{fontSize:20, fontWeight:700}}>₱ {formatCurrency(totals.totalBalance)}</div>
            </div>
            <div style={{padding:12, border:'2px solid #222', borderRadius:10, textAlign:'center'}}>
              <div style={{fontSize:14}}>Total Paid</div>
              <div style={{fontSize:20, fontWeight:700}}>₱ {formatCurrency(totals.totalPaid)}</div>
            </div>
          </div>

          <div style={{display:'flex', gap:10, marginBottom:12}}>
            <BigButton onClick={()=>{ setForm({name:'',principal:'',interest:'',dueDate:'',notes:''}); setView('add'); }}>➕ Add Loan</BigButton>
            <BigButton onClick={()=>{ setView('list'); }}>📋 View Loans</BigButton>
            <BigButton onClick={()=>{ window.print(); }}>🖨️ Print</BigButton>
          </div>

          <h3>Quick list</h3>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {loans.length===0 && <div>No loans yet — click Add Loan.</div>}
            {loans.map(l=>{
              const paid = (l.payments||[]).reduce((s,p)=>s+Number(p.amount||0),0);
              const balance = Math.max(0, Number(l.principal||0) + (Number(l.interest||0)/100)*Number(l.principal||0) - paid);
              return (
                <div key={l.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:12, border:'1px solid #ccc', borderRadius:10}}>
                  <div>
                    <div style={{fontSize:16, fontWeight:700}}>{l.name}</div>
                    <div style={{fontSize:13}}>Due: {l.dueDate||'—'} • Balance: ₱ {formatCurrency(balance)}</div>
                  </div>
                  <div style={{display:'flex', gap:8}}>
                    <button onClick={()=>{ setActiveId(l.id); setView('detail'); }}>Open</button>
                    <button onClick={()=>{ setForm({...l}); setView('add'); }}>Edit</button>
                    <button onClick={()=>handleDeleteLoan(l.id)} style={{color:'red'}}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'list' && (
        <div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <h2>Loans</h2>
            <div style={{display:'flex', gap:8}}>
              <BigButton onClick={()=>setView('dashboard')}>🏠 Dashboard</BigButton>
              <BigButton onClick={()=>{ setForm({name:'',principal:'',interest:'',dueDate:'',notes:''}); setView('add'); }}>➕ Add Loan</BigButton>
            </div>
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {loans.length===0 && <div>No loans found.</div>}
            {loans.map(l=>{
              const paid = (l.payments||[]).reduce((s,p)=>s+Number(p.amount||0),0);
              const balance = Math.max(0, Number(l.principal||0) + (Number(l.interest||0)/100)*Number(l.principal||0) - paid);
              return (
                <div key={l.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:12, border:'1px solid #ccc', borderRadius:10}}>
                  <div>
                    <div style={{fontSize:16, fontWeight:700}}>{l.name}</div>
                    <div style={{fontSize:13}}>Principal: ₱ {formatCurrency(l.principal)} • Balance: ₱ {formatCurrency(balance)}</div>
                    <div style={{fontSize:13}}>Due: {l.dueDate||'—'}</div>
                  </div>
                  <div style={{display:'flex', gap:8}}>
                    <button onClick={()=>{ setActiveId(l.id); setView('detail'); }}>Open</button>
                    <button onClick={()=>{ setForm({...l}); setView('add'); }}>Edit</button>
                    <button onClick={()=>handleDeleteLoan(l.id)} style={{color:'red'}}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'add' && (
        <div>
          <h2>{form.id ? 'Edit Loan' : 'Add Loan'}</h2>
          <form onSubmit={handleCreateOrUpdate} style={{display:'grid', gap:10, maxWidth:700}}>
            <label style={{display:'flex', flexDirection:'column'}}>
              <span>Loan name</span>
              <input value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} required style={{padding:10, fontSize:16}}/>
            </label>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
              <label style={{display:'flex', flexDirection:'column'}}>
                <span>Principal (₱)</span>
                <input value={form.principal} onChange={(e)=>setForm({...form, principal:e.target.value})} required style={{padding:10, fontSize:16}}/>
              </label>
              <label style={{display:'flex', flexDirection:'column'}}>
                <span>Interest (%)</span>
                <input value={form.interest} onChange={(e)=>setForm({...form, interest:e.target.value})} style={{padding:10, fontSize:16}}/>
              </label>
              <label style={{display:'flex', flexDirection:'column'}}>
                <span>Due date</span>
                <input type="date" value={form.dueDate||''} onChange={(e)=>setForm({...form, dueDate:e.target.value})} style={{padding:10, fontSize:16}}/>
              </label>
            </div>
            <label style={{display:'flex', flexDirection:'column'}}>
              <span>Notes</span>
              <textarea value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})} style={{padding:10, fontSize:16}} rows={3}/>
            </label>
            <div style={{display:'flex', gap:10}}>
              <BigButton onClick={handleCreateOrUpdate}>{form.id ? 'Save Changes' : 'Create Loan'}</BigButton>
              <button type="button" onClick={()=>{ setForm({name:'',principal:'',interest:'',dueDate:'',notes:''}); setView('list'); }} style={{padding:12}}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {view === 'detail' && (()=>{ 
        const loan = loans.find(x=>x.id===activeId); 
        if(!loan) return <div>Loan not found</div>;
        const paid = (loan.payments||[]).reduce((s,p)=>s+Number(p.amount||0),0);
        const balance = Math.max(0, Number(loan.principal||0) + (Number(loan.interest||0)/100)*Number(loan.principal||0) - paid);
        return (
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <div>
                <h2 style={{margin:0}}>{loan.name}</h2>
                <div style={{fontSize:13}}>Notes: {loan.notes||'—'}</div>
                <div style={{marginTop:8}}>Principal: ₱ {formatCurrency(loan.principal)}</div>
                <div>Interest: {loan.interest}%</div>
                <div style={{fontSize:18, fontWeight:700, marginTop:8}}>Balance: ₱ {formatCurrency(balance)}</div>
                <div>Due Date: {loan.dueDate||'—'}</div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={()=>{ setForm({...loan}); setView('add'); }}>✏️ Edit</button>
                <button onClick={()=>handleDeleteLoan(loan.id)} style={{color:'red'}}>🗑️ Delete</button>
              </div>
            </div>

            <div style={{marginTop:12, padding:12, border:'1px solid #ddd', borderRadius:8}}>
              <h3>Add Payment</h3>
              <PaymentForm onAdd={(amt, note, clear)=>handleAddPayment(loan.id, amt, note, clear)} />
            </div>

            <div style={{marginTop:12}}>
              <h3>Payments</h3>
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {(!loan.payments || loan.payments.length===0) && <div>No payments yet.</div>}
                {(loan.payments||[]).map(p=>(
                  <div key={p.id} style={{display:'flex', justifyContent:'space-between', padding:10, border:'1px solid #eee', borderRadius:8}}>
                    <div>
                      <div style={{fontSize:13}}>{new Date(p.date).toLocaleString()}</div>
                      <div style={{fontSize:16, fontWeight:700}}>₱ {formatCurrency(p.amount)}</div>
                      <div style={{fontSize:13}}>{p.note}</div>
                    </div>
                    <div>
                      <button onClick={()=>handleDeletePayment(p.id)} style={{color:'red'}}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{marginTop:12}}>
              <button onClick={()=>setView('list')}>⬅ Back to list</button>
            </div>
          </div>
        )
      })()}

    </div>
  )
}

function PaymentForm({onAdd}) {
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  return (
    <div style={{display:'flex', gap:8, alignItems:'flex-end'}}>
      <div style={{flex:1}}>
        <label style={{display:'block'}}>Amount</label>
        <input value={amt} onChange={e=>setAmt(e.target.value)} style={{padding:10,fontSize:16,width:'100%'}} placeholder="e.g. 1000" />
      </div>
      <div style={{flex:1}}>
        <label style={{display:'block'}}>Note</label>
        <input value={note} onChange={e=>setNote(e.target.value)} style={{padding:10,fontSize:16,width:'100%'}} placeholder="Optional" />
      </div>
      <div>
        <button onClick={()=>{ onAdd(amt, note, ()=>{ setAmt(''); setNote(''); }); }} style={{padding:'10px 14px'}}>➕ Add Payment</button>
      </div>
    </div>
  )
}
