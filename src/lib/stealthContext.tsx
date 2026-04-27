import React, { createContext, useContext, useState, useEffect } from "react";

type StealthContextType = {
  isStealth: boolean;
  setStealth: (v: boolean) => void;
  toggleStealth: () => void;
};

const StealthContext = createContext<StealthContextType | undefined>(undefined);

export const StealthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isStealth, setStealth] = useState(false);

  const toggleStealth = () => setStealth((prev) => !prev);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + S to toggle stealth
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        toggleStealth();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <StealthContext.Provider value={{ isStealth, setStealth, toggleStealth }}>
      {isStealth ? <StealthCamouflage onExit={() => setStealth(false)} /> : children}
    </StealthContext.Provider>
  );
};

const StealthCamouflage = ({ onExit }: { onExit: () => void }) => {
  return (
    <div className="min-h-screen bg-[#f6f6f6] text-[#202122] font-serif p-8 overflow-auto select-text selection:bg-[#3366cc] selection:text-white">
      <div className="max-w-4xl mx-auto bg-white border border-[#a2a9b1] p-10 shadow-sm">
        <div className="flex justify-between items-start border-b border-[#a2a9b1] pb-3 mb-6">
          <h1 className="text-3xl font-normal leading-tight">
            Advanced Linux Sound Architecture (ALSA) Configuration
          </h1>
          <button
            onClick={onExit}
            className="text-[10px] text-[#72777d] hover:text-[#3366cc] font-sans uppercase tracking-widest"
          >
            [Edit Section]
          </button>
        </div>

        <div className="bg-[#f8f9fa] border border-[#a2a9b1] p-4 mb-6 inline-block min-w-[300px]">
          <div className="font-bold text-center mb-2">Contents</div>
          <ul className="text-[#3366cc] text-sm space-y-1">
            <li>1. Introduction</li>
            <li>2. Kernel Modules</li>
            <li>
              3. User Space Configuration
              <ul className="pl-4 mt-1">
                <li>3.1 asoundrc</li>
                <li>3.2 alsa-lib</li>
              </ul>
            </li>
            <li>4. Troubleshooting</li>
          </ul>
        </div>

        <div className="space-y-6 text-base leading-relaxed">
          <section>
            <h2 className="text-2xl border-b border-[#a2a9b1] pb-1 mb-3">Introduction</h2>
            <p>
              The Advanced Linux Sound Architecture (ALSA) provides audio and MIDI functionality to
              the Linux operating system. ALSA has some significant features, including efficient
              support for all types of audio interfaces, from consumer sound cards to professional
              multichannel audio interfaces, fully modularized sound drivers, and compatibility with
              the older OSS API.
            </p>
          </section>

          <section>
            <h2 className="text-2xl border-b border-[#a2a9b1] pb-1 mb-3">Kernel Modules</h2>
            <p>
              ALSA is integrated into the Linux kernel and consists of a set of drivers for sound
              cards and a library for application developers. The kernel modules follow a specific
              naming convention, usually starting with{" "}
              <code className="bg-[#f8f9fa] border border-[#eaecf0] px-1 rounded font-mono text-sm">
                snd-
              </code>
              .
            </p>
            <div className="bg-[#f8f9fa] border border-[#eaecf0] p-4 font-mono text-sm mt-4">
              # modprobe snd-hda-intel
              <br /># lsmod | grep snd
            </div>
          </section>

          <section>
            <h2 className="text-2xl border-b border-[#a2a9b1] pb-1 mb-3">Configuration</h2>
            <p>
              Configuration is primarily handled through the{" "}
              <code className="bg-[#f8f9fa] border border-[#eaecf0] px-1 rounded font-mono text-sm">
                /etc/asound.conf
              </code>{" "}
              file for system-wide settings and{" "}
              <code className="bg-[#f8f9fa] border border-[#eaecf0] px-1 rounded font-mono text-sm">
                ~/.asoundrc
              </code>{" "}
              for user-specific settings.
            </p>
          </section>
        </div>

        <footer className="mt-12 pt-4 border-t border-[#a2a9b1] text-xs text-[#72777d]">
          This page was last edited on 26 April 2026, at 14:22 (UTC). Text is available under the
          Creative Commons Attribution-ShareAlike License.
        </footer>
      </div>
    </div>
  );
};

export const useStealth = () => {
  const context = useContext(StealthContext);
  if (context === undefined) {
    throw new Error("useStealth must be used within a StealthProvider");
  }
  return context;
};
