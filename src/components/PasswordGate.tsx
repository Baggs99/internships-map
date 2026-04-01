import { useState, useEffect } from 'react';

const SESSION_KEY = 'som_map_auth';
const PASSWORD = 'yale';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setUnlocked(true);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.toLowerCase() === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setUnlocked(true);
    } else {
      setError(true);
      setShake(true);
      setInput('');
      setTimeout(() => setShake(false), 600);
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-yale-blue flex flex-col items-center justify-center px-4">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-yale-gold flex items-center justify-center text-yale-blue font-bold text-2xl shadow-lg select-none">
          Y
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Yale SOM Summer 2025 Internships</h1>
        <p className="text-blue-200 text-sm">Enter the password to continue</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm flex flex-col gap-4 ${shake ? 'animate-shake' : ''}`}
      >
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          placeholder="Password"
          autoFocus
          className={`w-full border rounded-lg px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-yale-blue ${
            error ? 'border-red-400 focus:ring-red-300' : 'border-gray-300'
          }`}
        />
        {error && (
          <p className="text-red-500 text-xs -mt-2">Incorrect password. Please try again.</p>
        )}
        <button
          type="submit"
          className="bg-yale-blue text-white rounded-lg py-3 text-sm font-semibold hover:bg-blue-900 transition"
        >
          Enter
        </button>
      </form>

      <p className="mt-6 text-blue-300 text-xs">
        Includes only students who self-reported &amp; authorized publication
      </p>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease; }
      `}</style>
    </div>
  );
}
