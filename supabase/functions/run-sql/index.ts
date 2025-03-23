import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

serve(async (req) => {
  try {
    // Check if the method is POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: "Only POST method is allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const { sql } = await req.json();
    
    if (!sql) {
      return new Response(
        JSON.stringify({ error: "SQL query is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get connection details from environment variables
    const connectionString = Deno.env.get("DATABASE_URL") || "";
    
    if (!connectionString) {
      return new Response(
        JSON.stringify({ error: "Database connection string not available" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a connection pool
    const pool = new Pool(connectionString, 1);
    const connection = await pool.connect();

    try {
      // Execute the SQL
      const result = await connection.queryObject(sql);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "SQL executed successfully",
          data: result
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Error executing SQL", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    } finally {
      // Release the connection back to the pool
      connection.release();
      // Close the pool
      await pool.end();
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}); 