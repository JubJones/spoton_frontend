# SpotOn Frontend Application

This is the frontend application for the SpotOn Intelligent Multi-Camera Person Tracking and Analytics System. It provides a user interface for visualizing camera feeds, tracking data, and interacting with the backend services.

## Prerequisites

Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18.x or later recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js) or [Yarn](https://yarnpkg.com/)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/JubJones/spoton_frontend
    cd spoton_frontend
    ```

2.  **Install dependencies:**
    Using npm:
    ```bash
    npm install
    ```
    Or using Yarn:
    ```bash
    yarn install
    ```
    This will download and install all the necessary packages defined in `package.json`.

## Running the Development Server

To run the application in development mode with hot-reloading:

1.  **Start the Vite development server:**
    Using npm:
    ```bash
    npm run dev
    ```
    Or using Yarn:
    ```bash
    yarn dev
    ```

2.  Open your web browser and navigate to the URL provided in the terminal (usually `http://localhost:5173` or a similar port if 5173 is in use).

The application will automatically reload if you make changes to the source files.

## Available Scripts

In the `package.json`, you will find other scripts, including:

*   `npm run build` or `yarn build`: Builds the app for production to the `dist` folder. It correctly bundles React in production mode and optimizes the build for the best performance.
*   `npm run lint` or `yarn lint`: Lints the project files using ESLint (based on `eslint.config.js`).
*   `npm run preview` or `yarn preview`: Serves the production build locally to preview it before deployment.

## Key Technologies

*   **React:** A JavaScript library for building user interfaces.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
*   **Vite:** A fast frontend build tool and development server.
*   **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
*   **React Router:** For client-side routing.

## Backend Dependency

This frontend application is designed to interact with the SpotOn backend services. Ensure the backend server is running and accessible at the configured URLs (typically `http://localhost:8000` for API and `ws://localhost:8000` for WebSockets, as seen in `GroupViewPage.tsx`). These URLs might need to be configured via environment variables for different deployment environments.
