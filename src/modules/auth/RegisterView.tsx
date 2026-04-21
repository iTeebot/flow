import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import currencies from "../../assets/currencies.json";

interface Currency {
  symbol: string;
  name: string;
  symbol_native: string;
  decimal_digits: number;
  rounding: number;
  code: string;
  name_plural: string;
}
import { 
  Eye, 
  EyeOff, 
  Building2, 
  User as UserIcon, 
  Lock, 
  Globe, 
  BadgeDollarSign, 
  Fingerprint,
  Info,
  ChevronRight
} from "lucide-react";

export function RegisterView() {
  const { register } = useAuthStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [currenciesList, setCurrenciesList] = useState<Currency[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [salesTaxNo, setSalesTaxNo] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Load currencies
    const currencyArray = Object.values(currencies);
    setCurrenciesList(currencyArray);

    // Detect default currency based on language
    const language = navigator.language;
    let defaultCurrency = "PKR"; // default

    if (language.includes("en-US")) defaultCurrency = "USD";
    else if (language.includes("en-IN")) defaultCurrency = "INR";
    else if (language.includes("en-GB")) defaultCurrency = "GBP";
    else if (language.includes("de")) defaultCurrency = "EUR";
    else if (language.includes("fr")) defaultCurrency = "EUR";
    else if (language.includes("ja")) defaultCurrency = "JPY";
    else if (language.includes("zh")) defaultCurrency = "CNY";
    // Add more mappings as needed

    setCurrency(defaultCurrency);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage === 1) {
      if (!fullName || !companyName) {
        setError("Please fill in required fields");
        return;
      }
      setCurrentPage(2);
      setError("");
    } else {
      setError("");

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters long");
        return;
      }

      try {
        await register({
          username,
          password,
          full_name: fullName,
          company_name: companyName,
          tax_registration_number: taxId,
          sales_tax_number: salesTaxNo,
          business_type: businessType,
          currency,
          website,
        });
      } catch (err: any) {
        setError(err.toString());
      }
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setError("");
    }
  };

  const inputStyles = `w-full bg-navy border border-border rounded-lg py-2.5 pl-10 pr-4 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-text-muted/50 text-sm`;
  const labelStyles = `block text-xs font-semibold text-text-muted mb-1.5 uppercase tracking-wider`;

  return (
    <div className="h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[90vh] bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar Info */}
        <div className="hidden md:flex md:w-1/3 bg-navy p-8 flex-col justify-between border-r border-border min-h-0">
          <div>
            <img src="/logo.png" alt="Teebot Flow" className="mb-8 h-12 w-auto max-w-[160px] object-contain" />
            <h2 className="text-2xl font-bold text-text-primary leading-tight mb-4">
              Welcome to <br />
              <span className="text-cyan">Teebot Flow</span>
            </h2>
            <p className="text-sm text-text-muted leading-relaxed">
              Your local-first ERP engine. Set up your company profile once to begin managing your operations securely.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs text-status-success">
              <div className="h-2 w-2 rounded-full bg-status-success" />
              <span>Full Data Privacy</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-status-success">
              <div className="h-2 w-2 rounded-full bg-status-success" />
              <span>Offline Ready</span>
            </div>
          </div>
        </div>

        {/* Form Area */}
        <div className="flex-1 p-8 lg:p-12 flex flex-col overflow-hidden min-h-0">
          <div className="md:hidden flex items-center gap-4 mb-8 shrink-0">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto max-w-[120px] object-contain" />
            <h1 className="text-xl font-bold text-text-primary">Teebot Flow</h1>
          </div>

          <header className="mb-6 shrink-0">
            <h2 className="text-2xl font-bold text-text-primary">
              {currentPage === 1 ? "Business Structure" : "Master Account"}
            </h2>
            <p className="text-sm text-text-muted">
              {currentPage === 1 
                ? "Set up your company profile and business details." 
                : "Create your administrative account credentials."
              }
            </p>
          </header>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-status-error/10 border border-status-error/20 text-status-error text-sm flex items-center gap-3 shrink-0">
              <Info className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Page 1: Business Structure */}
              {currentPage === 1 && (
                <div className="space-y-6">

                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group relative">
                      <label className={labelStyles}>Full Name *</label>
                      <UserIcon className="absolute left-3 top-[34px] h-4 w-4 text-text-muted" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={inputStyles}
                        placeholder="e.g. John Doe"
                      />
                    </div>
                    <div className="group relative">
                      <label className={labelStyles}>Company Name *</label>
                      <Building2 className="absolute left-3 top-[34px] h-4 w-4 text-text-muted" />
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className={inputStyles}
                        placeholder="e.g. Teebot Solutions"
                      />
                    </div>
                  </div>

                  <div className="group relative">
                    <label className={labelStyles}>Business Type</label>
                    <Info className="absolute left-3 top-[34px] h-4 w-4 text-text-muted" />
                    <input
                      type="text"
                      list="business-types"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className={inputStyles}
                      placeholder="e.g. Retail / Shop"
                    />
                    <datalist id="business-types">
                      <option value="Retail / Shop" />
                      <option value="Distributor" />
                      <option value="Manufacturing" />
                      <option value="Service Agency" />
                      <option value="Others" />
                    </datalist>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group relative">
                      <label className={labelStyles}>Tax ID / TIN</label>
                      <Fingerprint className="absolute left-3 top-[34px] h-4 w-4 text-text-muted" />
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        className={inputStyles}
                        placeholder="Reg Number"
                      />
                    </div>
                    <div className="group relative">
                      <label className={labelStyles}>Sales Tax No.</label>
                      <Fingerprint className="absolute left-3 top-[34px] h-4 w-4 text-text-muted" />
                      <input
                        type="text"
                        value={salesTaxNo}
                        onChange={(e) => setSalesTaxNo(e.target.value)}
                        className={inputStyles}
                        placeholder="VAT / GST No"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group relative">
                      <label className={labelStyles}>Currency</label>
                      <BadgeDollarSign className="absolute left-3 top-[34px] h-4 w-4 text-text-muted" />
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className={`${inputStyles} appearance-none cursor-pointer`}
                      >
                        <option value="">Select Currency</option>
                        {currenciesList.map((curr) => (
                          <option key={curr.code} value={curr.code}>
                            {curr.symbol} {curr.name} ({curr.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="group relative">
                      <label className={labelStyles}>Website</label>
                      <Globe className="absolute left-3 top-[34px] h-4 w-4 text-text-muted" />
                      <input
                        type="text"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className={inputStyles}
                        placeholder="www.example.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Page 2: Master Account */}
              {currentPage === 2 && (
                <div className="space-y-6">
         

                  <div className="grid grid-cols-1 gap-4">
                    <div className="group relative">
                      <label className={labelStyles}>Username *</label>
                      <UserIcon className="absolute left-3 top-[34px] h-4 w-4 text-text-muted" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={inputStyles}
                        placeholder="admin"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group relative">
                      <label className={labelStyles}>Password *</label>
                      <Lock className="absolute left-3 top-[34px] h-4 w-4 text-text-muted" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputStyles}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-[34px] text-text-muted hover:text-cyan transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="group relative">
                      <label className={labelStyles}>Confirm Password *</label>
                      <Lock className="absolute left-3 top-[34px] h-4 w-4 text-text-muted" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputStyles}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-[34px] text-text-muted hover:text-cyan transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 shrink-0 border-t border-border">
                {currentPage > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="px-6 py-2.5 text-sm font-medium text-text-primary bg-surface border border-border rounded-lg hover:bg-card transition-colors"
                  >
                    Previous
                  </button>
                )}
                <button
                  type="submit"
                  className="ml-auto px-6 py-2.5 text-sm font-medium text-text-primary bg-primary hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-2"
                >
                  {currentPage === 1 ? "Next" : "Complete Setup"}
                  <ChevronRight className="h-4 w-4" />
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}