# 📚 BetterReads (BookVerse)

BetterReads is a full-stack web application designed for book enthusiasts to discover, buy, sell, and exchange books. It features real-time messaging, secure payments, image uploads, and an intuitive, modern user interface.

## ✨ Features

- **User Authentication**: Secure signup and login using JWT and bcrypt.
- **Book Marketplace**: Browse, search, and filter books by genre and status.
- **Offers & Transactions**: Make offers on books, manage a cart, and complete purchases securely with **Stripe** integration.
- **Real-Time Chat**: Connect and negotiate with other users in real-time via **Socket.io**.
- **User Profiles**: Manage your profile, view your active books, track orders, and curate a wishlist.
- **Reviews**: Leave and read reviews for books and users.
- **Image Management**: Seamlessly upload book covers and profile pictures using **Cloudinary**.

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 with Vite (Rolldown)
- **Styling**: Tailwind CSS v4, Framer Motion for animations
- **Routing**: React Router v7
- **State Management & API**: Context API, Axios
- **Real-time**: Socket.io-client

### Backend
- **Environment**: Node.js & Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JSON Web Tokens (JWT)
- **Payments**: Stripe API
- **File Storage**: Cloudinary (via Multer)
- **Real-time**: Socket.io
- **Security**: Helmet, Express Rate Limit, CORS

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally or a MongoDB Atlas URI
- Cloudinary Account (for image uploads)
- Stripe Account (for payments)

### 1. Clone the repository
```bash
git clone https://github.com/Divyanshu026/BetterReads.git
cd BetterReads
```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy the example file and fill in your credentials.
   ```bash
   cp .env.example .env
   ```
   *Make sure to provide your MongoDB URI, JWT Secret, Cloudinary keys, and Stripe keys in the `.env` file.*
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:5000`.*

### 3. Frontend Setup
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The application will be available at `http://localhost:5173`.*

## 📁 Project Structure

```
BetterReads/
├── backend/               # Node.js Express server
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Auth, upload, and error middlewares
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # API route definitions
│   │   ├── services/      # 3rd party integrations (Stripe, Cloudinary)
│   │   └── sockets/       # Socket.io event handlers
│   └── .env.example       # Example backend configuration
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React contexts (Auth, Cart)
│   │   ├── pages/         # Route-level components
│   │   └── services/      # API communication layers
│   └── vite.config.js     # Vite configuration (includes API proxy)
└── .gitignore             # Root gitignore
```

## 🔒 Security
- Passwords are cryptographically hashed using `bcryptjs`.
- APIs are protected via JWT-based Bearer tokens.
- Express is secured with `helmet` and `express-rate-limit`.
- Sensitive keys (`.env`) are excluded from version control.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is licensed under the ISC License.
