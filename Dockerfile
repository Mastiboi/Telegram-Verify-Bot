# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install && npx playwright install --with-deps

# Copy the rest of the app
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the server
CMD ["node", "nodeserver.js"]
