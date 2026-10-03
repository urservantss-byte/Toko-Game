/* Komponen gambar lazy-load dgn blur/shimmer placeholder */
const BlurImg = {
  props: { src: String, cls: { type: String, default: '' }, alt: { type: String, default: '' }, eager: Boolean, fit: { type: String, default: 'cover' } },
  data: () => ({ loaded: false, err: false }),
  template: `
    <div :class="['blurwrap', cls, { loaded }]">
      <img v-if="src && !err" :src="src" :alt="alt" :loading="eager ? 'eager' : 'lazy'"
           @load="loaded = true" @error="err = true; loaded = true"
           :class="[{ loaded }, fit === 'contain' ? 'object-contain' : 'object-cover']" class="w-full h-full">
      <div v-else class="w-full h-full flex items-center justify-center text-3xl bg-gray-100 dark:bg-gray-800">🎮</div>
    </div>`
};

/* Bintang rating */
const Stars = {
  props: { value: { type: Number, default: 0 } },
  computed: {
    full() { return '★'.repeat(Math.round(this.value || 0)); },
    empty() { return '★'.repeat(5 - Math.round(this.value || 0)); }
  },
  template: `<span class="stars text-sm">{{ full }}<span class="off">{{ empty }}</span></span>`
};

/* Badge status pesanan */
const StatusBadge = {
  props: { status: String },
  computed: {
    lbl() { return STLBL[this.status] || this.status; },
    cls() { return STCOLOR[this.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'; }
  },
  template: `<span :class="['text-xs font-semibold px-2.5 py-1 rounded-full', cls]">{{ lbl }}</span>`
};

/* Kompresi gambar client-side: resize maks 1280px, kualitas 0.8, output JPEG */
function compressImage(file, maxDim = 1280, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) return resolve(file);
    // file kecil (<300KB) tidak perlu dikompresi
    if (file.size < 300 * 1024) return resolve(file);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > maxDim || h > maxDim) {
        const r = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob((blob) => {
        resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
