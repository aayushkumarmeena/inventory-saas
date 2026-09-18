import React,{useState}from'react';import{useNavigate,Link}from'react-router-dom';import{authApi}from'../../api/authApi';
const inp={width:'100%',padding:'8px 10px',border:'0.5px solid var(--border)',borderRadius:8,fontSize:13,background:'var(--surface-2)',color:'var(--text-primary)'};
export default function Register(){
  const[form,setForm]=useState({firstName:'',lastName:'',email:'',password:'',tenantName:''});const[error,setError]=useState('');const[loading,setLoading]=useState(false);const nav=useNavigate();
  const submit=async e=>{e.preventDefault();setLoading(true);try{await authApi.register(form);nav('/login');}catch(err){setError(err.response?.data?.message||'Failed');}finally{setLoading(false);}};
  return(<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface-0)'}}>
    <div style={{width:400,background:'var(--surface-2)',border:'0.5px solid var(--border)',borderRadius:12,padding:32}}>
      <h1 style={{fontSize:20,fontWeight:500,marginBottom:24}}>Create account</h1>
      {error&&<div style={{background:'#fee2e2',color:'#991b1b',padding:'10px 12px',borderRadius:8,marginBottom:14,fontSize:13}}>{error}</div>}
      <form onSubmit={submit}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div><label style={{display:'block',fontSize:12,color:'var(--text-secondary)',marginBottom:4}}>First name</label><input style={inp} value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))} required/></div>
          <div><label style={{display:'block',fontSize:12,color:'var(--text-secondary)',marginBottom:4}}>Last name</label><input style={inp} value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))} required/></div>
        </div>
        <div style={{marginBottom:12}}><label style={{display:'block',fontSize:12,color:'var(--text-secondary)',marginBottom:4}}>Business name</label><input style={inp} value={form.tenantName} onChange={e=>setForm(f=>({...f,tenantName:e.target.value}))} required placeholder="Acme Store"/></div>
        <div style={{marginBottom:12}}><label style={{display:'block',fontSize:12,color:'var(--text-secondary)',marginBottom:4}}>Email</label><input type="email" style={inp} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/></div>
        <div style={{marginBottom:20}}><label style={{display:'block',fontSize:12,color:'var(--text-secondary)',marginBottom:4}}>Password</label><input type="password" style={inp} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required/></div>
        <button type="submit" disabled={loading} style={{width:'100%',padding:'10px',background:'#6366f1',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:500,cursor:'pointer'}}>{loading?'Creating…':'Create account'}</button>
      </form>
      <p style={{fontSize:12,color:'var(--text-secondary)',textAlign:'center',marginTop:16}}>Already have an account? <Link to="/login" style={{color:'#6366f1'}}>Sign in</Link></p>
    </div>
  </div>);
}
