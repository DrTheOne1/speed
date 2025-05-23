import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

export default function ResendVerification() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;
      
      setSent(true);
      toast.success('Verification email sent successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Resend Verification Email
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {sent 
              ? 'Check your email for the verification link' 
              : 'Enter your email to receive a new verification link'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleResend} className="space-y-6">
            {!sent && (
              <div className="relative">
                <label
                  htmlFor="email"
                  className="absolute left-4 -top-2.5 bg-white dark:bg-gray-800 px-1 text-xs text-gray-500 dark:text-gray-400"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 bg-transparent rounded-lg border border-gray-200 dark:border-gray-700 px-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                  required
                />
              </div>
            )}

            {!sent && (
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Resend verification email'}
              </button>
            )}

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}