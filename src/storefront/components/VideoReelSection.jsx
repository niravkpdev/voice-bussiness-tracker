import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Sparkles, Utensils, Video } from 'lucide-react';

export function VideoReelSection({ onExploreMenu, onWatchVideos, storeName }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <section className="bhole-reel-section">
      <div className="bhole-reel-header">
        <h3 className="bhole-section-title-underline">Our Most Popular Videos</h3>
        <p className="bhole-section-subtitle">
          See how our traditional Surat namkeens and wafers are freshly prepared every morning!
        </p>
      </div>

      <div className="bhole-reel-container">
        {/* Vertical Reel Card */}
        <div className="bhole-reel-card">
          <div className="bhole-video-wrapper">
            <video
              ref={videoRef}
              className="bhole-reel-video"
              loop
              playsInline
              muted={isMuted}
              poster="https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&auto=format&fit=crop&q=80"
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
              onClick={togglePlay}
            />

            {/* Custom Overlay Controls */}
            <div className="bhole-video-overlay-controls">
              <button
                type="button"
                className="bhole-vid-btn play-btn"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} fill="#fff" />}
              </button>

              <div className="bhole-vid-sub-controls">
                <button
                  type="button"
                  className="bhole-vid-btn"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button
                  type="button"
                  className="bhole-vid-btn"
                  onClick={handleFullscreen}
                  aria-label="Fullscreen"
                >
                  <Maximize2 size={18} />
                </button>
              </div>
            </div>

            {/* Reel Badge */}
            <div className="bhole-reel-shop-tag">
              <span>{storeName ? `${storeName} Fresh Farsan Daily` : 'Fresh Farsan Daily'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons as seen in the video */}
        <div className="bhole-reel-action-bar">
          <button
            type="button"
            className="bhole-reel-btn highlight"
            onClick={onExploreMenu}
          >
            <Utensils size={18} />
            <span>Explore Our Menu</span>
          </button>
          <button
            type="button"
            className="bhole-reel-btn outline"
            onClick={onWatchVideos || togglePlay}
          >
            <Video size={18} />
            <span>Watch Our Videos</span>
          </button>
        </div>
      </div>
    </section>
  );
}
