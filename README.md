# PressoCare 🫀

**PressoCare** is a modern, comprehensive health tracking web application designed to help users easily monitor vital health metrics. It provides an intuitive, responsive, and beautifully designed interface for individuals to log and analyze their Blood Pressure, Glucose levels, and Weight over time.

## 🌟 Key Features

### 1. Multi-Metric Health Tracking
*   **Blood Pressure & Pulse:** Log systolic, diastolic, and resting heart rate data.
*   **Glucose:** Record blood sugar levels with meal context (Fasting, After Meal, Random).
*   **Weight & BMI:** Track weight progress and automatically calculate Body Mass Index (BMI) based on profile height, with dynamically adjusting visual indicator scales.

### 2. Multi-Profile Support
*   Manage multiple individuals (e.g., family members) under a single master account.
*   Seamlessly switch between profiles to view isolated dashboards, history, and statistics for each person.

### 3. Dynamic Dashboards & Visualization
*   Interactive **Chart.js** graphs showing trends over 7 days, 30 days, or All Time.
*   **KPI Cards:** Automatically computed statistics for each metric (Averages, Minimums, Maximums).
*   **Status Distribution Bars:** Visual breakdowns of measurements categorized by health risk levels (e.g., Normal, Elevated, High BP levels).

### 4. Modern, Premium UI/UX
*   **Dual Themes (Light & Dark Mode):** Handcrafted cream-and-slate Light Mode and sleek navy Dark Mode aesthetics, with seamless toggle and user preference persistence via `localStorage`.
*   **Glassmorphism Effects:** Frosted glass headers and navigation bars for a premium native app feel.
*   **Responsive Design:** Fully optimized for mobile first, scaling gracefully to tablet and desktop layouts.
*   **Smooth Animations:** Fluid transitions, modal slide-ups, and interactive pill menus.

### 5. Secure Cloud Synchronization
*   Powered by **Firebase Authentication** for secure account creation and login.
*   Real-time data synchronization and persistence using **Cloud Firestore**.

## 🛠️ Technology Stack

*   **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+). No heavy frameworks (React/Vue/Angular), ensuring lightning-fast load times.
*   **Styling:** **Tailwind CSS** (via CDN with JIT configuration) augmented with custom CSS variables for advanced dynamic theming.
*   **Charts:** **Chart.js** library for rendering responsive line graphs.
*   **Icons & Fonts:** Google Material Symbols (Outlined) and Inter font family.
*   **Backend / BaaS:** Firebase (Auth, Firestore).

## 🚀 Getting Started

### Prerequisites
*   A modern web browser.
*   Node.js (for running an optional local development server).

### Installation & Running Locally

1.  **Clone the repository** (or download the files).
2.  **Serve the files:** You can use any local web server. For example, using `npx`:
    ```bash
    npx serve . -p 3000
    ```
3.  **Open the application:** Navigate to `http://localhost:3000` in your browser.

### Configuration (Firebase)
To enable the backend features (Authentication and Database):
1.  Set up a project in the Firebase Console.
2.  Enable Email/Password Authentication.
3.  Deploy a Firestore database.
4.  Update the Firebase initialization configuration object in `js/firebase-config.js` with your project's credentials.

## 📱 App Structure

*   `index.html`: Main application entry point containing the UI structure, modals, Auth forms, and Navigation.
*   `css/styles.css`: Custom CSS variables, global animations, and theme overrides not handled by Tailwind classes.
*   `js/app.js`: Core application logic (UI rendering, Event Handling, Chart instances, Theme management).
*   `js/firebase-config.js` / `js/firebase-auth.js` / `js/firebase-db.js`: Firebase integration modules (assumed/typical structure based on app functionality).

## 🎨 Theme System
The application utilizes a hybrid approach for its themes:
*   Tailwind's `dark:` modifier class strategy is enforced on the `<html>` root element.
*   Custom CSS variables (`--color-bg`, `--color-surface`, etc.) are mapped to both light and dark environments in `styles.css` bridging standard elements.

---
*Built with ❤️ for better health monitoring.*
