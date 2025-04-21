import React from 'react';
import { supabase } from '../lib/supabase';

export default function FixAuthIssues() {
  const fixMissingUsers = async () => {
    try {
      // Get current auth user
      const { data: authData } = await supabase.auth.getSession();
      
      if (!authData?.session?.user) {
        console.error("No authenticated user found");
        return;
      }
      
      const userId = authData.session.user.id;
      console.log("Checking user record for:", userId);
      
      // Check if user exists in users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (checkError) {
        if (checkError.code === 'PGRST116') {
          // User not found - need to create
          console.log("User record missing - creating new record");
          
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: userId,
              email: authData.session.user.email,
              credits: 10, // Default starting credits
              created_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (insertError) {
            console.error("Failed to create user record:", insertError);
          } else {
            console.log("Created new user record:", newUser);
            alert("Fixed missing user record!");
          }
        } else {
          console.error("Error checking user record:", checkError);
        }
      } else {
        console.log("User record exists:", existingUser);
        alert("User record exists, no fix needed.");
      }
    } catch (err) {
      console.error("Error in fixMissingUsers:", err);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-red-100 p-4 rounded shadow">
      <h3 className="font-bold mb-2 text-red-800">Auth Debug</h3>
      <button
        onClick={fixMissingUsers}
        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
      >
        Fix Missing User Record
      </button>
    </div>
  );
}