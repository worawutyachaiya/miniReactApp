# Expense Tracker Backend

## Deployment Instructions for Render.com

### Prerequisites
1. GitHub repository pushed with all files
2. Render account created

### Environment Variables to Set in Render
When deploying to Render, set these environment variables:

- `NODE_ENV=production`
- `DATABASE_URL` - Your PostgreSQL database connection string
- `JWT_SECRET` - A secure random string for JWT token signing
- `FRONTEND_URL` - Your frontend app URL (if applicable)
- `CLIENT_URL` - Your mobile client URL (if applicable)

### Deployment Steps

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Configure the service:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 18 or later
4. Set environment variables in Render dashboard
5. Deploy!

### Database Setup
Make sure your production database has the same schema as development:
- If using Render PostgreSQL, the connection string will be provided
- Run migrations using `npx prisma migrate deploy` (handled automatically via postinstall)

### Scripts Available
- `npm run dev` - Start development server
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run postinstall` - Generate Prisma client (runs automatically)

### Health Check
The API provides a health check endpoint at `/` that returns:
```json
{
  "message": "Expense Tracker API is running...",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "environment": "production"
}
```