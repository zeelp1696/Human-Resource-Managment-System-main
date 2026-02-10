import { useEffect, useState } from "react"
import { supabase } from "./supabase-config"

export default function TestSupabase() {
  const [status, setStatus] = useState("Checking...")

  useEffect(() => {
  async function checkConnection() {
    const { data, error } = await supabase.from("profiles").select("*").limit(1)
    if (error) {
      console.error("❌ Supabase error:", error.message)
      setStatus("❌ Connection failed: " + error.message)
    } else {
      console.log("✅ Supabase connected:", data)
      setStatus("✅ Connected")
    }
  }
  
  checkConnection()
  }, [])

  return (
    <div>
      <h2>Supabase Connection Test</h2>
      <p>Status: {status}</p>
    </div>
  )
} 