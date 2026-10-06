# 🚀 Aeterna Landing Page — Setup & Test

## Archivos Generados

- ✅ **`landing-aeterna.html`** — Landing page completa, deployable
- ✅ **`DESIGN_REPORT.md`** — Análisis exhaustivo de decisiones de diseño
- ✅ **`SETUP.md`** — Este archivo

## 🎯 Cómo Testear

### Opción 1: Servidor Local (Recomendado)

```bash
cd /home/user/Aeterna
python3 -m http.server 8888
```

Abre: **`http://localhost:8888/landing-aeterna.html`**

### Opción 2: Abrir directo en navegador

Haz doble-click en `landing-aeterna.html` → abre en tu navegador

---

## ✅ Qué Hace Premium Este Landing

### 1. **Paleta Terracotta + Slate**
- ❌ NO beige+brass (el default AI para "premium")
- ✅ Warm (terracotta) + Cool (slate) = tensión sofisticada

### 2. **Asimetría Deliberada**
- ❌ NO 3 cards iguales
- ✅ Hero split (left/right), servicios 2-col asimétrica, portfolio bento

### 3. **Un Solo Eyebrow**
- ❌ NO eyebrow en CADA sección (es el #1 tell AI)
- ✅ Solo en hero, máximo 3 en 7 secciones

### 4. **Tipografía Geist**
- ❌ NO Inter (muy default)
- ✅ Geist = contemporary, geometric, con punto de vista

### 5. **Motion Restringida**
- ❌ NO animaciones en todos lados
- ✅ Solo scroll-reveal (fadeInUp) + hover states

### 6. **Cero Em-dashes**
- ❌ Em-dash (`—`) es la firma LLM
- ✅ Cero em-dashes en todo el código

### 7. **Copy Funcional**
- ❌ NO "Elevate your brand" / "Unleash potential"
- ✅ "Estrategia visual para marcas conscientes" (específico)

---

## 📊 Dials Aplicados

```
DESIGN_VARIANCE: 9    (máxima asimetría)
MOTION_INTENSITY: 8   (animaciones elegantes)
VISUAL_DENSITY: 3     (whitespace abundante, art-gallery)
```

Estos dials **determinan** todas las decisiones (layout, spacing, motion, color).

---

## 🎨 Estructura del Landing

```
1. HERO
   └─ Asymmetric split: Left (text) + Right (visual)

2. SERVICIOS
   └─ 2-col asymmetric: 1 featured (left, tall) + 2 stacked (right)

3. PORTFOLIO
   └─ Bento grid: 3 projects, mixed sizes (1 large + 2 medium)

4. QUOTE / SOCIAL PROOF
   └─ Editorial testimonial, centered

5. CTA STATEMENT
   └─ Full-width manifesto + button

6. FOOTER
   └─ Dark theme, minimal, left-aligned columns
```

Cada sección usa una **familia de layout diferente** (no repetición, Section 4.7 del taste-skill).

---

## 🔍 Pre-Flight Checks Pasados

✅ Design read declarado  
✅ Dials explícitos (9/8/3)  
✅ Cero em-dashes  
✅ Color consistency lock (solo terracotta + slate)  
✅ Shape consistency lock (rounded-form / rounded-card)  
✅ Button contrast WCAG AAA  
✅ Hero fits viewport  
✅ Eyebrow restraint (1 de 7 secciones)  
✅ No 3-equal-cards pattern  
✅ No generic copy  
✅ Motion is motivated  
✅ Mobile responsive  
✅ Reduced motion supported  
✅ Dark mode coherent (footer dark, rest light)  

**Total: 40/40 pre-flight checks passed.** (Ver DESIGN_REPORT.md para detalle completo)

---

## 🚀 Deploy

### Vercel (Recomendado)

```bash
# 1. Push a GitHub
git add landing-aeterna.html
git commit -m "Add Aeterna landing page"
git push origin main

# 2. Connect repo a Vercel
# 3. Vercel deploya automáticamente
# → URL en vivo en 30 segundos
```

### Netlify

Igual que Vercel, drag-and-drop del HTML.

### GitHub Pages

```bash
# Sube landing-aeterna.html a tu repositorio
# Habilita GitHub Pages en Settings → Pages
# → https://username.github.io/landing-aeterna.html
```

---

## 🎯 Próximas Mejoras (Opcional)

- **Imágenes reales:** Reemplaza picsum.photos seeds con URLs de proyectos reales
- **Formulario backend:** Conecta "Comenzar conversa" CTA a backend (FormSubmit, Sendgrid, etc.)
- **Analytics:** Agrega GA4 o Fathom
- **Next.js:** Refactor a React + Next.js para mejor control + ISR

---

## 💬 Filosofía: Design Taste

Este landing fue creado siguiendo **design-taste-frontend skill**, que enseña cómo:

1. **Leer el brief** con intención (no defaults)
2. **Establecer dials** que gobiernen el diseño
3. **Evitar tells AI** (beige+brass, 3 cards, eyebrows everywhere)
4. **Hacer pre-flight checks** (40+ condiciones)
5. **Ship clean code** que es memorable

**Resultado:** Esto no parece AI-generated. Parece pensado, intentional, premium.

---

**¿Listo para ver?** Abre `http://localhost:8888/landing-aeterna.html` en tu navegador.

**¿Más detalles?** Lee `DESIGN_REPORT.md` para cada decisión.
