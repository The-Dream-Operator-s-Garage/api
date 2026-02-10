# Pathos API

A Node.js Express server application with a beautiful HTML frontend that welcomes users to the API.

## Features

- Express.js REST API server
- MariaDB database integration
- Beautiful space-themed frontend with glass-like UI components
- `/api/greeting` endpoint that welcomes users
- Passenger/cPanel compatible

## Project Structure

```
/app
  /controllers    - Request handlers
  /models         - Database models (for future use)
  /routes         - API route definitions
  /services       - Business logic and database services
/public           - Static files (HTML, CSS, images, fonts)
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your database configuration:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=pathos_db

# For AWS RDS MariaDB, set SSL to true:
# DB_SSL=true
```

**Database Auto-Initialization**: The application will automatically:
- Create the database if it doesn't exist
- Run the SQL schema file (`pathwjzs_tpathos.sql`) to create all tables
- Handle connection timeouts and retries for AWS RDS

**AWS RDS Configuration**: When connecting to AWS RDS, the application automatically:
- Enables SSL connections (required by AWS RDS)
- Increases connection timeouts to 60 seconds
- Implements retry logic for connection failures
- Uses self-signed certificate handling for RDS

3. Add your assets to the `/public` directory:
   - `starnoise.svg` - Background image
   - `nasalization.otf` - Title font
   - `logo.png` - Logo and favicon

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

- `GET /` - Serves the HTML frontend
- `GET /api/greeting` - Returns a welcome greeting message
- `GET /health` - Health check endpoint

## Deployment

This application is configured to work with cPanel/Namecheap servers using Passenger. The `.htaccess` file is already configured for CloudLinux Passenger.

Make sure:
- Node.js is installed on your server
- MariaDB is accessible
- Your `.env` file is configured with production database credentials
- All assets are uploaded to the `/public` directory

## Color Palette

The application uses a carefully crafted color palette for a space-themed, metallic glass aesthetic. See `public/styles.css` for the complete color scheme.

