# Project Context: Node.js Print Server

This document provides a high-level overview of the Node.js Print Server project, its architecture, and key components. Its purpose is to help developers quickly understand the codebase and make contributions.

---

## 1. Project Goal

The primary goal of this project is to provide a reliable, high-quality printing solution for web applications. It bridges the gap between web front-ends and physical printers by offering a server-side API that can accept print jobs, render HTML into high-fidelity PDFs, and send them to a specified printer.

---

## 2. Architecture Overview

The project follows a simple client-server architecture:

-   **Client (Web Browser)**: A web application (such as the provided `Demo/demo.html`) acts as the client. It gathers the content to be printed and sends it to the server via an HTTP request.
-   **Server (Node.js)**: A Node.js server built with Express.js listens for print requests. It handles the core logic of PDF generation and printing.

### Key Technologies

-   **Backend**: Node.js, Express.js
-   **PDF Generation**: Puppeteer (for high-quality, server-side rendering)
-   **Printing**: `pdf-to-printer` (a cross-platform printing library)
-   **Frontend (Demo)**: HTML, CSS, JavaScript (with `fetch` API for server communication)

---

## 3. File Structure

The repository is organized into two main directories:

```
.
├── Demo/
│   └── demo.html       # A comprehensive front-end for testing the print server.
├── Server/
│   ├── index.js        # The main server file containing all API logic.
│   └── package.json    # Project dependencies and scripts.
├── Readme.md           # This file.
└── context.md          # Detailed project context (this document).
```

-   **`/Demo`**: Contains the client-side demonstration files. This part of the project is for testing and showcasing the server's capabilities and is not required for the server to run.
-   **`/Server`**: Contains all the back-end code, including the Express server, API endpoints, and dependency management. **This is the core of the project.**

---

## 4. Core Components & Logic

### Server (`Server/index.js`)

The `index.js` file is the heart of the application. Its responsibilities include:

1.  **Server Initialization**: Sets up the Express app, enables CORS, and defines the port.
2.  **Middleware**: Uses `express.json()` to handle JSON request bodies.
3.  **API Endpoints**:
    -   `GET /api/printers`: Fetches and returns a list of available system printers. This allows the front-end to be dynamic.
    -   `POST /api/print-html`: The high-quality print endpoint. It receives HTML content, uses Puppeteer to launch a headless browser, renders the HTML into a PDF buffer, saves it to a temporary file, and sends it to the printer.
    -   `POST /api/print-base64`: The lower-quality print endpoint. It receives a Base64-encoded PDF, decodes it into a temporary file, and sends it to the printer.
4.  **Temporary File Handling**: Both print endpoints create temporary PDF files which are deleted immediately after the print job is sent.

### Demo Page (`Demo/demo.html`)

The demo page is a self-contained HTML file that demonstrates how to interact with the print server's API. Its key features are:

1.  **Two Print Buttons**: One for the high-quality (`/api/print-html`) method and one for the lower-quality (`/api/print-base64`) method.
2.  **API Calls**: Uses the `fetch` API to send POST requests to the server.
3.  **Dynamic Content**: The HTML content to be printed is defined directly in the file.
4.  **User Feedback**: Displays success, error, or informational messages to the user.

---

## 5. Development Workflow

1.  **Start the server**: Navigate to the `Server` directory and run `npm start`.
2.  **Test with the demo**: Open `Demo/demo.html` in a web browser.
3.  **Make changes**: Modify the server code in `Server/index.js`.
4.  **Restart the server**: Stop the server (Ctrl+C) and restart it with `npm start` to apply changes.

For more detailed setup and API documentation, please refer to the [Readme.md](Readme.md) file.