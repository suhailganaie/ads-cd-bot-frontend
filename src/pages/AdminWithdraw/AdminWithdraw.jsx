const API = import.meta.env.VITE_API_BASE;

export default function AdminWithdraw() {
  const tg = window?.Telegram?.WebApp;
  const u = tg?.initDataUnsafe?.user;
  const [token,setToken] = useState(null);
  const [isAdmin,setIsAdmin] = useState(false);
  const [rows,setRows] = useState([]);
  const [id,setId] = useState('');
  const [reason,setReason] = useState('');

  useEffect(() => { try { tg?.ready?.(); tg?.expand?.(); } catch {} }, []); // webview ok [7]

  useEffect(() => {
    (async () => {
      // login
      const res = await fetch(`${API}/auth/login`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ telegram_id: String(u?.id||''), username: u?.username||'' })
      });
      const data = await res.json().catch(() => ({}));
      setToken(data?.token||null);
      // decide admin: prefer claim, else allowlist
      const claimAdmin = Boolean(data?.user?.admin);
      const allow = new Set((import.meta.env.VITE_ADMIN_TIDS||'').split(',').map(s=>s.trim()).filter(Boolean));
      setIsAdmin(claimAdmin || allow.has(String(u?.id||'')));
    })();
  }, [API,u?.id,u?.username]); // token + role [5]

  const authHeaders = useMemo(() => token ? { Authorization:`Bearer ${token}` } : {}, [token]); // bearer [5]

  const refresh = useCallback(async () => {
    const r = await fetch(`${API}/withdrawals/pending?limit=50&offset=0`, { headers: authHeaders });
    const d = await r.json().catch(()=>({}));
    setRows(Array.isArray(d?.items)? d.items : []);
  }, [API,authHeaders]); // read queue [3]

  useEffect(() => { if (isAdmin && token) refresh(); }, [isAdmin, token, refresh]); // load list [3]

  if (!isAdmin) return null; // do not render admin UI for non-admins [3]

  const approve = async (wid) => {
    await fetch(`${API}/withdrawals/${wid}/approve`, { method:'POST', headers: { 'Content-Type':'application/json', ...authHeaders } });
    refresh();
  };
  const reject = async (wid, why) => {
    await fetch(`${API}/withdrawals/${wid}/reject`, { method:'POST', headers: { 'Content-Type':'application/json', ...authHeaders }, body: JSON.stringify({ reason: why||undefined }) });
    refresh();
  };

  return (
    <div className="panel">
      <h3>Withdraw admin</h3>

      <div className="panel-foot">
        <input className="input" placeholder="Withdrawal ID" value={id} onChange={e=>setId(e.target.value)} />
        <button className="btn primary" onClick={()=>approve(id)}>Approve</button>
        <input className="input" placeholder="Reason (optional)" value={reason} onChange={e=>setReason(e.target.value)} />
        <button className="btn" onClick={()=>reject(id, reason)}>Reject</button>
        <button className="btn ghost" onClick={refresh}>Refresh</button>
      </div>

      <ul className="task-list" style={{ marginTop:12 }}>
        {rows.map(r => (
          <li key={r.id} className="task">
            <div className="task-main">
              <span>ID #{r.id}</span>
              <span>{r.tokens} tokens</span>
            </div>
            <div className="task-meta">
              <div>{r.address}</div>
              <div>@{r.username || r.telegram_id}</div>
            </div>
            <div className="task-actions">
              <button className="btn primary" onClick={()=>approve(r.id)}>Approve</button>
              <button className="btn" onClick={()=>reject(r.id)}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
