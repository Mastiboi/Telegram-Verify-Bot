# Use official Playwright image with dependencies
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Set working directory inside the container
WORKDIR /app

# Copy package files first (for caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Install Playwright Browsers
RUN npx playwright install --with-deps

# Copy the rest of the application files
COPY . .

# Expose correct port (Railway sets ENV variable)
ENV PORT=5000
EXPOSE $PORT

# Run the application
CMD ["node", "nodeserver.js"]
