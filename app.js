const { createApp } = Vue;

createApp({
  data() {
    return {
      now: new Date(),
      timer: null,
      playlist: [],
      currentTrackIndex: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      isLightTheme: false,
      toastMessage: '',
      toastTimer: null,
    };
  },
  computed: {
    audio() { return this.$refs.audio; },
    currentTrack() { return this.playlist[this.currentTrackIndex] || null; },
    timeText() { return this.now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); },
    dateText() { return this.now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }); },
    weekdayText() { return this.now.toLocaleDateString('zh-CN', { weekday: 'long' }); },
    greeting() {
      const hour = this.now.getHours();
      if (hour < 6) return '夜深了';
      if (hour < 12) return '早上好';
      if (hour < 18) return '下午好';
      return '晚上好';
    },
  },
  mounted() {
    this.timer = window.setInterval(() => { this.now = new Date(); }, 1000);
    this.volume = Number(localStorage.getItem('time-box-volume') || 0.8);
    this.isLightTheme = localStorage.getItem('time-box-theme') === 'light';
    this.applyTheme();
  },
  beforeUnmount() {
    window.clearInterval(this.timer);
    this.playlist.forEach((track) => URL.revokeObjectURL(track.url));
  },
  methods: {
    showToast(message) {
      this.toastMessage = message;
      window.clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => { this.toastMessage = ''; }, 2600);
    },
    applyTheme() { document.documentElement.classList.toggle('light-theme', this.isLightTheme); },
    toggleTheme() {
      this.isLightTheme = !this.isLightTheme;
      localStorage.setItem('time-box-theme', this.isLightTheme ? 'light' : 'dark');
      this.applyTheme();
    },
    importTracks(event) {
      const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3'));
      if (!files.length) { this.showToast('请选择 MP3 或其他音频文件'); event.target.value = ''; return; }
      const newTracks = files.map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, name: file.name.replace(/\.[^/.]+$/, ''), source: '本地音乐', type: 'MP3 AUDIO', url: URL.createObjectURL(file), duration: 0 }));
      this.playlist.push(...newTracks);
      if (this.playlist.length === newTracks.length) this.loadTrack(0, false);
      event.target.value = '';
      this.showToast(`已添加 ${newTracks.length} 首音乐`);
    },
    loadTrack(index, autoplay = false) {
      if (!this.playlist[index]) return;
      this.currentTrackIndex = index;
      this.currentTime = 0;
      this.duration = this.playlist[index].duration || 0;
      this.$nextTick(() => {
        this.audio.src = this.playlist[index].url;
        this.audio.volume = this.volume;
        this.audio.load();
        if (autoplay) this.audio.play().catch(() => this.showToast('请点击播放按钮开始音乐'));
      });
    },
    selectTrack(index) { this.loadTrack(index, true); },
    togglePlay() {
      if (!this.currentTrack) { this.showToast('请先添加一首 MP3 音乐'); return; }
      if (this.isPlaying) this.audio.pause();
      else this.audio.play().catch(() => this.showToast('浏览器阻止了自动播放，请再次点击播放'));
    },
    previousTrack() {
      if (!this.playlist.length) return;
      const index = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
      this.loadTrack(index, true);
    },
    nextTrack() {
      if (!this.playlist.length) return;
      const index = (this.currentTrackIndex + 1) % this.playlist.length;
      this.loadTrack(index, true);
    },
    handleEnded() { this.nextTrack(); },
    syncTime() { this.currentTime = this.audio.currentTime || 0; },
    syncDuration() {
      this.duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
      if (this.currentTrack) this.currentTrack.duration = this.duration;
    },
    seek(event) { if (this.audio) this.audio.currentTime = Number(event.target.value); },
    changeVolume() {
      if (this.audio) this.audio.volume = this.volume;
      localStorage.setItem('time-box-volume', this.volume);
    },
    removeTrack(index) {
      const removed = this.playlist[index];
      URL.revokeObjectURL(removed.url);
      const wasCurrent = index === this.currentTrackIndex;
      this.playlist.splice(index, 1);
      if (!this.playlist.length) {
        this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.currentTrackIndex = 0; this.isPlaying = false; this.duration = 0; this.currentTime = 0;
      } else if (wasCurrent) {
        this.loadTrack(Math.min(index, this.playlist.length - 1), false);
      } else if (index < this.currentTrackIndex) this.currentTrackIndex -= 1;
      this.showToast(`已移除「${removed.name}」`);
    },
    formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
      const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
      const remaining = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${minutes}:${remaining}`;
    },
  },
}).mount('#app');
