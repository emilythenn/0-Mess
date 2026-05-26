import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Mail, User, Lock, AlertCircle, ArrowLeft, GraduationCap } from 'lucide-react';

interface AuthPageProps {
  onBack: () => void;
  onSuccess: () => void;
  defaultMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBack, onSuccess, defaultMode }) => {
  const { login, register, signInWithGoogle, members } = useProject();
  const [isLogin, setIsLogin] = useState<boolean>(() => {
    if (defaultMode) {
      return defaultMode === 'login';
    }
    return true;
  });
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState<string>('alex.mercer@univ.edu'); // Prefilled for easy sandbox testing
  const [loginPassword, setLoginPassword] = useState<string>('password123'); // Prefilled password
  const [loginError, setLoginError] = useState<string>('');

  // Register Form States
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regError, setRegError] = useState<string>('');

  // Social Auth Spinner State
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) {
      setLoginError('An email address is required.');
      return;
    }
    if (!loginEmail.includes('@')) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError('Please enter your password.');
      return;
    }

    try {
      setLoginError('');
      const completed = await login(loginEmail, loginPassword);
      if (completed) {
        onSuccess();
      } else {
        setLoginError('Authentication failed.');
      }
    } catch (error: any) {
      console.error(error);
      let friendlyMessage = 'Authentication failed.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        friendlyMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      } else if (error.message) {
        friendlyMessage = error.message;
      }
      setLoginError(friendlyMessage);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setRegError('Please provide your name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Please provide a valid email address.');
      return;
    }
    if (!regPassword.trim()) {
      setRegError('Please provide a password.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }

    try {
      setRegError('');
      const completed = await register(regName, regEmail, 'Group Member', regPassword);
      if (completed) {
        onSuccess();
      } else {
        setRegError('Could not process registration.');
      }
    } catch (error: any) {
      console.error(error);
      let friendlyMessage = 'Could not process registration.';
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already in use by another account.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Please provide a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.message) {
        friendlyMessage = error.message;
      }
      setRegError(friendlyMessage);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setLoginError('');
    setRegError('');
    try {
      const completed = await signInWithGoogle();
      if (completed) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Google Sign In Error:", error);
      let msg = "Google authentication failed.";
      if (error.code === 'auth/popup-closed-by-user') {
        msg = "Google sign-in popup was closed before completion.";
      } else if (error.message) {
        msg = error.message;
      }
      setLoginError(msg);
      setRegError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePrefillAccount = (email: string) => {
    setLoginEmail(email);
    setLoginPassword('password123');
    setLoginError('');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] flex flex-col justify-between font-sans antialiased">
      {/* Tiny Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between select-none">
        <button 
          onClick={onBack}
          className="cursor-pointer inline-flex items-center space-x-1.5 text-xs font-semibold text-[#666666] hover:text-[#111111] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#4F46E5] flex items-center justify-center text-white font-mono font-bold text-xs">
            0ø
          </div>
          <span className="font-bold text-sm tracking-tight text-[#111111]">0-Mess</span>
        </div>
      </header>

      {/* Main Content Space */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-2xl p-7 sm:p-8 shadow-xs">
          
          {/* Form Toggle Selection */}
          <div className="flex space-x-1 p-1 bg-[#F3F4F6] rounded-xl mb-7 text-xs font-bold text-[#555555] select-none">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setRegError(''); }}
              className={`cursor-pointer flex-1 py-2 rounded-lg text-center transition-all ${isLogin ? 'bg-white text-[#111111] shadow-xs' : 'hover:text-[#111111]'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setLoginError(''); }}
              className={`cursor-pointer flex-1 py-2 rounded-lg text-center transition-all ${!isLogin ? 'bg-white text-[#111111] shadow-xs' : 'hover:text-[#111111]'}`}
            >
              Sign Up
            </button>
          </div>

          {isLogin ? (
            /* SIMPLE SIGN IN */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="mb-4">
                <h2 className="text-xl font-bold tracking-tight text-[#111111]">Sign in to workspace</h2>
                <p className="text-[#666666] text-xs mt-0.5">Enter your email and password to coordinate active sprints.</p>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-100 flex items-start space-x-2 rounded-xl text-red-700 text-xs animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-1.5 font-mono">Email Address</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
                    placeholder="alex.mercer@example.com"
                    className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl py-3 pl-9 pr-4 text-[#111111] text-xs focus:bg-white focus:border-[#4F46E5] focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-1.5 font-mono">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                    placeholder="••••••••"
                    className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl py-3 pl-9 pr-4 text-[#111111] text-xs focus:bg-white focus:border-[#4F46E5] focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="cursor-pointer w-full bg-[#111111] hover:bg-[#4F46E5] text-white font-semibold py-3 text-xs rounded-xl transition-all shadow-xs hover:shadow-sm"
              >
                Sign In with Email
              </button>

              {/* Or separator */}
              <div className="relative my-5 select-none">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#E5E7EB]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-[#999999] uppercase font-mono text-[9px]">or</span>
                </div>
              </div>

              {/* Continue with Google button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                className="w-full flex items-center justify-center bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#333333] font-semibold py-3 text-xs rounded-xl transition-all shadow-3xs hover:shadow-2xs active:scale-[0.99] disabled:opacity-75 cursor-pointer select-none"
              >
                {googleLoading ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-3.5 w-3.5 text-[#4F46E5]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Connecting Google...</span>
                  </span>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>

              {/* Bottom toggle hook */}
              <p className="text-center text-xs text-[#666666] pt-2 select-none">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setLoginError(''); }}
                  className="text-[#4F46E5] hover:underline font-bold cursor-pointer transition-all focus:outline-hidden"
                >
                  Sign Up
                </button>
              </p>

              {/* Prefill checklist */}
              <div className="pt-4 border-t border-[#F3F4F6] mt-4 select-none">
                <span className="block text-[9px] uppercase tracking-wider text-[#999999] font-mono text-center mb-2.5">
                  Or select a demo profile below
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {members.slice(0, 4).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handlePrefillAccount(m.email)}
                      className="flex items-center space-x-2.5 p-2 bg-[#FAFAFA] hover:bg-indigo-50/50 border border-[#E5E7EB] hover:border-indigo-100 rounded-xl transition-all cursor-pointer text-left overflow-hidden"
                    >
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold text-white shrink-0 ${m.color}`}>
                        {m.avatar}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-[#111111] truncate">{m.name.split(' ')[0]}</div>
                        <div className="text-[9px] text-[#888888] truncate">{m.role.split(' & ')[0]}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            /* CREATE ACCOUNT ENROLLMENT */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="mb-4">
                <h2 className="text-xl font-bold tracking-tight text-[#111111]">Create account</h2>
                <p className="text-[#666666] text-xs mt-0.5">Enter details to register and join group projects.</p>
              </div>

              {regError && (
                <div className="p-3 bg-red-50 border border-red-100 flex items-start space-x-2 rounded-xl text-red-700 text-xs animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              <div>
                <label className="block text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-1.5 font-mono">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => { setRegName(e.target.value); setRegError(''); }}
                    placeholder="e.g. Sophia Vance"
                    className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl py-2.5 pl-9 pr-4 text-[#111111] text-xs focus:bg-white focus:border-[#4F46E5] focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-1.5 font-mono">Email Address</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => { setRegEmail(e.target.value); setRegError(''); }}
                    placeholder="sophia@example.com"
                    className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl py-2.5 pl-9 pr-4 text-[#111111] text-xs focus:bg-white focus:border-[#4F46E5] focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#111111] text-[10px] font-bold uppercase tracking-wider mb-1.5 font-mono">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => { setRegPassword(e.target.value); setRegError(''); }}
                    placeholder="•••••••• (Min 6 characters)"
                    className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded-xl py-2.5 pl-9 pr-4 text-[#111111] text-xs focus:bg-white focus:border-[#4F46E5] focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl flex items-start space-x-2 mt-2 select-none">
                <GraduationCap className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-900 leading-normal">
                  Enjoy zero-stress milestone sharing, task logs, and central files instantly.
                </p>
              </div>

              <button
                type="submit"
                className="cursor-pointer w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold py-3 text-xs rounded-xl transition-all shadow-xs hover:shadow-sm"
              >
                Sign Up & Join Workspace
              </button>

              {/* Or separator */}
              <div className="relative my-5 select-none">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#E5E7EB]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-[#999999] uppercase font-mono text-[9px]">or</span>
                </div>
              </div>

              {/* Continue with Google button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                className="w-full flex items-center justify-center bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#333333] font-semibold py-3 text-xs rounded-xl transition-all shadow-3xs hover:shadow-2xs active:scale-[0.99] disabled:opacity-75 cursor-pointer select-none"
              >
                {googleLoading ? (
                  <span className="flex items-center space-x-2">
                    <svg className="animate-spin h-3.5 w-3.5 text-[#4F46E5]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Connecting Google...</span>
                  </span>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign up with Google</span>
                  </>
                )}
              </button>

              {/* Bottom toggle hook */}
              <p className="text-center text-xs text-[#666666] pt-2 select-none">
                Have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); setRegError(''); }}
                  className="text-[#4F46E5] hover:underline font-bold cursor-pointer transition-all focus:outline-hidden"
                >
                  Log In
                </button>
              </p>
            </form>
          )}
        </div>
      </main>

      {/* Tiny Footer */}
      <footer className="w-full py-8 text-center text-[11px] text-[#A0A0A0] select-none">
        Powered by 0-Mess. Secure data loops intact.
      </footer>
    </div>
  );
};
