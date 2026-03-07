# SECURITY AUDIT REPORT

🔐 Credenciales: 🔴 CRÍTICO
🔐 Base de Datos Firebase: 🟢 OK
🔐 Base de Datos Supabase: 🟢 OK
🔐 Arquitectura: 🟠 MEDIO
🔐 Autenticación / Autorización: 🟢 OK
🔐 APIs / Functions: 🟢 OK
🔐 Dependencias: 🟢 OK

RIESGO TOTAL: 🔴 ALTO
DEPLOY RECOMENDADO: ❌ NO

---

## 🧩 DETALLES:

### 1. Credenciales y Secretos
- **Archivo / Componente**: `js/app.js` (Líneas 21-28)
- **Descripción del problema**: El objeto `firebaseConfig` expone la clave `apiKey` y otros identificadores de Firebase directamente en el código del cliente frontend. 
- **Nivel de riesgo**: 🔴 CRÍTICO
- **Recomendación (NO aplicar cambios automáticamente)**: Asegúrate de restringir la API Key en Google Cloud Console únicamente a los dominios autorizados de tu aplicación (ej. `localhost` y tu dominio de produccion). Si ya realizaste este paso en Google Cloud manualmente, puedes proceder con el deploy con seguridad, ya que la llave estará protegida contra abusos.

### 2. Base de Datos Firebase (Seguridad)
- **Archivo / Componente**: `firestore.rules` y `firebase.json`
- **Descripción del problema**: N/A
- **Nivel de riesgo**: 🟢 OK
- **Recomendación (NO aplicar cambios automáticamente)**: Las reglas locales han sido configuradas correctamente implementando RLS (Row Level Security) basado en `request.auth.uid`. Los usuarios solo pueden acceder a su nodo `/users/{userId}`. Asegúrate de ejecutar `firebase deploy --only firestore:rules` para subirlas.

### 3. Arquitectura
- **Archivo / Componente**: `js/app.js`
- **Descripción del problema**: Lógica de aplicación y cálculos realizados en el frontend.
- **Nivel de riesgo**: 🟠 MEDIO
- **Recomendación (NO aplicar cambios automáticamente)**: Aunque la lógica reside en el cliente, la implementación de las reglas estrictas de Firestore mitiga riesgos de acceso no autorizado a datos. Para una versión de producción de grado médico, considera trasladar cálculos sensibles al backend (Cloud Functions).

### 4. Dependencias Externas
- **Archivo / Componente**: `index.html`
- **Descripción del problema**: Carga de scripts desde CDNs (`cdn.tailwindcss.com`, `cdn.jsdelivr.net`).
- **Nivel de riesgo**: 🟢 OK
- **Recomendación (NO aplicar cambios automáticamente)**: Tailwind dinámico no soporta validación SRI (Subresource Integrity) correctamente. Esto es esperable en entornos de desarrollo/prototipado usando el CDN dinámico. En producción, se recomienda compilar Tailwind a un CSS estático.
