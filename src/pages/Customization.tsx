import { useCustomization, CustomizationSettings } from "@/lib/customizationContext";
import { useBackground } from "@/lib/backgroundContext";
import { useI18n, languageOptions, TranslationKey } from "@/lib/i18n";
import PageShell from "@/components/PageShell";
import {
  Palette,
  Type,
  Sparkles,
  PanelLeft,
  RotateCcw,
  ImagePlus,
  Trash2,
  Wallpaper,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useRef, forwardRef } from "react";

const themePresets: { nameKey: TranslationKey; hue: number }[] = [
  { nameKey: "red", hue: 349 },
  { nameKey: "blue", hue: 220 },
  { nameKey: "green", hue: 142 },
  { nameKey: "purple", hue: 270 },
  { nameKey: "orange", hue: 25 },
  { nameKey: "cyan", hue: 180 },
  { nameKey: "pink", hue: 330 },
  { nameKey: "yellow", hue: 50 },
];

const fontOptions: { value: CustomizationSettings["fontFamily"]; label: string }[] = [
  { value: "inter", label: "Inter" },
  { value: "jetbrains", label: "JetBrains Mono" },
  { value: "system", label: "systemFont" },
];

const fontSizeOptions: { value: CustomizationSettings["fontSize"]; labelKey: TranslationKey }[] = [
  { value: "small", labelKey: "small" },
  { value: "normal", labelKey: "normal" },
  { value: "large", labelKey: "large" },
];

const Section = forwardRef<HTMLDivElement, { icon: any; title: string; children: React.ReactNode }>(
  ({ icon: Icon, title, children }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-lg p-5 neon-border space-y-4"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-mono font-bold text-foreground">{title}</h2>
        </div>
        {children}
      </motion.div>
    );
  },
);
Section.displayName = "Section";

export default function Customization() {
  const { settings, updateSettings, resetSettings } = useCustomization();
  const { backgroundUrl, setBackgroundUrl, backgroundOpacity, setBackgroundOpacity } =
    useBackground();
  const { t, language, setLanguage } = useI18n();
  const bgRef = useRef<HTMLInputElement>(null);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("supportedFormats"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("maxFileSize"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBackgroundUrl(reader.result as string);
      toast.success(t("bgUpdated"));
    };
    reader.readAsDataURL(file);
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-mono font-bold text-primary neon-text">
            {t("customization")}
          </h1>
          <button
            onClick={() => {
              resetSettings();
              toast.success(t("resetSettings"));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border text-xs font-mono rounded hover:border-destructive/30 transition-all text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="w-3 h-3" />
            {t("reset")}
          </button>
        </div>

        {/* Language */}
        <Section icon={Globe} title={t("selectLanguage")}>
          <div className="grid grid-cols-3 gap-2">
            {languageOptions.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border text-sm font-mono transition-all ${
                  language === lang.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Theme Color */}
        <Section icon={Palette} title={t("themeColor")}>
          <div className="grid grid-cols-4 gap-2">
            {themePresets.map((preset) => (
              <button
                key={preset.hue}
                onClick={() => {
                  updateSettings({ themeHue: preset.hue });
                  toast.success(`${t(preset.nameKey)} ${t("themeApplied")}`);
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                  settings.themeHue === preset.hue
                    ? "border-foreground bg-secondary"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full shadow-lg"
                  style={{ backgroundColor: `hsl(${preset.hue}, 100%, 50%)` }}
                />
                <span className="text-[10px] font-mono text-muted-foreground">
                  {t(preset.nameKey)}
                </span>
              </button>
            ))}
          </div>
          <div className="space-y-1 pt-2">
            <label className="text-[10px] font-mono text-muted-foreground">
              {t("customHue").toUpperCase()}: {settings.themeHue}°
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={settings.themeHue}
              onChange={(e) => updateSettings({ themeHue: parseInt(e.target.value) })}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))`,
              }}
            />
          </div>
        </Section>

        {/* Font */}
        <Section icon={Type} title={t("font")}>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground mb-2 block">
                {t("fontFamily").toUpperCase()}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {fontOptions.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => updateSettings({ fontFamily: f.value })}
                    className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                      settings.fontFamily === f.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {f.label === "systemFont" ? t("systemFont") : f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground mb-2 block">
                {t("fontSize").toUpperCase()}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {fontSizeOptions.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => updateSettings({ fontSize: s.value })}
                    className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                      settings.fontSize === s.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {t(s.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Animations */}
        <Section icon={Sparkles} title={t("animations")}>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-mono text-foreground">{t("neonEffects")}</span>
              <button
                onClick={() => updateSettings({ neonEnabled: !settings.neonEnabled })}
                className={`w-10 h-5 rounded-full transition-all relative ${
                  settings.neonEnabled ? "bg-primary" : "bg-secondary border border-border"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-all ${settings.neonEnabled ? "left-5" : "left-0.5"}`}
                />
              </button>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-mono text-foreground">{t("animationsToggle")}</span>
              <button
                onClick={() => updateSettings({ animationsEnabled: !settings.animationsEnabled })}
                className={`w-10 h-5 rounded-full transition-all relative ${
                  settings.animationsEnabled ? "bg-primary" : "bg-secondary border border-border"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-all ${settings.animationsEnabled ? "left-5" : "left-0.5"}`}
                />
              </button>
            </label>
          </div>
        </Section>

        {/* Sidebar */}
        <Section icon={PanelLeft} title={t("sidebarLayout")}>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground mb-2 block">
                {t("position").toUpperCase()}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["left", "right"] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => updateSettings({ sidebarPosition: pos })}
                    className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                      settings.sidebarPosition === pos
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {pos === "left" ? t("left") : t("right")}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-mono text-foreground">{t("collapseSidebar")}</span>
              <button
                onClick={() => updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed })}
                className={`w-10 h-5 rounded-full transition-all relative ${
                  settings.sidebarCollapsed ? "bg-primary" : "bg-secondary border border-border"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-all ${settings.sidebarCollapsed ? "left-5" : "left-0.5"}`}
                />
              </button>
            </label>
          </div>
        </Section>

        {/* Background Image */}
        <Section icon={Wallpaper} title={t("backgroundImage")}>
          {backgroundUrl && (
            <div className="relative rounded-lg overflow-hidden h-24 border border-border">
              <img
                src={backgroundUrl}
                alt={t("backgroundImage")}
                className="w-full h-full object-cover"
                style={{ opacity: backgroundOpacity }}
              />
              <div className="absolute inset-0 bg-background/60" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => bgRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border text-xs font-mono rounded hover:border-primary/30 transition-all text-foreground"
            >
              <ImagePlus className="w-3.5 h-3.5 text-primary" />
              {backgroundUrl ? t("changeImage") : t("selectImage")}
            </button>
            {backgroundUrl && (
              <button
                onClick={() => {
                  setBackgroundUrl(null);
                  toast.success(t("bgRemoved"));
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border text-xs font-mono rounded hover:border-destructive/30 transition-all text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("removeImage")}
              </button>
            )}
            <input
              ref={bgRef}
              type="file"
              accept="image/*,.gif"
              className="hidden"
              onChange={handleBgUpload}
            />
          </div>
          {backgroundUrl && (
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground">
                {t("opacity").toUpperCase()}: {Math.round(backgroundOpacity * 100)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={backgroundOpacity}
                onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                className="w-full accent-primary h-1"
              />
            </div>
          )}
        </Section>
      </div>
    </PageShell>
  );
}
