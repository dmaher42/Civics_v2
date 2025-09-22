const LANDMARK_LABELS = {
  'Acropolis': 'Acropolis',
  'Agora': 'Agora',
  'Pnyx': 'Pnyx',
  'Areopagus': 'Areopagus',
  'Kerameikos': 'Kerameikos',
  'Parthenon': 'Parthenon',
  'Erechtheion': 'Erechtheion',
  'Propylaea': 'Propylaea',
  'Temple of Athena Nike': 'Athena Nike',
  'Theatre of Dionysus': 'Dionysus Theatre',
  'Odeon of Herodes Atticus': 'Odeon',
  'Temple of Olympian Zeus': 'Olympeion',
  'Roman Agora': 'Roman Agora',
  'Tower of the Winds': 'Tower of the Winds',
  "Hadrian's Library": "Hadrian's Library",
  'Panathenaic Stadium': 'Kallimarmaro',
  'Temple of Hephaistos': 'Hephaistos',
  'Stoa of Attalos': 'Stoa of Attalos',
  'Tholos': 'Tholos',
  'Bouleuterion': 'Bouleuterion',
  'Altar of the Twelve Gods': 'Altar of the XII Gods',
  'Sacred Way (Eleusis–Athens)': 'Sacred Way',
  'Long Walls (Piraeus)': 'Piraeus Long Wall',
  'Long Walls (Phaleron)': 'Phaleron Long Wall',
  'City Wall of Athens': 'City Wall',
  'Areopagus Viewpoint West': 'Areopagus View',
  'Areopagus Viewpoint South': 'Areopagus View',
  'Areopagus Viewpoint East': 'Areopagus View'
};

const LONG_WALL_LABELS = {
  'Long Walls (Piraeus)': 'Long Walls to Piraeus',
  'Long Walls (Phaleron)': 'Long Walls to Phaleron'
};

function getCanvasContext(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('[landmarks] Canvas 2D context unavailable');
  }
  return ctx;
}

function projectPoint([lon, lat], bounds, size) {
  const baseLon = bounds?.lon ?? 23.72;
  const baseLat = bounds?.lat ?? 37.97;
  const scale = bounds?.scale ?? 12000;
  const [width, height] = size;
  const x = (lon - baseLon) * Math.cos((baseLat * Math.PI) / 180) * scale;
  const y = -(lat - baseLat) * scale;
  return [width / 2 + x, height / 2 + y];
}

class LandmarkOverlay {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = getCanvasContext(canvas);
    this.options = {
      geoJsonUrl: './data/athens_places.geojson',
      agoraDataUrl: null,
      showAgoraLayer: false,
      bounds: { lon: 23.72, lat: 37.97, scale: 12000 },
      ...options
    };
    this.features = [];
    this.agoraFeatures = [];
    this.isReady = false;
    if (canvas && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.render());
      this.resizeObserver.observe(canvas);
    }
  }

  async initialize() {
    if (!this.canvas) {
      throw new Error('LandmarkOverlay requires a canvas element');
    }
    await this.loadGeoJson(this.options.geoJsonUrl);
    if (this.options.showAgoraLayer && this.options.agoraDataUrl) {
      await this.loadAgoraLayer(this.options.agoraDataUrl);
    }
    this.isReady = true;
    this.render();
    return this;
  }

  async loadGeoJson(url) {
    if (!url) return;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load GeoJSON from ${url}: ${res.status}`);
    }
    const data = await res.json();
    this.features = Array.isArray(data.features) ? data.features : [];
  }

  async loadAgoraLayer(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      this.agoraFeatures = Array.isArray(data.features) ? data.features : [];
    } catch (err) {
      console.warn('[landmarks] Unable to load Agora layer', err);
      this.agoraFeatures = [];
    }
  }

  getLabelForFeature(f) {
    const name = f?.properties?.name || '';
    const short = LANDMARK_LABELS[name] || f?.properties?.short || f?.properties?.title || name;
    return short || '';
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const width = (this.canvas.width = this.canvas.clientWidth || this.canvas.width || 640);
    const height = (this.canvas.height = this.canvas.clientHeight || this.canvas.height || 480);
    ctx.clearRect(0, 0, width, height);

    const features = [...this.features];
    if (this.options.showAgoraLayer && this.agoraFeatures.length) {
      features.push(...this.agoraFeatures);
    }
    features.forEach((feature) => this.drawFeature(feature, width, height));
  }

  drawFeature(feature, width, height) {
    const type = feature?.geometry?.type;
    if (!type) return;
    switch (type) {
      case 'Point':
        this.drawPoint(feature, width, height);
        break;
      case 'LineString':
        this.drawLine(feature, width, height);
        break;
      case 'Polygon':
        this.drawPolygon(feature, width, height);
        break;
      default:
        break;
    }
  }

  drawPoint(feature, width, height) {
    const coordinates = feature.geometry.coordinates;
    const [x, y] = projectPoint(coordinates, this.options.bounds, [width, height]);
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    const label = this.getLabelForFeature(feature);
    if (label) {
      ctx.font = '12px "Inter", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(17, 24, 39, 0.92)';
      ctx.fillText(label, x + 6, y - 6);
    }
    ctx.restore();
  }

  drawLine(feature, width, height) {
    const coords = feature.geometry.coordinates || [];
    if (!coords.length) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    coords.forEach((pt, idx) => {
      const [x, y] = projectPoint(pt, this.options.bounds, [width, height]);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    const midpoint = coords[Math.floor(coords.length / 2)];
    const [mx, my] = projectPoint(midpoint, this.options.bounds, [width, height]);
    const name = feature?.properties?.name;
    const label = LONG_WALL_LABELS[name] || this.getLabelForFeature(feature);
    if (label) {
      ctx.font = '11px "Inter", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(30, 64, 175, 0.92)';
      ctx.fillText(label, mx + 6, my - 6);
    }
    ctx.restore();
  }

  drawPolygon(feature, width, height) {
    const rings = feature.geometry.coordinates || [];
    if (!rings.length) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(96, 165, 250, 0.18)';
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 1.5;
    rings.forEach((ring) => {
      ring.forEach((pt, idx) => {
        const [x, y] = projectPoint(pt, this.options.bounds, [width, height]);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
    });
    ctx.closePath();
    ctx.fill('nonzero');
    ctx.stroke();
    const firstRing = rings[0] || [];
    const centroid = firstRing.reduce((acc, pt) => [acc[0] + pt[0], acc[1] + pt[1]], [0, 0]);
    if (firstRing.length) {
      centroid[0] /= firstRing.length;
      centroid[1] /= firstRing.length;
      const [cx, cy] = projectPoint(centroid, this.options.bounds, [width, height]);
      const label = this.getLabelForFeature(feature);
      if (label) {
        ctx.font = '11px "Inter", system-ui, sans-serif';
        ctx.fillStyle = 'rgba(37, 99, 235, 0.95)';
        ctx.fillText(label, cx + 6, cy - 6);
      }
    }
    ctx.restore();
  }
}

function createLandmarkOverlay(canvas, options) {
  return new LandmarkOverlay(canvas, options);
}

export { LandmarkOverlay, createLandmarkOverlay, LANDMARK_LABELS, LONG_WALL_LABELS };

if (typeof window !== 'undefined') {
  window.AthensMap = window.AthensMap || {};
  window.AthensMap.LandmarkOverlay = LandmarkOverlay;
  window.AthensMap.createLandmarkOverlay = createLandmarkOverlay;
}
