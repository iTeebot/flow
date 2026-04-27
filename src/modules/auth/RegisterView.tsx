import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useUiStore } from "../../store/uiStore";
import currencies from "../../assets/currencies.json";
import pakistanCities from "../../assets/countries/Pakistan.json";
import {
  Eye,
  EyeOff,
  Building2,
  User as UserIcon,
  Lock,
  Fingerprint,
  Info,
  Mail,
  Phone,
  MapPin,
  Map as MapIcon,
  Hash,
  IdCard,
  Globe2
} from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Sidebar } from "./Sidebar";
import { getLanguageDirection, getForwardIcon, getBackIcon } from "../../utils/layout";
import { SearchableSelect } from "../../components/ui/SearchableSelect";

interface Currency {
  symbol: string;
  name: string;
  symbol_native: string;
  decimal_digits: number;
  rounding: number;
  code: string;
  name_plural: string;
}

export function RegisterView() {
  const { t } = useTranslation("auth");
  const { register } = useAuthStore();
  const { language } = useUiStore();

  const direction = getLanguageDirection(language);
  const ForwardIcon = getForwardIcon(direction);
  const BackIcon = getBackIcon(direction);

  const [currenciesList, setCurrenciesList] = useState<Currency[]>([]);

  // Form state
  // 1. Identity & Business
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [cnic, setCnic] = useState("");
  const [currency, setCurrency] = useState("PKR");

  // 2. Contact & Location
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const country = "Pakistan"; // Fixed for now

  // 3. Security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");



  useEffect(() => {
    const currencyArray = Object.values(currencies) as Currency[];
    setCurrenciesList(currencyArray);
  }, []);

  const handleCityChange = (val: string) => {
    setCity(val);
    const selected = pakistanCities.find(c => c.name === val);
    if (selected) {
      setStateRegion(selected.state);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName || !companyName || !cnic || !taxId || !email || !address || !city || !stateRegion || !password || !confirmPassword) {
      setError(t("register.error_fill_required"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("register.error_mismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("register.error_length"));
      return;
    }

    try {
      await register({
        username: email,
        password,
        full_name: fullName,
        company_name: companyName,
        tax_registration_number: taxId,
        sales_tax_number: cnic,
        business_type: "",
        currency,
        phone,
        address,
        city,
        state: stateRegion,
        postal_code: postalCode,
        country,
        website: "",
      });
    } catch (err: any) {
      setError(err?.toString() ?? t("register.error_failed"));
    }
  };




  return (
    <div className="h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-auto md:h-[88vh] min-h-[600px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-500">

        <Sidebar type="register" />

        {/* ── Form Area ── */}
        <div className="flex-1 p-8 lg:p-12 flex flex-col overflow-hidden bg-surface">

          {/* Header */}
          <header className="mb-8 shrink-0">
            <h2 className="text-3xl font-black text-text-primary tracking-tight">
              {t("register.structure_title")}
            </h2>
            <p className="text-sm text-text-muted mt-1.5">
              {t("register.structure_desc")}
            </p>
          </header>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-bold flex items-center gap-3 shrink-0 animate-in slide-in-from-top-2 duration-200">
              <Info className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-1 space-y-6">

              {/* ── All Fields ── */}
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Identity & Business */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label={t("register.fullname_label")}
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("register.fullname_placeholder")}
                    leftIcon={<UserIcon className="h-4 w-4" />}
                  />
                  <Input
                    label={t("register.org_label")}
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t("register.org_placeholder")}
                    leftIcon={<Building2 className="h-4 w-4" />}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label={t("register.email_label")}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("register.email_placeholder")}
                    leftIcon={<Mail className="h-4 w-4" />}
                  />
                  <Input
                    label={t("register.phone_label")}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("register.phone_placeholder")}
                    leftIcon={<Phone className="h-4 w-4" />}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label={t("register.cnic_label")}
                    type="text"
                    required
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder={t("register.cnic_placeholder")}
                    leftIcon={<IdCard className="h-4 w-4" />}
                  />
                  <Input
                    label={t("register.tax_label")}
                    type="text"
                    required
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder={t("register.tax_placeholder")}
                    leftIcon={<Fingerprint className="h-4 w-4" />}
                  />
                </div>

                <Input
                  label={t("register.address_label")}
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("register.address_placeholder")}
                  leftIcon={<MapPin className="h-4 w-4" />}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <SearchableSelect
                    label={t("register.city_label")}
                    value={city}
                    onChange={handleCityChange}
                    placeholder={t("register.city_placeholder")}
                    openDirection="down"
                    options={pakistanCities.map(c => ({
                      label: c.name,
                      value: c.name,
                      description: c.state
                    }))}
                  />
                  <Input
                    label={t("register.state_label")}
                    type="text"
                    required
                    readOnly
                    value={stateRegion}
                    placeholder={t("register.state_placeholder")}
                    leftIcon={<MapIcon className="h-4 w-4" />}
                    className="bg-surface cursor-not-allowed opacity-70"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label={t("register.country_label")}
                    type="text"
                    readOnly
                    value={country}
                    leftIcon={<Globe2 className="h-4 w-4" />}
                    className="bg-surface cursor-not-allowed opacity-70"
                  />
                  <Input
                    label={t("register.postal_label")}
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder={t("register.postal_placeholder")}
                    leftIcon={<Hash className="h-4 w-4" />}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label={t("register.password_label")}
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("register.password_placeholder")}
                    leftIcon={<Lock className="h-4 w-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  <Input
                    label={t("register.confirm_password_label")}
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("register.confirm_password_placeholder")}
                    leftIcon={<Lock className="h-4 w-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                </div>

                <SearchableSelect
                  label={t("register.currency_label")}
                  value={currency}
                  onChange={(val) => setCurrency(val)}
                  placeholder={t("register.currency_choose")}
                  openDirection="up"
                  options={currenciesList.map((curr) => ({
                    label: `${curr.symbol} ${curr.name} (${curr.code})`,
                    value: curr.code,
                    description: curr.name_plural
                  }))}
                />
              </div>
            </div>


            {/* Submit */}
            <div className="flex items-center justify-end pt-8 shrink-0 border-t border-border/50 mt-6">
              <Button
                type="submit"
                className="px-8 py-3 text-xs uppercase tracking-widest"
                rightIcon={<ForwardIcon className="h-4 w-4" />}
              >
                {t("register.finish_button")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
