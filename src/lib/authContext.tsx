import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type Role = "admin" | "vendor" | "buyer" | null;

const toAuthEmail = (identifier: string) => {
  const normalized = identifier.trim().toLowerCase();
  if (normalized.includes("@")) return normalized;
  const username = normalized
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return `${username || "user"}@local.aeigsthub`;
};

const authTimeout = <T,>(promise: Promise<T>, fallback: T, ms = 3000) =>
  Promise.race([
    promise,
    new Promise<T>((resolve) => {
      window.setTimeout(() => resolve(fallback), ms);
    }),
  ]);

interface AuthState {
  user: User | null;
  role: Role;
  loading: boolean;
  mfaChallenge: { factorId: string; challengeId: string } | null;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (
    email: string,
    password: string,
    displayName: string,
    role: "vendor" | "buyer",
    withdrawPin?: string,
    pgpKey?: string,
  ) => Promise<string | null>;
  verifyMfa: (code: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);
  const [mfaChallenge, setMfaChallenge] = useState<{
    factorId: string;
    challengeId: string;
  } | null>(null);
  const roleRequestIdRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const fetchRole = async (userId: string, requestId: number) => {
      try {
        const nextRole = await Promise.race<Role | null>([
          supabase.rpc("get_user_role", { _user_id: userId }).then(({ data, error }) => {
            if (error) return null;
            return (data as Role) || null;
          }),
          new Promise<Role | null>((resolve) => {
            setTimeout(() => resolve(null), 3000);
          }),
        ]);
        if (!mounted || roleRequestIdRef.current !== requestId) return;
        setRole(nextRole);
      } catch {
        if (!mounted || roleRequestIdRef.current !== requestId) return;
        setRole(null);
      } finally {
        if (mounted && roleRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    const applySession = (nextUser: User | null) => {
      if (!mounted) return;
      const requestId = ++roleRequestIdRef.current;
      setUser(nextUser);
      if (!nextUser) {
        setRole(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      void fetchRole(nextUser.id, requestId);
    };

    void authTimeout(supabase.auth.getSession(), { data: { session: null }, error: null }).then(
      ({ data: { session } }) => {
        applySession(session?.user ?? null);
      },
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const normalized = toAuthEmail(email);

    // 1) Check account lockout BEFORE attempting auth
    const { data: lockData } = await supabase.rpc("is_account_locked", { _email: normalized });
    const lock = lockData as { locked: boolean; seconds_remaining?: number } | null;
    if (lock?.locked) {
      const mins = Math.ceil((lock.seconds_remaining ?? 0) / 60);
      return `Hesap kilitli. ${mins} dakika sonra tekrar dene.`;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error) {
      // record failed attempt
      await supabase.rpc("record_login_attempt", { _email: normalized, _success: false });
      return error.message;
    }

    // success — reset counter
    await supabase.rpc("record_login_attempt", { _email: normalized, _success: true });

    // Check if MFA is required
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verifiedFactors = factorsData?.totp?.filter((f) => f.status === "verified") || [];

    if (verifiedFactors.length > 0) {
      const factor = verifiedFactors[0];
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });
      if (challengeErr) return challengeErr.message;
      setMfaChallenge({ factorId: factor.id, challengeId: challenge.id });
      return "MFA_REQUIRED";
    }

    await supabase.from("security_logs").insert({
      ip: "client",
      device: navigator.userAgent.slice(0, 50),
      success: true,
      user_email: normalized,
    });

    return null;
  };

  const verifyMfa = async (code: string): Promise<string | null> => {
    if (!mfaChallenge) return "No MFA challenge active";
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaChallenge.factorId,
      challengeId: mfaChallenge.challengeId,
      code,
    });
    if (error) return "Geçersiz kod. Tekrar deneyin.";
    setMfaChallenge(null);

    await supabase.from("security_logs").insert({
      ip: "client",
      device: navigator.userAgent.slice(0, 50),
      success: true,
      user_email: user?.email || "",
    });

    return null;
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string,
    selectedRole: "vendor" | "buyer",
    withdrawPin?: string,
    pgpKey?: string,
  ): Promise<string | null> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName, signup_role: selectedRole },
      },
    });
    if (error) return error.message;
    if (!data.session) return "Kayit olusturuldu. Giris yapabilirsiniz.";
    if (false && !data.session)
      return "E-posta doğrulama bağlantısı gönderildi. Onayladıktan sonra giriş yapabilirsiniz.";

    const { error: roleError } = await supabase.rpc("assign_role_on_signup", {
      _role: selectedRole,
    });
    if (roleError) return roleError.message;

    // Hash PIN and persist along with PGP key on profile
    try {
      let pinHash: string | null = null;
      if (withdrawPin && /^\d{6}$/.test(withdrawPin)) {
        const buf = new TextEncoder().encode(withdrawPin);
        const hash = await crypto.subtle.digest("SHA-256", buf);
        pinHash = Array.from(new Uint8Array(hash))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
      const uid = data.session.user.id;
      const update: { withdraw_pin_hash?: string; pgp_key?: string } = {};
      if (pinHash) update.withdraw_pin_hash = pinHash;
      if (pgpKey && pgpKey.trim()) update.pgp_key = pgpKey.trim();
      if (Object.keys(update).length) {
        await supabase.from("profiles").update(update).eq("user_id", uid);
      }
    } catch (e) {
      console.warn("Profile security fields not saved:", e);
    }

    roleRequestIdRef.current += 1;
    setRole(selectedRole);
    setLoading(false);
    return null;
  };

  const logout = async () => {
    const isDeadManArmed = localStorage.getItem("dead-man-mode") === "armed";
    await supabase.auth.signOut();

    if (isDeadManArmed) {
      localStorage.clear();
      sessionStorage.clear();
      // Cookies are harder to clear without specific names, but this covers most
    }

    roleRequestIdRef.current += 1;
    setUser(null);
    setRole(null);
    setMfaChallenge(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, role, loading, mfaChallenge, login, signup, verifyMfa, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
