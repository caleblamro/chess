FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with clean npm install
RUN npm install

# Copy project files
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p /app/public

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]