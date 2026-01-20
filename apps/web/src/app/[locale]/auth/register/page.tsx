"use client";
import {useState} from "react";
import {useRouter, useParams} from "next/navigation";

export default function RegisterPage(){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [err,setErr]=useState<string|null>(null);
  const router=useRouter();
  const params=useParams();
  const locale=(params?.locale as string)||"ru";

  async function submit(e:React.FormEvent){
    e.preventDefault(); setErr(null);
    const res=await fetch("http://localhost:4000/auth/register",{
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
      <h1>Register</h1>
      <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="password (min 8)" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button type="submit">Create</button>
      <a href={`/${locale}/auth/login`}>Login</a>
      {err && <pre style={{whiteSpace:"pre-wrap", color:"crimson"}}>{err}</pre>}
    </form>
  );
}
