# Gas LP Monitor 📱🔥

Aplicación móvil para consumidores de gas LP que permite rastrear el nivel del tanque, predecir cuánto tiempo dura el gas con **IA implementada en código** y recibir recordatorios antes de quedarse sin gas.

---

## ✨ Características

| Función | Descripción |
|---|---|
| 🔥 **Gauge animado** | Indicador visual circular del nivel del tanque (rojo/amarillo/verde) |
| 🧠 **IA en código** | Regresión lineal implementada en TypeScript para predecir días restantes |
| 📊 **Historial** | Registro de consumo con gráfica de barras |
| 🔔 **Recordatorios** | Notificaciones locales antes de quedarse sin gas |
| 💾 **100% local** | Todos los datos guardados en SQLite en el dispositivo, sin internet |

---

## 🧠 Cómo funciona la IA

La IA **no usa APIs externas** — está programada en TypeScript puro:

1. El usuario registra el nivel del tanque (%) periódicamente
2. El motor calcula los kg restantes y la tasa de consumo usando **Regresión Lineal**
3. Predice cuántos días quedan y recomienda la fecha de recarga
4. La confianza mejora con más lecturas (baja → media → alta)

```
Algoritmo:
  puntos = [(días_desde_inicio, kg_restantes), ...]
  regresión_lineal(puntos) → tasa_consumo (kg/día)
  días_restantes = kg_actuales / tasa_consumo
  confianza = R² (coeficiente de determinación)
```

---

## 🏗️ Estructura del proyecto

```
mobile/
├── app/
│   ├── _layout.tsx          # Root layout (DB init, onboarding check)
│   ├── onboarding.tsx       # Configuración inicial
│   ├── registro.tsx         # Modal: registrar nivel del tanque
│   └── (tabs)/
│       ├── index.tsx        # Home: gauge + predicción IA
│       ├── historial.tsx    # Historial y gráfica de consumo
│       └── configuracion.tsx # Ajustes del usuario y tanque
│
├── components/
│   └── TankGauge.tsx        # Gauge circular animado (SVG + Reanimated)
│
└── services/
    ├── database.ts          # SQLite local (lecturas, configuración)
    ├── ai.ts                # Motor de IA: regresión lineal en TypeScript
    └── notifications.ts     # Recordatorios locales
```

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| App móvil | React Native + Expo (TypeScript) |
| Navegación | Expo Router |
| Base de datos | expo-sqlite (local, en el dispositivo) |
| IA / Predicción | Regresión lineal en TypeScript puro |
| Gauge | react-native-svg + react-native-reanimated |
| Notificaciones | expo-notifications (locales) |

---

## 🚀 Cómo ejecutar

### Prerrequisitos
- Node.js 18+
- Expo Go app en tu teléfono Android
- O un emulador Android configurado

### Pasos

```bash
# Entrar al proyecto
cd mobile

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npx expo start
```

Escanea el código QR con **Expo Go** en tu celular Android.

---

## 📱 Pantallas

1. **Onboarding** — Configuración inicial (nombre, capacidad del tanque, personas)
2. **Home** — Gauge del tanque + predicción de días restantes + tasa de consumo
3. **Registrar** — Modal con slider para ingresar el nivel actual (%)
4. **Historial** — Gráfica de consumo diario + lista de lecturas
5. **Configuración** — Editar perfil, tanque, recordatorios y borrar datos

---

## 📋 Guía de uso

1. Instala y abre la app → completa el **onboarding**
2. Ve a **Inicio** → toca "Registrar nueva lectura"
3. Mueve el slider al nivel actual de tu tanque y guarda
4. Repite el paso 2 al día siguiente (o cuando notes cambio)
5. Con **2+ lecturas**, la IA activa y muestra la predicción automáticamente
6. La app programará un **recordatorio** automático antes de tu fecha de recarga

---

## 🔮 Roadmap futuro

- [ ] Widget de pantalla de inicio (Android)
- [ ] Gráfica interactiva con Victory Native
- [ ] Modo multi-tanque (casas con 2 tanques)
- [ ] Exportar historial a CSV
- [ ] Soporte para gas natural (m³)
