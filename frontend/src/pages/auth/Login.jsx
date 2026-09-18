import React,{useState}from'react';import{useNavigate,Link}from'react-router-dom';import{useAuth}from'../../context/AuthContext';
const inp={width:'100%',padding:'8px 10px',border:'0.5px solid var(--border)',borderRadius:8,fontSize:13,background:'var(--surface-2)',color:'var(--text-primary)'};
export default function Login(){
  const[form,setForm]=useState({email:'',password:''});const[error,setError]=useState('');const[loading,setLoading]=useState(false);
  const{login}=useAuth();const nav=useNavigate();
  const submit=async e=>{e.preventDefault();setLoading(true);setError('');try{await login(form);nav('/');}catch(err){setError(err.response?.data?.message||'Invalid credentials');}finally{setLoading(false);}};
  return(<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface-0)'}}>
    <div style={{width:360,background:'var(--surface-2)',border:'0.5px solid var(--border)',borderRadius:12,padding:32}}>
      <h1 style={{fontSize:20,fontWeight:500,marginBottom:6}}>Sign in</h1>
      <p style={{fontSize:13,color:'var(--text-secondary)',marginBottom:24}}>InventoryPro — Multi-tenant SaaS</p>
      {error&&<div style={{background:'#fee2e2',color:'#991b1b',padding:'10px 12px',borderRadius:8,marginBottom:14,fontSize:13}}>{error}</div>}
      <form onSubmit={submit}>
        <div style={{marginBottom:12}}><label style={{display:'block',fontSize:12,color:'var(--text-secondary)',marginBottom:4}}>Email</label><input type="email" style={inp} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required placeholder="you@company.com"/></div>
        <div style={{marginBottom:20}}><label style={{display:'block',fontSize:12,color:'var(--text-secondary)',marginBottom:4}}>Password</label><input type="password" style={inp} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required placeholder="••••••••"/></div>
        <button type="submit" disabled={loading} style={{width:'100%',padding:'10px',background:'#6366f1',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer',opacity:loading?0.7:1}}>{loading?'Signing in…':'Sign in'}</button>
      </form>
      <p style={{fontSize:12,color:'var(--text-secondary)',textAlign:'center',marginTop:16}}>No account? <Link to="/register" style={{color:'#6366f1'}}>Register</Link></p>
    </div>
  </div>);
}
