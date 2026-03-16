# Use official Node.js light image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Ensure PORT is defaulted if not provided (though Cloud Run will provide it)
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start the application using node directly
CMD ["node", "backend/src/server.js"]
