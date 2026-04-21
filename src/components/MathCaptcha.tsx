import { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";

interface Props {
  onValidChange: (valid: boolean) => void;
  label?: string;
}

export default function MathCaptcha({ onValidChange, label = "Bot doğrulama" }: Props) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [val, setVal] = useState("");
  const [valid, setValid] = useState(false);

  const regen = () => {
    setA(Math.floor(Math.random() * 9) + 1);
    setB(Math.floor(Math.random() * 9) + 1);
    setVal("");
    setValid(false);
    onValidChange(false);
  };

  useEffect(() => { regen(); }, []);

  useEffect(() => {
    const ok = parseInt(val, 10) === a + b;
    setValid(ok);
    onValidChange(ok);
  }, [val, a, b]);

  return (
    <div className="space-y-1">
      <label className="text-xs font-mono text-muted-foreground flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm bg-secondary/40 px-3 py-2 rounded border border-border">{a} + {b} = ?</span>
        <input
          type="text"
          inputMode="numeric"
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/\D/g, "").slice(0, 3))}
          className={`flex-1 bg-background border rounded px-3 py-2 text-sm font-mono focus:outline-none ${valid ? "border-green-500" : "border-border focus:border-primary"}`}
          placeholder="?"
        />
        <button type="button" onClick={regen} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Yenile">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
