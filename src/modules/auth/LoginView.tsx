import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { 
  Eye, 
  EyeOff, 
  User as UserIcon, 
  Lock, 
  Info,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

export function LoginView() {
  const { login } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
    } catch (err: any) {
      setError("Identification failed. Please check your credentials.");
    }
  };

  const inputStyles = `w-full bg-navy border border-border rounded-lg py-3 pl-10 pr-12 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-text-muted/50 text-sm`;
  const labelStyles = `block text-xs font-semibold text-text-muted mb-2 uppercase tracking-tight`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-surface border border-border shadow-xl mb-4">
            <img src="/logo.png" alt="Teebot Flow" className="h-12 w-auto max-w-[140px] object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Secure Access</h1>
          <p className="text-sm text-text-muted mt-1">Unlock your local workspace</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl shadow-black/50">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error text-xs flex items-center gap-2.5">
              <Info className="h-4 w-4" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="group relative">
              <label className={labelStyles}>Identity</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputStyles}
                  placeholder="Username"
                />
              </div>
            </div>

            <div className="group relative">
              <label className={labelStyles}>Credential</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-primary transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputStyles}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-[#F8FAFC] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-text-primary font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-lg shadow-primary/20 mt-2"
            >
              <span>Authenticate Session</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-text-muted/60 uppercase tracking-widest font-bold">
          <ShieldCheck className="h-3 w-3" />
          <span>Local Engine Encrypted</span>
        </div>
      </div>
    </div>
  );
}
