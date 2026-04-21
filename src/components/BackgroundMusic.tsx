import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function BackgroundMusic() {
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const videoId = "Ab5MMTPcBKA";

  const togglePlay = () => {
    setPlaying((prev) => !prev);
  };

  return (
    <>
      {playing && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&enablejsapi=1`}
          allow="autoplay"
          className="hidden"
          title="Background Music"
        />
      )}
      <button
        onClick={togglePlay}
        className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-all neon-glow-btn"
        title={playing ? "Müziği Kapat" : "Müziği Aç"}
      >
        {playing ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
    </>
  );
}
