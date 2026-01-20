"use client";
import {useState} from "react";
import {useRouter, useParams} from "next/navigation";

export default function LoginPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [err,setErr]=useState<string|null>(null);
  const router=useRouter();
  const params=useParams();
  const locale=(params?.locale as string)||"ru";

  async function submit(e:React.FormEvent){
    e.preventDefault(); setErr(null);
    const res=await fetch("http://localhost:4000/auth/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      credentials:"include",
      body:JSON.stringify({email,password})
    });
    if(!res.ok){ setErr(await res.text()); return; }
    router.push(`/${locale}`); router.refresh();
  }

  return (
    <form onSubmit={submit} style={{display:"grid", gap:10, maxWidth:420}}>
      <h1>Login</h1>
      <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button type="submit">Login</button>
      <a href={`/${locale}/auth/register`}>Register</a>
      {err && <pre style={{whiteSpace:"pre-wrap", color:"crimson"}}>{err}</pre>}
    </form>
  );
}
