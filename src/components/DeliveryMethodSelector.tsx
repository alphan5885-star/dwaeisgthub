import { Truck, MapPin, Mail } from "lucide-react";

type DeliveryMethod = "cargo" | "dead_drop" | "mailbox";

interface Props {
  value: DeliveryMethod;
  onChange: (v: DeliveryMethod) => void;
  productType: string;
}

const methods = [
  { id: "cargo" as const, label: "Kargo", desc: "Standart kargo takipli gönderim", icon: Truck },
  { id: "dead_drop" as const, label: "Dead-Drop", desc: "GPS koordinatlı elden bırakma", icon: MapPin },
  { id: "mailbox" as const, label: "Anonim Posta", desc: "Anonim posta kutusu teslimatı", icon: Mail },
];

export default function DeliveryMethodSelector({ value, onChange, productType }: Props) {
  if (productType === "digital") return null;

  return (
    <div className="space-y-2">
      <label className="text-xs font-mono text-muted-foreground">Teslimat Yöntemi</label>
      <div className="grid grid-cols-3 gap-2">
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
              value === m.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-secondary text-muted-foreground hover:border-primary/30"
            }`}
          >
            <m.icon className="w-5 h-5" />
            <span className="text-[11px] font-mono font-bold">{m.label}</span>
            <span className="text-[9px] font-mono opacity-70">{m.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
