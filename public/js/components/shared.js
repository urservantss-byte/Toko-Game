/* Komponen gambar lazy-load dgn blur/shimmer placeholder */
const BlurImg = {
  props: { src: String, cls: { type: String, default: '' }, alt: { type: String, default: '' }, eager: Boolean },
  data: () => ({ loaded: false, err: false }),
  template: `
    <div :class="['blurwrap', cls, { loaded }]">
      <img v-if="src && !err" :src="src" :alt="alt" :loading="eager ? 'eager' : 'lazy'"
           @load="loaded = true" @error="err = true; loaded = true"
           :class="{ loaded }" class="w-full h-full object-cover">
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
