const API_ROOT = (import.meta.env.VITE_API_ROOT || import.meta.env.REACT_APP_API_ROOT || 'http://localhost:4000/api').replace(/\/$/, '');

async function handleResp(r) {
  if (!r.ok) {
    const text = await r.text();
    let err = text || r.statusText;
    try { err = JSON.parse(text).error || text; } catch(e) {}
    throw new Error(err);
  }
  return r.json().catch(()=>null);
}

export async function fetchLoans() {
  const r = await fetch(`${API_ROOT}/loans`);
  return handleResp(r);
}

export async function createLoan(payload) {
  const r = await fetch(`${API_ROOT}/loans`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return handleResp(r);
}

export async function updateLoan(id, payload) {
  const r = await fetch(`${API_ROOT}/loans/${id}`, {
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return handleResp(r);
}

export async function deleteLoan(id) {
  const r = await fetch(`${API_ROOT}/loans/${id}`, { method: 'DELETE' });
  return handleResp(r);
}

export async function addPayment(loanId, payload) {
  const r = await fetch(`${API_ROOT}/loans/${loanId}/payments`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return handleResp(r);
}

export async function deletePayment(paymentId) {
  const r = await fetch(`${API_ROOT}/payments/${paymentId}`, { method: 'DELETE' });
  return handleResp(r);
}
