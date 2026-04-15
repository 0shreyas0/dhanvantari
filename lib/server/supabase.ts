import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // We don't throw here to avoid crashing the build if keys are missing in CI,
  // but the storage routes will fail at runtime if these are undefined.
  if (process.env.NODE_ENV === "production" || process.env.DEBUG_SUPABASE === "true") {
     console.warn("Missing Supabase environment variables! Storage features will be disabled.")
  }
}

export const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are missing.")
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey)
}
