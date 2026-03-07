# SECURITY AUDIT REPORT

🔐 Credenciales: 🔴 CRÍTICO
🔐 Base de Datos Firebase: 🟠 MEDIO
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
- **Recomendación (NO aplicar cambios automáticamente)**: Aunque en Firebase es estándar exponer el `apiKey` en el cliente web, debes asegurarte de ir a Google Cloud Console y restringir la API Key **únicamente** a los dominios autorizados de tu aplicación (ej. tu dominio en producción y localhost). Considera extraer la configuración a variables de entorno inyectadas durante el *build* si en el futuro migras a un framework como Vercel/Vite para ocultarlas del repositorio.

### 2. Base de Datos Firebase (Seguridad)
- **Archivo / Componente**: Raíz del proyecto (Reglas de Firestore/Storage ausentes)
- **Descripción del problema**: No se ha detectado ningún archivo con las reglas de seguridad locales (ej. `firestore.rules` o `storage.rules`). Esto suele indicar que las reglas no están bajo control de versiones y obliga a modificarlas directo en la consola de Firebase, aumentando el riesgo de tener un `allow read, write: if true;` accidental o por olvido.
- **Nivel de riesgo**: 🟠 MEDIO
- **Recomendación (NO aplicar cambios automáticamente)**: Define y audita un archivo `firestore.rules` en el repositorio que verifique que el usuario autenticado solo pueda leer y escribir datos en `users/{userId}` igualando `request.auth.uid == userId`. Inicializa y despliega las reglas a través de Firebase CLI.

### 3. Arquitectura
- **Archivo / Componente**: `js/app.js`
- **Descripción del problema**: Toda la lógica de la aplicación (cálculo de BMI, generación de perfiles en la base de datos tras el alta, operaciones CRUD completas y filtrado) se ejecuta desde el código del cliente.
- **Nivel de riesgo**: 🟠 MEDIO
- **Recomendación (NO aplicar cambios automáticamente)**: Para un tracker de entorno personal está bien, pero en un contexto de salud real (HIPAA), la creación de perfiles inicial o la validación estricta de métricas de medición debería realizarse de forma centralizada usando Cloud Functions para asegurar la integridad de los datos.

### 4. Dependencias Externas
- **Archivo / Componente**: `index.html`
- **Descripción del problema**: Carga de scripts desde CDNs (`cdn.tailwindcss.com`, `cdn.jsdelivr.net` para Chart.js).
- **Nivel de riesgo**: 🟢 OK (pero digno de mención)
- **Recomendación (NO aplicar cambios automáticamente)**: Usar Subresource Integrity (SRI) en las dependencias cargadas desde CDNs (añadir *hashes* de integridad) para prevenir la ejecución de código malicioso si el CDN llega a ser comprometido de forma remota.
