# Torna a Casa

![Build Android Release](https://github.com/Razdnut/torna_a_casa/actions/workflows/android-release.yml/badge.svg)
![Deploy to GitHub Pages](https://github.com/Razdnut/torna_a_casa/actions/workflows/deploy-pages.yml/badge.svg)

An Android application designed for monitoring employee work hours, specifically tailored for the Italian public sector. This hybrid mobile/web application allows employees to track their entry and exit times, manage lunch breaks, and record leaves or permits.

## Features

*   **Work Hour Tracking:** Accurately record daily entry and exit times.
*   **Lunch Break Management:** Log and manage lunch breaks within working hours.
*   **Leave and Permit Management:** Keep track of approved leaves and permits.
*   **Local Data Storage:** Utilizes SQLite for robust and efficient local data management via Capacitor.
*   **Italian Public Sector Focus:** Designed with the specific needs and regulations of Italian public sector employees in mind.
*   **Cross-platform (Android & Web):** Available as a native Android application and a web version.

## Demo

A live demo of the web application is available on GitHub Pages:
[https://razdnut.github.io/torna_a_casa/](https://razdnut.github.io/torna_a_casa/)

## Technology Stack

This project is built using modern web and mobile development technologies:

*   **Frontend:** React, TypeScript
*   **Styling:** Tailwind CSS, shadcn/ui components
*   **Icons:** Lucide React
*   **Routing:** React Router
*   **Mobile Hybrid Framework:** Capacitor (for Android application)
*   **Package Manager:** pnpm
*   **Database:** SQLite (via Capacitor Community SQLite plugin)

## Installation (for Developers)

To set up the project for development on your local machine, follow these steps:

### Prerequisites

*   [Node.js](https://nodejs.org/) (version 20 or higher recommended)
*   [pnpm](https://pnpm.io/) (version 9 or higher recommended)

### Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Razdnut/torna_a_casa.git
    cd torna_a_casa
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Run the application in development mode:**
    ```bash
    pnpm dev
    ```
    The web application will typically be available at `http://localhost:5173/`.

### Project Structure

The main source code is located in the `src/` folder:
*   React components are in `src/components/`.
*   Application pages are in `src/pages/`.

## Building for Production

### Web Application

To create a production-ready build of the web application:

```bash
pnpm build
```

You can preview the production build locally with:

```bash
pnpm preview
```

### Android APK

The repository includes a GitHub Action to automatically build and sign the release APK.

1.  **Configure GitHub Secrets for Signing:**
    To enable the secure signing of the APK, you need to set the following secrets in your GitHub repository settings:
    *   `ANDROID_KEYSTORE_BASE64`: The base64 encoded content of your `.jks` keystore file.
    *   `ANDROID_KEYSTORE_PASSWORD`: The password for your keystore.
    *   `ANDROID_KEY_ALIAS`: The alias for your key within the keystore.
    *   `ANDROID_KEY_PASSWORD`: The password for your key.

2.  **Generate a new Release:**
    *   **Via Git Tag:** Push a new tag to trigger the workflow:
        ```bash
        git tag v1.0.0
        git push origin v1.0.0
        ```
    *   **Manually:** Go to the "Actions" tab in your GitHub repository, select the **Android Release** workflow, and click "Run workflow" to trigger it manually. You can specify a tag and release name.

3.  **Download and Install the APK:**
    *   Once the workflow completes, the signed `tornacasa.apk` will be attached to the new GitHub Release created on your repository's Releases page.
    *   Alternatively, you can download the APK from the workflow run artifacts in the Actions tab.
    *   Copy the `tornacasa.apk` file to your Android device.
    *   Enable installation from **unknown sources** in your device settings.
    *   Open the APK file on your device to install the application.

    **Security Note:** The workflow ensures that only **signed** APKs are published. If the signing secrets are not configured correctly, the release build will be blocked.

## Docker Deployment

You can run the web application in a pre-built Docker container using Docker Compose.

1.  **Set the Immutable Image Digest:**
    Before starting, set the immutable digest of the Docker image in a `.env` file at the root of the project. Replace `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` with the actual digest:

    ```sh
    TORNACASA_IMAGE_DIGEST=sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    ```

2.  **Start the Container:**
    ```bash
    docker compose up -d
    ```
    The application will be available at `http://localhost:8080`.

3.  **Stop the Container:**
    ```bash
    docker compose down
    ```

## Contributing

We welcome contributions! If you'd like to contribute, please fork the repository, create a new branch, and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT

---

<div align="left">

  ![GitHub profile-details](http://github-profile-summary-cards.vercel.app/api/cards/profile-details?username=Razdnut&theme=material_palenight)

</div>
